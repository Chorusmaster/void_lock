<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePlayerStore } from "../stores/player";

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();

const seconds = ref(5);
const role = computed(() => playerStore.role ?? "");

let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  const startAt = Number(route.query.startAt);

  if (!role.value || !Number.isFinite(startAt) || startAt <= 0) {
    router.replace({ name: "lobby" });
    return;
  }

  const updateCountdown = () => {
    seconds.value = Math.max(0, Math.ceil((startAt - Date.now()) / 1000));
  };

  updateCountdown();
  timer = setInterval(updateCountdown, 100);

});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-zinc-950 p-3 text-zinc-100 sm:p-5"
  >
    <section
      class="w-full z-10 max-w-md rounded-2xl border border-emerald-900/70 bg-zinc-900/90 p-5 text-center shadow-2xl shadow-emerald-950/20 sm:p-6"
    >
      <p
        class="text-xs font-medium uppercase tracking-[0.25em] text-emerald-500"
      >
        Your assigned role
      </p>

      <h1 class="mt-5 text-3xl font-bold text-zinc-100">
        {{ role }}
      </h1>

      <p class="mt-3 text-sm leading-6 text-zinc-400">
        {{
          role === "Decoder"
            ? "Describe the alien symbols to your teammate"
            : "Listen to your teammate and enter the correct code"
        }}
      </p>

      <div
        class="mx-auto mt-7 flex size-20 items-center justify-center rounded-full border-2 border-emerald-800 bg-emerald-950/40 shadow-lg shadow-emerald-950/20"
      >
        <span class="text-3xl font-semibold tabular-nums text-emerald-300">
          {{ seconds }}
        </span>
      </div>

      <p class="mt-4 text-sm text-zinc-500">Entering the game...</p>
    </section>
  </main>
</template>
