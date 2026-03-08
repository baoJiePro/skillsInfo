# OpenClaw 飞书渠道配置指南

> **本内容整理自 OpenClaw 官方文档**：https://openclawcn.com/docs/channels/feishu/

---

## 渠道概述

### 特性

- **状态**：生产就绪
- **支持**：机器人私聊和群组
- **连接模式**：WebSocket 长连接（无需公网 URL）
- **多租户**：支持多账号配置
- **路由**：确定性路由，回复始终返回飞书
- **会话隔离**：私聊共享主会话，群组独立隔离

### 安装插件

```bash
# 安装官方飞书插件
openclaw plugins install @openclaw/feishu

# 或本地安装（在 git 仓库内）
openclaw plugins install ./extensions/feishu
```

---

## 第一步：创建飞书应用

### 1. 打开飞书开放平台

访问 [飞书开放平台](https://open.feishu.cn/)，使用飞书账号登录。

**Lark（国际版）** 请使用 https://open.larksuite.com/app，并在配置中设置 `domain: "lark"`。

### 2. 创建企业自建应用

1. 点击"创建企业自建应用"
2. 填写应用名称和描述
3. 选择应用图标

### 3. 获取应用凭证

在应用的"凭证与基础信息"页面，复制：

- **App ID**（格式如 `cli_xxx`）
- **App Secret**

❗ **重要**：请妥善保管 App Secret。

### 4. 配置应用权限

在"权限管理"页面，点击"批量导入"，粘贴以下 JSON：

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "cardkit:card:write",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "docs:document.content:read",
      "event:ip_list",
      "im:chat",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.group_msg",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource",
      "sheets:spreadsheet",
      "wiki:wiki:readonly"
    ],
    "user": ["aily:file:read", "aily:file:write", "im:chat.access_event.bot_p2p_chat:read"]
  }
}
```

### 5. 启用机器人能力

在"应用能力" > "机器人"页面：

1. 开启机器人能力
2. 配置机器人名称

### 6. 配置事件订阅

⚠️ **配置前确保**：

1. 已运行 `openclaw channels add` 添加 Feishu 渠道
2. 网关处于启动状态（`openclaw gateway status`）

在"事件订阅"页面：

1. 选择"使用长连接接收事件"（WebSocket 模式）
2. 添加事件：`im.message.receive_v1`

### 7. 发布应用

1. 创建版本
2. 提交审核并发布
3. 等待审批（企业自建应用通常自动通过）

---

## 第二步：配置 OpenClaw

### 方式一：通过向导（推荐）

```bash
openclaw channels add
```

### 方式二：通过配置文件

编辑 `~/.openclaw/openclaw.json`：

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "我的AI助手",
        },
      },
    },
  },
}
```

### 方式三：环境变量

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark 国际版配置

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

---

## 第三步：启动并测试

### 启动网关

```bash
openclaw gateway install
```

### 发送测试消息

在飞书中找到机器人，发送消息。

### 配对授权

机器人会回复配对码，批准后才能对话：

```bash
openclaw pairing approve feishu <配对码>
```

---

## 配置参考

### 基础配置


| 配置项                    | 说明                           | 默认值   |
| ------------------------- | ------------------------------ | -------- |
| `enabled`                 | 启用/禁用渠道                  | `true`   |
| `domain`                  | API 域名（`feishu` 或 `lark`） | `feishu` |
| `accounts.<id>.appId`     | 应用 App ID                    | -        |
| `accounts.<id>.appSecret` | 应用 App Secret                | -        |
| `accounts.<id>.botName`   | 机器人名称                     | -        |

### 访问控制配置


| 配置项                            | 说明                       | 默认值    |
| --------------------------------- | -------------------------- | --------- |
| `dmPolicy`                        | 私聊策略                   | `pairing` |
| `allowFrom`                       | 私聊白名单（open_id 列表） | -         |
| `groupPolicy`                     | 群组策略                   | `open`    |
| `groupAllowFrom`                  | 群组白名单                 | -         |
| `groups.<chat_id>.requireMention` | 是否需要 @提及             | `true`    |
| `groups.<chat_id>.enabled`        | 是否启用该群组             | `true`    |

---

## 策略说明

### dmPolicy（私聊策略）


| 值            | 行为                                     |
| ------------- | ---------------------------------------- |
| `"pairing"`   | 默认。未知用户收到配对码，批准后才能对话 |
| `"allowlist"` | 仅`allowFrom` 列表中的用户可对话         |
| `"open"`      | 允许所有人（需`allowFrom: ["*"]`）       |
| `"disabled"`  | 禁止私聊                                 |

### groupPolicy（群组策略）


| 值            | 行为                        |
| ------------- | --------------------------- |
| `"open"`      | 默认。允许群组中所有人      |
| `"allowlist"` | 仅`groupAllowFrom` 中的用户 |
| `"disabled"`  | 禁用群组消息                |

---

## 获取 ID 方法

### 获取群组 ID（oc_xxx）

**方法一（推荐）**：

1. 在群组中 @机器人发消息
2. 运行 `openclaw logs --follow` 查看 `chat_id`

**方法二**：
使用飞书 API 调试工具获取群组列表。

### 获取用户 ID（ou_xxx）

**方法一（推荐）**：

1. 给机器人发消息
2. 运行 `openclaw logs --follow` 查看 `open_id`

**方法二**：

```bash
openclaw pairing list feishu
```

---

## 常用命令

### 机器人命令


| 命令      | 说明           |
| --------- | -------------- |
| `/status` | 查看机器人状态 |
| `/reset`  | 重置对话会话   |
| `/model`  | 查看/切换模型  |

### 网关管理


| 命令                       | 说明          |
| -------------------------- | ------------- |
| `openclaw gateway status`  | 查看网关状态  |
| `openclaw gateway install` | 安装/启动网关 |
| `openclaw gateway stop`    | 停止网关      |
| `openclaw gateway restart` | 重启网关      |
| `openclaw logs --follow`   | 实时查看日志  |

### 配对管理

```bash
openclaw pairing list feishu              # 查看待审批列表
openclaw pairing approve feishu <CODE>     # 批准配对
```

---

## 故障排除

### 机器人在群组中不响应

1. 检查机器人是否已添加到群组
2. 检查是否 @了机器人
3. 检查 `groupPolicy` 设置
4. 查看日志：`openclaw logs --follow`

### 机器人收不到消息

1. 检查应用是否已发布
2. 检查事件订阅（`im.message.receive_v1`）
3. 检查是否选择长连接模式
4. 检查应用权限
5. 检查网关状态：`openclaw gateway status`

### App Secret 泄露

1. 在飞书开放平台重置 App Secret
2. 更新配置文件
3. 重启网关

---

## 官方资源

- [飞书渠道官方文档](https://openclawcn.com/docs/channels/feishu/)
- [飞书开放平台](https://open.feishu.cn/)
- [Lark 开放平台](https://open.larksuite.com/app/)
