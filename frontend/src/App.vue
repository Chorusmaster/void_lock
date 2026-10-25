<script setup lang="ts">
import { onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGameStore } from "@/stores/game";
import { usePlayerStore, type PlayerRole } from "@/stores/player";
import { socket } from "@/utils/socket";
import AlienMatrix from "@/ui/AlienMatrix.vue";
import BackgroundMusic from "./ui/BackgroundMusic.vue";

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const playerStore = usePlayerStore();

interface RoomRestoredData {
  roomCode: string;
  nickname: string;
  role: PlayerRole | null;
  status: "waiting" | "revealing" | "playing";
  level: number;
  availableSymbols: string[];
  glitchIntensity: number;
  roleRevealEndsAt: number | null;
  levelEndsAt: number | null;
}

interface LevelStartedData {
  level: number;
  availableSymbols: string[];
  glitchIntensity: number;
}

function handleRoomCreated(data: { roomCode: string }) {
  if (route.name !== "lobby") return;

  gameStore.setRoomCode(data.roomCode);
  router.push({
    name: "room",
    params: { roomCode: data.roomCode },
  });
}

function handleRoomRestored(data: RoomRestoredData) {
  if (route.name !== "lobby") return;

  playerStore.username = data.nickname;
  playerStore.role = data.role;
  gameStore.setRoomCode(data.roomCode);

  if (data.status === "revealing" && data.role && data.roleRevealEndsAt) {
    gameStore.resetGame();
    router.replace({
      name: "role-reveal",
      params: { roomCode: data.roomCode },
      query: { startAt: String(data.roleRevealEndsAt) },
    });
    return;
  }

  if (data.status === "playing" && data.role) {
    gameStore.setLevel({
      level: data.level,
      availableSymbols: data.availableSymbols,
      glitchIntensity: data.glitchIntensity,
    });
    gameStore.setTimerEndsAt(data.levelEndsAt);
    router.replace({
      name: "game",
      params: { roomCode: data.roomCode },
    });
    return;
  }

  gameStore.resetGame();
  playerStore.role = null;
  router.replace({
    name: "room",
    params: { roomCode: data.roomCode },
  });
}

function handleRoleReveal(data: {
  role: PlayerRole;
  startAt: number;
  duration: number;
}) {
  if (route.name !== "room" && route.name !== "end-game") return;

  playerStore.role = data.role;
  router.push({
    name: "role-reveal",
    params: { roomCode: String(route.params.roomCode) },
    query: { startAt: String(data.startAt) },
  });
}

function handleLevelStarted(data: LevelStartedData) {
  if (
    route.name !== "room" &&
    route.name !== "role-reveal" &&
    route.name !== "end-game"
  ) {
    return;
  }

  gameStore.setLevel(data);
  router.replace({
    name: "game",
    params: { roomCode: String(route.params.roomCode) },
  });
}

function handleRoomReset() {
  if (!["room", "role-reveal", "game"].includes(String(route.name))) return;

  const roomCode = String(route.params.roomCode);
  playerStore.role = null;
  gameStore.resetGame();
  router.replace({
    name: "room",
    params: { roomCode },
  });
}

function handleGameEnd(result: "won" | "ended") {
  if (route.name !== "game") return;

  const roomCode = String(route.params.roomCode);
  gameStore.resetGame();
  playerStore.role = null;
  router.replace({
    name: "end-game",
    params: { roomCode },
    query: { result },
  });
}

function handleGameEnded() {
  handleGameEnd("ended");
}

function handleGameWon() {
  handleGameEnd("won");
}

function handleDisconnect() {
  if (route.name === "room" || route.name === "game") {
    router.replace({ name: "lobby" });
  }
}

socket.on("room-created", handleRoomCreated);
socket.on("room-joined", handleRoomCreated);
socket.on("room-restored", handleRoomRestored);
socket.on("role-reveal", handleRoleReveal);
socket.on("level-started", handleLevelStarted);
socket.on("room-reset", handleRoomReset);
socket.on("game-ended", handleGameEnded);
socket.on("game-won", handleGameWon);
socket.on("disconnect", handleDisconnect);

onUnmounted(() => {
  socket.off("room-created", handleRoomCreated);
  socket.off("room-joined", handleRoomCreated);
  socket.off("room-restored", handleRoomRestored);
  socket.off("role-reveal", handleRoleReveal);
  socket.off("level-started", handleLevelStarted);
  socket.off("room-reset", handleRoomReset);
  socket.off("game-ended", handleGameEnded);
  socket.off("game-won", handleGameWon);
  socket.off("disconnect", handleDisconnect);
});
</script>

<template>
  <AlienMatrix class="pointer-events-none" v-if="!(route.name === 'game')" />
  <RouterView />
  <BackgroundMusic />
</template>
