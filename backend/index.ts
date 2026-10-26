import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  generateSequence,
  getRandomSymbols,
  registerGameSockets,
} from "./sockets/gameSockets.js";
import { SYMBOLS_BY_CATEGORY, type SymbolCounts } from "./symbols.js";
import { registerRoomSockets } from "./sockets/roomSockets.js";
import levelDefinitions from "./levels.json" with { type: "json" };
import type {
  GameServer,
  GameSocket,
  Room,
} from "./types.js";

import "dotenv/config";

const ROLE_REVEAL_DURATION_SECONDS = 3;
const PLAYER_RECONNECT_GRACE_SECONDS = 30;
const WRONG_SEQUENCE_PENALTY_SECONDS = 15;
interface LevelDefinition {
  level: number;
  durationSeconds: number;
  glitchIntensity: number;
  symbols: SymbolCounts;
}

const LEVELS: LevelDefinition[] = levelDefinitions;
const MAX_LEVELS = LEVELS.length;
const levelTimers = new Map<string, NodeJS.Timeout>();

for (const [index, level] of LEVELS.entries()) {
  if (level.level !== index + 1) {
    throw new Error("Level configuration must use consecutive level numbers");
  }

  if (!Number.isFinite(level.durationSeconds) || level.durationSeconds <= 0) {
    throw new Error(
      `Invalid duration for level ${level.level}: ${level.durationSeconds}`,
    );
  }

  if (
    !Number.isFinite(level.glitchIntensity) ||
    level.glitchIntensity < 0 ||
    level.glitchIntensity > 1
  ) {
    throw new Error(
      `Invalid glitch intensity for level ${level.level}: ${level.glitchIntensity}`,
    );
  }

  for (const category of ["easy", "medium", "hard"] as const) {
    const count = level.symbols[category];
    if (
      !Number.isInteger(count) ||
      count < 0 ||
      count > SYMBOLS_BY_CATEGORY[category].length
    ) {
      throw new Error(
        `Invalid ${category} symbol count for level ${level.level}: ${count}`,
      );
    }
  }

  if (Object.values(level.symbols).every((count) => count === 0)) {
    throw new Error(`Level ${level.level} must include at least one symbol`);
  }

}

if (LEVELS.length === 0) {
  throw new Error("At least one level must be configured");
}

// Express setup
const app = express();
const httpServer = createServer(app);

app.get("/", (_req, res) => {
  res.send("Game server is running!");
});

// WebSocket server setup
const corsOrigins = process.env.CORS_ORIGINS?.split(",") ?? [];

const io: GameServer = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
  },
});

const rooms = new Map<string, Room>();
const roleRevealTimers = new Map<string, NodeJS.Timeout>();
const playerReconnectTimers = new Map<string, NodeJS.Timeout>();

function startRoleReveal(roomCode: string) {
  const room = rooms.get(roomCode);

  if (
    !room ||
    room.players.length !== 2 ||
    room.players.some((player) => !player.socketId || !player.role) ||
    roleRevealTimers.has(roomCode)
  ) {
    return;
  }

  const duration = ROLE_REVEAL_DURATION_SECONDS;
  const startAt = Date.now() + duration * 1000;

  room.status = "revealing";
  room.roleRevealEndsAt = startAt;

  for (const player of room.players) {
    io.to(player.socketId!).emit("role-reveal", {
      role: player.role!,
      startAt,
      duration,
    });
  }

  const timer = setTimeout(() => {
    roleRevealTimers.delete(roomCode);
    startLevel(roomCode);
  }, duration * 1000);

  roleRevealTimers.set(roomCode, timer);
}

