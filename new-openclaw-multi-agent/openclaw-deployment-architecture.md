# OpenClaw 多 Agent 系统可落地部署方案

> **设计依据**：本方案基于 OpenClaw 官方技术文档（docs.openclaw.ai）和实际项目架构（AGENTS.md/CLAUDE.md）设计，所有技术点均有真实来源支撑。

## 一、方案概述

### 1.1 核心架构原则

根据 OpenClaw 官方设计，多 Agent 系统遵循以下原则：

| 原则 | 说明 | 来源 |
|-----|------|------|
| **Document-Driven** | Agent 通过文件系统通信，而非对话历史 | AGENTS.md L216-221 |
| **sessions_spawn** | 异步任务分发的核心机制 | OpenClaw Tools 文档 |
| **独立记忆 + 共享工作区** | 每个 Agent 独立 memory/，共享 docs/workspace/ | QUICK_START.md L73-86 |
| **Black Box 管理** | Commander 将 Specialist 视为黑盒，关注输入输出接口 | AGENTS.md L207-214 |

### 1.2 四个核心问题的技术映射

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OpenClaw 多 Agent 部署架构                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  问题1: 联络官秒级响应                问题2: 智能路由                         │
│  ├─ Liaison Agent 常驻实例             ├─ 关键词匹配 + 复杂度评估              │
│  ├─ 3秒内确认任务                      ├─ 单Agent/串行/并行 三种模式           │
│  └─ sessions_spawn 异步分发            └─ 由 Liaison 或 Commander 决策        │
│                                                                             │
│  问题3: Agent 主动交互                问题4: 状态主动推送                       │
│  ├─ 文件系统消息池 (docs/workspace/)   ├─ sessions_list 轮询任务状态           │
│  ├─ sessions_send 主动通知             ├─ 进度写入 status.md                  │
│  └─ 事件驱动架构                       └─ Liaison 读取并推送给用户             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、问题一：联络官秒级响应机制

### 2.1 设计约束（来自 liaison-spark.md）

根据联络官 Agent 定义，必须满足：

```yaml
核心约束:
  - 3秒内必须给出初步响应
  - 绝不执行耗时任务（不写代码、不做深度研究、不调用外部API）
  - 只做轻量级操作（问候、创建任务、查询进度、推送通知）
```

### 2.2 技术实现方案

#### 方案：Liaison 常驻 + 异步分发架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         用户请求处理流程                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   用户消息                                                                   │
│      │                                                                       │
│      ▼ < 3秒                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     Liaison Agent (常驻实例)                         │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │  │
│   │  │  消息分类器   │  │  任务创建器   │  │  状态查询器   │              │  │
│   │  │  (关键词匹配) │  │  (生成TaskID) │  │  (查status.md)│              │  │
│   │  └──────────────┘  └──────────────┘  └──────────────┘              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│      │                                                                       │
│      ├─ 问候/简单问题 ──→ 直接回复用户                                        │
│      │                                                                       │
│      ├─ 进度查询 ───────→ 读取 status.md ──→ 回复用户                         │
│      │                                                                       │
│      └─ 任务需求 ───────→ 创建任务 ──→ sessions_spawn ──→ 立即回复确认        │
│                              (异步分发，不等待)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 关键代码实现

```javascript
// liaison-spark 的核心处理逻辑
async function handleUserMessage(userMessage, userId) {
  const startTime = Date.now();
  
  // 1. 消息分类（< 100ms）
  const messageType = classifyMessage(userMessage);
  
  switch (messageType) {
    case 'GREETING':
      // 直接回复，不涉及任何耗时操作
      return { 
        response: "您好！我是您的智能助手 Spark 🚀\n\n我可以帮您协调专家团队处理复杂任务。请直接告诉我您的需求！",
        latency: Date.now() - startTime 
      };
      
    case 'STATUS_QUERY':
      // 读取本地状态文件（< 500ms）
      const taskId = extractTaskId(userMessage);
      const status = await readTaskStatus(taskId);
      return { 
        response: formatStatusMessage(status),
        latency: Date.now() - startTime 
      };
      
    case 'TASK_REQUEST':
      // 创建任务并异步分发（< 1s）
      const task = await createTask(userMessage, userId);
      
      // 关键：使用 sessions_spawn 异步启动，不等待完成
      sessions_spawn({
        label: `task-${task.id}`,
        agent: task.targetAgent,  // 由路由决策确定
        task: task.description,
        mode: 'async'             // 异步模式，立即返回
      });
      
      // 立即给用户确认，不等待任务完成
      return {
        response: formatTaskConfirmation(task),
        latency: Date.now() - startTime  // 保证 < 3s
      };
  }
}

// 消息分类器（轻量级关键词匹配）
function classifyMessage(message) {
  const lowerMsg = message.toLowerCase();
  
  // 问候语检测
  if (/^(你好|您好|hi|hello|hey)/i.test(lowerMsg)) {
    return 'GREETING';
  }
  
  // 进度查询检测
  if (/进度|状态|怎么样了|完成了吗|status/i.test(lowerMsg)) {
    return 'STATUS_QUERY';
  }
  
  // 默认为任务请求
  return 'TASK_REQUEST';
}
```

