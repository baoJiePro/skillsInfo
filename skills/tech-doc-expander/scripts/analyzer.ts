/**
 * 技术栈分析模块
 *
 * 智能识别文章中的技术栈、框架、工具
 */

export interface TechStack {
  name: string;
  category: TechCategory;
  version?: string;
  confidence: number; // 0-1
  mentions: number; // 在文章中出现的次数
}

export type TechCategory =
  | 'frontend-framework'
  | 'backend-framework'
  | 'database'
  | 'cache'
  | 'search'
  | 'message-queue'
  | 'container'
  | 'orchestration'
  | 'ci-cd'
  | 'cloud'
  | 'language'
  | 'build-tool'
  | 'testing-framework'
  | 'other';

/**
 * 技术栈识别规则
 */
const TECH_PATTERNS: Record<string, RegExp[]> = {
  // 前端框架
  'React': [
    /\bReact\b/i,
    /\bJSX\b/i,
    /\buseState\b/,
    /\buseEffect\b/,
    /\bNext\.js\b/i,
  ],
  'Vue': [
    /\bVue\b/i,
    /\bv-model\b/i,
    /\bVue\.component\b/,
    /\bNuxt\.js\b/i,
  ],
  'Angular': [
    /\bAngular\b/i,
    /\b@Component\b/,
    /\b@Input\b/,
    /\bNgModule\b/,
  ],
  'Svelte': [
    /\bSvelte\b/i,
    /\bsvelte\b/i,
  ],

  // 后端框架
  'Express': [
    /\bExpress\b/i,
    /\bexpress\(/,
    /\bapp\.get\(/,
    /\bapp\.post\(/,
  ],
  'NestJS': [
    /\bNestJS\b/i,
    /\b@Controller\b/,
    /\b@Get\b/,
    /\b@Post\b/,
  ],
  'Django': [
    /\bDjango\b/i,
    /\bdjango-admin\b/,
    /\bmodels\.Model\b/,
  ],
  'FastAPI': [
    /\bFastAPI\b/i,
    /\b@app\.(get|post)\b/,
    /\bpydantic\b/i,
  ],
  'Spring Boot': [
    /\bSpring\s*Boot\b/i,
    /\b@SpringBootApplication\b/,
    /\b@RestController\b/,
  ],
  'Flask': [
    /\bFlask\b/i,
    /\b@app\.route\b/,
  ],
  'Go Gin': [
    /\bGin\b/i,
    /\bgin\.Default\(\)/,
    /\bgin\.GET\(/,
  ],

  // 数据库
  'PostgreSQL': [
    /\bPostgreSQL?\b/i,
    /\bPostgres\b/i,
    /\bpg_\w+/,
  ],
  'MySQL': [
    /\bMySQL?\b/i,
    /\bmysql_/,
  ],
  'MongoDB': [
    /\bMongoDB?\b/i,
    /\bmongoose\b/,
    /\bdb\.collection\(/,
  ],
  'Redis': [
    /\bRedis\b/i,
    /\bredis\./,
    /\bSET\s+/,
  ],
  'SQLite': [
    /\bSQLite\b/i,
    /\bsqlite3\b/,
  ],

  // 搜索引擎
  'Elasticsearch': [
    /\bElasticsearch?\b/i,
    /\bElastic\s*Search\b/i,
    /\b@elastic\b/i,
  ],
  'Meilisearch': [
    /\bMeilisearch\b/i,
  ],

  // 消息队列
  'Kafka': [
    /\bKafka\b/i,
    /\b@kafkajs\b/,
  ],
  'RabbitMQ': [
    /\bRabbitMQ\b/i,
    /\bamqplib\b/,
  ],
  'AWS SQS': [
    /\bSQS\b/i,
    /\b@aws-sdk\b/,
  ],

  // 容器化
  'Docker': [
    /\bDocker\b/i,
    /\bDockerfile\b/,
    /\bdocker-compose\b/,
    /\bFROM\s+\w+/,
  ],
  'Podman': [
    /\bPodman\b/i,
  ],

  // 编排
  'Kubernetes': [
    /\bKubernetes?\b/i,
    /\bK8s\b/i,
    /\bDeployment\b/,
    /\bService\b/,
    /\bkubectl\b/,
  ],
  'Docker Swarm': [
    /\bDocker\s*Swarm\b/i,
  ],

  // CI/CD
  'GitHub Actions': [
    /\bGitHub\s*Actions\b/i,
    /\.github\/workflows\//,
  ],
  'Jenkins': [
    /\bJenkins\b/i,
    /\bJenkinsfile\b/,
  ],
  'GitLab CI': [
    /\bGitLab\s*CI\b/i,
    /\.gitlab-ci\.yml/,
  ],
  'Travis CI': [
    /\bTravis\s*CI\b/i,
    /\.travis\.yml/,
  ],

  // 云服务
  'AWS': [
    /\bAWS\b/i,
    /\bAmazon\s*Web\s*Services\b/i,
    /\bS3\b/,
    /\bEC2\b/,
    /\bLambda\b/,
  ],
  'Azure': [
    /\bAzure\b/i,
    /\bMicrosoft\s*Azure\b/i,
  ],
  'GCP': [
    /\bGCP\b/i,
    /\bGoogle\s*Cloud\b/i,
    /\bGKE\b/,
  ],
  'Vercel': [
    /\bVercel\b/i,
    /\bvercel\.com\b/,
  ],
  'Netlify': [
    /\bNetlify\b/i,
    /\bnetlify\.com\b/,
  ],

  // 编程语言
  'TypeScript': [
    /\bTypeScript\b/i,
    /\.tsx?$/,
    /:\s*(string|number|boolean)\b/,
    /\binterface\s+\w+/,
  ],
  'JavaScript': [
    /\bJavaScript\b/i,
    /\.js$/,
    /require\s*\(/,
    /import\s+.*\s+from/,
  ],
  'Python': [
    /\bPython\b/i,
    /\.py$/,
    /def\s+\w+\s*\(/,
    /import\s+\w+/,
    /from\s+\w+\s+import/,
  ],
  'Go': [
    /\bGo\s+lang\b/i,
    /\.go$/,
    /package\s+main/,
    /func\s+\w+\s*\(/,
  ],
  'Rust': [
    /\bRust\b/i,
    /\.rs$/,
    /fn\s+\w+/,
    /use\s+\w+/,
  ],
  'Java': [
    /\bJava\b/i,
    /\.java$/,
    /public\s+class/,
    /System\.out\.print/,
  ],
  'C#': [
    /\bC#\b/i,
    /\.cs$/,
    /using\s+System/,
    /Console\.Write/,
  ],
  'Ruby': [
    /\bRuby\b/i,
    /\.rb$/,
    /def\s+\w+/,
    /require\s+['"]/,
  ],
  'PHP': [
    /\bPHP\b/i,
    /\.php$/,
    /<\?php/,
  ],
  'C++': [
    /\bC\+\+\b/i,
    /\.cpp$/,
    /#include\s*</,
    /std::/,
  ],

  // 构建工具
  'Webpack': [
    /\bWebpack\b/i,
    /webpack\.config/,
  ],
  'Vite': [
    /\bVite\b/i,
    /vite\.config/,
  ],
  'esbuild': [
    /\besbuild\b/i,
  ],
  'Rollup': [
    /\bRollup\b/i,
    /rollup\.config/,
  ],
  'Parcel': [
    /\bParcel\b/i,
  ],
  'Turbopack': [
    /\bTurbopack\b/i,
  ],

  // 测试框架
  'Jest': [
    /\bJest\b/i,
    /\.test\./,
    /describe\s*\(/,
    /it\s*\(/,
    /expect\s*\(/,
  ],
  'Vitest': [
    /\bVitest\b/i,
  ],
  'Mocha': [
    /\bMocha\b/i,
  ],
  'Jasmine': [
    /\bJasmine\b/i,
  ],
  'Playwright': [
    /\bPlaywright\b/i,
    /\@playwright\/test\b/,
  ],
  'Cypress': [
    /\bCypress\b/i,
    /cy\./,
  ],
  'Selenium': [
    /\bSelenium\b/i,
  ],
  'Puppeteer': [
    /\bPuppeteer\b/i,
  ],

  // 其他
  'GraphQL': [
    /\bGraphQL\b/i,
    /type\s+\w+\s*{/,
    /Query\b/,
    /Mutation\b/,
  ],
  'REST API': [
    /\bREST\s*(?:API)?\b/i,
    /\bRESTful\b/i,
  ],
  'gRPC': [
    /\bgRPC\b/i,
    /protobuf\b/,
  ],
  'WebSocket': [
    /\bWebSocket\b/i,
    /ws:\/\//,
  ],
  'gRPC': [
    /\bgRPC\b/i,
  ],
  'WebRTC': [
    /\bWebRTC\b/i,
  ],
};

/**
 * 技术栈分类映射
 */
const TECH_CATEGORIES: Record<string, TechCategory> = {
  // 前端框架
  'React': 'frontend-framework',
  'Vue': 'frontend-framework',
  'Angular': 'frontend-framework',
  'Svelte': 'frontend-framework',
  'Next.js': 'frontend-framework',
  'Nuxt.js': 'frontend-framework',
  'Solid': 'frontend-framework',

  // 后端框架
  'Express': 'backend-framework',
  'NestJS': 'backend-framework',
  'Django': 'backend-framework',
  'FastAPI': 'backend-framework',
  'Spring Boot': 'backend-framework',
  'Flask': 'backend-framework',
  'Gin': 'backend-framework',

  // 数据库
  'PostgreSQL': 'database',
  'MySQL': 'database',
  'MongoDB': 'database',
  'SQLite': 'database',
  'MariaDB': 'database',

  // 缓存
  'Redis': 'cache',
  'Memcached': 'cache',

  // 搜索
  'Elasticsearch': 'search',
  'Meilisearch': 'search',

  // 消息队列
  'Kafka': 'message-queue',
  'RabbitMQ': 'message-queue',
  'AWS SQS': 'message-queue',

  // 容器
  'Docker': 'container',
  'Podman': 'container',

  // 编排
  'Kubernetes': 'orchestration',
  'Docker Swarm': 'orchestration',

  // CI/CD
  'GitHub Actions': 'ci-cd',
  'Jenkins': 'ci-cd',
  'GitLab CI': 'ci-cd',
  'Travis CI': 'ci-cd',

  // 云服务
  'AWS': 'cloud',
  'Azure': 'cloud',
  'GCP': 'cloud',
  'Vercel': 'cloud',
  'Netlify': 'cloud',

  // 编程语言
  'TypeScript': 'language',
  'JavaScript': 'language',
  'Python': 'language',
  'Go': 'language',
  'Rust': 'language',
  'Java': 'language',
  'C#': 'language',
  'Ruby': 'language',
  'PHP': 'language',
  'C++': 'language',

  // 构建工具
  'Webpack': 'build-tool',
  'Vite': 'build-tool',
  'esbuild': 'build-tool',
  'Rollup': 'build-tool',
  'Parcel': 'build-tool',
  'Turbopack': 'build-tool',

  // 测试框架
  'Jest': 'testing-framework',
  'Vitest': 'testing-framework',
  'Mocha': 'testing-framework',
  'Jasmine': 'testing-framework',
  'Playwright': 'testing-framework',
  'Cypress': 'testing-framework',
  'Selenium': 'testing-framework',
  'Puppeteer': 'testing-framework',

  // 其他
  'GraphQL': 'other',
  'REST API': 'other',
  'gRPC': 'other',
  'WebSocket': 'other',
  'WebRTC': 'other',
};

/**
 * 从内容中识别技术栈
 */
export function identifyTechStack(content: string): TechStack[] {
  const detected = new Map<string, TechStack>();

  // 扫描所有技术模式
  for (const [techName, patterns] of Object.entries(TECH_PATTERNS)) {
    let mentions = 0;
    let maxConfidence = 0;

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        mentions += matches.length;
        maxConfidence = Math.max(maxConfidence, calculateConfidence(content, techName));
      }
    }

    if (mentions > 0) {
      detected.set(techName, {
        name: techName,
        category: TECH_CATEGORIES[techName] || 'other',
        confidence: maxConfidence,
        mentions,
      });
    }
  }

  // 按置信度和出现次数排序
  return Array.from(detected.values()).sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return b.mentions - a.mentions;
  });
}

/**
 * 计算技术栈置信度
 */
function calculateConfidence(content: string, techName: string): number {
  let confidence = 0;

  // 标题或开头提及 = 高置信度
  const titleMatch = content.match(/^#+.*?\b${techName}\b/im);
  if (titleMatch) {
    confidence += 0.5;
  }

  // 出现在代码块中 = 高置信度
  const codeBlockMatch = content.match(/```[\s\S]*?\b${techName}\b[\s\S]*?```/i);
  if (codeBlockMatch) {
    confidence += 0.3;
  }

  // 出现多次 = 中等置信度
  const occurrences = (content.match(new RegExp(techName, 'gi')) || []).length;
  if (occurrences >= 3) {
    confidence += 0.2;
  }

  return Math.min(confidence, 1);
}

/**
 * 检测版本号
 */
export function detectVersion(content: string, techName: string): string | undefined {
  // 常见版本号模式
  const patterns = [
    new RegExp(`${techName}\\s+(\\d+\\.\\d+\\.\\d+)`, 'i'),
    new RegExp(`${techName}\\s+v?(\\d+\\.\\d+)`, 'i'),
    new RegExp(`"${techName}":\s*"[~^]?(\d+\\.\\d+\\.\\d+)"`),
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * 获取技术栈的官方文档 URL
 */
export function getTechDocsUrl(techName: string): string {
  const docsUrls: Record<string, string> = {
    'React': 'https://react.dev',
    'Vue': 'https://vuejs.org',
    'Angular': 'https://angular.io/docs',
    'Svelte': 'https://svelte.dev/docs',
    'Next.js': 'https://nextjs.org/docs',
    'Nuxt.js': 'https://nuxt.com/docs',
    'Express': 'https://expressjs.com',
    'NestJS': 'https://docs.nestjs.com',
    'Django': 'https://docs.djangoproject.com',
    'FastAPI': 'https://fastapi.tiangolo.com',
    'Spring Boot': 'https://spring.io/projects/spring-boot',
    'Flask': 'https://flask.palletsprojects.com',
    'PostgreSQL': 'https://www.postgresql.org/docs',
    'MySQL': 'https://dev.mysql.com/doc',
    'MongoDB': 'https://www.mongodb.com/docs',
    'Redis': 'https://redis.io/docs',
    'Docker': 'https://docs.docker.com',
    'Kubernetes': 'https://kubernetes.io/docs',
    'TypeScript': 'https://www.typescriptlang.org/docs',
    'JavaScript': 'https://developer.mozilla.org/docs/Web/JavaScript',
    'Python': 'https://docs.python.org',
    'Go': 'https://go.dev/doc',
    'Rust': 'https://doc.rust-lang.org',
    'Jest': 'https://jestjs.io/docs',
    'Vitest': 'https://vitest.dev/guide',
    'Playwright': 'https://playwright.dev/docs',
    'Cypress': 'https://docs.cypress.io',
    'GraphQL': 'https://graphql.org/learn',
    'Webpack': 'https://webpack.js.org/guides',
    'Vite': 'https://vitejs.dev/guide',
  };

  return docsUrls[techName] || `https://www.google.com/search?q=${techName}+official+documentation`;
}

/**
 * 获取技术栈的安装指南
 */
export function getInstallGuide(techName: string): string {
  const guides: Record<string, string> = {
    'React': `npm install react react-dom`,
    'Vue': `npm install vue`,
    'TypeScript': `npm install -D typescript`,
    'Docker': `# macOS: brew install docker
# Ubuntu: curl -fsSL https://get.docker.com | sh`,
  };

  return guides[techName] || `# Please refer to official documentation for ${techName} installation`;
}
