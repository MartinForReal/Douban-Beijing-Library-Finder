# 快速启动指南 - 豆瓣图书馆助手

按照以下步骤快速构建和安装 Edge 扩展。

## 📋 前置条件

- ✅ 已安装 Node.js 16+ （[下载](https://nodejs.org/)）
- ✅ 已安装 Microsoft Edge 浏览器
- ✅ 项目文件已下载或克隆

## 🚀 一键启动（3步）

### 第1步：安装依赖

打开终端/PowerShell，进入项目目录，运行：

```bash
npm install
```

**预期输出**：
```
added 72 packages, and audited 73 packages in 13s
```

---

### 第2步：构建扩展

```bash
npm run dev
```

**预期输出**：
```
✓ Build completed (development mode)
✓ Output directory: dist
✓ Ready to load in Edge: edge://extensions -> Load unpacked -> select dist folder
```

---

### 第3步：加载到 Edge 浏览器

1. **打开 Edge 扩展管理页面**
   ```
   edge://extensions
   ```

2. **启用开发者模式**
   - 右上角开关：**开发者模式** 打开（蓝色）

3. **加载扩展**
   - 点击 **加载解包的扩展程序**
   - 选择项目中的 `dist` 文件夹
   - 点击 **选择文件夹**

4. **完成！** 扩展已安装

---

## ✅ 验证安装

1. 访问豆瓣书籍详情页：
   - https://book.douban.com/subject/1291546/ （《活着》）

2. 向下滚动到右侧 **购买信息** 区域

3. 应该看到：
   - 📚 **蓝色"嘉图借阅"按钮**（如果书籍可借）
   - 或 **灰色提示框**（如果暂无可借）

4. 按 **F12** 打开开发者工具，在 **Console** 中查看日志

---

## 📝 常见命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发模式构建（未压缩） |
| `npm run build` | 生产模式构建（已压缩） |
| `npm run watch` | 监听文件变化自动构建 |

---

## 🔄 修改代码后重新加载

1. 修改源代码（`src/` 文件夹中的 `.ts` 文件）
2. 运行 `npm run dev` 重新构建
3. 在 `edge://extensions` 中找到扩展
4. 点击 **刷新** 按钮
5. 刷新豆瓣页面查看变化

---

## 🐛 常见问题

### Q1：按钮不显示？
**A**：
- 检查是否在豆瓣书籍详情页（URL: `https://book.douban.com/subject/*/`）
- 按 F12 查看 Console 中的日志
- 检查扩展是否已启用（edge://extensions）

### Q2：如何调试？
**A**：
1. 豆瓣页面：F12 打开开发者工具，查看 Console
2. Service Worker：edge://extensions → 扩展详情 → 检查视图
3. 查找日志前缀 `[Library Extension]`

### Q3：需要替换图标吗？
**A**：
- 可选，当前使用占位符
- 将 PNG 文件放入 `icons/` 文件夹
- 运行 `npm run dev` 重新构建

### Q4：在 Chrome 中也能用吗？
**A**：
- 可以！MV3 标准在 Chrome 和 Edge 中通用
- 修改 `manifest.json` 中的权限即可

---

## 📦 构建输出

`dist` 文件夹中包含：

```
dist/
├── manifest.json              # 扩展配置
├── src/
│   ├── content/
│   │   └── douban-content.js # 内容脚本（已编译）
│   └── background/
│       └── service-worker.js # Service Worker（已编译）
└── icons/                     # 图标文件夹
```

所有文件都已准备好在 Edge 中加载！

---

## 🎯 下一步

- 📖 详细文档：查看 [`README.md`](README.md)
- 🧪 测试指南：查看 [`TESTING.md`](TESTING.md)
- 🏗️ 架构设计：查看 [`docs/architecture.md`](docs/architecture.md)

---

## 🚨 故障排除

如果构建失败，尝试：

```bash
# 清空 node_modules 和 dist
rm -r node_modules dist

# 重新安装和构建
npm install
npm run dev
```

---

**祝你使用愉快！** 🎉

如有任何问题，请查看详细文档或提交 Issue。