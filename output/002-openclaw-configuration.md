# OpenClaw 多 Agent 配置指南

## 配置完成时间
2026-03-08

## 备份信息
原配置文件已备份至：
```
~/.openclaw/openclaw.json.backup.20260308-192559
```

## 配置说明

### 1. Agent 列表配置

已在 `agents.list` 中添加了 11 个 Agent：

#### 指挥官（用户唯一交互接口）
- **ID**: commander-grove
- **名称**: 指挥官
- **默认**: true（所有消息默认路由到此 Agent）
- **工作区**: ~/.openclaw/workspaces/commander-grove

#### 决策层
- **ceo-bezos**: CEO - 战略评估、商业模式、优先级决策
- **cto-vogels**: CTO - 技术架构、设计模式、性能评估
- **fullstack-dhh**: FullStack - 代码实现、重构、开发工具
- **qa-bach**: QA - 测试策略、质量评估、发布检查

#### 产品层
- **product-norman**: Product - 产品定义、用户体验、可用性
- **interaction-cooper**: Interaction - 用户流程、Persona、交互模式
- **ui-duarte**: UI - 视觉设计、设计系统、界面规范

#### 增长层
- **marketing-godin**: Marketing - 市场定位、品牌叙事、增长策略
- **sales-ross**: Sales - 定价策略、销售模式、转化优化
- **operations-pg**: Operations - 用户获取、社区运营、增长节奏

### 2. 消息路由配置

已在 `bindings` 中配置路由规则：

```json
{
  "agentId": "commander-grove",
  "match": {
    "channel": "feishu"
  }
}
```

**路由规则说明**：
- 所有来自飞书的消息都会路由到指挥官（commander-grove）
- 指挥官会分析任务类型和复杂度
- 根据任务需要，指挥官会协调专业 Agent 团队完成工作
- 最后由指挥官汇总结果并返回给用户

### 3. 工作区结构

所有 Agent 的工作区都位于 `~/.openclaw/workspaces/` 目录下。

#### 共享工作区
指挥官的工作区包含共享工作空间：
```
~/.openclaw/workspaces/commander-grove/docs/workspace/
├── tasks/              # 活跃任务
├── knowledge/          # 知识库
└── archive/            # 已完成任务归档
```

#### 符号链接
其他 10 个专业 Agent 的工作区通过符号链接访问共享工作区：
```
~/.openclaw/workspaces/{agent}/docs/workspace -> ~/.openclaw/workspaces/commander-grove/docs/workspace
```

这种设计确保所有 Agent 都能访问相同的任务文档和知识库。

## 使用流程

### 1. 启动 OpenClaw Gateway
```bash
# 如果 Gateway 正在运行，先重启
openclaw gateway restart
```

### 2. 发送测试消息
在飞书中发送消息：
```
你好，我想开发一个简单的 Todo App
```

### 3. 指挥官响应流程
指挥官会：
1. 分析任务类型（开发类）
2. 评估复杂度（中等）
3. 创建任务目录：`docs/workspace/tasks/TASK-XXX-TodoApp/`
4. 生成任务简报：`brief.md`
5. 协调专业 Agent（Product -> CTO -> FullStack -> QA）
6. 汇总所有输出并返回最终结果

## 飞书集成

### 飞书配置（已存在）
```json
{
  "channels": {
    "feishu": {
      "appId": "cli_a9f12f0c4339dcef",
      "appSecret": "aO7NomHlaPW13coKgBQOPc7FxsHaO28F",
      "enabled": true
    }
  }
}
```

### 飞书插件（已启用）
```json
{
  "plugins": {
    "entries": {
      "feishu": {
        "enabled": true
      }
    }
  }
}
```

## 验证配置

### 检查工作区结构
```bash
ls -la ~/.openclaw/workspaces/
```

应该看到 11 个 Agent 的工作区目录。

### 检查符号链接
```bash
ls -la ~/.openclaw/workspaces/ceo-bezos/docs/workspace
```

应该指向 `commander-grove` 的共享工作区。

### 检查 SOUL 文件
```bash
ls ~/.openclaw/workspaces/*/SOUL.md
```

每个 Agent 都应该有对应的 SOUL.md 文件。

## 下一步

### 1. 重启 OpenClaw Gateway
```bash
openclaw gateway restart
```

### 2. 在飞书中测试
发送一条测试消息，确认指挥官能正常响应。

### 3. 监控日志
```bash
openclaw gateway logs
```

查看是否有错误信息。

## 故障排查

### 问题：Agent 找不到文件
**解决方案**：检查符号链接是否正确创建
```bash
ls -l ~/.openclaw/workspaces/ceo-bezos/docs/workspace
```

### 问题：飞书消息没有响应
**解决方案**：
1. 检查 Gateway 是否运行：`openclaw gateway status`
2. 检查飞书配置是否正确
3. 查看日志：`openclaw gateway logs`

### 问题：指挥官没有协调其他 Agent
**解决方案**：
1. 确认所有 Agent 的 SOUL.md 文件都已部署
2. 检查共享工作区是否可访问
3. 查看指挥官的输出日志

## 配置文件位置

- **主配置**: ~/.openclaw/openclaw.json
- **备份**: ~/.openclaw/openclaw.json.backup.20260308-192559
- **Agent 定义**: ~/Documents/myagents/skillsInfo/agentsInfo/*.md
- **初始化脚本**: ~/Documents/myagents/skillsInfo/init-commander.sh

## 相关文档

- [OpenClaw 多 Agent 实战完整文档](./openclaw-mult-agent.md)
- [指挥官 Agent 配置](../agentsInfo/commander-grove.md)
- [专业 Agent 配置列表](../agentsInfo/)

---

**配置完成！现在可以通过飞书与指挥官对话，指挥官会协调专业 Agent 团队为你完成复杂任务。**
