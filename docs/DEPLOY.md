# 部署教程

本项目基于 Cloudflare Pages 部署，使用 D1 数据库存储数据。

## 前置要求

- Node.js 18+
- pnpm
- Cloudflare 账号
- Linux Do 账号（用于创建 Connect 应用）

## 第一步：克隆项目

```bash
git clone <repo-url>
cd linuxdo-credit-hub
pnpm install
```

## 第二步：创建 Cloudflare D1 数据库

```bash
# 登录 Cloudflare
npx wrangler login

# 创建数据库
npx wrangler d1 create credit-hub-db
```

记录返回的 `database_id`，后面需要用到。

## 第三步：配置 wrangler.toml

复制示例配置文件：

```bash
cp wrangler.toml.example wrangler.toml
```

编辑 `wrangler.toml`，填入你的数据库 ID：

```toml
name = "credit-hub"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "credit-hub-db"
database_id = "你的数据库ID"
```

## 第四步：初始化数据库

依次执行以下 SQL 文件：

```bash
# 基础表（用户设置、打赏链接、打赏记录）
npx wrangler d1 execute credit-hub-db --remote --file=drizzle/0000_init.sql

# 红包功能
npx wrangler d1 execute credit-hub-db --remote --file=drizzle/0001_red_packets.sql

# 发卡功能
npx wrangler d1 execute credit-hub-db --remote --file=drizzle/0002_card_links.sql

# 抽奖功能
npx wrangler d1 execute credit-hub-db --remote --file=drizzle/0003_lottery.sql
```

## 第五步：创建 Linux Do Connect 应用

1. 访问 https://connect.linux.do
2. 创建新应用
3. 设置回调地址为：`https://你的域名/api/auth/callback`
4. 记录 Client ID 和 Client Secret

## 第六步：配置环境变量

在 Cloudflare Pages 项目设置中添加以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `LINUXDO_CLIENT_ID` | Linux Do Connect 应用 ID |
| `LINUXDO_CLIENT_SECRET` | Linux Do Connect 应用密钥 |
| `LINUXDO_REDIRECT_URI` | 回调地址，如 `https://你的域名/api/auth/callback` |
| `JWT_SECRET` | JWT 签名密钥，随机字符串即可 |
| `APP_URL` | 应用地址，如 `https://你的域名` |

## 第七步：部署

```bash
# 构建并部署
pnpm pages:deploy
```

或者连接 GitHub 仓库，设置自动部署。

## 第八步：配置易支付

登录后进入设置页面，配置你的易支付参数：

1. 访问 https://credit.linux.do 获取商户 ID 和密钥
2. 在设置页面填入 PID 和 Key
3. 保存设置

## 本地开发

```bash
# 本地初始化数据库
npx wrangler d1 execute credit-hub-db --local --file=drizzle/0000_init.sql
npx wrangler d1 execute credit-hub-db --local --file=drizzle/0001_red_packets.sql
npx wrangler d1 execute credit-hub-db --local --file=drizzle/0002_card_links.sql
npx wrangler d1 execute credit-hub-db --local --file=drizzle/0003_lottery.sql

# 启动开发服务器
pnpm dev

# 启动带 API 的本地服务
pnpm pages:dev
```

## 功能说明

### 打赏链接
创建打赏链接，分享给他人，接收积分打赏。

### 发卡商城
创建商品，设置卡密，用户付款后自动发放。支持三种模式：
- 一对一：每个卡密只卖一次
- 一对多：同一卡密可卖多次
- 多对多：每单发放多个卡密

### 抽奖活动
创建抽奖，设置奖品，用户参与后自动开奖。支持：
- 免费/付费参与
- 定时/人满/手动开奖
- 多个奖品等级

### 红包（待开发）
创建红包，设置金额和数量，用户领取后自动发放。

## 常见问题

### 数据库迁移失败
确保按顺序执行 SQL 文件，且使用 `--remote` 参数。

### 登录失败
检查 Linux Do Connect 的回调地址是否正确配置。

### 支付回调失败
检查易支付的通知地址是否正确，格式为 `https://你的域名/api/tip/callback`。
