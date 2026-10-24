export function registerGameSockets(
  io,
  socket,
  playerId,
  {
    rooms,
    generateSequence,
    startLevel,
    startRoleReveal,
    assignRoles,
    finishGame,
    endLevel,
    maxLevels,
    wrongSequencePenaltySeconds,
  },
) {
  socket.on("generate-sequence", ({ roomCode, length } = {}) => {
    const room = rooms.get(roomCode);
    const player = room?.players.find(({ id }) => id === playerId);

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
    const player = room?.players.find(({ id }) => id === playerId);

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

      if (room.level < maxLevels) {
        startLevel(roomCode, room.level + 1);
      } else {
        finishGame(roomCode);
      }
    } else {
      socket.emit("code-result", { isCorrect: false });
      room.levelEndsAt = Math.max(
        Date.now(),
        room.levelEndsAt - wrongSequencePenaltySeconds * 1000,
      );
      io.to(roomCode).emit("level-timer-adjusted", {
        level: room.level,
        endsAt: room.levelEndsAt,
      });

      if (room.levelEndsAt <= Date.now()) {
        endLevel(roomCode);
      }
    }
  });

  socket.on("assign-roles-manual", ({ roomCode, decoderId } = {}) => {
    const room = rooms.get(roomCode);

    if (!room || room.hostId !== playerId) {
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

    if (!room || room.hostId !== playerId) {
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
}

import { SYMBOL_IDS } from './symbols.js'

export function getRandomSymbols(count) {
  if (count < 1 || count > SYMBOL_IDS.length) {
    throw new Error('Invalid number of symbols')
  }

  const shuffled = [...SYMBOL_IDS]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}

export function generateSequence(availableSymbols, length) {
  if (
    availableSymbols.length === 0 ||
    !Number.isInteger(length) ||
    length < 1
  ) {
    throw new Error('Invalid sequence parameters')
  }

  return Array.from(
    { length },
    () => availableSymbols[
      Math.floor(Math.random() * availableSymbols.length)
    ],
  )
}