# Tech Doc Expander

> 智能技术文档扩展器 - 与 Claude Agent 深度协作，自动生成可操作的落地方案文档

## ✨ 特性

| 特性 | 说明 |
|------|------|
| **智能内容抓取** | 集成 MCP Web Reader、baoyu-url-to-markdown、markdown.new |
| **技术栈识别** | 自动识别 50+ 技术栈，包括框架、库、工具 |
| **官方文档查询** | 集成 Context7 MCP，查询真实官方文档 |
| **递归链接处理** | 深入抓取文章中的相关链接 |
| **Agent 协作** | Claude Agent 负责智能分析和内容扩展 |
| **结构化输出** | 生成带索引的 Markdown 文档库 |

---

## 🤖 Agent 协作模式

本 skill 采用 **Agent-Script 协作** 架构：

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Agent (智能大脑)                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. 接收用户请求                                      │   │
│  │ 2. 调用 MCP Web Reader 抓取内容                      │   │
│  │ 3. 分析内容，识别技术栈                              │   │
│  │ 4. 调用 Context7 MCP 查询官方文档                    │   │
│  │ 5. 整合信息，生成智能文档                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        ↕ 指挥
┌─────────────────────────────────────────────────────────────┐
│  Tech Doc Expander Scripts (执行层)                         │
│  ┌─────────────┬──────────────┬──────────────┐              │
│  │ fetcher.ts  │ docs-query.ts│ analyzer.ts  │              │
│  │ 网页抓取    │ 官方文档查询 │ 技术栈分析   │              │
│  ├─────────────┼──────────────┼──────────────┤              │
│  │ generator.ts│ discover.ts  │ main.ts      │              │
│  │ 文档生成    │ 批量发现     │ CLI 入口     │              │
│  └─────────────┴──────────────┴──────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 使用方式

### 模式 A：批量链接处理

```
用户: 帮我处理这些链接：
  - https://blog.example.com/docker-guide
  - https://blog.example.com/react-tutorial

Agent 工作流程：
1. 调用 Web Reader 抓取链接
2. 分析技术栈（Docker, React）
3. 查询官方文档
4. 生成完整文档
5. 保存并生成索引
```

### 模式 B：批量发现

```
用户: 从 https://blog.example.com 发现所有 React 相关文章

Agent 工作流程：
1. 访问博客主页
2. 解析文章列表
3. 过滤 React 相关文章
4. 批量抓取和处理
5. 生成文档库
```

---

## 🔧 MCP 工具集成

### Web Reader (mcp__web-reader__webReader)

```javascript
// Agent 调用示例
mcp__web-reader__webReader({
  url: "https://example.com/article",
  timeout: 30,
  return_format: "markdown"
})
```

### Context7 (mcp__context7__)

```javascript
// Agent 调用示例
// 1. 解析库 ID
mcp__context7__resolve-library_id({ name: "react" })
// 返回: "facebook/react"

// 2. 查询文档
mcp__context7__query-docs({
  library_id: "facebook/react",
  query: "hooks installation",
  max_results: 5
})
```

---

## 📁 文件结构

```
~/.claude/skills/tech-doc-expander/
├── SKILL.md                    # Agent 协作说明
├── README.md                   # 本文件
├── package.json                # 依赖配置
├── scripts/
│   ├── main.ts                 # CLI 入口
│   ├── fetcher.ts              # 网页抓取（集成多种方式）
│   ├── docs-query.ts           # 官方文档查询（集成 Context7）
│   ├── analyzer.ts             # 技术栈分析（50+ 技术）
│   ├── generator.ts            # 文档生成
│   ├── expander.ts             # 批量扩展逻辑
│   ├── discover.ts             # 批量发现逻辑
│   └── config.ts               # 配置管理
└── templates/
    └── default.md              # 默认文档模板
```

---

## 🚀 快速开始

### 1. 通过 Claude Agent 使用（推荐）

```
用户: 使用 tech-doc-expander 处理这个链接：
  https://blog.example.com/article
```

Agent 会自动：
1. 抓取内容
2. 分析技术栈
3. 查询官方文档
4. 生成完整文档

### 2. 直接使用 CLI

```bash
cd ~/.claude/skills/tech-doc-expander

# 批量链接模式
node scripts/main.ts \
  "https://blog.example.com/article1" \
  "https://blog.example.com/article2" \
  --output ./docs/

# 批量发现模式
node scripts/main.ts discover \
  --source "https://blog.example.com" \
  --filter "react" \
  --output ./docs/react/
```

---

## 📊 技术栈识别

本 skill 可自动识别以下技术：

### 前端框架
React, Vue, Angular, Svelte, Next.js, Nuxt.js, Solid

### 后端框架
Express, NestJS, Django, FastAPI, Spring Boot, Flask, Gin

### 数据库
PostgreSQL, MySQL, MongoDB, Redis, SQLite, Elasticsearch

### 容器化
Docker, Kubernetes, Podman

### CI/CD
GitHub Actions, Jenkins, GitLab CI, Travis CI

### 云服务
AWS, Azure, GCP, Vercel, Netlify

### 编程语言
TypeScript, JavaScript, Python, Go, Rust, Java, C#, Ruby, PHP

### 构建工具
Webpack, Vite, esbuild, Rollup, Parcel, Turbopack

### 测试框架
Jest, Vitest, Mocha, Jasmine, Playwright, Cypress, Selenium

---

## 📝 输出文档结构

```markdown
# [文章标题] - 完整落地方案

> 📄 来源：[URL]
> 🕐 生成：[时间]
> 🔧 技术栈：[列表]

## 📋 文章概览
- 核心内容摘要
- 技术栈表格

## 🔗 扩展资源
- 官方文档
- 相关资源
- 参考链接

## 🔧 技术栈详解
- 每个技术的详细说明

## 完整实施方案
### 前置条件
### 安装步骤
### 核心配置
### 代码实现
### 验证方法

## 🛠️ 故障排查
- 常见问题及解决方案

## 📚 延伸阅读
```

---

## ⚙️ 配置

创建 `.tech-doc-expander.yaml`：

```yaml
# 内容抓取配置
content:
  max_depth: 2              # 递归深度
  max_links: 15             # 最多抓取链接数
  concurrent: 3             # 并发数
  download_media: false     # 下载图片

# 官方文档查询
official_docs:
  enable_context7: true     # 优先使用 Context7
  enable_mapping: true      # 使用预设映射

# 输出配置
output:
  directory: "./output"
  numbered_files: true      # 文件名编号
  generate_index: true      # 生成索引
```

---

## 🔍 故障处理

| 问题 | 解决方案 |
|------|---------|
| Web Reader 不可用 | 自动切换到 baoyu-url-to-markdown |
| Context7 不可用 | 使用预设映射 + WebSearch |
| 网页抓取失败 | 记录失败，继续处理其他链接 |
| 技术栈无法识别 | 跳过该技术或询问用户 |

---

## 📄 许可证

MIT
