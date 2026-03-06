---
name: tech-doc-expander
description: |
  智能技术文档扩展器 - 递归抓取技术文章链接、自动补充官方文档、生成可操作的落地方案文档。

  **Agent 协作模式**：
  本 skill 需要与 Claude Agent 配合使用。Script 负责基础抓取，Agent 负责智能分析和内容扩展。

  工作流程：
  1. Agent 接收用户请求（链接/博客地址）
  2. 调用 MCP Web Reader 抓取内容
  3. Agent 分析内容，识别技术栈
  4. 调用 Context7 MCP 查询官方文档
  5. Agent 整合信息，生成完整文档
  6. Script 保存文档并生成索引

  **WHEN TO USE:**
  - 需要从技术博客/文章生成完整的实施方案文档
  - 需要批量整理某个技术主题的相关文章
  - 文章中技术点一笔带过，需要补充官方文档细节
  - 需要保存可离线查看的技术文档库
---

# 技术文档扩展器 (Tech Doc Expander)

智能技术文档扩展器，与 Claude Agent 协作，递归抓取技术文章内容、自动补充官方文档、生成可操作的落地方案文档。

## 🤖 Agent 协作模式

本 skill 采用 **Agent-Script 协作模式**：

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

## Agent 执行流程

当用户请求使用本 skill 时，按以下步骤执行：

### 步骤 1：确认用户意图

询问用户需要哪种模式：
- **模式 A**：批量链接处理 - 提供具体的文章链接
- **模式 B**：批量发现 - 从博客自动发现相关文章

### 步骤 2：抓取网页内容

**使用 MCP Web Reader 工具**：

```
调用: mcp__web-reader__webReader
参数:
  - url: 文章链接
  - timeout: 30（可选）
  - return_format: markdown
```

**如果 Web Reader 不可用，尝试**：
1. `baoyu-url-to-markdown` skill（如果已安装）
2. `markdown.new` 服务

### 步骤 3：分析内容

**Agent 需要分析**：

1. **识别技术栈**
   - 扫描文章中的技术关键词
   - 识别框架、库、工具
   - 确定版本要求

2. **提取关键信息**
   - 文章标题和作者
   - 发布时间
   - 核心内容摘要
   - 代码片段和配置
   - 相关链接

3. **发现内容缺口**
   - 哪些技术点一笔带过
   - 缺少哪些实施细节
   - 需要补充哪些官方文档

### 步骤 4：查询官方文档

**使用 Context7 MCP 工具**：

```
步骤 4.1: 解析库 ID
调用: mcp__context7__resolve-library-id
参数: library_name (如 "react", "vue")

步骤 4.2: 查询文档
调用: mcp__context7__query-docs
参数:
  - library_id: 从步骤 4.1 获取
  - query: "installation getting started"
  - max_results: 5
```

**如果 Context7 不可用，使用备选**：
- 使用预设的官方文档映射
- 使用 WebSearch 搜索官方文档

### 步骤 5：递归抓取相关链接

**对于文章中的链接**：

1. **分类优先级**：
   - 官方文档 (高优先级)
   - GitHub 仓库 (高优先级)
   - 技术博客 (中优先级)
   - 问答社区 (低优先级)

2. **批量抓取**：
   - 最多抓取 N 个链接（默认 5）
   - 并发处理提高效率
   - 去重避免重复

### 步骤 6：生成扩展文档

**Agent 根据以下信息生成文档**：

1. **原始文章内容**
2. **相关链接内容**
3. **官方文档内容**
4. **技术栈信息**

**文档结构**：
```markdown
# [文章标题] - 完整落地方案

## 📋 文章概览
- 原标题、作者、发布时间
- 核心内容摘要
- 技术栈列表

## 🔗 扩展资源
- 官方文档链接
- GitHub 仓库
- 相关资源

## 完整实施方案
### 前置条件
### 安装步骤
### 核心配置
### 代码实现
### 验证方法

## 🛠️ 故障排查
- 常见问题及解决方案

## 📚 延伸阅读
- 相关文档链接
```

### 步骤 7：保存文档

**使用 Write 工具保存**：
```
文件路径: {output_dir}/{number:03d}-{sanitized_title}.md
```

### 步骤 8：生成索引

**生成索引文件**：
- `index.md` - 分类索引
- 技术栈统计
- 时间分布

## MCP 工具使用

### Web Reader (mcp__web-reader__webReader)

```javascript
// 示例调用
mcp__web-reader__webReader({
  url: "https://example.com/article",
  timeout: 30,
  return_format: "markdown",
  with_links_summary: true
})
```

### Context7 (mcp__context7__)

```javascript
// 解析库 ID
mcp__context7__resolve-library_id({
  name: "react"
})
// 返回: "facebook/react"

// 查询文档
mcp__context7__query-docs({
  library_id: "facebook/react",
  query: "hooks installation",
  max_results: 5
})
```

### WebSearch (备选)

```javascript
// 当 Context7 不可用时使用
WebSearch({
  query: "react official documentation installation guide"
})
```

## 配置选项

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
  enable_fallback: true     # 使用备选搜索

# 文档生成
output:
  directory: "./output"
  numbered_files: true      # 文件名编号
  generate_index: true      # 生成索引
```

## 技术栈识别

Agent 应该识别以下类型的技术：

**前端框架**：React, Vue, Angular, Svelte, Next.js, Nuxt
**后端框架**：Express, NestJS, Django, FastAPI, Spring
**数据库**：PostgreSQL, MongoDB, Redis, MySQL
**容器化**：Docker, Kubernetes
**云服务**：AWS, Azure, GCP
**构建工具**：Webpack, Vite, esbuild
**测试框架**：Jest, Vitest, Playwright, Cypress

## 内容补充策略

| 原文内容 | Agent 补充动作 |
|---------|---------------|
| "使用 Docker 部署" | 查询 Docker 文档，补充 Dockerfile、docker-compose、部署步骤 |
| "集成 Redis" | 查询 Redis 文档，补充安装、配置、常用命令 |
| "调用 API" | 查询 API 文档，补充端点、参数、请求示例 |
| "配置环境变量" | 补充完整 .env 示例、各变量说明 |

## 故障处理

| 问题 | Agent 处理方式 |
|------|---------------|
| Web Reader 不可用 | 尝试 baoyu-url-to-markdown 或 markdown.new |
| Context7 不可用 | 使用预设映射 + WebSearch |
| 网页抓取失败 | 记录失败，继续处理其他链接 |
| 技术栈无法识别 | 询问用户或跳过 |

## 使用示例

### 示例 1：批量链接

```
用户: 帮我处理这些链接：
- https://blog.example.com/docker-guide
- https://blog.example.com/react-tutorial

Agent:
1. 调用 Web Reader 抓取两个链接
2. 分析内容：识别 Docker, React
3. 查询官方文档
4. 生成两个完整文档
5. 保存并生成索引
```

### 示例 2：批量发现

```
用户: 从 https://blog.example.com 发现所有 React 相关文章

Agent:
1. 访问博客主页
2. 解析文章列表
3. 过滤包含 React 关键词的文章
4. 批量抓取和处理
5. 生成文档库
```
