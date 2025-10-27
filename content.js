// Content script for Douban book pages
console.log('豆瓣图书馆借阅助手已启动');

// Inject styles
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .library-borrow-btn {
      display: inline-block;
      padding: 3px 10px;
      margin-left: 10px;
      background-color: #37a;
      color: #fff !important;
      text-decoration: none !important;
      border-radius: 3px;
      font-size: 12px;
      line-height: 1.5;
      vertical-align: middle;
      transition: background-color 0.2s ease;
      cursor: pointer;
      font-weight: normal;
      border: 1px solid #2868a2;
      font-family: Helvetica, Arial, sans-serif;
      white-space: nowrap;
    }
    
    .library-borrow-btn:hover {
      background-color: #2868a2;
      color: #fff !important;
      text-decoration: none !important;
    }
    
    .library-borrow-btn:active {
      background-color: #1f5082;
      border-color: #1f5082;
    }
    
    .library-borrow-btn::before {
      content: "📚 ";
      margin-right: 2px;
    }
  `;
  document.head.appendChild(style);
}

// Function to extract ISBN from the page
function extractISBN() {
  // Look for ISBN in the book info section
  const infoSection = document.querySelector('#info');
  if (!infoSection) {
    console.log('未找到书籍信息区域');
    return null;
  }

  // Try to find ISBN using different patterns
  const infoText = infoSection.textContent;
  
  // Match ISBN-13 (13 digits) or ISBN-10 (10 digits with possible X at the end)
  const isbnPatterns = [
    /ISBN:\s*([0-9]{13})/i,
    /ISBN:\s*([0-9]{10}[0-9X]?)/i,
    /ISBN:\s*([0-9-]{13,17})/i  // ISBN with hyphens
  ];

  for (const pattern of isbnPatterns) {
    const match = infoText.match(pattern);
    if (match && match[1]) {
      // Remove hyphens if present
      const isbn = match[1].replace(/-/g, '');
      console.log('找到ISBN:', isbn);
      return isbn;
    }
  }

  console.log('未找到ISBN');
  return null;
}

// Function to check book availability in library
async function checkLibraryAvailability(isbn) {
  try {
    // Send message to background script to handle the cross-origin request
    const response = await chrome.runtime.sendMessage({
      action: 'checkLibrary',
      isbn: isbn
    });
    
    return response;
  } catch (error) {
    console.error('检查图书馆可用性时出错:', error);
    return { available: false, error: error.message };
  }
}

// Function to create and inject the borrow button
function injectBorrowButton(isbn, libraryInfo = {}) {
  const defaultSearchUrl = `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${isbn}`;
  const infoSection = document.querySelector('#info');
  if (!infoSection) return;

  const spans = infoSection.querySelectorAll('span.pl');
  let isbnSpan = null;

  for (const span of spans) {
    if (span.textContent.includes('ISBN')) {
      isbnSpan = span;
      break;
    }
  }

  if (!isbnSpan) {
    console.log('未找到ISBN显示位置');
    return;
  }

  const existingContainer = infoSection.querySelector('.library-borrow-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  const normalizedLibraries = Array.isArray(libraryInfo.libraries)
    ? libraryInfo.libraries.map(lib => {
        if (typeof lib === 'string') {
          return { name: lib, available: true, availableCount: 1 };
        }
        if (lib && typeof lib === 'object') {
          return {
            name: lib.name || '图书馆',
            available: lib.available !== false,
            availableCount: typeof lib.availableCount === 'number' ? lib.availableCount : (lib.available ? 1 : 0)
          };
        }
        return { name: '图书馆', available: false, availableCount: 0 };
      })
    : [];

  const info = {
    available: Boolean(libraryInfo.available),
    hasBook: libraryInfo.hasBook !== undefined
      ? Boolean(libraryInfo.hasBook)
      : Boolean(libraryInfo.available) || normalizedLibraries.length > 0,
    detailUrl: libraryInfo.detailUrl || null,
    searchUrl: libraryInfo.searchUrl || null,
    url: libraryInfo.url || libraryInfo.detailUrl || libraryInfo.searchUrl || defaultSearchUrl,
    totalCopies: typeof libraryInfo.totalCopies === 'number'
      ? libraryInfo.totalCopies
      : normalizedLibraries.length,
    availableCopies: typeof libraryInfo.availableCopies === 'number'
      ? libraryInfo.availableCopies
      : normalizedLibraries.filter(lib => lib.available).length,
    libraries: normalizedLibraries,
    message: libraryInfo.message || ''
  };

  const borrowButton = document.createElement('a');
  borrowButton.className = 'library-borrow-btn';

  if (info.available && info.availableCopies > 0) {
    borrowButton.textContent = '图书馆借阅';
    borrowButton.style.backgroundColor = '#37a';
    borrowButton.style.borderColor = '#2868a2';
  } else if (info.hasBook) {
    borrowButton.textContent = '图书馆查看';
    borrowButton.style.backgroundColor = '#666';
    borrowButton.style.borderColor = '#555';
  } else {
    borrowButton.textContent = '未找到此书';
    borrowButton.style.backgroundColor = '#999';
    borrowButton.style.borderColor = '#888';
    borrowButton.style.cursor = 'pointer';
  }

  let targetHref = info.url || defaultSearchUrl;

  if (info.hasBook) {
    if (info.available) {
      targetHref = info.detailUrl || info.url || info.searchUrl || defaultSearchUrl;
    } else {
      targetHref = info.detailUrl || info.searchUrl || info.url || defaultSearchUrl;
    }
  } else {
    targetHref = info.searchUrl || info.url || defaultSearchUrl;
  }

  borrowButton.href = targetHref;
  borrowButton.target = '_blank';
  borrowButton.rel = 'noopener noreferrer';

  const tooltipLines = [];
  if (info.message) {
    tooltipLines.push(info.message);
  }
  if (info.libraries.length > 0) {
    tooltipLines.push(`共${info.totalCopies}本，可借${info.availableCopies}本`);
    info.libraries.forEach(lib => {
      const countText = lib.availableCount !== undefined ? `${lib.availableCount}本` : (lib.available ? '可借' : '不可借');
      tooltipLines.push(`${lib.name}：${countText}`);
    });
  }
  if (tooltipLines.length > 0) {
    borrowButton.title = tooltipLines.join('\n');
  }

  const isbnTextNode = isbnSpan.nextSibling;
  const buttonContainer = document.createElement('span');
  buttonContainer.className = 'library-borrow-container';
  buttonContainer.style.marginLeft = '10px';
  buttonContainer.appendChild(borrowButton);

  if (info.available && info.availableCopies > 0) {
    const availabilityText = document.createElement('span');
    availabilityText.style.marginLeft = '5px';
    availabilityText.style.color = '#37a';
    availabilityText.style.fontSize = '12px';
    availabilityText.textContent = `(可借${info.availableCopies}本)`;
    buttonContainer.appendChild(availabilityText);
  } else if (info.hasBook) {
    const unavailableText = document.createElement('span');
    unavailableText.style.marginLeft = '5px';
    unavailableText.style.color = '#888';
    unavailableText.style.fontSize = '12px';
    unavailableText.textContent = '(已借完)';
    buttonContainer.appendChild(unavailableText);
  }

  if (isbnTextNode && isbnTextNode.nodeType === Node.TEXT_NODE) {
    isbnTextNode.parentNode.insertBefore(buttonContainer, isbnTextNode.nextSibling);
  } else {
    infoSection.appendChild(buttonContainer);
  }

  console.log('借阅按钮已更新', info);
}

// Main function to initialize the extension
async function init() {
  // Inject styles first
  injectStyles();
  
  // Extract ISBN from the page
  const isbn = extractISBN();
  
  if (!isbn) {
    console.log('此页面没有ISBN信息');
    return;
  }

  // Check library availability
  const result = await checkLibraryAvailability(isbn);
  const defaultSearchUrl = `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${isbn}`;

  if (!result) {
    console.warn('未收到图书馆查询结果');
    injectBorrowButton(isbn, { available: false, hasBook: false });
    return;
  }

  if (result.error) {
    console.warn('图书馆查询出错:', result.error);
  }

  const normalizedLibraries = Array.isArray(result.libraries)
    ? result.libraries.map(lib => {
        if (typeof lib === 'string') {
          return { name: lib, available: true };
        }
        if (lib && typeof lib === 'object') {
          return {
            name: lib.name || '图书馆',
            available: lib.available !== false
          };
        }
        return { name: '图书馆', available: false };
      })
    : [];

  const libraryInfo = {
    available: Boolean(result.available),
    hasBook: result.hasBook !== undefined
      ? Boolean(result.hasBook)
      : Boolean(result.available) || normalizedLibraries.length > 0,
    detailUrl: result.detailUrl || null,
    searchUrl: result.searchUrl || null,
    url: result.url || result.detailUrl || result.searchUrl || defaultSearchUrl,
    totalCopies: typeof result.totalCopies === 'number'
      ? result.totalCopies
      : normalizedLibraries.length,
    availableCopies: typeof result.availableCopies === 'number'
      ? result.availableCopies
      : normalizedLibraries.filter(lib => lib.available).length,
    libraries: normalizedLibraries,
    message: result.message
  };

  injectBorrowButton(isbn, libraryInfo);

  if (libraryInfo.message) {
    console.log('图书馆提示:', libraryInfo.message);
  }
}

// Wait for the page to fully load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already loaded
  init();
}

// Also listen for page navigation (for single-page apps)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Re-initialize on URL change
    setTimeout(init, 500);
  }
}).observe(document, { subtree: true, childList: true });