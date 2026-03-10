---
name: openclaw-gateway-migration
overview: 将 OpenClaw 多 Agent 架构从自定义 Watcher + FS-Bus 改造为原生 Gateway 方式，包括架构调整、配置迁移、路由改造和协作机制更新
todos:
  - id: explore-codebase
    content: 使用 [subagent:code-explorer] 分析现有代码结构和依赖关系
    status: pending
  - id: remove-fsbus
    content: 移除 FS-Bus 文件队列架构和相关脚本
    status: pending
    dependencies:
      - explore-codebase
  - id: update-init-script
    content: 重写 init-real-world.sh 使用 agents add 和 bindings
    status: pending
    dependencies:
      - remove-fsbus
  - id: standardize-config
    content: 重构 openclaw.json 为标准对象格式
    status: pending
    dependencies:
      - remove-fsbus
  - id: implement-sessions-spawn
    content: 在 Commander Agent 中实现 sessions_spawn 协作逻辑
    status: pending
    dependencies:
      - standardize-config
  - id: update-documentation
    content: 更新部署文档，添加 Gateway 配置说明
    status: pending
    dependencies:
      - update-init-script
      - implement-sessions-spawn
  - id: add-docker-support
    content: 添加 Docker 部署方案和环境变量配置
    status: pending
    dependencies:
      - update-documentation
  - id: create-migration-guide
    content: 编写从旧架构迁移的详细指南
    status: pending
    dependencies:
      - add-docker-support
---

## 需求概述

将现有的 OpenClaw 多 Agent 部署方案从自定义 Watcher + 文件队列(FS-Bus)架构改造为原生 Gateway 方式。

## 当前问题

1. 使用自定义 Python Watcher 轮询文件系统实现任务调度
2. FS-Bus 文件队列(inbox/outbox)非 OpenClaw 原生支持机制
3. CLI 命令格式 `openclaw agent --agent <id> --message` 不符合官方规范
4. openclaw.json 配置结构使用自定义数组格式，非标准对象格式
5. Agent 间协作通过文件共享实现，缺乏原生协作机制

## 目标架构

- 使用 OpenClaw Gateway 作为中央消息路由和调度中心
- 使用官方 `openclaw agents add` 命令创建专业 Agent
- 使用 `openclaw bindings add` 配置消息路由规则
- 使用 `sessions_spawn` 实现 Agent 间动态协作
- 符合官方配置规范和 CLI 接口标准

## 技术方案

### 架构对比

**当前架构（文件队列模式）**

```mermaid
graph LR
    A[用户] --> B[Liaison Agent]
    B --> C[写入 FS-Bus Inbox]
    C --> D[Python Watcher 轮询]
    D --> E[调用 Agent CLI]
    E --> F[写入 Outbox]
    F --> G[Webhook 通知]
```

**目标架构（原生 Gateway 模式）**

```mermaid
graph LR
    A[用户] --> B[Gateway WebSocket/HTTP]
    B --> C[Bindings 路由]
    C --> D[专业 Agent]
    D --> E[sessions_spawn 协作]
    E --> F[结果聚合]
```

### 核心改造点

1. **移除 FS-Bus 文件队列**

- 删除 inbox/outbox/processing 等目录结构
- 移除 Python Watcher 轮询脚本
- 改用 Gateway 原生消息路由

2. **Agent 管理标准化**

- 使用 `openclaw agents add <name> --model <model>` 创建 Agent
- 每个 Agent 拥有独立 workspace 和 system.md
- 支持动态创建和销毁

3. **路由配置标准化**

- 使用 `openclaw bindings add <channel> <agent>` 配置路由
- 支持基于渠道、标签、关键词的智能路由
- 支持默认 Agent 回退

4. **协作机制升级**

- 使用 `sessions_spawn()` 动态创建子 Agent
- 支持并行执行和结果聚合
- 主 Agent 负责任务协调

5. **配置文件标准化**

- openclaw.json 使用官方对象结构
- 支持环境变量覆盖
- 支持多模型配置

### 目录结构变更

**当前结构**

```
~/.openclaw/
├── workspaces/
│   ├── bus/inbox/outbox/...
│   ├── commander-grove/SOUL.md
│   └── ...
└── openclaw.json (自定义格式)
```

**目标结构**

```
~/.openclaw/
├── agents/
│   ├── commander-grove/system.md
│   ├── commander-grove/workspace/
│   ├── ceo-bezos/system.md
│   └── ...
├── gateway/
├── openclaw.json (标准格式)
└── .env (环境变量)
```

### 关键命令映射

| 功能 | 当前方式 | 目标方式 |
| --- | --- | --- |
| 创建 Agent | 复制 SOUL.md | `openclaw agents add <name>` |
| 配置路由 | Watcher 代码硬编码 | `openclaw bindings add <channel> <agent>` |
| 调用 Agent | Python subprocess | Gateway 自动路由 / `sessions_spawn` |
| 任务协作 | 文件共享 | `sessions_spawn` 动态协作 |
| 状态监控 | 查看文件目录 | `openclaw gateway status` / Dashboard |


### 技术依赖

- Node.js 22+ (OpenClaw 要求)
- OpenClaw CLI (最新版本)
- Gateway 服务 (内置)
- Control UI (内置 Web 界面)

## Agent Extensions

### SubAgent

- **code-explorer**: 用于探索现有代码库结构，定位需要修改的文件和依赖关系
- Purpose: 分析当前 OpenClaw 多 Agent 部署方案的代码结构，识别所有需要改造的文件和依赖
- Expected outcome: 提供完整的文件清单和依赖关系图，确保改造不遗漏任何组件