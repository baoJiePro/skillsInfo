# Tech Doc Expander - 快速安装指南

## 📦 安装步骤

### 方式 1: 手动复制（推荐）

#### macOS / Linux

```bash
# 1. 下载整个项目
git clone https://github.com/baoJiePro/skillsInfo.git

# 2. 复制技能目录到 Claude Code skills 目录
cp -r skillsInfo/skills/tech-doc-expander ~/.claude/skills/

# 3. 进入技能目录安装依赖
cd ~/.claude/skills/tech-doc-expander
npm install

# 4. 验证安装
ls ~/.claude/skills/tech-doc-expander/scripts/
```

#### Windows (PowerShell)

```powershell
# 1. 下载整个项目
git clone https://github.com/baoJiePro/skillsInfo.git

# 2. 复制技能目录到 Claude Code skills 目录
xcopy /E /I skillsInfo\skills\tech-doc-expander %USERPROFILE%\.claude\skills\tech-doc-expander

# 3. 进入技能目录安装依赖
cd %USERPROFILE%\.claude\skills\tech-doc-expander
npm install

# 4. 验证安装
dir %USERPROFILE%\.claude\skills\tech-doc-expander\scripts\
```

### 方式 2: 一键安装脚本

#### macOS / Linux

```bash
# 一键安装
curl -fsSL https://raw.githubusercontent.com/baoJiePro/skillsInfo/main/skills/tech-doc-expander/install.sh | bash
```

#### Windows (PowerShell)

```powershell
# 一键安装
irm https://raw.githubusercontent.com/baoJiePro/skillsInfo/main/skills/tech-doc-expander/install.ps1
```

## ✅ 验证安装

安装完成后，在 Claude Code 中测试：

```
使用 tech-doc-expander 处理这篇文章：https://example.com
```

如果看到技能开始工作，说明安装成功！

## 📂 技能文件结构

```
tech-doc-expander/
├── SKILL.md              # 技能定义文件（核心）
├── README.md             # 技能说明文档
├── package.json          # npm 依赖配置
├── package-lock.json     # 依赖锁定文件
├── scripts/              # TypeScript 脚本目录
│   ├── main.ts          # 主入口
│   ├── fetcher.ts       # 网页抓取
│   ├── analyzer.ts      # 技术栈分析
│   ├── docs-query.ts    # 文档查询
│   ├── generator.ts     # 文档生成
│   ├── discover.ts      # 批量发现
│   ├── expander.ts      # 内容扩展
│   └── config.ts        # 配置管理
├── templates/            # 文档模板
│   └── default.md       # 默认模板
├── references/           # 参考文档
└── node_modules/         # npm 依赖（安装后生成）
```

## 🔧 MCP 依赖配置

此技能需要以下 MCP Servers，确保已在 Claude Code 配置中启用：

### 1. Web Reader MCP

编辑 `~/.claude/mcp.json` (macOS/Linux) 或 `%USERPROFILE%\.claude\mcp.json` (Windows)：

```json
{
  "mcpServers": {
    "web-reader": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-web-reader"]
    }
  }
}
```

### 2. Context7 MCP

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

### 完整配置示例

```json
{
  "mcpServers": {
    "web-reader": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-web-reader"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

配置完成后重启 Claude Code。

## 🚀 使用示例

### 基础用法

```
使用 tech-doc-expander 处理：https://blog.example.com/react-tips
```

### 指定输出目录

```
用 tech-doc-expander 处理 https://dev.io/typescript，输出到 ./my-docs
```

### 指定技术栈

```
使用 tech-doc-expander 处理 https://example.com/fullstack，补充 react 和 nextjs 文档
```

### 批量处理

```
使用 tech-doc-expander 批量处理以下链接：
- https://blog.example.com/docker-guide
- https://blog.example.com/react-tutorial
```

## 📝 技能工作原理

### Agent-Script 协作模式

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Agent (智能大脑)                                     │
│  - 接收用户请求                                              │
│  - 调用 MCP 工具（Web Reader、Context7）                     │
│  - 分析内容、识别技术栈                                      │
│  - 查询官方文档、扩展内容                                    │
│  - 生成智能文档                                              │
└─────────────────────────────────────────────────────────────┘
                        ↕ 指挥
┌─────────────────────────────────────────────────────────────┐
│  Tech Doc Expander Scripts (执行层)                         │
│  - fetcher.ts: 网页抓取                                      │
│  - docs-query.ts: 文档查询                                   │
│  - analyzer.ts: 技术栈分析                                   │
│  - generator.ts: 文档生成                                    │
└─────────────────────────────────────────────────────────────┘
```

## ❓ 常见问题

### Q: 技能无法识别？
**A**: 确保整个 tech-doc-expander 目录在正确的位置，重启 Claude Code。

### Q: MCP 工具调用失败？
**A**: 检查 `~/.claude/mcp.json` 配置是否正确。

### Q: 内容抓取失败？
**A**: 某些网站可能有访问限制，尝试其他网站。

### Q: 依赖安装失败？
**A**: 确保 Node.js 版本 18+，尝试 `npm cache clean` 后重新安装。

## 📞 获取帮助

- **GitHub Issues**: https://github.com/baoJiePro/skillsInfo/issues
- **详细文档**: 查看 [SKILL.md](./SKILL.md) 了解技能完整说明
- **使用示例**: 查看 [README.md](./README.md) 了解更多详情

---

**最后更新**: 2026-03-06
