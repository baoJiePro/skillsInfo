#!/usr/bin/env bun
/**
 * Tech Doc Expander - 主入口脚本
 *
 * 功能：
 * 1. 接收多个文章链接
 * 2. 并发抓取文章内容
 * 3. 递归提取内部链接
 * 4. 生成扩展文档
 */

import { Command } from 'commander';
import { expand } from './expander.js';
import { discover } from './discover.js';
import { type Config, loadConfig } from './config.js';

const program = new Command();

program
  .name('tech-doc-expander')
  .description('智能技术文档扩展器')
  .version('1.0.0');

// ============================================================================
// 模式 A：批量链接处理
// ============================================================================
program
  .argument('[urls...]', '要处理的文章链接')
  .option('-o, --output <dir>', '输出目录', './output')
  .option('-d, --max-depth <number>', '最大递归深度', '2')
  .option('-c, --concurrent <number>', '并发数', '3')
  .option('--no-official-docs', '禁用官方文档查询')
  .option('--download-media', '下载图片和视频')
  .option('--wait', '等待模式（用于需要登录的页面）')
  .action(async (urls: string[], options) => {
    if (urls.length === 0) {
      console.error('❌ 请提供至少一个链接，或使用 --discover 模式');
      process.exit(1);
    }

    const config: Config = {
      mode: 'batch',
      urls,
      output: options.output,
      maxDepth: parseInt(options.maxDepth),
      concurrent: parseInt(options.concurrent),
      enableOfficialDocs: options.officialDocs !== false,
      downloadMedia: options.downloadMedia,
      waitMode: options.wait,
    };

    await expand(config);
  });

// ============================================================================
// 模式 B：批量发现
// ============================================================================
program
  .command('discover')
  .description('从博客发现相关文章并批量生成文档')
  .requiredOption('-s, --source <url>', '博客主页 URL')
  .option('-f, --filter <keywords>', '关键词过滤（逗号分隔）', '')
  .option('-t, --tag <tag>', '标签过滤')
  .option('-o, --output <dir>', '输出目录', './output')
  .option('--max-articles <number>', '最多发现文章数', '50')
  .option('--after <date>', '起始日期 (YYYY-MM-DD)')
  .option('--before <date>', '结束日期 (YYYY-MM-DD)')
  .option('--list-page <path>', '指定文章列表页路径')
  .action(async (options) => {
    const config: Config = {
      mode: 'discover',
      source: options.source,
      filter: options.filter ? options.filter.split(',').map(s => s.trim()) : [],
      tag: options.tag,
      output: options.output,
      maxArticles: parseInt(options.maxArticles),
      after: options.after ? new Date(options.after) : undefined,
      before: options.before ? new Date(options.before) : undefined,
      listPage: options.listPage,
    };

    await discover(config);
  });

// ============================================================================
// 配置管理
// ============================================================================
program
  .command('config')
  .description('管理配置文件')
  .option('--init', '初始化配置文件')
  .action(async (options) => {
    if (options.init) {
      await loadConfig(true);
      console.log('✅ 配置文件已创建');
    }
  });

program.parse();
