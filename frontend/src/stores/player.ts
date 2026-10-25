import { defineStore } from "pinia";
import { ref, computed } from "vue";

export type PlayerRole = "Decoder" | "Operator";

export const usePlayerStore = defineStore("player", () => {
  const storedUsername = localStorage.getItem("username") ?? "";
  const usernameState = ref(storedUsername);
  const mood = ref<"ok" | "fail">("ok");
  let failTimeout: ReturnType<typeof setTimeout> | undefined;

  const username = computed({
    get: () => usernameState.value,
    set: (value: string) => {
      usernameState.value = value;
      localStorage.setItem("username", value);
    },
  });

  function triggerFail(duration = 1000) {
    if (failTimeout) {
      clearTimeout(failTimeout);
    }

    mood.value = "fail";

    failTimeout = setTimeout(() => {
      mood.value = "ok";
      failTimeout = undefined;
    }, duration);
  }

  const role = ref<PlayerRole | null>(null);

  return { username, role, mood, triggerFail };
});
