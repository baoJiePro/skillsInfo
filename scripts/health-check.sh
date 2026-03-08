#!/bin/bash
# health-check.sh - OpenClaw 多 Agent 系统健康检查
# 用途：检查系统状态，发现问题并提供修复建议

set -e

ERRORS=0
WARNINGS=0

echo "🏥 OpenClaw 多 Agent 系统健康检查"
echo "=================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# === 检查 1: Gateway 状态 ===
echo "1️⃣  检查 Gateway 状态..."
if openclaw gateway status 2>&1 | grep -q "running"; then
  echo -e "   ${GREEN}✅ Gateway 运行中${NC}"
else
  echo -e "   ${RED}❌ Gateway 未运行${NC}"
  echo "   建议：运行 'openclaw gateway start'"
  ERRORS=$((ERRORS+1))
fi

# === 检查 2: 配置文件 ===
echo ""
echo "2️⃣  检查配置文件..."
CONFIG_FILE="$HOME/.openclaw/openclaw.json"
if [ -f "$CONFIG_FILE" ]; then
  if cat "$CONFIG_FILE" | python3 -m json.tool > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ 配置文件 JSON 格式正确${NC}"
  else
    echo -e "   ${RED}❌ 配置文件 JSON 格式错误${NC}"
    ERRORS=$((ERRORS+1))
  fi
else
  echo -e "   ${RED}❌ 配置文件不存在${NC}"
  ERRORS=$((ERRORS+1))
fi

# === 检查 3: 工作区目录 ===
echo ""
echo "3️⃣  检查工作区..."
WORKSPACES="$HOME/.openclaw/workspaces"
MISSING_WORKSPACE=0

for agent in commander-grove ceo-bezos cto-vogels fullstack-dhh qa-bach product-norman interaction-cooper ui-duarte marketing-godin sales-ross operations-pg; do
  if [ ! -d "$WORKSPACES/$agent" ]; then
    echo -e "   ${RED}❌ $agent: 工作区目录缺失${NC}"
    MISSING_WORKSPACE=$((MISSING_WORKSPACE+1))
  fi
done

if [ $MISSING_WORKSPACE -eq 0 ]; then
  echo -e "   ${GREEN}✅ 所有工作区目录存在${NC}"
else
  ERRORS=$((ERRORS+MISSING_WORKSPACE))
fi

# === 检查 4: SOUL.md 文件 ===
echo ""
echo "4️⃣  检查 SOUL.md 文件..."
MISSING_SOUL=0

for agent in commander-grove ceo-bezos cto-vogels fullstack-dhh qa-bach product-norman interaction-cooper ui-duarte marketing-godin sales-ross operations-pg; do
  SOUL_FILE="$WORKSPACES/$agent/SOUL.md"
  if [ ! -f "$SOUL_FILE" ]; then
    echo -e "   ${RED}❌ $agent: SOUL.md 缺失${NC}"
    MISSING_SOUL=$((MISSING_SOUL+1))
  fi
done

if [ $MISSING_SOUL -eq 0 ]; then
  echo -e "   ${GREEN}✅ 所有 SOUL.md 文件存在${NC}"
else
  ERRORS=$((ERRORS+MISSING_SOUL))
  echo "   建议：运行 init-commander.sh 重新部署"
fi

# === 检查 5: 共享工作区符号链接 ===
echo ""
echo "5️⃣  检查共享工作区符号链接..."
BROKEN_LINKS=0

for agent in ceo-bezos cto-vogels fullstack-dhh qa-bach product-norman interaction-cooper ui-duarte marketing-godin sales-ross operations-pg; do
  WORKSPACE_LINK="$WORKSPACES/$agent/docs/workspace"
  if [ ! -L "$WORKSPACE_LINK" ]; then
    echo -e "   ${RED}❌ $agent: workspace 符号链接缺失${NC}"
    BROKEN_LINKS=$((BROKEN_LINKS+1))
  elif [ ! -d "$WORKSPACE_LINK" ]; then
    echo -e "   ${RED}❌ $agent: workspace 符号链接损坏${NC}"
    BROKEN_LINKS=$((BROKEN_LINKS+1))
  fi
