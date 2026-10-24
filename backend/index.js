import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

// Express setup
const app = express();
const httpServer = createServer(app);

app.get("/", (_req, res) => {
  res.send("Game server is running!");
});

// WebSocket server setup
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const rooms = new Map();

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

  socket.on("get-players", (roomCode) => {
    const room = rooms.get(roomCode);

    if (!room || !socket.rooms.has(roomCode)) return;

    socket.emit(
      "player-list",
      room.players.map(({ id, nickname }) => ({ id, nickname })),
    );
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    room.players = room.players.filter((player) => player.id !== socket.id);

    if (room.players.length === 0) {
      rooms.delete(roomCode);
    } else {
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
      }

      broadcastPlayers(roomCode);
    }
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
    }
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
    }
  });
});

httpServer.listen(3000, () => {
  console.log("Server listening on port 3000");
});
