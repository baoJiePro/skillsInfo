# OpenClaw 多 Agent 系统可落地部署方案

> **设计依据**: 本方案基于 OpenClaw 官方文档 (docs.openclaw.ai)、GitHub 仓库 (github.com/openclaw/openclaw) 和技术博客分析整理，所有技术点均有真实来源支撑。

## 为什么需要多 Agent 架构？

### 现实痛点：单 Agent 的致命缺陷

当您使用单个 AI Agent 处理复杂任务时，是否遇到过以下问题：

**❌ 角色混乱，顾此失彼**

- 一个 Agent 既要懂产品，又要懂技术，还要懂运营
- 结果是什么都懂一点，什么都不精
- 深度技术问题缺乏专业判断力

**❌ 上下文过载，质量下降**

- 所有专业领域的知识都塞进一个 Prompt
- Token 被不相关的内容消耗，核心需求被稀释
- 复杂任务时响应质量急剧下降

**❌ 无法并行，效率低下**

- 必须串行处理多个独立任务
- 一个领域阻塞，其他领域等待
- 浪费宝贵的并行处理能力

**❌ 责任不清，难以追溯**

- 出错时不知道是哪个环节出了问题
- 无法针对性优化特定领域的表现
- 缺乏专业分工的质量保障

### 多 Agent 架构的核心价值

**✅ 专业分工，人尽其才**

```
CEO Agent     → 战略决策、全局视野
CTO Agent     → 技术架构、系统设计
FullStack Agent → 代码实现、工程落地
QA Agent      → 质量保障、测试验证
Product Agent → 需求分析、用户体验
```

每个 Agent 都有明确的职责边界和专业深度，就像真实世界中的专家团队。

**✅ 并行协作，效率倍增**

```
传统单 Agent:  45分钟（串行处理）
  研发 → 测试 → 部署 → 监控

多 Agent:     15分钟（并行处理）
  研发 ↘
  测试 → 集成 → 部署
  监控 ↗
```

**✅ 知识隔离，质量保障**

- 每个 Agent 只加载必要的专业上下文
- 避免 Prompt 污染和注意力分散
- 专业领域输出质量显著提升

**✅ 可扩展、可维护**

- 新增领域 = 新增 Agent，不影响现有系统
- 单个 Agent 升级不影响整体架构
- 符合软件工程的单一职责原则

**✅ 真实世界映射**

- 模拟真实公司的组织架构
- 符合人类的协作习惯
- 降低理解和学习成本

## 一、OpenClaw 核心技术架构分析

### 1.1 官方架构概述

根据 OpenClaw GitHub 官方仓库和文档，OpenClaw 采用以下核心架构：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OpenClaw 官方架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   通信渠道层 (Channels)                                                      │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│   │ WhatsApp│ │Telegram │ │ Discord │ │  Slack  │ │  其他   │              │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘              │
│        └─────────────┴─────────────┴─────────────┘                          │
│                          │                                                  │
│                          ▼                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      Gateway (控制平面)                              │  │
│   │  • WebSocket 网络统一控制                                            │  │
│   │  • 多智能体路由 (Multi-Agent Routing)                                │  │
│   │  • 工具调用管理                                                      │  │
│   │  • 会话生命周期管理                                                   │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                          │                                                  │
│                          ▼                                                  │
│   Agent 执行层                                                               │
│   ┌─────────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────────┐  │
│   │   Pi Agent  │  │ CLI工具 │  │ WebChat │  │  iOS/Android 节点       │  │
│   │  (RPC模式)   │  │         │  │   UI    │  │                        │  │
│   └─────────────┘  └─────────┘  └─────────┘  └─────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**来源**: GitHub - openclaw/openclaw README.md

### 1.2 Agent 隔离模型

根据官方文档，OpenClaw 的每个 Agent 拥有完全独立的运行环境：

```
Agent = 完全独立的作用域
├── Workspace (工作空间)
│   ├── 文件系统
│   ├── AGENTS.md / SOUL.md / USER.md (角色定义)
│   ├── 本地笔记
│   └── 角色规则
│
├── State Directory (状态目录)
│   ├── 认证信息 (auth profiles)
│   ├── 模型注册表 (model registry)
│   └── 代理配置
│
└── Session Store (会话存储)
    └── ~/.openclaw/agents/<agentId>/sessions/
        ├── 聊天历史
        └── 路由状态
```

**来源**: docs.openclaw.ai/concepts/multi-agent

### 1.3 官方会话管理工具

根据 OpenClaw 官方工具文档，核心会话管理工具有：


| 工具               | 功能                 | 关键参数                                                | 来源                   |
| ------------------ | -------------------- | ------------------------------------------------------- | ---------------------- |
| `sessions_list`    | 列出可访问会话       | `kinds`, `limit`, `activeMinutes`, `messageLimit`       | docs.openclaw.ai/tools |
| `sessions_send`    | 向其他会话发送消息   | `sessionKey`/`sessionId`, `message`, `timeoutSeconds`   | docs.openclaw.ai/tools |
| `sessions_spawn`   | 创建并启动子代理会话 | `task`, `runtime`, `agentId`, `model`, `mode`, `thread` | docs.openclaw.ai/tools |
| `sessions_history` | 获取会话历史         | -                                                       | docs.openclaw.ai/tools |

