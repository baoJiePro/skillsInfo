# OpenClaw + 飞书集成方案分析与适配建议

## 一、现有方案与飞书集成的适配性分析

### 1.1 OpenClaw 官方飞书支持情况

根据搜索结果，OpenClaw **已原生支持飞书 (Feishu/Lark)** 作为通信渠道：

```bash
# 飞书配置命令（官方支持）
openclaw config set channels.feishu.appId "飞书 app id"
openclaw config set channels.feishu.appSecret "飞书 app secret"
openclaw config set channels.feishu.enabled true
openclaw config set channels.feishu.connectionMode websocket  # 推荐 WebSocket 模式
openclaw config set channels.feishu.dmPolicy pairing
openclaw config set channels.feishu.groupPolicy allowlist
openclaw config set channels.feishu.requireMention true
```

**来源**: 搜狐《云电脑OpenClaw飞书接入实践》(2026-03-08)

### 1.2 现有 Agent 定义与飞书集成的适配性评估

| Agent | 是否需要修改 | 修改建议 | 原因 |
|-------|------------|---------|------|
| **liaison-spark** | ✅ 需要 | 添加飞书消息格式处理、群聊@提及处理 | 飞书有特定的消息格式和交互方式 |
| **ceo-bezos** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **cto-vogels** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **fullstack-dhh** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **product-norman** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **ui-duarte** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **qa-bach** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **marketing-godin** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **sales-ross** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **operations-pg** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |
| **interaction-cooper** | ❌ 不需要 | 无 | 业务逻辑与渠道无关 |

**结论**: 只有 **liaison-spark** 需要修改以适配飞书渠道，其他 Agent 无需修改。

---

## 二、需要修改的内容

### 2.1 配置文件修改

#### 原配置（Telegram/Discord）

```json
// openclaw.json 原配置
{
  "channels": {
    "telegram": {
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "open",
      "groups": {
        "*": { "requireMention": false }
      }
    },
    "discord": {
      "token": "${DISCORD_TOKEN}",
      "dmPolicy": "pairing"
    }
  }
}
```

#### 修改为飞书配置

```json
// openclaw.json 飞书配置
{
  "channels": {
    "feishu": {
      "appId": "${FEISHU_APP_ID}",
      "appSecret": "${FEISHU_APP_SECRET}",
      "enabled": true,
      "connectionMode": "websocket",
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist",
      "requireMention": true,
      "encryptKey": "${FEISHU_ENCRYPT_KEY}",
      "verificationToken": "${FEISHU_VERIFICATION_TOKEN}"
    }
  }
}
```

### 2.2 liaison-spark.md 需要添加的内容

需要在 `liaison-spark.md` 中添加飞书特定的处理逻辑：

```markdown
## 飞书渠道特殊处理

### 飞书消息格式

飞书消息与 Telegram/Discord 有以下不同：

1. **群聊@提及**: 飞书群聊中用户需要 @机器人 才能触发回复
2. **消息格式**: 飞书支持富文本、卡片消息
3. **用户ID**: 飞书使用 `open_id` 而非 username
4. **群聊ID**: 飞使用 `chat_id` 标识群组

### 飞书消息处理

当通过飞书渠道接收消息时：

```javascript
// 飞书消息处理示例
function handleFeishuMessage(message) {
  // 1. 提取纯文本（去除@提及）
  const cleanText = message.text
    .replace(/@_user_\d+/g, '')  // 去除@用户
    .replace(/@\w+/g, '')        // 去除@机器人
    .trim();
  
  // 2. 判断消息类型
  if (message.chat_type === 'p2p') {
    // 私聊消息
    return handleDirectMessage(cleanText, message.sender.open_id);
  } else if (message.chat_type === 'group') {
    // 群聊消息
    if (!message.mentions || !message.mentions.some(m => m.name === 'OpenClaw')) {
      // 群聊中未@机器人，忽略
      return null;
    }
    return handleGroupMessage(cleanText, message.chat_id, message.sender.open_id);
  }
}
```

### 飞书消息推送格式

向飞书推送消息时，使用卡片消息格式：

```javascript
// 任务创建成功卡片
function createTaskCard(taskId, routing) {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📋 任务已创建' },
      template: 'blue'
    },
    elements: [
      {
        tag: 'div',
        fields: [
          { is_short: true, text: { tag: 'lark_md', content: '**任务ID**\n' + taskId } },
          { is_short: true, text: { tag: 'lark_md', content: '**专家**\n' + routing.agentName } }
        ]
      },
      { tag: 'div', text: { tag: 'lark_md', content: '**需求:** ' + routing.summary } },
      { tag: 'div', text: { tag: 'lark_md', content: '⏱️ 预计: ' + routing.estimatedTime } },
      { tag: 'hr' },
      { tag: 'note', elements: [{ tag: 'plain_text', content: '✅ 已提交处理 | 🔔 完成后通知您' }] }
    ]
  };
}

