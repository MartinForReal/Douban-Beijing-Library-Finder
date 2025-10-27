# 实现详解 - 豆瓣图书馆助手

## 架构概述

本扩展采用**页面爬取模式**而不是 REST API 模式，以解决 CORS 和 API 可用性问题。

### 架构流程

```
豆瓣书籍详情页
    ↓
[1] Content Script 提取 ISBN
    ↓
[2] 发送消息给 Service Worker
    chrome.runtime.sendMessage({ action: 'checkBook', isbn })
    ↓
[3] Service Worker 访问搜索页面
    fetch('https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=ISBN')
    ↓
[4] 解析 HTML 获取书籍信息
    - 查找匹配的 ISBN
    - 提取可借状态
    - 构建详情页链接
    ↓
[5] 返回结果给 Content Script
    ↓
[6] 更新豆瓣页面 UI
    - 可借：蓝色按钮 + 链接
    - 不可借：灰色提示 + 链接
```

## 核心组件详解

### 1. Content Script (`src/content/douban-content.ts`)

**职责**：
- 从豆瓣页面提取 ISBN
- 与 Service Worker 通信
- 渲染 UI 元素

**关键函数**：
```typescript
// 提取 ISBN
function extractISBN(): string | null
  ├─ JSON-LD 解析（优先）
  └─ 备选方案：元数据提取

// 通过 Service Worker 查询
function queryBookAvailability(isbn: string): Promise<LibraryBook>
  └─ chrome.runtime.sendMessage()

// 创建 UI
function createLibraryButton(book: LibraryBook): HTMLElement
  ├─ 可借状态 → 蓝色按钮
  └─ 不可借状态 → 灰色提示框
```

### 2. Service Worker (`src/background/service-worker.ts`)

**职责**：
- 接收 Content Script 的消息
- 访问嘉图云搜索页面
- 解析 HTML 获取书籍信息
- 返回结果

**关键函数**：
```typescript
// 查询可用性（通过爬取）
async function checkBookAvailability(isbn: string): Promise<LibraryBook>
  ├─ 构建搜索 URL
  ├─ fetch() 获取 HTML
  ├─ parseBookInfo() 解析结果
  └─ 返回书籍信息

// 解析 HTML
function parseBookInfo(html: string, isbn: string): LibraryBook
  ├─ DOMParser 解析 HTML
  ├─ 查询书籍元素
  ├─ 匹配 ISBN
  ├─ 提取借阅状态
  └─ 返回结构化数据
```

### 3. 消息通信

**Content Script 发送**：
```typescript
chrome.runtime.sendMessage(
  { action: 'checkBook', isbn: '9787572624247' },
  (response) => {
    // response: LibraryBook
    // {
    //   available: true/false,
    //   borrowable: true/false,
    //   detailUrl: 'https://...',
    //   message?: '可借 2 本'
    // }
  }
);
```

