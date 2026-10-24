<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { socket } from "../utils/socket.ts";
import { useGameStore } from "../stores/game";
import { usePlayerStore } from "../stores/player";
import { useRoute, useRouter } from "vue-router";
import SequenceView from "./SequenceView.vue";
import VaultView from "./VaultView.vue";
import PlayerWebcam from "@/ui/PlayerWebcam.vue";
import GameTimer from "@/ui/GameTimer.vue";

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const playerStore = usePlayerStore();

const timerEndsAt = ref<number | null>(null);
const remainingSeconds = ref(0);
const errorMessage = ref("");

let timerInterval: ReturnType<typeof setInterval> | undefined;

function updateTimer() {
  if (timerEndsAt.value === null) return;

  remainingSeconds.value = Math.max(
    0,
    Math.ceil((timerEndsAt.value - Date.now()) / 1000),
  );
}

function handleTimerStarted(data: { endsAt: number }) {
  handleTimerAdjusted(data);

  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 250);
}

function handleTimerAdjusted(data: { endsAt: number }) {
  timerEndsAt.value = data.endsAt;
  gameStore.setTimerEndsAt(data.endsAt);

  updateTimer();
}

function handleTimerTick(data: { remainingSeconds: number }) {
  remainingSeconds.value = data.remainingSeconds;
}

function handleSequenceGenerated(data: { sequence: string[] }) {
  gameStore.setSecretCode(data.sequence);
}

function handleLevelStarted(data: {
  level: number;
  availableSymbols: string[];
}) {
  gameStore.setLevel(data);

  if (playerStore.role === "Decoder") {
    socket.emit("generate-sequence", {
      roomCode: String(route.params.roomCode),
      length: 5,
    });
  }
}

function handleRoomError(message: string) {
  errorMessage.value = message;
}

function handleDisconnect() {
  router.replace({ name: "lobby" });
}

function handleRoomReset() {
  gameStore.resetGame();
  playerStore.role = null;
  router.replace({
    name: "room",
    params: { roomCode: String(route.params.roomCode) },
  });
}

function showEndGame(result: "won" | "ended") {
  gameStore.resetGame();
  playerStore.role = null;
  router.replace({
    name: "end-game",
    params: { roomCode: String(route.params.roomCode) },
    query: { result },
  });
}

function handleGameEnded() {
  showEndGame("ended");
}

function handleGameWon() {
  showEndGame("won");
}

onMounted(() => {
  if (!socket.connected) {
    router.replace({ name: "lobby" });
    return;
  }

  socket.on("sequence-generated", handleSequenceGenerated);
  socket.on("level-started", handleLevelStarted);
  socket.on("room-error", handleRoomError);

  if (playerStore.role === "Decoder" && gameStore.level > 0) {
    socket.emit("generate-sequence", {
      roomCode: String(route.params.roomCode),
      length: 5,
    });
  }

  socket.on("disconnect", handleDisconnect);
  socket.on("level-timer-started", handleTimerStarted);
  socket.on("level-timer-adjusted", handleTimerAdjusted);
  socket.on("level-timer-tick", handleTimerTick);
  socket.on("game-ended", handleGameEnded);
  socket.on("game-won", handleGameWon);
  socket.on("room-reset", handleRoomReset);

  if (gameStore.timerEndsAt !== null) {
    handleTimerStarted({ endsAt: gameStore.timerEndsAt });
  }
});

onUnmounted(() => {
  socket.off("sequence-generated", handleSequenceGenerated);
  socket.off("level-started", handleLevelStarted);
  socket.off("room-error", handleRoomError);
  socket.off("disconnect", handleDisconnect);
  socket.off("level-timer-started", handleTimerStarted);
  socket.off("level-timer-adjusted", handleTimerAdjusted);
  socket.off("level-timer-tick", handleTimerTick);
  socket.off("game-ended", handleGameEnded);
  socket.off("game-won", handleGameWon);
  socket.off("room-reset", handleRoomReset);

  clearInterval(timerInterval);
});
</script>

<template>
  <PlayerWebcam class="z-10" status="ok" />
  <main class="relative min-h-screen bg-zinc-800">
    <GameTimer :remaining-seconds="remainingSeconds" />

    <SequenceView v-show="playerStore.role === 'Decoder'" />
    <VaultView v-show="playerStore.role === 'Operator'" />

    <p
      v-if="errorMessage"
      role="alert"
      class="mx-auto mt-4 max-w-md rounded-lg bg-red-50 p-3 text-center text-sm text-red-700"
    >
      {{ errorMessage }}
    </p>
  </main>
</template>
