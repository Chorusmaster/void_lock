<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useAlienSymbolsStore } from "@/stores/alienSymbols";

const alienStore = useAlienSymbolsStore();

interface FallingSymbol {
  key: number;
  src: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  opacity: number;
  delay: number;
}

const fallingSymbols = ref<FallingSymbol[]>([]);
let nextKey = 0;
let spawnInterval: ReturnType<typeof setInterval> | undefined;
const removalTimers: ReturnType<typeof setTimeout>[] = [];

function spawnSymbol() {
  const symbols = alienStore.symbols;

  if (!symbols.length) return;

  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const duration = 10 + Math.random() * 7;
  const key = nextKey++;

  if (!symbol) return;

  fallingSymbols.value.push({
    key,
    src: symbol.src,
    left: Math.random() * 95,
    top: Math.random() * 95,
    size: 20 + Math.random() * 24,
    duration,
    opacity: Math.random() * 0.4,
    delay: -Math.random() * 4,
  });

  const timer = setTimeout(() => {
    fallingSymbols.value = fallingSymbols.value.filter(
      (item) => item.key !== key,
    );
  }, duration * 1000);

  removalTimers.push(timer);
}

onMounted(() => {
  for (let i = 0; i < 12; i++) {
    spawnSymbol();
  }

  spawnInterval = setInterval(spawnSymbol, 250);
});

onUnmounted(() => {
  if (spawnInterval) clearInterval(spawnInterval);
  removalTimers.forEach(clearTimeout);
});
</script>

<template>
  <div class="alien-matrix">
    <img
      v-for="symbol in fallingSymbols"
      :key="symbol.key"
      :src="symbol.src"
      alt=""
      class="falling-symbol"
      :style="{
        left: `${symbol.left}%`,
        top: `${symbol.top}%`,
        width: `${symbol.size}px`,
        height: `${symbol.size}px`,
        '--symbol-opacity': symbol.opacity,
        animationDelay: `${symbol.delay}s`,
      }"
    />
  </div>
</template>

<style scoped>
.alien-matrix {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.falling-symbol {
  position: absolute;
  top: 0;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgb(34 211 238 / 25%));
  animation: alien-flicker 4s ease-in-out infinite;
  will-change: opacity;
}

@keyframes alien-flicker {
  0%,
  100% {
    opacity: 0;
  }

  50% {
    opacity: var(--symbol-opacity, 0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .falling-symbol {
    animation: none;
    opacity: 0.2;
  }
}
</style>
