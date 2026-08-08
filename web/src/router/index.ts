import { createRouter, createWebHashHistory } from "vue-router"
import type { RouteRecordRaw } from "vue-router"
import { useAuthStore } from "@/stores/auth"

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
    meta: { title: "登录" },
  },
  {
    path: "/",
    component: () => import("@/components/layout/AppLayout.vue"),
    children: [
      { path: "", redirect: "/reminders" },
      {
        path: "reminders",
        name: "reminders",
        component: () => import("@/views/DashboardView.vue"),
        meta: { title: "仪表盘" },
      },
      {
        path: "logs",
        name: "logs",
        component: () => import("@/views/LogsView.vue"),
        meta: { title: "通知日志" },
      },
      {
        path: "users",
        name: "users",
        component: () => import("@/views/UsersView.vue"),
        meta: { title: "用户管理" },
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("@/views/SettingsView.vue"),
        meta: { title: "系统设置" },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, _from) => {
  if (to.path === "/login") return true

  const auth = useAuthStore()
  if (!auth.isAuthenticated) return "/login"

  if (to.path === "/users" && !auth.isAdmin) return "/reminders"

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 事项提醒系统` : "事项提醒系统"
})

export default router
