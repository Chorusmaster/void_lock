import { io } from "socket.io-client";
import { getPlayerId } from "./player";

export const socket = io(import.meta.env.VITE_SOCKET_URL, {
  autoConnect: false,
  auth: {
    playerId: getPlayerId(),
  },
});
