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
  # 这是消息池，所有Agent共享用于通信
  ln -sf "$WORKSPACES_DIR/commander-grove/docs/workspace" "$WORKSPACES_DIR/$agent/docs/workspace"

  # 创建独立记忆目录（不使用符号链接）
  # 每个Agent维护自己的专业记忆
  mkdir -p "$WORKSPACES_DIR/$agent/memory"
  if [ ! -f "$WORKSPACES_DIR/$agent/memory/README.md" ]; then
    cat > "$WORKSPACES_DIR/$agent/memory/README.md" <<EOF
# ${agent^} 工作日志

这是 ${agent^} Agent 的独立记忆空间。

## 记忆内容
- 记录 ${agent^} 的专业分析
- 记录 ${agent^} 的决策过程
- 记录 ${agent^} 的工作成果

## 与其他Agent通信
- **读取**：从 \`docs/workspace/\` 读取任务和其他Agent的输出
- **写入**：将输出写入 \`docs/workspace/tasks/TASK-XXX/\`
- **不写入**：不修改其他Agent的记忆
EOF
  fi

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