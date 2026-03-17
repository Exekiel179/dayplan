<div align="center">

# 📋 DayPlan

**AI 驱动的可视化任务管理平台**

用坐标轴看板管理你的任务 · AI 自动生成执行计划 · 支持任务依赖与周期循环

[![Docker Image](https://img.shields.io/docker/v/exekiel179/dayplan?label=Docker%20Hub&logo=docker&sort=semver)](https://hub.docker.com/r/exekiel179/dayplan)
[![GHCR](https://img.shields.io/badge/GHCR-latest-blue?logo=github)](https://ghcr.io/exekiel179/dayplan)
[![CI](https://github.com/Exekiel179/dayplan/actions/workflows/ci.yml/badge.svg)](https://github.com/Exekiel179/dayplan/actions/workflows/ci.yml)

</div>

---

## ✨ 功能特性

### 📊 坐标轴任务看板
- 任务在二维坐标系中拖拽定位，直观展示**重要性**与**紧急度**
- 点击坐标区域快速创建任务，拖拽调整优先位置
- 支持列表视图与矩阵视图切换

### 🤖 AI 执行计划
- 输入任务标题，一键生成 **Markdown 格式的分步执行建议**
- 自动拆解为至少 4 个可执行步骤
- 支持 OpenAI Chat Completions 和 Gemini 双协议适配

### 🌍 世界消息整合
- 可从 **TrendRadar** 同步真实热榜到“世界消息”界面
- 支持删除单条新闻、清空新闻，并保留重要标记/笔记关联
- 可直接导入 **ai-daily-digest** 整理的技术 RSS 种子库

### 🔗 任务依赖 & 工作流
- 任务间可设置**前置依赖关系**
- 前置任务未完成时，后续任务显示锁定状态
- 可视化依赖连线

### ⏰ 截止日期 & 倒计时
- 为任务设定 deadline，自动计算剩余时间
- 倒计时紧迫度影响任务在坐标轴的 Y 轴位置

### 🔄 周期性任务
- 支持三种循环模式：**每日** / **每周** / **自定义间隔天数**
- 完成后自动重置，记录累计完成次数
- 到期任务自动上浮提醒

### 📈 能力维度追踪
- 自定义能力维度（如"技术力"、"沟通力"、"执行力"）
- 为每个任务设置各维度的经验获取量
- 完成任务后累计能力成长，量化个人提升

### ✅ 子步骤管理
- 每个任务支持拆分为多个子步骤
- 可逐步勾选完成、拖拽排序
- 配合 AI 自动生成步骤使用

### 📦 归档 & 恢复
- 完成的任务自动归档，保持看板整洁
- 支持查看归档列表并恢复任务

### 👥 多用户系统
- 用户名密码登录认证
- 可选开启前端自助注册
- 每个用户**独立的任务数据存储**，互不干扰
- 密码 SHA-256 + salt 哈希，Bearer Token 会话管理
- 管理员登录后可输入目标账号并重置密码

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 · TypeScript · Tailwind CSS 4 · Framer Motion |
| 后端 | Node.js · Express.js |
| 存储 | 文件系统 JSON（无需数据库） |
| AI | 服务端代理调用 — API Key 不暴露给浏览器 |
| 部署 | Docker 多阶段构建 · docker-compose · GitHub Actions CI/CD |

---

## 🚀 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 AI_API_KEY

# 3. 启动开发服务器
npm run dev
```

### Docker 部署（推荐）

```bash
# 1. 创建 .env 文件
cat > .env << EOF
DAYPLAN_IMAGE=exekiel179/dayplan:latest
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.aipaibox.com
AI_MODEL=gemini-3.1-pro-preview
AUTH_USERNAME=admin
AUTH_PASSWORD=your_password
AUTH_ADMIN_USERS=admin
AUTH_ALLOW_REGISTRATION=true
EOF

# 2. 拉取并启动
docker compose --env-file .env pull
docker compose --env-file .env up -d

# 3. 访问
# http://localhost:3000
```

---

## ⚙️ 环境变量

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `AI_API_KEY` | ✅ | AI 服务 API Key（仅服务端使用） |
| `AI_BASE_URL` | ✅ | AI 接口地址，默认 `https://api.aipaibox.com` |
| `AI_MODEL` | ✅ | 使用的模型名称 |
| `AUTH_USERNAME` | ✅ | 默认管理员用户名 |
| `AUTH_PASSWORD` | ✅ | 默认管理员密码 |
| `AUTH_ADMIN_USERS` | | 逗号分隔的管理员账号列表；未配置时默认取首个种子账号 |
| `AUTH_USERS` | | 多用户 JSON 配置（优先级高于上面单用户配置） |
| `AUTH_ALLOW_REGISTRATION` | | 是否开启前端自助注册（默认 `true`） |
| `SESSION_TTL_MS` | | 会话有效期，默认 24 小时 |
| `DAYPLAN_IMAGE` | | Docker 镜像地址（docker-compose 使用） |
| `TRENDRADAR_ROOT` | | 本地 TrendRadar 项目路径；未配置时默认找 `../TrendRadar` |
| `AI_DAILY_DIGEST_ROOT` | | 本地 ai-daily-digest 项目路径；未配置时默认找 `../ai-daily-digest` |
| `NEWSNOW_API_BASE` | | TrendRadar 热榜桥接使用的上游地址，默认 `https://newsnow.busiyi.world/api/s` |

---

## 📁 数据存储

```
.data/
├── auth-users.json              # 注册用户信息（密码哈希）
└── users/
    └── <username>/
        └── tasks.json           # 用户任务数据
```

- 数据按用户隔离存储，重启后不丢失
- Docker 部署时通过 volume 挂载 `.data` 目录持久化

---

## 🔄 CI/CD

| 工作流 | 触发条件 | 说明 |
|--------|---------|------|
| **CI** | push / PR | 运行 `lint` + `build` 检查 |
| **Docker Publish** | push 到 `main` 或 `v*` tag | 自动构建并推送镜像到 GHCR 和 Docker Hub |

Docker 发布前会自动将旧的 `latest` 备份为 `bak` 标签，便于快速回滚。

---

## 📄 License

MIT
