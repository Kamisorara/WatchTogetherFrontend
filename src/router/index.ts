import { createRouter, createWebHashHistory } from "vue-router";
import AboutView from "../views/AboutView.vue";
import HomeView from "../views/HomeView.vue";
import MainView from "../views/MainView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";


const routes = [
  { path: '/', name: "Login", component: LoginView },
  { path: '/home', name: "Home", component: HomeView },
  // { path: '/login', name: "Login", component: LoginView },
  { path: '/register', name: "Register", component: RegisterView },
  { path: '/about', name: "About", component: AboutView },
  { path: '/main', name: "Main", component: MainView },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});


export default router;