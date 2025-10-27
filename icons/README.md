cons/README.md</path>
<content"># 图标文件

本文件夹用于存放 Edge 扩展的图标文件。

## 所需图标规格

### 图标尺寸

需要以下三种尺寸的 PNG 格式图标：

| 文件名 | 尺寸 | 用途 |
|--------|------|------|
| `icon-16.png` | 16×16 px | 地址栏显示 |
| `icon-48.png` | 48×48 px | 扩展管理页面 |
| `icon-128.png` | 128×128 px | Microsoft Store 和扩展详情 |

### 设计建议

- **格式**：PNG（透明背景）
- **设计元素**：图书馆相关图标（书、借阅卡等）
- **配色**：蓝色系（与扩展借阅按钮颜色保持一致 #2E7FBE）
- **风格**：简洁、现代、易于识别

## 快速生成（可选）

如果你想快速生成占位符图标，可以使用在线工具或 ImageMagick：

```bash
# 使用 ImageMagick 生成蓝色占位符
convert -size 128x128 xc:"#2E7FBE" icon-128.png
convert -size 48x48 xc:"#2E7FBE" icon-48.png
convert -size 16x16 xc:"#2E7FBE" icon-16.png
```

## 替换图标

1. 将你的 PNG 文件放入本文件夹
2. 确保文件名与 `manifest.json` 中指定的名称一致
3. 重新构建扩展：`npm run dev` 或 `npm run build`
4. 在 edge://extensions 中刷新扩展

## 参考

- [Microsoft Edge 扩展图标指南](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/part1-simple-extension)
- [图标尺寸要求](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/store/images)