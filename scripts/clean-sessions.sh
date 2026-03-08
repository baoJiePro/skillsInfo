#!/bin/bash
# clean-sessions.sh - OpenClaw Session 清理脚本
# 用途：归档过大的 session 文件，防止上下文溢出

set -e

SESSIONS_DIR="$HOME/.openclaw/agents/commander-grove/sessions"
ARCHIVE_DIR="$SESSIONS_DIR/archive"
THRESHOLD_MB=1  # 超过 1MB 的文件将被归档

echo "🧹 OpenClaw Session 清理工具"
echo "=================================="
echo ""

# 检查目录是否存在
if [ ! -d "$SESSIONS_DIR" ]; then
  echo "❌ 错误: Session 目录不存在: $SESSIONS_DIR"
  exit 1
fi

# 创建归档目录
mkdir -p "$ARCHIVE_DIR"

# 检查总大小
TOTAL_SIZE=$(du -sm "$SESSIONS_DIR" 2>/dev/null | cut -f1)
echo "📊 当前 session 目录大小: ${TOTAL_SIZE}MB"
echo ""

# 查找大文件
echo "🔍 扫描超过 ${THRESHOLD_MB}MB 的 session 文件..."
echo ""

FOUND_LARGE=false

find "$SESSIONS_DIR" -maxdepth 1 -name "*.jsonl" -size +${THRESHOLD_MB}M | while read -r file; do
  FOUND_LARGE=true
  FILE_SIZE=$(du -h "$file" | cut -f1)
  FILE_NAME=$(basename "$file")

  echo "⚠️  发现大文件:"
  echo "   文件: $FILE_NAME"
  echo "   大小: $FILE_SIZE"
  echo ""

  # 归档文件
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  ARCHIVED_NAME="${FILE_NAME%.jsonl}_${TIMESTAMP}.jsonl"

  mv "$file" "$ARCHIVE_DIR/$ARCHIVED_NAME"
  echo "   ✅ 已归档至: archive/$ARCHIVED_NAME"
  echo ""
done

# 显示结果
NEW_TOTAL_SIZE=$(du -sm "$SESSIONS_DIR" 2>/dev/null | cut -f1)
echo "=================================="
echo "✅ 清理完成！"
echo ""
echo "清理前大小: ${TOTAL_SIZE}MB"
echo "清理后大小: ${NEW_TOTAL_SIZE}MB"
echo "节省空间: $((TOTAL_SIZE - NEW_TOTAL_SIZE))MB"
echo ""

# 提示用户手动重置
echo "💡 提示："
echo "   如果 session 仍然过大，请在飞书对话中发送："
echo "   - /reset  (重置当前 session)"
echo "   - /new    (创建新 session)"
echo ""
echo "📁 归档文件位置: $ARCHIVE_DIR"
echo ""
