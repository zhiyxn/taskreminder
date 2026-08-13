<script setup lang="ts">
import { ref } from "vue"
import { useAuthStore } from "@/stores/auth"
import { useRoute, useRouter } from "vue-router"
import api from "@/lib/api"
import { Bell } from "lucide-vue-next"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useForm } from "vee-validate"
import { email, exactLength, minLength, required } from "@/lib/formValidation"

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

function postLoginPath() {
  const redirect = typeof route.query.redirect === "string" ? route.query.redirect : ""
  return redirect.startsWith("/") && !redirect.startsWith("//") && redirect !== "/login"
    ? redirect
    : "/reminders"
}

// 登录
const loginError = ref("")
const loginLoading = ref(false)

const {
  handleSubmit: handleLoginSubmit,
  defineField: defineLoginField,
  errors: loginErrors,
} = useForm({
  validationSchema: {
    loginUsername: required("请输入用户名或邮箱"),
    loginPassword: required("请输入密码"),
  },
  initialValues: { loginUsername: "", loginPassword: "" },
})

const [loginUsername, loginUsernameAttrs] = defineLoginField("loginUsername")
const [loginPassword, loginPasswordAttrs] = defineLoginField("loginPassword")

const doLogin = handleLoginSubmit(async (values) => {
  loginError.value = ""
  loginLoading.value = true
  const result = await auth.login(values.loginUsername.trim(), values.loginPassword)
  loginLoading.value = false
  if (result.success) {
    router.replace(postLoginPath())
  } else {
    loginError.value = result.error || "登录失败"
  }
})

// 注册
const showRegister = ref(false)
const captchaId = ref("")
const captchaSvg = ref("")
const registerError = ref("")
const registerLoading = ref(false)

const {
  handleSubmit: handleRegisterSubmit,
  defineField: defineRegisterField,
  resetForm: resetRegisterForm,
  errors: registerErrors,
  setFieldError: setRegisterFieldError,
} = useForm({
  validationSchema: {
    registerEmail: email("请输入有效的邮箱地址"),
    registerPassword: minLength(6, "密码至少需要 6 位"),
    captchaCode: exactLength(4, "请输入 4 位验证码"),
  },
  initialValues: { registerEmail: "", registerPassword: "", captchaCode: "" },
})

const [registerEmail, registerEmailAttrs] = defineRegisterField("registerEmail")
const [registerPassword, registerPasswordAttrs] = defineRegisterField("registerPassword")
const [captchaCode, captchaCodeAttrs] = defineRegisterField("captchaCode")

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

const doRegister = handleRegisterSubmit(async (values) => {
  registerError.value = ""
  registerLoading.value = true
  const result = await auth.register(values.registerEmail.trim(), values.registerPassword, captchaId.value, values.captchaCode.trim())
  registerLoading.value = false
  if (result.success) {
    alert("注册成功，请登录")
    loginUsername.value = values.registerEmail.trim()
    resetRegisterForm()
    showRegister.value = false
  } else {
    const message = result.error || "注册失败"
    if (message.includes("邮箱")) setRegisterFieldError("registerEmail", message)
    else if (message.includes("验证码")) setRegisterFieldError("captchaCode", message)
    else registerError.value = message
    await refreshCaptcha()
  }
})