### 2.3 为什么这样设计？

| 设计决策 | 技术依据 | 来源 |
|---------|---------|------|
| Liaison 常驻实例 | 避免冷启动延迟，保证3秒内响应 | liaison-spark.md L18-30 |
| sessions_spawn 异步模式 | OpenClaw 原生支持 async 任务分发 | OpenClaw Tools 文档 |
| 本地状态文件 | 文件系统读取 < 10ms，满足时效要求 | AGENTS.md L216-221 |
| 不等待任务完成 | 耗时操作交给后台 Agent，Liaison 只负责确认 | liaison-spark.md L31-44 |

---

## 三、问题二：联络官路由方案

### 3.1 路由决策流程

根据 `routing-design.md` 和 `liaison-spark.md` 定义：

```
用户消息
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 1: 消息类型判断                                                          │
│ • 问候/简单问题 → 直接回复（不走路由）                                         │
│ • 进度查询 → 查状态后回复                                                      │
│ • 任务需求 → 进入路由决策                                                      │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Step 2: 关键词匹配（快速路由表）                                               │
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
│  简单任务: 直接分发给对应 Specialist Agent                                    │
│  中等任务: 分发给 Commander，由 Commander 串行调度多个 Agent                    │
│  复杂任务: 分发给 Commander，由 Commander 并行调度多个 Agent 并统筹整合          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 路由实现代码

```javascript
// 路由配置表（来自 routing-design.md L47-62）
const AGENT_ROUTING_TABLE = {
  'ceo-bezos': {
    patterns: [/战略|商业|市场|竞品|商业模式|定价|优先级/i],
    description: 'CEO - 战略决策、商业模式设计'
  },
  'cto-vogels': {
    patterns: [/架构|技术选型|系统设计|性能|可靠性|扩展/i],
    description: 'CTO - 技术架构、系统选型'
  },
  'fullstack-dhh': {
    patterns: [/代码|开发|编程|bug|功能实现|重构|优化/i],
    description: 'FullStack - 代码实现、开发'
  },
  'product-norman': {
    patterns: [/产品|需求|功能|用户故事|PRD|用例/i],
    description: 'Product - 产品定义、需求分析'
  },
  'ui-duarte': {
    patterns: [/UI|界面|视觉|设计稿|原型|配色|排版/i],
    description: 'UI - 界面设计、视觉规范'
  },
  'qa-bach': {
    patterns: [/测试|质量|验收|自动化测试|bug排查/i],
    description: 'QA - 测试策略、质量把控'
  },
  'marketing-godin': {
    patterns: [/营销|推广|运营|增长|SEO|内容|品牌/i],
    description: 'Marketing - 营销策略、增长'
  },
  'sales-ross': {
    patterns: [/销售|客户|渠道|成交|CRM|获客|转化/i],
    description: 'Sales - 销售策略、获客'
  },
  'operations-pg': {
    patterns: [/运营|流程|效率|管理|SOP|冷启动/i],
    description: 'Operations - 运营策略、流程'
  },
  'interaction-cooper': {
    patterns: [/交互|体验|用户研究|可用性|用户流程/i],
    description: 'Interaction - 交互设计'
  },
  'commander-grove': {
    patterns: [/系统|平台|完整|全流程|端到端|从0到1/i],
    description: 'Commander - 复杂任务统筹'
  }
};

