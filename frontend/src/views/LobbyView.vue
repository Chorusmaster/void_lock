<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { socket } from "../socket";
import { usePlayerStore } from "../stores/player";
import { useGameStore } from "@/stores/game";

const router = useRouter();
const playerStore = usePlayerStore();
const gameStore = useGameStore();

interface RoomCreatedData {
  roomCode: string;
  players: string[];
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

onMounted(() => {
  connected.value = socket.connected;
  socket.connect();

  socket.on("connect", () => {
    connected.value = true;
  });

  socket.on("disconnect", () => {
    connected.value = false;
    roomCode.value = null;
  });

  socket.on("room-created", goToRoom);
  socket.on("room-joined", goToRoom);

  socket.on("room-error", handleRoomError);
});

onUnmounted(() => {
  socket.off("room-error", handleRoomError);
});
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <section
      class="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <header class="mb-6 text-center">
        <h1 class="text-2xl font-semibold text-gray-900">Game Lobby</h1>
        <p class="mt-2 text-sm text-gray-500">
          {{ connected ? "Connected" : "Connecting to server..." }}
        </p>
      </header>

      <div class="mb-5">
        <label
          for="nickname"
          class="mb-2 block text-sm font-medium text-gray-700"
        >
          Your nickname
        </label>

        <input
          id="nickname"
          v-model="playerStore.username"
          placeholder="Enter your nickname"
          maxlength="20"
          required
          class="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />
      </div>

      <div
        v-if="errorMessage"
        role="alert"
        class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <div class="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          @click="mode = 'create'"
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="
            mode === 'create'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          "
        >
          Create room
        </button>

        <button
          type="button"
          @click="mode = 'join'"
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="
            mode === 'join'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          "
        >
          Join room
        </button>
      </div>

      <div v-if="mode === 'create'" class="space-y-4">
        <p class="text-center text-sm text-gray-600">
          Create a room and invite your friends.
        </p>

        <button
          type="button"
          :disabled="!connected || !playerStore.username.trim()"
          @click="createRoom"
          class="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create room
        </button>

        <div
          v-if="roomCode"
          class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center"
        >
          <p class="text-sm text-gray-500">Your room code</p>
          <p class="mt-1 text-2xl font-semibold tracking-widest text-gray-900">
            {{ roomCode }}
          </p>
        </div>
      </div>

      <form v-else @submit.prevent="joinRoom" class="space-y-4">
        <p class="text-center text-sm text-gray-600">
          Enter the code shared by the host.
        </p>

        <input
          v-model="joinCode"
          placeholder="Enter room code"
          maxlength="6"
          required
          class="w-full rounded-lg border border-gray-300 px-3 py-3 text-center uppercase tracking-widest outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />

        <button
          type="submit"
          :disabled="
            !connected || !playerStore.username.trim() || !joinCode.trim()
          "
          class="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Join room
        </button>
      </form>
    </section>
  </main>
</template>
