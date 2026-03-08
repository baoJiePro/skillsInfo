#!/bin/bash
# sync-memory.sh - OpenClaw 记忆系统同步脚本
# 用途：确保所有 Agent 共享相同的 memory 目录

set -e

COMMANDER_MEMORY="$HOME/.openclaw/workspaces/commander-grove/memory"
WORKSPACES="$HOME/.openclaw/workspaces"

# 专业 Agent 列表
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

echo "🔄 OpenClaw 记忆系统同步工具"
echo "=================================="
echo ""

# 检查指挥官 memory 目录
if [ ! -d "$COMMANDER_MEMORY" ]; then
  echo "❌ 错误: 指挥官 memory 目录不存在: $COMMANDER_MEMORY"
  exit 1
fi

echo "📁 指挥官 memory: $COMMANDER_MEMORY"
echo ""

# 同步所有 Agent
echo "🔗 同步专业 Agent memory 目录..."
echo ""

SUCCESS_COUNT=0
for agent in "${AGENTS[@]}"; do
  AGENT_MEMORY="$WORKSPACES/$agent/memory"

  # 删除旧的 memory 目录（如果是普通目录）
  if [ -d "$AGENT_MEMORY" ] && [ ! -L "$AGENT_MEMORY" ]; then
    rm -rf "$AGENT_MEMORY"
    echo "  🗑️  $agent: 删除旧的 memory 目录"
  fi

  # 创建符号链接
  if [ ! -L "$AGENT_MEMORY" ]; then
    ln -sf "$COMMANDER_MEMORY" "$AGENT_MEMORY"
    echo "  ✅ $agent: 创建符号链接"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    # 验证现有符号链接
    CURRENT_TARGET=$(readlink "$AGENT_MEMORY")
    if [ "$CURRENT_TARGET" = "$COMMANDER_MEMORY" ]; then
      echo "  ⏭️  $agent: 符号链接已存在且正确"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
      echo "  ⚠️  $agent: 符号链接指向错误 ($CURRENT_TARGET)"
      # 重新创建
      rm -f "$AGENT_MEMORY"
      ln -sf "$COMMANDER_MEMORY" "$AGENT_MEMORY"
      echo "  🔧 $agent: 已修复"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
  fi
done

echo ""
echo "=================================="
echo "✅ 同步完成！"
echo ""
echo "成功: $SUCCESS_COUNT/${#AGENTS[@]} 个 Agent"
echo ""
echo "验证："
echo "  ls -la ~/.openclaw/workspaces/ceo-bezos/memory"
echo ""
