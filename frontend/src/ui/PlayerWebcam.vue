<script setup lang="ts">
import { usePlayerStore } from "@/stores/player";
import { storeToRefs } from "pinia";
import { useGameStore } from "@/stores/game";

const player = storeToRefs(usePlayerStore());
const gameStore = useGameStore();
</script>

<template>
  <div class="absolute top-4 left-4 w-56">
    <div
      class="h-40 overflow-hidden rounded-lg border"
      :class="
        player.mood.value === 'ok'
          ? 'bg-gray-700 border-gray-500'
          : 'bg-red-950 border-red-700'
      "
    >
      <img
        :src="
          player.mood.value === 'ok'
            ? '/images/player1-ok.png'
            : '/images/player1-fail.png'
        "
        :alt="player.mood.value === 'ok' ? 'Player OK' : 'Player FAIL'"
        class="w-full h-full object-cover"
      />
    </div>

    <p class="text-cyan-400 mt-1 tracking-widest font-mono">Level {{ gameStore.level }} / 3</p>
  </div>
</template>