# 项目知识

## 开发环境

- Node.js 通过 NVM 管理，项目使用 `v22.19.0`；自动化命令应使用 NVM 对应的 Node 路径，避免误用 `/usr/local/bin/node` 的旧版本。

## 管理端布局约定

- 主题选择位于顶部栏，使用 `Popover + Command` 明确选择亮色、暗色或跟随系统，不采用循环切换。
- 当前用户头像位于顶部栏最右侧；用户信息、角色和退出登录入口统一放在头像触发的 `Command` 菜单中。
- Command 中的危险操作需同时覆盖 `data-[highlighted]` 的背景色和文字色，避免 Listbox 自动高亮首项时退回通用灰色样式。
- 可交互的 CommandItem 统一使用 `cursor-pointer`，让鼠标悬停时明确展示可点击状态。
- 左侧菜单底部只展示居中的项目版本号，当前版本为 `v1.0.0`。
- Vue 图标统一从 `@lucide/vue` 导入。
