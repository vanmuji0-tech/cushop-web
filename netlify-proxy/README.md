# CUshop 国内访问反代（Netlify）

## 为什么有这个东西

`cushop-web.vercel.app` 在中国大陆**打不开**。实测：

| 测试 | 结果 |
|---|---|
| `cushop-web.vercel.app` 直连（不走代理） | 超时 |
| 该域名 DNS 解析 | `104.244.46.21`（Twitter 段）、`2a03:2880:…:face:b00c:…`（Facebook 段）——被投毒 |
| 强制指定真实 IP `76.76.21.21` + 域名 SNI | 0.3 秒被 RST ——SNI 阻断 |
| 纯 TCP 到 `76.76.21.21:80` | **308，通的** |
| `*.netlify.app` 直连 | **404，通的** |

结论：**被封的是「域名」，不是「IP」**。所以让 Netlify 在服务端替用户去取 Vercel 的内容就行。

用户手机全程只访问 `xxx.netlify.app`，不碰 `vercel.app`。**Vercel 那边一行都不用改。**

## 怎么部署

### 方式 A：拖拽（最快，不用 GitHub）

1. 打开 https://app.netlify.com/drop
2. 把 **`netlify-proxy` 这个文件夹**整个拖进去
3. 等几秒，Netlify 给一个 `随机名字.netlify.app`
4. 想改名字：**Site configuration → Site details → Change site name** → 改成 `cushop` 之类

### 方式 B：接 GitHub（以后改动自动部署）

1. Netlify → **Add new site → Import an existing project** → 选 GitHub → 选 `cushop-web`
2. **Base directory** 填 `netlify-proxy`
3. **Build command** 留空
4. **Publish directory** 填 `.`
5. Deploy

> 反代站本身是纯静态 + 一条规则，没有构建过程，所以 build command 必须留空——
> 不然 Netlify 会去跑 Next.js 的构建，那是另一回事。

## ⚠️ 必做：把 Netlify 地址告诉 Vercel

这一步不做，用户**登录不进去**。

原因：未登录访问 `/me`、`/messages` 这类页面时，`src/proxy.ts` 会跳转到登录页。
这个跳转地址要是拼错了域名（拼成 `cushop-web.vercel.app`），手机点过去就直接撞墙。

代码会优先自动探测（读反代注入的 `x-forwarded-host`），但**不赌它一定注入**。
所以手动钉死：

1. Vercel → `cushop-web` → **Settings → Environment Variables**
2. 新增一条：
   - Name：**`SITE_ORIGIN`**
   - Value：`https://你的站.netlify.app`（**带 `https://`，结尾不要带斜杠**）
3. **Deployments → 最新一条 → ⋯ → Redeploy**（环境变量改完必须重新部署）

设好之后，所有跳转都强制用这个域名，跟反代注入什么头都无关。

> **别用 `PUBLIC_` 开头的名字。** Vercel 把 `PUBLIC_` 当作框架公开前缀
> （SvelteKit / Astro 用它标记「要暴露给浏览器」的变量），存的时候会报
> `Environment variables with a public framework prefix cannot use visibility: secret`。
> 这个值只在服务端读，本来也不该用公开前缀。代码里 `PUBLIC_ORIGIN` 作为旧名仍兼容。

## 部署完怎么验证

**必须在手机上验，且手机不能挂代理**（电脑挂着 Clash 会掩盖问题）：

1. 手机浏览器打开 `https://你的站.netlify.app`
2. 应该看到 CUshop 广场首页
3. **点「我的」** → 应该跳到 `/login`（而不是报错、也不该跳到 vercel.app）
4. 注册/登录 → 应该能进「我的」
5. 发一个带图的商品 → 应该成功

**第 3 步是重点。** 如果点「我的」之后浏览器跳到了 `cushop-web.vercel.app` 然后打不开，
说明上面那步 `PUBLIC_ORIGIN` 没生效——回头检查环境变量拼写，以及**有没有 Redeploy**。

## 已知代价

- **多一跳**：国内 → Netlify 新加坡节点 → Vercel，会慢一些（大概多 0.5–1 秒）
- **带宽**：Netlify 免费版 100GB/月。传图不受影响——图片是浏览器**直传 Cloudinary** 的，不走这条代理
- **稳定性**：`netlify.app` 随时可能步 `vercel.app` 和 `pages.dev` 的后尘被封
- **合规**：把整个站反代到境外，属于临时方案，不适合长期

## 长期方案

买一个自己的域名（¥30–70/年，**不需要备案**），A 记录指向 `76.76.21.21`，
直接指到 Vercel，然后把这个反代站删掉。

域名是自己的资产，换平台能带走，也不会因为平台域名被封而重新通知一遍用户。
