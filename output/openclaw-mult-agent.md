# OpenClaw 多 Agent 实战：指挥官 + 专业军团模式

> **⚠️ 版本说明**：本文档基于 OpenClaw 2026.3.2 版本编写。当前版本存在一些功能限制，部分自动化特性无法实现。文档中已标注实际可行的替代方案。

> **📅 最后更新**：2026-03-08
> **🔄 文档状态**：已根据实际测试结果更新

## 0. 重要说明与版本限制

### ⚠️ OpenClaw 功能限制

在当前版本（2026.3.2）中，以下功能**不支持**：

1. **Subagent 自动调用**

   - ❌ 不支持 `@agent-id` 语法
   - ❌ 不支持 `subagents.allow` 配置
   - ❌ Agent 之间无法直接通信
2. **Session 高级配置**

   - ❌ 不支持 `session.compaction` 配置
   - ❌ 不支持自定义压缩策略
3. **JSON5 格式**

   - ❌ 配置文件必须使用标准 JSON
   - ❌ 不支持注释（`//` 或 `/* */`）

### ✅ 实际可行的方案

虽然无法实现完全自动化的多 Agent 协作，但可以通过以下方式实现类似效果：

1. **角色切换模式**：指挥官以不同角色的视角分析问题
2. **文档驱动协作**：通过共享工作区实现信息共享
3. **手动协调**：用户手动触发不同 Agent 的任务

### 📊 架构调整

**原始设计**（理想化）：

```
用户 → 指挥官 → 自动调用专业 Agent → 汇总结果 → 用户
```

**实际实现**（当前可行）：

```
用户 → 指挥官（切换不同角色视角） → 生成文档 → 汇总结果 → 用户
```

### 🔧 相关资源

- **配置分析报告**：[004-openclaw-configuration-analysis.md](./004-openclaw-configuration-analysis.md)
- **整改报告**：[005-remediation-report.md](./005-remediation-report.md)
- **维护脚本**：`../scripts/`

---

## 1. 文章概览

### 核心主题

本文详细讲解 OpenClaw 多 Agent 架构的完整实施方案，采用"**指挥官 + 专业军团**"模式：用户只与指挥官交互，指挥官负责任务分析、分发和协调，专业 Agent 各司其职。本文档提供一份结构完整、步骤清晰、可直接落地的配置向导。

### 核心价值

**单一接口，专业执行**：用户只需要和一个"指挥官"对话，指挥官理解需求后，协调专业 Agent 团队完成工作，最后汇总结果给用户。

## 2. 术语表

- **Commander (指挥官)**: 用户交互的唯一入口 Agent，负责任务拆解与分发。
- **Specialist (专业 Agent)**: 具备特定领域知识（如 CEO, CTO, QA）的 Agent，不直接与用户对话。
- **Workspace (工作区)**: Agent 运行时的文件系统目录，用于存放状态、文档和输出。
- **Shared Workspace (共享工作区)**: 所有 Agent 都能访问的公共目录，用于文档驱动的协作。
- **SOUL**: Agent 的核心定义文件（System Prompt），定义了角色、原则和行为模式。
- **Bindings**: 消息路由规则，决定哪个 Agent 接收特定渠道的消息。

## 架构设计

### 指挥官 + 专业军团模式

```
┌─────────────────────────────────────────────────────────────┐
│                        用户                                  │
│                    （唯一入口）                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ 所有对话
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   指挥官 (Commander)                         │
│                                                              │
│  职责：                                                      │
│  1. 理解用户需求                                             │
│  2. 分析任务类型和复杂度                                     │
│  3. 决定需要哪些专业 Agent 参与                              │
│  4. 协调任务执行顺序                                         │
│  5. 汇总各 Agent 输出，形成最终回复                          │
│                                                              │
│  能力：                                                      │
│  - 读取所有专业 Agent 的输出文档                             │
│  - 写入任务指令到共享工作区                                  │
│  - 综合分析能力                                              │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   CEO    │    │   CTO    │    │FullStack │
    │ (战略)   │    │ (架构)   │    │ (实现)   │
    └──────────┘    └──────────┘    └──────────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Product  │    │   QA     │    │Marketing │
    │ (产品)   │    │ (测试)   │    │ (营销)   │
    └──────────┘    └──────────┘    └──────────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │    共享工作区        │
              │  docs/workspace/    │
              │  - 任务文档         │
              │  - 中间产物         │
              │  - 最终交付         │
              └─────────────────────┘
```

### 协作流程

```
用户需求 → 指挥官分析 → 创建任务目录/Brief → 通知专业Agent → Agent读取/执行/输出 → 指挥官汇总 → 返回用户
```

## 3. 快速开始 (Quick Start)

### 前置条件

1. 已安装 OpenClaw CLI。
2. 拥有 `agentsInfo/` 目录，其中包含已配置好"任务协作模式"的 Agent SOUL 文件（本文档配套资源已更新）。

