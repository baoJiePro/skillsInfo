/**
 * 文档生成模块
 *
 * 负责将收集到的所有信息整合成结构化的 Markdown 文档
 * 这个模块主要由 Claude Agent 调用，Agent 负责智能内容生成
 */

import type { TechStack } from './analyzer.js';
import type { TechDocument } from './docs-query.js';

export interface DocumentInput {
  // 原始文章信息
  url: string;
  title: string;
  content: string;
  author?: string;
  date?: string;
  description?: string;

  // 分析结果
  techStack: TechStack[];
  links: string[];

  // 扩展内容
  relatedDocs?: Array<{
    url: string;
    title: string;
    summary: string;
  }>;

  officialDocs?: Array<TechDocument>;
}

export interface GenerationOptions {
  includeOriginalContent?: boolean;
  includeRelatedDocs?: boolean;
  includeCodeExamples?: boolean;
  includeTroubleshooting?: boolean;
  template?: 'default' | 'minimal' | 'detailed';
}

/**
 * 生成完整的扩展文档
 *
 * 注意：这个函数由 Claude Agent 调用
 * Agent 会根据收集到的信息智能生成文档内容
 * 这里提供一个基础模板和结构
 */
export function generateDocument(input: DocumentInput, options: GenerationOptions = {}): string {
  const opts = {
    includeOriginalContent: true,
    includeRelatedDocs: true,
    includeCodeExamples: true,
    includeTroubleshooting: true,
    template: 'default',
    ...options,
  };

  const sections = [];

  // 标题
  sections.push(generateHeader(input));

  // 概览
  sections.push(generateOverview(input));

  // 技术栈
  sections.push(generateTechStackSection(input.techStack));

  // 扩展资源
  sections.push(generateResourcesSection(input));

  // 核心内容（由 Agent 填充）
  sections.push(generateCoreSection(input));

  // 故障排查
  if (opts.includeTroubleshooting) {
    sections.push(generateTroubleshootingSection(input));
  }

  // 延伸阅读
  sections.push(generateFurtherReading(input));

  return sections.join('\n\n---\n\n');
}

/**
 * 生成文档头部
 */
function generateHeader(input: DocumentInput): string {
  return `# ${input.title} - 完整落地方案

> 📄 来源：${input.url}
${input.author ? `> 👤 作者：${input.author}` : ''}
${input.date ? `> 📅 发布：${input.date}` : ''}
> 🕐 生成：${new Date().toLocaleString('zh-CN')}
${input.techStack.length > 0 ? `> 🔧 技术栈：${input.techStack.map(t => t.name).join(', ')}` : ''}`;
}

/**
 * 生成概览部分
 */
function generateOverview(input: DocumentInput): string {
  const sections = [];

  sections.push('## 📋 文章概览');

  if (input.description) {
    sections.push(`### 核心内容摘要`);
    sections.push(input.description);
  }

  if (input.techStack.length > 0) {
    sections.push(`### 涉及技术`);
    sections.push(generateTechStackTable(input.techStack));
  }

  return sections.join('\n\n');
}

/**
 * 生成技术栈表格
 */
function generateTechStackTable(techStack: TechStack[]): string {
  const rows = techStack.map(tech => {
    const category = getCategoryName(tech.category);
    const confidence = Math.round(tech.confidence * 100);
    return `| ${tech.name} | ${category} | ${confidence}% | ${tech.mentions} |`;
  });

  return `| 技术 | 类别 | 置信度 | 提及次数 |
|------|------|--------|---------|
${rows.join('\n')}`;
}

/**
 * 获取类别名称
 */
function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    'frontend-framework': '前端框架',
    'backend-framework': '后端框架',
    'database': '数据库',
    'cache': '缓存',
    'search': '搜索引擎',
    'message-queue': '消息队列',
    'container': '容器',
    'orchestration': '编排',
    'ci-cd': 'CI/CD',
    'cloud': '云服务',
    'language': '编程语言',
    'build-tool': '构建工具',
    'testing-framework': '测试框架',
    'other': '其他',
  };
  return names[category] || category;
}

/**
 * 生成技术栈详细说明
 */
function generateTechStackSection(techStack: TechStack[]): string {
  const sections = [];

  sections.push('## 🔧 技术栈详解');

  for (const tech of techStack) {
    sections.push(`### ${tech.name}`);
    sections.push(`- **类别**：${getCategoryName(tech.category)}`);
    sections.push(`- **置信度**：${Math.round(tech.confidence * 100)}%`);
    sections.push(`- **提及次数**：${tech.mentions}`);
    // Agent 应该在这里添加更多详细说明
  }

  return sections.join('\n\n');
}

