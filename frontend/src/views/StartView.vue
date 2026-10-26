<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function continueToLobby() {
  router.push({ name: "lobby" });
}
</script>

<template>
  <main
    class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-950 text-white"
  >
    <img
      src="/images/title-background.png"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 h-full w-full object-cover"
    />

    <div aria-hidden="true" class="absolute inset-0 bg-zinc-950/45"></div>

    <button
      type="button"
      aria-label="Continue to lobby"
      class="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300"
      @click="continueToLobby"
    >
      <h1
        class="text-6xl font-black tracking-[0.12em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] sm:text-8xl"
      >
        Void Lock
      </h1>

      <span
        class="mt-8 animate-float text-sm font-medium uppercase tracking-[0.3em] text-emerald-100/90 sm:text-base"
      >
        Tap or press space to continue
      </span>
    </button>
  </main>
</template>

<style scoped>
.animate-float {
  animation: float 2.4s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-float {
    animation: none;
  }
}
</style>
