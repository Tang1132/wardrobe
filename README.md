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

1. 创建 `clothes`、`outfits`、`outfit_items`、`wear_logs` 四张表与索引；
2. 为每张表开启 RLS，只允许 `auth.uid() = user_id` 的读写；
3. 创建公开读取的 `clothing-images` Bucket（10MB，仅图片类型）；
4. 限制用户只能在自己的 `uid/` 目录下上传、覆盖、删除图片。

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
- **衣橱**：网格卡片、关键词搜索、分类 / 季节 / 颜色 / 标签筛选、收藏；卡片直达编辑页。
- **新增/编辑**：拖入或拍照上传，浏览器端自动压缩后直传 Storage；支持价格、购买日期、品牌、备注；删除时同步清理图片。
- **穿搭**：勾选多件衣物保存搭配，支持标签与备注；卡片预览、全屏预览、一键记录“今天穿这套”。
- **统计与日历**：总数 / 总花费 / 搭配数 / 记录天数，分类占比条形图，穿着最多的搭配；日历中给任意日期标记一套穿搭（每人每天一条）。

## 7. 部署到 Vercel

1. **推送代码到 GitHub**

   ```bash
   git init
   git add .
   git commit -m "feat: web wardrobe with next.js and supabase"
   git branch -M main
   git remote add origin https://github.com/<你的账号>/<仓库名>.git
   git push -u origin main
   ```

2. **导入 Vercel**：打开 [vercel.com/new](https://vercel.com/new) → 选择该仓库 → Framework Preset 自动识别为 Next.js，无需修改构建命令。

3. **配置环境变量**：在项目 Settings → Environment Variables 添加
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **点击 Deploy**，等待构建完成，拿到 `https://xxx.vercel.app` 域名。

5. **回填 Supabase 回调地址**：Supabase → Authentication → URL Configuration
   - Site URL：`https://xxx.vercel.app`
   - Redirect URLs：`https://xxx.vercel.app/auth/callback`

6. **验证**：打开线上域名注册账号 → 邮箱确认（若开启）→ 登录 → 添加第一件衣物，图片应出现在 `clothing-images` Bucket 的 `用户uid/` 目录下。

> 免费额度：Vercel Hobby 计划 + Supabase Free 计划即可长期运行个人衣橱；Supabase 免费项目长时间无请求会暂停，访问一次控制台即可恢复。

## 8. 常见问题

| 现象 | 处理 |
| --- | --- |
| 登录后仍被踢回 `/login` | 检查 `.env.local` 是否填写、是否重启了 `next dev`；确认邮箱已验证 |
| 图片 403 / 上传失败 | 确认 `schema.sql` 中 Storage 策略已执行，且路径以 `用户uid/` 开头 |
| 查询返回空数组 | 正常，RLS 会过滤掉其他用户数据；确认插入时 `user_id` 默认为 `auth.uid()` |
| 邮箱确认链接跳到 localhost | Supabase → URL Configuration 的 Site URL / Redirect URLs 未配置线上域名 |
| Windows 下 `next build` 报 `EPERM: lstat '\\\\server\\share'` 或卡住 | 项目放在 UNC 网络路径时 Node 无法正常解析模块，请把项目放到本地磁盘，或先 `net use W: \\\\hkv-fs1\\users`，再到 `W:\\liutang\\...\\wardrobe-next` 下运行 |
