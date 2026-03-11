# OpenClaw 多 Agent 实战部署指南

> 从零开始搭建企业级多 Agent 协作系统，实现智能任务分发与专家协同

---

## 摘要

本指南介绍如何基于 OpenClaw 框架部署一套多 Agent 协作系统，包含 12 个专业领域 Agent（CEO、CTO、产品经理、设计师、开发工程师等），通过联络官（Liaison）统一接收用户需求，智能路由分发给对应专家，实现复杂任务的并行处理与协同完成。此方案还可复刻到其他agent团队。

**核心能力**：

- 💬 即时反馈：用户消息立即收到确认，告别"石沉大海"
- 🎯 智能路由：自动识别需求类型，分发给最合适的专家
- 🤝 多 Agent 协同：复杂任务自动拆解，多专家并行处理
- 📊 状态追踪：实时查询任务进度，完成后主动推送结果

---

## 为什么需要多 Agent 架构？

### 单 Agent 的局限性


| 问题             | 说明                                                  |
| ---------------- | ----------------------------------------------------- |
| **角色混淆**     | 一个 Agent 既当产品经理又当开发，思维跳跃，输出质量低 |
| **上下文爆炸**   | 长期对话导致上下文窗口溢出，遗忘重要信息              |
| **无法并行**     | 串行处理任务，复杂需求耗时过长                        |
| **专业深度不足** | 通用型 Agent 对每个领域都懂一点，但不精通             |

### 多 Agent 架构的优势

```
传统单 Agent:                    多 Agent 架构:
┌─────────────┐                 ┌─────────────┐
│   通用助手   │  ← 所有任务      │  联络官(Liaison) │  ← 统一入口
│  (啥都做)    │                 │  (只分发不执行)  │
└─────────────┘                 └──────┬──────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           ▼                           ▼                           ▼
    ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
    │  CEO Agent  │            │  CTO Agent  │            │  UI Agent   │
    │  战略决策    │            │  架构设计    │            │  界面设计    │
    └─────────────┘            └─────────────┘            └─────────────┘
```

**优势**：

1. **专业分工**：每个 Agent 专注一个领域，输出质量更高
2. **并行处理**：复杂任务拆解后多专家同时工作，效率提升 3-5 倍
3. **清晰边界**：Agent 职责明确，避免角色混淆
4. **可扩展性**：新增专家只需添加配置，不影响现有系统

---

## 为什么需要联络官（Liaison）？

### 问题：用户直接与多个 Agent 交互的混乱

假设用户要开发一个电商 APP，需要咨询：

- 商业模式 → CEO Agent
- 技术架构 → CTO Agent
- 界面设计 → UI Agent
- 代码开发 → FullStack Agent

**没有联络官的情况**：

```
用户: "我想做个电商 APP"
CEO: "建议采用平台模式..."
用户: "技术用什么架构？"
[等待 CEO 回复，但 CEO 不懂技术]
用户: @CTO "技术用什么架构？"
CTO: "建议微服务架构..."
用户: "界面怎么设计？"
[需要再次 @UI Agent]
```

**问题**：

- 用户需要自己判断该问谁
- 多个 Agent 之间信息不互通
- 用户被反复询问相同背景信息
- 没有统一进度追踪

### 联络官的价值

```
用户: "我想做个电商 APP"
        ↓
┌─────────────────┐
│  联络官 Spark    │ ← 即时反馈："收到！正在为您安排专家团队..."
│  • 识别需求类型  │
│  • 路由给专家   │
│  • 汇总进度    │
│  • 推送结果    │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
 CEO       CTO      Product    UI
(商业)    (架构)    (需求)   (设计)
    └────┬────┴────────┴────────┘
         │
    ┌────┴────┐
    ▼         ▼
Commander (统筹汇总)
    │
    ▼
联络官 → 推送完整方案给用户
```

**联络官的核心职责**：


