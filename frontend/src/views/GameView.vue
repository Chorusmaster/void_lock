<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { socket } from '../socket'
import { useGameStore } from '../stores/game'
import { usePlayerStore } from '../stores/player'
import { useRoute } from 'vue-router'
import SequenceView from './SequenceView.vue'
import VaultView from './VaultView.vue'

const route = useRoute()
const gameStore = useGameStore()
const playerStore = usePlayerStore()

function handleSequenceGenerated(data: { sequence: string[] }) {
  gameStore.setSecretCode(data.sequence)
}

onMounted(() => {
  socket.on('sequence-generated', handleSequenceGenerated)

  if (playerStore.role === 'Decoder' && gameStore.level > 0) {
    socket.emit('generate-sequence', {
      roomCode: String(route.params.roomCode),
      length: 5,
    })
  }
})

onUnmounted(() => {
  socket.off('sequence-generated', handleSequenceGenerated)
})
</script>

<template>
  <SequenceView v-show="playerStore.role == 'Decoder'" />
  <VaultView v-show="playerStore.role == 'Operator'" />
</template>
