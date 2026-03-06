/**
 * 官方文档查询模块
 *
 * 集成 Context7 MCP 进行官方文档查询
 * 当 MCP 不可用时，使用预设的官方文档映射
 */

import type { AppConfig } from './config.js';

export interface TechDocument {
  tech: string;
  libraryId?: string;
  url: string;
  summary: string;
  content?: string;
  examples?: string[];
  apis?: string[];
}

export interface DocsQueryResult {
  tech: string;
  docs: TechDocument[];
  source: 'mcp' | 'mapping' | 'fallback';
}

/**
 * 查询技术栈的官方文档
 */
export async function queryOfficialDocs(
  techStack: string[],
  config: AppConfig
): Promise<DocsQueryResult[]> {
  const results: DocsQueryResult[] = [];

  for (const tech of techStack) {
    try {
      // 方法 1: 尝试使用 Context7 MCP（由 Agent 调用）
      const mcpResult = await tryContext7MCP(tech);
      if (mcpResult) {
        results.push(mcpResult);
        continue;
      }

      // 方法 2: 使用预设的文档映射
      const mappingResult = await useMapping(tech, config);
      if (mappingResult) {
        results.push(mappingResult);
        continue;
      }

      // 方法 3: 使用备选搜索
      const fallbackResult = await useFallbackSearch(tech);
      if (fallbackResult) {
        results.push(fallbackResult);
      }
    } catch (error) {
      console.warn(`查询 ${tech} 官方文档失败: ${(error as Error).message}`);
    }
  }

  return results;
}

/**
 * 方法 1: Context7 MCP 查询（由 Agent 执行）
 *
 * 注意：这个函数的实际执行需要通过 Claude Agent 调用 MCP 工具
 * 这里只是一个占位符，实际调用在 Agent 层
 */
async function tryContext7MCP(tech: string): Promise<DocsQueryResult | null> {
  // 实际实现中，这会由 Agent 调用：
  // mcp__context7__resolve-library-id + mcp__context7__query-docs

  return null; // 由 Agent 处理
}

/**
 * 方法 2: 使用预设的文档映射
 */
async function useMapping(tech: string, config: AppConfig): Promise<DocsQueryResult | null> {
  const mappings = config.official_docs.mappings;

  // 尝试精确匹配
  if (mappings[tech]) {
    return {
      tech,
      docs: [{
        tech,
        url: mappings[tech],
        summary: `${tech} 官方文档`,
        source: 'mapping',
      }],
      source: 'mapping',
    };
  }

  // 尝试模糊匹配
  for (const [key, url] of Object.entries(mappings)) {
    if (tech.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(tech.toLowerCase())) {
      return {
        tech,
        docs: [{
          tech,
          url,
          summary: `${tech} 官方文档`,
          source: 'mapping',
        }],
        source: 'mapping',
      };
    }
  }

  return null;
}

/**
 * 方法 3: 备选搜索（使用 WebSearch）
 */
async function useFallbackSearch(tech: string): Promise<DocsQueryResult | null> {
  // 这里可以集成 WebSearch MCP
  // 实际实现中会由 Agent 调用搜索工具

  // 返回一些常见的官方文档 URL
  const commonDocs: Record<string, string> = {
    'openclaw': 'https://github.com/win4r/team-tasks',
    'ssh': 'https://www.openssh.com/manual.html',
    'docker': 'https://docs.docker.com',
    'kubernetes': 'https://kubernetes.io/docs',
    'redis': 'https://redis.io/docs',
    'nginx': 'https://nginx.org/en/docs/',
    'mongodb': 'https://www.mongodb.com/docs',
    'mysql': 'https://dev.mysql.com/doc',
    'postgresql': 'https://www.postgresql.org/docs',
    'graphql': 'https://graphql.org/learn',
    'grpc': 'https://grpc.io/docs',
    'protobuf': 'https://protobuf.dev',
    'terraform': 'https://developer.hashicorp.com/terraform',
    'ansible': 'https://docs.ansible.com',
  };

  const url = commonDocs[tech.toLowerCase()];
  if (url) {
    return {
      tech,
      docs: [{
        tech,
        url,
        summary: `${tech} 官方文档`,
        source: 'fallback',
      }],
      source: 'fallback',
    };
  }

  return null;
}

/**
 * 技术栈识别和规范化
 */
export function normalizeTechName(tech: string): string {
  const normalizations: Record<string, string> = {
    'reactjs': 'react',
    'react.js': 'react',
    'vuejs': 'vue',
    'vue.js': 'vue',
    'nextjs': 'nextjs',
    'next.js': 'nextjs',
    'nuxtjs': 'nuxt',
    'nuxt.js': 'nuxt',
    'nodejs': 'node',
    'node.js': 'node',
    'typescript': 'ts',
    'javascript': 'js',
    'docker': 'docker',
    'k8s': 'kubernetes',
    'kubernetes': 'kubernetes',
    'openssh': 'ssh',
    'aws': 'amazon-web-services',
  };

  const normalized = normalizations[tech.toLowerCase()];
  return normalized || tech.toLowerCase();
}

/**
 * 批量查询优化
 *
 * 对相似的技术栈进行批量查询，减少重复请求
 */
export async function batchQueryDocs(
  techStack: string[],
  config: AppConfig
): Promise<Map<string, TechDocument[]>> {
  const results = new Map<string, TechDocument[]>();

  // 去重
  const uniqueTechs = [...new Set(techStack.map(normalizeTechName))];

  // 批量查询
  const queryResults = await queryOfficialDocs(uniqueTechs, config);

  // 整理结果
  for (const result of queryResults) {
    results.set(result.tech, result.docs);
  }

  return results;
}

/**
 * 获取技术栈的安装指南
 */
export async function getInstallGuide(tech: string, config: AppConfig): Promise<string | null> {
  const docs = await queryOfficialDocs([tech], config);
  if (docs.length === 0 || docs[0].docs.length === 0) {
    return null;
  }

  const doc = docs[0].docs[0];

  // 返回安装指南的 URL 和说明
  return `
安装指南请参考官方文档：${doc.url}

## 快速安装

\`\`\`bash
# ${tech} 安装命令
# （请根据官方文档更新）
\`\`\`

> 详细安装步骤请访问：${doc.url}
  `.trim();
}

/**
 * 获取技术栈的配置示例
 */
export async function getConfigExample(tech: string, config: AppConfig): Promise<string | null> {
  const docs = await queryOfficialDocs([tech], config);
  if (docs.length === 0 || docs[0].docs.length === 0) {
    return null;
  }

  const doc = docs[0].docs[0];

  return `
## ${tech} 配置示例

\`\`\`yaml
# ${tech} 配置文件示例
# （请根据官方文档更新）
\`\`\`

> 配置详情请参考：${doc.url}
  `.trim();
}