| 职责         | 说明                                 | 为什么重要               |
| ------------ | ------------------------------------ | ------------------------ |
| **唯一入口** | 用户只与联络官对话                   | 降低用户认知负担         |
| **即时反馈** | 收到需求立即确认，执行中主动同步进度 | 避免用户"石沉大海"的焦虑 |
| **智能路由** | 自动识别需求类型，分发给对应专家     | 用户无需判断该找谁       |
| **进度追踪** | 实时查询各专家进度                   | 用户随时了解状态         |
| **结果推送** | 完成后主动通知用户                   | 用户无需反复询问         |

**关键设计**：联络官只做"分发和通知"，不做耗时任务，确保始终能即时响应用户。

**关键设计**：联络官只做"分发和通知"，不做耗时任务，确保始终快速响应。

---

## 前置条件

- [X]  已安装 OpenClaw (`npm install -g openclaw`)
- [X]  已运行 `openclaw onboard` 完成初始化
- [X]  已有飞书企业账号，并创建了企业自建应用（用于用户通信）

---

## 第一步：一键初始化 Agent 环境

创建并执行初始化脚本：

```bash
# 创建初始化脚本
cat > init-agents.sh << 'EOF'
#!/bin/bash

# OpenClaw 配置目录
OPENCLAW_DIR="$HOME/.openclaw"

# 检查目录是否存在
if [ ! -d "$OPENCLAW_DIR" ]; then
  echo "❌ 错误：找不到 $OPENCLAW_DIR 目录"
  echo "   请先运行 'openclaw onboard' 完成初始化"
  exit 1
fi

# 定义 Agent 列表
AGENTS=(
  "liaison-spark"
  "commander-grove"
  "ceo-bezos"
  "cto-vogels"
  "fullstack-dhh"
  "product-norman"
  "ui-duarte"
  "qa-bach"
  "marketing-godin"
  "sales-ross"
  "operations-pg"
  "interaction-cooper"
)

# 创建目录结构
echo "🚀 开始创建 Agent 目录结构..."
for agent in "${AGENTS[@]}"; do
  mkdir -p "$OPENCLAW_DIR/agents/$agent"/{agent,sessions,workspace}
  echo "✅ 创建目录: agents/$agent"
done

# 复制 Agent 定义文件
echo ""
echo "📋 开始复制 Agent 定义文件..."

# 获取脚本所在目录（支持从任意位置执行）
SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
  # 如果是软链接，获取真实路径
  SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH" 2>/dev/null || readlink "$SCRIPT_PATH" 2>/dev/null || echo "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# 查找 agentsInfo 目录（支持两种位置：脚本同级目录或当前目录）
if [ -d "$SCRIPT_DIR/agentsInfo" ]; then
  AGENTS_INFO_DIR="$SCRIPT_DIR/agentsInfo"
elif [ -d "$(pwd)/agentsInfo" ]; then
  AGENTS_INFO_DIR="$(pwd)/agentsInfo"
else
  echo "❌ 错误：找不到 agentsInfo 目录"
  echo "   请确保 agentsInfo 目录与 init-agents.sh 在同一目录下"
  exit 1
fi

echo "   使用 agentsInfo 目录: $AGENTS_INFO_DIR"

for agent in "${AGENTS[@]}"; do
  if [ -f "$AGENTS_INFO_DIR/${agent}.md" ]; then
    cp "$AGENTS_INFO_DIR/${agent}.md" "$OPENCLAW_DIR/agents/$agent/workspace/SOUL.md"
    echo "✅ 复制: ${agent}.md -> SOUL.md"
  else
    echo "⚠️  未找到: agentsInfo/${agent}.md"
  fi
done

echo ""
echo "🎉 Agent 环境初始化完成！"
echo ""
echo "验证命令："
echo "  ls -la $OPENCLAW_DIR/agents/"
echo "  ls -la $OPENCLAW_DIR/agents/liaison-spark/workspace/"
EOF

# 添加执行权限
chmod +x init-agents.sh

# 执行脚本
./init-agents.sh
```

**验证初始化结果**：

```bash
# 检查 Agent 目录
ls -la "$HOME/.openclaw/agents/"

# 检查 SOUL.md 是否复制成功
ls -la "$HOME/.openclaw/agents/liaison-spark/workspace/"
```

