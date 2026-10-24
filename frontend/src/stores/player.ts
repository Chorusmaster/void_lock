import { defineStore } from "pinia";
import { ref, computed } from "vue";

export type PlayerRole = "Decoder" | "Operator";

export const usePlayerStore = defineStore("player", () => {
  const storedUsername = localStorage.getItem("username") ?? "";
  const usernameState = ref(storedUsername);

  const username = computed({
    get: () => usernameState.value,
    set: (value: string) => {
      usernameState.value = value;
      localStorage.setItem("username", value);
    },
  });

  const role = ref<PlayerRole | null>(null);

  return { username, role };
});