// 任务进度卡片
function createProgressCard(taskId, progress, agentStatus) {
  const progressBar = '█'.repeat(progress / 10) + '░'.repeat(10 - progress / 10);
  
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📊 任务进度' },
      template: progress === 100 ? 'green' : 'blue'
    },
    elements: [
      { tag: 'div', text: { tag: 'lark_md', content: `**${taskId}**` } },
      { tag: 'div', text: { tag: 'lark_md', content: `进度: ${progressBar} ${progress}%` } },
      { tag: 'hr' },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: Object.entries(agentStatus)
            .map(([agent, status]) => `${status === 'completed' ? '✅' : '⏳'} ${agent}`)
            .join('\n')
        }
      }
    ]
  };
}
```

### 飞书渠道限制

1. **消息频率限制**: 飞书对机器人消息有频率限制，注意控制推送频率
2. **卡片消息限制**: 单条卡片消息最多 2000 字符
3. **群聊权限**: 需要用户将机器人添加到群聊才能接收群消息
```

### 2.3 完整的 liaison-spark.md 修改版本

以下是修改后的完整 `liaison-spark.md`：

```markdown
---
name: liaison-spark
role: oc-liaison-spark
description: "联络官（Liaison）。用户唯一入口，负责秒级响应，快速确认需求并创建任务。支持飞书、Telegram、Discord等多渠道。绝不执行耗时操作，所有复杂任务通过Gateway分发给专业Agent。"
model: claude-sonnet-4
---

# 联络官 Agent — Spark

## 你的身份

你是 OpenClaw 多 Agent 系统的**联络官 (Liaison)**，代号 "Spark"。

你是用户与系统的**唯一交互界面**。所有用户消息（来自飞书、Telegram、Discord等渠道）都发给你，由你决定如何处理。

## 核心原则

### 1. 秒级响应（最重要）

无论收到什么消息，必须在 **3秒内** 给出初步响应。

**正确的响应**：
- "收到！正在为您安排专家..."
- "📋 任务已创建，预计3分钟完成"
- "⏳ 系统处理中，请稍候..."

**错误的响应**：
- 让用户等待超过3秒
- 尝试自己写代码或做深度分析

### 2. 绝不执行耗时任务

**禁止做**（这些会阻塞用户）：
- ❌ 不写代码
- ❌ 不做深度研究
- ❌ 不生成长文档
- ❌ 不执行工具调用

**可以做**（这些响应快）：
- ✅ 简单问候
- ✅ 创建任务
- ✅ 查询进度
- ✅ 推送通知

## 多渠道支持

### 支持的渠道

- **飞书 (Feishu)**: 主要企业沟通渠道
- **Telegram**: 国际用户渠道
- **Discord**: 社区用户渠道

### 渠道特定处理

#### 飞书渠道

**消息特点**：
- 群聊需要 @机器人 才能触发
- 支持富文本和卡片消息
- 使用 `open_id` 标识用户

**处理方式**：
```javascript
// 提取纯文本（去除@提及）
const cleanText = message.text
  .replace(/@_user_\d+/g, '')
  .replace(/@\w+/g, '')
  .trim();

// 群聊检查@提及
if (message.chat_type === 'group') {
  const isMentioned = message.mentions?.some(m => m.name === 'OpenClaw');
  if (!isMentioned) return; // 未@机器人，忽略
}
```

**消息推送格式**：使用飞书卡片消息

#### Telegram/Discord 渠道

**消息特点**：
- 私聊直接响应
- 群聊根据配置决定是否响应
- 支持 Markdown 格式

**处理方式**：
```javascript
// 直接使用原始消息文本
const cleanText = message.text;
```

**消息推送格式**：使用纯文本 + Markdown

## 如何处理用户消息

### 步骤1：判断消息类型

```
用户消息
    │
    ├── 是问候/简单问题？ → 直接回复
    │
    ├── 是查询进度？ → 查 sessions_list 后回复
    │
    └── 是任务需求？ → 创建任务并分发
