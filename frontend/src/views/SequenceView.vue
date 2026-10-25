<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, watch } from "vue";
import { useGameStore } from "../stores/game";
import { useAlienSymbolsStore } from "@/stores/alienSymbols";

const gameStore = useGameStore();
const alienSymbolsStore = useAlienSymbolsStore();

const glitchIntensity = ref(0.5);
const cutoutMaskId = useId();

const symbols = computed(() =>
  gameStore.secretCode.map((id) => ({
    id,
    image: alienSymbolsStore.getImage(id),
  })),
);

interface Cutout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GlitchState {
  cutouts: Cutout[];
}

const glitchStates = ref<GlitchState[]>([]);
let glitchInterval: ReturnType<typeof setInterval> | undefined;

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createCutouts(): Cutout[] {
  const intensity = Math.max(0, Math.min(1, glitchIntensity.value));

  if (intensity === 0) return [];

  const count = Math.round(3 + intensity * 9);

  return Array.from({ length: count }, () => {
    const size = random(8, 22) + intensity * random(5, 25);
    const height = random(5, 14) + intensity * random(5, 20);

    return {
      x: random(0, 100 - size),
      y: random(0, 100 - height),
      width: size,
      height,
    };
  });
}

function updateGlitches() {
  const intensity = Math.max(0, Math.min(1, glitchIntensity.value));
  glitchStates.value = symbols.value.map(() => ({
    cutouts: Math.random() < intensity ? createCutouts() : [],
  }));
}

watch(
  () => symbols.value.length,
  (length) => {
    glitchStates.value = Array.from({ length }, () => ({
      cutouts: createCutouts(),
    }));
  },
  { immediate: true },
);

watch(glitchIntensity, () => {
  glitchStates.value = symbols.value.map(() => ({
    cutouts: createCutouts(),
  }));
});

onMounted(() => {
  updateGlitches();
  glitchInterval = setInterval(updateGlitches, 1000);
});

onUnmounted(() => {
  clearInterval(glitchInterval);
});
</script>

<template>
  <main class="fixed inset-0 overflow-hidden bg-zinc-950 text-zinc-100">
    <div
      class="absolute left-1/2 top-1/2"
      :style="{
        width: 'max(100vw, 177.7778vh)',
        height: 'max(100vh, 56.25vw)',
        transform: 'translate(-50%, -50%)',
      }"
    >
      <img
        src="/images/sequence-background.png"
        alt=""
        class="absolute inset-0 h-full w-full"
      />

      <div class="absolute inset-0 bg-zinc-950/20"></div>

      <svg class="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <mask
            v-for="(state, index) in glitchStates"
            :id="`${cutoutMaskId}-${index}`"
            :key="index"
            maskUnits="objectBoundingBox"
            maskContentUnits="objectBoundingBox"
          >
            <rect width="1" height="1" fill="white" />
            <rect
              v-for="(cutout, cutIndex) in state.cutouts"
              :key="cutIndex"
              :x="cutout.x / 100"
              :y="cutout.y / 100"
              :width="cutout.width / 100"
              :height="cutout.height / 100"
              fill="black"
            />
          </mask>
        </defs>
      </svg>

      <div
        class="absolute z-10 grid grid-cols-5 text-center"
        :style="{
          left: '46%',
          top: '43%',
          width: '40%',
          columnGap: '1%',
          transform: 'translate(-50%, -50%)',
        }"
      >
        <div
          v-for="(symbol, index) in symbols"
          :key="index"
          class="relative flex aspect-square items-center justify-center p-[8%]"
        >
          <div v-if="symbol.image" class="relative h-full w-full">
            <img
              :src="symbol.image"
              :alt="symbol.id"
              class="h-full w-full object-contain"
              :style="{
                mask: `url(#${cutoutMaskId}-${index})`,
                WebkitMask: `url(#${cutoutMaskId}-${index})`,
              }"
            />
          </div>

          <span v-else class="text-sm text-red-400">
            {{ symbol.id || "?" }}
          </span>
        </div>
      </div>
    </div>
  </main>
</template>
