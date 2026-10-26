import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "start",
      component: () => import("../views/StartView.vue"),
    },
    {
      path: "/lobby",
      name: "lobby",
      component: () => import("../views/LobbyView.vue"),
    },
    {
      path: "/room/:roomCode",
      name: "room",
      component: () => import("../views/RoomView.vue"),
      props: true,
    },
    {
      path: "/room/:roomCode/role",
      name: "role-reveal",
      component: () => import("../views/RoleRevealView.vue"),
    },
    {
      path: "/game/:roomCode",
      name: "game",
      component: () => import("../views/GameView.vue"),
    },
    {
      path: "/end-game/:roomCode",
      name: "end-game",
      component: () => import("../views/EndGameView.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "start" },
    },
  ],
});

export default router;