---

## 第二步：配置 OpenClaw 并启动

选择以下**任意一种方式**配置：

### 方式一：使用命令行工具

```bash
# 1. 配置 12 个 Agent（使用 $HOME 环境变量确保路径正确）
openclaw config set agents.list "[
  {\"id\": \"liaison-spark\", \"name\": \"Liaison Spark\", \"workspace\": \"$HOME/.openclaw/agents/liaison-spark/workspace\", \"subagents\": {\"allowAgents\": [\"commander-grove\", \"ceo-bezos\", \"cto-vogels\", \"fullstack-dhh\", \"product-norman\", \"ui-duarte\", \"qa-bach\", \"marketing-godin\", \"sales-ross\", \"operations-pg\", \"interaction-cooper\"]}},
  {\"id\": \"commander-grove\", \"name\": \"Commander Grove\", \"workspace\": \"$HOME/.openclaw/agents/commander-grove/workspace\", \"subagents\": {\"allowAgents\": [\"ceo-bezos\", \"cto-vogels\", \"fullstack-dhh\", \"product-norman\", \"ui-duarte\", \"qa-bach\"]}},
  {\"id\": \"ceo-bezos\", \"name\": \"CEO Bezos\", \"workspace\": \"$HOME/.openclaw/agents/ceo-bezos/workspace\"},
  {\"id\": \"cto-vogels\", \"name\": \"CTO Vogels\", \"workspace\": \"$HOME/.openclaw/agents/cto-vogels/workspace\"},
  {\"id\": \"fullstack-dhh\", \"name\": \"FullStack DHH\", \"workspace\": \"$HOME/.openclaw/agents/fullstack-dhh/workspace\"},
  {\"id\": \"product-norman\", \"name\": \"Product Norman\", \"workspace\": \"$HOME/.openclaw/agents/product-norman/workspace\"},
  {\"id\": \"ui-duarte\", \"name\": \"UI Duarte\", \"workspace\": \"$HOME/.openclaw/agents/ui-duarte/workspace\"},
  {\"id\": \"qa-bach\", \"name\": \"QA Bach\", \"workspace\": \"$HOME/.openclaw/agents/qa-bach/workspace\"},
  {\"id\": \"marketing-godin\", \"name\": \"Marketing Godin\", \"workspace\": \"$HOME/.openclaw/agents/marketing-godin/workspace\"},
  {\"id\": \"sales-ross\", \"name\": \"Sales Ross\", \"workspace\": \"$HOME/.openclaw/agents/sales-ross/workspace\"},
  {\"id\": \"operations-pg\", \"name\": \"Operations PG\", \"workspace\": \"$HOME/.openclaw/agents/operations-pg/workspace\"},
  {\"id\": \"interaction-cooper\", \"name\": \"Interaction Cooper\", \"workspace\": \"$HOME/.openclaw/agents/interaction-cooper/workspace\"}
]"

# 2. 启用 Agent 间通信
openclaw config set tools.agentToAgent.enabled true
openclaw config set tools.agentToAgent.allow '["liaison-spark", "commander-grove", "ceo-bezos", "cto-vogels", "fullstack-dhh", "product-norman", "ui-duarte", "qa-bach", "marketing-godin", "sales-ross", "operations-pg", "interaction-cooper"]'

# 3. 配置飞书渠道绑定（所有飞书消息路由给 liaison-spark）
openclaw config set bindings '[{"agentId": "liaison-spark", "match": {"channel": "feishu"}}]'

# 4. 启动 Gateway
openclaw gateway restart
```

### 方式二：编辑配置文件

```bash
# 备份原配置
cp "$HOME/.openclaw/openclaw.json" "$HOME/.openclaw/openclaw.json.backup"

# 编辑配置
nano "$HOME/.openclaw/openclaw.json"
```

**在原有配置基础上，添加以下内容**（注意：将 `/home/your-username` 替换为你实际的家目录路径，macOS 用户通常是 `/Users/你的用户名`）：

