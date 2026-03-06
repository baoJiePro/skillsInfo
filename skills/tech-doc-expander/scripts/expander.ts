/**
 * 文档扩展器 - 核心逻辑
 *
 * 负责抓取文章内容、递归提取链接、生成扩展文档
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import type { Config } from './config.js';

export interface Article {
  url: string;
  title: string;
  content: string;
  links: string[];
  techStack: string[];
  metadata: {
    author?: string;
    date?: string;
    description?: string;
  };
}

export interface ExpandedDoc {
  original: Article;
  relatedDocs: Array<{ url: string; title: string; summary: string }>;
  officialDocs: Array<{ tech: string; url: string; summary: string }>;
  expandedContent: string;
}

/**
 * 批量扩展模式
 */
export async function expand(config: Config): Promise<void> {
  console.log(`🚀 开始处理 ${config.urls?.length || 0} 个链接...\n`);

  // 创建输出目录
  const outputDir = config.output;
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const results: ExpandedDoc[] = [];

  // 处理每个链接
  for (let i = 0; i < (config.urls?.length || 0); i++) {
    const url = config.urls![i];
    const number = (i + 1).toString().padStart(3, '0');

    console.log(`\n[${i + 1}/${config.urls?.length}] 处理: ${url}`);

    try {
      const doc = await processArticle(url, config);
      results.push(doc);

      // 生成文件名
      const filename = `${number}-${sanitizeFilename(doc.original.title)}.md`;
      const filepath = join(outputDir, filename);

      // 生成并保存文档
      const markdown = generateMarkdown(doc);
      await writeFile(filepath, markdown, 'utf-8');

      console.log(`  ✅ 已生成: ${basename(filepath)}`);
    } catch (error) {
      console.error(`  ❌ 处理失败: ${(error as Error).message}`);
    }
  }

  // 生成索引
  if (results.length > 0) {
    await generateIndex(results, outputDir);
    console.log(`\n📚 已生成索引文件: index.md`);
  }

  console.log(`\n✨ 完成！生成了 ${results.length} 个文档`);
}

/**
 * 处理单篇文章
 */
async function processArticle(url: string, config: Config): Promise<ExpandedDoc> {
  // 1. 抓取主文章内容
  console.log('  📥 抓取主文章...');
  const article = await fetchArticle(url, config.waitMode);

  // 2. 提取并抓取相关链接
  console.log(`  🔗 发现 ${article.links.length} 个相关链接...`);
  const relatedDocs = await fetchRelatedDocs(article.links, config);

  // 3. 识别技术栈并查询官方文档
  console.log(`  🔍 识别技术栈: ${article.techStack.join(', ')}`);
  const officialDocs = await queryOfficialDocs(article.techStack);

  // 4. 生成扩展内容（由 Claude 完成）
  const expandedContent = await generateExpandedContent(article, relatedDocs, officialDocs);

  return {
    original: article,
    relatedDocs,
    officialDocs,
    expandedContent,
  };
}

/**
 * 抓取文章内容
 */
async function fetchArticle(url: string, waitMode = false): Promise<Article> {
  // 这里需要集成 baoyu-url-to-markdown 或使用其他抓取方式
  // 简化实现：返回模拟数据
  return {
    url,
    title: '示例文章标题',
    content: '文章内容...',
    links: extractLinks(url),
    techStack: identifyTechStack('文章内容...'),
    metadata: {
      author: '作者名',
      date: new Date().toISOString(),
    },
  };
}

/**
 * 提取页面中的链接
 */
function extractLinks(content: string): string[] {
  const linkPattern = /https?:\/\/[^\s\)]+/g;
  const matches = content.match(linkPattern) || [];
  return [...new Set(matches)]; // 去重
}

/**
 * 识别技术栈
 */