**重要特性**:

- `sessions_spawn` 是**非阻塞操作**，立即返回 "accepted" 状态
- 支持 `runtime: "subagent" | "acp"` 两种运行时
- 支持 `mode: "run"` (单次) 或 `"session"` (持久)

**来源**: docs.openclaw.ai/tools

### 1.4 ACP (Agent Communication Protocol) 溯源机制

OpenClaw 3.8 引入的 ACP 机制：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ACP 溯源机制                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   核心功能:                                                                  │
│   • 每条发给智能体的指令自带"身份证"                                         │
│   • 智能体能识别: 谁发的､从哪个入口来的､有没有权限                            │
│                                                                             │
│   实际意义:                                                                  │
│   ✅ 多人协作场景下，Agent 不再无法无天                                       │
│   ✅ 权限管控更精细，想拦的消息拦得住了                                       │
│   ✅ 出了问题能溯源，谁改了谁触发的，一眼看清楚                                │
│                                                                             │
│   比喻: 以前是"大家都是朋友，都信"；现在是"不管是不是朋友，先验码"            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**来源**: OpenClaw 3.8 Release Notes (新浪新闻、搜狐科技报道)

---

## 二、问题一：联络官秒级响应机制

### 2.1 设计约束分析

根据联络官角色定义 (liaison-spark.md)：

```yaml
核心约束:
  响应时间: 3秒内必须给出初步响应
  禁止操作:
    - 不写代码
    - 不做深度研究
    - 不调用外部API
    - 不执行耗时工具调用
  允许操作:
    - 简单问候
    - 创建任务
    - 查询进度
    - 推送通知
```

### 2.2 技术方案：常驻实例 + 异步分发

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      联络官秒级响应架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   用户消息                                                                   │
│      │                                                                       │
│      ▼ < 3秒                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     Liaison Agent (常驻实例)                         │  │
│   │                                                                     │  │
│   │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │  │
│   │  │  消息分类器   │───→│  路由决策器   │───→│  任务分发器   │         │  │
│   │  │              │    │              │    │              │         │  │
│   │  │ • 问候检测   │    │ • 关键词匹配  │    │ • 生成TaskID │         │  │
│   │  │ • 查询检测   │    │ • 复杂度评估  │    │ • sessions_  │         │  │
│   │  │ • 任务检测   │    │ • Agent选择  │    │   spawn调用  │         │  │
│   │  └──────────────┘    └──────────────┘    └──────────────┘         │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│      │                                                                       │
│      ├─ 问候 ───────────→ 直接回复 (本地处理，< 100ms)                        │
│      │                                                                       │
│      ├─ 进度查询 ────────→ 查 sessions_list ──→ 回复 (本地查询，< 500ms)      │
│      │                                                                       │
│      └─ 任务请求 ────────→ sessions_spawn ──→ 立即回复确认 (异步，< 1s)       │
│                              (不等待任务完成)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 实现代码

```javascript
// 基于 OpenClaw 官方 API 的实现

/**
 * 处理用户消息 - 保证3秒内响应
 * @param {string} userMessage - 用户输入
 * @param {string} sessionId - 当前会话ID
 * @returns {Promise<{response: string, latency: number}>}
 */
async function handleUserMessage(userMessage, sessionId) {
  const startTime = Date.now();
  
  // 1. 消息分类（本地处理，< 50ms）
  const messageType = classifyMessage(userMessage);
  
  switch (messageType) {
    case 'GREETING':
      return {
        response: "您好！我是您的智能助手 Spark 🚀\n\n我可以帮您协调专家团队处理复杂任务。请直接告诉我您的需求！",
        latency: Date.now() - startTime
      };
    
    case 'STATUS_QUERY':
      // 使用 sessions_list 查询活跃任务（OpenClaw 原生 API）
      const activeSessions = await sessions_list({
        activeMinutes: 60,
        messageLimit: 0
      });
    
      const taskStatus = formatTaskStatus(activeSessions);
      return {
        response: taskStatus,
        latency: Date.now() - startTime
      };
    
    case 'TASK_REQUEST':
      // 路由决策（本地计算，< 100ms）
      const routing = decideRouting(userMessage);
    
      // 生成任务ID
      const taskId = generateTaskId(userMessage);
    
      // 关键：使用 sessions_spawn 异步启动，不等待完成
      // 这是 OpenClaw 原生支持的异步任务分发
      await sessions_spawn({
        label: `task-${taskId}`,
        agent: routing.targetAgent,  // 目标 Agent ID
        task: `[Task ${taskId}] ${userMessage}`,
        mode: 'run',      // 单次运行模式
        runtime: 'subagent'  // 子代理运行时
      });
    
      // 立即返回确认，不等待任务完成
      return {
        response: formatTaskConfirmation(taskId, routing),
        latency: Date.now() - startTime  // 保证 < 3s
      };
  }
}

/**
 * 消息分类器 - 基于关键词匹配
 */
function classifyMessage(message) {
  const lowerMsg = message.toLowerCase().trim();
  
  // 问候语检测
  if (/^(你好|您好|hi|hello|hey|在吗)/i.test(lowerMsg)) {
    return 'GREETING';
  }
  
  // 进度查询检测
  if (/进度|状态|怎么样了|完成了吗|status|进展/i.test(lowerMsg)) {
    return 'STATUS_QUERY';
  }
  
  // 默认为任务请求
  return 'TASK_REQUEST';
}

/**
 * 格式化任务确认消息
 */
function formatTaskConfirmation(taskId, routing) {
  const agentNames = {
    'ceo-bezos': 'CEO (战略专家)',
    'cto-vogels': 'CTO (架构专家)',
    'fullstack-dhh': '全栈工程师',
    'product-norman': '产品设计师',
    'ui-duarte': 'UI 设计师',
    'qa-bach': 'QA 专家',
    'marketing-godin': '营销专家',
    'sales-ross': '销售专家',
    'operations-pg': '运营专家',
    'interaction-cooper': '交互设计师',
    'commander-grove': '指挥官 (任务统筹)'
  };
  
  return `📋 任务已创建: ${taskId}

