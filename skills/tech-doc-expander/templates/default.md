# {{title}}

> 📄 来源：{{url}}
> 🕐 抓取：{{captured_at}}
> 📚 扩展来源：{{related_count}} 个

---

## 📋 文章概览

**原标题**：{{original_title}}
{{#if author}}**作者**：{{author}}{{/if}}
{{#if published_at}}**发布时间**：{{published_at}}{{/if}}

### 核心内容

{{summary}}

---

## 🔗 扩展资源

### 官方文档

{{#each official_docs}}
- **[{{tech}}]({{url}})** - {{summary}}
{{/each}}

### 相关资源

{{#each related_docs}}
- [{{title}}]({{url}}) - {{summary}}
{{/each}}

---

## 完整实施方案

### 前置条件

{{prerequisites}}

### 安装步骤

```bash
{{install_steps}}
```

### 核心配置

```yaml
{{config_content}}
```

### 代码实现

```javascript
{{code_example}}
```

### 验证方法

```bash
{{verify_steps}}
```

---

## 🛠️ 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
{{#each troubleshooting}}
| {{problem}} | {{cause}} | {{solution}} |
{{/each}}

---

## 📚 延伸阅读

{{#each related_docs}}
{{@index}}. [{{title}}]({{url}})
{{/each}}

---

> 📚 本文档由 Tech Doc Expander 自动生成
> 🤖 由 Claude Agent 扩展和完善