</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
    <!-- 背景装饰光斑 -->
    <div class="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-48 -left-20 size-[22rem] rounded-full bg-primary/10 blur-3xl" />
    <div class="pointer-events-none absolute top-1/4 left-[10%] size-48 rounded-full bg-primary/10 blur-2xl" />
    <div class="pointer-events-none absolute top-[60%] right-[5%] size-56 rounded-full bg-primary/10 blur-3xl" />
    <div class="pointer-events-none absolute top-[15%] right-[20%] size-32 rounded-full bg-primary/20 blur-2xl" />
    <div class="pointer-events-none absolute bottom-[25%] left-[40%] size-40 rounded-full bg-primary/10 blur-2xl" />
    <div class="pointer-events-none absolute top-[40%] right-[30%] size-28 rounded-full bg-primary/15 blur-xl" />
    <div class="pointer-events-none absolute top-[5%] left-[30%] size-36 rounded-full bg-primary/10 blur-2xl" />
    <div class="pointer-events-none absolute bottom-[10%] right-[25%] size-44 rounded-full bg-primary/10 blur-3xl" />
    <div class="pointer-events-none absolute top-[70%] left-[5%] size-24 rounded-full bg-primary/10 blur-xl" />
    <div class="pointer-events-none absolute top-[30%] left-[55%] size-20 rounded-full bg-primary/15 blur-xl" />

    <!-- 登录卡片 -->
    <div v-if="!showRegister" class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
          <Bell class="size-7 text-primary-foreground" />
        </div>
        <h2 class="text-2xl font-bold text-foreground">事项提醒系统</h2>
        <p class="mt-1 text-sm text-muted-foreground">登录以管理你的提醒事项</p>
      </div>
      <form @submit.prevent="doLogin" class="space-y-4">
        <div>
          <label for="login-username" class="mb-1.5 block text-sm font-medium text-foreground">用户名 / 邮箱</label>
          <Input
            id="login-username"
            v-model="loginUsername"
            v-bind="loginUsernameAttrs"
            :aria-invalid="!!loginErrors.loginUsername"
            aria-describedby="login-username-error"
            type="text"
            autocomplete="username"
            placeholder="admin@example.com"
          />
          <p v-if="loginErrors.loginUsername" id="login-username-error" class="mt-1 text-xs text-destructive">{{ loginErrors.loginUsername }}</p>
        </div>
        <div>
          <label for="login-password" class="mb-1.5 block text-sm font-medium text-foreground">密码</label>
          <Input
            id="login-password"
            v-model="loginPassword"
            v-bind="loginPasswordAttrs"
            :aria-invalid="!!loginErrors.loginPassword"
            aria-describedby="login-password-error"
            type="password"
            autocomplete="current-password"
            placeholder="••••••"
          />
          <p v-if="loginErrors.loginPassword" id="login-password-error" class="mt-1 text-xs text-destructive">{{ loginErrors.loginPassword }}</p>
        </div>
        <div v-if="loginError" class="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{{ loginError }}</div>
        <Button
          type="submit"
          :disabled="loginLoading"
          class="w-full"
        >
          {{ loginLoading ? "登录中..." : "登 录" }}
        </Button>
      </form>
      <p class="mt-5 text-center text-sm text-muted-foreground">
        还没有账号？
        <button class="font-semibold text-primary hover:text-primary/80" @click="showRegister = true; refreshCaptcha()">立即注册</button>
      </p>
    </div>

    <!-- 注册卡片 -->
    <div v-else class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
          <Bell class="size-7 text-primary-foreground" />
        </div>
        <h2 class="text-2xl font-bold text-foreground">创建账号</h2>
        <p class="mt-1 text-sm text-muted-foreground">注册一个新账号</p>
      </div>
      <form @submit.prevent="doRegister" class="space-y-4">
        <div>
          <label for="reg-email" class="mb-1.5 block text-sm font-medium text-foreground">邮箱</label>
          <Input
            id="reg-email"
            v-model="registerEmail"
            v-bind="registerEmailAttrs"
            :aria-invalid="!!registerErrors.registerEmail"
            aria-describedby="reg-email-error"
            type="email"
            autocomplete="email"
            placeholder="your@email.com"
          />
          <p v-if="registerErrors.registerEmail" id="reg-email-error" class="mt-1 text-xs text-destructive">{{ registerErrors.registerEmail }}</p>
        </div>
        <div>
          <label for="reg-password" class="mb-1.5 block text-sm font-medium text-foreground">密码（至少 6 位）</label>
          <Input
            id="reg-password"
            v-model="registerPassword"
            v-bind="registerPasswordAttrs"
            :aria-invalid="!!registerErrors.registerPassword"
            aria-describedby="reg-password-error"
            type="password"
            minlength="6"
            placeholder="••••••"
          />
          <p v-if="registerErrors.registerPassword" id="reg-password-error" class="mt-1 text-xs text-destructive">{{ registerErrors.registerPassword }}</p>
        </div>
        <div>
          <label for="captcha" class="mb-1.5 block text-sm font-medium text-foreground">验证码</label>
          <div class="flex gap-3">
            <Input
              id="captcha"
              v-model="captchaCode"
              v-bind="captchaCodeAttrs"
              :aria-invalid="!!registerErrors.captchaCode"
              aria-describedby="captcha-error"
              type="text"
              maxlength="4"
              placeholder="4位验证码"
              class="flex-1 text-center text-lg font-semibold uppercase tracking-widest"
            />
            <div class="flex h-10 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-muted/50" @click="refreshCaptcha">
              <span v-if="captchaSvg" v-html="captchaSvg" />
              <span v-else class="text-xs text-muted-foreground">加载中</span>
            </div>
          </div>
          <p v-if="registerErrors.captchaCode" id="captcha-error" class="mt-1 text-xs text-destructive">{{ registerErrors.captchaCode }}</p>
        </div>
        <div v-if="registerError" class="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{{ registerError }}</div>
        <Button
          type="submit"
          :disabled="registerLoading"
          class="w-full"
        >
          {{ registerLoading ? "注册中..." : "注 册" }}
        </Button>
      </form>
      <p class="mt-5 text-center text-sm text-muted-foreground">
        已有账号？
        <button class="font-semibold text-primary hover:text-primary/80" @click="showRegister = false">返回登录</button>
      </p>
    </div>
  </div>
</template>
