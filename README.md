# Git Timeline Viewer (Git-Timeline)

让 Git 提交更简单更美观。一款专注于本地 Git 提交记录查看与分析的现代化 Web 工具。采用直观的时间线卡片瀑布流设计，集成多仓库工作区管理、交互式代码 Diff 审查与多维度复合筛选，提供流畅的动态动效交互体验。

---

## 核心特性

- **时间线瀑布流卡片 (Timeline Stream)**
  - 按提交日期自动聚类（“今天”、“昨天”、“某年某月某日”）。
  - 直观呈现作者头像徽标、姓名、相对提交时间及精确时间浮窗。
  - 支持 Commit SHA 一键快速复制与分支/Tag 徽章标记。
  - 统计代码变更度量（文件变动数、+新增行数、-删除行数）。

- **交互式代码 Diff 审查 (Diff Inspector)**
  - 卡片内联即时展开，零页面跳转。
  - 变动文件列表导航（带 A/M/D/R 变动类型标识与变动行数）。
  - 支持 Unified（单列内联）与 Split（双栏左右并排）模式自由切换，滑动指示条平滑过渡。
  - 代码高亮、变动行背景色区分与行号精准对齐。
  - 支持提交内部变动文件快速搜索过滤、一键全部折叠/展开。
  - 智能检测二进制文件，友好提示无法文本比对。

- **多仓库工作区管理 (Workspace Sidebar)**
  - 侧边栏管理多个本地 Git 仓库，随时无缝切换。
  - 支持直接输入绝对路径添加本地仓库。
  - 支持扫描父级目录自动递归发现所有子 Git 仓库并批量导入。
  - 支持收藏置顶（Star）常用项目。
  - 本地自动持久化存储记录（`~/.git-timeline-viewer.json`）。

- **多维度复合过滤与检索**
  - **分支切换**：支持选择特定分支，或一键查看 `--all` 全部分支合并拓扑。
  - **实时全局搜索**：支持按提交信息、详细说明、作者名、Commit SHA 关键字检索。
  - **时间范围筛选**：快速筛选“最近 7 天”、“最近 30 天”、“最近 90 天”。
  - **文件路径反查**：输入特定文件或文件夹路径（如 `src/components`），仅查看修改过该路径的提交历史。

- **动态动效组件 (Dynamic Motion Components)**
  - 基于 Framer Motion 实现的平滑布局过渡与卡片进出场动效。
  - 全局滑动吐司通知反馈（Toast Notification）。
  - 弹窗蒙层平滑渐变与阻尼缩放弹性动画。
  - 支持滚动自动触底加载（Infinite Scroll）。

- **现代双色主题风格**
  - 提供优雅清爽的 Light / Dark 深浅双色主题，一键切换。
  - 界面风格参考 GitHub & Linear 极简高质感设计，全界面采用矢量图标。

---

## 快速启动

### 方式一：一键启动（推荐）

本项目已完成前端打包与后端编译，直接运行即可：

```bash
# 启动本地服务（默认端口 4321）
pnpm start
# 或使用 npm
npm start
```

启动后在浏览器打开：
http://localhost:4321

### 方式二：开发模式启动 (HMR 实时热重载)

```bash
# 启动 Vite 前端 + 后端开发模式
pnpm dev
```

前端开发地址：`http://localhost:5173` (API 请求自动代理至 `4321` 端口)

---

## 技术架构

```
d:/fanzhongli/porject5/
├── server/                    # 后端服务 (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── index.ts           # 服务入口 & 静态托管
│   │   ├── git/
│   │   │   ├── cli.ts         # Git CLI 安全封装 (UTF-8 路径解析)
│   │   │   ├── parser.ts      # git log / diff / branch 解析器
│   │   │   └── scanner.ts     # 本地 Git 仓库递归扫描
│   │   ├── store/
│   │   │   └── config.ts      # 本地工作区持久化存储
│   │   └── routes/            # REST API 路由
│   └── dist/                  # 编译后产物
├── client/                    # 前端项目 (React 18 + Vite + Tailwind CSS + Framer Motion)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # Sidebar, Header
│   │   │   ├── timeline/      # CommitCard, DateGroupHeader
│   │   │   ├── diff/          # CommitDiffView (Unified / Split 动态过渡)
│   │   │   └── modals/        # AddRepoModal, ScanRepoModal
│   │   ├── context/           # RepoContext, ThemeContext, ToastContext
│   │   ├── services/          # API 请求层
│   │   └── utils/             # 日期聚合与格式化
│   └── dist/                  # 前端静态打包产物
└── package.json               # 统一脚本与依赖管理
```
