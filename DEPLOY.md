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

## 排查

- **打不开**：先试 IPv4 / 换个网络。`github.io` 在部分网络下 IPv6 不通，走 IPv4 通常正常
- **403 推送失败**：token 过期或权限不对，重新生成 classic token 并勾 `repo`，然后重新 `git credential-manager store`
- **改了没生效**：GitHub Pages 构建有 1~2 分钟延迟，也可能是浏览器缓存，强制刷新一次
