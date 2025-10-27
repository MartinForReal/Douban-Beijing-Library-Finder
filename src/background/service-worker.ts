/**
 * Service Worker for the Library Extension
 * Handles background tasks and message passing
 * Fetches book availability by scraping search page
 */

declare const chrome: any;

const SEARCH_URL = 'https://bjyth.jiatu.cloud/yuntu-pc/home/search/index';

interface LibraryBook {
  available: boolean;
  borrowable: boolean;
  detailUrl: string;
  message?: string;
}

/**
 * 从搜索页面HTML中解析书籍信息
 */
function parseBookInfo(html: string, isbn: string): LibraryBook {
  try {
    // 创建虚拟DOM解析HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 查找搜索结果中的书籍项
    const bookItems = doc.querySelectorAll('[class*="book"], [class*="item"], [data-isbn]');
    
    console.log(`[Library Extension] Found ${bookItems.length} potential book items`);
    
    // 遍历查找匹配的ISBN
    for (const item of bookItems) {
      const itemIsbn = item.getAttribute('data-isbn') || 
                       item.querySelector('[data-isbn]')?.getAttribute('data-isbn') ||
                       item.textContent?.match(/\d{13}|\d{10}/)?.[0];
      
      if (itemIsbn && itemIsbn.replace(/-/g, '') === isbn.replace(/-/g, '')) {
        // 找到匹配的书籍
        const detailLink = item.querySelector('a[href*="detail"], [onclick*="detail"]');
        const borrowText = item.textContent || '';
        
        // 判断是否可借
        const borrowable = borrowText.includes('可借') || borrowText.includes('可预约');
        
        const detailUrl = detailLink?.getAttribute('href') || 
                         `${SEARCH_URL}?word=${isbn}`;
        
        const message = borrowText.includes('可借') 
          ? (borrowText.match(/可借\s*(\d+)/)?.[1] || '有库存')
          : '暂无可借';
        
        console.log('[Library Extension] Book found:', { borrowable, message });
        
        return {
          available: true,
          borrowable,
          detailUrl: detailUrl.startsWith('http') ? detailUrl : SEARCH_URL + detailUrl,
          message
        };
      }
    }
    
    console.log('[Library Extension] No matching book found in search results');
    return {
      available: false,
      borrowable: false,
      detailUrl: `${SEARCH_URL}?word=${isbn}`
    };
  } catch (error) {
    console.error('[Library Extension] Error parsing book info:', error);
    return {
      available: false,
      borrowable: false,
      detailUrl: `${SEARCH_URL}?word=${isbn}`
    };
  }
}

/**
 * 查询书籍在嘉图云的借阅状态（通过搜索页面）
 */
async function checkBookAvailability(isbn: string): Promise<LibraryBook> {
  try {
    const cleanIsbn = isbn.replace(/-/g, '');
    const searchUrl = `${SEARCH_URL}?word=${cleanIsbn}`;
    
    console.log('[Library Extension] Fetching search page:', searchUrl);
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // 解析HTML获取书籍信息
    const bookInfo = parseBookInfo(html, cleanIsbn);
    
    // 如果没有找到，返回搜索页面链接
    if (!bookInfo.available) {
      bookInfo.detailUrl = searchUrl;
    }
    
    return bookInfo;
  } catch (error) {
    console.error('[Library Extension] API Error:', error);
    return {
      available: false,
      borrowable: false,
      detailUrl: `${SEARCH_URL}?word=${isbn.replace(/-/g, '')}`
    };
  }
}

// 监听扩展安装
chrome.runtime.onInstalled.addListener((details: any) => {
  if (details.reason === 'install') {
    console.log('[Library Extension] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[Library Extension] Extension updated');
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  console.log('[Library Extension] Message from content script:', request);
  
  if (request.action === 'checkBook') {
    checkBookAvailability(request.isbn).then((result) => {
      sendResponse(result);
    }).catch((error) => {
      console.error('[Library Extension] Error checking book:', error);
      sendResponse({
        available: false,
        borrowable: false,
        detailUrl: `${SEARCH_URL}?word=${request.isbn}`
      });
    });
    
    // 返回true表示异步响应
    return true;
  }
  
  if (request.action === 'ping') {
    sendResponse({ status: 'pong' });
  }
});

// 定期检查扩展状态（可选）
chrome.alarms.create('extensionHealthCheck', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === 'extensionHealthCheck') {
    console.log('[Library Extension] Health check: Extension is running');
  }
});

export {};