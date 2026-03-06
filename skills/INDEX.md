# Skills Index - 技能索引

欢迎来到 SkillsInfo 项目！这里收集了各种实用的 AI Agent 技能。

## 📚 技能列表

### Tech Doc Expander - 智能技术文档扩展器

**描述**: 递归抓取技术文章链接、自动补充官方文档、生成可操作的落地方案文档。

**核心功能**:
- 🔄 递归抓取技术文章链接
- 📖 自动补充官方文档
- 📝 生成可操作的实施方案
- 💾 支持离线阅读

**技术架构**:
- Agent-Script 协作模式
- MCP Web Reader 内容抓取
- Context7 官方文档查询

**文档**:
- [SKILL.md](./tech-doc-expander/SKILL.md) - 技能定义与执行流程
- [README.md](./tech-doc-expander/README.md) - 技能概述与功能说明
- [快速安装](./tech-doc-expander/INSTALL_GUIDE.md) - 安装与配置指南

**技能目录**:
```
tech-doc-expander/
├── SKILL.md              # 技能定义文件（核心）
├── README.md             # 技能说明文档
├── package.json          # npm 依赖配置
├── scripts/              # TypeScript 脚本目录
│   ├── main.ts          # 主入口
│   ├── fetcher.ts       # 网页抓取
│   ├── analyzer.ts      # 技术栈分析
│   ├── docs-query.ts    # 文档查询
│   ├── generator.ts     # 文档生成
│   └── config.ts        # 配置管理
└── templates/            # 文档模板
```

**适用场景**:
- 从技术博客生成完整实施方案
- 批量整理技术主题文档
- 补充文章中的技术细节
- 构建离线技术文档库

---

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/baoJiePro/skillsInfo.git
cd skillsInfo
```

### 2. 复制技能到 Claude Code

**macOS / Linux**:
```bash
cp -r skills/tech-doc-expander ~/.claude/skills/
cd ~/.claude/skills/tech-doc-expander
npm install
```

**Windows (PowerShell)**:
```powershell
xcopy /E /I skills\tech-doc-expander %USERPROFILE%\.claude\skills\tech-doc-expander
cd %USERPROFILE%\.claude\skills\tech-doc-expander
npm install
```

### 3. 配置 MCP 依赖

编辑 `~/.claude/mcp.json`，添加所需的 MCP Servers：

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

### 4. 重启 Claude Code 并使用

在 Claude Code 中直接调用：
```
使用 tech-doc-expander 处理：https://blog.example.com/react-tips
```

---

## 📖 技能文件说明

每个技能目录包含以下文件：

### 核心文件
- **SKILL.md** - 技能定义文件，包含执行流程、MCP 工具使用、配置选项
- **package.json** - npm 依赖配置
- **scripts/** - TypeScript 脚本实现

### 文档文件
- **README.md** - 技能概述与功能说明
- **INSTALL_GUIDE.md** - 快速安装与配置指南

### 支持文件
- **templates/** - 文档生成模板
- **references/** - 参考文档

---

## 🤝 贡献指南

欢迎提交新的技能或改进现有技能！

### 提交新技能

1. 在 `skills/` 下创建新的技能文件夹
2. 创建 `SKILL.md` 定义文件
3. 实现必要的脚本
4. 添加安装和使用文档
5. 提交 Pull Request

### 技能规范

- 使用清晰的中文描述
- 提供完整的执行流程
- 说明所需的 MCP 依赖
- 包含实际使用示例
- 添加适当的错误处理

---

## 📞 联系方式

- **GitHub**: https://github.com/baoJiePro/skillsInfo
- **Issues**: https://github.com/baoJiePro/skillsInfo/issues

---

**最后更新**: 2026-03-06
