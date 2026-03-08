# OpenClaw 多 Agent 实战：指挥官 + 专业军团模式

## 1. 文章概览

### 核心主题

本文详细讲解 OpenClaw 多 Agent 架构的完整实施方案，采用"**指挥官 + 专业军团**"模式：用户只与指挥官交互，指挥官负责任务分析、分发和协调，专业 Agent 各司其职。本文档旨在提供一份结构完整、步骤清晰、可直接落地的配置向导。

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
用户需求 → 指挥官分析 → 分发任务 → 专业Agent执行 → 指挥官汇总 → 返回用户
```

## 指挥官角色设计

### 指挥官的 SOUL.md

指挥官基于 **Andy Grove（安迪·格鲁夫）** 的管理哲学设计，强调：

- **管理杠杆率**：用最少的协调动作产生最大的产出
- **产出导向**：关注"交付了什么"，而不是"做了什么"
- **OKR 思维**：目标驱动，可衡量追踪
- **黑箱管理法**：把专业 Agent 当作"黑箱"，关注输入输出

完整的 SOUL.md 定义见 `agentsInfo/commander-grove.md`，核心结构：

```markdown
---
name: commander-grove
description: "项目指挥官（Andy Grove 思维模型）。用户唯一交互接口，
             负责任务分析、分发、协调和汇总。"
model: inherit
---

# 指挥官 Agent — Andy Grove

## Role
项目指挥官，用户与 Agent 军团的唯一交互接口。

## Core Principles
- 产出导向（Output-Oriented）
- 管理杠杆率（Managerial Leverage）
- OKR 思维（Objectives and Key Results）
- 信息驱动决策
- 黑箱管理法

## Decision Framework
### 任务分类矩阵
| 复杂度 \ 类型 | 开发类 | 产品类 | 运营类 | 决策类 |
|--------------|--------|--------|--------|--------|
| **简单** | 直接处理 | 直接处理 | 直接处理 | 直接处理 |
| **中等** | CTO + FullStack | Product + UI | Marketing/Operations | CEO |
| **复杂** | CEO→CTO→FullStack→QA | Product→Interaction→UI | Marketing+Sales+Operations | CEO+CTO |
```

#### 指挥官的专业团队编排能力


| 层级   | Agent ID           | 调用时机           | 期望输出           |
| ------ | ------------------ | ------------------ | ------------------ |
| 决策层 | ceo-bezos          | 战略评估、优先级   | PR/FAQ、决策建议   |
| 决策层 | cto-vogels         | 架构设计、技术选型 | 架构设计、ADR      |
| 决策层 | fullstack-dhh      | 代码实现           | 源代码、测试       |
| 决策层 | qa-bach            | 质量评估           | 测试报告           |
| 产品层 | product-norman     | 产品定义           | PRD、验收标准      |
| 产品层 | interaction-cooper | 用户流程           | 流程图、交互规范   |
| 产品层 | ui-duarte          | 视觉设计           | 设计稿、组件规范   |
| 增长层 | marketing-godin    | 市场定位           | 定位文档、内容计划 |
| 增长层 | sales-ross         | 定价策略           | 定价方案、漏斗设计 |
| 增长层 | operations-pg      | 用户运营           | 运营计划、数据指标 |

---

## 配置方案

### 目录结构

```
~/.openclaw/
├── openclaw.json              # 主配置文件
├── agents/
│   ├── commander/
│   │   ├── agent/
│   │   └── sessions/
│   ├── ceo-bezos/
│   │   ├── agent/
│   │   └── sessions/
│   └── ... (其他 agents)
└── workspaces/
    ├── commander-grove/        # 指挥官工作区（核心）
    │   ├── SOUL.md
    │   ├── MEMORY.md
    │   └── docs/
    │       └── workspace/      # 共享工作区
    │           ├── tasks/      # 任务目录
    │           ├── knowledge/  # 知识库
    │           └── archive/    # 归档
    ├── ceo-bezos/              # CEO 工作区
    │   ├── SOUL.md
    │   └── docs/
    │       └── workspace/      # 链接到指挥官的 workspace
    └── ... (其他 agents，同样链接到共享 workspace)