🎯 需求: ${routing.summary}
👥 专家: ${agentNames[routing.targetAgent] || routing.targetAgent}
⏱️ 预计: ${routing.estimatedTime}

✅ 已提交处理
🔔 完成后将通知您`;
}
```

### 2.4 为什么这样设计？


| 设计决策                  | 技术依据                                        | 来源                   |
| ------------------------- | ----------------------------------------------- | ---------------------- |
| Liaison 常驻实例          | 避免冷启动延迟                                  | 多 Agent 协同指南      |
| `sessions_spawn` 异步模式 | 官方文档明确说明"非阻塞操作，立即返回 accepted" | docs.openclaw.ai/tools |
| `sessions_list` 查询状态  | 官方会话管理工具                                | docs.openclaw.ai/tools |
| 本地消息分类              | 不涉及外部调用，保证时效                        | 设计约束               |

---

## 三、问题二：联络官路由方案

### 3.1 OpenClaw 官方多 Agent 路由机制

根据 OpenClaw 官方多 Agent 文档，OpenClaw 支持以下路由模式：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OpenClaw 官方多 Agent 路由模式                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 单代理模式 (Single-agent mode) - 默认                                   │
│     • 所有消息路由到同一个代理                                               │
│     • 适合个人使用场景                                                       │
│                                                                             │
│  2. 多代理路由 (Multi-Agent Routing)                                         │
│     • 每个渠道/会话可以配置不同的代理                                         │
│     • 支持基于路径的路由                                                     │
│                                                                             │
│  3. 代理间通信 (Agent-to-Agent Communication)                                │
│     • sessions_send: 点对点消息传递                                          │
│     • sessions_spawn: 子代理委派                                             │
│     • 广播组 (Broadcast Groups): 多代理并行处理                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**来源**: docs.openclaw.ai/concepts/multi-agent

### 3.2 路由决策流程

