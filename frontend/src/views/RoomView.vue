
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { socket } from "../socket";
import { useRouter } from "vue-router";
import { usePlayerStore, type PlayerRole } from "../stores/player";

const props = defineProps<{
  roomCode: string;
}>();

const router = useRouter();
const playerStore = usePlayerStore();
const isHost = ref(false);

function handleRoomInfo(data: {
  roomCode: string;
  isHost: boolean;
}) {
  if (data.roomCode === props.roomCode) {
    isHost.value = data.isHost;
  }
}

interface Player {
  id: string;
  nickname: string;
}

const players = ref<Player[]>([])
const selectedDecoderId = ref("")
const errorMessage = ref("")
const isAssigning = ref(false)

const canStart = computed(() => players.value.length === 2);

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

function handlePlayerList(playerList: Player[]) {
  players.value = playerList;

  if (!playerList.some((player) => player.id === selectedDecoderId.value)) {
    selectedDecoderId.value = playerList[0]?.id ?? "";
  }
}

function assignManualRoles() {
  if (!selectedDecoderId.value || !canStart.value || !isHost) return;

  errorMessage.value = "";
  isAssigning.value = true;

  socket.emit("assign-roles-manual", {
    roomCode: props.roomCode,
    decoderId: selectedDecoderId.value,
  });
}

function assignRandomRoles() {
  if (!canStart.value || !isHost) return;

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
  role: PlayerRole
  startAt: number
  duration: number
}) {
  playerStore.role = data.role

  router.push({
    name: 'role-reveal',
    params: { roomCode: props.roomCode },
    query: { startAt: String(data.startAt) },
  })
}

onMounted(() => {
  socket.on("disconnect", handleDisconnect)
  socket.on("player-list", handlePlayerList)
  socket.on("room-error", handleRoomError)
  socket.on("room-info", handleRoomInfo)
  socket.on('role-reveal', handleRoleReveal)

  if (!socket.connected) {
    router.replace({ name: "lobby" });
    return;
  }

  socket.emit("get-players", props.roomCode)
});

onUnmounted(() => {
  socket.off("disconnect", handleDisconnect)
  socket.off("player-list", handlePlayerList)
  socket.off("room-error", handleRoomError)
  socket.off("room-info", handleRoomInfo)
  socket.off('role-reveal', handleRoleReveal)
});
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-50 p-6">
    <section class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header>
        <p class="text-sm font-medium text-gray-500">GAME LOBBY</p>
        <h1 class="mt-1 text-2xl font-semibold text-gray-900">Game Room</h1>

        <div class="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-4">
          <div>
            <p class="text-xs text-gray-500">ROOM CODE</p>
            <p class="mt-1 text-xl font-bold tracking-[0.2em] text-gray-900">
              {{ roomCode }}
            </p>
          </div>

          <button
            class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            @click="copyRoomCode"
          >
            Copy code
          </button>
        </div>
      </header>

      <section class="mt-6">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">Players</h2>
          <span class="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
            {{ players.length }} / 2
          </span>
        </div>

        <ul class="space-y-2">
          <li
            v-for="(player, index) in players"
            :key="player.id"
            class="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
          >
            <span class="flex size-10 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
              {{ player.nickname.charAt(0).toUpperCase() }}
            </span>

            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-gray-900">
                {{ player.nickname }}
              </p>
              <p class="text-xs text-gray-500">
                {{ index === 0 ? "Room creator" : "Player" }}
              </p>
            </div>

            <span
              v-if="isHost && selectedDecoderId === player.id"
              class="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700"
            >
              Decoder
            </span>
          </li>

          <li
            v-if="players.length < 2"
            class="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500"
          >
            Waiting for your teammate to join...
          </li>
        </ul>
      </section>

      <section v-if="isHost" class="mt-6 border-t border-gray-100 pt-5">
        <h2 class="font-semibold text-gray-900">Assign roles</h2>
        <p class="mt-1 text-sm text-gray-500">
          Choose who decodes the symbols, or let the game decide randomly.
        </p>

        <label class="mt-4 block text-sm font-medium text-gray-700">
          Decoder
        </label>
        <select
          v-model="selectedDecoderId"
          :disabled="!canStart || isAssigning"
          class="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option
            v-for="player in players"
            :key="player.id"
            :value="player.id"
          >
            {{ player.nickname }}
          </option>
        </select>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            :disabled="!canStart || !selectedDecoderId || isAssigning"
            class="rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            @click="assignManualRoles"
          >
            Assign manually
          </button>

          <button
            :disabled="!canStart || isAssigning"
            class="rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            @click="assignRandomRoles"
          >
            Random roles
          </button>
        </div>
      </section>

      <section v-else class="mt-6 rounded-xl bg-gray-50 p-4 text-center">
        <p class="font-medium text-gray-800">Waiting for the host</p>
        <p class="mt-1 text-sm text-gray-500">
          The host will assign roles before the game starts.
        </p>
      </section>

      <p
        v-if="errorMessage"
        class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>
    </section>
  </main>
</template>