```json
{
  "agents": {
    "list": [
      {
        "id": "liaison-spark",
        "name": "Liaison Spark",
        "workspace": "/home/your-username/.openclaw/agents/liaison-spark/workspace",
        "subagents": {
          "allowAgents": ["commander-grove", "ceo-bezos", "cto-vogels", "fullstack-dhh", "product-norman", "ui-duarte", "qa-bach", "marketing-godin", "sales-ross", "operations-pg", "interaction-cooper"]
        }
      },
      {
        "id": "commander-grove",
        "name": "Commander Grove",
        "workspace": "/home/your-username/.openclaw/agents/commander-grove/workspace",
        "subagents": {
          "allowAgents": ["ceo-bezos", "cto-vogels", "fullstack-dhh", "product-norman", "ui-duarte", "qa-bach"]
        }
      },
      {
        "id": "ceo-bezos",
        "name": "CEO Bezos",
        "workspace": "/home/your-username/.openclaw/agents/ceo-bezos/workspace"
      },
      {
        "id": "cto-vogels",
        "name": "CTO Vogels",
        "workspace": "/home/your-username/.openclaw/agents/cto-vogels/workspace"
      },
      {
        "id": "fullstack-dhh",
        "name": "FullStack DHH",
        "workspace": "/home/your-username/.openclaw/agents/fullstack-dhh/workspace"
      },
      {
        "id": "product-norman",
        "name": "Product Norman",
        "workspace": "/home/your-username/.openclaw/agents/product-norman/workspace"
      },
      {
        "id": "ui-duarte",
        "name": "UI Duarte",
        "workspace": "/home/your-username/.openclaw/agents/ui-duarte/workspace"
      },
      {
        "id": "qa-bach",
        "name": "QA Bach",
        "workspace": "/home/your-username/.openclaw/agents/qa-bach/workspace"
      },
      {
        "id": "marketing-godin",
        "name": "Marketing Godin",
        "workspace": "/home/your-username/.openclaw/agents/marketing-godin/workspace"
      },
      {
        "id": "sales-ross",
        "name": "Sales Ross",
        "workspace": "/home/your-username/.openclaw/agents/sales-ross/workspace"
      },
      {
        "id": "operations-pg",
        "name": "Operations PG",
        "workspace": "/home/your-username/.openclaw/agents/operations-pg/workspace"
      },
      {
        "id": "interaction-cooper",
        "name": "Interaction Cooper",
        "workspace": "/home/your-username/.openclaw/agents/interaction-cooper/workspace"
      }
    ]
  },

  "channels": {
    "feishu": {
      "appId": "${FEISHU_APP_ID}",
      "appSecret": "${FEISHU_APP_SECRET}",
      "enabled": true,
      "connectionMode": "websocket"
    }
  },

  "tools": {
    "agentToAgent": {
      "enabled": true,
      "allow": [
        "liaison-spark", "commander-grove", "ceo-bezos", "cto-vogels",
        "fullstack-dhh", "product-norman", "ui-duarte", "qa-bach",
        "marketing-godin", "sales-ross", "operations-pg", "interaction-cooper"
      ]
    }
  },

  "bindings": [
    {
      "agentId": "liaison-spark",
      "match": {
        "channel": "feishu"
      }
    }
  ]
}
```

**保存退出**：`Ctrl+O` 回车保存，`Ctrl+X` 退出

```bash
# 启动 Gateway
openclaw gateway start
```

---

**看到以下输出表示启动成功**：

```
✓ Gateway started on 127.0.0.1:18789
✓ Loaded 12 agents
✓ Feishu channel connected
```

**保持运行**，新开一个终端窗口继续下一步。

---

## 第三步：验证部署

在新终端窗口中执行：

```bash
# 检查 Agent 列表
openclaw agents list

# 应该看到 12 个 Agent
# - liaison-spark
# - commander-grove
# - ceo-bezos
# ...
```

```bash
# 检查 Gateway 状态
openclaw gateway status

# 应该显示: running
```

---

## 第四步：测试系统

### 测试 1：简单问候

在飞书中向你的机器人发送：

```
你好
```

**预期响应**（即时）：

