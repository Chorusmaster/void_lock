<script setup lang="ts">
  import { usePlayerStore } from '@/stores/player';
  import SequenceView from './SequenceView.vue';
  import VaultView from './VaultView.vue';

  const playerStore = usePlayerStore();
</script>

<template>
  <SequenceView v-show="playerStore.role=='Decoder'" />
  <VaultView v-show="playerStore.role=='Operator'" />
</template>