# 豆瓣北京图书馆馆藏查询助手 (Douban Beijing Library Finder)

一个 Microsoft Edge 浏览器扩展，帮助您在豆瓣图书页面快速查询北京图书馆馆藏情况。

## ⚠️ 免责声明

本扩展的初衷仅为方便寻找豆瓣上已经被公共图书馆收藏的高分图书，帮助读者更便捷地发现和利用公共图书馆资源。

- 本扩展为个人开发的免费工具，仅供学习和个人使用
- 本扩展不以任何形式获取、存储或传播用户个人信息
- 本扩展不对豆瓣网或图书馆网站的内容负责
- 使用本扩展造成的任何后果由使用者自行承担
- 如果本扩展的使用违反了相关网站的服务条款，请立即停止使用
- 开发者保留随时修改或停止本扩展服务的权利

## 功能特性

- 🔍 自动从豆瓣图书页面提取 ISBN
- 📚 检查北京图书馆系统中的图书可用性
- 🔗 在豆瓣页面上添加"图书馆借阅"按钮
- 🎯 一键跳转到图书馆借阅页面

## 安装说明

### 方式一：从 GitHub Release 下载（推荐）

1. 访问 [Releases 页面](https://github.com/MartinForReal/Douban-Beijing-Library-Finder/releases)
2. 下载最新版本的 `douban-beijing-library-finder-vX.X.X.zip` 文件
3. 解压缩下载的文件
4. 打开 Microsoft Edge 浏览器，访问 `edge://extensions/`
5. 开启右上角的"开发者模式"
6. 点击"加载解压的扩展"，选择解压后的文件夹
7. 扩展安装完成！

### 方式二：从源码安装

1. 下载或克隆此项目到本地
   ```bash
   git clone https://github.com/MartinForReal/Douban-Beijing-Library-Finder.git
   cd Douban-Beijing-Library-Finder
   ```

2. 构建扩展
   ```bash
   npm install
   npm run build
   ```

3. 打开 Microsoft Edge 浏览器

4. 访问扩展管理页面
   - 在地址栏输入：`edge://extensions/`
   - 或通过菜单：设置 → 扩展

5. 开启"开发者模式"
   - 在页面右上角找到"开发者模式"开关并打开

6. 加载扩展
   - 点击"加载解压的扩展"按钮
   - 选择本项目中的 `dist` 文件夹
   - 确认加载

7. 扩展现已安装完成！

## 使用方法

1. 访问任意豆瓣图书详情页面
   - 例如：https://book.douban.com/subject/37339619/

2. 扩展会自动执行以下操作：
   - 提取页面上的 ISBN 信息
   - 检查图书在北京图书馆的可用性
   - 如果图书可借，在 ISBN 旁边显示"📚 图书馆借阅"按钮

3. 点击"图书馆借阅"按钮
   - 将在新标签页打开北京图书馆的搜索结果页面
   - 可以直接查看借阅信息并进行借阅操作

## 项目结构

```
douban-library-extension/
├── manifest.json        # 扩展配置文件
├── content.js          # 内容脚本（在豆瓣页面运行）
├── background.js       # 后台脚本（处理跨域请求）
├── styles.css         # 样式文件
├── icons/             # 扩展图标
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── ARCHITECTURE.md    # 架构设计文档
└── README.md         # 本文档
```

## 技术实现

- **Manifest V3**: 使用最新的 Chrome/Edge 扩展标准
- **Content Scripts**: 在豆瓣页面上提取 ISBN 并注入借阅按钮
- **Service Worker**: 处理与图书馆系统的跨域请求
- **DOM 操作**: 动态修改页面内容，添加交互元素

## 支持的图书馆

目前仅支持：
- 北京图书馆 (https://bjyth.jiatu.cloud)

## 注意事项

- 本扩展需要访问豆瓣网和北京图书馆网站的权限
- 图书可用性检查基于图书馆网站的搜索结果
- 某些图书可能在图书馆系统中没有记录
- 实际借阅需要有效的图书馆读者证

## 隐私说明

- 本扩展不收集任何用户数据
- 所有请求仅在豆瓣和图书馆网站之间进行
- 不包含任何追踪或分析代码

## 故障排除

### 按钮没有出现
- 确认页面是豆瓣图书详情页
- 检查页面是否包含 ISBN 信息
- 查看浏览器控制台是否有错误信息

### 点击按钮没有反应
- 确认浏览器没有阻止弹出窗口
- 检查网络连接是否正常

### 扩展无法加载
- 确认已开启开发者模式
- 检查文件结构是否完整
- 重新加载扩展

## 开发

### 本地开发

1. 克隆仓库并安装依赖
   ```bash
   git clone https://github.com/MartinForReal/Douban-Beijing-Library-Finder.git
   cd Douban-Beijing-Library-Finder
   npm install
   ```

2. 构建项目
   ```bash
   npm run build
   ```

3. 监听文件变化自动构建
   ```bash
   npm run watch
   ```

4. 打包扩展为 ZIP 文件
   ```bash
   npm run pack
   ```

### 调试模式

1. 在扩展管理页面找到本扩展
2. 点击"背景页"或"检查视图"
3. 使用 Chrome DevTools 进行调试

### 查看日志

打开浏览器控制台（F12），可以看到扩展的运行日志：
- `豆瓣图书馆借阅助手已启动` - 扩展成功加载
- `找到ISBN: xxx` - 成功提取 ISBN
- `借阅按钮已添加` - 按钮成功添加

### 发布新版本

1. 更新 `manifest.json` 和 `package.json` 中的版本号
2. 提交更改并推送到 GitHub
3. 创建新的 Git tag
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. GitHub Actions 会自动构建并创建 Release

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 更新日志

### v1.0.0 (2024-10-28)
- 初始版本发布
- 支持豆瓣图书页面 ISBN 提取
- 支持北京图书馆借阅状态检查
- 添加借阅按钮功能

## 联系方式

如有问题或建议，请通过 GitHub Issues 联系。

---

Made with ❤️ for book lovers