function startLevel(roomCode: string, level = 1) {
  const room = rooms.get(roomCode);

  if (!room || room.players.length !== 2) return;

  const levelDefinition = LEVELS[level - 1];
  if (!levelDefinition || levelDefinition.level !== level) {
    throw new Error(`No symbol configuration found for level ${level}`);
  }

  room.status = "playing";
  room.level = level;
  room.roleRevealEndsAt = null;
  room.availableSymbols = getRandomSymbols(levelDefinition.symbols);
  room.currentSequence = [];

  io.to(roomCode).emit("level-started", {
    level: room.level,
    availableSymbols: room.availableSymbols,
    glitchIntensity: levelDefinition.glitchIntensity,
  });

  startLevelTimer(roomCode);
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;

  do {
    code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  } while (rooms.has(code));

  return code;
}

function broadcastPlayers(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  io.to(roomCode).emit(
    "player-list",
    room.players.map(({ id, nickname, socketId }) => ({
      id,
      nickname,
      connected: Boolean(socketId),
    })),
  );

  for (const player of room.players) {
    if (player.socketId) {
      io.to(player.socketId).emit("room-info", {
        roomCode,
        isHost: player.id === room.hostId,
      });
    }
  }
}

function removePlayerFromRoom(socket: GameSocket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) {
    delete socket.data.roomCode;
    delete socket.data.nickname;
    return;
  }

  const player = room.players.find(
    (candidate) => candidate.id === socket.data.playerId,
  );

  if (!player || player.socketId !== socket.id) {
    delete socket.data.roomCode;
    delete socket.data.nickname;
    return;
  }

  removePlayerFromRoomById(roomCode, player.id);
  delete socket.data.roomCode;
  delete socket.data.nickname;
}

function clearRoomTimers(roomCode: string) {
  clearInterval(levelTimers.get(roomCode));
  levelTimers.delete(roomCode);
  clearTimeout(roleRevealTimers.get(roomCode));
  roleRevealTimers.delete(roomCode);
}

function removePlayerFromRoomById(roomCode: string, playerId: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) return;

  if (room.voiceChatReady?.delete(playerId)) {
    const peer = room.players.find(
      (candidate) => candidate.id !== playerId && candidate.socketId,
    );
    if (peer?.socketId) {
      io.to(peer.socketId).emit("voice-chat-peer-stopped");
    }
  }

  clearTimeout(playerReconnectTimers.get(playerId));
  playerReconnectTimers.delete(playerId);
  room.players = room.players.filter((candidate) => candidate.id !== playerId);

  if (room.players.length === 0) {
    rooms.delete(roomCode);
    clearRoomTimers(roomCode);
  } else {
    const gameWasActive = room.rolesAssigned || room.status !== "waiting";

    if (room.hostId === playerId) {
      room.hostId = room.players[0]!.id;
    }

    if (gameWasActive) {
      clearRoomTimers(roomCode);
      resetRoomForLobby(room);
      io.to(roomCode).emit("room-reset");
    }

    broadcastPlayers(roomCode);
  }
}

function assignRoles(roomCode: string, decoderId: string): boolean {
  const room = rooms.get(roomCode);

  if (
    !room ||
    room.players.length !== 2 ||
    room.players.some((player) => !player.socketId)
  ) {
    return false;
  }
  if (room.rolesAssigned) return false;
  if (!room.players.some((player) => player.id === decoderId)) {
    return false;
  }

  for (const player of room.players) {
    const role = player.id === decoderId ? "Decoder" : "Operator";
    player.role = role;

    io.to(player.socketId!).emit("role-assigned", {
      roomCode,
      role,
    });
  }

  room.rolesAssigned = true;
  return true;
}

function resetRoomForLobby(room: Room) {
  room.status = "waiting";
  room.rolesAssigned = false;
  room.level = 0;
  room.availableSymbols = [];
  room.currentSequence = [];
  room.roleRevealEndsAt = null;
  room.levelEndsAt = null;

  for (const player of room.players) {
    player.role = null;
  }
}

function finishGame(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const level = room.level;

  clearInterval(levelTimers.get(roomCode));
  levelTimers.delete(roomCode);

  resetRoomForLobby(room);

  io.to(roomCode).emit("game-won", {
    level,
  });
}

function endLevel(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const level = room.level;

  clearInterval(levelTimers.get(roomCode));
  levelTimers.delete(roomCode);
  resetRoomForLobby(room);

  io.to(roomCode).emit("game-ended", { level });
}

