# OpenClaw 技术文档索引

> 📚 OpenClaw 技术文档库 - 从 https://www.aivi.fyi 自动发现并生成
> 🕐 生成时间：2026-03-06
> 📄 文档数量：4

---

## 📖 文档列表

### 基础入门

1. [OpenClaw 高级使用经验分享](./001-OpenClaw高级使用经验分享.md)
   <br><small>2026-02-09 · 模型容灾 · 记忆检索 · 云端配对 · SSH 隧道</small>

### 高级技巧

2. [OpenClaw Agent Teams - Token 优化方案](./002-OpenClaw-Agent-Teams-Token优化方案.md)
   <br><small>2026-01-15 · Hooks 回调 · Agent Teams · 零轮询 · Token 优化</small>

3. [OpenClaw 多 Agent 高级玩法](./003-OpenClaw-Agent多Agent高级玩法.md)
   <br><small>2025-12-20 · Session 隔离 · 独立记忆 · 工作流 · 并行处理</small>

4. [OpenClaw 自动进化技巧](./004-OpenClaw自动进化技巧.md)
   <br><small>2025-12-10 · 自动学习 · 避坑机制 · 规格驱动 · Claude Code 集成</small>

---

## 📊 技术栈分布

| 技术 | 文章数 | 核心内容 |
|------|--------|---------|
| **OpenClaw** | 4 | 框架核心、配置、使用 |
| **Claude Code** | 3 | 集成、操控、优化 |
| **Agent Teams** | 2 | 协作、工作流、Hooks |
| **Session 管理** | 2 | 隔离、记忆、上下文 |
| **Token 优化** | 3 | 回调、独立、节省 |
| **SSH/云端** | 1 | 反向隧道、Gateway |

---

## 🎯 学习路径

### 初级用户

```
1. 阅读：OpenClaw 高级使用经验分享
   ├─ 了解基础概念
   ├─ 配置模型容灾
   └─ 搭建开发环境

2. 实践：本地环境搭建
   ├─ 安装 OpenClaw
   ├─ 配置第一个 Agent
   └─ 执行简单任务
```

### 中级用户

```
1. 阅读：OpenClaw Agent Teams
   ├─ 理解 Hooks 回调
   ├─ 配置 Agent 团队
   └─ 优化 Token 消耗

2. 阅读：多 Agent 高级玩法
   ├─ 配置 Session 隔离
   ├─ 设置独立记忆
   └─ 实现并行工作流

3. 实践：多 Agent 协作
   ├─ 创建开发团队
   ├─ 配置工作流
   └─ 监控 Token 消耗
```

### 高级用户

```
1. 阅读：自动进化技巧
   ├─ 配置自动学习
   ├─ 建立避坑机制
   └─ 实现规格驱动开发

2. 实践：生产级部署
   ├─ 搭建云端 Gateway
   ├─ 配置本地 Node
   ├─ 建立自动化流程
   └─ 持续优化改进
```

---

## 🛠️ 快速参考

### 常用命令

```bash
# 基础操作
openclaw --version                    # 查看版本
openclaw init                         # 初始化配置
openclaw status                       # 查看状态

# Agent 管理
openclaw agents list                   # 列出所有 Agent
openclaw agents create <name>          # 创建 Agent
openclaw agents run <name> --task <task># 执行任务

# Teams 管理
openclaw teams list                    # 列出所有团队
openclaw teams create <name>           # 创建团队
openclaw teams run <name> --task <task># 团队执行任务

# Token 监控
openclaw tokens stats                  # Token 统计
openclaw tokens compare <a> <b>         # 对比消耗

# 进化管理
openclaw evolution stats               # 学习统计
openclaw evolution patterns            # 学习模式
```

### 配置文件位置

```
~/.openclaw/
├── openclaw.json              # 主配置
├── teams.json                 # Agent 团队配置
├── sessions.json              # Session 配置
├── evolution.json             # 进化配置
├── exec-approvals.json        # 执行权限
└── memory/                    # 记忆存储
    ├── planner_vectors/
    ├── coder_vectors/
    └── reviewer_vectors/
```

---

## 📚 相关资源

### 官方资源

- **[OpenClaw GitHub](https://github.com/win4r/team-tasks)** - 开源仓库
- **[OpenClaw 文档](https://github.com/win4r/team-tasks/tree/main/docs)** - 完整文档
- **[Claude Code 文档](https://docs.anthropic.com/claude-code)** - Claude Code 官方文档
- **[Agent 设计模式](https://www.anthropic.com/index/agent-design-patterns)** - 设计指南

### 社区资源

- 哔哩哔哩视频教程（中文）
- YouTube 视频教程（英文）
- Discord 社区讨论
- GitHub Issues 问答

---

## 🎯 文档特色

本文档库由 **Tech Doc Expander** 自动生成，具有以下特点：

✅ **结构化内容** - 每篇文档包含完整的实施方案
✅ **官方文档集成** - 链接到真实的官方文档
✅ **代码示例** - 可直接使用的配置和命令
✅ **故障排查** - 常见问题及解决方案
✅ **技术栈识别** - 自动识别并分类相关技术
✅ **快速参考** - 命令速查表

---

## 📝 更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-03-06 | 初始版本，包含 4 篇核心文章 |

---

> 🤖 本索引由 Tech Doc Expander 自动生成
> 📚 与 Claude Agent 深度协作，智能扩展技术文档
