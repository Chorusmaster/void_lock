<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { computed } from "vue";

const router = useRouter();
const route = useRoute();

function backToLobby() {
  router.replace({
    name: "room",
    params: { roomCode: String(route.params.roomCode) },
  });
}

const isWinner = computed(() => route.query.result === "won");
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"
  >
    <section
      class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center"
    >
      <div class="mb-5 text-6xl">{{ isWinner ? "🏆" : "⌛" }}</div>

      <h1 class="mb-3 text-3xl font-bold">
        {{ isWinner ? "Vault Unlocked!" : "Time's Up!" }}
      </h1>

      <p class="mb-8 text-slate-400">
        {{
          isWinner
            ? "Congratulations! You cleared all 3 levels and cracked the alien code. Return to the room lobby to play again."
            : "Time ran out, but your room is still open. Return to the room lobby to play again."
        }}
      </p>

      <button
        class="w-full rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-950 transition hover:bg-white"
        @click="backToLobby"
      >
        Return to Room Lobby
      </button>
    </section>
  </main>
</template>
