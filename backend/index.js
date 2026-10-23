
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173"
  }
});

app.get("/", (req, res) => {
  res.send("Game server is running!");
});

const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;

  do {
    code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (rooms.has(code));

  return code;
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("create-room", () => {
    const roomCode = generateRoomCode();

    rooms.set(roomCode, {
      hostId: socket.id,
      players: [socket.id],
    });

    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    socket.emit("room-created", {
      roomCode,
      players: [socket.id],
    });

    console.log(`Room ${roomCode} created`);
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;

    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    room.players = room.players.filter(
      (id) => id !== socket.id
    );

    if (room.players.length === 0) {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted`);
    }
  });
});

httpServer.listen(3000, () => {
  console.log("Server listening on port 3000");
});