### 第一步：初始化环境

我们提供了一个脚本来自动创建目录结构、符号链接并部署 Agent 定义文件。

1. 确保你在项目根目录下（包含 `agentsInfo` 文件夹）。
2. 保存以下脚本为 `init-commander.sh` 并运行。

```bash
#!/bin/bash
# init-commander.sh

# 配置路径
OPENCLAW_DIR="$HOME/.openclaw"
WORKSPACES_DIR="$OPENCLAW_DIR/workspaces"
AGENTS_INFO_DIR="$(pwd)/agentsInfo" # 假设当前目录在 agentsInfo 的父目录

# 检查源文件是否存在
if [ ! -d "$AGENTS_INFO_DIR" ]; then
    echo "❌ 错误: 未找到 agentsInfo 目录。请在包含 agentsInfo 的目录下运行此脚本。"
    exit 1
fi

# 创建共享工作区结构
echo "📂 创建目录结构..."
mkdir -p "$WORKSPACES_DIR/commander-grove/docs/workspace/"{tasks,knowledge,archive}
mkdir -p "$WORKSPACES_DIR/commander-grove/memory"

# 定义 Agent 列表
AGENTS=(
  "ceo-bezos"
  "cto-vogels"
  "fullstack-dhh"
  "qa-bach"
  "product-norman"
  "interaction-cooper"
  "ui-duarte"
  "marketing-godin"
  "sales-ross"
  "operations-pg"
)

# 为每个 Agent 创建 Workspace 和 符号链接
for agent in "${AGENTS[@]}"; do
  echo "🔗 配置 $agent..."
  mkdir -p "$WORKSPACES_DIR/$agent/docs"

  # 创建符号链接到共享工作区 (强制覆盖)
  ln -sf "$WORKSPACES_DIR/commander-grove/docs/workspace" "$WORKSPACES_DIR/$agent/docs/workspace"

  # 创建符号链接到共享记忆目录 (强制覆盖)
  ln -sf "$WORKSPACES_DIR/commander-grove/memory" "$WORKSPACES_DIR/$agent/memory"

  # 部署 SOUL.md
  if [ -f "$AGENTS_INFO_DIR/${agent}.md" ]; then
    cp "$AGENTS_INFO_DIR/${agent}.md" "$WORKSPACES_DIR/$agent/SOUL.md"
    echo "  ✓ SOUL.md 部署完成"
  else
    echo "  ⚠️ 警告: 源文件 $AGENTS_INFO_DIR/${agent}.md 不存在"
  fi
done

# 部署指挥官 SOUL.md
echo "👑 配置指挥官..."
if [ -f "$AGENTS_INFO_DIR/commander-grove.md" ]; then
  cp "$AGENTS_INFO_DIR/commander-grove.md" "$WORKSPACES_DIR/commander-grove/SOUL.md"
  echo "  ✓ SOUL.md 部署完成"
fi

echo "✅ 初始化完成！"
```

### 第二步：配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`，确保包含以下配置。此配置将所有消息路由给指挥官，并定义了所有 Agent 的工作区。

**注意**：OpenClaw 使用标准 JSON 格式（不支持注释），请勿使用 JSON5 语法。

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "zai/glm-5"
      },
      "maxConcurrent": 4
    },
    "list": [
      {
        "id": "commander-grove",
        "name": "指挥官",
        "default": true,
        "workspace": "/Users/baojie/.openclaw/workspaces/commander-grove"
      },
      {
        "id": "ceo-bezos",
        "name": "CEO",
        "workspace": "/Users/baojie/.openclaw/workspaces/ceo-bezos"
      },
      {
        "id": "cto-vogels",
        "name": "CTO",
        "workspace": "/Users/baojie/.openclaw/workspaces/cto-vogels"
      },
      {
        "id": "fullstack-dhh",
        "name": "FullStack",
        "workspace": "/Users/baojie/.openclaw/workspaces/fullstack-dhh"
      },
      {
        "id": "qa-bach",
        "name": "QA",
        "workspace": "/Users/baojie/.openclaw/workspaces/qa-bach"
      },
      {
        "id": "product-norman",
        "name": "Product",
        "workspace": "/Users/baojie/.openclaw/workspaces/product-norman"
      },
      {
        "id": "interaction-cooper",
        "name": "Interaction",
        "workspace": "/Users/baojie/.openclaw/workspaces/interaction-cooper"
      },
      {
        "id": "ui-duarte",
        "name": "UI",
        "workspace": "/Users/baojie/.openclaw/workspaces/ui-duarte"
      },
      {
        "id": "marketing-godin",
        "name": "Marketing",
        "workspace": "/Users/baojie/.openclaw/workspaces/marketing-godin"
      },
      {
        "id": "sales-ross",
        "name": "Sales",
        "workspace": "/Users/baojie/.openclaw/workspaces/sales-ross"
      },
      {
        "id": "operations-pg",
        "name": "Operations",
        "workspace": "/Users/baojie/.openclaw/workspaces/operations-pg"
      }
    ]
  },
  "bindings": [
    {
      "agentId": "commander-grove",
      "match": {
        "channel": "feishu"
      }
    }
  ]
}
```

**重要说明**：

1. **路径格式**：使用绝对路径（如 `/Users/baojie/.openclaw/...`），不要使用 `~`
2. **JSON 格式**：标准 JSON，不支持注释（`//` 或 `/* */`）
3. **Bindings**：`channel` 需要指定具体渠道名称（如 `"feishu"`），不能使用通配符
4. **不支持的配置**：OpenClaw 不支持 `description` 字段，已移除