```

### 关键设计：共享工作区

为了让指挥官能读取专业 Agent 的输出，我们使用**符号链接**让所有 Agent 共享同一个 `docs/workspace/` 目录：

```bash
# 创建共享工作区
mkdir -p ~/.openclaw/workspaces/commander-grove/docs/workspace/{tasks,knowledge,archive}

# 为每个专业 Agent 创建符号链接
for agent in ceo-bezos cto-vogels fullstack-dhh qa-bach product-norman interaction-cooper ui-duarte marketing-godin sales-ross operations-pg; do
  mkdir -p ~/.openclaw/workspaces/${agent}/docs
  ln -s ~/.openclaw/workspaces/commander-grove/docs/workspace ~/.openclaw/workspaces/${agent}/docs/workspace
done
```

### 主配置文件

```json5
// ~/.openclaw/openclaw.json
{
  agents: {
    defaults: {
      model: {
        primary: "zai/glm-5"
      },
      models: {
        "zai/glm-4.7": { alias: "GLM" },
        "zai/glm-5": { alias: "GLM" }
      },
      compaction: {
        mode: "safeguard"
      },
      maxConcurrent: 4
    },

    list: [
      // ========== 指挥官（用户唯一交互接口）==========
      {
        id: "commander-grove",
        name: "指挥官",
        default: true,  // 所有消息默认发给指挥官
        workspace: "~/.openclaw/workspaces/commander-grove",
        description: "用户唯一交互接口，负责协调专业团队"
      },

      // ========== 决策层 ==========
      {
        id: "ceo-bezos",
        name: "CEO",
        workspace: "~/.openclaw/workspaces/ceo-bezos",
        description: "战略决策、商业模式、优先级排序"
      },
      {
        id: "cto-vogels",
        name: "CTO",
        workspace: "~/.openclaw/workspaces/cto-vogels",
        description: "技术架构、系统设计、技术选型"
      },
      {
        id: "fullstack-dhh",
        name: "FullStack",
        workspace: "~/.openclaw/workspaces/fullstack-dhh",
        description: "代码实现、开发效率、技术方案"
      },
      {
        id: "qa-bach",
        name: "QA",
        workspace: "~/.openclaw/workspaces/qa-bach",
        description: "测试策略、质量保证、风险评估"
      },

      // ========== 产品层 ==========
      {
        id: "product-norman",
        name: "Product",
        workspace: "~/.openclaw/workspaces/product-norman",
        description: "产品定义、用户体验、可用性"
      },
      {
        id: "interaction-cooper",
        name: "Interaction",
        workspace: "~/.openclaw/workspaces/interaction-cooper",
        description: "用户流程、Persona、交互模式"
      },
      {
        id: "ui-duarte",
        name: "UI",
        workspace: "~/.openclaw/workspaces/ui-duarte",
        description: "视觉设计、设计系统、界面规范"
      },

      // ========== 增长层 ==========
      {
        id: "marketing-godin",
        name: "Marketing",
        workspace: "~/.openclaw/workspaces/marketing-godin",
        description: "市场定位、品牌叙事、增长策略"
      },
      {
        id: "sales-ross",
        name: "Sales",
        workspace: "~/.openclaw/workspaces/sales-ross",
        description: "定价策略、销售模式、转化优化"
      },
      {
        id: "operations-pg",
        name: "Operations",
        workspace: "~/.openclaw/workspaces/operations-pg",
        description: "用户获取、社区运营、增长节奏"
      }
    ],
  },

  // 消息渠道配置
  channels: {
    feishu: {
      enabled: true,
      appId: "cli_xxxxxxxxxxxxx",
      appSecret: "your_app_secret",
      domain: "feishu",
      groupPolicy: "open"
    },
  },

  // 所有消息都路由到指挥官
  bindings: [
    {
      agentId: "commander-grove",
      match: {
        channel: "feishu"
      }
    }
  ],
}
```

## 专业 Agent 的 SOUL.md 模板

每个专业 Agent 的 SOUL.md 需要添加**任务读取和输出规范**：

### 示例：CTO Agent 的 SOUL.md（修改版）

在原有 `agentsInfo/cto-vogels.md` 基础上，添加以下内容：

```markdown
## 任务协作模式

### 接收任务
从 `docs/workspace/tasks/TASK-XXX-任务名/` 目录读取任务信息：
- `brief.md`：任务简报
- `ceo-analysis.md`：CEO 的战略分析（如果有）

