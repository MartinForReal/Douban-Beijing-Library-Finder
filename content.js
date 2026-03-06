// Content script for Douban book pages

// Function to extract ISBN from the page
function extractISBN () {
  const infoSection = document.querySelector('#info');
  if (!infoSection) return null;

  const infoText = infoSection.textContent;

  const isbnPatterns = [
    /ISBN:\s*([0-9]{13})/i,
    /ISBN:\s*([0-9]{10}[0-9X]?)/i,
    /ISBN:\s*([0-9-]{13,17})/i
  ];

  for (const pattern of isbnPatterns) {
    const match = infoText.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/-/g, '');
    }
  }

  return null;
}

// Function to extract book title from the page
function extractBookTitle () {
  const titleElement = document.querySelector('h1 span[property="v:itemreviewed"]');
  if (titleElement) return titleElement.textContent.trim();
  const h1 = document.querySelector('h1');
  if (h1) return h1.textContent.trim();
  return null;
}

// Function to search library by title for similar books
async function searchLibraryByTitle (title) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'searchByTitle',
      title
    });
    return response;
  } catch (error) {
    console.error('按书名搜索图书馆时出错:', error);
    return { found: false };
  }
}

// Function to check book availability in library
async function checkLibraryAvailability (isbn) {
  try {
    // Send message to background script to handle the cross-origin request
    const response = await chrome.runtime.sendMessage({
      action: 'checkLibrary',
      isbn
    });

    return response;
  } catch (error) {
    console.error('检查图书馆可用性时出错:', error);
    return { available: false, error: error.message };
  }
}

// Function to create and inject the borrow button
function injectBorrowButton (isbn, result) {
  const defaultSearchUrl = `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${encodeURIComponent(isbn)}`;
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

  if (!isbnSpan) return;

  const existingContainer = infoSection.querySelector('.library-borrow-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  // Normalize libraries from the result
  const libraries = Array.isArray(result.libraries)
    ? result.libraries.map(lib => {
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

  const available = Boolean(result.available);
  const hasBook = result.hasBook !== undefined
    ? Boolean(result.hasBook)
    : available || libraries.length > 0;
  const url = result.url || result.detailUrl || result.searchUrl || defaultSearchUrl;
  const availableCopies = typeof result.availableCopies === 'number'
    ? result.availableCopies
    : libraries.filter(lib => lib.available).length;
  const totalCopies = typeof result.totalCopies === 'number'
    ? result.totalCopies
    : libraries.length;

  const borrowButton = document.createElement('a');
  borrowButton.className = 'library-borrow-btn';

  if (available && availableCopies > 0) {
    borrowButton.textContent = '图书馆借阅';
    borrowButton.style.backgroundColor = '#37a';
    borrowButton.style.borderColor = '#2868a2';
  } else if (hasBook) {
    borrowButton.textContent = '图书馆查看';
    borrowButton.style.backgroundColor = '#666';
    borrowButton.style.borderColor = '#555';
  } else if (result.hasSimilar) {
    borrowButton.textContent = '搜索同名图书';
    borrowButton.style.backgroundColor = '#e09015';
    borrowButton.style.borderColor = '#c07a10';
  } else {
    borrowButton.textContent = '未找到此书';
    borrowButton.style.backgroundColor = '#999';
    borrowButton.style.borderColor = '#888';
  }

  if (hasBook && available) {
    borrowButton.href = result.detailUrl || url;
  } else if (hasBook) {
    borrowButton.href = result.detailUrl || result.searchUrl || url;
  } else if (result.hasSimilar) {
    borrowButton.href = result.similarSearchUrl || result.searchUrl || url;
  } else {
    borrowButton.href = result.searchUrl || url;
  }
  borrowButton.target = '_blank';
  borrowButton.rel = 'noopener noreferrer';

  // Build tooltip
  const tooltipLines = [];
  if (result.message) {
    tooltipLines.push(result.message);
  }
  if (libraries.length > 0) {
    tooltipLines.push(`共${totalCopies}本，可借${availableCopies}本`);
    libraries.forEach(lib => {
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

  if (available && availableCopies > 0) {
    const availabilityText = document.createElement('span');
    availabilityText.style.cssText = 'margin-left:5px;color:#37a;font-size:12px';
    availabilityText.textContent = `(可借${availableCopies}本)`;
    buttonContainer.appendChild(availabilityText);
  } else if (hasBook) {
    const unavailableText = document.createElement('span');
    unavailableText.style.cssText = 'margin-left:5px;color:#888;font-size:12px';
    unavailableText.textContent = '(已借完)';
    buttonContainer.appendChild(unavailableText);
  } else if (result.hasSimilar) {
    const similarText = document.createElement('span');
    similarText.style.cssText = 'margin-left:5px;color:#e09015;font-size:12px';
    similarText.textContent = '(ISBN未匹配，有同名图书)';
    buttonContainer.appendChild(similarText);
  }

  if (isbnTextNode && isbnTextNode.nodeType === Node.TEXT_NODE) {
    isbnTextNode.parentNode.insertBefore(buttonContainer, isbnTextNode.nextSibling);
  } else {
    infoSection.appendChild(buttonContainer);
  }
}

// Main function to initialize the extension
async function init () {
  const isbn = extractISBN();
  if (!isbn) return;

  const result = await checkLibraryAvailability(isbn);

  if (!result) {
    injectBorrowButton(isbn, { available: false, hasBook: false });
    return;
  }

  // If no book found by ISBN, try searching by title
  if (!result.hasBook && !result.error) {
    const title = extractBookTitle();
    if (title) {
      const titleResult = await searchLibraryByTitle(title);
      if (titleResult && titleResult.found) {
        result.hasSimilar = true;
        result.similarSearchUrl = titleResult.searchUrl;
      }
    }
  }

  injectBorrowButton(isbn, result);
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
