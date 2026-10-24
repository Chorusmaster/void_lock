<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  remainingSeconds: number;
}>();

const formattedTime = computed(() => {
  const minutes = Math.floor(props.remainingSeconds / 60);
  const seconds = props.remainingSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
});
</script>

<template>
  <div class="absolute right-6 top-6 z-10 w-40">
    <div class="mb-2 flex items-center justify-between gap-2">
      <span class="text-xs font-medium text-gray-100">TIME REMAINING</span>

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
        :class="remainingSeconds <= 10 ? 'bg-red-500' : 'bg-cyan-400'"
        :style="{
          width: `${Math.min(100, (remainingSeconds / 30) * 100)}%`,
        }"
      />
    </div>
  </div>
</template>