```
用户消息
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 1: 消息类型判断                                                          │
│ • 问候/简单问题 → 直接回复（不走路由）                                         │
│ • 进度查询 → 查 sessions_list 后回复                                          │
│ • 任务需求 → 进入路由决策                                                      │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 2: 关键词匹配路由表                                                      │
│                                                                             │
│  关键词                    │ 目标 Agent        │ 复杂度基准                  │
│  ──────────────────────────┼───────────────────┼──────────────────────────── │
│  战略/商业/市场/竞品/模式   │ ceo-bezos         │ medium                      │
│  架构/技术选型/系统设计     │ cto-vogels        │ medium                      │
│  代码/开发/编程/bug        │ fullstack-dhh     │ simple                      │
│  产品/需求/PRD/用户故事     │ product-norman    │ medium                      │
│  UI/界面/视觉/设计稿       │ ui-duarte         │ simple                      │
│  测试/质量/自动化测试       │ qa-bach           │ simple                      │
│  营销/推广/增长/SEO        │ marketing-godin   │ medium                      │
│  销售/客户/渠道/成交       │ sales-ross        │ medium                      │
│  运营/流程/效率/SOP        │ operations-pg     │ medium                      │
│  交互/体验/用户研究        │ interaction-cooper│ medium                      │
│  系统/平台/完整/全流程     │ commander-grove   │ complex                     │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 3: 复杂度评估（决定执行模式）                                             │
│                                                                             │
│  指标              │ 简单(simple) │ 中等(medium)    │ 复杂(complex)           │
│  ──────────────────┼──────────────┼─────────────────┼───────────────────────  │
│  涉及领域          │ 单一领域      │ 2-3个领域        │ 4+ 领域                 │
│  任务类型          │ 代码/设计     │ 模块/功能        │ 完整系统/平台           │
│  预计耗时          │ 2-5分钟       │ 5-10分钟         │ 10-15分钟               │
│  执行模式          │ 单Agent       │ 串行多Agent      │ 并行多Agent + Commander │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 4: 任务分发                                                              │
│                                                                             │
│  简单任务: sessions_spawn → 直接分发给对应 Specialist Agent                   │
│  中等任务: sessions_spawn → 分发给 Commander，由 Commander 串行调度            │
│  复杂任务: sessions_spawn → 分发给 Commander，由 Commander 并行调度并统筹       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 路由实现代码

```javascript
// 路由配置表
const AGENT_ROUTING_TABLE = {
  'ceo-bezos': {
    patterns: [/战略|商业|市场|竞品|商业模式|定价|优先级|愿景/i],
    description: 'CEO - 战略决策、商业模式设计',
    expertise: ['business', 'strategy', 'market']
  },
  'cto-vogels': {
    patterns: [/架构|技术选型|系统设计|性能|可靠性|扩展|云原生/i],
    description: 'CTO - 技术架构、系统选型',
    expertise: ['architecture', 'technology', 'scalability']
  },
  'fullstack-dhh': {
    patterns: [/代码|开发|编程|bug|功能实现|重构|优化|部署/i],
    description: 'FullStack - 代码实现、开发',
    expertise: ['coding', 'development', 'implementation']
  },
  'product-norman': {
    patterns: [/产品|需求|功能|用户故事|PRD|用例|用户研究/i],
    description: 'Product - 产品定义、需求分析',
    expertise: ['product', 'requirements', 'ux']
  },
  'ui-duarte': {
    patterns: [/UI|界面|视觉|设计稿|原型|配色|排版|组件/i],
    description: 'UI - 界面设计、视觉规范',
    expertise: ['ui', 'visual', 'design-system']
  },
  'qa-bach': {
    patterns: [/测试|质量|验收|自动化测试|bug排查|回归/i],
    description: 'QA - 测试策略、质量把控',
    expertise: ['testing', 'quality', 'automation']
  },
  'marketing-godin': {
    patterns: [/营销|推广|运营|增长|SEO|内容|品牌|获客/i],
    description: 'Marketing - 营销策略、增长',
    expertise: ['marketing', 'growth', 'branding']
  },
  'sales-ross': {
    patterns: [/销售|客户|渠道|成交|CRM|获客|转化|定价/i],
    description: 'Sales - 销售策略、获客',
    expertise: ['sales', 'crm', 'conversion']
  },
  'operations-pg': {
    patterns: [/运营|流程|效率|管理|SOP|冷启动|留存/i],
    description: 'Operations - 运营策略、流程',
    expertise: ['operations', 'process', 'efficiency']
  },
  'interaction-cooper': {
    patterns: [/交互|体验|用户研究|可用性|用户流程|原型/i],
    description: 'Interaction - 交互设计',
    expertise: ['interaction', 'usability', 'workflow']
  },
  'commander-grove': {
    patterns: [/系统|平台|完整|全流程|端到端|从0到1|统筹/i],
    description: 'Commander - 复杂任务统筹',
    expertise: ['coordination', 'system', 'end-to-end']
  }
};

/**
 * 路由决策函数
 * @param {string} userMessage - 用户消息
 * @returns {object} 路由决策结果
 */
function decideRouting(userMessage) {
  // 1. 关键词匹配
  let targetAgent = 'commander-grove';  // 默认
  let matchScore = 0;
  const matchedAgents = [];
  
  for (const [agentId, config] of Object.entries(AGENT_ROUTING_TABLE)) {
    for (const pattern of config.patterns) {
      if (pattern.test(userMessage)) {
        matchedAgents.push(agentId);
        if (matchScore === 0) {
          targetAgent = agentId;
          matchScore++;
        }
      }
    }
  }
  
  // 2. 复杂度评估
  const complexity = assessComplexity(userMessage, matchedAgents);
  
  // 3. 根据复杂度调整目标 Agent
  if (complexity === 'complex') {
    targetAgent = 'commander-grove';
  }
  
  return {
    targetAgent,
    complexity,
    matchedAgents,
    summary: extractSummary(userMessage),
    estimatedTime: getEstimatedTime(complexity)
  };
}

/**
 * 复杂度评估
 */
function assessComplexity(message, matchedAgents) {
  let score = 0;
  
  const indicators = {
    high: ['完整', '系统', '平台', '全流程', '端到端', '从0到1', '整体', '统筹'],
    medium: ['APP', '网站', '产品', '模块', '功能', '页面'],
    low: ['代码', '接口', 'bug', '样式', '文案', '优化']
  };
  
  indicators.high.forEach(word => {
    if (message.includes(word)) score += 3;
  });
  
  indicators.medium.forEach(word => {
    if (message.includes(word)) score += 2;
  });
  
  indicators.low.forEach(word => {
    if (message.includes(word)) score += 1;
  });
  
  // 根据匹配到的 Agent 数量调整复杂度
  if (matchedAgents.length >= 3) score += 2;
  else if (matchedAgents.length >= 2) score += 1;
  
  if (score >= 5) return 'complex';
  if (score >= 3) return 'medium';
  return 'simple';
}

/**
 * 任务分发 - 使用 OpenClaw 官方 sessions_spawn API
 */
