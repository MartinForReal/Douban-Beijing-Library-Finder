# 发布「豆瓣北京图书馆馆藏查询助手」到 Microsoft Edge 加载项商店

此文档汇总了在 **Edge 加载项商店 (Microsoft Edge Add-ons)** 发布本扩展所需的全部材料与步骤。
发布账号邮箱：**sxfanus@outlook.com**（注册手机等需先在 Partner Center 完善）。

## 1. 需要提交的文件（已准备就绪）

| 文件 | 说明 | 状态 |
|---|---|---|
| `douban-beijing-library-finder-v1.1.1.zip` | 扩展安装包（解压根目录含 manifest.json 等的 zip） | ✅ 已生成 |
| `store-screenshot.png` (1400×900) | 截图：扩展按钮运行效果 | ✅ 已生成 |
| `real-douban-test.png` | 可选：整页长截图 | ✅ 已生成 |

> Edge 商店要求上传的 zip **直接包含** manifest.json（不要套一层文件夹）。上面这个 zip 是直接打包 dist 中的文件，符合要求。

## 2. 商店提交表单内容

登录 [Edge Add-ons Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) 后，新建扩展，逐项填写：

### 扩展基本信息
- **扩展名称**: 豆瓣北京图书馆馆藏查询助手
- **扩展描述（放一部）**:
  - 中文：在豆瓣图书页面一键查询北京图书馆馆藏。自动提取 ISBN，检查可借状态，可借时显示“图书馆借阅”按钮并直达借阅页；ISBN 未匹配时自动按书名搜索同名图书。个人免费工具，不收集任何数据。
- **版本号**: 1.1.1
- **语言**: 简体中文

## 3. 权限声明（提交时需要逐条填写用途）

manifest.json 中声明的权限并向商店说明用途：

| 权限 / 域名 | 用途说明（可直接复制） |
|---|---|
| `activeTab` | 仅在用户主动打开豆瓣图书详情页时读取该页信息，用于提取 ISBN。 |
| `declarativeNetRequest` | 修改图书馆 API 请求头（Origin/Referer）以通过 CORS 校验，完成馆藏查询。 |
| `https://book.douban.com/*` | 内容脚本运行页面：豆瓣图书详情页。 |
| `https://apps.jiatu.cloud/*` | 图书馆的远程查询接口地址。 |
| `https://bjyth.jiatu.cloud/*` | 图书馆搜索/详情页地址。 |

## 4. 隐私声明

Edge 商店若被判为“需要隐私政策”时，可自建一个 GitHub Pages 隐私政策并填 URL。以下为模板，可复制到 `https://<你的用户名>.github.io/<repo>/PRIVACY` 或任何可公开访问的页面：

---
# 隐私政策

本扩展《豆瓣北京图书馆馆藏查询助手》不收集、不存储、不传输任何用户个人数据。

- 扩展仅在豆瓣图书详情页提取图书的 ISBN 与书名，用于查询北京图书馆馆藏。
- 查询请求直接由你的浏览器发往北京图书馆系统（apps.jiatu.cloud / bjyth.jiatu.cloud），扩展不中转、不记录。
- 扩展不包含任何广告、统计、Crash 收集或第三方 SDK。
- 无 Cookie、无账号体系、无位置信息。

如需联系开发者，请通过 GitHub Issues 或邮箱：`sxdogus@outlook.com`。
---

## 5. 提交步骤（需要您本人操作，涉及登录与 2FA）

1. 打开 [Edge Add-ons Partner Center](https://partner.microsoft.com/edge/microsoftedge)。
2. 使用 `sxfanus@outlook.com` 登录（需完成 Microsoft 账户注册/验证）。首次需同意条款并完成邮箱验证。
3. 点击 **新建扩展 / New**，选择「扩展（Extension）」。
4. 上传 `douban-beijing-library-finder-v1.1.1.zip`。
5. 填写上方第 2 节的名称与描述（文字可粘贴）。
6. 上传截图：至少 1 张，建议 3 张，`store-screenshot.png` 即可；补充说明图标可选。
7. 按第 3 节逐条填写权限用途；按第 4 节填写隐私政策 URL。
8. 提交审核。审核通过后即上架。

> ⚠️ 注意：Partner Center 登录需要您本人的浏览器/2FA 验证，我无法代替您登录或点击提交。上述表单内容均已帮您整理好，您只需照抄/粘贴上传。

## 6. 常见问题
- **为何显示“需要隐私政策”？**：扩展声明了 `declarativeNetRequest` 与主机权限，商店可能要求隐私政策。按第 4 节提供即可。
- **审核一般多久？**：通常 1–3 个工作日。
- **zip 上传报“清单无效”？**：请确认 zip 根目录直接是 manifest.json（我已按此打包）。
- **需要 Chrome 商店？**：同样材料可直接上传 [Chrome Web Store](https://chrome.google.com/webstore/devconsole/)。

## 7. 需要的文件清单（本轮已生成）
- `douban-beijing-library-finder-v1.1.1.zip`
- `store-screenshot.png` (1400×900)
- `real-douban-test.png` (整页)