### 输出规范
将技术设计输出到：
- `cto-design.md`：技术架构设计文档

### 输出格式
```markdown
# 技术设计文档

## 任务 ID
TASK-XXX

## 技术方案
[架构设计内容]

## 风险评估
[风险分析]

## 下一步建议
[给开发团队的建议]
```

## 文档存放

- 任务相关：`docs/workspace/tasks/TASK-XXX-任务名/cto-design.md`
- 通用技术文档：`docs/cto/`

```

### 批量更新所有专业 Agent 的 SOUL.md

```bash
# 为每个专业 Agent 添加任务协作模块
for agent in ceo-bezos cto-vogels fullstack-dhh qa-bach product-norman interaction-cooper ui-duarte marketing-godin sales-ross operations-pg; do
  cat >> ~/.openclaw/workspaces/${agent}/SOUL.md << 'EOF'

## 任务协作模式

### 接收任务
从 `docs/workspace/tasks/TASK-XXX-任务名/` 目录读取：
- `brief.md`：任务简报
- 其他 Agent 的输出（根据任务流程）

### 输出规范
将本角色的输出写入：
- `[agent-role]-output.md`：例如 `cto-design.md`、`dev-code.md`

### 协作原则
1. 先读取前置 Agent 的输出
2. 基于已有信息进行本阶段工作
3. 输出要便于下一个环节使用
4. 明确标注依赖和假设
EOF
done
```

---

## 工作流程示例

### 场景：开发用户认证系统

**用户发送消息：**

```
用户: 帮我开发一个用户认证系统，支持邮箱登录和第三方登录
```

**指挥官响应：**

```
指挥官: 收到任务！这是一个复杂任务，我会协调专业团队完成。

📋 任务 ID: TASK-001-用户认证系统

📊 任务分析：
- 类型：开发类
- 复杂度：中等
- 需要角色：CEO、CTO、FullStack、QA

📝 执行计划：
1. CEO 评估战略价值
2. CTO 设计技术架构
3. FullStack 实现代码
4. QA 测试验证

我已创建任务目录，现在开始执行。

---

第一步：战略评估

基于用户认证系统的需求，我的判断：

✅ 这是核心基础设施，战略价值高
✅ 支持邮箱+第三方登录是合理的功能范围
⚠️ 需要考虑：安全合规、扩展性

建议继续推进。下一步请 CTO 进行技术设计。

---

现在请 @CTO-vogels 进行技术架构设计。
[指挥官已在 docs/workspace/tasks/TASK-001-用户认证系统/cto-design.md 创建设计文档模板]
```

**用户继续对话：**

```
用户: CTO 请设计技术方案
```

**指挥官响应（汇总 CTO 的输出）：**

```
指挥官: 收到 CTO 的技术设计，汇总如下：

🏗️ 技术架构设计

**技术选型：**
- 认证方案：JWT + OAuth 2.0
- Session 管理：Redis
- 数据存储：PostgreSQL

**架构要点：**
1. 为失败而设计 - 认证服务高可用
2. API First - 所有能力通过 API 暴露
3. 去中心化 - 无单点故障

**风险点：**
- 密码存储安全（使用 bcrypt）
- Token 刷新机制
- 第三方登录的账号绑定

详细设计文档：docs/workspace/tasks/TASK-001-用户认证系统/cto-design.md

---

下一步：FullStack 实现代码
请确认技术方案后继续。
```

**用户确认继续：**

```
用户: 方案没问题，继续实现
```

**指挥官继续协调：**

```
指挥官: 收到，协调 FullStack 开始实现。

💻 实现计划

**技术选择（DHH 风格）：**
- 框架：Ruby on Rails（一人团队效率之选）
- 认证基础：Devise + OmniAuth（不重新发明轮子）
- 前端：Hotwire（服务端渲染 + 渐进增强）

**实现内容：**
1. 用户注册（邮箱验证）
2. 登录/登出
3. 密码重置
4. 第三方登录（Google、GitHub）
5. Session 管理

**代码已提交：** `src/auth/`
**单元测试：** 覆盖核心路径

---

下一步：QA 测试验证
```

**最终汇总：**

```
指挥官: 🎉 任务完成！