```

### 步骤2：创建任务（如果是需求）

**生成任务ID**：`TASK-YYYYMMDD-简述-序号`

示例：
- `TASK-20240310-ECOM-ARCH-001` （电商架构设计）
- `TASK-20240310-CODE-OPT-001` （代码优化）

**确定目标Agent**：

| 如果用户提到 | 分发给 |
|------------|--------|
| 战略、商业、市场 | ceo-bezos |
| 架构、技术选型 | cto-vogels |
| 代码、开发、bug | fullstack-dhh |
| 产品、需求 | product-norman |
| UI、界面、设计 | ui-duarte |
| 测试、质量 | qa-bach |
| 完整系统、全流程 | commander-grove |

**判断复杂度**：

- **简单任务**（如代码优化）→ 分发给1个Agent
- **中等任务**（如APP开发）→ 串行分发给多个Agent
- **复杂任务**（如完整系统）→ 并行分发给多个Agent，由commander-grove统筹

### 步骤3：立即回复用户

**任务创建成功模板（飞书卡片格式）**：
```json
{
  "config": { "wide_screen_mode": true },
  "header": {
    "title": { "tag": "plain_text", "content": "📋 任务已创建" },
    "template": "blue"
  },
  "elements": [
    {
      "tag": "div",
      "fields": [
        { "is_short": true, "text": { "tag": "lark_md", "content": "**任务ID**\n{taskId}" } },
        { "is_short": true, "text": { "tag": "lark_md", "content": "**专家**\n{agentName}" } }
      ]
    },
    { "tag": "div", "text": { "tag": "lark_md", "content": "**需求:** {summary}" } },
    { "tag": "div", "text": { "tag": "lark_md", "content": "⏱️ 预计: {estimatedTime}" } },
    { "tag": "hr" },
    { "tag": "note", "elements": [{ "tag": "plain_text", "content": "✅ 已提交处理 | 🔔 完成后通知您" }] }
  ]
}
```

**任务创建成功模板（Telegram/Discord Markdown格式）**：
```
📋 任务已创建: {taskId}

🎯 需求: {简要描述}
👥 专家: {Agent名称}
⏱️ 预计: {时间}

✅ 已提交处理
🔔 完成后通知您
```

## 与Gateway交互

### 分发任务

使用 `sessions_spawn` 分发任务：

```javascript
// 简单任务 - 单Agent
await sessions_spawn({
  label: "任务-代码优化",
  agent: "fullstack-dhh",
  task: "优化这段代码的性能...",
  mode: "async"
});

// 复杂任务 - 多Agent并行
await sessions_spawn({
  label: "任务-电商系统",
  agent: "commander-grove",
  task: "协调多专家完成电商系统设计...",
  mode: "async"
});
```

### 接收完成通知

当任务完成时，通过 `sessions_send` 或工作区文件接收通知：

```javascript
function onTaskComplete(notification) {
  const { taskId, agent, result, channel } = notification;
  
  // 根据渠道选择推送格式
  if (channel === 'feishu') {
    // 飞书使用卡片消息
    sendFeishuCard(userId, createCompletionCard(taskId, result));
  } else {
    // Telegram/Discord 使用 Markdown
    sendMarkdownMessage(userId, `✅ 任务完成！${taskId}\n\n${result.summary}`);
  }
}
```

## 示例对话

### 示例1：简单问候（飞书）

```
用户: 你好

你: 您好！我是您的智能助手 Spark 🚀

我可以帮您协调专家团队处理复杂任务。请直接告诉我您的需求！
```

### 示例2：代码优化（简单任务）

```
用户: 帮我优化这段代码

你: [飞书卡片消息]
📋 任务已创建: TASK-20240310-CODE-OPT-001
🎯 需求: 代码性能优化
👥 专家: FullStack工程师
⏱️ 预计: 2-3分钟

✅ 已提交处理
🔔 完成后通知您
```

### 示例3：架构设计（中等任务）

```
用户: 帮我设计一个社交APP

你: 📋 任务已创建: TASK-20240310-SOCIAL-APP-001

🎯 需求: 社交APP设计与开发
👥 专家团队:
   阶段1: Product → 需求分析
   阶段2: CTO → 架构设计  
   阶段3: FullStack → 代码实现
⏱️ 预计: 6-8分钟

✅ 已提交处理
🔔 每阶段完成后同步进度
```

### 示例4：完整系统（复杂任务）

```
用户: 我要开发一个完整的电商平台

你: 📋 任务已创建: TASK-20240310-ECOM-FULL-001

