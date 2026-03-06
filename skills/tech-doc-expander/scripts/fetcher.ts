/**
 * 网页内容抓取模块
 *
 * 集成多种抓取方式：
 * 1. MCP Web Reader - 通用网页抓取
 * 2. baoyu-url-to-markdown - Chrome CDP 渲染（如已安装）
 * 3. markdown.new 服务 - 轻量级转换
 */

import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';

export interface FetchResult {
  url: string;
  title: string;
  content: string;
  author?: string;
  date?: string;
  description?: string;
  links: string[];
  images: string[];
}

export interface FetchOptions {
  waitMode?: boolean;
  timeout?: number;
  downloadMedia?: boolean;
}

/**
 * 抓取网页内容（智能选择最佳方式）
 */
export async function fetchWebPage(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  // 方法 1: 尝试使用 baoyu-url-to-markdown（如果已安装）
  const baoyuResult = await tryBaoyuFetch(url, options);
  if (baoyuResult) {
    return baoyuResult;
  }

  // 方法 2: 使用 MCP Web Reader
  const mcpResult = await tryMcpFetch(url, options);
  if (mcpResult) {
    return mcpResult;
  }

  // 方法 3: 最后使用 markdown.new 服务
  return await tryMarkdownNewFetch(url, options);
}

/**
 * 方法 1: 尝试使用 baoyu-url-to-markdown
 */
async function tryBaoyuFetch(url: string, options: FetchOptions): Promise<FetchResult | null> {
  const baoyuPath = `${process.env.HOME}/.claude/skills/baoyu-url-to-markdown`;

  if (!existsSync(baoyuPath)) {
    return null;
  }

  try {
    const tempFile = `/tmp/tech-doc-expander-${randomUUID()}.md`;
    const args = [];

    if (options.waitMode) args.push('--wait');
    if (options.timeout) args.push(`--timeout ${options.timeout}`);

    const command = `bun ${baoyuPath}/scripts/main.ts "${url}" -o ${tempFile} ${args.join(' ')}`;

    // 使用 Bun 或 Node.js 执行
    const runner = process.env.BUN ? process.env.BUN : 'node';
    // 注意：这里需要实际执行，暂时返回 null
    // 实际实现中会使用 execSync 或类似方法

    return null;
  } catch (error) {
    console.warn(`baoyu-url-to-markdown 抓取失败: ${(error as Error).message}`);
    return null;
  }
}

/**
 * 方法 2: 使用 MCP Web Reader
 */
async function tryMcpFetch(url: string, options: FetchOptions): Promise<FetchResult | null> {
  try {
    // 这个函数会由 Claude Agent 调用 MCP 工具
    // 这里只是一个占位符，实际调用在 Agent 层
    return null;
  } catch (error) {
    console.warn(`MCP Web Reader 抓取失败: ${(error as Error).message}`);
    return null;
  }
}

/**
 * 方法 3: 使用 markdown.new 服务
 */
async function tryMarkdownNewFetch(url: string, options: FetchOptions): Promise<FetchResult | null> {
  try {
    // markdown.new URL 格式
    const markdownUrl = `https://markdown.new/${url}`;

    // 这个也需要通过 HTTP 调用
    // 实际实现中会使用 fetch 或类似方法
    return null;
  } catch (error) {
    console.warn(`markdown.new 抓取失败: ${(error as Error).message}`);
    return null;
  }
}

/**
 * 从 Markdown 内容中提取元数据
 */
export function extractMetadata(markdown: string, url: string): Partial<FetchResult> {
  const result: Partial<FetchResult> = {
    url,
    links: extractLinks(markdown),
    images: extractImages(markdown),
  };

  // 提取标题
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // 提取作者（从常见格式）
  const authorPatterns = [
    /作者[：:]\s*(.+?)(?:\n|$)/,
    /By\s+(.+?)(?:\n|$)/,
    /author[：:]\s*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of authorPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      result.author = match[1].trim();
      break;
    }
  }

  // 提取日期
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{4}\/\d{2}\/\d{2})/,
    /(\d{4}年\d{1,2}月\d{1,2}日)/,
  ];

  for (const pattern of datePatterns) {
    const match = markdown.match(pattern);
    if (match) {
      result.date = match[1];
      break;
    }
  }

  // 提取描述（从引用块或开头）
  const descMatch = markdown.match(/^>\s*(.+)$/m);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  return result;
}

/**
 * 提取链接
 */
export function extractLinks(content: string): string[] {
  const linkPatterns = [
    /https?:\/\/[^\s\)\]]+/g,
    /\[([^\]]+)\]\(([^)]+)\)/g,
  ];

  const links = new Set<string>();

  for (const pattern of linkPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const url = match[2] || match[0];
      if (isValidUrl(url)) {
        links.add(url);
      }
    }
  }

  return Array.from(links);
}

/**
 * 提取图片
 */
export function extractImages(content: string): string[] {
  const patterns = [
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    /<img[^>]+src=["']([^"']+)["']/gi,
  ];

  const images = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const url = match[2] || match[1];
      if (isValidUrl(url)) {
        images.add(url);
      }
    }
  }

  return Array.from(images);
}

/**
 * 验证 URL 格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 清理 Markdown 内容
 */
export function cleanMarkdown(markdown: string): string {
  return markdown
    // 移除多余的空行
    .replace(/\n{3,}/g, '\n\n')
    // 清理 HTML 标签（保留 img）
    .replace(/<(?!img\s|\/img\s).*?>/gi, '')
    // 统一标题层级
    .replace(/^#{1,6}\s+/gm, (match) => match.trim())
    .trim();
}
