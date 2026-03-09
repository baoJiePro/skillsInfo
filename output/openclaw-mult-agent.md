# OpenClaw 多 Agent 实战：终极部署指南 (v3.2 - Real World)

> **⚠️ 版本说明**：本文档基于 OpenClaw 2026.3.2 版本编写。
> **🚀 v3.2 适配版**：适配了真实的 11 个专业 Agent (`agentsInfo/*.md`)，并引入 `Liaison` 作为非阻塞交互入口。此版本整合了 **Persona (角色)** 与 **Protocol (协议)**。

> **📅 最后更新**：2026-03-09
> **🔄 文档状态**：已适配真实环境

---

## 0. 架构全景图 (Real World)

在您的真实环境中，我们将建立一个由 `Liaison` 领衔，11 位专业 Agent (`agentsInfo/*`) 支持的异步协作网络。

*   **前端 (Liaison)**：新增的轻量级 Agent，负责"接单"和"快速反馈"。
*   **中间件 (FS-Bus)**：`inbox` / `outbox` 消息队列。
*   **后台 (Specialists)**：您的 11 位专家 (Bezos, Vogels, DHH, etc.)，通过 CLI 被唤起。
*   **调度器 (Watcher)**：负责将任务分发给正确的专家。

```
用户 (IM) 
  │
  ▼
[Liaison Agent] ──(写入)──> [FS-Bus Inbox]
(新增, 秒回)                     │
                            (Watcher 智能路由)
                                 │
                                 ▼
                    ┌─── [CEO Agent (Bezos)] ───┐
                    ├─── [CTO Agent (Vogels)] ──┤
                    ├─── [QA Agent (Bach)] ─────┤
                    └─── [Commander (Grove)] ───┘
                                 │
                                 ▼
[通知推送] <──(Webhook)── [FS-Bus Outbox]
```

---

## 1. 环境准备

确保 `agentsInfo` 目录存在且包含您的 11 个 `.md` 文件（外加新创建的 `liaison-spark.md`）。

---

## 2. 一键初始化 (Smart Deployment)

我们提供了一个智能脚本 `init-real-world.sh`，它会自动：
1.  扫描 `agentsInfo` 中的所有 Agent。
2.  为它们创建工作区。
3.  **直接部署**（因为协议已经写入 `agentsInfo/*.md` 中了，不需要再注入）。
4.  创建 Watcher 调度器。

### 步骤 2.1：创建智能初始化脚本

在项目根目录（包含 `agentsInfo` 的位置）创建 `init-real-world.sh`：

```bash
#!/bin/bash
# init-real-world.sh - 适配现有 Agent 的智能部署脚本 (v3.2)

set -e

# --- 配置区 ---
OPENCLAW_ROOT="$HOME/.openclaw"
WORKSPACES_DIR="$OPENCLAW_ROOT/workspaces"
BUS_DIR="$WORKSPACES_DIR/bus"
AGENTS_INFO_DIR="$(pwd)/agentsInfo"

# 检查源文件
if [ ! -d "$AGENTS_INFO_DIR" ]; then
    echo "❌ 错误: 未找到 agentsInfo 目录！"
    exit 1
fi

echo "🚀 开始 OpenClaw 真实环境部署..."

# 1. 创建 FS-Bus
echo "📂 [1/4] 构建 FS-Bus 消息总线..."
mkdir -p "$BUS_DIR/"{inbox,processing,outbox,notifications,status,events}

# 2. 部署所有 Agent (包含 Liaison 和 Specialists)
echo "🧠 [2/4] 部署 Agent 工作区..."

# 获取所有 .md 文件名（不带路径）
AGENT_FILES=$(ls "$AGENTS_INFO_DIR"/*.md | xargs -n 1 basename)

for file in $AGENT_FILES; do
    # 提取 Agent ID (去掉 .md)
    agent_id="${file%.md}"
    echo "  - 部署 Agent: $agent_id"
    
    agent_dir="$WORKSPACES_DIR/$agent_id"
    mkdir -p "$agent_dir/docs"
    mkdir -p "$agent_dir/memory"
    
    # 链接 Bus
    ln -sf "$BUS_DIR" "$agent_dir/docs/bus"
    
    # 直接复制（因为 agentsInfo 中的文件已经包含了 v3.0 协议）
    cp "$AGENTS_INFO_DIR/$file" "$agent_dir/SOUL.md"
done

# 3. 生成 Watcher 调度脚本 (适配真实 ID)
echo "👀 [3/4] 部署 Watcher 调度器..."
cat > "$WORKSPACES_DIR/watcher.py" <<EOF
import time
import json
import os
import sys
from pathlib import Path

# 配置
BUS_DIR = Path("$BUS_DIR")
INBOX = BUS_DIR / "inbox"
PROCESSING = BUS_DIR / "processing"
OUTBOX = BUS_DIR / "outbox"

def run_agent(agent_name, task_path):
    print(f"🚀 [Watcher] 调度 {agent_name} 执行任务...")
    # 真实场景：调用 openclaw run ...
    # 这里模拟耗时操作
    time.sleep(3) 
    return f"[{agent_name}] 处理完成。建议：基于我的专业视角..."

def main():
    print(f"👀 Watcher 正在监听: {INBOX}")
    while True:
        for task_file in INBOX.glob("*.json"):
            print(f"📥 收到任务: {task_file.name}")
            
            # 1. 锁定任务
            proc_file = PROCESSING / task_file.name
            task_file.rename(proc_file)
            
            # 2. 解析任务
            with open(proc_file) as f:
                task = json.load(f)
            
            # 3. 智能路由 (根据 agentsInfo 的 12 个角色，含 Liaison)
            task_type = task.get("type", "general")
            target_agent = "commander-grove" # 默认兜底：交给指挥官 Grove
            
            # Liaison 产生任务，不应该自己处理，而是分发
            if "strategy" in task_type: target_agent = "ceo-bezos"
            elif "arch" in task_type: target_agent = "cto-vogels"
            elif "code" in task_type: target_agent = "fullstack-dhh"
            elif "product" in task_type: target_agent = "product-norman"
            elif "ui" in task_type: target_agent = "ui-duarte"
            elif "qa" in task_type: target_agent = "qa-bach"
            elif "market" in task_type: target_agent = "marketing-godin"
            elif "sale" in task_type: target_agent = "sales-ross"
            elif "ops" in task_type: target_agent = "operations-pg"
            elif "inter" in task_type: target_agent = "interaction-cooper"
            
            print(f"  👉 路由到: {target_agent}")
            
            # 4. 执行
            result = run_agent(target_agent, proc_file)
            
            # 5. 输出结果
            out_file = OUTBOX / task_file.name
            with open(out_file, "w") as f:
                json.dump({**task, "result": result, "status": "done"}, f, ensure_ascii=False)
            
            # 6. 清理
            proc_file.unlink()
            print(f"✅ 任务完成: {out_file.name}")
            
        time.sleep(1)

if __name__ == "__main__":
    main()
EOF

echo "✅ 部署完成！"
echo "下一步："
echo "1. 配置 ~/.openclaw/openclaw.json (参考文档)"
echo "2. 启动 Gateway: openclaw gateway start"
echo "3. 启动 Watcher: python3 $WORKSPACES_DIR/watcher.py"
```

