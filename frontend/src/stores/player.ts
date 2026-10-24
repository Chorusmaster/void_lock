import { defineStore } from "pinia";
import { ref } from "vue";

export type PlayerRole = "Decoder" | "Operator";

export const usePlayerStore = defineStore("player", () => {
  const username = ref("");
  const role = ref<PlayerRole | null>(null);

  return { username, role };
});
