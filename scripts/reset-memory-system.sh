#!/bin/bash
# reset-memory-system.sh - 重置记忆系统为独立模式
# 基于正确的多Agent架构：独立记忆 + 消息池

set -e

WORKSPACES="$HOME/.openclaw/workspaces"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 重置记忆系统为独立模式"
echo "=================================="
echo ""
echo "设计原则："
echo "  ✅ 每个Agent有独立的memory/"
echo "  ✅ 所有Agent共享docs/workspace/作为消息池"
echo "  ✅ Agent只能写入自己的memory，只能读取消息池"
echo ""

# 备份当前记忆
BACKUP_DIR="$SCRIPT_DIR/memory-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 备份现有记忆到: $BACKUP_DIR"

# 备份指挥官的记忆
if [ -d "$WORKSPACES/commander-grove/memory" ]; then
  cp -r "$WORKSPACES/commander-grove/memory" "$BACKUP_DIR/commander-memory"
  echo "  ✓ 已备份指挥官记忆"
fi

# 定义专业Agent列表
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

# 重置每个Agent的记忆系统
echo ""
echo "🔧 重置Agent记忆系统..."

for agent in "${AGENTS[@]}"; do
  echo "  处理 $agent..."

  # 1. 移除旧的符号链接（如果存在）
  if [ -L "$WORKSPACES/$agent/memory" ]; then
    rm -f "$WORKSPACES/$agent/memory"
    echo "    ✓ 移除旧的符号链接"
  fi

  # 2. 备份现有记忆（如果是真实目录）
  if [ -d "$WORKSPACES/$agent/memory" ] && [ ! -L "$WORKSPACES/$agent/memory" ]; then
    cp -r "$WORKSPACES/$agent/memory" "$BACKUP_DIR/$agent-memory"
    echo "    ✓ 已备份现有记忆"
    rm -rf "$WORKSPACES/$agent/memory"
  fi

  # 3. 创建独立记忆目录
  mkdir -p "$WORKSPACES/$agent/memory"

  # 4. 创建README说明
  cat > "$WORKSPACES/$agent/memory/README.md" <<EOF
# ${agent^} 工作日志

## 记忆说明

这是 ${agent^} Agent 的**独立记忆空间**。

### 记忆内容
- 记录 ${agent^} 的专业分析
- 记录 ${agent^} 的决策过程
- 记录 ${agent^} 的工作成果

### 与其他Agent通信
- **读取**：从 \`docs/workspace/\` 读取任务和其他Agent的输出
- **写入**：将输出写入 \`docs/workspace/tasks/TASK-XXX/\`
- **不写入**：不修改其他Agent的记忆

### 工作流程
1. 检查消息池（读取 brief.md）
2. 在自己的记忆中分析
3. 输出到消息池（对应的专业文档）
4. 通知指挥官（在输出中说明）

## 日期索引

EOF

  # 创建今日工作日志
  cat > "$WORKSPACES/$agent/memory/$(date +%Y-%m-%d).md" <<EOF
# $(date +%Y-%m-%d) ${agent^} 工作日志

## 任务记录

### 接收任务
- 暂无

### 分析决策
- 暂无

### 输出文档
- 暂无

## 学习记录

### 新知识
- 暂无

### 经验总结
- 暂无
EOF

  echo "    ✓ 创建独立记忆目录"
done

echo ""
echo "✅ 重置完成！"
echo ""
echo "新架构："
echo "  独立记忆："
echo "    ~/.openclaw/workspaces/ceo-bezos/memory/"
echo "    ~/.openclaw/workspaces/cto-vogels/memory/"
echo "    ~/.openclaw/workspaces/qa-bach/memory/"
echo "    ... (各自独立)"
echo ""
echo "  消息池（共享）："
echo "    ~/.openclaw/workspaces/commander-grove/docs/workspace/"
echo "    ├── tasks/           ← 任务通信"
echo "    └── knowledge/       ← 知识共享"
echo ""
echo "验证："
echo "  ls -la ~/.openclaw/workspaces/ceo-bezos/memory/"
echo "  ls -la ~/.openclaw/workspaces/cto-vogels/memory/"
echo ""
echo "📁 备份位置：$BACKUP_DIR"
echo ""
echo "💡 下一步："
echo "  1. 重启 Gateway：openclaw gateway restart"
echo "  2. 在飞书中测试新的记忆系统"
echo "  3. 查看各Agent的独立记忆文件"
echo ""
