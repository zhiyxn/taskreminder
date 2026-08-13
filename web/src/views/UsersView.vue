<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { toast } from "vue-sonner"
import { useUsersStore } from "@/stores/users"
import { useIsMobile } from "@/composables/useMediaQuery"
import { usePagination } from "@/composables/usePagination"
import PaginationBar from "@/components/shared/PaginationBar.vue"
import EmptyState from "@/components/shared/EmptyState.vue"
import { Users, Search } from "@lucide/vue"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { UserItem } from "@/types"
import { useForm } from "vee-validate"
import { oneOf, optionalMinLength, required } from "@/lib/formValidation"

const store = useUsersStore()
const { isMobile } = useIsMobile()

const { pagedData, totalPages, currentPage, totalItems, goTo } = usePagination(
  computed(() => store.filteredUsers),
  10
)

// 编辑模态
const editOpen = ref(false)
const editUser = ref<UserItem | null>(null)
const savingEdit = ref(false)

const {
  handleSubmit: handleEditSubmit,
  defineField: defineEditField,
  resetForm: resetEditForm,
  errors: editErrors,
} = useForm({
  validationSchema: {
    editUsername: required("请输入用户名"),
    editPassword: optionalMinLength(6, "新密码至少需要 6 位"),
    editRole: oneOf(["admin", "user"], "请选择有效的角色"),
    editStatus: oneOf(["active", "disabled"], "请选择有效的状态"),
  },
  initialValues: {
    editUsername: "",
    editPassword: "",
    editRole: "user",
    editStatus: "active",
  },
})

const [editUsername, editUsernameAttrs] = defineEditField("editUsername")
const [editPassword, editPasswordAttrs] = defineEditField("editPassword")
const [editRole] = defineEditField("editRole")
const [editStatus] = defineEditField("editStatus")

function openEdit(user: UserItem) {
  editUser.value = user
  resetEditForm({
    values: {
      editUsername: user.username,
      editPassword: "",
      editRole: user.role,
      editStatus: user.status,
    },
  })
  editOpen.value = true
}

const saveEdit = handleEditSubmit(async (values) => {
  if (!editUser.value) return
  savingEdit.value = true
  try {
    const result = await store.updateUser(editUser.value.id, {
      username: values.editUsername.trim(),
      password: values.editPassword || undefined,
      role: values.editRole,
      status: values.editStatus,
    })
    if (result.success) {
      toast.success(result.message || "用户信息已更新")
      editOpen.value = false
    }
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  } finally {
    savingEdit.value = false
  }
})

// 删除确认
const deleteOpen = ref(false)
const deleteTarget = ref<UserItem | null>(null)
const statusOpen = ref(false)
const statusTarget = ref<UserItem | null>(null)

function openDelete(user: UserItem) {
  deleteTarget.value = user
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await store.deleteUser(deleteTarget.value.id)
    toast.success("用户删除成功")
    deleteOpen.value = false
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  }
}

function openStatusConfirm(user: UserItem) {
  statusTarget.value = user
  statusOpen.value = true
}

async function confirmToggleStatus() {
  if (!statusTarget.value) return
  const user = statusTarget.value
  const newStatus = user.status === "disabled" ? "active" : "disabled"
  try {
    const result = await store.toggleStatus(user.id)
    if (result.success) {
      toast.success(newStatus === "disabled" ? "用户已停用" : "用户已启用")
      statusOpen.value = false
      statusTarget.value = null
    }
  } catch {
    // 接口错误由 Axios 响应拦截器统一提示。
  }
}

