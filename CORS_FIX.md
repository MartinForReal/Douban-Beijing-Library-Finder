ORS_FIX.md</path>
<content"># CORS 问题解决方案

## 问题描述

使用 Content Script 直接从豆瓣页面调用嘉图云 API 时，会遇到 CORS（跨域资源共享）错误：

```
Access to XMLHttpRequest at 'https://apps.jiatu.cloud/...' from origin 'https://book.douban.com' 
has been blocked by CORS policy
```

## 根本原因

浏览器的同源策略（Same-Origin Policy）限制了网页中的脚本对不同源资源的访问。豆瓣书籍页面（`https://book.douban.com`）无法直接调用嘉图云 API（`https://apps.jiatu.cloud`）。

## 解决方案

### ✅ 采用 MV3 最佳实践：Service Worker 代理

在 MV3 标准中，Service Worker 具有特殊权限，可以绕过 CORS 限制。架构如下：

```
豆瓣页面 (Content Script)
    ↓ 发送消息 (chrome.runtime.sendMessage)
Service Worker
    ↓ 跨域请求（无CORS限制）
嘉图云 API
    ↓ 返回结果
Service Worker
    ↓ 返回响应
豆瓣页面 (Content Script)
    ↓ 更新 UI
```

### 关键代码

**1. Content Script 发送消息**
```typescript
chrome.runtime.sendMessage(
  { action: 'checkBook', isbn },
  (response: any) => {
    // 处理响应
  }
);
```

**2. Service Worker 处理消息和API调用**
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkBook') {
    checkBookAvailability(request.isbn).then((result) => {
      sendResponse(result);  // Service Worker 可以进行跨域请求
    });
    return true;  // 表示异步响应
  }
});
```

### 为什么有效

- **Service Worker** 是后台脚本，有扩展级别的权限
- **host_permissions** 在 manifest.json 中声明允许访问的域名
- 浏览器信任扩展的后台进程进行跨域请求
- Content Script 与 Service Worker 通过消息通道通信，避免直接跨域

## Manifest 配置

```json
{
  "host_permissions": [
    "https://book.douban.com/*",
    "https://apps.jiatu.cloud/*",
    "https://bjyth.jiatu.cloud/*"
  ]
}
```

这告诉浏览器扩展被允许访问这些域名。

## 调试

### 查看 Console 日志

**豆瓣页面日志**：
- F12 打开开发者工具
- Console 标签查看 `[Library Extension]` 日志

**Service Worker 日志**：
- edge://extensions
- 找到本扩展
- 点击"检查视图"打开 Service Worker 开发者工具

### 查看网络请求

在浏览器开发者工具的 Network 标签中：
- 不会看到对嘉图云的直接请求（因为在 Service Worker 中进行）
- Content Script 与 Service Worker 的通信是内部消息，不显示在 Network 中

## 性能优化

### 可选的缓存策略

在 Service Worker 中缓存查询结果，避免重复请求：

```typescript
const cache: { [key: string]: any } = {};

async function checkBookAvailability(isbn: string) {
  // 检查缓存
  if (cache[isbn]) {
    return cache[isbn];
  }
  
  // 调用 API
  const result = await fetchFromAPI(isbn);
  
  // 缓存结果（可选设置过期时间）
  cache[isbn] = result;
  
  return result;
}
```

## 相关资源

- [Chrome 扩展安全架构](https://developer.chrome.com/docs/extensions/mv3/security/)
- [MV3 消息传递](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [CORS 介绍](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)

## 总结

| 方案 | 优点 | 缺点 |
|------|------|------|
| Content Script 直接调用 | 简单 | ❌ 被CORS阻止 |
| **Service Worker 代理** | ✅ 遵循MV3标准，安全，高效 | 需要消息传递 |
| 代理服务器 | 可行 | 需要额外服务器，隐私风险 |

采用 Service Worker 代理是推荐的、也是最佳实践的方案。