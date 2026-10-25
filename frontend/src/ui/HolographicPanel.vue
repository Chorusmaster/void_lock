<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    status: "success" | "error";
    duration?: number;
  }>(),
  {
    duration: 3000,
  },
);

const visible = ref(true);
let timeoutId: ReturnType<typeof setTimeout> | undefined;

function startTimer() {
  if (timeoutId) clearTimeout(timeoutId);

  visible.value = true;

  timeoutId = setTimeout(() => {
    visible.value = false;
  }, props.duration);
}

onMounted(startTimer);

watch(() => [props.status, props.duration], startTimer);

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId);
});
</script>

<template>
  <div
    class="absolute left-1/2 top-5 z-30 w-[90%] max-w-md -translate-x-1/2 overflow-hidden border p-4 text-center backdrop-blur-md"
    :class="
      status === 'success'
        ? 'border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_15px_rgba(16,185,129,0.2),inset_0_0_20px_rgba(16,185,129,0.08)]'
        : 'border-red-500/60 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2),inset_0_0_20px_rgba(239,68,68,0.08)]'
    "
    role="status"
  >
    <!-- Scan lines -->
    <div
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.04)_50%)] bg-[length:100%_4px]"
    ></div>

    <!-- Decorative accents -->
    <div
      class="absolute left-0 top-0 h-px w-1/3"
      :class="status === 'success' ? 'bg-emerald-300' : 'bg-red-400'"
    ></div>

    <div
      class="absolute bottom-0 right-0 h-px w-1/3"
      :class="status === 'success' ? 'bg-emerald-300' : 'bg-red-400'"
    ></div>

    <p
      class="relative mb-2 text-[10px] font-bold uppercase tracking-[0.35em]"
      :class="status === 'success' ? 'text-emerald-300/80' : 'text-red-300/80'"
    >
      Vault System / Status Report
    </p>

    <div
      class="relative font-mono text-sm font-bold uppercase tracking-wider"
      :class="status === 'success' ? 'text-emerald-300' : 'text-red-400'"
    >
      <slot />
    </div>
  </div>
</template>