**Service Worker 处理**：
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkBook') {
    checkBookAvailability(request.isbn).then((result) => {
      sendResponse(result);  // 异步响应
    });
    return true;  // 表示异步
  }
});
```

## 数据流详解

### 成功流程示例

**输入**：ISBN `9787572624247`（《活着》）

**过程**：
1. **提取 ISBN**
   ```javascript
   extractISBN() → '9787572624247'
   ```

2. **发送消息**
   ```javascript
   sendMessage({
     action: 'checkBook',
     isbn: '9787572624247'
   })
   ```

3. **Service Worker 处理**
   ```
   构建URL: https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=9787572624247
   fetch() → HTML响应
   DOMParser 解析
   查找 data-isbn="9787572624247" 的元素
   提取 textContent: "活着 ... 可借 2 本"
   ```

4. **返回结果**
   ```javascript
   {
     available: true,
     borrowable: true,
     detailUrl: 'https://bjyth.jiatu.cloud/...',
     message: '可借 2 本'
   }
   ```

5. **渲染 UI**
   ```html
   <a class="library-borrow-btn" href="..." style="background: #2E7FBE">
     📚 嘉图借阅
   </a>
   ```

### 失败/无结果流程

**输入**：未在嘉图云收录的ISBN

**过程**：
1. fetch() 返回搜索页面
2. parseBookInfo() 找不到匹配的ISBN
3. 返回：
   ```javascript
   {
     available: false,
     borrowable: false,
     detailUrl: 'https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=...'
   }
   ```
4. Content Script 检查 `available && borrowable` 为 false，不注入 UI

## 技术特点

### ✅ 优势

1. **无 CORS 问题**
   - Service Worker 可以访问任何域名（已在 manifest 中声明权限）
   - 不依赖第三方 CORS 代理

2. **无 API 依赖**
   - 不依赖不稳定的 REST API
   - 直接爬取页面更稳定

3. **实时数据**
   - 搜索页面的数据是实时的
   - 不需要数据库同步

4. **易于维护**
   - HTML 结构变化时易于适配
   - 选择器调整即可

### ⚠️ 注意事项

1. **HTML 选择器依赖**
   - 如果嘉图云网站修改了 HTML 结构，需要更新选择器
   - 建议定期维护

2. **页面加载时间**
   - 需要 fetch 完整 HTML（通常 100-500KB）
   - 比 API 调用稍慢，但可接受

3. **错误处理**
   - 网络错误时优雅降级
   - 返回搜索页面链接供用户手动查看

## 扩展性

### 支持多个图书馆

修改 `SEARCH_URL` 常量即可支持其他图书馆：

```typescript
// 原配置（嘉图云）
const SEARCH_URL = 'https://bjyth.jiatu.cloud/yuntu-pc/home/search/index';

// 修改为其他图书馆
// const SEARCH_URL = 'https://other-library.com/search';
```

### 改进 HTML 选择器

如果爬取效果不佳，改进 `parseBookInfo()` 函数中的选择器：

```typescript
// 当前选择器
const bookItems = doc.querySelectorAll('[class*="book"], [class*="item"]');

// 可以更具体地指定
const bookItems = doc.querySelectorAll('.search-result-item');
const borrowText = item.querySelector('.borrow-status')?.textContent;
```

## 调试技巧

### 1. 查看 HTML 响应

在 Service Worker 中添加日志：

```typescript
console.log('[Library Extension] HTML length:', html.length);
console.log('[Library Extension] First 500 chars:', html.substring(0, 500));
```

### 2. 验证选择器

在浏览器控制台测试：

```javascript
const parser = new DOMParser();
const doc = parser.parseFromString(htmlString, 'text/html');
doc.querySelectorAll('[class*="book"]').length;  // 应该 > 0
```

### 3. 检查日志

**Content Script 日志**（F12 → Console）：
```
[Library Extension] Found ISBN: 9787572624247
[Library Extension] Button injected successfully
```

**Service Worker 日志**（edge://extensions → 检查视图）：
```
[Library Extension] Fetching search page: https://...
[Library Extension] Found X potential book items
[Library Extension] Book found: { borrowable: true, message: '可借 2 本' }
```

## 性能优化（可选）

### 添加缓存

在 Service Worker 中缓存结果，避免重复查询：

```typescript
const cache: { [key: string]: LibraryBook } = {};

async function checkBookAvailability(isbn: string): Promise<LibraryBook> {
  if (cache[isbn]) {
    console.log('[Library Extension] Using cached result');
    return cache[isbn];
  }
  
  const result = await fetchAndParse(isbn);
  cache[isbn] = result;
  
  return result;
}
```

### 缓存过期

为缓存设置 TTL（生存时间）：

```typescript
interface CacheEntry {
  data: LibraryBook;
  timestamp: number;
}

const TTL = 1 * 60 * 60 * 1000;  // 1小时

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < TTL;
}
```

## 总结

本实现采用**页面爬取 + Service Worker 代理**的方案，结合了以下优点：
- ✅ 无 CORS 限制
- ✅ 无 API 依赖
- ✅ 实时数据
- ✅ MV3 标准
- ✅ 易于维护

是一个稳定、可靠、实用的解决方案。