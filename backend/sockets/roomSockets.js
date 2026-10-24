export function registerRoomSockets(
  socket,
  playerId,
  {
    rooms,
    generateRoomCode,
    broadcastPlayers,
    removePlayerFromRoom,
    restorePlayer,
    handleDisconnect,
  },
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
        },
      ],
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