function restorePlayer(socket: GameSocket): boolean {
  const playerId = socket.data.playerId;
  if (!playerId) return false;

  for (const [roomCode, room] of rooms) {
    const player = room.players.find((candidate) => candidate.id === playerId);

    if (!player) continue;

    const oldSocket = player.socketId
      ? io.sockets.sockets.get(player.socketId)
      : undefined;

    clearTimeout(playerReconnectTimers.get(playerId));
    playerReconnectTimers.delete(playerId);
    player.socketId = socket.id;

    if (oldSocket && oldSocket.id !== socket.id) {
      oldSocket.disconnect(true);
    }

    socket.data.roomCode = roomCode;
    socket.data.nickname = player.nickname;
    socket.join(roomCode);

    socket.emit("room-restored", {
      roomCode,
      nickname: player.nickname,
      role: player.role,
      isHost: room.hostId === playerId,
      status: room.status ?? "waiting",
      level: room.level ?? 0,
      availableSymbols: room.availableSymbols ?? [],
      glitchIntensity: LEVELS[room.level - 1]?.glitchIntensity ?? 0.5,
      roleRevealEndsAt: room.roleRevealEndsAt ?? null,
      levelEndsAt: room.levelEndsAt ?? null,
      levelDurationSeconds: LEVELS[room.level - 1]?.durationSeconds ?? null,
    });

    broadcastPlayers(roomCode);
    return true;
  }

  return false;
}

function handleDisconnect(socket: GameSocket, playerId: string) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  const player = room?.players.find(
    (candidate) =>
      candidate.id === playerId && candidate.socketId === socket.id,
  );

  if (!room || !player) return;

  if (room.voiceChatReady?.delete(playerId)) {
    const peer = room.players.find(
      (candidate) => candidate.id !== playerId && candidate.socketId,
    );
    if (peer?.socketId) {
      io.to(peer.socketId).emit("voice-chat-peer-stopped");
    }
  }

  player.socketId = null;
  broadcastPlayers(roomCode);

  const timer = setTimeout(() => {
    playerReconnectTimers.delete(playerId);

    if (player.socketId === null) {
      removePlayerFromRoomById(roomCode, playerId);
    }
  }, PLAYER_RECONNECT_GRACE_SECONDS * 1000);

  playerReconnectTimers.set(playerId, timer);
}

io.on("connection", (socket) => {
  const playerId = socket.handshake.auth.playerId;

  if (typeof playerId !== "string") {
    socket.disconnect();
    return;
  }

  socket.data.playerId = playerId;

  registerRoomSockets(io, socket, playerId, {
    rooms,
    generateRoomCode,
    broadcastPlayers,
    removePlayerFromRoom,
    restorePlayer,
    handleDisconnect,
  });
  registerGameSockets(io, socket, playerId, {
    rooms,
    generateSequence,
    startLevel,
    startRoleReveal,
    assignRoles,
    finishGame,
    endLevel,
    maxLevels: MAX_LEVELS,
    wrongSequencePenaltySeconds: WRONG_SEQUENCE_PENALTY_SECONDS,
  });
});

export function startLevelTimer(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearInterval(levelTimers.get(roomCode));

  const duration = LEVELS[room.level - 1]!.durationSeconds;
  const startAt = Date.now();
  const endsAt = startAt + duration * 1000;
  const level = room.level;

  room.levelEndsAt = endsAt;

  io.to(roomCode).emit("level-timer-started", {
    level,
    duration,
    startAt,
    endsAt,
  });

  const timer = setInterval(() => {
    const remainingSeconds = Math.max(
      0,
      Math.ceil(((room.levelEndsAt ?? 0) - Date.now()) / 1000),
    );

    if (remainingSeconds === 0) {
      endLevel(roomCode);
      return;
    }

    io.to(roomCode).emit("level-timer-tick", {
      level,
      remainingSeconds,
    });
  }, 1000);

  levelTimers.set(roomCode, timer);
}

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