function identifyTechStack(content: string): string[] {
  const techPatterns: Record<string, RegExp[]> = {
    react: [/\bReact\b/i, /\bJSX\b/i, /\buseState\b/i],
    vue: [/\bVue\b/i, /\bv-model\b/i, /\bVue\.component\b/i],
    'next.js': [/\bNext\.js\b/i, /\bnext/link\b/i, /\bgetServerSideProps\b/i],
    docker: [/\bDocker\b/i, /\bdockerfile\b/i, /\bdocker-compose\b/i],
    kubernetes: [/\bKubernetes\b/i, /\bK8s\b/i, /\bDeployment\b/i],
    typescript: [/\bTypeScript\b/i, /\binterface\b/i, /:\s*string/],
    node: [/\bNode\.js\b/i, /require\s*\(/, /import\s+.*\s+from/],
    python: [/\bPython\b/i, /\bdef\s+\w+\s*\(/, /\bimport\s+\w+/],
    go: [/\bGo\s+lang\b/i, /\bfunc\s+\w+\s*\(/, /package\s+main/],
  };

  const detected: string[] = [];

  for (const [tech, patterns] of Object.entries(techPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        detected.push(tech);
        break;
      }
    }
  }

  return [...new Set(detected)];
}

/**
 * 抓取相关文档
 */
async function fetchRelatedDocs(links: string[], config: Config): Promise<Array<{ url: string; title: string; summary: string }>> {
  const docs = [];
  const maxLinks = config.maxDepth || 2;

  for (let i = 0; i < Math.min(links.length, maxLinks); i++) {
    const url = links[i];

    // 过滤掉非技术文档链接
    if (shouldSkipUrl(url)) continue;

    try {
      console.log(`    📄 抓取相关: ${url.substring(0, 50)}...`);
      // 实际实现中这里会抓取内容
      docs.push({
        url,
        title: '相关文档标题',
        summary: '相关文档摘要...',
      });
    } catch (error) {
      console.warn(`    ⚠️  跳过: ${(error as Error).message}`);
    }
  }

  return docs;
}

/**
 * 判断是否应该跳过某个 URL
 */
function shouldSkipUrl(url: string): boolean {
  const skipPatterns = [
    /twitter\.com/,
    /facebook\.com/,
    /linkedin\.com/,
    /.*\.(png|jpg|jpeg|gif|pdf)$/,
  ];

  return skipPatterns.some(pattern => pattern.test(url));
}

/**
 * 查询官方文档
 */
async function queryOfficialDocs(techStack: string[]): Promise<Array<{ tech: string; url: string; summary: string }>> {
  const docs = [];

  for (const tech of techStack) {
    console.log(`    📚 查询官方文档: ${tech}`);
    // 这里需要集成 Context7 MCP 或其他文档查询服务
    docs.push({
      tech,
      url: `https://docs.example.com/${tech}`,
      summary: `${tech} 官方文档摘要...`,
    });
  }

  return docs;
}

/**
 * 生成扩展内容（由 Claude 完成）
 */
async function generateExpandedContent(
  article: Article,
  relatedDocs: Array<{ url: string; title: string; summary: string }>,
  officialDocs: Array<{ tech: string; url: string; summary: string }>
): Promise<string> {
  // 这个函数的执行主体是 Claude Agent
  // Agent 需要根据原始文章、相关文档和官方文档
  // 生成完整的、可操作的落地方案

  return `# ${article.title}

## 完整实施方案

### 前置条件
- 环境：${article.techStack.join(', ')}

### 实施步骤
（由 Agent 根据内容生成详细步骤）

### 代码示例
\`\`\`
（由 Agent 生成可运行的代码示例）
\`\`\`
`;
}

/**
 * 生成 Markdown 文档
 */
function generateMarkdown(doc: ExpandedDoc): string {
  return `# ${doc.original.title}

> 📄 来源：${doc.original.url}
> 🕐 抓取：${new Date().toLocaleString('zh-CN')}
> 📚 扩展来源：${doc.relatedDocs.length + doc.officialDocs.length} 个

---

## 📋 文章概览

**原标题**：${doc.original.title}
${doc.original.metadata.author ? `**作者**：${doc.original.metadata.author}` : ''}
${doc.original.metadata.date ? `**发布时间**：${new Date(doc.original.metadata.date).toLocaleDateString('zh-CN')}` : ''}

### 原始内容摘要

${doc.original.content.substring(0, 500)}...

---

## 🔗 扩展资源

### 官方文档

${doc.officialDocs.map(d => `- **[${d.tech}](${d.url})** - ${d.summary}`).join('\n')}

### 相关资源

${doc.relatedDocs.map(d => `- [${d.title}](${d.url}) - ${d.summary}`).join('\n')}

---

${doc.expandedContent}

---

## 🛠️ 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| （由 Agent 填充） | | |

---

## 📚 延伸阅读

${doc.relatedDocs.map((d, i) => `${i + 1}. [${d.title}](${d.url})`).join('\n')}
`;
}

/**
 * 生成索引文件
 */
async function generateIndex(docs: ExpandedDoc[], outputDir: string): Promise<void> {
  const indexContent = `# 技术文档索引

生成时间：${new Date().toLocaleString('zh-CN')}
文档数量：${docs.length}

---

## 文档列表

${docs.map((doc, i) => {
  const number = (i + 1).toString().padStart(3, '0');
  const filename = `${number}-${sanitizeFilename(doc.original.title)}.md`;
  return `${i + 1}. [${doc.original.title}](${filename})`;
}).join('\n')}

---

## 技术栈统计

${getTechStackStats(docs)}
`;

  await writeFile(join(outputDir, 'index.md'), indexContent, 'utf-8');
}

/**
 * 获取技术栈统计
 */
function getTechStackStats(docs: ExpandedDoc[]): string {
  const techCount: Record<string, number> = {};

  for (const doc of docs) {
    for (const tech of doc.original.techStack) {
      techCount[tech] = (techCount[tech] || 0) + 1;
    }
  }

  const sorted = Object.entries(techCount).sort((a, b) => b[1] - a[1]);

  return sorted.map(([tech, count]) => `- **${tech}**：${count} 篇`).join('\n');
}

/**
 * 清理文件名
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .substring(0, 100);
}