onMounted(() => store.fetchAll())
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Users class="size-5" />
        用户管理
      </h2>
      <Input
        v-model="store.searchKeyword"
        placeholder="搜索用户名..."
        class="flex-1"
      />
    </div>

    <!-- 桌面表格 -->
    <div v-if="!isMobile" class="overflow-x-auto rounded-lg border border-border">
      <table v-if="totalItems > 0" class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
            <th class="px-4 py-3">ID</th>
            <th class="px-4 py-3">用户名</th>
            <th class="px-4 py-3">角色</th>
            <th class="px-4 py-3">状态</th>
            <th class="px-4 py-3">提醒数</th>
            <th class="px-4 py-3">注册时间</th>
            <th class="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in pagedData" :key="u.id" class="border-b border-border last:border-0 hover:bg-muted/30">
            <td class="px-4 py-3 text-muted-foreground">{{ u.id }}</td>
            <td class="px-4 py-3 font-medium text-foreground">{{ u.username }}</td>
            <td class="px-4 py-3">
              <span :class="['inline-flex rounded-md px-2 py-0.5 text-xs font-medium', u.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400']">{{ u.role === 'admin' ? '管理员' : '用户' }}</span>
            </td>
            <td class="px-4 py-3">
              <span :class="['inline-flex rounded-md px-2 py-0.5 text-xs font-medium', u.status !== 'disabled' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400']">{{ u.status !== 'disabled' ? '正常' : '停用' }}</span>
            </td>
            <td class="px-4 py-3 text-muted-foreground">{{ u.reminder_count }}</td>
            <td class="px-4 py-3 text-muted-foreground text-xs">{{ u.created_at }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="openStatusConfirm(u)">
                  {{ u.status === 'disabled' ? '启用' : '停用' }}
                </button>
                <button class="rounded-md border border-border px-2 py-1 text-xs text-blue-600 hover:bg-muted" @click="openEdit(u)">编辑</button>
                <button v-if="u.role !== 'admin'" class="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-muted" @click="openDelete(u)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-else :icon="Search" message="未找到匹配的用户" />
    </div>

    <!-- 移动端卡片 -->
    <div v-else class="flex flex-col gap-4">
      <EmptyState v-if="totalItems === 0" :icon="Search" message="未找到匹配的用户" />
      <div v-for="u in pagedData" :key="u.id" class="rounded-lg border border-border bg-card p-4 dark:bg-card">
        <div class="font-semibold text-foreground">{{ u.username }}</div>
        <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div><span class="text-muted-foreground">角色</span> <span class="ml-1">{{ u.role === 'admin' ? '管理员' : '用户' }}</span></div>
          <div><span class="text-muted-foreground">状态</span> <span :class="['ml-1', u.status !== 'disabled' ? 'text-green-600' : 'text-red-600']">{{ u.status !== 'disabled' ? '正常' : '停用' }}</span></div>
          <div><span class="text-muted-foreground">提醒数</span> <span class="ml-1">{{ u.reminder_count }}</span></div>
          <div><span class="text-muted-foreground">注册</span> <span class="ml-1 text-xs">{{ u.created_at }}</span></div>
        </div>
        <div class="mt-3 flex flex-wrap gap-1">
          <button class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" @click="openStatusConfirm(u)">{{ u.status === 'disabled' ? '启用' : '停用' }}</button>
          <button class="rounded-md border border-border px-2 py-1 text-xs text-blue-600 hover:bg-muted" @click="openEdit(u)">编辑</button>
          <button v-if="u.role !== 'admin'" class="rounded-md border border-border px-2 py-1 text-xs text-red-600 hover:bg-muted" @click="openDelete(u)">删除</button>
        </div>
      </div>
    </div>

    <PaginationBar :total-items="totalItems" :current-page="currentPage" :total-pages="totalPages" @update:current-page="goTo" />

    <!-- 编辑用户 -->
    <Dialog v-model:open="editOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>修改用户的登录信息、角色和账号状态</DialogDescription>
        </DialogHeader>
        <form @submit.prevent="saveEdit" class="space-y-4">
          <div>
            <label for="edit-username" class="mb-1.5 block text-sm font-medium text-foreground">用户名</label>
            <Input id="edit-username" v-model="editUsername" v-bind="editUsernameAttrs" :aria-invalid="!!editErrors.editUsername" aria-describedby="edit-username-error" />
            <p v-if="editErrors.editUsername" id="edit-username-error" class="mt-1 text-xs text-destructive">{{ editErrors.editUsername }}</p>
          </div>
          <div>
            <label for="edit-password" class="mb-1.5 block text-sm font-medium text-foreground">密码（留空不改）</label>
            <Input id="edit-password" v-model="editPassword" v-bind="editPasswordAttrs" :aria-invalid="!!editErrors.editPassword" aria-describedby="edit-password-error" type="password" autocomplete="new-password" placeholder="至少 6 位" />
            <p v-if="editErrors.editPassword" id="edit-password-error" class="mt-1 text-xs text-destructive">{{ editErrors.editPassword }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">角色</label>
            <Select v-model="editRole">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="editErrors.editRole" class="mt-1 text-xs text-destructive">{{ editErrors.editRole }}</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">状态</label>
            <Select v-model="editStatus">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="disabled">停用</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="editErrors.editStatus" class="mt-1 text-xs text-destructive">{{ editErrors.editStatus }}</p>
          </div>
          <DialogFooter class="pt-2">
            <DialogClose as-child>
              <Button type="button" variant="outline">取消</Button>
            </DialogClose>
            <Button type="submit" :disabled="savingEdit">{{ savingEdit ? "保存中..." : "保存" }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- 删除确认 -->
    <AlertDialog v-model:open="deleteOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除用户</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除用户「{{ deleteTarget?.username }}」吗？该用户的所有提醒和日志将被一并删除，此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDelete"
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 启停确认 -->
    <AlertDialog v-model:open="statusOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            确认{{ statusTarget?.status === 'disabled' ? '启用' : '停用' }}用户
          </AlertDialogTitle>
          <AlertDialogDescription>
            确定要{{ statusTarget?.status === 'disabled' ? '启用' : '停用' }}用户「{{ statusTarget?.username }}」吗？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            :class="statusTarget?.status === 'disabled' ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'"
            @click="confirmToggleStatus"
          >
            确认{{ statusTarget?.status === 'disabled' ? '启用' : '停用' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
