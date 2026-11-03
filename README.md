# 我的衣橱 · Web 电子衣橱

一个移动端优先的响应式电子衣橱：管理衣物、组合穿搭、记录每天的穿着，并统计衣橱构成与花费。

- **框架**：Next.js 15（App Router）+ TypeScript + Tailwind CSS + Lucide React
- **后端**：Supabase（Auth 邮箱登录 / PostgreSQL / Storage 图片存储，全表 RLS）
- **部署**：可免费一键部署到 Vercel

---

## 1. 目录结构

```
wardrobe-next/
├─ app/
│  ├─ layout.tsx                # 根布局：会话读取、平台外壳（侧边栏 / 底栏）
│  ├─ page.tsx                  # / 衣橱列表（服务端取数）
│  ├─ add/page.tsx              # /add 新增衣物
│  ├─ clothes/[id]/edit/page.tsx# 编辑 / 删除衣物
│  ├─ outfits/page.tsx          # /outfits 穿搭组合
│  ├─ stats/page.tsx            # /stats 统计与穿着日历
│  ├─ login/page.tsx            # 登录 / 注册
│  ├─ auth/callback/route.ts    # 邮箱确认回调（交换会话）
│  ├─ loading.tsx               # 页面骨架屏
│  └─ globals.css               # Tailwind 入口与设计变量
├─ components/
│  ├─ AppShell.tsx              # 响应式导航：桌面侧边栏 + 移动端底栏/悬浮按钮
│  ├─ ClosetClient.tsx          # 筛选、搜索、收藏、网格卡片
│  ├─ ClothingForm.tsx          # 新增/编辑表单 + 图片压缩上传
│  ├─ ImageEditor.tsx           # 上传图片自由裁剪与纯色背景抠图
│  ├─ ImageLightbox.tsx         # 衣橱与穿搭的图片大图查看
│  ├─ OutfitsClient.tsx         # 搭配创建、预览、记录今日穿搭
│  ├─ StatsClient.tsx           # 统计卡片、分类占比、日历
│  ├─ LoginForm.tsx             # 邮箱密码登录/注册
│  └─ SetupNotice.tsx           # 未配置环境变量时的引导页
├─ lib/
│  ├─ supabase/{client,server,middleware,config}.ts
│  ├─ types.ts / constants.ts / utils.ts / image.ts
├─ middleware.ts                # 会话刷新 + 路由守卫
├─ supabase/schema.sql          # 建表、RLS、Storage 策略（一次性执行）
└─ .env.local.example           # 环境变量模板
```

## 2. 依赖

```bash
npm install
```

已写入 `package.json` 的核心依赖：

| 依赖 | 用途 |
| --- | --- |
| `next` / `react` / `react-dom` | 应用框架 |
| `@supabase/supabase-js` / `@supabase/ssr` | 数据库、认证、服务端会话 |
| `lucide-react` | 图标 |
| `tailwindcss` / `postcss` / `autoprefixer` | 样式 |
| `typescript` / `@types/*` | 类型 |

## 3. 环境变量

复制模板并填入 Supabase 项目的值（Project Settings → API）：

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> 未配置时应用会显示配置引导页，而不是白屏报错。
> Anon Key 是公开密钥，真正的数据隔离由 RLS 保证，但仍不要提交 `.env.local`。

## 4. 初始化数据库

打开 Supabase Dashboard → **SQL Editor**，粘贴并执行 [`supabase/schema.sql`](supabase/schema.sql)。脚本会：

1. 创建 `clothes`（含原图 `image_path`、缩略图 `thumb_path`、多选季节 `seasons`）、`outfits`、`outfit_items`、`wear_logs` 四张表与索引；
2. 为每张表开启 RLS，只允许 `auth.uid() = user_id` 的读写；
3. 创建公开读取的 `clothing-images` Bucket（10MB，仅图片类型）；
4. 限制用户只能在自己的 `uid/` 目录下上传、覆盖、删除图片。

> 已部署过旧版本的库，重新执行一次脚本即可完成迁移：补 `thumb_path`、把单季 `season` 转成 `seasons` 数组、移除品牌/价格/购买日期/标签字段、更新分类约束（脚本幂等，不会丢图片数据）。

**认证设置**（Authentication → Providers → Email）：
- 开启 Email provider；
- 本地开发想跳过邮箱验证时，可关闭 “Confirm email”；
- 部署后建议在 Authentication → URL Configuration 中把 Site URL 设为线上域名，并把 `https://你的域名/auth/callback` 加入 Redirect URLs。

## 5. 本地运行

```bash
npm run dev     # http://localhost:3000
npm run build   # 生产构建
npm start       # 运行生产构建
```

## 6. 功能说明

- **认证**：邮箱 + 密码注册/登录；Middleware 刷新会话，未登录访问受保护路由自动跳转 `/login`。
- **衣橱**：网格卡片、关键词搜索、分类 / 季节 / 颜色筛选、收藏；点击卡片右上角放大按钮可查看原图大图；卡片直达编辑页。
- **新增/编辑**：拖入或拍照上传，内置自由裁剪与纯色背景抠图；浏览器端自动压缩后直传 Storage，同时生成 400px 缩略图，列表与搭配选择用小图、详情用原图；季节支持多选；删除时同步清理原图与缩略图。
- **穿搭**：勾选多件衣物保存搭配，支持标签与备注；卡片预览、全屏预览（点击搭配中的衣物可查看大图）、一键记录“今天穿这套”。
- **统计与日历**：衣物总数 / 搭配数 / 记录天数，分类占比条形图，穿着最多的搭配；日历中给任意日期标记一套穿搭（每人每天一条）。

