<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useGameStore } from "../stores/game";
import { useAlienSymbolsStore } from "../stores/alienSymbols";
import { socket } from "../utils/socket";
import { usePlayerStore } from "@/stores/player";
import HolographicPanel from "@/ui/HolographicPanel.vue";

const buttonSound = new Audio("/audio/click.ogg");
const errorSound = new Audio("/audio/error.mp3");

const player = usePlayerStore();
const gameStore = useGameStore();
const alienSymbolsStore = useAlienSymbolsStore();

const codeLength = 5;
const code = ref<(string | null)[]>(Array(codeLength).fill(null));
const result = ref<boolean | null>(null);
const errorMessage = ref("");

const props = defineProps<{
  errorTrigger: number;
}>();

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

const isCodeComplete = computed(() =>
  code.value.every((symbol) => symbol !== null),
);

function addSymbol(symbolId: string) {
  buttonSound.currentTime = 0;
  buttonSound.play();

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

  if (!data.isCorrect) {
    player.triggerFail(600);
    flashRed();
  }

  errorMessage.value = "";
}

function handleRoomError(message: string) {
  errorSound.currentTime = 0;
  errorSound.play();
  player.triggerFail(600);
  flashRed();

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
    { x: 24, y: 18, width: 8, height: 18 },
    { x: 36, y: 18, width: 8, height: 18 },
    { x: 47, y: 18, width: 8, height: 18 },
    { x: 58, y: 18, width: 8, height: 18 },
    { x: 70, y: 18, width: 8, height: 18 },
  ],

  keyboard: [
    { x: 34.5, y: 61, width: 5, height: 5 },
    { x: 39.5, y: 61, width: 5, height: 5 },
    { x: 45, y: 61, width: 5, height: 5 },
    { x: 50, y: 61, width: 5, height: 5 },
    { x: 55.5, y: 61, width: 5, height: 5 },
    { x: 60.5, y: 61, width: 5, height: 5 },
  ],
};


const isRedFlashing = ref(false);
let flashTimeout: ReturnType<typeof setTimeout> | undefined;

function flashRed() {
  if (flashTimeout) clearTimeout(flashTimeout);

  isRedFlashing.value = true;

  flashTimeout = setTimeout(() => {
    isRedFlashing.value = false;
    flashTimeout = undefined;
  }, 600);
}

watch(
  () => props.errorTrigger,
  () => flashRed(),
);

onUnmounted(() => {
  if (flashTimeout) clearTimeout(flashTimeout);
});
</script>

<template>
  
  <main class="fixed inset-0 overflow-hidden bg-black text-gray-900">
    <div
      class="absolute left-1/2 top-1/2"
      :style="{
        width: 'max(100vw, 177.7778vh)',
        height: 'max(100vh, 56.25vw)',
        transform: 'translate(-50%, -50%)',
      }"
    >
      <img
        src="/images/vault-background.png"
        alt=""
        class="pointer-events-none absolute inset-0 h-full w-full select-none"
      />

      <div
        class="pointer-events-none absolute inset-0 z-5 bg-red-600 transition-opacity duration-150"
        :class="isRedFlashing ? 'opacity-20' : 'opacity-0'"
      >
      </div>

      <div class="pointer-events-none absolute inset-0 z-10 bg-zinc-950/50"></div>

      <!-- Code slots -->
      <template v-for="(symbolId, index) in code" :key="`slot-${index}`">
        <div
          v-if="layout.codeSlots[index]"
          class="absolute z-20 flex items-center justify-center p-1"
          :style="{
            left: `${layout.codeSlots[index].x}%`,
            top: `${layout.codeSlots[index].y}%`,
            width: `${layout.codeSlots[index].width}%`,
            height: `${layout.codeSlots[index].height}%`,
          }"
        >
          <button
            type="button"
            class="flex h-full w-full items-center justify-center"
            :aria-label="`Remove symbol ${index + 1}`"
            @click="removeSymbol(index)"
          >
            <img
              v-if="symbolId && alienSymbolsStore.getImage(symbolId)"
              :src="alienSymbolsStore.getImage(symbolId)"
              :alt="symbolId"
              class="h-full w-full object-contain select-none"
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
          class="absolute z-20 flex items-center justify-center"
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
            class="h-full w-full object-contain select-none"
          />
        </button>
      </template>

      <!-- Unlock button -->
      <button
        type="button"
        class="absolute z-20 rounded px-4 py-6 text-sm font-bold text-white disabled:text-gray-500 transition"
        :style="{ left: '61.5%', top: '79%' }"
        :disabled="!isCodeComplete"
        @click="unlockVault"
      >
        Unlock
      </button>

      <!-- Clear button -->
      <button
        type="button"
        class="absolute z-20 rounded px-5 py-6 text-sm font-bold text-white transition"
        :style="{ left: '56%', top: '79%' }"
        @click="clearCode"
      >
        Clear
      </button>
    </div>

    <!-- Holographic result panel -->
    <HolographicPanel
      v-if="result !== null || errorMessage"
      :status="result && !errorMessage ? 'success' : 'error'"
      :duration="2000"
    >
      <template v-if="errorMessage">
        {{ errorMessage }}
      </template>

      <template v-else-if="result"> // Code unlocked // </template>

      <template v-else> // Invalid syntax // </template>
    </HolographicPanel>
  </main>
</template>
