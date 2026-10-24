<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useGameStore } from "../stores/game";
import { useAlienSymbolsStore } from "../stores/alienSymbols";
import { socket } from "../utils/socket";
import { usePlayerStore } from "@/stores/player";

const player = usePlayerStore();
const gameStore = useGameStore();
const alienSymbolsStore = useAlienSymbolsStore();

const codeLength = 5;
const code = ref<(string | null)[]>(Array(codeLength).fill(null));
const result = ref<boolean | null>(null);
const errorMessage = ref("");

watch(
  () => gameStore.level,
  () => {
    code.value = Array(codeLength).fill(null);
    result.value = null;
    errorMessage.value = "";
  },
);

const symbols = computed(() =>
  gameStore.availableSymbols
    .map((id) => alienSymbolsStore.getSymbol(id))
    .filter((symbol) => symbol !== undefined),
);

const filledCount = computed(
  () => code.value.filter((symbol) => symbol !== null).length,
);

const isCodeComplete = computed(() =>
  code.value.every((symbol) => symbol !== null),
);

function addSymbol(symbolId: string) {
  console.log(symbolId);

  result.value = null;
  errorMessage.value = "";

  const index = code.value.findIndex((symbol) => symbol === null);

  if (index !== -1) {
    code.value[index] = symbolId;
  }
}

function removeSymbol(index: number) {
  result.value = null;
  errorMessage.value = "";
  code.value[index] = null;
}

function clearCode() {
  result.value = null;
  errorMessage.value = "";
  code.value = Array(codeLength).fill(null);
}

function unlockVault() {
  if (!isCodeComplete.value) return;

  result.value = null;
  errorMessage.value = "";

  socket.emit("submit-code", {
    roomCode: gameStore.roomCode,
    code: [...code.value],
  });
}

function handleCodeResult(data: { isCorrect: boolean }) {
  result.value = data.isCorrect;
  if (!data.isCorrect) player.triggerFail();
  errorMessage.value = "";
}

function handleRoomError(message: string) {
  errorMessage.value = message;
}

onMounted(() => {
  socket.on("code-result", handleCodeResult);
  socket.on("room-error", handleRoomError);
});

onUnmounted(() => {
  socket.off("code-result", handleCodeResult);
  socket.off("room-error", handleRoomError);
});

const layout = {
  codeSlots: [
    { x: 19, y: 18, width: 10, height: 20 },
    { x: 33, y: 18, width: 10, height: 20 },
    { x: 47, y: 18, width: 10, height: 20 },
    { x: 61, y: 18, width: 10, height: 20 },
    { x: 74, y: 18, width: 10, height: 20 },
  ],

  keyboard: [
    { x: 33, y: 62, width: 5, height: 5 },
    { x: 39, y: 62, width: 5, height: 5 },
    { x: 44.5, y: 62, width: 5, height: 5 },
    { x: 50, y: 62, width: 5, height: 5 },
    { x: 56, y: 62, width: 5, height: 5 },
    { x: 62, y: 62, width: 5, height: 5 },
  ],
};
</script>

<template>
  <main class="fixed inset-0 overflow-hidden bg-black text-gray-900">
    <!-- Background -->
    <img
      src="/images/vault-background.png"
      alt=""
      class="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
    />

    <div
      class="pointer-events-none absolute inset-0 z-10 bg-slate-950/50"
    ></div>

    <!-- Code slots -->
    <template v-for="(symbolId, index) in code" :key="`slot-${index}`">
      <div
        v-if="layout.codeSlots[index]"
        class="absolute flex items-center justify-center p-1"
        :style="{
          left: `${layout.codeSlots[index].x}%`,
          top: `${layout.codeSlots[index].y}%`,
          width: `${layout.codeSlots[index].width}%`,
          height: `${layout.codeSlots[index].height}%`,
        }"
      >
        <button
          type="button"
          class="flex h-full w-full items-center justify-center z-100 click:bg-fuchsia-600"
          :aria-label="`Remove symbol ${index + 1}`"
          @click="removeSymbol(index)"
        >
          <img
            v-if="symbolId && alienSymbolsStore.getImage(symbolId)"
            :src="alienSymbolsStore.getImage(symbolId)"
            :alt="symbolId"
            class="h-full w-full object-contain"
          />

          <span v-else class="text-4xl text-white/60">—</span>
        </button>
      </div>
    </template>

    <!-- Alien keyboard -->
    <template v-for="(symbol, index) in symbols" :key="symbol.id">
      <button
        v-if="layout.keyboard[index]"
        type="button"
        class="absolute flex items-center justify-center z-20"
        :style="{
          left: `${layout.keyboard[index].x}%`,
          top: `${layout.keyboard[index].y}%`,
          width: `${layout.keyboard[index].width}%`,
          height: `${layout.keyboard[index].height}%`,
        }"
        :disabled="isCodeComplete"
        @click="addSymbol(symbol.id)"
      >
        <img
          :src="symbol.src"
          :alt="symbol.id"
          class="h-full w-full object-contain"
        />
      </button>
    </template>

    <!-- Unlock button -->
    <button
      type="button"
      class="absolute rounded px-4 py-6 text-sm font-bold text-white transition z-20"
      :style="{ left: '63%', top: '77.5%' }"
      :disabled="!isCodeComplete"
      @click="unlockVault"
    >
      Unlock
    </button>

    <!-- Clear button -->
    <button
      type="button"
      class="absolute rounded px-5 py-6 text-sm font-bold text-white transition z-20"
      :style="{ left: '56.8%', top: '77.5%' }"
      @click="clearCode"
    >
      Clear
    </button>

    <!-- Result message -->
    <div
      v-if="result !== null || errorMessage"
      class="absolute left-1/2 top-5 z-30 w-[90%] max-w-md -translate-x-1/2 overflow-hidden border border-cyan-400/60 bg-cyan-400/10 p-4 text-center shadow-[0_0_15px_rgba(34,211,238,0.2),inset_0_0_20px_rgba(34,211,238,0.08)] backdrop-blur-md"
      role="status"
    >
      <!-- Holographic scan line -->
      <div
        class="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(34,211,238,0.06)_50%)] bg-[length:100%_4px]"
      ></div>

      <!-- Top and bottom accents -->
      <div class="absolute left-0 top-0 h-px w-1/3 bg-cyan-300"></div>
      <div class="absolute bottom-0 right-0 h-px w-1/3 bg-cyan-300"></div>

      <p
        class="relative mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-300/80"
      >
        Vault System / Status Report
      </p>

      <p
        v-if="errorMessage"
        class="relative font-mono text-sm font-bold uppercase tracking-wider text-red-400"
      >
        {{ errorMessage }}
      </p>

      <p
        v-else-if="result"
        class="relative font-mono text-sm font-bold uppercase tracking-wider text-cyan-300"
      >
        // Vault unlocked //
      </p>

      <p
        v-else
        class="relative font-mono text-sm font-bold uppercase tracking-wider text-red-400"
      >
        // Access denied //
      </p>
    </div>
  </main>
</template>
