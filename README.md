# mimi 的成长日志 · 幼小衔接学习工作台

> 一个零后端的纯静态 SPA，所有数据保存在 GitHub 仓库里，跨设备联网同步。

## ✨ 功能模块（12 个）

| 模块 | 说明 |
| --- | --- |
| 🏠 首页 | 今日概览、快速入口、数据总览 |
| 拼 拼音训练纸 | 16 组声母/韵母卡片、今日/全部、标记已读、跟读测验 |
| 🧩 儿童数独 | 4×4 入门数独、计时、最好成绩记录 |
| 🎯 专注力训练 | 5×5 Schulte 网格、计时、最好成绩 |
| 📖 RAZ 句子跟读 | 12 句分级读物、⭐⭐⭐ 评分、TTS 朗读 |
| 🏀 拍球训练 | 计数 +/–、撤销、目标管理 |
| 🤸 前庭组织运动 | 8 个感统动作、标记完成、计时器 |
| 🔬 科普专区 | 10 个小知识、轮播、收藏 |
| 🎤 朗诵比赛 | 自由录入文本、TTS 朗读、保存/删除 |
| ✅ 每日打卡 | 中心化打卡 + 热力图、连续天数 |
| 📝 待办清单 | 添加/勾选/删除 |
| 📚 亲子阅读 | 阅读日志、时长记录 |

## 🏗 架构

```
┌────────────────────────┐                ┌────────────────────────────┐
│  GitHub Pages (公开)    │   Contents API  │  GitHub Data Repo (私有)    │
│  cyss-a/mimi-workstation │ ──────────────▶│  cyss-a/mimi-workstation-  │
│  (前端 SPA, 无后端)      │   token 鉴权    │  data (state.json)         │
└────────────────────────┘                └────────────────────────────┘
```

- 前端：纯 HTML + CSS + JS（ES Modules），零依赖，单页面应用
- 后端：直接调用 `https://api.github.com/repos/{owner}/{repo}/contents/state.json`
- 数据：JSON 存到 GitHub 私有仓库的 `state.json`，每次操作都做 GET → 改本地 → PUT 提交
- 离线/本地模式：可切换为 `local` 模式，连接 Node Express 后端（仅开发用）

## 🚀 部署（已实现，供参考）

### 1. 两个仓库

| 仓库 | 可见性 | 用途 |
| --- | --- |
| `mimi-workstation` | **Public** | 前端代码 + GitHub Pages |
| `mimi-workstation-data` | **Private** | 用户数据（state.json） |

### 2. 前端部署方式：分支部署（main → Pages root）

本仓库使用 **GitHub Pages 分支部署**：直接把 `public/` 内容推到 `mimi-workstation` 的 `main` 分支根目录，
在仓库 **Settings → Pages → Source → Deploy from a branch → `main` → `/ (root)`** 开启后，
**每次 push 到 main 都会自动更新站点**（无需 Actions workflow）。

> 若想改用 Actions 自动部署：需给部署用的 PAT 加 `workflow` 权限，
> 再把 `.github/workflows/pages.yml`（本仓库已备份在本地 `public/.github/workflows/pages.yml`）推上去即可。

### 3. 数据仓库初始化

`mimi-workstation-data` 根目录已存在 `state.json`（取自 `public/data/default-state.json`）。

### 4. 给孩子用的数据 Token（fine-grained）

打开 https://github.com/settings/tokens?type=beta 新建 **fine-grained token**：

- Resource owner: `cyss-a`
- Repository access: `Only select repositories` → 选 `mimi-workstation-data`
- Permissions → **Contents** → Read and write

复制 token（`github_pat_xxx...`）。

### 5. 在工作台里填配置

第一次打开工作台 → 右上 ⚙ → 数据后端选 **GitHub 云端** → 填：

| 字段 | 值 |
| --- | --- |
| Token | 步骤 4 复制的 token |
| Owner | `cyss-a` |
| Repo | `mimi-workstation-data` |
| Branch | `main` |
| State 文件路径 | `state.json` |

点 **保存**，提示 "已联网更新" 即完成绑定。所有打卡、数独、阅读记录都会实时写回私有仓库。

## 🔒 安全

- Token 只保存在浏览器 `localStorage`，不上传到任何服务器
- 数据仓库设为 **Private**，该 token 只能读写这一个仓库的 Contents
- 任何拿到这个 token 的人 = 拿到孩子所有打卡/数独成绩/阅读日志的读写权限
- 建议：定期在 GitHub 撤销并重新生成 token

## 💻 本地开发

```bash
cd mimi-workstation/server
npm install
npm start
# → http://localhost:8787  前端 + /api 后端
```

工作台右上 ⚙ → 数据后端选 **本地**，即可连本地后端调试。

## 📜 许可

仅个人使用，请勿外发。
