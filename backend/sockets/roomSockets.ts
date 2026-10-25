import type {
  GameServer,
  GameSocket,
  RoomSocketDependencies,
} from "../types.js";

export function registerRoomSockets(
  io: GameServer,
  socket: GameSocket,
  playerId: string,
  {
    rooms,
    generateRoomCode,
    broadcastPlayers,
    removePlayerFromRoom,
    restorePlayer,
    handleDisconnect,
  }: RoomSocketDependencies,
) {
  restorePlayer(socket);

  socket.on("restore-room", () => {
    restorePlayer(socket);
  });

  socket.on("create-room", (rawNickname) => {
    const nickname = String(rawNickname ?? "")
      .trim()
      .slice(0, 20);

    if (!nickname || socket.data.roomCode) return;

    const roomCode = generateRoomCode();

    rooms.set(roomCode, {
      hostId: playerId,
      rolesAssigned: false,
      players: [
        {
          id: playerId,
          socketId: socket.id,
          nickname,
          role: null,
        },
      ],
      voiceChatReady: new Set(),
      status: "waiting",
      level: 0,
      availableSymbols: [],
      currentSequence: [],
      roleRevealEndsAt: null,
      levelEndsAt: null,
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

      if (room.players.some((player) => player.id === playerId)) {
        socket.emit("room-error", "You are already in this room");
        return;
      }

      const nicknameTaken = room.players.some(
        (player) => player.nickname.toLowerCase() === nickname.toLowerCase(),
      );

      if (nicknameTaken) {
        socket.emit("room-error", "This nickname is already taken");
        return;
      }

      room.players.push({
        id: playerId,
        socketId: socket.id,
        nickname,
        role: null,
      });

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

  socket.on("voice-chat-ready", ({ roomCode } = {}) => {
    const room = roomCode ? rooms.get(roomCode) : undefined;
    const player = room?.players.find(
      (candidate) =>
        candidate.id === playerId && candidate.socketId === socket.id,
    );

    if (
      !room ||
      !roomCode ||
      socket.data.roomCode !== roomCode ||
      !socket.rooms.has(roomCode) ||
      !player ||
      room.players.length !== 2
    ) {
      socket.emit("voice-chat-error", "Voice chat is not available in this room");
      return;
    }

    if (room.voiceChatReady.has(playerId)) return;
    room.voiceChatReady.add(playerId);

    if (
      room.players.every(
        (candidate) =>
          candidate.socketId && room.voiceChatReady.has(candidate.id),
      )
    ) {
      for (const participant of room.players) {
        if (participant.socketId) {
          io.to(participant.socketId).emit("voice-chat-ready", {
            roomCode,
            initiatorId: room.players[0]!.id,
          });
        }
      }
    }
  });

  socket.on("voice-chat-stop", ({ roomCode } = {}) => {
    const room = roomCode ? rooms.get(roomCode) : undefined;
    const player = room?.players.find(
      (candidate) =>
        candidate.id === playerId && candidate.socketId === socket.id,
    );

    if (
      !room ||
      !roomCode ||
      socket.data.roomCode !== roomCode ||
      !socket.rooms.has(roomCode) ||
      !player ||
      !room.voiceChatReady.delete(playerId)
    ) {
      return;
    }

    const peer = room.players.find(
      (candidate) => candidate.id !== playerId && candidate.socketId,
    );
    if (peer?.socketId) {
      io.to(peer.socketId).emit("voice-chat-peer-stopped");
    }
  });

  socket.on("voice-chat-signal", ({ roomCode, signal } = {}) => {
    const room = roomCode ? rooms.get(roomCode) : undefined;
    const player = room?.players.find(
      (candidate) =>
        candidate.id === playerId && candidate.socketId === socket.id,
    );
    const signalType = signal?.type;
    const validDescription =
      (signalType === "offer" || signalType === "answer") &&
      signal?.description?.type === signalType &&
      typeof signal?.description?.sdp === "string";
    const validCandidate =
      signalType === "candidate" &&
      signal?.candidate &&
      typeof signal?.candidate?.candidate === "string";

    if (
      !room ||
      !roomCode ||
      socket.data.roomCode !== roomCode ||
      !socket.rooms.has(roomCode) ||
      !player ||
      room.players.length !== 2 ||
      !room.voiceChatReady.has(playerId) ||
      !signal ||
      (!validDescription && !validCandidate)
    ) {
      socket.emit("voice-chat-error", "Unable to establish voice chat");
      return;
    }

    const peer = room.players.find(
      (candidate) =>
        candidate.id !== playerId &&
        candidate.socketId &&
        room.voiceChatReady.has(candidate.id),
    );

    if (!peer?.socketId) {
      socket.emit("voice-chat-error", "Your teammate is not ready for voice chat");
      return;
    }

    io.to(peer.socketId).emit("voice-chat-signal", {
      senderId: playerId,
      signal,
    });
  });

  socket.on("get-players", (roomCode) => {
    const room = rooms.get(roomCode);

    if (!room || !socket.rooms.has(roomCode)) return;

    socket.emit("room-info", {
      roomCode,
      isHost: room.hostId === playerId,
    });

    socket.emit(
      "player-list",
      room.players.map(({ id, nickname, socketId }) => ({
        id,
        nickname,
        connected: Boolean(socketId),
      })),
    );
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket, playerId);
  });
}
