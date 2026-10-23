<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

const connected = ref(false)
const roomCode = ref(null)

let socket

function createRoom() {
  socket.emit('create-room')
}

onMounted(() => {
  socket = io('http://localhost:3000')

  socket.on('connect', () => {
    connected.value = true
  })

  socket.on('disconnect', () => {
    connected.value = false
    roomCode.value = null
  })

  socket.on('room-created', (data) => {
    roomCode.value = data.roomCode
  })
})

onUnmounted(() => {
  socket?.disconnect()
})

const joinCode = ref('')

function joinRoom() {
  const code = joinCode.value.trim().toUpperCase()
  if (!code) return

  console.log('Joining room:', code)
}
</script>

<template>
  <main>
    <h1>Game Lobby</h1>

    <p>{{ connected ? 'Connected' : 'Disconnected' }}</p>

    <button :disabled="!connected" @click="createRoom" class="p-2 bg-amber-300 rounded-xl">
      Create room
    </button>

    <section v-if="roomCode">
      <h2>Room created!</h2>
      <p>Room code: <strong>{{ roomCode }}</strong></p>
    </section>

    <form @submit.prevent="joinRoom">
      <input
        v-model="joinCode"
        placeholder="Enter room code"
        maxlength="6"
        required
      />

      <button type="submit" class="p-2 bg-amber-300 rounded-xl">Join room</button>
    </form>
  </main>
</template>