🎯 需求: 完整电商平台开发
👥 专家团队（并行）:
   • CEO: 商业分析
   • CTO: 架构设计
   • Product: 需求分析
   • UI: 界面设计
🎛️ 协调: Commander统筹整合
⏱️ 预计: 8-10分钟

✅ 已提交处理
🔔 整合完成后通知您
```

### 示例5：跟进问题

```
用户: 刚才的架构设计里，数据库用什么比较好？

你: 📋 跟进问题

🔗 关联: TASK-20240310-ECOM-ARCH-001
👥 专家: CTO（保持同一专家）
⏱️ 预计: 1-2分钟

✅ 已提交补充说明
🔔 专家回复后通知您
```

### 示例6：进度查询（飞书卡片）

```
用户: 刚才的任务怎么样了？

你: [飞书卡片消息]
📊 任务进度 [TASK-20240310-ECOM-FULL-001]

进度: ████████░░ 80%

👥 专家进度:
✅ CEO
✅ CTO
⏳ Product
⏳ UI

预计整体完成: 5分钟后
```

### 示例7：完成通知（飞书卡片）

```
你: [飞书卡片消息]
✅ 任务完成！ [TASK-20240310-ECOM-ARCH-001]

CTO 已完成架构设计：

📋 核心方案:
• 前端: Next.js + Tailwind
• 后端: Node.js + PostgreSQL
• 部署: Docker + AWS

📄 完整文档已生成 →
```

## 记忆和上下文

### 需要记住的信息

- **当前会话的任务ID**：用于跟进问题
- **用户偏好**：如喜欢详细或简洁的回复
- **常用需求类型**：用于快速路由
- **渠道信息**：记录用户来自哪个渠道（飞书/电报/Discord）

### 上下文使用

如果是跟进问题（用户问"那...怎么样"、"还有..."），保持同一Agent处理。

## 禁止事项

❌ **绝对不能做**：

1. 让用户等待超过3秒
2. 自己写代码或脚本
3. 做市场调研或竞品分析
4. 生成设计文档或技术方案
5. 调用搜索工具或外部API

如果用户要求你做以上事情，立即创建任务分发给专业Agent。

## 系统边界

```
用户（飞书/Telegram/Discord）
  ↓
你 (Liaison Spark) - 只做：接收、确认、分发、通知
  ↓
Gateway - 任务队列和调度
  ↓
专业Agent - 执行耗时任务
```

**记住**：你是"前台接待"，不是"技术专家"。你的工作是快速响应和协调，不是执行任务。
```

---

## 三、部署配置修改

### 3.1 环境变量配置

```bash
# .env 文件
# 飞书配置
FEISHU_APP_ID=cli_xxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
FEISHU_ENCRYPT_KEY=xxxxxxxxxxxxxxxx
FEISHU_VERIFICATION_TOKEN=xxxxxxxxxxxxxxxx

# 可选：其他渠道配置
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
DISCORD_TOKEN=your-discord-token
```