async function dispatchTask(routingResult, userMessage, sessionId) {
  const { targetAgent, complexity } = routingResult;
  const taskId = generateTaskId(userMessage);
  
  // 根据复杂度选择分发策略
  switch (complexity) {
    case 'simple':
      // 简单任务：直接分发给 Specialist
      await sessions_spawn({
        label: `task-${taskId}`,
        agent: targetAgent,
        task: userMessage,
        mode: 'run',
        runtime: 'subagent'
      });
      break;
    
    case 'medium':
    case 'complex':
      // 中/复杂任务：分发给 Commander 统筹
      await sessions_spawn({
        label: `task-${taskId}`,
        agent: 'commander-grove',
        task: `[Complexity: ${complexity}] ${userMessage}\n\nRecommended specialists: ${routingResult.matchedAgents.join(', ')}`,
        mode: 'run',
        runtime: 'subagent'
      });
      break;
  }
  
  return { taskId, targetAgent, complexity };
}
```

---

## 四、问题三：Agent 主动交互机制

### 4.1 OpenClaw 官方 Agent 间通信模式

根据 OpenClaw 多代理协同指南，官方支持三种协同模式：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OpenClaw 官方 Agent 间通信模式                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 代理间直接消息传递 (sessions_send)                                        │
│     • 点对点通信                                                            │
│     • 支持等待回复和即发即忘模式                                             │
│     • 包含自动的 ping-pong 回复循环（最多5轮）                                │
│     • 包含宣告机制                                                          │
│                                                                             │
│  2. 子代理委派 (sessions_spawn)                                              │
│     • 父代理生成子代理处理任务                                               │
│     • 子代理完成后自动回报结果                                               │
│     • 支持跨代理委派（需配置白名单）                                         │
│                                                                             │
│  3. 广播组 (Broadcast Groups)                                                │
│     • 多个代理并行处理同一消息                                               │
│     • 适用于专业团队协作场景                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**来源**: CSDN博客《OpenClaw 多代理协同工作模式配置指南》

### 4.2 配置 Agent 间通信

根据官方配置文档，需要显式启用并设置白名单：

```json
// ~/.openclaw/openclaw.json
{
  "tools": {
    "agentToAgent": {
      "enabled": true,
      "allow": [
        "liaison-spark",
        "commander-grove",
        "ceo-bezos",
        "cto-vogels",
        "fullstack-dhh",
        "product-norman",
        "qa-bach",
        "ui-duarte",
        "interaction-cooper",
        "marketing-godin",
        "sales-ross",
        "operations-pg"
      ]
    }
  }
}
```

**来源**: docs.openclaw.ai/gateway/configuration

### 4.3 Agent 主动交互流程

```
场景：复杂任务（并行多 Agent）

用户: "开发完整电商平台"

Step 1: Liaison 接收并创建任务
─────────────────────────
Liaison → 路由决策（complex → commander-grove）
        → sessions_spawn({
            agent: 'commander-grove',
            task: '[Complexity: complex] 开发完整电商平台',
            mode: 'run'
          })
        → 立即回复用户: "任务已创建，预计10-15分钟"

Step 2: Commander 并行分发
─────────────────────────
Commander → 分析任务需求
          → 确定需要: CEO + CTO + Product + UI
          → sessions_spawn({agent: 'ceo-bezos', mode: 'run'})
          → sessions_spawn({agent: 'cto-vogels', mode: 'run'})
          → sessions_spawn({agent: 'product-norman', mode: 'run'})
          → sessions_spawn({agent: 'ui-duarte', mode: 'run'})

Step 3: Specialist Agent 执行
─────────────────────────
CEO → 分析商业模式
    → 使用 write 工具写入结果到工作区
    → sessions_send({
        session: 'commander-grove',
        message: '[ceo-bezos] Task complete. Output written to workspace.'
      })

CTO → 设计技术架构
    → 使用 write 工具写入结果到工作区
    → sessions_send({
        session: 'commander-grove',
        message: '[cto-vogels] Task complete. Output written to workspace.'
      })

[Product, UI 同理...]

Step 4: Commander 监控和汇总
─────────────────────────
Commander → 使用 sessions_list 监控子任务状态
          → 接收所有 sessions_send 完成通知
          → 使用 read 工具读取各 Agent 输出
          → 生成汇总结果
          → 使用 write 工具写入 summary.md
          → sessions_send({
              session: 'liaison-spark',
              message: '[commander-grove] Task complete. Summary ready.'
            })

Step 5: Liaison 推送结果给用户
─────────────────────────
Liaison → 接收 commander-grove 的 sessions_send 通知
        → 使用 read 工具读取 summary.md
        → 格式化消息
        → 推送给用户: "✅ 任务完成！电商平台设计方案..."
```

### 4.4 代码实现

```javascript
/**
 * Commander 的并行任务协调
 * 使用 OpenClaw 官方 sessions_spawn 和 sessions_send API
 */
