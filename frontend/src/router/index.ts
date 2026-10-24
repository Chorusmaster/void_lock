import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
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
      props: true,
    },
    {
      path: "/game/:roomCode",
      name: "game",
      component: () => import("../views/GameView.vue"),
      props: true,
    },
  ],
});

export default router;
