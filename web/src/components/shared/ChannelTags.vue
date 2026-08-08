<script setup lang="ts">
import type { Reminder } from "@/types"

defineProps<{ reminder: Reminder }>()
</script>

<template>
  <div class="flex flex-wrap gap-1">
    <span v-if="reminder.telegram_bot_token || reminder.telegram_chat_id" class="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Telegram</span>
    <span v-if="reminder.email_host || reminder.email_to" class="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">Email</span>
    <span v-if="reminder.feishu_app_id || reminder.feishu_receive_id" class="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">飞书</span>
    <span v-if="reminder.bark_url" class="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Bark</span>
    <span v-if="!reminder.telegram_bot_token && !reminder.telegram_chat_id && !reminder.email_host && !reminder.email_to && !reminder.feishu_app_id && !reminder.feishu_receive_id && !reminder.bark_url" class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">未配置</span>
  </div>
</template>
