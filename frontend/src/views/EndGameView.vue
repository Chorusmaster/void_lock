<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { computed } from "vue";
import { socket } from "../utils/socket";
import { usePlayerStore } from "../stores/player";
import { useGameStore } from "../stores/game";
import { Trophy, Clock3 } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const playerStore = usePlayerStore();
const gameStore = useGameStore();

function backToLobby() {
  router.replace({
    name: "room",
    params: { roomCode: String(route.params.roomCode) },
  });
}

function leaveRoom() {
  socket.emit("leave-room");
  playerStore.role = null;
  gameStore.setRoomCode("");
  router.replace({ name: "lobby" });
}

const isWinner = computed(() => route.query.result === "won");
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-slate-950 p-3 text-slate-100 sm:p-5"
  >
    <section
      class="w-full z-10 max-w-md rounded-2xl border border-cyan-900/70 bg-slate-900/90 p-5 text-center shadow-2xl shadow-cyan-950/20 sm:p-6"
    >
      <div class="mb-4 flex justify-center text-cyan-400">
        <Trophy v-if="isWinner" :size="48" :stroke-width="1.5" />
        <Clock3 v-else :size="48" :stroke-width="1.5" />
      </div>

      <h1 class="mb-3 text-2xl font-bold">
        {{ isWinner ? "Vault Unlocked!" : "Time's Up!" }}
      </h1>

      <p class="mb-6 text-sm leading-6 text-slate-400">
        {{
          isWinner
            ? "Congratulations! You cleared all 3 levels and cracked the alien code. Return to the room lobby to play again."
            : "Time ran out, but your room is still open. Return to the room lobby to play again."
        }}
      </p>

      <button
        class="w-full rounded-xl border border-cyan-700 bg-cyan-950/50 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-900/50"
        @click="backToLobby"
      >
        Return to Room Lobby
      </button>

      <button
        class="mt-3 w-full rounded-xl border border-red-900/70 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/50"
        @click="leaveRoom"
      >
        Leave Room
      </button>
    </section>
  </main>
</template>