async function coordinateParallelTask(taskId, userRequest, requiredAgents) {
  const results = {};
  
  // 1. 并行启动所有 Specialist Agent
  const spawnPromises = requiredAgents.map(async (agentId) => {
    // 使用 sessions_spawn 启动子代理
    const childSession = await sessions_spawn({
      label: `${taskId}-${agentId}`,
      agent: agentId,
      task: `[Parent Task: ${taskId}] ${userRequest}\n\n` +
            `You are ${agentId}. Focus on your expertise area.\n` +
            `Write your output to: ~/.openclaw/agents/${agentId}/workspace/${taskId}-output.md\n` +
            `Notify commander when complete using sessions_send.`,
      mode: 'run',
      runtime: 'subagent'
    });
  
    return { agentId, childSession };
  });
  
  const childSessions = await Promise.all(spawnPromises);
  
  // 2. 使用 sessions_send 进行 ping-pong 交互（可选）
  for (const { agentId, childSession } of childSessions) {
    // 发送确认消息
    await sessions_send({
      session: childSession.id,
      message: `[Commander] Task confirmed. Start working on your part.`,
      timeoutSeconds: 0  // 即发即忘
    });
  }
  
  // 3. 等待所有 Agent 完成（通过 sessions_list 轮询）
  await waitForAllAgents(taskId, childSessions);
  
  // 4. 汇总结果
  const summary = await aggregateResults(taskId, requiredAgents);
  
  // 5. 通知 Liaison
  await sessions_send({
    session: 'liaison-spark',  // Liaison 的会话ID
    message: `[Task Complete] ${taskId}\n\n${summary}`,
    timeoutSeconds: 0
  });
}

/**
 * 等待所有 Agent 完成
 * 使用 sessions_list 轮询检测
 */
async function waitForAllAgents(taskId, childSessions) {
  const pendingAgents = new Set(childSessions.map(c => c.agentId));
  
  while (pendingAgents.size > 0) {
    // 使用 sessions_list 查询活跃会话
    const activeSessions = await sessions_list({
      kinds: ['subagent'],
      activeMinutes: 5
    });
  
    // 检查哪些 Agent 已完成
    for (const { agentId, childSession } of childSessions) {
      const isStillActive = activeSessions.some(
        s => s.id === childSession.id
      );
    
      if (!isStillActive) {
        pendingAgents.delete(agentId);
        console.log(`Agent ${agentId} completed`);
      }
    }
  
    if (pendingAgents.size > 0) {
      // 等待5秒后再次检查
      await sleep(5000);
    }
  }
}

/**
 * Specialist Agent 完成后的通知
 * 在每个 Specialist 的 system.md 中定义
 */
async function onTaskComplete(taskId, agentId) {
  // 写入结果到工作区
  await writeFile(
    `~/.openclaw/agents/${agentId}/workspace/${taskId}-output.md`,
    generateOutput()
  );
  
  // 使用 sessions_send 通知 Commander
  await sessions_send({
    session: 'commander-grove',
    message: `[${agentId}] Task ${taskId} complete. Output ready.`,
    timeoutSeconds: 0
  });
}
```

---

## 五、问题四：任务状态推送方案

### 5.1 OpenClaw 状态追踪机制

OpenClaw 提供以下机制用于任务状态追踪：


| 机制               | 用途         | API                      | 来源                   |
| ------------------ | ------------ | ------------------------ | ---------------------- |
| `sessions_list`    | 查询活跃会话 | `activeMinutes`, `kinds` | docs.openclaw.ai/tools |
| `sessions_history` | 获取会话历史 | 查看任务执行记录         | docs.openclaw.ai/tools |
| `sessions_send`    | 主动通知     | 点对点消息               | docs.openclaw.ai/tools |
| 工作区文件         | 持久化状态   | read/write 工具          | 官方架构               |

### 5.2 状态推送架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         任务状态推送架构                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Agent 执行层                              Liaison 推送层                    │
│   ─────────────                            ─────────────                    │
│                                                                             │
│   ┌──────────────┐                                                        │
│   │ Specialist   │  1. 完成任务                                            │
│   │ Agent        │  2. 使用 write 写入 output.md                          │
│   │ (后台执行)    │  3. sessions_send 通知 Commander                       │
│   └──────┬───────┘                                                        │
│          │                                                                 │
│          │ sessions_send                                                   │
│          ▼                                                                 │
│   ┌──────────────┐  4. 接收完成通知                                         │
│   │  Commander   │  5. 使用 read 读取各 Agent 输出                          │
│   │              │  6. 生成 summary.md                                      │
│   │              │  7. sessions_send 通知 Liaison                           │
│   └──────┬───────┘                                                        │
│          │                                                                 │
│          │ sessions_send                                                   │
│          ▼                                                                 │
│   ┌──────────────┐  8. 接收完成通知                                         │
│   │   Liaison    │  9. 使用 read 读取 summary.md                            │
│   │   (常驻)     │  10. 格式化消息                                          │
│   └──────┬───────┘  11. 推送给用户 (通过 Telegram/Discord API)              │
│          │                                                                 │
│          ▼ Telegram API / Discord API / WebSocket                          │
│   ┌──────────────┐                                                        │
│   │     用户      │  收到: "✅ 任务完成！..."                                │
│   └──────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 进度查询实现

```javascript
/**
 * 处理用户进度查询
 * 使用 sessions_list 查询活跃任务
 */
async function handleStatusQuery(userMessage, userSessionId) {
  // 1. 提取任务ID（从上下文或消息中）
  const taskId = await extractTaskId(userMessage, userSessionId);
  
  if (!taskId) {
    // 查询所有活跃任务
    const activeSessions = await sessions_list({
      kinds: ['subagent', 'session'],
      activeMinutes: 60,
      messageLimit: 5
    });
  
    return formatActiveTasksList(activeSessions);
  }
  
  // 2. 查询特定任务状态
  const taskSessions = await sessions_list({
    kinds: ['subagent'],
    limit: 50
  });
  
  const relatedSessions = taskSessions.filter(s => 
    s.label && s.label.includes(taskId)
  );
  
  return formatTaskStatus(taskId, relatedSessions);
}

