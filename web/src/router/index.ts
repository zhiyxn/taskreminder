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
        meta: { title: "用户管理", requiresAdmin: true },
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("@/views/SettingsView.vue"),
        meta: { title: "系统设置" },
      },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/reminders" },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to, _from) => {
  const auth = useAuthStore()
  await auth.initialize()

  if (to.name === "login") {
    if (!auth.isAuthenticated) return true

    const redirect = typeof to.query.redirect === "string" ? to.query.redirect : ""
    return redirect.startsWith("/") && !redirect.startsWith("//") && redirect !== "/login"
      ? redirect
      : "/reminders"
  }

  if (!auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } }
  }

  if (to.matched.some((record) => record.meta.requiresAdmin) && !auth.isAdmin) {
    return "/reminders"
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 事项提醒系统` : "事项提醒系统"
})

export default router
