import { defineStore } from "pinia";
import { ref, computed } from "vue";

export type PlayerRole = "Decoder" | "Operator";

export const usePlayerStore = defineStore("player", () => {
  const storedUsername = localStorage.getItem("username") ?? "";
  const usernameState = ref(storedUsername);
  const mood = ref<"ok" | "fail">("ok");

  const username = computed({
    get: () => usernameState.value,
    set: (value: string) => {
      usernameState.value = value;
      localStorage.setItem("username", value);
    },
  });

  function triggerFail() {
    mood.value = "fail";

    setTimeout(() => {
      mood.value = "ok";
    }, 1000);
  }

  const role = ref<PlayerRole | null>(null);

  return { username, role, mood, triggerFail };
});
