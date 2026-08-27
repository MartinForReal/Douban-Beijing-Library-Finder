// Background service worker for handling cross-origin requests
importScripts('md5.js'); // provides the global `md5` used for request signing

const API_URL = 'https://apps.jiatu.cloud/client/book/search';
const SEARCH_BASE = 'https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=';
const DETAIL_BASE = 'https://bjyth.jiatu.cloud/yuntu-pc/book/detail?id=';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkLibrary') {
    checkLibraryAvailability(request.isbn)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ available: false, error: error.message }));
    return true; // keep the message channel open for the async reply
  }

  if (request.action === 'searchByTitle') {
    searchLibraryByTitle(request.title)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ found: false, error: error.message }));
    return true;
  }
});

// Generate salt and sign for API authentication
function generateAuthParams (bizParam) {
  const salt = Math.floor(Math.random() * 1000000 + 1);
  const timestamp = Date.now();
  const secret = 'a8fdad21e5c9ef44aa96e6df1404e811';
  const sign = md5(JSON.stringify(bizParam) + timestamp + secret);
  return { salt, sign, timestamp };
}

// Single search call to the Beijing Library API. Resolves with { searchUrl, data }.
// searchType: 1 = find exact book by ISBN, 0 = fuzzy search by title.
// Throws on transport/HTTP failure so each caller handles it in its own way.
async function searchBook (keyword, searchType) {
  const bizParam = { holdingStatus: 0, pageNo: 1, pageSize: 8, sort: '', sortCol: '', keyword, searchType };
  const searchUrl = SEARCH_BASE + encodeURIComponent(keyword);

  const auth = generateAuthParams(bizParam);
  if (!auth) throw new Error('认证参数生成失败');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json;charset=UTF-8',
      clientinfo: '{"libcode":"BJYTH","channel":"bjyth_web"}'
    },
    body: JSON.stringify({
      libcode: 'BJYTH',
      channel: 'bjyth_web',
      timestamp: auth.timestamp,
      salt: auth.salt,
      sign: auth.sign,
      bizParam
    })
  });

  if (!response.ok) throw new Error('API request failed with status: ' + response.status);
  return { searchUrl, data: await response.json() };
}

// Check book availability in the Beijing Library by ISBN
async function checkLibraryAvailability (isbn) {
  try {
    const { searchUrl, data } = await searchBook(isbn, 1);

    if (!data || !data.success || !data.data) {
      return { available: false, url: searchUrl, detailUrl: null, searchUrl, hasBook: false, message: (data && data.msg) || '查询失败' };
    }

    const books = data.data.books || [];
    if (books.length === 0) {
      return { available: false, url: searchUrl, detailUrl: null, searchUrl, hasBook: false, message: '图书馆暂无此书' };
    }

    // Build library name lookup from aggData
    const libraryNameMap = {};
    if (data.data.aggData) {
      const list = data.data.aggData.find(agg => agg.lableCode === 'aggLibcode');
      if (list && list.labelValueList) list.labelValueList.forEach(lib => { libraryNameMap[lib.name] = lib.label; });
    }

    // Aggregate availability across all matched books
    const allLibraries = [];
    let totalAvailable = 0;
    let hasAvailable = false;

    for (const book of books) {
      const availLibs = book.availableLibs || [];
      const ownerLibs = book.ownerLibs || [];

      if (availLibs.length) {
        for (const libcode of availLibs) {
          if (!libraryNameMap[libcode]) continue;
          allLibraries.push({ name: libraryNameMap[libcode], available: true, availableCount: book.availableNumber || 1 });
        }
        totalAvailable += book.availableNumber || 0;
        hasAvailable = true;
      }

      for (const libcode of ownerLibs) {
        if (availLibs.includes(libcode) || !libraryNameMap[libcode]) continue;
        allLibraries.push({ name: libraryNameMap[libcode], available: false, availableCount: 0 });
      }
    }

    const detailUrl = books[0].id
      ? DETAIL_BASE + encodeURIComponent(books[0].id)
      : null;

    return {
      available: hasAvailable,
      url: detailUrl || searchUrl,
      detailUrl,
      searchUrl,
      hasBook: true,
      libraries: allLibraries,
      totalCopies: books.reduce((sum, b) => sum + (b.availableNumber || 0), 0),
      availableCopies: totalAvailable,
      message: hasAvailable
        ? '共 ' + allLibraries.filter(l => l.available).length + ' 个分馆可借，共 ' + totalAvailable + ' 本'
        : '图书馆有此书，但当前无可借'
    };
  } catch (error) {
    console.error('Error checking library:', error);
    return { available: false, error: error.message };
  }
}

// Search by title to find similar books when the ISBN had no match
async function searchLibraryByTitle (title) {
  try {
    const { searchUrl, data } = await searchBook(title, 0);
    return { found: ((data && data.data && data.data.books) || []).length > 0, searchUrl };
  } catch (error) {
    console.error('Error searching library by title:', error);
    return { found: false, searchUrl: SEARCH_BASE + encodeURIComponent(title) };
  }
}

console.log('豆瓣图书馆借阅助手 - Background service worker started');