/**
 * 生成扩展资源部分
 */
function generateResourcesSection(input: DocumentInput): string {
  const sections = [];

  sections.push('## 🔗 扩展资源');

  // 官方文档
  if (input.officialDocs && input.officialDocs.length > 0) {
    sections.push('### 官方文档');
    for (const doc of input.officialDocs) {
      sections.push(`- **[${doc.tech}](${doc.url})**${doc.summary ? ` - ${doc.summary}` : ''}`);
    }
  }

  // 相关资源
  if (input.relatedDocs && input.relatedDocs.length > 0) {
    sections.push('### 相关资源');
    for (const doc of input.relatedDocs) {
      sections.push(`- [${doc.title}](${doc.url})${doc.summary ? ` - ${doc.summary}` : ''}`);
    }
  }

  // 文章中的链接
  if (input.links && input.links.length > 0) {
    sections.push('### 参考链接');
    sections.push(input.links.slice(0, 10).map(link => `- ${link}`).join('\n'));
    if (input.links.length > 10) {
      sections.push(`\n_还有 ${input.links.length - 10} 个链接..._`);
    }
  }

  return sections.join('\n\n');
}

/**
 * 生成核心内容部分
 *
 * 注意：这部分主要由 Claude Agent 根据内容生成
 * 这里只提供基础结构
 */
function generateCoreSection(input: DocumentInput): string {
  return `## 完整实施方案

### 前置条件

<!-- Agent 根据技术栈和文章内容填写 -->

### 安装步骤

\`\`\`bash
# Agent 根据官方文档生成安装命令
\`\`\`

### 核心配置

\`\`\`yaml
# Agent 根据最佳实践生成配置示例
\`\`\`

### 代码实现

\`\`\`
# Agent 根据文档生成代码示例
\`\`\`

### 验证方法

\`\`\`bash
# Agent 生成验证命令
\`\`\`

---

> 📚 以上内容由 Claude Agent 根据原文和官方文档生成
`;
}

/**
 * 生成故障排查部分
 */
function generateTroubleshootingSection(input: DocumentInput): string {
  return `## 🛠️ 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
<!-- Agent 根据常见问题填充 -->`;
}

/**
 * 生成延伸阅读部分
 */
function generateFurtherReading(input: DocumentInput): string {
  const sections = [];

  sections.push('## 📚 延伸阅读');

  if (input.relatedDocs && input.relatedDocs.length > 0) {
    sections.push(input.relatedDocs.map((doc, i) =>
      `${i + 1}. [${doc.title}](${doc.url})`
    ).join('\n'));
  }

  sections.push('\n---');
  sections.push('\n> 📚 本文档由 Tech Doc Expander 自动生成');
  sections.push('> 🤖 由 Claude Agent 扩展和完善');

  return sections.join('\n');
}

/**
 * 生成索引文件
 */
export function generateIndexIndex(options: {
  title: string;
  description: string;
  docs: Array<{
    filename: string;
    title: string;
    date?: string;
    techStack: string[];
  }>;
}): string {
  const sections = [];

  sections.push(`# ${options.title}`);
  sections.push(`\n> ${options.description}`);
  sections.push(`\n> 🕐 生成时间：${new Date().toLocaleString('zh-CN')}`);
  sections.push(`\n> 📄 文档数量：${options.docs.length}`);

  sections.push('\n---');
  sections.push('\n## 文档列表');

  sections.push(options.docs.map((doc, i) => {
    const meta: string[] = [];
    if (doc.date) meta.push(doc.date);
    if (doc.techStack.length > 0) meta.push(doc.techStack.map(t => `\`${t}\``).join(' '));

    return `${i + 1}. [${doc.title}](${doc.filename})${meta.length > 0 ? `\n   <small>${meta.join(' · ')}</small>` : ''}`;
  }).join('\n\n'));

  // 技术栈统计
  const techCount = new Map<string, number>();
  for (const doc of options.docs) {
    for (const tech of doc.techStack) {
      techCount.set(tech, (techCount.get(tech) || 0) + 1);
    }
  }

  if (techCount.size > 0) {
    sections.push('\n---');
    sections.push('\n## 技术栈分布');

    const sorted = Array.from(techCount.entries()).sort((a, b) => b[1] - a[1]);
    sections.push(sorted.map(([tech, count]) => `- **${tech}**：${count} 篇`).join('\n'));
  }

  sections.push('\n---');
  sections.push('\n> 🤖 本索引由 Tech Doc Expander 自动生成');

  return sections.join('\n');
}

/**
 * 清理文件名
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-.]/g, '')
    .substring(0, 100);
}
