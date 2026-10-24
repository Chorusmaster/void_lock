<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useGameStore } from "../stores/game";
import { useAlienSymbolsStore } from "../stores/alienSymbols";
import { socket } from "../utils/socket";
import { usePlayerStore } from "@/stores/player";
import HolographicPanel from "@/ui/HolographicPanel.vue";

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

    <div class="pointer-events-none absolute inset-0 z-10 bg-zinc-950/50"></div>

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

    <!-- Holographic result panel -->
    <HolographicPanel
      v-if="result !== null || errorMessage"
      :status="result && !errorMessage ? 'success' : 'error'"
    >
      <template v-if="errorMessage">
        {{ errorMessage }}
      </template>

      <template v-else-if="result"> // Vault unlocked // </template>

      <template v-else> // Access denied // </template>
    </HolographicPanel>
  </main>
</template>
