# OpenClaw 多 Agent 正确的记忆架构设计方案

**设计时间**：2026-03-08
**基于研究**：MetaGPT、AutoGen、OpenClaw 官方架构

---

## ❌ 之前设计的错误

### 问题1：共享记忆导致污染
```bash
# ❌ 错误设计
所有Agent → 同一个memory/2026-03-08.md

# 结果
- CEO看到QA的测试细节（无关）
- CTO看到Marketing的文案（无关）
- 记忆混乱，职责不清
- 违背多Agent的核心价值
```

### 问题2：违背专业化原则
```
多Agent的价值：
✅ 专业化分工
✅ 记忆隔离
✅ 各司其职
✅ 视角独立

共享记忆破坏了这些优势！
```

---

## ✅ 正确的架构：消息池 + 独立记忆

### 核心设计原则

基于 [MetaGPT Global Message Pool](https://github.com/FoundationAgents/MetaGPT) 和 [AutoGen State Management](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/state.html)：

#### 原则1：记忆隔离
```
✅ 每个Agent维护自己的专业记忆
- CEO记忆：战略决策、市场分析
- CTO记忆：技术架构、设计决策
- QA记忆：测试策略、质量问题
- Commander记忆：全局协调、任务状态
```

#### 原则2：消息池通信
```
✅ 通过共享文档传递信息
- docs/workspace/tasks/ 作为消息池
- 存储任务简报、中间产物、最终交付
- 所有Agent可读，但写入需要权限
```

#### 原则3：订阅/查询模式
```
✅ Agent按需查询，而非全量共享
- CEO查询：产品需求、市场分析
- CTO查询：技术需求、架构约束
- QA查询：测试需求、质量标准
```

---

## 🎯 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                   飞书用户                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              指挥官 (Commander)                      │
│  记忆：全局协调、任务状态、决策记录                  │
│  workspace: ~/.openclaw/workspaces/commander-grove/  │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌────────────────┐
│  消息池        │         │  独立记忆区     │
│  (共享文档)    │         │  (各自隔离)     │
│               │         │                │
│ tasks/        │         │ ceo/memory/    │
│ ├─ brief.md   │         │ cto/memory/    │
│ ├─ strategy.md│         │ qa/memory/     │
│ └─ design.md  │         │ └─各自专业记忆  │
│               │         │                │
│ knowledge/    │         │                │
│ └─ api-doc.md │         │                │
└───────────────┘         └────────────────┘
     ↑ 读取 ↑ 写入              ↑ 各自维护
     │                       │
┌────┴────┐            ┌─────┴────────┐
│ CEO     │            │ CTO          │
│ 订阅：   │            │ 订阅：         │
│ - 产品   │            │ - 技术需求     │
│ - 市场   │            │ - 架构设计     │
└─────────┘            └──────────────┘
```

### 目录结构

```bash
~/.openclaw/workspaces/
├── commander-grove/
│   ├── memory/                      # 指挥官的记忆
│   │   └── 2026-03-08.md             # 协调记录、任务状态
│   └── docs/workspace/              # 消息池（共享）
│       ├── tasks/
│       │   └── TASK-001-auth/
│       │       ├── brief.md         # 任务简报（所有人可见）
│       │       ├── ceo-strategy.md  # CEO输出（其他人只读）
│       │       ├── cto-design.md    # CTO输出（其他人只读）
│       │       └── dev-impl.md      # 实现方案（其他人只读）
│       └── knowledge/
│           └── lsup-api.md          # 知识库（只读）
│
├── ceo-bezos/
│   ├── memory/                      # CEO的记忆（独立）
│   │   └── 2026-03-08.md             # 战略评估、商业分析
│   └── docs/workspace/              # 符号链接到消息池
│
├── cto-vogels/
│   ├── memory/                      # CTO的记忆（独立）
│   │   └── 2026-03-08.md             # 技术架构、设计决策
│   └── docs/workspace/              # 符号链接到消息池
│
└── qa-bach/
    ├── memory/                      # QA的记忆（独立）
    │   └── 2026-03-08.md             # 测试策略、质量记录
    └── docs/workspace/              # 符号链接到消息池
```

---

## 🔄 工作流程

### 场景：开发用户认证系统

#### 第1步：用户发起需求
```
用户（飞书）：帮我开发一个用户认证系统
```

#### 第2步：指挥官接收并创建任务
```bash
# 指挥官在自己的memory中记录
## 2026-03-08 工作日志

### 接收任务
- 用户需求：开发用户认证系统
- 任务类型：开发类
- 复杂度：中等

# 指挥官在消息池创建任务
docs/workspace/tasks/TASK-001-auth/brief.md:
## 任务简报
- 需求：用户认证系统
- 功能：邮箱登录 + 第三方登录
- 时间线：2026-03-08
```

#### 第3步：指挥官通知CEO（通过文档）
```bash
# 指挥官在 brief.md 中添加
## 执行计划
1. @CEO：请评估商业价值和优先级
2. @CTO：请设计技术架构
3. @FullStack：请实现功能
```

#### 第4步：CEO响应（通过独立记忆）
```bash
# CEO读取 brief.md（从消息池）
# CEO在自己的memory中记录
## 2026-03-08 CEO工作日志

### 任务分析
- 读取：TASK-001-auth/brief.md
- 分析：核心功能，高优先级
- 决策：建议推进

# CEO输出到消息池
docs/workspace/tasks/TASK-001-auth/ceo-strategy.md:
## CEO战略评估
- 优先级：高
- 商业价值：核心功能
- 建议：快速迭代MVP
```

#### 第5步：指挥官通知CTO
```bash
# 指挥官读取 ceo-strategy.md（从消息池）
# 指挥官在 brief.md 中更新
## 执行计划
1. ✅ @CEO：战略评估完成（高优先级）
2. @CTO：请基于CEO评估设计架构
   - 参考：ceo-strategy.md
3. @FullStack：待CTO设计完成后实现
```

#### 第6步：CTO响应（通过独立记忆）
```bash
# CTO读取 brief.md 和 ceo-strategy.md（从消息池）
# CTO在自己的memory中记录
## 2026-03-08 CTO工作日志

### 架构设计
- 任务：TASK-001-auth
- 参考：CEO评估（高优先级）
- 决策：JWT + OAuth2

# CTO输出到消息池
docs/workspace/tasks/TASK-001-auth/cto-design.md:
## 技术架构设计
- 认证方式：JWT
- 第三方登录：OAuth2
- 技术栈：Node.js + Passport
```

#### 第7步：指挥官汇总
```bash
# 指挥官读取所有输出（从消息池）
# 指挥官在自己的memory中记录
### 任务完成
- TASK-001-auth
- 状态：设计阶段完成
- 下一步：实现阶段

# 指挥官返回给用户
任务分析完成：
1. ✅ CEO评估：高优先级
2. ✅ CTO设计：JWT + OAuth2
3. ⏭️  下一步：FullStack实现
```

---

## 🔑 关键设计要点

### 1. 记忆内容差异

#### 指挥官的记忆
```markdown
## commander-grove/memory/2026-03-08.md

### 任务协调记录
- TASK-001: 用户认证系统（进行中）
- TASK-002: 数据库优化（待开始）

### 决策记录
- 决定先做认证系统（CEO建议）
- 技术选型JWT + OAuth2（CTO建议）
```

#### CEO的记忆
```markdown
## ceo-bezos/memory/2026-03-08.md

### 战略评估
- TASK-001: 高优先级，核心功能
- 建议：快速迭代MVP

### 商业分析
- 用户需求强烈
- 竞品分析：都需要认证功能
```

#### CTO的记忆
```markdown
## cto-vogels/memory/2026-03-08.md

### 技术决策
- TASK-001: 选择JWT（轻量、标准）
- 第三方登录：OAuth2（通用）

### 架构考量
- 扩展性：支持多种登录方式
- 安全性：Token过期策略
```

### 2. 访问权限

```bash
✅ 允许：
- 所有Agent读取消息池（docs/workspace/）
- Agent在自己的memory/写入
- Agent读取其他Agent的输出（只读）

❌ 禁止：
- Agent写入其他Agent的memory/
- Agent修改其他Agent的输出
- Agent读取无关的记忆
```

### 3. 通信协议

```markdown
## 指挥官 → 专业Agent
### 通知格式（写入brief.md）
## 待办事项
@CEO：请评估TASK-001的商业价值
- 读取：brief.md
- 输出：ceo-strategy.md
- 截止：今天

## 专业Agent → 指挥官
### 响应格式（写入独立memory + 输出到消息池）
### 我的分析
- 读取：brief.md
- 决策：[...]
- 输出：ceo-strategy.md

### 指挥官 → 指挥官
### 内部记录（写入commander memory）
### 协调记录
- 已通知CEO，等待响应
- 已收到CEO输出，准备通知CTO
```

---

## 🛠️ 实施步骤

### 步骤1：调整目录结构

```bash
# 1. 移除memory的符号链接
cd ~/.openclaw/workspaces
for agent in ceo-bezos cto-vogels fullstack-dhh qa-bach; do
  rm -f $agent/memory
  mkdir -p $agent/memory
  echo "# ${agent^} 工作日志" > $agent/memory/README.md
done

# 2. 保留消息池的符号链接
#（已有，不需要修改）

# 3. 验证结构
ls -la commander-grove/memory/
ls -la ceo-bezos/memory/
ls -la ceo-bezos/docs/workspace/
```

### 步骤2：更新SOUL.md

#### 指挥官的SOUL.md
```markdown
## 记忆管理
### 我的记忆
- 存储位置：memory/{date}.md
- 记录内容：任务协调、决策记录、状态追踪

### 消息池
- 存储位置：docs/workspace/
- 用途：与其他Agent通信
- 读写规则：
  - 读取：所有人的输出
  - 写入：创建任务、更新状态
  - 只读：Agent的专业输出

### 协作流程
1. 创建任务（写入brief.md）
2. 通知专业Agent（在brief.md中@提及）
3. 读取Agent输出（从消息池）
4. 在我的memory中记录协调过程
5. 汇总结果返回用户
```

#### 专业Agent的SOUL.md（以CEO为例）
```markdown
## 记忆管理
### 我的记忆
- 存储位置：memory/{date}.md
- 记录内容：战略评估、商业分析、优先级决策

### 消息池
- 读取位置：docs/workspace/
- 读取内容：brief.md, 其他Agent的输出
- 输出位置：docs/workspace/tasks/TASK-XXX/ceo-strategy.md
- 权限：只读我的输入，不修改他人

### 工作流程
1. 检查消息池（读取brief.md）
2. 在我的memory中分析
3. 输出到消息池（ceo-strategy.md）
4. 通知指挥官（在输出中说明）
```

### 步骤3：更新init脚本

```bash
#!/bin/bash
# init-commander-v2.sh

OPENCLAW_DIR="$HOME/.openclaw"
WORKSPACES_DIR="$OPENCLAW_DIR/workspaces"
AGENTS_INFO_DIR="$(pwd)/agentsInfo"

# 创建共享消息池
echo "📂 创建消息池..."
mkdir -p "$WORKSPACES_DIR/commander-grove/docs/workspace/"{tasks,knowledge,archive}
mkdir -p "$WORKSPACES_DIR/commander-grove/memory"

# 定义Agent列表
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

# 为每个Agent创建独立记忆和消息池链接
for agent in "${AGENTS[@]}"; do
  echo "🔗 配置 $agent..."

  # 创建独立记忆目录
  mkdir -p "$WORKSPACES_DIR/$agent/memory"
  echo "# ${agent^} 工作日志" > "$WORKSPACES_DIR/$agent/memory/README.md"

  # 创建docs目录
  mkdir -p "$WORKSPACES_DIR/$agent/docs"

  # 链接到共享消息池（只读访问）
  ln -sf "$WORKSPACES_DIR/commander-grove/docs/workspace" "$WORKSPACES_DIR/$agent/docs/workspace"

  # 部署SOUL.md
  if [ -f "$AGENTS_INFO_DIR/${agent}.md" ]; then
    cp "$AGENTS_INFO_DIR/${agent}.md" "$WORKSPACES_DIR/$agent/SOUL.md"
    echo "  ✓ SOUL.md 部署完成"
  fi
done

# 部署指挥官SOUL.md
echo "👑 配置指挥官..."
cp "$AGENTS_INFO_DIR/commander-grove.md" "$WORKSPACES_DIR/commander-grove/SOUL.md"

echo "✅ 初始化完成！"
echo ""
echo "架构："
echo "  - 每个Agent有独立的memory/"
echo "  - 所有Agent共享docs/workspace/作为消息池"
echo "  - Agent只能写入自己的memory，只能读取消息池"
```

### 步骤4：创建记忆管理脚本

```bash
#!/bin/bash
# reset-memory.sh - 重置记忆系统

echo "🔄 重置记忆系统为独立模式..."

WORKSPACES="$HOME/.openclaw/workspaces"

# 1. 移除旧的memory符号链接
for agent in ceo-bezos cto-vogels fullstack-dhh qa-bach product-norman interaction-cooper ui-duarte marketing-godin sales-ross operations-pg; do
  if [ -L "$WORKSPACES/$agent/memory" ]; then
    rm -f "$WORKSPACES/$agent/memory"
    echo "  ✓ 移除 $agent 的旧符号链接"
  fi

  # 创建独立记忆目录
  mkdir -p "$WORKSPACES/$agent/memory"
  echo "# ${agent^} 工作日志" > "$WORKSPACES/$agent/memory/README.md"
  echo "  ✓ 创建 $agent 的独立记忆"
done

echo ""
echo "✅ 记忆系统已重置为独立模式"
echo ""
echo "验证："
echo "  ls -la ~/.openclaw/workspaces/ceo-bezos/memory"
echo "  ls -la ~/.openclaw/workspaces/cto-vogels/memory"
```

---

## 📊 架构对比

### 之前的设计（错误）

```bash
❌ 共享记忆设计
所有Agent → 同一个memory/2026-03-08.md

问题：
1. 记忆污染（CEO看到QA的细节）
2. 职责混乱（CTO看到Marketing的文案）
3. 违背多Agent的专业化原则
```

### 正确的设计（推荐）

```bash
✅ 独立记忆 + 消息池
commander-grove/memory/ ← 指挥官的记忆
ceo-bezos/memory/         ← CEO的记忆
cto-vogels/memory/        ← CTO的记忆
qa-bach/memory/           ← QA的记忆

docs/workspace/           ← 消息池（共享文档）
├── tasks/                ← 任务通信
└── knowledge/            ← 知识共享

优势：
1. 记忆隔离（各自专业）
2. 消息传递（通过文档）
3. 职责清晰（各司其职）
```

---

## 🎯 总结

### 核心设计原则

1. **记忆隔离**
   - 每个Agent维护自己的专业记忆
   - CEO不关心QA的测试细节
   - CTO不关心Marketing的文案

2. **消息池通信**
   - 通过共享文档传递信息
   - 任务简报、中间产物、最终交付
   - 只读访问，保护专业性

3. **订阅/查询模式**
   - Agent按需查询相关信息
   - 不是全量共享，而是精准传递

### 实施要点

1. ✅ 移除memory的符号链接
2. ✅ 创建各自的独立记忆目录
3. ✅ 保留docs/workspace/作为消息池
4. ✅ 更新SOUL.md说明记忆和通信机制
5. ✅ 提供重置脚本

### 预期效果

```
✅ 记忆清晰：每个Agent只记录自己的专业内容
✅ 职责明确：CEO做战略，CTO做技术，各司其职
✅ 通信顺畅：通过消息池传递信息
✅ 扩展性好：添加新Agent不影响现有Agent
```

---

**设计时间**：2026-03-08
**基于研究**：
- [MetaGPT Global Message Pool](https://github.com/FoundationAgents/MetaGPT)
- [AutoGen State Management](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/state.html)
- [Multi-Agent Context Sharing Patterns](https://fast.io/resources/multi-agent-context-sharing-patterns/)
