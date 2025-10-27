# 豆瓣图书馆助手 - Edge 浏览器扩展

在豆瓣书籍详情页快速查询嘉图云图书馆借阅状态的 Edge 浏览器扩展。

## 功能特性

- 🔍 自动提取豆瓣书籍的 ISBN
- 📚 查询嘉图云图书馆是否收录该书
- ✅ 可借时显示蓝色借阅按钮，直达图书馆详情页
- 📖 不可借时显示馆藏详情链接
- 🔇 无结果时保持页面原状，不打扰用户
- 🚫 无需登录即可查询

## 系统要求

- Node.js 16+
- npm 或 yarn
- Microsoft Edge 浏览器

## 安装与使用

### 1. 克隆或下载项目

```bash
git clone <repository-url>
cd douban-library-extension
```

### 2. 安装依赖

```bash
npm install
```

### 3. 构建扩展

**开发模式**（未压缩，便于调试）：
```bash
npm run dev
```

**生产模式**（压缩优化）：
```bash
npm run build
```

构建完成后，文件将输出到 `dist/` 目录。

### 4. 在 Edge 中加载扩展

1. 打开 Microsoft Edge 浏览器
2. 地址栏输入 `edge://extensions`
3. 启用右上角的 **开发者模式**
4. 点击 **加载解包的扩展程序**
5. 选择项目中的 `dist` 文件夹
6. 完成！扩展已安装

### 5. 测试扩展

访问豆瓣书籍详情页，例如：
- https://book.douban.com/subject/1291546/ （《活着》）
- https://book.douban.com/subject/25843208/ （《三体》）

若书籍在嘉图云图书馆有记录，右侧信息栏会显示：
- **可借**：蓝色 "📚 嘉图借阅" 按钮
- **不可借**：灰色提示框和"查看馆藏详情"链接

## 开发指南

### 项目结构

```
├── src/
│   ├── shared/
│   │   ├── sign.ts          # 嘉图云签名算法
│   │   └── api.ts           # API 封装
│   ├── content/
│   │   └── douban-content.ts # 豆瓣页面内容脚本
│   └── background/
│       └── service-worker.ts # 后台 Service Worker
├── manifest.json             # 扩展配置
├── package.json              # 项目依赖
├── build.js                  # 构建脚本
└── README.md                 # 本文件
```

### 文件说明

| 文件 | 用途 |
|------|------|
| `sign.ts` | 实现嘉图云 API 的 MD5 签名算法 |
| `api.ts` | 封装书籍查询 API，处理响应 |
| `douban-content.ts` | 注入 DOM、提取 ISBN、调用 API、渲染 UI |
| `service-worker.ts` | 后台进程，处理扩展生命周期事件 |
| `manifest.json` | MV3 标准配置，声明权限和脚本 |

### 编码规范

- **语言**：TypeScript
- **编译目标**：ES2020
- **模块系统**：ESM

### 调试技巧

1. **查看控制台日志**：
   - 豆瓣页面：按 F12 打开开发者工具
   - Service Worker：edge://extensions → 找到扩展 → 检查视图

2. **日志前缀**：所有日志以 `[Library Extension]` 开头，便于过滤

3. **刷新扩展**：修改代码后需要在 edge://extensions 中点击 **刷新**

### 修改扩展

#### 修改按钮样式

编辑 `src/content/douban-content.ts` 中的 `createLibraryButton()` 函数：

```typescript
button.style.cssText = `
  background-color: #2E7FBE;  // 改变颜色
  padding: 12px;              // 改变内边距
  // ... 其他样式
`;
```

#### 修改查询逻辑

编辑 `src/shared/api.ts` 中的 `checkBookAvailability()` 函数，调整响应处理逻辑。

#### 修改注入位置

编辑 `src/content/douban-content.ts` 中的 `injectLibraryButton()` 函数，改变 `.buyinfo` 选择器。

## API 调用详解

### 嘉图云查询 API

**端点**：`https://apps.jiatu.cloud/client/book/detail`

**请求体**：
```json
{
  "libcode": "BJYTH",
  "channel": "bjyth_web",
  "timestamp": 1635000000,
  "salt": "随机字符串",
  "sign": "MD5签名",
  "bizParam": {
    "isbn": "9787020042494"
  }
}
```

**响应结构**（简化）：
```json
{
  "success": true,
  "data": {
    "isbn": "9787020042494",
    "borrowCount": 2,
    "status": 0,
    "message": "可借 2 本"
  }
}
```

## 故障排除

### 问题 1：扩展加载失败

**症状**：加载解包扩展时出错

**解决方案**：
- 确认 `dist` 文件夹中存在 `manifest.json`
- 检查 manifest.json 的格式是否正确
- 查看 Edge 的错误提示

### 问题 2：按钮不显示

**症状**：访问豆瓣书籍页，但没有看到借阅按钮

**解决方案**：
1. 打开浏览器开发者工具（F12）
2. 查看控制台中 `[Library Extension]` 的日志
3. 检查 ISBN 是否正确提取（日志会显示）
4. 检查网络请求是否成功（Network 标签）

### 问题 3：API 调用超时

**症状**：按钮显示但无响应

**解决方案**：
- 检查网络连接
- 嘉图云 API 可能暂时不可用
- 查看 Service Worker 日志

### 问题 4：签名错误

**症状**：API 返回签名错误

**解决方案**：
- 检查 `sign.ts` 中的签名算法
- 确认 `crypto-js` 库已正确安装
- 验证 salt 和 timestamp 的生成逻辑

## 性能优化

- 使用 esbuild 编译和压缩代码
- 缓存 API 响应（可选，在 `api.ts` 中实现）
- 使用 MutationObserver 检测 DOM 变化，避免重复注入

## 安全性考虑

- ✅ 无需用户登录信息
- ✅ 只访问豆瓣和嘉图云，不涉及其他第三方
- ✅ API 调用使用官方签名机制
- ✅ 内容脚本与 Service Worker 隔离

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 常见问题

**Q: 为什么有些书查不到？**  
A: 嘉图云数据库中可能还没有收录该书，或 ISBN 不匹配。

**Q: 支持其他图书馆吗？**  
A: 当前仅支持嘉图云。可通过修改 API 配置支持其他图书馆。

**Q: 可以在 Chrome 中使用吗？**  
A: 可以。MV3 标准的扩展在 Chrome 和 Edge 中通用，修改 manifest 中的权限即可。

**Q: 如何更新扩展？**  
A: 重新构建后在 edge://extensions 中点击刷新即可。