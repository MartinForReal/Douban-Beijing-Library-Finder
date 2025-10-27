# Edge 扩展整体结构与 manifest 规划

## 目录结构
- `src/`
  - `content/`
    - `douban-content.ts`: 注入逻辑、ISBN 解析与 UI 注入
  - `background/`
    - `service-worker.ts`: 处理网络请求签名、跨域 fetch、中转消息
  - `shared/`
    - `api.ts`: 嘉图云接口封装
    - `sign.ts`: 动态签名算法
    - `storage.ts`: 本地配置缓存（例如在线客服链接）
  - `styles/`
    - `buttons.css`: 豆瓣右侧蓝色按钮样式
- `public/`
  - `icons/`：扩展图标
  - `manifest.json`
- `docs/`
  - `architecture.md`
  - `api.md`（后续补充接口字段说明）
- `package.json` + `tsconfig.json`：使用 Vite 构建 MV3 Service Worker 与内容脚本
- `scripts/`
  - `build.ts`: 构建 Edge 扩展产物
  - `watch.ts`: 开发时监听并输出到 `dist/` 目录

## manifest v3 核心配置
- `"manifest_version": 3`
- `"name"`/`"description"`：聚焦「豆瓣 + 嘉图云」借阅提示
- `"action"`：提供 popup（后续可扩展为设置页）
- `"permissions"`：
  - `"storage"`：缓存配置与用户偏好
  - `"scripting"`：注入 content script
  - `"activeTab"`：允许访问当前 Douban 页面
- `"host_permissions"`：
  - `"https://book.douban.com/subject/*"`
  - `"https://bjyth.jiatu.cloud/*"`
  - `"https://apps.jiatu.cloud/*"`
- `"background"`：注册 `service_worker`（TypeScript 编译后输出）
- `"content_scripts"`：匹配 `https://book.douban.com/subject/*`，注入编译后的 `douban-content.js`
- `"web_accessible_resources"`：暴露样式与图标资源
- `"icons"`：128、48、32、16 尺寸 PNG

## 构建/发布流程
1. 使用 `pnpm`（或 `npm`）脚本执行 Vite/ESBuild 构建。
2. 输出目录 `dist/` 包含最终 `manifest.json`、内容脚本、Service Worker、样式与资源。
3. 通过 Edge 扩展开发者模式加载 `dist/`，验证功能。
4. 发布前运行 `pnpm run build`，并通过 zip 打包 `dist/` 上传。

## 关键组件职责
- 内容脚本：
  - 解析 Douban 详情页 DOM 获取 ISBN。
  - 与背景脚本通信请求嘉图云接口结果。
  - 根据返回结果动态渲染按钮或详情链接。
  - 监听 DOM 变化，确保异步加载时仍能注入。
- 背景 Service Worker：
  - 统一处理跨域请求与签名计算。
  - 提供缓存层（如短期缓存同 ISBN 查询结果）。
  - 负责错误日志与重试策略。
- 共享模块：
  - `sign.ts` 复刻嘉图云签名算法，输出 `{timestamp, salt, sign, bizParam}`。
  - `api.ts` 组合 `fetch` 请求，并解析响应中的馆藏状态与借阅可用性。
  - `storage.ts` 管理本地配置、缓存过期策略。

## 后续工作指引
- 在 [`docs/api.md`](docs/api.md) 补充嘉图云接口字段与借阅判断标准。
- 确认 Vite/ESBuild 配置并初始化 TypeScript 项目。
- 设计蓝色按钮 UI 与不可借时的 fallback 链接样式。
- 编写自动化测试（如使用 Vitest 对签名方法与 API 封装进行单元测试）。