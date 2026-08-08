<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useAuthStore } from "@/stores/auth"
import api from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

const auth = useAuthStore()

const currentPassword = ref("")
const newUsername = ref("")
const newPassword = ref("")
const savingAccount = ref(false)

async function saveAccount() {
  if (!currentPassword.value) {
    alert("请输入当前密码")
    return
  }
  savingAccount.value = true
  try {
    const res = await api.put("/auth/settings", {
      current_password: currentPassword.value,
      new_username: newUsername.value || undefined,
      new_password: newPassword.value || undefined,
    })
    if (res.data.success) {
      alert("设置已更新，请重新登录")
      auth.logout()
    } else {
      alert(res.data.error || "更新失败")
    }
  } catch (err: any) {
    alert(err.response?.data?.error || "更新失败")
  }
  finally { savingAccount.value = false }
}

// 时区
const timezones = [
  { value: "Asia/Shanghai", label: "北京 (UTC+8)" },
  { value: "Asia/Tokyo", label: "东京 (UTC+9)" },
  { value: "Asia/Singapore", label: "新加坡 (UTC+8)" },
  { value: "Asia/Kolkata", label: "印度 (UTC+5:30)" },
  { value: "Asia/Dubai", label: "迪拜 (UTC+4)" },
  { value: "Europe/London", label: "伦敦 (UTC+0)" },
  { value: "Europe/Paris", label: "巴黎 (UTC+1)" },
  { value: "Europe/Moscow", label: "莫斯科 (UTC+3)" },
  { value: "America/New_York", label: "纽约 (UTC-5)" },
  { value: "America/Chicago", label: "芝加哥 (UTC-6)" },
  { value: "America/Denver", label: "丹佛 (UTC-7)" },
  { value: "America/Los_Angeles", label: "洛杉矶 (UTC-8)" },
  { value: "America/Sao_Paulo", label: "圣保罗 (UTC-3)" },
  { value: "Australia/Sydney", label: "悉尼 (UTC+10)" },
  { value: "Pacific/Auckland", label: "奥克兰 (UTC+12)" },
  { value: "UTC", label: "UTC" },
]

const selectedTimezone = ref(auth.timezone || "Asia/Shanghai")
const savingTimezone = ref(false)

async function saveTimezone() {
  savingTimezone.value = true
  try {
    const res = await api.put("/settings", { timezone: selectedTimezone.value })
    if (res.data.success) {
      auth.timezone = selectedTimezone.value
      alert("时区已更新")
    } else {
      alert(res.data.error || "保存失败")
    }
  } catch (err: any) {
    alert(err.response?.data?.error || "保存失败")
  }
  finally { savingTimezone.value = false }
}

onMounted(async () => {
  await auth.fetchMe()
  selectedTimezone.value = auth.timezone || "Asia/Shanghai"
})
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <!-- 修改密码 -->
    <div class="rounded-lg border border-border bg-card p-6 dark:bg-card">
      <h3 class="text-base font-semibold text-foreground">修改账号密码</h3>
      <form @submit.prevent="saveAccount" class="mt-4 space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-foreground">当前用户名</label>
          <Input :model-value="auth.username" disabled />
        </div>
        <div>
          <label for="cur-pw" class="mb-1.5 block text-sm font-medium text-foreground">当前密码（验证身份）*</label>
          <Input id="cur-pw" v-model="currentPassword" type="password" required />
        </div>
        <div>
          <label for="new-username" class="mb-1.5 block text-sm font-medium text-foreground">新用户名（留空不改）</label>
          <Input id="new-username" v-model="newUsername" />
        </div>
        <div>
          <label for="new-pw" class="mb-1.5 block text-sm font-medium text-foreground">新密码（留空不改）</label>
          <Input id="new-pw" v-model="newPassword" type="password" />
        </div>
        <Button type="submit" :disabled="savingAccount">
          {{ savingAccount ? "保存中..." : "保存设置" }}
        </button>
      </form>
    </div>

    <!-- 时区 -->
    <div class="rounded-lg border border-border bg-card p-6 dark:bg-card">
      <h3 class="text-base font-semibold text-foreground">时区设置</h3>
      <div class="mt-4 flex items-end gap-3">
        <div class="flex-1">
          <label for="tz" class="mb-1.5 block text-sm font-medium text-foreground">选择时区</label>
          <Select v-model="selectedTimezone">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="tz in timezones" :key="tz.value" :value="tz.value">{{ tz.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button :disabled="savingTimezone" @click="saveTimezone">
          {{ savingTimezone ? "保存中..." : "保存时区" }}
        </button>
      </div>
    </div>

    <!-- 关于 -->
    <div class="rounded-lg border border-border bg-card p-6 dark:bg-card">
      <h3 class="text-base font-semibold text-foreground">关于本系统</h3>
      <div class="mt-4 space-y-2 text-sm text-muted-foreground">
        <p>事项提醒系统 v1.0.0</p>
        <p>支持 Telegram、Email、飞书、Bark 多渠道通知。</p>
        <p>每分钟自动检查提醒，到期自动发送通知。</p>
        <p class="pt-2">
          <a href="https://github.com/zhiyxn/TaskReminder" target="_blank" class="text-primary hover:text-primary/90">GitHub 仓库</a>
        </p>
      </div>
    </div>
  </div>
</template>
