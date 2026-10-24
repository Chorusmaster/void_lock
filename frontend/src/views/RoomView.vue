<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { socket } from "../utils/socket";
import { useRouter } from "vue-router";
import { usePlayerStore, type PlayerRole } from "../stores/player";
import { useGameStore } from "../stores/game";

const props = defineProps<{
  roomCode: string;
}>();

const router = useRouter();
const playerStore = usePlayerStore();
const gameStore = useGameStore();
const isHost = ref(false);
const activeScreen = ref<"players" | "settings">("players");

function leaveRoom() {
  socket.emit("leave-room");
  playerStore.role = null;
  gameStore.setRoomCode("");
  gameStore.resetGame();
  router.replace({ name: "lobby" });
}

function handleRoomInfo(data: { roomCode: string; isHost: boolean }) {
  if (data.roomCode === props.roomCode) {
    isHost.value = data.isHost;
  }
}

interface Player {
  id: string;
  nickname: string;
  connected: boolean;
}

const players = ref<Player[]>([]);
const selectedDecoderId = ref("");
const errorMessage = ref("");
const isAssigning = ref(false);

const canStart = computed(
  () =>
    players.value.length === 2 &&
    players.value.every((player) => player.connected),
);

async function copyRoomCode() {
  try {
    await navigator.clipboard.writeText(props.roomCode);
  } catch {
    errorMessage.value = "Could not copy room code.";
  }
}

function handleDisconnect() {
  router.replace({ name: "lobby" });
}

function handleRoomReset() {
  playerStore.role = null;
  gameStore.resetGame();
  router.replace({
    name: "room",
    params: { roomCode: props.roomCode },
  });
}

function handlePlayerList(playerList: Player[]) {
  players.value = playerList;

  if (!playerList.some((player) => player.id === selectedDecoderId.value)) {
    selectedDecoderId.value = playerList[0]?.id ?? "";
  }
}

function assignManualRoles() {
  if (!selectedDecoderId.value || !canStart.value || !isHost.value) return;

  errorMessage.value = "";
  isAssigning.value = true;

  socket.emit("assign-roles-manual", {
    roomCode: props.roomCode,
    decoderId: selectedDecoderId.value,
  });
}

function assignRandomRoles() {
  if (!canStart.value || !isHost.value) return;

  errorMessage.value = "";
  isAssigning.value = true;

  socket.emit("assign-roles-random", {
    roomCode: props.roomCode,
  });
}

function handleRoomError(message: string) {
  errorMessage.value = message;
  isAssigning.value = false;
}

function handleRoleReveal(data: {
  role: PlayerRole;
  startAt: number;
  duration: number;
}) {
  playerStore.role = data.role;

  router.push({
    name: "role-reveal",
    params: { roomCode: props.roomCode },
    query: { startAt: String(data.startAt) },
  });
}

onMounted(() => {
  socket.on("disconnect", handleDisconnect);
  socket.on("player-list", handlePlayerList);
  socket.on("room-error", handleRoomError);
  socket.on("room-info", handleRoomInfo);
  socket.on("role-reveal", handleRoleReveal);
  socket.on("room-reset", handleRoomReset);

  if (!socket.connected) {
    router.replace({ name: "lobby" });
    return;
  }

  socket.emit("get-players", props.roomCode);
});

onUnmounted(() => {
  socket.off("disconnect", handleDisconnect);
  socket.off("player-list", handlePlayerList);
  socket.off("room-error", handleRoomError);
  socket.off("room-info", handleRoomInfo);
  socket.off("role-reveal", handleRoleReveal);
  socket.off("room-reset", handleRoomReset);
});
</script>

<template>
  <main
    class="flex min-h-screen w-full items-center justify-center bg-zinc-950 p-3 text-zinc-100 sm:p-5"
  >
    <section
      class="flex z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-emerald-900/70 bg-zinc-900/80 p-4 shadow-2xl shadow-emerald-950/20 sm:max-h-[calc(100dvh-2.5rem)] sm:p-5"
    >
      <header class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-semibold">Game Room</h1>

        <p class="shrink-0 text-sm text-zinc-400">
          <span class="font-semibold text-emerald-300"
            >{{ players.length }}/2</span
          >
          players
        </p>
      </header>

      <div class="flex-1 py-4">
        <section v-if="activeScreen === 'players'">
          <div
            class="flex items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-3"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span class="shrink-0 text-sm text-zinc-400">Room code</span>
              <span
                class="truncate font-semibold tracking-widest text-emerald-300"
              >
                {{ roomCode }}
              </span>
            </div>

            <button
              class="shrink-0 rounded-lg border border-emerald-800 px-3 py-1.5 text-sm text-emerald-300 transition hover:bg-emerald-950"
              @click="copyRoomCode"
            >
              Copy
            </button>
          </div>

          <ul class="mt-4 space-y-2">
            <li
              v-for="(player, index) in players"
              :key="player.id"
              class="flex min-w-0 items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950/50 p-3"
            >
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-900 bg-emerald-950/60 font-semibold text-emerald-300"
              >
                {{ player.nickname.charAt(0).toUpperCase() }}
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  {{ player.nickname }}
                </p>
                <p class="mt-0.5 text-xs text-zinc-500">
                  {{
                    player.connected
                      ? index === 0
                        ? "Room host"
                        : "Player"
                      : "Reconnecting..."
                  }}
                </p>
              </div>
            </li>

            <li
              v-if="players.length < 2"
              class="rounded-xl mt-4 border border-dashed border-zinc-700 px-4 py-6 text-center text-sm text-zinc-500"
            >
              Waiting for teammate...
            </li>
          </ul>
        </section>
      </div>

      <p
        v-if="errorMessage"
        role="alert"
        class="mb-3 rounded-lg border border-red-900 bg-red-950/50 p-2.5 text-sm text-red-400"
      >
        {{ errorMessage }}
      </p>

      <footer class="flex justify-end pt-3 gap-2">
        <button
          :disabled="!canStart || !isHost"
          class="flex-1 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          @click="assignRandomRoles"
        >
          Start
        </button>
        <button
          type="button"
          class="rounded-lg border border-red-900/70 px-6 py-2 text-sm text-red-400 transition hover:bg-red-950/50"
          @click="leaveRoom"
        >
          Leave
        </button>
      </footer>
    </section>
  </main>
</template>