```
您好！我是您的智能助手 Spark 🚀

我可以帮您协调专家团队处理复杂任务。请直接告诉我您的需求！
```

### 测试 2：创建任务

发送：

```
帮我优化这段代码的性能
```

**预期响应**（即时确认）：

```
📋 任务已创建: TASK-20240310-CODE-OPT-001

🎯 需求: 代码性能优化
👥 专家: 全栈工程师
⏱️ 预计: 2-3分钟

✅ 已提交处理
🔔 完成后将通知您
```

**说明**：这不是任务完成，而是"已收到，正在安排专家处理"的确认。实际执行由后台 Agent 异步完成。

### 测试 3：查询进度

发送：

```
刚才的任务怎么样了？
```

**预期响应**：

```
📊 任务进度 [TASK-20240310-CODE-OPT-001]

总体进度: ██████████ 100%

👥 专家进度:
✅ fullstack-dhh
```

---

## 常见问题

### Q1: 启动 Gateway 时报错 "port already in use"

```bash
# 查找占用 18789 端口的进程
lsof -i :18789

# 杀掉进程
kill -9 <进程ID>

# 重新启动
openclaw gateway start
```

### Q2: Agent 没有响应

```bash
# 检查 Agent 配置是否正确加载
openclaw agents list

# 检查对应 Agent 的 SOUL.md 是否存在
ls "$HOME/.openclaw/agents/liaison-spark/workspace/"
```

### Q3: 飞书没有收到消息

```bash
# 检查飞书配置
openclaw config get channels.feishu

# 检查 Gateway 日志
openclaw gateway logs
```

### Q4: 如何停止 Gateway

```bash
# 在 Gateway 运行的终端按 Ctrl+C
# 或者
openclaw gateway stop
```

---

## 系统架构图（供参考）

```
用户 (飞书)
    ↓
OpenClaw Gateway
    ↓
Liaison Spark (联络官)
    ↓
    ├── 简单任务 → sessions_spawn → Specialist Agent
    └── 复杂任务 → sessions_spawn → Commander Grove
                                            ↓
                            sessions_spawn → 多个 Specialist Agent
                                            ↓
                            汇总结果 → sessions_send → Liaison
                                            ↓
                                        推送给用户
```

---

## 下一步（可选）

### 添加 Discord 渠道

```bash
# 编辑配置文件
nano "$HOME/.openclaw/openclaw.json"

# 在 channels 部分添加：
"discord": {
  "token": "${DISCORD_TOKEN}",
  "dmPolicy": "pairing"
}
```

### 添加 Telegram 渠道

```bash
# 编辑配置文件
nano "$HOME/.openclaw/openclaw.json"

# 在 channels 部分添加：
"telegram": {
  "botToken": "${TELEGRAM_BOT_TOKEN}",
  "dmPolicy": "open",
  "groups": {
    "*": { "requireMention": false }
  }
}
```

---

## 文件结构总览

```
~/.openclaw/
├── openclaw.json          # 主配置文件（你编辑的）
├── .env                   # 环境变量（Token）
├── openclaw.json.backup   # 配置备份
└── agents/                # Agent 目录
    ├── liaison-spark/
    │   └── workspace/
    │       └── SOUL.md    # Agent 角色定义
    ├── commander-grove/
    │   └── workspace/
    │       └── SOUL.md
    └── ... (其他 Agent)
```

---

## 亮点成果

### 1. 即时反馈体验

**传统单 Agent 的问题**：

```
用户: "帮我设计一个电商系统"
[等待 5 分钟...]
[等待 10 分钟...]
用户: "还在吗？"
[等待 15 分钟...]
Agent: "完成了！这是设计方案..."
```

**多 Agent 架构的改进**：

```
用户: "帮我设计一个电商系统"
联络官: "📋 收到！正在为您安排专家团队..."  ← 立即反馈

[1 分钟后]
联络官: "⏳ 进度更新：CEO 已完成商业分析，CTO 进行中..."  ← 主动同步

[5 分钟后]
联络官: "✅ 任务完成！所有专家已提交方案"  ← 完成通知
```

**关键设计**：