// 路由决策函数
function routeTask(userMessage) {
  // 1. 关键词匹配
  let targetAgent = 'commander-grove';  // 默认
  let matchScore = 0;
  
  for (const [agentId, config] of Object.entries(AGENT_ROUTING_TABLE)) {
    for (const pattern of config.patterns) {
      if (pattern.test(userMessage)) {
        // 取第一个匹配的 Agent
        if (matchScore === 0) {
          targetAgent = agentId;
          matchScore++;
        }
      }
    }
  }
  
  // 2. 复杂度评估
  const complexity = assessComplexity(userMessage);
  
  // 3. 根据复杂度调整目标 Agent
  if (complexity === 'complex') {
    // 复杂任务统一走 Commander
    targetAgent = 'commander-grove';
  }
  
  return {
    targetAgent,
    complexity,
    taskId: generateTaskId(userMessage)
  };
}

// 复杂度评估（来自 routing-design.md L145-173）
function assessComplexity(message) {
  let score = 0;
  
  const indicators = {
    high: ['完整', '系统', '平台', '全流程', '端到端', '从0到1', '整体'],
    medium: ['APP', '网站', '产品', '模块', '功能'],
    low: ['代码', '页面', '接口', 'bug', '样式', '文案']
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
  
  if (score >= 5) return 'complex';
  if (score >= 3) return 'medium';
  return 'simple';
}

// 任务分发（使用 OpenClaw sessions_spawn）
async function dispatchTask(routingResult, userMessage) {
  const { targetAgent, complexity, taskId } = routingResult;
  
  // 创建任务目录结构
  const taskDir = `~/.openclaw/workspaces/commander-grove/docs/workspace/tasks/${taskId}`;
  await createTaskDirectory(taskDir, {
    brief: userMessage,
    complexity,
    targetAgent,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  
  // 使用 sessions_spawn 异步分发任务
  // 这是 OpenClaw 原生支持的跨会话协作机制
  await sessions_spawn({
    label: `task-${taskId}`,
    agent: targetAgent,
    task: `处理任务 ${taskId}: ${userMessage}\n\n任务详情见: ${taskDir}/brief.md`,
    mode: 'async'  // 异步模式，不阻塞
  });
  
  return {
    taskId,
    targetAgent,
    complexity,
    estimatedTime: getEstimatedTime(complexity)
  };
}
```

### 3.3 上下文感知：跟进问题处理

```javascript
// 跟进问题识别（来自 routing-design.md L246-262）
function isFollowUp(userMessage, sessionHistory) {
  const followUpWords = ['呢', '吗', '怎么样', '如何', '那', '还有', '另外', '刚才'];
  
  // 短句 + 包含跟进词 = 跟进问题
  if (userMessage.length < 20) {
    return followUpWords.some(word => userMessage.includes(word));
  }
  
  // 检查是否引用之前的任务
  if (/刚才|之前|那个|这个任务/i.test(userMessage)) {
    return true;
  }
  
  return false;
}

// 处理跟进问题：保持同一 Agent
async function handleFollowUp(userMessage, sessionId) {
  const lastTask = await getLastTask(sessionId);
  
  if (lastTask) {
    // 使用相同的 Agent 处理跟进问题
    await sessions_send({
      session: lastTask.agentSessionId,
      message: `跟进问题: ${userMessage}\n\n关联任务: ${lastTask.taskId}`
    });
    
    return {
      taskId: lastTask.taskId,
      agent: lastTask.targetAgent,
      isFollowUp: true
    };
  }
}
```

---

## 四、问题三：Agent 主动交互机制

### 4.1 OpenClaw 原生交互机制

根据 OpenClaw 官方文档，Agent 间协作通过以下工具实现：

| 工具 | 用途 | 使用场景 |
|-----|------|---------|
| `sessions_spawn` | 创建新会话/任务 | Liaison 分发任务给 Specialist |
| `sessions_list` | 列出所有会话 | 查询活跃任务状态 |
| `sessions_send` | 向会话发送消息 | Agent 间主动通知 |
| `sessions_history` | 获取会话历史 | 读取任务执行记录 |
| `session_status` | 查询会话状态 | 检查任务是否完成 |

### 4.2 文件系统消息池架构

根据 AGENTS.md 和 QUICK_START.md，OpenClaw 多 Agent 系统采用**独立记忆 + 共享工作区**架构：

```
~/.openclaw/workspaces/
│
├── liaison-spark/
│   ├── memory/                    # 独立记忆（仅 Liaison 可写）
│   │   └── 2026-03-08.md         # 会话历史、用户偏好
│   └── docs/workspace/           # 符号链接 → commander-grove/docs/workspace/
│
├── commander-grove/
│   ├── memory/                    # 独立记忆（任务协调记录）
│   │   └── 2026-03-08.md
│   └── docs/workspace/           # 实际存储位置（消息池）
│       ├── tasks/                # 任务目录
│       │   └── TASK-001/
│       │       ├── brief.md      # 任务简报
│       │       ├── status.md     # 状态文件（实时更新）
│       │       ├── ceo-output.md # CEO 输出
│       │       ├── cto-output.md # CTO 输出
│       │       └── summary.md    # Commander 汇总
│       └── knowledge/            # 共享知识库
│
├── ceo-bezos/
│   ├── memory/                    # 独立记忆（战略分析记录）
│   └── docs/workspace/           # 符号链接 → commander-grove/docs/workspace/
│
├── cto-vogels/
│   ├── memory/                    # 独立记忆（架构设计记录）
│   └── docs/workspace/           # 符号链接 → commander-grove/docs/workspace/
│
└── [其他 Agent 同理]
```

### 4.3 Agent 主动交互流程

#### 场景：复杂任务（并行多 Agent）

```
用户: "开发完整电商平台"

Step 1: Liaison 创建任务
─────────────────────────
Liaison → 创建 TASK-ECOM-001/brief.md
        → sessions_spawn({agent: 'commander-grove', task: '...', mode: 'async'})
        → 立即回复用户: "任务已创建，预计10-15分钟"

Step 2: Commander 并行分发
─────────────────────────
Commander 读取 brief.md
        → 判断需要并行: CEO + CTO + Product + UI
        → sessions_spawn({agent: 'ceo-bezos', mode: 'async'})
        → sessions_spawn({agent: 'cto-vogels', mode: 'async'})
        → sessions_spawn({agent: 'product-norman', mode: 'async'})
        → sessions_spawn({agent: 'ui-duarte', mode: 'async'})
        → 写入 status.md: {phase: 'parallel_execution', agents: ['ceo', 'cto', 'product', 'ui']}

Step 3: Specialist Agent 执行并写入结果
─────────────────────────
CEO → 分析商业模式
   → 写入 TASK-ECOM-001/ceo-output.md
   → 更新 status.md: {ceo: 'completed'}

CTO → 设计技术架构
   → 写入 TASK-ECOM-001/cto-output.md
   → 更新 status.md: {cto: 'completed'}

Product → 定义产品需求
       → 写入 TASK-ECOM-001/product-output.md
       → 更新 status.md: {product: 'completed'}

UI → 设计界面方案
  → 写入 TASK-ECOM-001/ui-output.md
  → 更新 status.md: {ui: 'completed'}

Step 4: Commander 监控进度并汇总
─────────────────────────
Commander 轮询 sessions_list 或读取 status.md
        → 检测所有 Agent 完成
        → 读取所有 output.md
        → 生成 summary.md
        → 更新 status.md: {phase: 'completed', summary: '...'}

Step 5: Liaison 推送结果给用户
─────────────────────────
Liaison 轮询检测到 status.md 状态变更
      → 读取 summary.md
      → 格式化消息
      → 推送给用户: "✅ 任务完成！电商平台设计方案..."
```

### 4.4 代码实现

```javascript
// Commander 的并行任务协调逻辑
async function coordinateParallelTask(taskId, requiredAgents) {
  const taskDir = `~/.openclaw/workspaces/commander-grove/docs/workspace/tasks/${taskId}`;
  
  // 1. 初始化状态文件
  const status = {
    taskId,
    phase: 'parallel_execution',
    startedAt: new Date().toISOString(),
    agents: {}
  };
  
  for (const agent of requiredAgents) {
    status.agents[agent] = 'pending';
  }
  
  await writeStatusFile(taskDir, status);
  
  // 2. 并行启动所有 Agent
  const spawnPromises = requiredAgents.map(agent => 
    sessions_spawn({
      label: `${taskId}-${agent}`,
      agent: agent,
      task: `执行任务 ${taskId}，详情见 ${taskDir}/brief.md。完成后写入 ${taskDir}/${agent}-output.md`,
      mode: 'async'
    })
  );
  
  await Promise.all(spawnPromises);
  
  // 3. 启动进度监控（轮询）
  startProgressMonitoring(taskId, requiredAgents);
}

// 进度监控（轮询模式）
async function startProgressMonitoring(taskId, requiredAgents) {
  const taskDir = `~/.openclaw/workspaces/commander-grove/docs/workspace/tasks/${taskId}`;
  const checkInterval = 5000; // 5秒检查一次
  
  const intervalId = setInterval(async () => {
    const status = await readStatusFile(taskDir);
    
    // 检查所有 Agent 是否完成
    const allCompleted = requiredAgents.every(
      agent => status.agents[agent] === 'completed'
    );
    
    if (allCompleted) {
      clearInterval(intervalId);
      
      // 汇总结果
      await aggregateResults(taskId, requiredAgents);
      
      // 通知 Liaison（通过状态文件）
      await updateStatusFile(taskDir, {
        ...status,
        phase: 'completed',
        completedAt: new Date().toISOString()
      });
    }
  }, checkInterval);
}

// 串行任务协调（有依赖关系）
async function coordinateSequentialTask(taskId, stages) {
  const taskDir = `~/.openclaw/workspaces/commander-grove/docs/workspace/tasks/${taskId}`;
  
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    
    // 更新状态
    await updateStatusFile(taskDir, {
      currentStage: i + 1,
      totalStages: stages.length,
      currentAgent: stage.agent,
      status: 'in_progress'
    });
    
    // 启动当前阶段 Agent（同步等待）
    await sessions_spawn({
      label: `${taskId}-stage-${i + 1}`,
      agent: stage.agent,
      task: `执行阶段 ${i + 1}/${stages.length}: ${stage.task}\n前置输出: ${taskDir}/${stages[i-1]?.agent}-output.md`,
      mode: 'sync'  // 同步等待完成
    });
    
    // 标记完成
    await updateStatusFile(taskDir, {
      stages: { [stage.agent]: 'completed' }
    });
  }
  
  // 所有阶段完成
  await aggregateResults(taskId, stages.map(s => s.agent));
}
```

---

## 五、问题四：任务状态主动推送方案

### 5.1 推送机制设计

由于 OpenClaw 的 `sessions_spawn` 是异步的，需要一种机制让 Liaison 感知任务完成并推送给用户。

#### 方案：文件系统事件 + 轮询混合模式

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         状态推送架构                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Agent 执行层                              Liaison 推送层                    │
│   ─────────────                            ─────────────                    │
│                                                                             │
│   ┌──────────────┐                                                        │
│   │ Specialist   │  1. 完成任务                                            │
│   │ Agent        │  2. 写入 output.md                                      │
│   │ (后台执行)    │  3. 更新 status.md                                     │
│   └──────┬───────┘     {status: 'completed'}                               │
│          │                                                                 │
│          │ 文件系统写入                                                      │
│          ▼                                                                 │
│   ┌──────────────┐                                                        │
│   │  消息池       │  docs/workspace/tasks/TASK-001/status.md               │
│   │ (共享目录)    │                                                        │
│   └──────┬───────┘                                                        │
│          │                                                                 │
│          │ 轮询检测 (每 3-5 秒)                                             │
│          ▼                                                                 │
│   ┌──────────────┐  4. 读取 status.md                                     │
│   │   Liaison    │  5. 检测到 completed                                    │
│   │   (常驻)     │  6. 读取 output.md                                      │
│   │              │  7. 格式化消息                                          │
│   └──────┬───────┘  8. 推送给用户                                          │
│          │                                                                 │
│          ▼ WebSocket / Telegram API / Discord API                          │
│   ┌──────────────┐                                                        │
│   │     用户      │  收到: "✅ 任务完成！CTO 已完成架构设计..."              │
│   └──────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 状态文件结构设计

```yaml
# status.md 结构（JSON Frontmatter + Markdown）
---
taskId: TASK-20240310-ECOM-ARCH-001
status: in_progress  # pending | in_progress | completed | failed
phase: parallel_execution  # single | sequential | parallel_execution
progress: 75  # 百分比
startedAt: "2024-03-10T08:00:00Z"
estimatedCompletion: "2024-03-10T08:15:00Z"
agents:
  ceo-bezos:
    status: completed
    completedAt: "2024-03-10T08:05:00Z"
    outputFile: "ceo-output.md"
  cto-vogels:
    status: in_progress
    startedAt: "2024-03-10T08:00:00Z"
  product-norman:
    status: pending
  ui-duarte:
    status: pending
lastUpdated: "2024-03-10T08:10:00Z"
---

# 状态说明
- pending: 等待执行
- in_progress: 执行中
- completed: 已完成
- failed: 执行失败
```

### 5.3 推送实现代码

```javascript
// Liaison 的状态监控服务
class TaskStatusMonitor {
  constructor() {
    this.watchedTasks = new Map();  // taskId -> {userId, channel, lastStatus}
    this.checkInterval = 3000;      // 3秒轮询间隔
  }
  
  // 开始监控任务
  watchTask(taskId, userId, channel) {
    this.watchedTasks.set(taskId, {
      userId,
      channel,
      lastStatus: null,
      lastProgress: 0
    });
    
    // 启动轮询（如果未启动）
    if (!this.intervalId) {
      this.startPolling();
    }
  }
  
  // 轮询检测
  startPolling() {
    this.intervalId = setInterval(async () => {
      for (const [taskId, watchInfo] of this.watchedTasks) {
        await this.checkTaskStatus(taskId, watchInfo);
      }
    }, this.checkInterval);
  }
  
  // 检查单个任务状态
  async checkTaskStatus(taskId, watchInfo) {
    const statusFile = `~/.openclaw/workspaces/commander-grove/docs/workspace/tasks/${taskId}/status.md`;
    
    try {
      const status = await readStatusFile(statusFile);
      
      // 状态变更检测
      if (status.status !== watchInfo.lastStatus) {
        await this.handleStatusChange(taskId, status, watchInfo);
        watchInfo.lastStatus = status.status;
      }
      
      // 进度更新检测（每 25% 推送一次）
      const progress = this.calculateProgress(status);
      if (progress >= watchInfo.lastProgress + 25) {
        await this.sendProgressUpdate(taskId, progress, watchInfo);
        watchInfo.lastProgress = progress;
      }
      
      // 任务完成，停止监控
      if (status.status === 'completed' || status.status === 'failed') {
        this.watchedTasks.delete(taskId);
      }
      
    } catch (error) {
      console.error(`读取任务状态失败: ${taskId}`, error);
    }
  }
  
  // 处理状态变更
  async handleStatusChange(taskId, status, watchInfo) {
    switch (status.status) {
      case 'in_progress':
        await this.sendMessage(watchInfo, {
          type: 'task_started',
          message: `🚀 任务开始执行\n\n任务ID: ${taskId}\n当前阶段: ${status.phase}`
        });
        break;
        
      case 'completed':
        // 读取汇总结果
        const summary = await this.readTaskSummary(taskId);
        await this.sendMessage(watchInfo, {
          type: 'task_completed',
          message: this.formatCompletionMessage(taskId, status, summary)
        });
        break;
        
      case 'failed':
        await this.sendMessage(watchInfo, {
          type: 'task_failed',
          message: `❌ 任务执行失败\n\n任务ID: ${taskId}\n请稍后重试或联系支持`
        });
        break;
    }
  }
  
  // 计算进度百分比
  calculateProgress(status) {
    if (status.status === 'completed') return 100;
    if (status.status === 'pending') return 0;
    
    const agents = Object.values(status.agents || {});
    if (agents.length === 0) return 0;
    
    const completed = agents.filter(a => a.status === 'completed').length;
    return Math.round((completed / agents.length) * 100);
  }
  
  // 格式化完成消息
  formatCompletionMessage(taskId, status, summary) {
    let message = `✅ 任务完成！\n\n`;
    message += `任务ID: ${taskId}\n`;
    message += `耗时: ${this.formatDuration(status.startedAt, status.completedAt)}\n\n`;
    
    // 各 Agent 完成情况
    message += `📊 执行概况:\n`;
    for (const [agentId, agentStatus] of Object.entries(status.agents)) {
      const icon = agentStatus.status === 'completed' ? '✅' : '❌';
      message += `${icon} ${agentId}\n`;
    }
    
    // 汇总结果摘要
    if (summary) {
      message += `\n📋 结果摘要:\n${summary.substring(0, 500)}...`;
    }
    
    return message;
  }
  
  // 发送消息到不同渠道
  async sendMessage(watchInfo, message) {
    switch (watchInfo.channel) {
      case 'telegram':
        await sendTelegramMessage(watchInfo.userId, message.message);
        break;
      case 'discord':
        await sendDiscordMessage(watchInfo.userId, message.message);
        break;
      case 'websocket':
        await sendWebSocketMessage(watchInfo.userId, message);
        break;
    }
  }
}

// 使用示例
const monitor = new TaskStatusMonitor();

// 当 Liaison 创建任务后，开始监控
async function onTaskCreated(taskId, userId, channel) {
  monitor.watchTask(taskId, userId, channel);
}
```

### 5.4 进度查询接口

用户主动查询进度时，Liaison 直接读取状态文件：

```javascript
// 处理用户进度查询
async function handleStatusQuery(userMessage, sessionId) {
  // 提取任务ID（从上下文或消息中）
  const taskId = await extractTaskId(userMessage, sessionId);
  
  if (!taskId) {
    return "请提供任务ID，或告诉我您想查询哪个任务的进度";
  }
  
  const statusFile = `~/.openclaw/workspaces/commander-grove/docs/workspace/tasks/${taskId}/status.md`;
  
  try {
    const status = await readStatusFile(statusFile);
    return formatStatusForUser(status);
  } catch (error) {
    return `未找到任务 ${taskId}，请确认任务ID是否正确`;
  }
}

// 格式化状态给用户
function formatStatusForUser(status) {
  let message = `📊 任务进度 [${status.taskId}]\n\n`;
  
  // 总体进度条
  const progress = calculateProgress(status);
  message += `总体进度: ${'█'.repeat(progress / 10)}${'░'.repeat(10 - progress / 10)} ${progress}%\n\n`;
  
  // 各 Agent 状态
  message += `👥 专家进度:\n`;
  for (const [agentId, agentStatus] of Object.entries(status.agents)) {
    const emoji = {
      'completed': '✅',
      'in_progress': '⏳',
      'pending': '⏸️',
      'failed': '❌'
    }[agentStatus.status] || '⏸️';
    
    message += `${emoji} ${agentId}: ${translateStatus(agentStatus.status)}\n`;
  }
  
  // 预计完成时间
  if (status.estimatedCompletion && status.status !== 'completed') {
    const remaining = new Date(status.estimatedCompletion) - new Date();
    message += `\n⏱️ 预计剩余: ${formatDuration(remaining)}`;
  }
  
  return message;
}
```

---

## 六、部署架构图

### 6.1 完整部署架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户接入层                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web UI    │  │  Telegram   │  │   Discord   │  │   Slack     │        │
│  │  (React)    │  │    Bot      │  │    Bot      │  │   Bot       │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                   │
                                   ▼ WebSocket / HTTP
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OpenClaw Gateway                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Bind: 127.0.0.1:18789                                              │   │
│  │  Auth: Password / Token                                             │   │
│  │                                                                     │   │
│  │  核心功能:                                                           │   │
│  │  • 会话管理 (sessions_list, sessions_spawn, sessions_send)          │   │
│  │  • Agent 生命周期管理                                                │   │
│  │  • 工具调用路由                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ 本地进程 / Docker
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Agent 执行层                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Liaison Agent (常驻)                             │   │
│  │  • system.md: liaison-spark.md                                      │   │
│  │  • 职责: 用户交互、任务路由、状态推送                                  │   │
│  │  • 状态: 7x24 运行，内存 < 512MB                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ sessions_spawn (async)                 │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   Commander Agent (按需启动)                          │   │
│  │  • system.md: commander-grove.md                                    │   │
│  │  • 职责: 复杂任务统筹、多 Agent 协调                                  │   │
│  │  • 触发: 复杂任务路由时启动                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                        │
│                    │               │               │                        │
│                    ▼               ▼               ▼                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ CEO-Bezos   │ │ CTO-Vogels  │ │ Product-    │ │ FullStack-  │           │
│  │ (战略)       │ │ (架构)       │ │  Norman     │ │    DHH      │           │
│  │ 按需启动     │ │ 按需启动     │ │  按需启动    │ │  按需启动    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ 文件系统
┌─────────────────────────────────────────────────────────────────────────────┐
│                            存储层                                            │
│  ~/.openclaw/workspaces/                                                     │
│  ├── liaison-spark/          # Liaison 工作区（常驻）                        │
│  │   ├── memory/             # 独立记忆                                     │
│  │   └── docs/workspace/     # 符号链接 → commander-grove/docs/workspace/   │
│  │                                                                             │
│  ├── commander-grove/        # Commander 工作区（消息池实际存储）             │
│  │   ├── memory/                                                             │
│  │   └── docs/workspace/                                                     │
│  │       ├── tasks/           # 任务目录                                     │
│  │       │   └── TASK-*/      # 每个任务独立目录                             │
│  │       │       ├── brief.md         # 任务简报                             │
│  │       │       ├── status.md        # 实时状态（核心）                     │
│  │       │       ├── *-output.md      # 各 Agent 输出                        │
│  │       │       └── summary.md       # 汇总结果                             │
│  │       └── knowledge/       # 共享知识库                                   │
│  │                                                                             │
│  └── [其他 Agent]/           # 各自独立 memory/，共享 workspace/              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 配置文件

```json
// ~/.openclaw/openclaw.json
{
  "agent": {
    "model": "anthropic/claude-sonnet-4",
    "defaults": {
      "workspace": "~/.openclaw/workspaces/liaison-spark",
      "sandbox": {
        "mode": "non-main",
        "allowlist": [
          "bash",
          "process",
          "read",
          "write",
          "edit",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn"
        ]
      }
    }
  },
  "channels": {
    "telegram": {
      "botToken": "${TELEGRAM_BOT_TOKEN}",
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
  "gateway": {
    "bind": "127.0.0.1:18789",
    "auth": {
      "mode": "password"
    }
  }
}
```

---

## 七、部署步骤

### 7.1 环境准备

```bash
# 1. 安装 Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装 OpenClaw CLI
curl -fsSL https://openclaw.ai/install.sh | bash
export PATH="$HOME/.local/bin:$PATH"

# 3. 验证安装
openclaw --version  # 应显示版本号
```

### 7.2 初始化多 Agent 工作区

```bash
# 1. 创建工作区目录结构
OPENCLAW_ROOT="$HOME/.openclaw"
WORKSPACES_DIR="$OPENCLAW_ROOT/workspaces"

mkdir -p "$WORKSPACES_DIR"

# 2. 部署 Agent 定义文件
AGENTS=(
  "liaison-spark"
  "commander-grove"
  "ceo-bezos"
  "cto-vogels"
  "fullstack-dhh"
  "product-norman"
  "qa-bach"
  "ui-duarte"
  "interaction-cooper"
  "marketing-godin"
  "sales-ross"
  "operations-pg"
)

for agent in "${AGENTS[@]}"; do
  mkdir -p "$WORKSPACES_DIR/$agent/workspace"
  mkdir -p "$WORKSPACES_DIR/$agent/memory"
  
  # 复制 system.md（Agent 定义）
  cp "agentsInfo/${agent}.md" "$WORKSPACES_DIR/$agent/system.md"
done

# 3. 创建共享工作区（消息池）
mkdir -p "$WORKSPACES_DIR/commander-grove/docs/workspace/tasks"
mkdir -p "$WORKSPACES_DIR/commander-grove/docs/workspace/knowledge"

# 4. 创建符号链接（让所有 Agent 共享 workspace）
for agent in "${AGENTS[@]}"; do
  if [ "$agent" != "commander-grove" ]; then
    ln -sf "$WORKSPACES_DIR/commander-grove/docs/workspace" \
          "$WORKSPACES_DIR/$agent/docs/workspace"
  fi
done
```

### 7.3 启动 Gateway

```bash
# 1. 配置环境变量
export TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
export DISCORD_TOKEN="your-discord-token"

# 2. 启动 OpenClaw Gateway
openclaw gateway start --config ~/.openclaw/openclaw.json

# 3. 验证 Gateway 状态
curl http://localhost:18789/health
```

### 7.4 启动 Liaison 服务

```bash
# Liaison 作为常驻服务运行
openclaw run liaison-spark --persistent

# 或使用 systemd 管理（生产环境）
sudo systemctl enable openclaw-liaison
sudo systemctl start openclaw-liaison
```

---

## 八、关键技术验证点

| 验证项 | 验证方法 | 预期结果 |
|-------|---------|---------|
| Liaison 3秒响应 | 发送测试消息，计时 | < 3s 收到确认 |
| 路由准确性 | 测试不同领域问题 | 正确路由到对应 Agent |
| 异步任务分发 | 创建任务，观察进程 | sessions_spawn 立即返回 |
| 状态文件更新 | 检查 status.md | Agent 完成后状态自动更新 |
| 主动推送 | 等待任务完成 | 用户自动收到完成通知 |
| 文件系统隔离 | 检查 memory/ 目录 | 各 Agent memory 独立 |
| 工作区共享 | 检查 docs/workspace/ | 所有 Agent 指向同一目录 |

---

## 九、参考资料

1. **OpenClaw 官方文档**: https://docs.openclaw.ai/tools
2. **sessions_spawn 文档**: OpenClaw Tools 页面
3. **AGENTS.md**: 本项目 Agent 架构定义
4. **liaison-spark.md**: 联络官 Agent 详细定义
5. **routing-design.md**: 路由方案设计文档
6. **QUICK_START.md**: 快速启动指南

---

**文档版本**: v1.0  
**最后更新**: 2026-03-10  
**设计依据**: OpenClaw 官方文档 + 项目实际架构
