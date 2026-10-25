<script setup lang="ts">
import AlienMatrix from "@/ui/AlienMatrix.vue";
import { useRoute } from "vue-router";
import BackgroundMusic from "./ui/BackgroundMusic.vue";

const route = useRoute();
</script>

<template>
  <AlienMatrix class="pointer-events-none" v-if="!(route.name === 'game')" />
  <RouterView />
  <BackgroundMusic />
</template>
