/**
 * 发现器 - 批量发现模式
 *
 * 从技术博客自动发现相关文章并批量生成文档
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Config } from './config.js';
import { fetchArticle, type Article } from './expander.js';

export interface DiscoveredArticle {
  url: string;
  title: string;
  publishedAt?: string;
  tags?: string[];
}

/**
 * 批量发现模式
 */
export async function discover(config: Config): Promise<void> {
  console.log(`🔍 从 ${config.source} 发现文章...\n`);
  console.log(`📌 过滤条件：${config.filter?.join(', ') || config.tag || '无'}`);
  console.log(`📁 输出目录：${config.output}\n`);

  // 创建输出目录
  if (!existsSync(config.output)) {
    await mkdir(config.output, { recursive: true });
  }

  // 1. 发现文章列表
  console.log('📋 正在发现文章列表...');
  const articles = await discoverArticles(config);
  console.log(`  ✅ 发现 ${articles.length} 篇文章\n`);

  if (articles.length === 0) {
    console.log('⚠️  未发现匹配的文章');
    return;
  }

  // 2. 批量处理文章
  const results = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const number = (i + 1).toString().padStart(3, '0');

    console.log(`\n[${i + 1}/${articles.length}] 处理: ${article.title}`);

    try {
      // 使用 baoyu-url-to-markdown 或其他方式抓取
      const content = await fetchArticle(article.url, false);

      // 生成文件名
      const filename = `${number}-${sanitizeFilename(article.title)}.md`;
      const filepath = join(config.output, filename);

      // 保存原始内容
      const markdown = generateDiscoveredMarkdown(article, content);
      await writeFile(filepath, markdown, 'utf-8');

      console.log(`  ✅ 已生成: ${filename}`);
      results.push({ article, content, filename });
    } catch (error) {
      console.error(`  ❌ 处理失败: ${(error as Error).message}`);
    }
  }

  // 3. 生成索引
  if (results.length > 0) {
    await generateDiscoveryIndex(results, config);
    console.log(`\n📚 已生成索引文件: index.md`);
  }

  console.log(`\n✨ 完成！生成了 ${results.length} 个文档`);
}

/**
 * 发现文章列表
 */
async function discoverArticles(config: Config): Promise<DiscoveredArticle[]> {
  const articles: DiscoveredArticle[] = [];
  const baseUrl = config.source!;

  // 1. 尝试解析页面，发现文章列表
  console.log('  🌐 正在解析页面...');

  // 根据不同的博客平台使用不同的发现策略
  const platform = detectPlatform(baseUrl);
  console.log(`  📱 检测到平台：${platform}`);

  const discovered = await discoverByPlatform(platform, baseUrl, config);

  // 2. 应用过滤条件
  const filtered = filterArticles(discovered, config);
  console.log(`  🔍 过滤后：${filtered.length} 篇`);

  // 3. 应用数量限制
  const limited = filtered.slice(0, config.maxArticles);
  console.log(`  ✂️  限制后：${limited.length} 篇`);

  articles.push(...limited);

  return articles;
}

/**
 * 检测博客平台
 */
function detectPlatform(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  // 已知平台检测
  const platforms: Record<string, RegExp> = {
    'WordPress': /wordpress|wp\.com/,
    'Ghost': /ghost\.io/,
    'Medium': /medium\.com/,
    '掘金': /juejin\.cn/,
    '知乎': /zhihu\.com/,
    'CSDN': /csdn\.net/,
    'SegmentFault': /segmentfault\.com/,
    'Dev.to': /dev\.to/,
    'Hashnode': /hashnode\.dev/,
    'VuePress': /vuepress/,
    'VitePress': /vitepress/,
    'Docusaurus': /docusaurus/,
    'Hugo': /gohugo\.io/,
    'Hexo': /hexo\.io/,
  };

  for (const [name, pattern] of Object.entries(platforms)) {
    if (pattern.test(hostname)) {
      return name;
    }
  }

  return '通用';
}

/**
 * 根据平台发现文章
 */
async function discoverByPlatform(
  platform: string,
  baseUrl: string,
  config: Config
): Promise<DiscoveredArticle[]> {
  // 这里需要实际抓取页面并解析
  // 简化实现：返回模拟数据

  const commonPaths: Record<string, string[]> = {
    'WordPress': ['/feed/', '/sitemap.xml'],
    'Ghost': ['/rss/', '/sitemap.xml'],
    'Medium': ['/feed', '/sitemap.xml'],
    '掘金': ['/api/articles', '/tag/' + (config.tag || config.filter?.[0])],
    '知乎': ['/rss', '/column/' + (config.tag || '')],
    'CSDN': ['/rss', '/article/list/'],
    '通用': ['/sitemap.xml', '/rss', '/feed', '/atom.xml', '/archives'],
  };

  const paths = commonPaths[platform] || commonPaths['通用'];

  // 尝试从多个路径发现
  const articles: DiscoveredArticle[] = [];

  for (const path of paths) {
    try {
      const url = new URL(path, baseUrl).toString();
      console.log(`    🔎 尝试: ${url}`);

      // 这里需要实际抓取和解析
      // const discovered = await discoverFromUrl(url, config);
      // articles.push(...discovered);

      // 简化：添加模拟数据
      articles.push(
        {
          url: `${baseUrl}/article/1`,
          title: '示例文章 1',
          publishedAt: '2024-01-01',
          tags: config.filter,
        },
        {
          url: `${baseUrl}/article/2`,
          title: '示例文章 2',
          publishedAt: '2024-01-02',
          tags: config.filter,
        }
      );

      break; // 找到结果就停止
    } catch (error) {
      console.warn(`    ⚠️  失败: ${(error as Error).message}`);
    }
  }

  return articles;
}

