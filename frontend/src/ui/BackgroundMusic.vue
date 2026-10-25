<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const audio = ref<HTMLAudioElement | null>(null);

onMounted(() => {
  if (audio.value?.volume) {
    audio.value.volume = 0;
  }
  audio.value?.play().catch(() => {
    console.error("Audio error")
  });
});

onUnmounted(() => {
  audio.value?.pause();
});
</script>

<template>
  <audio
    ref="audio"
    src="/audio/background.ogg"
    loop
    preload="auto"
  />
</template>