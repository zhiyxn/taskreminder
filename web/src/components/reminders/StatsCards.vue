<script setup lang="ts">
import { useRemindersStore } from "@/stores/reminders"
import { ListTodo, CheckCircle2, PauseCircle } from "@lucide/vue"

const store = useRemindersStore()
</script>

<template>
  <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
    <div class="rounded-lg border border-border bg-card p-4 dark:bg-card">
      <div class="flex items-center gap-4">
        <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/10">
          <ListTodo class="size-6 text-primary dark:text-primary" />
        </div>
        <div>
          <div class="text-2xl font-bold text-foreground">{{ store.stats.total }}</div>
          <div class="text-sm text-muted-foreground">全部提醒</div>
        </div>
      </div>
    </div>
    <div class="rounded-lg border border-border bg-card p-4 dark:bg-card">
      <div class="flex items-center gap-4">
        <div class="flex size-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 class="size-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <div class="text-2xl font-bold text-foreground">{{ store.stats.active }}</div>
          <div class="text-sm text-muted-foreground">活跃中</div>
        </div>
      </div>
    </div>
    <div class="rounded-lg border border-border bg-card p-4 dark:bg-card">
      <div class="flex items-center gap-4">
        <div class="flex size-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <PauseCircle class="size-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <div class="text-2xl font-bold text-foreground">{{ store.stats.inactive }}</div>
          <div class="text-sm text-muted-foreground">已暂停</div>
        </div>
      </div>
    </div>
  </div>
</template>