/**
 * 过滤文章
 */
function filterArticles(articles: DiscoveredArticle[], config: Config): DiscoveredArticle[] {
  let filtered = articles;

  // 关键词过滤
  if (config.filter && config.filter.length > 0) {
    filtered = filtered.filter(article => {
      const searchText = `${article.title} ${article.tags?.join(' ') || ''}`.toLowerCase();
      return config.filter!.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  }

  // 标签过滤
  if (config.tag) {
    filtered = filtered.filter(article =>
      article.tags?.some(tag => tag.toLowerCase() === config.tag!.toLowerCase())
    );
  }

  // 日期过滤
  if (config.after) {
    filtered = filtered.filter(article => {
      if (!article.publishedAt) return true;
      return new Date(article.publishedAt) >= config.after!;
    });
  }

  if (config.before) {
    filtered = filtered.filter(article => {
      if (!article.publishedAt) return true;
      return new Date(article.publishedAt) <= config.before!;
    });
  }

  return filtered;
}

/**
 * 生成发现的文档
 */
function generateDiscoveredMarkdown(article: DiscoveredArticle, content: Article): string {
  return `# ${article.title}

> 📄 来源：${article.url}
> 🕐 发布：${article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('zh-CN') : '未知'}
> 🕐 抓取：${new Date().toLocaleString('zh-CN')}
${article.tags ? `> 🏷️  标签：${article.tags.join(', ')}` : ''}

---

## 📋 原始内容

${content.content}

---

## 🔗 相关链接

${content.links.map(link => `- ${link}`).join('\n')}

---

## 🛠️ 技术栈

${content.techStack.map(tech => `- \`${tech}\``).join('\n')}

---

> 📚 本文档由 Tech Doc Expander 自动生成
`;
}

/**
 * 生成发现模式索引
 */
async function generateDiscoveryIndex(
  results: Array<{ article: DiscoveredArticle; content: Article; filename: string }>,
  config: Config
): Promise<void> {
  const tag = config.tag || config.filter?.[0] || 'all';

  const indexContent = `# ${tag} 技术文档索引

> 📚 从 ${config.source} 自动发现并生成
> 🕐 生成时间：${new Date().toLocaleString('zh-CN')}
> 📄 文档数量：${results.length}

---

## 文档列表

${results.map((r, i) => {
  const meta: string[] = [];
  if (r.article.publishedAt) {
    meta.push(new Date(r.article.publishedAt).toLocaleDateString('zh-CN'));
  }
  if (r.article.tags) {
    meta.push(r.article.tags.map(t => `\`${t}\``).join(' '));
  }

  return `${i + 1}. [${r.article.title}](${r.filename})
   ${meta.length > 0 ? `<br><small>${meta.join(' · ')}</small>` : ''}`;
}).join('\n\n')}

---

## 统计信息

### 技术栈分布

${getTechStackDistribution(results)}

### 时间分布

${getTimeDistribution(results)}

---

> 🤖 本索引由 Tech Doc Expander 自动生成
`;

  await writeFile(join(config.output, 'index.md'), indexContent, 'utf-8');
}

/**
 * 获取技术栈分布
 */
function getTechStackDistribution(
  results: Array<{ article: DiscoveredArticle; content: Article; filename: string }>
): string {
  const techCount: Record<string, number> = {};

  for (const { content } of results) {
    for (const tech of content.techStack) {
      techCount[tech] = (techCount[tech] || 0) + 1;
    }
  }

  if (Object.keys(techCount).length === 0) {
    return '_暂无数据_';
  }

  const sorted = Object.entries(techCount).sort((a, b) => b[1] - a[1]);

  return sorted.map(([tech, count]) => `- **${tech}**：${count} 篇`).join('\n');
}

/**
 * 获取时间分布
 */
function getTimeDistribution(
  results: Array<{ article: DiscoveredArticle; content: Article; filename: string }>
): string {
  const monthCount: Record<string, number> = {};

  for (const { article } of results) {
    if (!article.publishedAt) continue;

    const date = new Date(article.publishedAt);
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    monthCount[key] = (monthCount[key] || 0) + 1;
  }

  if (Object.keys(monthCount).length === 0) {
    return '_暂无数据_';
  }

  const sorted = Object.entries(monthCount).sort();

  return sorted.map(([month, count]) => `- **${month}**：${count} 篇`).join('\n');
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

// 导出 Article 类型供 discover.ts 使用
export type { Article };
