<script setup lang="ts">
import AlienMatrix from "@/ui/AlienMatrix.vue";
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <AlienMatrix class="pointer-events-none" v-if="!(route.name === 'game')" />
  <RouterView />
</template>