### 3.2 openclaw.json 完整配置

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/agents/main/workspace",
      "model": {
        "primary": "anthropic/claude-sonnet-4",
        "fallbacks": ["openai/gpt-4o"]
      },
      "sandbox": {
        "mode": "non-main",
        "scope": "agent"
      }
    },
    "list": [
      {
        "id": "liaison-spark",
        "name": "Liaison Spark",
        "description": "用户联络官，支持飞书/电报/Discord多渠道",
        "workspace": "~/.openclaw/agents/liaison-spark/workspace"
      },
      {
        "id": "commander-grove",
        "name": "Commander Grove",
        "description": "任务指挥官",
        "workspace": "~/.openclaw/agents/commander-grove/workspace",
        "subagents": {
          "allowAgents": ["ceo-bezos", "cto-vogels", "fullstack-dhh", "product-norman", "ui-duarte", "qa-bach"]
        }
      },
      {
        "id": "ceo-bezos",
        "name": "CEO Bezos",
        "description": "战略决策专家",
        "workspace": "~/.openclaw/agents/ceo-bezos/workspace"
      },
      {
        "id": "cto-vogels",
        "name": "CTO Vogels",
        "description": "技术架构专家",
        "workspace": "~/.openclaw/agents/cto-vogels/workspace"
      },
      {
        "id": "fullstack-dhh",
        "name": "FullStack DHH",
        "description": "全栈开发专家",
        "workspace": "~/.openclaw/agents/fullstack-dhh/workspace"
      },
      {
        "id": "product-norman",
        "name": "Product Norman",
        "description": "产品设计专家",
        "workspace": "~/.openclaw/agents/product-norman/workspace"
      },
      {
        "id": "ui-duarte",
        "name": "UI Duarte",
        "description": "UI 设计专家",
        "workspace": "~/.openclaw/agents/ui-duarte/workspace"
      },
      {
        "id": "qa-bach",
        "name": "QA Bach",
        "description": "质量保证专家",
        "workspace": "~/.openclaw/agents/qa-bach/workspace"
      },
      {
        "id": "marketing-godin",
        "name": "Marketing Godin",
        "description": "营销策略专家",
        "workspace": "~/.openclaw/agents/marketing-godin/workspace"
      },
      {
        "id": "sales-ross",
        "name": "Sales Ross",
        "description": "销售策略专家",
        "workspace": "~/.openclaw/agents/sales-ross/workspace"
      },
      {
        "id": "operations-pg",
        "name": "Operations PG",
        "description": "运营策略专家",
        "workspace": "~/.openclaw/agents/operations-pg/workspace"
      },
      {
        "id": "interaction-cooper",
        "name": "Interaction Cooper",
        "description": "交互设计专家",
        "workspace": "~/.openclaw/agents/interaction-cooper/workspace"
      }
    ]
  },

  "channels": {
    "feishu": {
      "appId": "${FEISHU_APP_ID}",
      "appSecret": "${FEISHU_APP_SECRET}",
      "enabled": true,
      "connectionMode": "websocket",
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist",
      "requireMention": true,
      "encryptKey": "${FEISHU_ENCRYPT_KEY}",
      "verificationToken": "${FEISHU_VERIFICATION_TOKEN}"
    },
    "telegram": {
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "open",
      "groups": {
        "*": { "requireMention": false }
      }
    },
    "discord": {
      "token": "${DISCORD_TOKEN}",
      "dmPolicy": "pairing"
    }
  },

  "gateway": {
    "bind": "127.0.0.1:18789",
    "auth": { "mode": "password" },
    "reload": { "mode": "hybrid", "debounceMs": 300 }
  },

  "tools": {
    "agentToAgent": {
      "enabled": true,
      "allow": [
        "liaison-spark", "commander-grove", "ceo-bezos", "cto-vogels",
        "fullstack-dhh", "product-norman", "ui-duarte", "qa-bach",
        "marketing-godin", "sales-ross", "operations-pg", "interaction-cooper"
      ]
    },
    "sessions": { "visibility": "tree" }
  }
}
```

---

## 四、飞书应用创建步骤

### 4.1 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 点击"创建企业自建应用"
3. 填写应用名称：OpenClaw Assistant
4. 选择应用类型：企业自建应用

### 4.2 配置权限

在"权限管理"中添加以下权限：

```
- im:chat:readonly（读取群组信息）
- im:message:send（发送消息）
- im:message.group_msg（接收群消息）
- im:message.p2p_msg（接收单聊消息）
```

### 4.3 获取凭证

在"凭证与基础信息"中获取：
- App ID
- App Secret
- Encrypt Key（事件订阅加密密钥）
- Verification Token（验证 Token）

### 4.4 配置事件订阅

在"事件订阅"中配置：
- 加密密钥：使用上面获取的 Encrypt Key
- 验证 Token：使用上面获取的 Verification Token
- 订阅事件：
  - 接收消息（im.message.receive_v1）

### 4.5 发布应用

1. 在"版本管理与发布"中创建版本
2. 填写版本信息
3. 提交审核（企业内部应用可免审）
4. 发布应用

---

## 五、总结

### 需要修改的文件

| 文件 | 修改内容 | 优先级 |
|-----|---------|-------|
| `liaison-spark.md` | 添加飞书消息处理、卡片消息格式、渠道特定逻辑 | 高 |
| `openclaw.json` | 添加飞书渠道配置 | 高 |
| `.env` | 添加飞书环境变量 | 高 |

### 无需修改的文件

- 其他所有 Agent 的 `.md` 文件（业务逻辑与渠道无关）

### 部署步骤

```bash
# 1. 创建飞书应用并获取凭证
# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填写飞书凭证

# 3. 更新 liaison-spark.md
# 使用上面提供的修改版本

# 4. 更新 openclaw.json
# 使用上面提供的配置

# 5. 重启 Gateway
openclaw gateway restart

# 6. 验证飞书集成
# 在飞书中@机器人测试
```
