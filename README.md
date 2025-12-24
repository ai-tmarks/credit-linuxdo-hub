# Credit Hub

Linux Do 积分工具平台，基于 LINUX DO Credit 系统，部署在 Cloudflare Pages。

## 功能

- 🔐 Linux Do Connect 登录
- 💰 打赏链接 - 创建专属打赏链接，接收佬友打赏
- 🎴 发卡商城 - 创建商品，付款后自动发放卡密
- 🎲 抽奖活动 - 创建抽奖，支持定时/人满/手动开奖
- 📦 我的记录 - 查看购买的卡密和抽奖记录

## 技术栈

- 前端：Vite + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- 后端：Cloudflare Pages Functions
- 数据库：Cloudflare D1
- 支付：LINUX DO Credit 易支付接口

## 部署

本项目部署在 Cloudflare Pages，详细部署教程请查看：

👉 **[部署文档](./docs/DEPLOY.md)**

### 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd linuxdo-credit-hub
pnpm install

# 创建 D1 数据库
npx wrangler d1 create credit-hub-db

# 配置 wrangler.toml
cp wrangler.toml.example wrangler.toml
# 编辑 wrangler.toml 填入数据库 ID

# 初始化数据库
npx wrangler d1 execute credit-hub-db --remote --file=drizzle/0000_init.sql
npx wrangler d1 execute credit-hub-db --remote --file=drizzle/0001_red_packets.sql
npx wrangler d1 execute credit-hub-db --remote --file=drizzle/0002_card_links.sql
npx wrangler d1 execute credit-hub-db --remote --file=drizzle/0003_lottery.sql

# 部署
pnpm pages:deploy
```

## 环境变量

在 Cloudflare Pages 设置中配置：

| 变量名 | 说明 |
|--------|------|
| `LINUXDO_CLIENT_ID` | Linux Do Connect 应用 ID |
| `LINUXDO_CLIENT_SECRET` | Linux Do Connect 应用密钥 |
| `LINUXDO_REDIRECT_URI` | 回调地址 `https://域名/api/auth/callback` |
| `JWT_SECRET` | JWT 签名密钥 |
| `APP_URL` | 应用地址 |

## 本地开发

```bash
pnpm install
pnpm dev              # 前端开发
pnpm pages:dev        # 本地测试（带 API）
pnpm build            # 构建
```

## License

MIT
