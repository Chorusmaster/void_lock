import type { Server, Socket } from "socket.io";
import type { SymbolId } from "./symbols.js";

export type PlayerRole = "Decoder" | "Operator";
export type RoomStatus = "waiting" | "revealing" | "playing";

export interface Player {
  id: string;
  socketId: string | null;
  nickname: string;
  role: PlayerRole | null;
}

export interface Room {
  hostId: string;
  rolesAssigned: boolean;
  players: Player[];
  voiceChatReady: Set<string>;
  status: RoomStatus;
  level: number;
  availableSymbols: SymbolId[];
  currentSequence: SymbolId[];
  roleRevealEndsAt: number | null;
  levelEndsAt: number | null;
}

export interface SocketData {
  playerId?: string;
  roomCode?: string;
  nickname?: string;
}

export interface VoiceChatSignal {
  type?: "offer" | "answer" | "candidate";
  description?: {
    type?: "offer" | "answer";
    sdp?: unknown;
  };
  candidate?: {
    candidate?: unknown;
  };
}

export interface ClientToServerEvents {
  "generate-sequence": (payload?: {
    roomCode?: string;
    length?: number;
  }) => void;
  "submit-code": (payload?: { roomCode?: string; code?: unknown }) => void;
  "assign-roles-manual": (payload?: {
    roomCode?: string;
    decoderId?: string;
  }) => void;
  "assign-roles-random": (payload?: { roomCode?: string }) => void;
  "restore-room": () => void;
  "create-room": (nickname: unknown) => void;
  "join-room": (payload?: { roomCode?: unknown; nickname?: unknown }) => void;
  "leave-room": () => void;
  "voice-chat-ready": (payload?: { roomCode?: string }) => void;
  "voice-chat-stop": (payload?: { roomCode?: string }) => void;
  "voice-chat-signal": (payload?: {
    roomCode?: string;
    signal?: VoiceChatSignal;
  }) => void;
  "get-players": (roomCode: string) => void;
  disconnect: () => void;
}

export interface ServerToClientEvents {
  "role-reveal": (payload: {
    role: PlayerRole;
    startAt: number;
    duration: number;
  }) => void;
  "level-started": (payload: {
    level: number;
    availableSymbols: SymbolId[];
    glitchIntensity: number;
  }) => void;
  "player-list": (
    players: Array<{ id: string; nickname: string; connected: boolean }>,
  ) => void;
  "room-info": (payload: { roomCode: string; isHost: boolean }) => void;
  "voice-chat-peer-stopped": () => void;
  "role-assigned": (payload: { roomCode: string; role: PlayerRole }) => void;
  "game-won": (payload: { level: number }) => void;
  "game-ended": (payload: { level: number }) => void;
  "room-restored": (payload: {
    roomCode: string;
    nickname: string;
    role: PlayerRole | null;
    isHost: boolean;
    status: RoomStatus;
    level: number;
    availableSymbols: SymbolId[];
    glitchIntensity: number;
    roleRevealEndsAt: number | null;
    levelEndsAt: number | null;
    levelDurationSeconds: number | null;
  }) => void;
  "room-reset": () => void;
  "level-timer-started": (payload: {
    level: number;
    duration: number;
    startAt: number;
    endsAt: number;
  }) => void;
  "level-timer-tick": (payload: {
    level: number;
    remainingSeconds: number;
  }) => void;
  "room-error": (message: string) => void;
  "sequence-generated": (payload: { sequence: SymbolId[] }) => void;
  "code-result": (payload: { isCorrect: boolean }) => void;
  "level-timer-adjusted": (payload: { level: number; endsAt: number }) => void;
  "room-created": (payload: { roomCode: string }) => void;
  "room-joined": (payload: { roomCode: string }) => void;
  "voice-chat-error": (message: string) => void;
  "voice-chat-ready": (payload: {
    roomCode: string;
    initiatorId: string;
  }) => void;
  "voice-chat-signal": (payload: {
    senderId: string;
    signal: VoiceChatSignal;
  }) => void;
}

export interface InterServerEvents {}

export type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface GameSocketDependencies {
  rooms: Map<string, Room>;
  generateSequence: (
    availableSymbols: SymbolId[],
    length: number,
  ) => SymbolId[];
  startLevel: (roomCode: string, level?: number) => void;
  startRoleReveal: (roomCode: string) => void;
  assignRoles: (roomCode: string, decoderId: string) => boolean;
  finishGame: (roomCode: string) => void;
  endLevel: (roomCode: string) => void;
  maxLevels: number;
  wrongSequencePenaltySeconds: number;
}

export interface RoomSocketDependencies {
  rooms: Map<string, Room>;
  generateRoomCode: () => string;
  broadcastPlayers: (roomCode: string) => void;
  removePlayerFromRoom: (socket: GameSocket) => void;
  restorePlayer: (socket: GameSocket) => boolean;
  handleDisconnect: (socket: GameSocket, playerId: string) => void;
}
