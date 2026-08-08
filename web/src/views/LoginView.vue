<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useAuthStore } from "@/stores/auth"
import { useRouter } from "vue-router"
import api from "@/lib/api"
import { Bell } from "lucide-vue-next"

const auth = useAuthStore()
const router = useRouter()

// 登录
const loginUsername = ref("")
const loginPassword = ref("")
const loginError = ref("")
const loginLoading = ref(false)

async function doLogin() {
  loginError.value = ""
  if (!loginUsername.value || !loginPassword.value) {
    loginError.value = "请输入用户名和密码"
    return
  }
  loginLoading.value = true
  const result = await auth.login(loginUsername.value, loginPassword.value)
  loginLoading.value = false
  if (result.success) {
    router.push("/reminders")
  } else {
    loginError.value = result.error || "登录失败"
  }
}

// 注册
const showRegister = ref(false)
const registerEmail = ref("")
const registerPassword = ref("")
const captchaCode = ref("")
const captchaId = ref("")
const captchaSvg = ref("")
const registerError = ref("")
const registerLoading = ref(false)

async function refreshCaptcha() {
  try {
    const res = await api.get("/auth/captcha")
    if (res.data.success && res.data.data) {
      captchaId.value = res.data.data.id
      captchaSvg.value = res.data.data.svg
    }
  } catch {
    registerError.value = "获取验证码失败"
  }
}

async function doRegister() {
  registerError.value = ""
  if (!registerEmail.value || !registerPassword.value) {
    registerError.value = "请输入邮箱和密码"
    return
  }
  if (registerPassword.value.length < 6) {
    registerError.value = "密码至少需要 6 位"
    return
  }
  if (!captchaCode.value) {
    registerError.value = "请输入验证码"
    return
  }
  registerLoading.value = true
  const result = await auth.register(registerEmail.value, registerPassword.value, captchaId.value, captchaCode.value)
  registerLoading.value = false
  if (result.success) {
    alert("注册成功，请登录")
    loginUsername.value = registerEmail.value
    registerEmail.value = ""
    registerPassword.value = ""
    captchaCode.value = ""
    showRegister.value = false
  } else {
    registerError.value = result.error || "注册失败"
    await refreshCaptcha()
  }
}

onMounted(() => {
  if (auth.isAuthenticated) router.push("/reminders")
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
    <!-- 登录卡片 -->
    <div v-if="!showRegister" class="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <Bell class="size-7 text-white" />
        </div>
        <h2 class="text-2xl font-bold text-white">事项提醒系统</h2>
        <p class="mt-1 text-sm text-slate-400">登录以管理你的提醒事项</p>
      </div>
      <form @submit.prevent="doLogin" class="space-y-4">
        <div>
          <label for="login-username" class="mb-1.5 block text-sm text-slate-300">用户名 / 邮箱</label>
          <input
            id="login-username"
            v-model="loginUsername"
            type="text"
            autocomplete="username"
            placeholder="admin@example.com"
            class="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label for="login-password" class="mb-1.5 block text-sm text-slate-300">密码</label>
          <input
            id="login-password"
            v-model="loginPassword"
            type="password"
            autocomplete="current-password"
            placeholder="••••••"
            class="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div v-if="loginError" class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{{ loginError }}</div>
        <button
          type="submit"
          :disabled="loginLoading"
          class="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {{ loginLoading ? "登录中..." : "登 录" }}
        </button>
      </form>
      <p class="mt-4 text-center text-sm text-slate-400">
        还没有账号？
        <button class="font-medium text-indigo-400 hover:text-indigo-300" @click="showRegister = true; refreshCaptcha()">立即注册</button>
      </p>
    </div>

    <!-- 注册卡片 -->
    <div v-else class="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <Bell class="size-7 text-white" />
        </div>
        <h2 class="text-2xl font-bold text-white">创建账号</h2>
        <p class="mt-1 text-sm text-slate-400">注册一个新账号</p>
      </div>
      <form @submit.prevent="doRegister" class="space-y-4">
        <div>
          <label for="reg-email" class="mb-1.5 block text-sm text-slate-300">邮箱</label>
          <input
            id="reg-email"
            v-model="registerEmail"
            type="email"
            autocomplete="email"
            placeholder="your@email.com"
            class="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label for="reg-password" class="mb-1.5 block text-sm text-slate-300">密码（至少 6 位）</label>
          <input
            id="reg-password"
            v-model="registerPassword"
            type="password"
            minlength="6"
            placeholder="••••••"
            class="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label for="captcha" class="mb-1.5 block text-sm text-slate-300">验证码</label>
          <div class="flex gap-3">
            <input
              id="captcha"
              v-model="captchaCode"
              type="text"
              maxlength="4"
              placeholder="4位验证码"
              class="flex-1 rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-center text-lg uppercase tracking-widest text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div class="flex h-[42px] w-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/10" @click="refreshCaptcha">
              <span v-if="captchaSvg" v-html="captchaSvg" />
              <span v-else class="text-xs text-slate-500">加载中</span>
            </div>
          </div>
        </div>
        <div v-if="registerError" class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{{ registerError }}</div>
        <button
          type="submit"
          :disabled="registerLoading"
          class="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {{ registerLoading ? "注册中..." : "注 册" }}
        </button>
      </form>
      <p class="mt-4 text-center text-sm text-slate-400">
        已有账号？
        <button class="font-medium text-indigo-400 hover:text-indigo-300" @click="showRegister = false">返回登录</button>
      </p>
    </div>
  </div>
</template>
