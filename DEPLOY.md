# 网页怎么更新

## 网址

| 页面 | 地址 |
|---|---|
| 主页 | https://shutiao606-bit.github.io/learn/ |
| 第 1 周 | https://shutiao606-bit.github.io/learn/w1.html |

仓库：https://github.com/shutiao606-bit/learn（Public）

---

## 每周更新流程

1. 在这里改 HTML（通常是新增 `w2.html` 这样的新卡片，并在 `index.html` 的「本周」里换链接）
2. 同步 `index.html` 里的「当前进度」一行（抄 `../进度.md` 最上面那行）
3. 提交并推送：

```bash
cd "C:/Users/24281/学习/site"
git add -A
git commit -m "第N周：主题"
git push
```

4. 等 1~2 分钟，手机刷新页面就是新版

> 凭证已存在 Windows 凭据管理器里（`git config --global credential.helper manager`），推送不会弹窗。

---

## 页面约定

- **单页自包含**：每张卡片一个 HTML，共用 `style.css`，不引外部 CDN
- **手机优先**：17px 字号、1.8 行高、720px 最大宽度、自动深色模式
- **答题区**：`<textarea>` 存 localStorage（`wN_qX` 键），「生成答题卡」把答案拼成纯文本供复制
- **自测答案**用 `<details>` 折叠，默认不显示

---

## 云端答题（Supabase，2026-11-12 接入）

网页上的「提交到云端」按钮把答题卡 POST 到 Supabase，AI 开课时用本机密钥读取。

### 一次性配置（约 5 分钟）

1. **注册** https://supabase.com → New project（区域选 Singapore 或 Tokyo，离得近）
2. **建表**：左侧 SQL Editor → New query → 粘贴 [supabase.sql](supabase.sql) 全文 → Run
3. **取两把钥匙**：Settings → API Keys
   - `Project URL` + `anon` / `public` key → 填进 [config.js](config.js)
   - `service_role` / `secret` key → **只**填进本机 `../tools/supabase.env`（照 `supabase.env.example` 复制）
4. 推送网页，按钮就会出现

### 两把钥匙的区别（安全关键）

| 钥匙 | 放哪 | 能干什么 |
|---|---|---|
| `anon` | 网页里，**公开** | 只能 insert，读不到任何数据（RLS 保证） |
| `service_role` | **只在本机** | 能读全部 |

> RLS 必须开着。`supabase.sql` 里只建了 insert 策略、**故意不建 select 策略**——这是"只写不读"的全部秘密。

### 读取

```bash
python -I -X utf8 "C:/Users/24281/学习/tools/read_answers.py"
python -I -X utf8 "C:/Users/24281/学习/tools/read_answers.py" 30
python -I -X utf8 "C:/Users/24281/学习/tools/read_answers.py" --card 进程
```

---

## 排查

- **打不开**：先试 IPv4 / 换个网络。`github.io` 在部分网络下 IPv6 不通，走 IPv4 通常正常
- **403 推送失败**：token 过期或权限不对，重新生成 classic token 并勾 `repo`，然后重新 `git credential-manager store`
- **改了没生效**：GitHub Pages 构建有 1~2 分钟延迟，也可能是浏览器缓存，强制刷新一次
