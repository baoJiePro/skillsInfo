# OpenClaw 维护脚本

本目录包含 OpenClaw 多 Agent 系统的维护脚本。

## 脚本列表

### 1. health-check.sh
**用途**：系统健康检查

**检查项目**：
- Gateway 运行状态
- 配置文件格式
- 工作区目录完整性
- SOUL.md 文件存在性
- 符号链接状态
- Session 大小
- 备份文件

**使用方法**：
```bash
./health-check.sh
```

**输出**：
- ✅ 绿色：检查通过
- ⚠️  黄色：警告
- ❌ 红色：错误

---

### 2. clean-sessions.sh
**用途**：清理过大的 session 文件

**功能**：
- 扫描超过 1MB 的 session 文件
- 自动归档到 `sessions/archive/` 目录
- 显示清理前后大小对比

**使用方法**：
```bash
./clean-sessions.sh
```

**建议**：
- 每周运行一次
- 当 session 超过 10MB 时运行

---

### 3. sync-memory.sh
**用途**：同步记忆系统到所有 Agent

**功能**：
- 为所有专业 Agent 创建 memory 符号链接
- 链接指向指挥官的 memory 目录
- 确保所有 Agent 共享相同的记忆

**使用方法**：
```bash
./sync-memory.sh
```

**建议**：
- 在添加新 Agent 后运行
- 如果发现 Agent 无法访问记忆时运行

---

## 定期维护建议

### 每日
- 运行 `health-check.sh` 检查系统状态

### 每周
- 运行 `clean-sessions.sh` 清理 session 文件
- 检查备份文件

### 每月
- 归档旧的任务文档
- 清理 archive 目录
- 更新文档

---

## 故障排查

### Session 溢出
**症状**：Agent 响应失败，提示 "Context overflow"

**解决方案**：
```bash
./clean-sessions.sh
```

然后在飞书中发送 `/reset` 或 `/new`

---

### Agent 无法访问记忆
**症状**：专业 Agent 说无法找到历史任务记录

**解决方案**：
```bash
./sync-memory.sh
```

---

### 符号链接损坏
**症状**：Agent 无法访问共享工作区

**解决方案**：
```bash
cd ~/Documents/myagents/skillsInfo
./init-commander.sh
```

---

## 快速命令

```bash
# 健康检查
./health-check.sh

# 清理 session
./clean-sessions.sh

# 同步记忆
./sync-memory.sh

# 重启 Gateway
openclaw gateway restart

# 查看日志
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
```

---

**维护脚本版本**：1.0.0
**最后更新**：2026-03-08
