<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "@/stores/game";

const props = defineProps<{
  remainingSeconds: number;
  maxDurationSeconds: number;
}>();

const formattedTime = computed(() => {
  const minutes = Math.floor(props.remainingSeconds / 60);
  const seconds = props.remainingSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
});

const progressPercentage = computed(() => {
  if (props.maxDurationSeconds <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (props.remainingSeconds / props.maxDurationSeconds) * 100),
  );
});

const gameStore = useGameStore();
</script>

<template>
  <div
    class="absolute right-4 top-4 z-10 w-64 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 backdrop-blur-sm select-none"
  >
    <div class="mb-3 flex items-center justify-between gap-2">
      <span class="text-sm font-semibold tracking-wider text-emerald-200/80">
        TIME REMAINING
      </span>

      <span
        class="font-mono text-3xl font-bold tabular-nums"
        :class="remainingSeconds <= 10 ? 'text-red-400' : 'text-emerald-300'"
      >
        {{ formattedTime }}
      </span>
    </div>

    <div class="h-3 overflow-hidden rounded-full bg-emerald-950/60">
      <div
        class="h-full rounded-full transition-[width] duration-250"
        :class="remainingSeconds <= 10 ? 'bg-red-400' : 'bg-emerald-400'"
        :style="{ width: `${progressPercentage}%` }"
      />
    </div>

    <div class="mt-4 border-t border-emerald-500/20 pt-3">
      <div class="flex gap-2 items-center">
        <span class="text-sm font-semibold tracking-wider text-emerald-200/80">
          LEVEL
        </span>
        <span class="font-mono text-lg font-bold text-emerald-300">
          {{ gameStore.level }}
        </span>
      </div>
    </div>
  </div>
</template>
