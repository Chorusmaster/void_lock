import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { getRandomSymbols, generateSequence } from "./game.js";
import { SYMBOL_IDS } from "./symbols.js";

import 'dotenv/config';

const LEVEL_DURATION_SECONDS = 30;
const ROLE_REVEAL_DURATION_SECONDS = 3;
const MAX_LEVELS = 3;
const levelTimers = new Map();

// Express setup
const app = express();
const httpServer = createServer(app);

app.get("/", (_req, res) => {
  res.send("Game server is running!");
});

// WebSocket server setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
});

const rooms = new Map();
const roleRevealTimers = new Map();

function startRoleReveal(roomCode) {
  const room = rooms.get(roomCode);

  if (!room || room.players.length !== 2 || roleRevealTimers.has(roomCode)) {
    return;
  }

  const duration = ROLE_REVEAL_DURATION_SECONDS;
  const startAt = Date.now() + duration * 1000;

  room.status = "revealing";

  for (const player of room.players) {
    io.to(player.id).emit("role-reveal", {
      role: player.role,
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

function startLevel(roomCode, level = 1) {
  const room = rooms.get(roomCode);

  if (!room || room.players.length !== 2) return;

  room.status = "playing";
  room.level = level;
  room.availableSymbols = getRandomSymbols(
    Math.min(3 + room.level, SYMBOL_IDS.length),
  );
  room.currentSequence = [];

  io.to(roomCode).emit("level-started", {
    level: room.level,
    availableSymbols: room.availableSymbols,
  });

  startLevelTimer(roomCode);
}

function generateRoomCode() {
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

function broadcastPlayers(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  io.to(roomCode).emit(
    "player-list",
    room.players.map(({ id, nickname }) => ({ id, nickname })),
  );

  for (const player of room.players) {
    io.to(player.id).emit("room-info", {
      roomCode,
      isHost: player.id === room.hostId,
    });
  }
}

function removePlayerFromRoom(socket) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) {
    delete socket.data.roomCode;
    delete socket.data.nickname;
    return;
  }

  room.players = room.players.filter((player) => player.id !== socket.id);

  if (room.players.length === 0) {
    rooms.delete(roomCode);
    clearInterval(levelTimers.get(roomCode));
    levelTimers.delete(roomCode);
    clearTimeout(roleRevealTimers.get(roomCode));
    roleRevealTimers.delete(roomCode);
  } else {
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }

    broadcastPlayers(roomCode);
  }

  delete socket.data.roomCode;
  delete socket.data.nickname;
}

function assignRoles(roomCode, decoderId) {
  const room = rooms.get(roomCode);

  if (!room || room.players.length !== 2) return false;
  if (room.rolesAssigned) return false;
  if (!room.players.some((player) => player.id === decoderId)) {
    return false;
  }

  for (const player of room.players) {
    player.role = player.id === decoderId ? "Decoder" : "Operator";

    io.to(player.id).emit("role-assigned", {
      roomCode,
      role: player.role,
    });
  }

  room.rolesAssigned = true;
  return true;
}

function resetRoomForLobby(room) {
  room.status = "waiting";
  room.rolesAssigned = false;
  room.level = 0;
  room.availableSymbols = [];
  room.currentSequence = [];

  for (const player of room.players) {
    player.role = null;
  }
}

function finishGame(roomCode) {
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

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("create-room", (rawNickname) => {
    const nickname = String(rawNickname ?? "")
      .trim()
      .slice(0, 20);

    if (!nickname || socket.data.roomCode) return;

    const roomCode = generateRoomCode();

    rooms.set(roomCode, {
      hostId: socket.id,
      rolesAssigned: false,
      players: [{ id: socket.id, nickname }],
    });

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.nickname = nickname;

    socket.emit("room-created", { roomCode });
    broadcastPlayers(roomCode);
  });

  socket.on(
    "join-room",
    ({ roomCode: rawCode, nickname: rawNickname } = {}) => {
      const roomCode = String(rawCode ?? "")
        .trim()
        .toUpperCase();
      const nickname = String(rawNickname ?? "")
        .trim()
        .slice(0, 20);

      if (!nickname) {
        socket.emit("room-error", "Nickname is required");
        return;
      }

      if (socket.data.roomCode) {
        socket.emit("room-error", "You are already in a room");
        return;
      }

      const room = rooms.get(roomCode);

      if (!room) {
        socket.emit("room-error", "Room not found");
        return;
      }

      if (room.rolesAssigned || room.players.length >= 2) {
        socket.emit("room-error", "This room is full or the game has started");
        return;
      }

      const nicknameTaken = room.players.some(
        (player) => player.nickname.toLowerCase() === nickname.toLowerCase(),
      );

      if (nicknameTaken) {
        socket.emit("room-error", "This nickname is already taken");
        return;
      }

      room.players.push({ id: socket.id, nickname });

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.nickname = nickname;

      socket.emit("room-joined", { roomCode });
      broadcastPlayers(roomCode);
    },
  );

  socket.on("leave-room", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    removePlayerFromRoom(socket);
    socket.leave(roomCode);
  });

  socket.on("get-players", (roomCode) => {
    const room = rooms.get(roomCode);

    if (!room || !socket.rooms.has(roomCode)) return;

    socket.emit("room-info", {
      roomCode,
      isHost: room.hostId === socket.id,
    });

    socket.emit(
      "player-list",
      room.players.map(({ id, nickname }) => ({ id, nickname })),
    );
  });

  socket.on("generate-sequence", ({ roomCode, length } = {}) => {
    const room = rooms.get(roomCode);
    const player = room?.players.find(({ id }) => id === socket.id);

    if (
      !room ||
      !socket.rooms.has(roomCode) ||
      player?.role !== "Decoder" ||
      room.status !== "playing" ||
      !Number.isInteger(length) ||
      length !== 5 ||
      room.availableSymbols.length === 0
    ) {
      socket.emit("room-error", "Unable to generate the symbol sequence");
      return;
    }

    room.currentSequence = generateSequence(room.availableSymbols, length);
    socket.emit("sequence-generated", {
      sequence: room.currentSequence,
    });
  });

  socket.on("submit-code", ({ roomCode, code } = {}) => {
    const room = rooms.get(roomCode);
    const player = room?.players.find(({ id }) => id === socket.id);

    if (
      !room ||
      !socket.rooms.has(roomCode) ||
      player?.role !== "Operator" ||
      room.status !== "playing"
    ) {
      socket.emit(
        "room-error",
        "Only the Operator in this room can submit a code",
      );
      return;
    }

    if (
      !Array.isArray(code) ||
      code.length !== 5 ||
      !code.every((symbol) => typeof symbol === "string") ||
      room.currentSequence?.length !== 5
    ) {
      socket.emit(
        "room-error",
        "A complete code is required after the sequence is generated",
      );
      return;
    }

    const isCorrect = code.every(
      (symbol, index) => symbol === room.currentSequence[index],
    );

    if (isCorrect) {
      socket.emit("code-result", { isCorrect: true });

      if (room.level < MAX_LEVELS) {
        startLevel(roomCode, room.level + 1);
      } else {
        finishGame(roomCode);
      }
    } else {
      socket.emit("code-result", { isCorrect: false });
    }
  });

  socket.on("disconnect", () => {
    removePlayerFromRoom(socket);
  });

  socket.on("assign-roles-manual", ({ roomCode, decoderId } = {}) => {
    const room = rooms.get(roomCode);

    if (!room || room.hostId !== socket.id) {
      socket.emit("room-error", "Only the host can assign roles");
      return;
    }

    if (!assignRoles(roomCode, decoderId)) {
      socket.emit(
        "room-error",
        "Cannot assign roles. Check the players or whether roles are already assigned.",
      );
      return;
    }

    startRoleReveal(roomCode);
  });

  socket.on("assign-roles-random", ({ roomCode } = {}) => {
    const room = rooms.get(roomCode);

    if (!room || room.hostId !== socket.id) {
      socket.emit("room-error", "Only the host can assign roles");
      return;
    }

    if (room.players.length !== 2 || room.rolesAssigned) {
      socket.emit(
        "room-error",
        "Exactly two players are required and roles must not be assigned yet",
      );
      return;
    }

    const decoderId =
      room.players[Math.floor(Math.random() * room.players.length)].id;

    if (!assignRoles(roomCode, decoderId)) {
      socket.emit("room-error", "Failed to assign roles");
      return;
    }

    startRoleReveal(roomCode);
  });
});

export function startLevelTimer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearInterval(levelTimers.get(roomCode));

  const duration = LEVEL_DURATION_SECONDS;
  const startAt = Date.now();
  const endsAt = startAt + duration * 1000;
  const level = room.level;

  io.to(roomCode).emit("level-timer-started", {
    level,
    duration,
    startAt,
    endsAt,
  });

  const timer = setInterval(() => {
    const remainingSeconds = Math.max(
      0,
      Math.ceil((endsAt - Date.now()) / 1000),
    );

    if (remainingSeconds === 0) {
      clearInterval(timer);
      levelTimers.delete(roomCode);

      resetRoomForLobby(room);

      io.to(roomCode).emit("game-ended", { level });

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