## 7. 部署到 Vercel（详细步骤）

### 7.1 准备 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 新建项目，记录数据库密码，区域建议选离自己近的（如 Singapore）。
2. 进入 **SQL Editor**，把 [`supabase/schema.sql`](supabase/schema.sql) 整段粘贴执行。脚本会创建四张表、RLS 策略与 `clothing-images` 存储桶，可重复执行。
3. 到 **Storage** 确认 `clothing-images` 桶已存在且为 Public。
4. 到 **Project Settings → API** 记录：
   - `Project URL`，形如 `https://xxxx.supabase.co`
   - `anon public` key（公开密钥，数据隔离由 RLS 保证）

### 7.2 配置 Supabase 认证

进入 **Authentication**：

1. **Sign In / Providers → Email**：确认 Email provider 已启用。
2. 测试阶段建议关闭 **Confirm email**，否则注册后必须点邮件链接才能登录，免费版邮件额度也有限。
3. **URL Configuration**（可等 Vercel 部署完拿到域名后再回来填）：
   - `Site URL`：`https://你的项目.vercel.app`
   - `Redirect URLs` 增加：
     - `https://你的项目.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`（本地开发用）
     - 如需预览环境：`https://*-你的团队.vercel.app/auth/callback`

### 7.3 推送代码到 GitHub

先在 GitHub 网页新建一个**空仓库**（不要勾选 README / .gitignore），然后在项目根目录执行：

```bash
git init
git add .
git commit -m "feat: web wardrobe with next.js and supabase"
git branch -M main
git remote add origin https://github.com/<你的账号>/<仓库名>.git
git push -u origin main
```

> `.gitignore` 已忽略 `.env.local` 与 `node_modules`，不要把密钥提交到仓库。

### 7.4 导入 Vercel 并部署

1. 打开 [vercel.com/new](https://vercel.com/new)，用 GitHub 账号登录并选择刚才的仓库，点击 **Import**。
2. 配置项保持默认：
   - Framework Preset：`Next.js`（自动识别）
   - Root Directory：`./`
   - Build Command：`next build`
   - Output Directory：默认
3. 展开 **Environment Variables**，添加两条（Production / Preview / Development 全部勾选）：

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你的 anon public key |

4. 点击 **Deploy**，等待 1–2 分钟，成功后获得 `https://xxx.vercel.app` 域名。

### 7.5 部署后回填与验收

1. 复制 Vercel 域名，回到 Supabase **Authentication → URL Configuration**，填好 `Site URL` 和 7.2 中列出的 `Redirect URLs`。
2. 打开线上域名，依次验证：
   - 注册 → 登录（若开启邮件确认，先去邮箱点链接）
   - 首页添加衣物并上传图片，检查 Storage 中出现 `用户uid/xxx.jpg`
   - 编辑、删除衣物；新建、编辑搭配；记录“今天穿这套”
   - `/stats` 的日历与统计数字正确
3. 若页面只显示“连接 Supabase”的引导页，说明环境变量未生效：检查 **Settings → Environment Variables** 拼写，然后 **Deployments → 最新一次 → Redeploy**（环境变量修改必须重新部署才生效）。

### 7.6 常见部署问题

| 现象 | 处理 |
| --- | --- |
| 图片不显示 | `next.config.mjs` 已允许 `*.supabase.co` 公开图片；若使用自定义 Supabase 域名，需要补充 `remotePatterns` |
| 登录后跳回 localhost | Supabase 的 `Site URL` 仍是本地地址，改成 Vercel 域名 |
| 注册报 `Email rate limit exceeded` | 免费版内置邮件额度很小，测试期关闭 Confirm email，正式使用请配置自有 SMTP |
| 改完环境变量没变化 | Vercel 不会自动重跑构建，需手动 Redeploy |
| 自定义域名后登录异常 | 在 Vercel **Settings → Domains** 绑定域名后，同步更新 Supabase 的 `Site URL` 与 `Redirect URLs` |

### 7.7 可选：使用 Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # 预览部署
vercel --prod   # 生产部署
```

CLI 首次会询问是否关联已有项目；环境变量仍建议在网页端配置一次，避免遗漏。

> 免费额度：Vercel Hobby 计划 + Supabase Free 计划即可长期运行个人衣橱；Supabase 免费项目长时间无请求会暂停，访问一次控制台即可恢复。

## 8. 常见问题

| 现象 | 处理 |
| --- | --- |
| 登录后仍被踢回 `/login` | 检查 `.env.local` 是否填写、是否重启了 `next dev`；确认邮箱已验证 |
| 图片 403 / 上传失败 | 确认 `schema.sql` 中 Storage 策略已执行，且路径以 `用户uid/` 开头 |
| 查询返回空数组 | 正常，RLS 会过滤掉其他用户数据；确认插入时 `user_id` 默认为 `auth.uid()` |
| 邮箱确认链接跳到 localhost | Supabase → URL Configuration 的 Site URL / Redirect URLs 未配置线上域名 |
| Windows 下 `next dev` / `next build` 报 `EPERM: lstat ...`、`realpath` 或 `Cannot read properties of undefined (reading 'endsWith')` | Node 在网络共享盘（UNC 路径及其映射盘）上 `realpath` 会失败，Next 误判 TypeScript 依赖缺失。请把项目放到本地磁盘（如 `C:\LT\WorkSpace\MyFiles\wardrobe-next`）后再安装依赖和运行；Vercel 远程构建不受影响 |
