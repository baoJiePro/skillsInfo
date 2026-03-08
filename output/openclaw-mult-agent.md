# OpenClaw 多 Agent 实战：指挥官 + 专业军团模式

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

编辑 `~/.openclaw/openclaw.json`，确保包含以下配置。此配置将所有消息默认路由给指挥官，并定义了所有 Agent 的工作区。

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "zai/glm-5" // 或你使用的其他模型
      },
      maxConcurrent: 4
    },

    list: [
      // ========== 指挥官（用户唯一交互接口）==========
      {
        id: "commander-grove",
        name: "指挥官",
        default: true,  // 关键：所有消息默认发给指挥官
        workspace: "~/.openclaw/workspaces/commander-grove"
      },

      // ========== 决策层 ==========
      { id: "ceo-bezos", name: "CEO", workspace: "~/.openclaw/workspaces/ceo-bezos" },
      { id: "cto-vogels", name: "CTO", workspace: "~/.openclaw/workspaces/cto-vogels" },
      { id: "fullstack-dhh", name: "FullStack", workspace: "~/.openclaw/workspaces/fullstack-dhh" },
      { id: "qa-bach", name: "QA", workspace: "~/.openclaw/workspaces/qa-bach" },

      // ========== 产品层 ==========
      { id: "product-norman", name: "Product", workspace: "~/.openclaw/workspaces/product-norman" },
      { id: "interaction-cooper", name: "Interaction", workspace: "~/.openclaw/workspaces/interaction-cooper" },
      { id: "ui-duarte", name: "UI", workspace: "~/.openclaw/workspaces/ui-duarte" },

      // ========== 增长层 ==========
      { id: "marketing-godin", name: "Marketing", workspace: "~/.openclaw/workspaces/marketing-godin" },
      { id: "sales-ross", name: "Sales", workspace: "~/.openclaw/workspaces/sales-ross" },
      { id: "operations-pg", name: "Operations", workspace: "~/.openclaw/workspaces/operations-pg" }
    ],
  },

  // 路由配置：将所有消息强制路由到指挥官
  bindings: [
    {
      agentId: "commander-grove",
      match: {
        channel: "*" // 匹配所有渠道
      }
    }
  ],
}
```

### 第三步：启动与验证

1. 重启 OpenClaw Gateway (如果正在运行)。
2. 发送一条测试消息："你好，我想开发一个简单的 Todo App。"
3. 指挥官应该会回复你，并开始分析任务。

## 4. 深度工作流程解析

### 核心机制：文档驱动协作

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

**1. 用户发起请求**

> 用户: "帮我开发一个用户认证系统，支持邮箱登录和第三方登录"

**2. 指挥官 (Commander) 响应**

- 分析需求：开发类任务，中等复杂度。
- 创建目录：`docs/workspace/tasks/TASK-001-AuthSystem/`
- 写入 Brief：`docs/workspace/tasks/TASK-001-AuthSystem/brief.md`
- 规划流程：CEO -> CTO -> FullStack -> QA
- **回复用户**："收到。已创建任务 TASK-001。正在请求 CEO 进行战略评估..."
- **内部调用**：@CEO-bezos 请评估 TASK-001-AuthSystem。

**3. CEO (Specialist) 执行**

- 读取：`docs/workspace/tasks/TASK-001-AuthSystem/brief.md`
- 思考：用户价值、优先级。
- 写入：`docs/workspace/tasks/TASK-001-AuthSystem/ceo-strategy.md`
- **回复指挥官**："战略评估完成。这是核心功能，建议推进。"

**4. 指挥官 (Commander) 协调**

- 读取 CEO 输出。
- **内部调用**：@CTO-vogels 请基于 CEO 的评估进行技术设计，任务目录同上。

**5. CTO (Specialist) 执行**

- 读取：`brief.md` 和 `ceo-strategy.md`
- 思考：架构、安全、扩展性。
- 写入：`docs/workspace/tasks/TASK-001-AuthSystem/cto-design.md`
- **回复指挥官**："技术设计已完成。推荐使用 JWT + OAuth2。"

... (流程继续，直到 QA 完成) ...

**6. 指挥官 (Commander) 交付**

- 读取所有 Agent 的输出文件。
- 生成最终汇总报告。
- **回复用户**："任务完成。这是技术方案、代码实现和测试报告的汇总..."

## 5. Agent 配置详情

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

## 6. 常见问题 (FAQ)

**Q: 为什么 Agent 找不到文件？**
A: 请检查符号链接是否正确创建。运行 `ls -l ~/.openclaw/workspaces/cto-vogels/docs/workspace` 应该指向 `commander-grove` 的 workspace。

**Q: 如何添加新的 Specialist？**

1. 在 `agentsInfo` 创建新的 `.md` 文件。
2. 定义其 Role 和 Persona。
3. 添加 "任务协作模式" 章节。
4. 在 `openclaw.json` 添加配置。
5. 运行初始化脚本更新工作区。

**Q: 任务目录越来越大怎么办？**
A: 指挥官可以将已完成的任务移动到 `docs/workspace/archive/` 目录。