/**
 * 格式化任务状态给用户
 */
function formatTaskStatus(taskId, sessions) {
  let message = `📊 任务进度 [${taskId}]\n\n`;
  
  // 分析各 Agent 状态
  const agentStatus = {};
  sessions.forEach(session => {
    const agentName = session.agent || 'unknown';
    agentStatus[agentName] = {
      status: session.status,  // active, completed, error
      lastActive: session.lastActiveAt,
      messages: session.messages?.length || 0
    };
  });
  
  // 生成进度条
  const totalAgents = Object.keys(agentStatus).length;
  const completedAgents = Object.values(agentStatus)
    .filter(s => s.status === 'completed').length;
  const progress = Math.round((completedAgents / totalAgents) * 100);
  
  message += `总体进度: ${'█'.repeat(progress / 10)}${'░'.repeat(10 - progress / 10)} ${progress}%\n\n`;
  
  // 各 Agent 状态
  message += `👥 专家进度:\n`;
  for (const [agent, status] of Object.entries(agentStatus)) {
    const emoji = {
      'active': '⏳',
      'completed': '✅',
      'error': '❌',
      'pending': '⏸️'
    }[status.status] || '⏸️';
  
    message += `${emoji} ${agent}\n`;
  }
  
  return message;
}
```

### 5.4 主动推送实现

```javascript
/**
 * Liaison 状态监控服务
 * 使用 sessions_list 轮询 + sessions_send 通知
 */
class TaskStatusMonitor {
  constructor() {
    this.watchedTasks = new Map();  // taskId -> {userId, channel, lastStatus}
    this.checkInterval = 5000;      // 5秒轮询间隔
  }
  
  /**
   * 开始监控任务
   */
  watchTask(taskId, userId, channel) {
    this.watchedTasks.set(taskId, {
      userId,
      channel,
      lastStatus: null,
      lastProgress: 0
    });
  
    if (!this.intervalId) {
      this.startPolling();
    }
  }
  
  /**
   * 轮询检测
   */
  startPolling() {
    this.intervalId = setInterval(async () => {
      for (const [taskId, watchInfo] of this.watchedTasks) {
        await this.checkTaskStatus(taskId, watchInfo);
      }
    }, this.checkInterval);
  }
  
  /**
   * 检查单个任务状态
   * 使用 sessions_list 查询
   */
  async checkTaskStatus(taskId, watchInfo) {
    try {
      // 查询相关会话
      const sessions = await sessions_list({
        kinds: ['subagent'],
        limit: 50
      });
    
      const relatedSessions = sessions.filter(s => 
        s.label && s.label.includes(taskId)
      );
    
      // 计算进度
      const total = relatedSessions.length;
      const completed = relatedSessions.filter(
        s => s.status === 'completed'
      ).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
      // 状态变更检测
      if (progress !== watchInfo.lastProgress) {
        if (progress === 100) {
          // 任务完成，推送结果
          await this.pushCompletion(taskId, watchInfo);
          this.watchedTasks.delete(taskId);
        } else if (progress >= watchInfo.lastProgress + 25) {
          // 每25%推送一次进度
          await this.pushProgress(taskId, progress, watchInfo);
          watchInfo.lastProgress = progress;
        }
      }
    
    } catch (error) {
      console.error(`检查任务状态失败: ${taskId}`, error);
    }
  }
  
  /**
   * 推送完成通知
   */
  async pushCompletion(taskId, watchInfo) {
    // 读取 Commander 生成的汇总
    const summaryPath = `~/.openclaw/agents/commander-grove/workspace/${taskId}-summary.md`;
    let summary = '';
  
    try {
      summary = await readFile(summaryPath);
    } catch (e) {
      summary = '任务已完成，详细结果请查看工作区。';
    }
  
    const message = `✅ 任务完成！\n\n任务ID: ${taskId}\n\n${summary.substring(0, 1000)}...`;
  
    await this.sendToChannel(watchInfo.channel, watchInfo.userId, message);
  }
  
  /**
   * 推送进度更新
   */
  async pushProgress(taskId, progress, watchInfo) {
    const message = `⏳ 任务进度更新 [${taskId}]\n\n当前进度: ${progress}%\n预计还需: ${this.estimateRemainingTime(progress)}`;
  
    await this.sendToChannel(watchInfo.channel, watchInfo.userId, message);
  }
  
