<script setup lang="ts">
import { Inbox } from "lucide-vue-next"
import type { Component } from "vue"

defineProps<{ icon?: Component; message?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-5 py-16 text-center">
    <component :is="icon || Inbox" class="size-12 text-muted-foreground" />
    <p class="mt-4 text-sm text-muted-foreground">{{ message || "暂无数据" }}</p>
  </div>
</template>
