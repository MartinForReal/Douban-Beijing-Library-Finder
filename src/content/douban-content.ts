/**
 * Content Script for Douban book pages
 * Communicates with Service Worker to fetch book availability
 */

declare const chrome: any;

interface LibraryBook {
  available: boolean;
  borrowable: boolean;
  detailUrl: string;
  message?: string;
}

/**
 * 从豆瓣页面提取ISBN
 */
function extractISBN(): string | null {
  try {
    // 查找JSON-LD结构中的isbn字段
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data.isbn) {
          return String(data.isbn);
        }
      } catch (e) {
        continue;
      }
    }
    
    // 备选方案：从页面元数据提取
    const meta = document.querySelector('meta[property="og:url"]');
    if (meta) {
      const url = meta.getAttribute('content');
      const match = url?.match(/isbn[=\/](\d+)/);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Library Extension] ISBN extraction failed:', error);
    return null;
  }
}

/**
 * 通过Service Worker查询书籍可用性
 */
function queryBookAvailability(isbn: string): Promise<LibraryBook> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'checkBook', isbn },
      (response: any) => {
        if (response) {
          resolve(response);
        } else {
          resolve({
            available: false,
            borrowable: false,
            detailUrl: `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${isbn.replace(/-/g, '')}`
          });
        }
      }
    );
  });
}

/**
 * 创建图书馆借阅按钮
 */
function createLibraryButton(book: LibraryBook): HTMLElement {
  const container = document.createElement('div');
  container.className = 'library-extension-btn-container';
  container.style.cssText = `
    margin: 15px 0;
    padding: 0 15px;
  `;
  
  if (book.borrowable) {
    // 可借：创建蓝色借阅按钮
    const button = document.createElement('a');
    button.href = book.detailUrl;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.className = 'library-borrow-btn';
    button.textContent = '📚 嘉图借阅';
    button.style.cssText = `
      display: block;
      width: 100%;
      padding: 12px;
      background-color: #2E7FBE;
      color: white;
      text-align: center;
      border-radius: 4px;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: background-color 0.3s ease;
      box-sizing: border-box;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#1F5F96';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#2E7FBE';
    });
    
    container.appendChild(button);
  } else {
    // 不可借：创建信息链接
    const info = document.createElement('div');
    info.style.cssText = `
      padding: 12px;
      background-color: #F5F5F5;
      border-left: 4px solid #CCCCCC;
      border-radius: 2px;
      font-size: 13px;
      color: #666;
    `;
    
    const message = document.createElement('p');
    message.textContent = book.message || '嘉图云图书馆暂无可借';
    message.style.cssText = 'margin: 0 0 8px 0;';
    info.appendChild(message);
    
    const link = document.createElement('a');
    link.href = book.detailUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '查看馆藏详情 →';
    link.style.cssText = `
      color: #2E7FBE;
      text-decoration: none;
      font-weight: 500;
    `;
    link.addEventListener('mouseenter', () => {
      link.style.textDecoration = 'underline';
    });
    link.addEventListener('mouseleave', () => {
      link.style.textDecoration = 'none';
    });
    
    info.appendChild(link);
    container.appendChild(info);
  }
  
  return container;
}

/**
 * 在豆瓣页面中注入图书馆借阅按钮
 */
async function injectLibraryButton(): Promise<void> {
  try {
    const isbn = extractISBN();
    
    if (!isbn) {
      console.log('[Library Extension] No ISBN found on this page');
      return;
    }
    
    console.log('[Library Extension] Found ISBN:', isbn);
    
    // 查找右侧信息栏
    const buyinfoSection = document.querySelector('.buyinfo');
    
    if (!buyinfoSection) {
      console.log('[Library Extension] Cannot find .buyinfo section');
      return;
    }
    
    // 查询借阅状态（通过Service Worker）
    const book = await queryBookAvailability(isbn);
    
    // 如果都不可用且不可借，不进行任何操作
    if (!book.available && !book.borrowable) {
      console.log('[Library Extension] Book not available, skipping injection');
      return;
    }
    
    // 检查是否已经注入过
    if (document.querySelector('.library-extension-btn-container')) {
      console.log('[Library Extension] Button already injected');
      return;
    }
    
    // 创建并注入按钮
    const button = createLibraryButton(book);
    
    // 在buyinfo之后插入
    buyinfoSection.parentNode?.insertBefore(button, buyinfoSection.nextSibling);
    
    console.log('[Library Extension] Button injected successfully');
  } catch (error) {
    console.error('[Library Extension] Injection error:', error);
  }
}

/**
 * 当DOM变化时重新检查是否需要注入
 */
function setupMutationObserver(): void {
  let injected = false;
  
  const observer = new MutationObserver(() => {
    if (!injected && !document.querySelector('.library-extension-btn-container')) {
      injectLibraryButton().then(() => {
        injected = true;
      });
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
}

// 页面加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectLibraryButton();
    setupMutationObserver();
  });
} else {
  injectLibraryButton();
  setupMutationObserver();
}