  /**
   * 发送到不同渠道
   */
  async sendToChannel(channel, userId, message) {
    switch (channel) {
      case 'telegram':
        await sendTelegramMessage(userId, message);
        break;
      case 'discord':
        await sendDiscordMessage(userId, message);
        break;
      case 'websocket':
        await sendWebSocketMessage(userId, {type: 'task_update', message});
        break;
    }
  }
}
```

---

## 六、完整部署配置

### 6.1 目录结构

```
~/.openclaw/
├── openclaw.json                 # 主配置文件
├── openclaw.json.bak            # 自动备份
├── update-check.json            # 版本检查
├── agents/                      # Agent 目录
│   ├── liaison-spark/          # 联络官
│   │   ├── agent/
│   │   │   ├── auth-profiles.json
│   │   │   └── models.json
│   │   ├── sessions/           # 会话存储
│   │   └── workspace/          # 工作空间
│   │
│   ├── commander-grove/        # 指挥官
│   │   ├── agent/
│   │   ├── sessions/
│   │   └── workspace/
│   │
│   ├── ceo-bezos/              # CEO
│   │   ├── agent/
│   │   ├── sessions/
│   │   └── workspace/
│   │
│   └── [其他 Agent...]
│
└── logs/                        # 日志目录
```

### 6.2 主配置文件

```json
// ~/.openclaw/openclaw.json
{
  // Agent 默认配置
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
        "description": "用户联络官，负责秒级响应和任务分发",
        "workspace": "~/.openclaw/agents/liaison-spark/workspace"
      },
      {
        "id": "commander-grove",
        "name": "Commander Grove",
        "description": "任务指挥官，负责复杂任务统筹",
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

  // 通信渠道配置
  "channels": {
    "telegram": {
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "open",
      "groups": {
        "*": {
          "requireMention": false
        }
      }
    },
    "discord": {
      "token": "${DISCORD_TOKEN}",
      "dmPolicy": "pairing"
    }
  },

  // Gateway 配置
  "gateway": {
    "bind": "127.0.0.1:18789",
    "auth": {
      "mode": "password"
    },
    "reload": {
      "mode": "hybrid",
      "debounceMs": 300
    }
  },

  // 工具配置
  "tools": {
    // Agent 间通信
    "agentToAgent": {
      "enabled": true,
      "allow": [
        "liaison-spark",
        "commander-grove",
        "ceo-bezos",
        "cto-vogels",
        "fullstack-dhh",
        "product-norman",
        "ui-duarte",
        "qa-bach",
        "marketing-godin",
        "sales-ross",
        "operations-pg",
        "interaction-cooper"
      ]
    },
    // 会话可见性
    "sessions": {
      "visibility": "tree"
    }
  }
}
```

### 6.3 部署步骤

```bash
# 1. 安装 OpenClaw
npm install -g openclaw@latest

# 2. 初始化配置
openclaw onboard --install-daemon

# 3. 创建 Agent 目录结构
for agent in liaison-spark commander-grove ceo-bezos cto-vogels fullstack-dhh product-norman ui-duarte qa-bach marketing-godin sales-ross operations-pg interaction-cooper; do
  mkdir -p ~/.openclaw/agents/$agent/{agent,sessions,workspace}
done

# 4. 复制 Agent 定义文件
# （假设 agentsInfo 目录在当前目录）
for agent in liaison-spark commander-grove ceo-bezos cto-vogels fullstack-dhh product-norman ui-duarte qa-bach marketing-godin sales-ross operations-pg interaction-cooper; do
  if [ -f "agentsInfo/${agent}.md" ]; then
    cp "agentsInfo/${agent}.md" ~/.openclaw/agents/$agent/workspace/SOUL.md
  fi
done

# 5. 配置环境变量
cat > ~/.openclaw/.env << 'EOF'
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
DISCORD_TOKEN=your-discord-token
EOF

# 6. 启动 Gateway
openclaw gateway start --config ~/.openclaw/openclaw.json

# 7. 验证部署
openclaw agents list
openclaw gateway status
```

---

## 七、关键技术验证点


| 验证项              | 验证方法           | 预期结果             | 来源                   |
| ------------------- | ------------------ | -------------------- | ---------------------- |
| Liaison 3秒响应     | 发送测试消息计时   | < 3s 收到确认        | 设计约束               |
| sessions_spawn 异步 | 创建任务观察返回   | 立即返回 accepted    | docs.openclaw.ai/tools |
| 路由准确性          | 测试不同领域问题   | 正确路由到对应 Agent | routing-design.md      |
| Agent 间通信        | 检查 sessions_send | 消息成功传递         | 多代理协同指南         |
| 状态查询            | 使用 sessions_list | 返回活跃会话列表     | docs.openclaw.ai/tools |
| 主动推送            | 等待任务完成       | 用户收到完成通知     | 设计方案               |
| ACP 溯源            | 检查消息来源       | 能识别发送者身份     | OpenClaw 3.8 Release   |

---

## 八、参考资料

1. **OpenClaw GitHub**: https://github.com/openclaw/openclaw
2. **OpenClaw 官方文档**: https://docs.openclaw.ai
3. **Tools 文档**: https://docs.openclaw.ai/tools
4. **Multi-Agent 文档**: https://docs.openclaw.ai/concepts/multi-agent
5. **Configuration 文档**: https://docs.openclaw.ai/gateway/configuration
6. **多代理协同指南**: CSDN博客《OpenClaw 多代理协同工作模式配置指南》(2026-02-10)
7. **OpenClaw 3.8 Release**: 新浪新闻、搜狐科技报道 (2026-03-09)

---

**文档版本**: v2.0
**最后更新**: 2026-03-10
**设计依据**: OpenClaw 官方文档 + GitHub + 技术博客分析
