<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { socket } from "../utils/socket";
import { usePlayerStore, type PlayerRole } from "../stores/player";
import { useGameStore } from "../stores/game";

const gameStore = useGameStore();

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();

const seconds = ref(5);
const role = computed(() => playerStore.role ?? "");
const roomCode = computed(() => String(route.params.roomCode ?? ""));

let timer: ReturnType<typeof setInterval> | undefined;

function handleStartLevel(data: { level: number; availableSymbols: string[] }) {
  if (timer) clearInterval(timer);

  gameStore.setLevel(data);

  router.replace({
    name: "game",
    params: { roomCode: roomCode.value },
  });
}

function handleRoomReset() {
  playerStore.role = null;
  gameStore.resetGame();
  router.replace({
    name: "room",
    params: { roomCode: roomCode.value },
  });
}

onMounted(() => {
  const startAt = Number(route.query.startAt);

  if (!role.value || !Number.isFinite(startAt) || startAt <= 0) {
    router.replace({ name: "lobby" });
    return;
  }

  const updateCountdown = () => {
    seconds.value = Math.max(0, Math.ceil((startAt - Date.now()) / 1000));
  };

  updateCountdown();
  timer = setInterval(updateCountdown, 100);

  socket.on("level-started", handleStartLevel);
  socket.on("room-reset", handleRoomReset);
});

onUnmounted(() => {
  socket.off("level-started", handleStartLevel);
  socket.off("room-reset", handleRoomReset);

  if (timer) clearInterval(timer);
});
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-slate-950 p-3 text-slate-100 sm:p-5"
  >
    <section
      class="w-full z-10 max-w-md rounded-2xl border border-cyan-900/70 bg-slate-900/90 p-5 text-center shadow-2xl shadow-cyan-950/20 sm:p-6"
    >
      <p class="text-xs font-medium uppercase tracking-[0.25em] text-cyan-500">
        Your assigned role
      </p>

      <h1 class="mt-5 text-3xl font-bold text-slate-100">
        {{ role }}
      </h1>

      <p class="mt-3 text-sm leading-6 text-slate-400">
        {{
          role === "Decoder"
            ? "Decode the alien symbols and guide your teammate."
            : "Listen to your teammate and enter the correct code."
        }}
      </p>

      <div
        class="mx-auto mt-7 flex size-20 items-center justify-center rounded-full border-2 border-cyan-800 bg-cyan-950/40 shadow-lg shadow-cyan-950/20"
      >
        <span class="text-3xl font-semibold tabular-nums text-cyan-300">
          {{ seconds }}
        </span>
      </div>

      <p class="mt-4 text-sm text-slate-500">
        Entering the game...
      </p>
    </section>
  </main>
</template>