📋 TASK-001-用户认证系统 - 交付报告

✅ CEO 战略评估：通过
✅ CTO 技术设计：已完成
✅ FullStack 代码实现：已完成
✅ QA 测试验证：通过（1个 Minor 问题待修复）

📦 交付物：
- 技术设计文档
- 源代码（含单元测试）
- 测试报告
- API 文档

⚠️ 待处理：
- [Minor] 密码重置链接有效期建议缩短到 15 分钟

📁 所有文档位置：docs/workspace/tasks/TASK-001-用户认证系统/

🚀 可以部署到测试环境了。需要我继续处理什么吗？
```

---

## 初始化脚本

```bash
#!/bin/bash
# init-commander-system.sh

OPENCLAW_DIR="$HOME/.openclaw"
WORKSPACES_DIR="$OPENCLAW_DIR/workspaces"
AGENTS_INFO_DIR="./agentsInfo"  # 修改为实际路径

# 创建目录结构
echo "创建目录结构..."
mkdir -p "$WORKSPACES_DIR/commander-grove/docs/workspace/"{tasks,knowledge,archive}

# 创建所有专业 Agent 的 workspace
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

for agent in "${AGENTS[@]}"; do
  echo "创建 $agent workspace..."
  mkdir -p "$WORKSPACES_DIR/$agent/docs"

  # 创建符号链接到共享工作区
  ln -sf "$WORKSPACES_DIR/commander-grove/docs/workspace" "$WORKSPACES_DIR/$agent/docs/workspace"
done

# 复制 SOUL.md 文件
echo "复制 SOUL.md 文件..."
for agent in "${AGENTS[@]}"; do
  if [ -f "$AGENTS_INFO_DIR/${agent}.md" ]; then
    cp "$AGENTS_INFO_DIR/${agent}.md" "$WORKSPACES_DIR/$agent/SOUL.md"
    echo "  ✓ $agent/SOUL.md"
  fi
done

# 复制指挥官的 SOUL.md
echo "复制指挥官 SOUL.md..."
if [ -f "$AGENTS_INFO_DIR/commander-grove.md" ]; then
  cp "$AGENTS_INFO_DIR/commander-grove.md" "$WORKSPACES_DIR/commander-grove/SOUL.md"
  echo "  ✓ commander-grove/SOUL.md"
fi

echo "✅ 初始化完成！"
echo ""
echo "下一步："
echo "1. 编辑 ~/.openclaw/openclaw.json 配置文件"
echo "2. 运行 openclaw gateway restart"
echo "3. 验证配置：openclaw agents list --bindings"
```

---

## 部署检查清单

### 1. 目录结构检查

- [ ]  创建了 commander-grove workspace
- [ ]  创建了所有专业 Agent workspace
- [ ]  符号链接正确指向共享工作区

### 2. SOUL.md 检查

- [ ]  commander-grove SOUL.md 已创建（从 agentsInfo/commander-grove.md 复制）
- [ ]  所有专业 Agent SOUL.md 已从 agentsInfo 复制
- [ ]  添加了任务协作模块

### 3. 配置文件检查

- [ ]  openclaw.json 中配置了所有 Agent
- [ ]  commander-grove 设置为 default: true
- [ ]  bindings 将所有消息路由到 commander-grove
- [ ]  每个 Agent 有独立的 workspace 路径

### 4. 功能验证

- [ ]  发送消息验证指挥官响应
- [ ]  测试任务创建流程
- [ ]  验证共享工作区可访问

---

## 核心要点

### 架构优势

1. **单一接口**：用户只和指挥官对话，降低认知负担
2. **专业分工**：每个 Agent 专注于自己的领域
3. **文档驱动**：通过共享文档实现协作，不依赖复杂的消息传递
4. **可扩展**：轻松添加新的专业 Agent

### 协作机制

- 指挥官通过**创建任务目录和文档模板**来"激活"专业 Agent
- 专业 Agent 通过**读取共享文档**了解任务上下文
- 指挥官通过**读取专业 Agent 的输出文档**汇总结果

### 注意事项

- 符号链接确保所有 Agent 能访问共享工作区
- SOUL.md 中的任务协作模块是关键
- 指挥官需要具备综合分析和文档管理能力