### 第三步：启动与验证

#### 1. 重启 Gateway

```bash
# 如果 Gateway 正在运行，先重启
openclaw gateway restart

# 或者停止后重新启动
openclaw gateway stop
openclaw gateway start

# 验证 Gateway 状态
openclaw gateway status
```

**预期输出**：

```
Gateway: running (pid xxxxx)
RPC probe: ok
```

#### 2. 验证配置

```bash
# 检查工作区目录
ls -la ~/.openclaw/workspaces/

# 应该看到 11 个目录：commander-grove + 10 个专业 Agent
```

#### 3. 验证符号链接

```bash
# 检查 workspace 符号链接
ls -la ~/.openclaw/workspaces/ceo-bezos/docs/workspace

# 应该显示指向 commander-grove/docs/workspace 的符号链接
```

**预期输出**：

```
lrwxr-xr-x  1 user  staff  XX日期  ~/.openclaw/workspaces/ceo-bezos/docs/workspace -> /Users/baojie/.openclaw/workspaces/commander-grove/docs/workspace
```

#### 4. 验证 SOUL 文件

```bash
# 检查 SOUL.md 文件
ls -l ~/.openclaw/workspaces/*/SOUL.md

# 应该看到 11 个 SOUL.md 文件
```

#### 5. 测试消息

在飞书中发送测试消息：

```
你好，我想开发一个简单的 Todo App。
```

**预期行为**：

- 指挥官接收消息
- 分析任务类型（开发类）
- 评估复杂度（中等）
- 创建任务目录
- 协调专业 Agent（如需要）

#### 核心机制：文档驱动协作

为了解决多 Agent 之间上下文丢失和幻觉问题，我们采用**基于 文件系统的协作**。

1. **Commander** 创建任务文件夹 `docs/workspace/tasks/TASK-XXX/`。
2. **Commander** 写入 `brief.md`（任务简报）。
3. **Specialist Agent** 读取 `brief.md`，执行任务，并将结果写入同一目录下的特定文件（如 `cto-design.md`）。
4. **Commander** 读取这些输出文件，整合信息，进行下一步决策。

这种方式的好处是：

- **持久化**：所有中间思考过程都被保存。
- **清晰边界**：每个 Agent 知道去哪里读、去哪里写。
- **无状态依赖**：Agent 不需要记住长对话历史，只需阅读当前文档。

### 场景演练：开发用户认证系统

**重要说明**：由于 OpenClaw 版本限制，当前无法直接实现自动化的 Agent 间调用。以下流程描述了**理想的协作模式**，实际使用时需要**手动协调**或使用**文档驱动协作**。

#### 文档驱动协作

**实际可行的协作流程**：

```
1. 用户发送需求给指挥官
   ↓
2. 指挥官创建任务目录和 brief.md
   ↓
3. 指挥官以不同角色的视角分析问题
   - 读取 brief.md
   - 基于 CEO 思维：战略评估
   - 基于 CTO 思维：技术架构
   - 基于 FullStack 思维：实现方案
   - 基于 QA 思维：测试策略
   ↓
4. 将各角色分析结果写入不同文档
   - ceo-strategy.md
   - cto-design.md
   - dev-implementation.md
   - qa-strategy.md
   ↓
5. 指挥官汇总所有文档
   ↓
6. 返回给用户完整报告
```

**关键点**：

- ✅ 所有 Agent 都通过**共享工作区**协作
- ✅ 文档持久化，便于追溯
- ✅ 指挥官作为统一接口
- ⚠️  需要**手动切换角色**思维
- ⚠️  不是真正的**多 Agent 并行**

### Agent 配置详情

所有 Agent 的 `SOUL.md` 已预置了"任务协作模式"，规定了它们的输入输出行为。

例如，**CTO Agent** 的配置中包含：

```markdown
## 任务协作模式

### 接收任务
从 `docs/workspace/tasks/TASK-{ID}-{任务名}/` 目录读取：
- `brief.md`
- `ceo-strategy.md`

### 输出规范
将技术架构设计输出到：
- `docs/workspace/tasks/TASK-{ID}-{任务名}/cto-design.md`
```

这种显式的契约定义保证了多 Agent 协作的稳定性。

```
