#!/bin/bash
# init-real-world.sh - 适配现有 Agent 的智能部署脚本 (v3.2 - Robust Optimized)

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

echo "🚀 开始 OpenClaw 真实环境部署 (v3.2 Optimized)..."

# 1. 创建 FS-Bus
echo "📂 [1/4] 构建 FS-Bus 消息总线..."
mkdir -p "$BUS_DIR/"{inbox,processing,outbox,notifications,status,events,archive,errors}

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
echo "👀 [3/4] 部署 Watcher 调度器 (Robust Version)..."
cat > "$WORKSPACES_DIR/watcher.py" <<EOF
import subprocess
import time
import json
import os
import sys
import shutil
import datetime
from pathlib import Path

# 配置
BUS_DIR = Path("$BUS_DIR")
INBOX = BUS_DIR / "inbox"
PROCESSING = BUS_DIR / "processing"
OUTBOX = BUS_DIR / "outbox"
ARCHIVE_DIR = BUS_DIR / "archive"
ERROR_DIR = BUS_DIR / "errors"

# 确保目录存在
for d in [INBOX, PROCESSING, OUTBOX, ARCHIVE_DIR, ERROR_DIR]:
    d.mkdir(parents=True, exist_ok=True)

def run_agent_safe(agent_name, task_path, timeout=300):
    """
    真实环境执行函数：通过 subprocess 调用 OpenClaw CLI
    """
    print(f"🚀 [Watcher] 调度 {agent_name} 执行任务 (Real Execution)...")
    
    # 1. 先读取任务内容
    try:
        with open(task_path, 'r') as f:
            task_data = json.load(f)
            # 提取用户需求，如果没有 content 则回退到空字符串
            user_prompt = task_data.get("content", "")
            
        if not user_prompt:
            return "❌ 错误: 任务文件中缺少 'content' 字段"
            
    except Exception as e:
        return f"❌ 无法读取任务文件: {str(e)}"

    # 2. 构造符合 OpenClaw 官方规范的命令
    # openclaw agent --agent <id> --message "..."
    cmd = [
        "openclaw", "agent", 
        "--agent", agent_name, 
        "--message", user_prompt
    ]
    
    try:
        # 3. 执行命令
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            timeout=timeout
        )
        
        if result.returncode != 0:
            # 尝试从 stderr 或 stdout 获取错误信息
            error_msg = result.stderr.strip() or result.stdout.strip() or "未知错误"
            raise Exception(f"Agent CLI 报错: {error_msg}")
            
        return result.stdout.strip()

    except FileNotFoundError:
        # 如果没有安装 openclaw 命令，回退到模拟模式（仅供测试）
        print(f"⚠️ 未找到 'openclaw' 命令，回退到模拟模式...")
        time.sleep(1)
        return f"[{agent_name}] (Mock) 处理完成。请确保 openclaw CLI 已安装。"
        
    except subprocess.TimeoutExpired:
        raise Exception(f"Agent 执行超时 ({timeout}s)")

def main():
    print(f"👀 Watcher (Robust v3.2) 正在监听: {INBOX}")
    while True:
        # 使用 list 避免迭代器在文件移动后失效
        task_files = list(INBOX.glob("*.json"))
        
        for task_file in task_files:
            print(f"📥 收到任务: {task_file.name}")
            
            proc_file = PROCESSING / task_file.name
            
            try:
                # 1. 安全锁定：使用 move 而不是 rename (跨文件系统兼容)
                if proc_file.exists():
                    print(f"⚠️ 处理中文件已存在，覆盖: {proc_file.name}")
                shutil.move(str(task_file), str(proc_file))
                
                # 2. 解析任务以获取路由信息
                with open(proc_file) as f:
                    task = json.load(f)
                
                # 3. 智能路由 (根据 agentsInfo 的 12 个角色，含 Liaison)
                task_type = task.get("type", "general")
                target_agent = "commander-grove" 
                
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

                # 4. 执行任务 (增加超时控制模拟)
                result = run_agent_safe(target_agent, proc_file, timeout=300)
                
                # 5. 原子写入：先写临时文件，再重命名
                temp_out = OUTBOX / f".{task_file.name}.tmp"
                final_out = OUTBOX / task_file.name
                
                with open(temp_out, "w") as f:
                    json.dump({**task, "result": result, "status": "done", "completed_at": datetime.datetime.now().isoformat()}, f, ensure_ascii=False, indent=2)
                
                shutil.move(str(temp_out), str(final_out))
                print(f"✅ 任务完成: {final_out.name}")
                
                # 6. 归档而非删除
                today_archive = ARCHIVE_DIR / datetime.datetime.now().strftime("%Y-%m-%d")
                today_archive.mkdir(parents=True, exist_ok=True)
                shutil.move(str(proc_file), str(today_archive / task_file.name))
                print(f"📦 已归档至: {today_archive.name}")
                
            except Exception as e:
                print(f"❌ 处理失败: {e}")
                # 移动到 error 目录供人工干预
                try:
                    if proc_file.exists():
                         shutil.move(str(proc_file), str(ERROR_DIR / task_file.name))
                    elif task_file.exists():
                         shutil.move(str(task_file), str(ERROR_DIR / task_file.name))
                except Exception as move_err:
                    print(f"❌ 移动到错误目录失败: {move_err}")
            
        time.sleep(1)

if __name__ == "__main__":
    main()
EOF

echo "✅ 部署完成！"
echo "下一步："
echo "1. 配置 ~/.openclaw/openclaw.json (参考文档)"
echo "2. 启动 Gateway: openclaw gateway start"
echo "3. 启动 Watcher: python3 $WORKSPACES_DIR/watcher.py"