done

if [ $BROKEN_LINKS -eq 0 ]; then
  echo -e "   ${GREEN}✅ 所有 workspace 符号链接正常${NC}"
else
  ERRORS=$((ERRORS+BROKEN_LINKS))
  echo "   建议：运行 init-commander.sh 重新创建符号链接"
fi

# === 检查 6: Memory 符号链接 ===
echo ""
echo "6️⃣  检查 Memory 符号链接..."
MEMORY_LINKS=0

for agent in ceo-bezos cto-vogels fullstack-dhh qa-bach product-norman interaction-cooper ui-duarte marketing-godin sales-ross operations-pg; do
  MEMORY_LINK="$WORKSPACES/$agent/memory"
  if [ ! -L "$MEMORY_LINK" ]; then
    echo -e "   ${YELLOW}⚠️  $agent: memory 符号链接缺失${NC}"
    MEMORY_LINKS=$((MEMORY_LINKS+1))
  fi
done

if [ $MEMORY_LINKS -eq 0 ]; then
  echo -e "   ${GREEN}✅ 所有 memory 符号链接正常${NC}"
else
  WARNINGS=$((WARNINGS+MEMORY_LINKS))
  echo "   建议：运行 sync-memory.sh 创建符号链接"
fi

# === 检查 7: Session 大小 ===
echo ""
echo "7️⃣  检查 Session 大小..."
SESSION_DIR="$HOME/.openclaw/agents/commander-grove/sessions"
if [ -d "$SESSION_DIR" ]; then
  SESSION_SIZE=$(du -sm "$SESSION_DIR" 2>/dev/null | cut -f1)
  if [ $SESSION_SIZE -gt 10 ]; then
    echo -e "   ${YELLOW}⚠️  Session 过大: ${SESSION_SIZE}MB (建议 <10MB)${NC}"
    echo "   建议：运行 clean-sessions.sh 清理"
    WARNINGS=$((WARNINGS+1))
  else
    echo -e "   ${GREEN}✅ Session 大小正常: ${SESSION_SIZE}MB${NC}"
  fi

  # 检查单个大文件
  LARGE_FILE=$(find "$SESSION_DIR" -name "*.jsonl" -size +1M 2>/dev/null | head -1)
  if [ -n "$LARGE_FILE" ]; then
    echo -e "   ${YELLOW}⚠️  发现大 session 文件: $(basename "$LARGE_FILE")${NC}"
    echo "   建议：运行 clean-sessions.sh 归档"
    WARNINGS=$((WARNINGS+1))
  fi
else
  echo -e "   ${YELLOW}⚠️  Session 目录不存在${NC}"
fi

# === 检查 8: 备份文件 ===
echo ""
echo "8️⃣  检查备份文件..."
BACKUP_COUNT=$(ls -1 "$HOME/.openclaw/openclaw.json.backup."* 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt 0 ]; then
  echo -e "   ${GREEN}✅ 找到 $BACKUP_COUNT 个备份文件${NC}"
else
  echo -e "   ${YELLOW}⚠️  没有找到备份文件${NC}"
  echo "   建议：定期备份 openclaw.json"
fi

# === 总结 ===
echo ""
echo "=================================="
echo "检查完成！"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ 所有检查通过！系统健康。${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  发现 $WARNINGS 个警告，建议优化。${NC}"
  exit 0
else
  echo -e "${RED}❌ 发现 $ERRORS 个错误，$WARNINGS 个警告。${NC}"
  echo ""
  echo "快速修复："
  echo "  1. 运行 init-commander.sh 修复工作区"
  echo "  2. 运行 sync-memory.sh 同步记忆"
  echo "  3. 运行 clean-sessions.sh 清理 session"
  exit 1
fi
