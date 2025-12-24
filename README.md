# Credit Hub

Linux Do 积分打赏链接工具，基于 LINUX DO Credit 平台。

## 功能

- 使用 Linux Do Connect 登录
- 创建专属打赏链接
- 分享链接到 Linux Do 社区
- 接收佬友打赏
- 查看收款记录

## 使用流程

1. 使用 Linux Do 账号登录
2. 创建打赏链接，设置标题和预设金额
3. 复制链接分享到 Linux Do 帖子、签名或个人主页
4. 粉丝点击链接，通过 LINUX DO Credit 系统完成打赏
5. 积分自动到账

## 技术栈

- 前端：Vite + React 19 + TypeScript + React Router 7
- 后端：Cloudflare Pages Functions
- 数据库：Cloudflare D1 + Drizzle ORM
- 样式：Tailwind CSS 4 + shadcn/ui
- 支付：LINUX DO Credit 易支付兼容接口

## 开发

```bash
pnpm install
pnpm dev              # 前端开发
pnpm build            # 构建
pnpm pages:dev        # 本地测试（带 API）
pnpm pages:deploy     # 部署
```

## 环境变量

### Linux Do Connect（用户登录）

- `LINUXDO_CLIENT_ID`
- `LINUXDO_CLIENT_SECRET`
- `LINUXDO_REDIRECT_URI`

### LINUX DO Credit（积分支付）

在 [集市中心](https://credit.linux.do) 创建应用：

- `CREDIT_CLIENT_ID` - 应用 Client ID
- `CREDIT_CLIENT_SECRET` - 应用 Client Secret
- 通知地址设置为：`https://你的域名/api/tip/callback`

### 其他

- `JWT_SECRET` - JWT 签名密钥
- `APP_URL` - 应用地址
