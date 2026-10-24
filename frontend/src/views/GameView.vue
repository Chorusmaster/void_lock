<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
import { socket } from "../socket";
import { useGameStore } from "../stores/game";
import { usePlayerStore } from "../stores/player";
import { useRoute, useRouter } from "vue-router";
import SequenceView from "./SequenceView.vue";
import VaultView from "./VaultView.vue";

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const playerStore = usePlayerStore();

const timerEndsAt = ref<number | null>(null);
const remainingSeconds = ref(0);
const errorMessage = ref("");

let timerInterval: ReturnType<typeof setInterval> | undefined;

const formattedTime = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
});

function updateTimer() {
  if (timerEndsAt.value === null) return;

  remainingSeconds.value = Math.max(
    0,
    Math.ceil((timerEndsAt.value - Date.now()) / 1000),
  );
}

function handleTimerStarted(data: { endsAt: number }) {
  timerEndsAt.value = data.endsAt;

  updateTimer();

  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 250);
}

function handleTimerTick(data: { remainingSeconds: number }) {
  remainingSeconds.value = data.remainingSeconds;
}

function handleSequenceGenerated(data: { sequence: string[] }) {
  gameStore.setSecretCode(data.sequence);
}

function handleRoomError(message: string) {
  errorMessage.value = message;
}

function handleDisconnect() {
  router.replace({ name: "lobby" });
}

function handleGameEnded() {
  router.replace({ name: "end-game" });
}

function handleGameWon() {
  router.replace({
    name: "end-game",
    query: { result: "won" },
  });
}

onMounted(() => {});

onMounted(() => {
  if (!socket.connected) {
    router.replace({ name: "lobby" });
    return;
  }

  socket.on("sequence-generated", handleSequenceGenerated);
  socket.on("room-error", handleRoomError);

  if (playerStore.role === "Decoder" && gameStore.level > 0) {
    socket.emit("generate-sequence", {
      roomCode: String(route.params.roomCode),
      length: 5,
    });
  }

  socket.on("disconnect", handleDisconnect);
  socket.on("level-timer-started", handleTimerStarted);
  socket.on("level-timer-tick", handleTimerTick);
  socket.on("game-ended", handleGameEnded);
  socket.on("game-won", handleGameWon);
});

onUnmounted(() => {
  socket.off("sequence-generated", handleSequenceGenerated);
  socket.off("room-error", handleRoomError);
  socket.off("disconnect", handleDisconnect);
  socket.off("level-timer-started", handleTimerStarted);
  socket.off("level-timer-tick", handleTimerTick);
  socket.off("game-ended", handleGameEnded);
  socket.off("game-won", handleGameWon);

  clearInterval(timerInterval);
});
</script>

<template>
  <main class="min-h-screen p-6">
    <div class="mx-auto mb-8 w-full max-w-md">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-500"> TIME REMAINING </span>

        <span
          class="font-mono text-2xl font-bold tabular-nums"
          :class="remainingSeconds <= 10 ? 'text-red-500' : 'text-white'"
        >
          {{ formattedTime }}
        </span>
      </div>

      <div class="h-2 overflow-hidden rounded-full bg-gray-700">
        <div
          class="h-full rounded-full transition-[width] duration-250"
          :class="remainingSeconds <= 10 ? 'bg-red-500' : 'bg-green-500'"
          :style="{ width: `${Math.min(100, (remainingSeconds / 30) * 100)}%` }"
        />
      </div>
    </div>

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