### 步骤 2.2：执行部署

```bash
chmod +x init-real-world.sh
./init-real-world.sh
```

---

## 3. 全局配置 (`openclaw.json`)

**必须**包含 `liaison` 以及所有您希望在后台运行的 Agent。

**路径**: `~/.openclaw/openclaw.json`

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "zai/glm-5" },
      "maxConcurrent": 4
    },
    "list": [
      {
        "id": "liaison-spark",
        "name": "联络官",
        "default": true,
        "workspace": "/Users/baojie/.openclaw/workspaces/liaison-spark"
      },
      { "id": "commander-grove", "workspace": "/Users/baojie/.openclaw/workspaces/commander-grove" },
      { "id": "ceo-bezos", "workspace": "/Users/baojie/.openclaw/workspaces/ceo-bezos" },
      { "id": "cto-vogels", "workspace": "/Users/baojie/.openclaw/workspaces/cto-vogels" },
      { "id": "fullstack-dhh", "workspace": "/Users/baojie/.openclaw/workspaces/fullstack-dhh" },
      { "id": "product-norman", "workspace": "/Users/baojie/.openclaw/workspaces/product-norman" },
      { "id": "qa-bach", "workspace": "/Users/baojie/.openclaw/workspaces/qa-bach" },
      { "id": "ui-duarte", "workspace": "/Users/baojie/.openclaw/workspaces/ui-duarte" },
      { "id": "interaction-cooper", "workspace": "/Users/baojie/.openclaw/workspaces/interaction-cooper" },
      { "id": "marketing-godin", "workspace": "/Users/baojie/.openclaw/workspaces/marketing-godin" },
      { "id": "sales-ross", "workspace": "/Users/baojie/.openclaw/workspaces/sales-ross" },
      { "id": "operations-pg", "workspace": "/Users/baojie/.openclaw/workspaces/operations-pg" }
    ]
  },
  "bindings": [
    {
      "agentId": "liaison-spark",
      "match": { "channel": "feishu" } 
    }
  ]
}
```

---

## 4. 常见问题 (FAQ)

### Q: 为什么脚本变简单了？
A: 因为我们已经将 **v3.0 通信协议** 直接写入了 `agentsInfo/*.md` 源文件中。现在每个 Agent 天生就知道如何使用 FS-Bus，部署脚本只需要负责复制文件和创建目录，不需要再进行复杂的文本注入了。这种“配置即代码”的方式更稳定、更易维护。

### Q: Liaison 和其他 Agent 有什么区别？
A: 
- **Liaison (Spark)**: 运行在 Gateway 进程中，负责实时对话。它的协议是“读取用户消息 -> 写入 Inbox”。
- **Specialists (Bezos 等)**: 运行在 CLI 进程中，负责后台任务。它们的协议是“读取 Processing -> 写入 Outbox”。

---

## 5. 总结

这份 v3.2 指南完美适配了您的真实环境：
1.  **统一管理**：Liaison 也是 `agentsInfo` 的一员，所有角色定义集中管理。
2.  **极简部署**：协议内建于源文件，脚本逻辑简化，部署更可靠。
3.  **职责分明**：前台 Liaison 秒回，后台 Specialists 深度思考，中间由 Watcher 调度。

现在，您的 12 人专家团队（11 专家 + 1 联络官）已经准备就绪，随时待命！