- **即时确认**：收到需求立即回复"已收到，正在处理"
- **进度同步**：任务执行中主动告知进展，不让用户焦虑等待
- **完成通知**：任务完成后第一时间推送结果
- **随时查询**：用户可以主动询问"进度如何"，立即获得状态更新

### 2. 智能路由准确率

- 基于关键词匹配的 **11 个领域** 路由表
- 三级复杂度评估（简单/中等/复杂）
- 复杂任务自动交由 Commander 统筹

### 3. 多 Agent 并行效率

- 复杂任务拆解后 **多专家并行处理**
- 相比单 Agent 串行处理，效率提升 **3-5 倍**
- 各 Agent 专注领域，输出质量更高

### 4. 完整状态追踪

- 使用 `sessions_list` 实时查询任务状态
- 每 25% 进度主动推送更新
- 完成后立即通知用户查看结果

---

## 技术难点与解决方案

### 难点 1：Agent 间通信机制

**问题**：OpenClaw 官方提供 `sessions_spawn`、`sessions_send`、`sessions_list` 三个 API，但如何组合使用实现复杂的协作流程？

**解决方案**：

```
Liaison → sessions_spawn → Commander
                              ↓
              sessions_spawn → Specialist Agents (并行)
                              ↓
              sessions_list 轮询检测完成状态
                              ↓
              汇总结果 → sessions_send → Liaison
```

**关键设计**：

- `sessions_spawn` 异步启动，非阻塞
- `sessions_list` 每 5 秒轮询检测任务状态
- `sessions_send` 点对点通知任务完成

### 难点 2：任务状态追踪

**问题**：如何知道多个并行 Agent 何时全部完成？

**解决方案**：

```javascript
// 使用 sessions_list 轮询检测
const activeSessions = await sessions_list({
  kinds: ['subagent'],
  activeMinutes: 5
});

// 检查子会话是否在活跃列表中
const isStillActive = activeSessions.some(
  s => s.id === childSession.id
);
// 不在列表中 = 已完成
```

### 难点 3：工作空间隔离

**问题**：OpenClaw 每个 Agent 有独立工作空间，文件不共享，如何汇总结果？

**解决方案**：

1. Specialist Agent 完成 → 写入自己工作区 → `sessions_send` 通知 Commander
2. Commander 使用 `read` 工具读取各 Agent 输出文件
3. Commander 汇总生成 `summary.md`
4. Commander `sessions_send` 通知 Liaison
5. Liaison `read` summary.md 推送给用户

### 难点 4：联络官即时反馈

**问题**：如果 Liaison 等待任务完成再回复，用户需要等待数分钟，体验像"石沉大海"。

**解决方案**：

- **异步模式**：`sessions_spawn` 立即返回，不等待任务完成
- **即时确认**：收到任务后立即回复 "任务已创建，预计 X 分钟"，让用户知道"已收到"
- **进度同步**：任务执行中主动推送进度更新（如"CEO 已完成，CTO 进行中"）
- **完成通知**：任务完成后第一时间通知用户

**关键区分**：

- ❌ 不是"秒级完成任务"（大模型执行需要时间）
- ✅ 是"即时反馈确认"（让用户知道需求已被接收和处理中）

---

## 适用场景


| 场景         | 说明                                     |
| ------------ | ---------------------------------------- |
| **创业咨询** | 商业模式 + 技术架构 + 产品设计一站式方案 |
| **系统开发** | 从需求分析到代码实现的完整交付           |
| **设计评审** | 产品 + UI + 交互多维度设计审查           |
| **质量把控** | 代码审查 + 测试策略 + 发布检查           |
| **运营策略** | 增长策略 + 营销方案 + 销售流程           |

---

**部署完成！** 现在你可以在飞书中与你的多 Agent 系统对话了。

**下一步建议**：

1. 尝试发送不同类型的需求，观察路由效果
2. 测试复杂任务（如"开发一个电商平台"），体验多 Agent 协作
3. 根据实际需求调整 Agent 角色定义
4. 添加更多渠道（如 Discord、Telegram），支持更多用户入口
