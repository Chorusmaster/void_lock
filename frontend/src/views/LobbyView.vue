<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { socket } from "../utils/socket";
import { usePlayerStore } from "../stores/player";
import { useGameStore } from "@/stores/game";

const router = useRouter();
const playerStore = usePlayerStore();
const gameStore = useGameStore();

interface RoomCreatedData {
  roomCode: string;
  players: string[];
}

interface RoomRestoredData {
  roomCode: string;
  nickname: string;
  role: "Decoder" | "Operator" | null;
  status: "waiting" | "revealing" | "playing";
  level: number;
  availableSymbols: string[];
  roleRevealEndsAt: number | null;
  levelEndsAt: number | null;
}

const connected = ref(false);
const roomCode = ref<string | null>(null);
const joinCode = ref("");
const mode = ref<"create" | "join">("create");
const errorMessage = ref("");

function createRoom() {
  errorMessage.value = "";
  const name = playerStore.username.trim();
  if (!name || !connected.value) return;

  playerStore.username = name;
  playerStore.role = null;
  socket.emit("create-room", name);
}

function joinRoom() {
  errorMessage.value = "";
  const name = playerStore.username.trim();
  const code = joinCode.value.trim().toUpperCase();

  if (!name || !code || !connected.value) return;

  playerStore.username = name;
  playerStore.role = null;
  socket.emit("join-room", {
    roomCode: code,
    nickname: name,
  });
}

function handleRoomError(message: string) {
  errorMessage.value = message;
}

function goToRoom(data: RoomCreatedData) {
  roomCode.value = data.roomCode;
  gameStore.setRoomCode(roomCode.value);

  router.push({
    name: "room",
    params: { roomCode: data.roomCode },
  });
}

function handleRoomRestored(data: RoomRestoredData) {
  playerStore.username = data.nickname;
  playerStore.role = data.role;
  gameStore.setRoomCode(data.roomCode);

  if (data.status === "revealing" && data.role && data.roleRevealEndsAt) {
    gameStore.resetGame();
    router.replace({
      name: "role-reveal",
      params: { roomCode: data.roomCode },
      query: { startAt: String(data.roleRevealEndsAt) },
    });
    return;
  }

  if (data.status === "playing" && data.role) {
    gameStore.setLevel({
      level: data.level,
      availableSymbols: data.availableSymbols,
    });
    gameStore.setTimerEndsAt(data.levelEndsAt);
    router.replace({
      name: "game",
      params: { roomCode: data.roomCode },
    });
    return;
  }

  gameStore.resetGame();
  playerStore.role = null;
  router.replace({
    name: "room",
    params: { roomCode: data.roomCode },
  });
}

function handleConnect() {
  connected.value = true;
}

function handleDisconnect() {
  connected.value = false;
  roomCode.value = null;
}

onMounted(() => {
  const alreadyConnected = socket.connected;
  connected.value = alreadyConnected;
  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("room-restored", handleRoomRestored);
  socket.on("room-created", goToRoom);
  socket.on("room-joined", goToRoom);
  socket.on("room-error", handleRoomError);

  if (alreadyConnected) {
    socket.emit("restore-room");
  } else {
    socket.connect();
  }
});

onUnmounted(() => {
  socket.off("connect", handleConnect);
  socket.off("disconnect", handleDisconnect);
  socket.off("room-restored", handleRoomRestored);
  socket.off("room-created", goToRoom);
  socket.off("room-joined", goToRoom);
  socket.off("room-error", handleRoomError);
});
</script>

<template>
  <main
    class="flex min-h-screen w-full items-center justify-center bg-zinc-950 p-6 text-zinc-100"
  >
    <section class="w-full max-w-md z-10">
      <div
        class="rounded-2xl border border-emerald-900/70 bg-zinc-900/80 p-6 shadow-2xl shadow-emerald-950/20"
      >
        <div class="mb-6">
          <label
            for="nickname"
            class="mb-2 block text-sm font-medium text-zinc-300"
          >
            Your nickname
          </label>

          <input
            id="nickname"
            v-model="playerStore.username"
            placeholder="Enter your nickname"
            maxlength="20"
            required
            class="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>

        <div
          v-if="errorMessage"
          role="alert"
          class="mb-5 rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400"
        >
          {{ errorMessage }}
        </div>

        <div class="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-zinc-950 p-1">
          <button
            type="button"
            @click="mode = 'create'"
            class="rounded-lg px-3 py-3 text-sm font-semibold transition"
            :class="
              mode === 'create'
                ? 'border border-emerald-800 bg-emerald-950/60 text-emerald-300 shadow-lg shadow-emerald-950/30'
                : 'text-zinc-500 hover:text-zinc-200'
            "
          >
            Create room
          </button>

          <button
            type="button"
            @click="mode = 'join'"
            class="rounded-lg px-3 py-3 text-sm font-semibold transition"
            :class="
              mode === 'join'
                ? 'border border-emerald-800 bg-emerald-950/60 text-emerald-300 shadow-lg shadow-emerald-950/30'
                : 'text-zinc-500 hover:text-zinc-200'
            "
          >
            Join room
          </button>
        </div>

        <div v-if="mode === 'create'" class="space-y-5">
          <p class="text-center text-sm leading-6 text-zinc-400">
            Create a secure channel and invite your partner to the mission.
          </p>

          <button
            type="button"
            :disabled="!connected || !playerStore.username.trim()"
            @click="createRoom"
            class="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Initialize room
          </button>

          <div
            v-if="roomCode"
            class="rounded-xl border border-emerald-900 bg-zinc-950 p-4 text-center"
          >
            <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Access code
            </p>

            <p
              class="mt-2 text-3xl font-bold tracking-[0.35em] text-emerald-300"
            >
              {{ roomCode }}
            </p>

            <p class="mt-2 text-xs text-zinc-500">
              Share this code with your partner
            </p>
          </div>
        </div>

        <form v-else @submit.prevent="joinRoom" class="space-y-5">
          <p class="text-center text-sm leading-6 text-zinc-400">
            Enter your partner's access code to join the mission.
          </p>

          <input
            v-model="joinCode"
            placeholder="ENTER CODE"
            maxlength="6"
            required
            class="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-center text-lg uppercase tracking-[0.4em] text-emerald-300 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
          />

          <button
            type="submit"
            :disabled="
              !connected || !playerStore.username.trim() || !joinCode.trim()
            "
            class="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Connect to room
          </button>
        </form>
      </div>
    </section>
  </main>
</template>
