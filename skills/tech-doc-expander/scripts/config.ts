/**
 * 配置管理模块
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface Config {
  mode: 'batch' | 'discover';
  urls?: string[];
  source?: string;
  filter?: string[];
  tag?: string;
  output: string;
  maxDepth?: number;
  maxArticles?: number;
  concurrent?: number;
  enableOfficialDocs?: boolean;
  downloadMedia?: boolean;
  waitMode?: boolean;
  after?: Date;
  before?: Date;
  listPage?: string;
}

export interface AppConfig {
  discovery: {
    max_articles: number;
    max_depth: number;
    concurrent: number;
    list_pages: string[];
    article_patterns: string[];
  };
  filters: {
    keywords: string[];
    tags: string[];
    exclude_keywords: string[];
  };
  content: {
    max_depth: number;
    download_media: boolean;
    extract_code: boolean;
    extract_images: boolean;
  };
  output: {
    directory: string;
    filename_template: string;
    generate_index: boolean;
    template: string;
  };
  official_docs: {
    mappings: Record<string, string>;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  discovery: {
    max_articles: 50,
    max_depth: 2,
    concurrent: 5,
    list_pages: ['/archives', '/posts', '/'],
    article_patterns: ['/posts/*', '/article/*', '/p/*'],
  },
  filters: {
    keywords: [],
    tags: [],
    exclude_keywords: ['广告', '推广', 'sponsored'],
  },
  content: {
    max_depth: 2,
    download_media: false,
    extract_code: true,
    extract_images: false,
  },
  output: {
    directory: './output',
    filename_template: '{number:03d}-{title}.md',
    generate_index: true,
    template: 'default',
  },
  official_docs: {
    mappings: {
      react: 'https://react.dev',
      'react-dom': 'https://react.dev/reference/react-dom',
      vue: 'https://vuejs.org',
      'vue-router': 'https://router.vuejs.org',
      nextjs: 'https://nextjs.org/docs',
      nuxt: 'https://nuxt.com/docs',
      node: 'https://nodejs.org/docs',
      typescript: 'https://www.typescriptlang.org/docs',
      javascript: 'https://developer.mozilla.org/docs/Web/JavaScript',
      docker: 'https://docs.docker.com',
      kubernetes: 'https://kubernetes.io/docs',
      postgresql: 'https://www.postgresql.org/docs',
      mongodb: 'https://www.mongodb.com/docs',
      redis: 'https://redis.io/docs',
      python: 'https://docs.python.org',
      'django': 'https://docs.djangoproject.com',
      fastapi: 'https://fastapi.tiangolo.com',
      go: 'https://go.dev/doc',
      rust: 'https://doc.rust-lang.org',
      tailwind: 'https://tailwindcss.com/docs',
      vite: 'https://vitejs.dev/guide',
      webpack: 'https://webpack.js.org/guides',
      babel: 'https://babeljs.io/docs',
      jest: 'https://jestjs.io/docs',
      vitest: 'https://vitest.dev/guide',
      playwright: 'https://playwright.dev/docs',
      cypress: 'https://docs.cypress.io',
      express: 'https://expressjs.com',
      koa: 'https://koajs.com',
      nestjs: 'https://docs.nestjs.com',
      prisma: 'https://www.prisma.io/docs',
      drizzle: 'https://orm.drizzle.team/docs/overview',
      graphql: 'https://graphql.org/learn',
      apollo: 'https://www.apollographql.com/docs',
      aws: 'https://docs.aws.amazon.com',
      vercel: 'https://vercel.com/docs',
      supabase: 'https://supabase.com/docs',
      firebase: 'https://firebase.google.com/docs',
      openai: 'https://platform.openai.com/docs',
      anthropic: 'https://docs.anthropic.com',
      langchain: 'https://python.langchain.com/docs',
      'langchain-js': 'https://js.langchain.com/docs',
    },
  },
};

const CONFIG_PATHS = [
  join(process.cwd(), '.tech-doc-expander.yaml'),
  join(homedir(), '.tech-doc-expander.yaml'),
];

/**
 * 加载配置文件
 */
export async function loadConfig(init = false): Promise<AppConfig> {
  // 如果初始化，创建默认配置文件
  if (init) {
    const configPath = CONFIG_PATHS[0];
    writeFileSync(configPath, generateYaml(DEFAULT_CONFIG), 'utf-8');
    return DEFAULT_CONFIG;
  }

  // 查找配置文件
  for (const path of CONFIG_PATHS) {
    if (existsSync(path)) {
      return parseConfig(readFileSync(path, 'utf-8'));
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * 解析 YAML 配置
 */
function parseConfig(yamlContent: string): AppConfig {
  // 简单的 YAML 解析（生产环境应使用专业库）
  const config = { ...DEFAULT_CONFIG };

  const lines = yamlContent.split('\n');
  let currentSection: string | null = null;
  let currentSubSection: string | null = null;
  let indentLevel = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过注释和空行
    if (trimmed.startsWith('#') || trimmed === '') continue;

    // 检测缩进级别
    const indent = line.search(/\S/);

    // 顶层 section
    if (indent === 0 && trimmed.endsWith(':')) {
      currentSection = trimmed.slice(0, -1).toLowerCase();
      currentSubSection = null;
      continue;
    }

    // 子 section
    if (indent === 2 && trimmed.endsWith(':')) {
      currentSubSection = trimmed.slice(0, -1).toLowerCase();
      continue;
    }

    // 键值对
    const match = trimmed.match(/^(\w+):\s*(.+)$/);
    if (match && currentSection) {
      const [, key, value] = match;
      const typedValue = parseValue(value);

      if (currentSubSection && config[currentSection as keyof AppConfig]) {
        (config[currentSection as keyof AppConfig] as any)[currentSubSection] = {
          ...(config[currentSection as keyof AppConfig] as any)[currentSubSection],
          [key]: typedValue,
        };
      } else {
        (config[currentSection as keyof AppConfig] as any)[key] = typedValue;
      }
    }
  }

  return config;
}

/**
 * 解析值类型
 */
function parseValue(value: string): any {
  // 布尔值
  if (value === 'true') return true;
  if (value === 'false') return false;

  // 数字
  const num = Number(value);
  if (!isNaN(num)) return num;

  // 数组
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(s => s.trim());
  }

  // 字符串
  return value.replace(/^["']|["']$/g, '');
}

/**
 * 生成 YAML 配置文件内容
 */
function generateYaml(config: AppConfig): string {
  return `# Tech Doc Expander 配置文件
# 详细说明：https://github.com/your-repo/tech-doc-expander

# 发现模式配置
discovery:
  max_articles: ${config.discovery.max_articles}        # 最多发现文章数
  max_depth: ${config.discovery.max_depth}              # 发现深度
  concurrent: ${config.discovery.concurrent}           # 并发数
  list_pages:                 # 文章列表页面模式
    - "/archives"
    - "/posts"
    - "/"
  article_patterns:            # 文章 URL 模式
    - "/posts/*"
    - "/article/*"
    - "/p/*"

# 过滤配置
filters:
  keywords: []                # 关键词匹配（标题或内容）
  tags: []                    # 标签过滤
  exclude_keywords:           # 排除关键词
    - "广告"
    - "推广"
    - "sponsored"

# 内容抓取配置
content:
  max_depth: ${config.content.max_depth}
  download_media: ${config.content.download_media}
  extract_code: ${config.content.extract_code}
  extract_images: ${config.content.extract_images}

# 文档生成配置
output:
  directory: "${config.output.directory}"
  filename_template: "${config.output.filename_template}"
  generate_index: ${config.output.generate_index}
  template: "${config.output.template}"

# 官方文档映射
official_docs:
  mappings:
    react: "https://react.dev"
    vue: "https://vuejs.org"
    nextjs: "https://nextjs.org/docs"
    node: "https://nodejs.org/docs"
    typescript: "https://www.typescriptlang.org/docs"
    docker: "https://docs.docker.com"
    kubernetes: "https://kubernetes.io/docs"
    # 更多映射请查阅文档
`;
}

/**
 * 获取技能目录路径
 */
export function getSkillDir(): string {
  // 从脚本路径推断技能目录
  return dirname(new URL(import.meta.url).pathname);
}
