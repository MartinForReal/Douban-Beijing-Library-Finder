// Background service worker for handling cross-origin requests

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkLibrary') {
    checkLibraryAvailability(request.isbn)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ available: false, error: error.message }));

    // Return true to indicate we'll send a response asynchronously
    return true;
  }

  if (request.action === 'searchByTitle') {
    searchLibraryByTitle(request.title)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ found: false, error: error.message }));
    return true;
  }
});

// Function to generate salt and sign for API authentication
function generateAuthParams (bizParam) {
  try {
    const salt = Math.floor(Math.random() * 1000000 + 1);
    const timestamp = Date.now();
    const secret = 'a8fdad21e5c9ef44aa96e6df1404e811';
    const sign = md5(JSON.stringify(bizParam) + timestamp + secret);
    return { salt, sign, timestamp };
  } catch (error) {
    console.error('Error generating auth params:', error);
    return null;
  }
}

// Simple MD5 implementation for Service Worker
function md5 (string) {
  function rotateLeft (value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned (x, y) {
    return ((x & 0x7FFFFFFF) + (y & 0x7FFFFFFF)) ^ (x & 0x80000000) ^ (y & 0x80000000);
  }

  function md5_F (x, y, z) { return (x & y) | ((~x) & z); }
  function md5_G (x, y, z) { return (x & z) | (y & (~z)); }
  function md5_H (x, y, z) { return x ^ y ^ z; }
  function md5_I (x, y, z) { return y ^ (x | (~z)); }

  function md5_FF (a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5_GG (a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5_HH (a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5_II (a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray (string) {
    const wordArray = [];
    for (let i = 0; i < string.length * 8; i += 8) {
      wordArray[i >> 5] |= (string.charCodeAt(i / 8) & 0xFF) << (i % 32);
    }
    return wordArray;
  }

  function wordToHex (value) {
    let hex = ''; let byte;
    for (let i = 0; i < 4; i++) {
      byte = (value >>> (i * 8)) & 0xFF;
      hex += ('0' + byte.toString(16)).slice(-2);
    }
    return hex;
  }

  const x = convertToWordArray(string);
  const len = string.length * 8;

  x[len >> 5] |= 0x80 << (len % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 0x67452301; let b = 0xEFCDAB89; let c = 0x98BADCFE; let d = 0x10325476;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a; const oldb = b; const oldc = c; const oldd = d;

    a = md5_FF(a, b, c, d, x[i + 0], 7, 0xD76AA478);
    d = md5_FF(d, a, b, c, x[i + 1], 12, 0xE8C7B756);
    c = md5_FF(c, d, a, b, x[i + 2], 17, 0x242070DB);
    b = md5_FF(b, c, d, a, x[i + 3], 22, 0xC1BDCEEE);
    a = md5_FF(a, b, c, d, x[i + 4], 7, 0xF57C0FAF);
    d = md5_FF(d, a, b, c, x[i + 5], 12, 0x4787C62A);
    c = md5_FF(c, d, a, b, x[i + 6], 17, 0xA8304613);
    b = md5_FF(b, c, d, a, x[i + 7], 22, 0xFD469501);
    a = md5_FF(a, b, c, d, x[i + 8], 7, 0x698098D8);
    d = md5_FF(d, a, b, c, x[i + 9], 12, 0x8B44F7AF);
    c = md5_FF(c, d, a, b, x[i + 10], 17, 0xFFFF5BB1);
    b = md5_FF(b, c, d, a, x[i + 11], 22, 0x895CD7BE);
    a = md5_FF(a, b, c, d, x[i + 12], 7, 0x6B901122);
    d = md5_FF(d, a, b, c, x[i + 13], 12, 0xFD987193);
    c = md5_FF(c, d, a, b, x[i + 14], 17, 0xA679438E);
    b = md5_FF(b, c, d, a, x[i + 15], 22, 0x49B40821);

    a = md5_GG(a, b, c, d, x[i + 1], 5, 0xF61E2562);
    d = md5_GG(d, a, b, c, x[i + 6], 9, 0xC040B340);
    c = md5_GG(c, d, a, b, x[i + 11], 14, 0x265E5A51);
    b = md5_GG(b, c, d, a, x[i + 0], 20, 0xE9B6C7AA);
    a = md5_GG(a, b, c, d, x[i + 5], 5, 0xD62F105D);
    d = md5_GG(d, a, b, c, x[i + 10], 9, 0x02441453);
    c = md5_GG(c, d, a, b, x[i + 15], 14, 0xD8A1E681);
    b = md5_GG(b, c, d, a, x[i + 4], 20, 0xE7D3FBC8);
    a = md5_GG(a, b, c, d, x[i + 9], 5, 0x21E1CDE6);
    d = md5_GG(d, a, b, c, x[i + 14], 9, 0xC33707D6);
    c = md5_GG(c, d, a, b, x[i + 3], 14, 0xF4D50D87);
    b = md5_GG(b, c, d, a, x[i + 8], 20, 0x455A14ED);
    a = md5_GG(a, b, c, d, x[i + 13], 5, 0xA9E3E905);
    d = md5_GG(d, a, b, c, x[i + 2], 9, 0xFCEFA3F8);
    c = md5_GG(c, d, a, b, x[i + 7], 14, 0x676F02D9);
    b = md5_GG(b, c, d, a, x[i + 12], 20, 0x8D2A4C8A);

    a = md5_HH(a, b, c, d, x[i + 5], 4, 0xFFFA3942);
    d = md5_HH(d, a, b, c, x[i + 8], 11, 0x8771F681);
    c = md5_HH(c, d, a, b, x[i + 11], 16, 0x6D9D6122);
    b = md5_HH(b, c, d, a, x[i + 14], 23, 0xFDE5380C);
    a = md5_HH(a, b, c, d, x[i + 1], 4, 0xA4BEEA44);
    d = md5_HH(d, a, b, c, x[i + 4], 11, 0x4BDECFA9);
    c = md5_HH(c, d, a, b, x[i + 7], 16, 0xF6BB4B60);
    b = md5_HH(b, c, d, a, x[i + 10], 23, 0xBEBFBC70);
    a = md5_HH(a, b, c, d, x[i + 13], 4, 0x289B7EC6);
    d = md5_HH(d, a, b, c, x[i + 0], 11, 0xEAA127FA);
    c = md5_HH(c, d, a, b, x[i + 3], 16, 0xD4EF3085);
    b = md5_HH(b, c, d, a, x[i + 6], 23, 0x04881D05);
    a = md5_HH(a, b, c, d, x[i + 9], 4, 0xD9D4D039);
    d = md5_HH(d, a, b, c, x[i + 12], 11, 0xE6DB99E5);
    c = md5_HH(c, d, a, b, x[i + 15], 16, 0x1FA27CF8);
    b = md5_HH(b, c, d, a, x[i + 2], 23, 0xC4AC5665);

    a = md5_II(a, b, c, d, x[i + 0], 6, 0xF4292244);
    d = md5_II(d, a, b, c, x[i + 7], 10, 0x432AFF97);
    c = md5_II(c, d, a, b, x[i + 14], 15, 0xAB9423A7);
    b = md5_II(b, c, d, a, x[i + 5], 21, 0xFC93A039);
    a = md5_II(a, b, c, d, x[i + 12], 6, 0x655B59C3);
    d = md5_II(d, a, b, c, x[i + 3], 10, 0x8F0CCC92);
    c = md5_II(c, d, a, b, x[i + 10], 15, 0xFFEFF47D);
    b = md5_II(b, c, d, a, x[i + 1], 21, 0x85845DD1);
    a = md5_II(a, b, c, d, x[i + 8], 6, 0x6FA87E4F);
    d = md5_II(d, a, b, c, x[i + 15], 10, 0xFE2CE6E0);
    c = md5_II(c, d, a, b, x[i + 6], 15, 0xA3014314);
    b = md5_II(b, c, d, a, x[i + 13], 21, 0x4E0811A1);
    a = md5_II(a, b, c, d, x[i + 4], 6, 0xF7537E82);
    d = md5_II(d, a, b, c, x[i + 11], 10, 0xBD3AF235);
    c = md5_II(c, d, a, b, x[i + 2], 15, 0x2AD7D2BB);
    b = md5_II(b, c, d, a, x[i + 9], 21, 0xEB86D391);

    a = addUnsigned(a, olda);
    b = addUnsigned(b, oldb);
    c = addUnsigned(c, oldc);
    d = addUnsigned(d, oldd);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// Function to check book availability in Beijing Library
async function checkLibraryAvailability (isbn) {
  try {
    const bizParam = {
      holdingStatus: 0,
      pageNo: 1,
      pageSize: 8,
      sort: '',
      sortCol: '',
      keyword: isbn,
      searchType: 1
    };

    const authParams = generateAuthParams(bizParam);
    const searchUrl = `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${encodeURIComponent(isbn)}`;

    if (!authParams) {
      return {
        available: false,
        url: searchUrl,
        detailUrl: null,
        searchUrl,
        hasBook: false,
        message: '认证参数生成失败'
      };
    }

    const apiUrl = 'https://apps.jiatu.cloud/client/book/search';
    const requestBody = {
      libcode: 'BJYTH',
      channel: 'bjyth_web',
      timestamp: authParams.timestamp,
      salt: authParams.salt,
      sign: authParams.sign,
      bizParam
    };

    // Origin/Referer/Sec-* headers are set by declarativeNetRequest rules in rules.json
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
        clientinfo: '{"libcode":"BJYTH","channel":"bjyth_web"}'
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      throw new Error(`API request failed with status: ${apiResponse.status}`);
    }

    const apiData = await apiResponse.json();

    if (!apiData || !apiData.success || !apiData.data) {
      return {
        available: false,
        url: searchUrl,
        detailUrl: null,
        searchUrl,
        hasBook: false,
        message: apiData?.msg || '查询失败'
      };
    }

    const books = apiData.data.books || [];

    if (books.length === 0) {
      return {
        available: false,
        url: searchUrl,
        detailUrl: null,
        searchUrl,
        hasBook: false,
        message: '图书馆暂无此书'
      };
    }

    // Build library name map from aggData
    const libraryNameMap = {};
    if (apiData.data.aggData) {
      const libraryList = apiData.data.aggData.find(agg => agg.lableCode === 'aggLibcode');
      if (libraryList && libraryList.labelValueList) {
        libraryList.labelValueList.forEach(lib => {
          libraryNameMap[lib.name] = lib.label;
        });
      }
    }

    // Process all books and extract library availability
    const allLibraries = [];
    let totalAvailableCopies = 0;
    let hasAvailableBooks = false;

    for (const book of books) {
      if (book.availableLibs && book.availableLibs.length > 0) {
        for (const libcode of book.availableLibs) {
          if (!libraryNameMap[libcode]) continue;
          allLibraries.push({
            name: libraryNameMap[libcode],
            available: true,
            availableCount: book.availableNumber || 1
          });
        }
        totalAvailableCopies += book.availableNumber || 0;
        hasAvailableBooks = true;
      }

      if (book.ownerLibs && book.ownerLibs.length > 0) {
        for (const libcode of book.ownerLibs) {
          if (book.availableLibs && book.availableLibs.includes(libcode)) continue;
          if (!libraryNameMap[libcode]) continue;
          allLibraries.push({
            name: libraryNameMap[libcode],
            available: false,
            availableCount: 0
          });
        }
      }
    }

    const firstBook = books[0];
    const detailUrl = firstBook.id
      ? `https://bjyth.jiatu.cloud/yuntu-pc/book/detail?id=${encodeURIComponent(firstBook.id)}`
      : null;

    return {
      available: hasAvailableBooks,
      url: detailUrl || searchUrl,
      detailUrl,
      searchUrl,
      hasBook: true,
      libraries: allLibraries,
      totalCopies: books.reduce((sum, b) => sum + (b.availableNumber || 0), 0),
      availableCopies: totalAvailableCopies,
      message: hasAvailableBooks
        ? `共 ${allLibraries.filter(l => l.available).length} 个分馆可借，共 ${totalAvailableCopies} 本`
        : '图书馆有此书，但当前无可借'
    };
  } catch (error) {
    console.error('Error checking library:', error);
    return {
      available: false,
      error: error.message
    };
  }
}

// Search library by book title to find similar books
async function searchLibraryByTitle (title) {
  try {
    const bizParam = {
      holdingStatus: 0,
      pageNo: 1,
      pageSize: 8,
      sort: '',
      sortCol: '',
      keyword: title,
      searchType: 0
    };

    const authParams = generateAuthParams(bizParam);
    const searchUrl = `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${encodeURIComponent(title)}`;

    if (!authParams) {
      return { found: false, searchUrl };
    }

    const apiUrl = 'https://apps.jiatu.cloud/client/book/search';
    const requestBody = {
      libcode: 'BJYTH',
      channel: 'bjyth_web',
      timestamp: authParams.timestamp,
      salt: authParams.salt,
      sign: authParams.sign,
      bizParam
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
        clientinfo: '{"libcode":"BJYTH","channel":"bjyth_web"}'
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiResponse.ok) {
      return { found: false, searchUrl };
    }

    const apiData = await apiResponse.json();
    const books = apiData?.data?.books || [];

    return {
      found: books.length > 0,
      searchUrl
    };
  } catch (error) {
    console.error('Error searching library by title:', error);
    return {
      found: false,
      searchUrl: `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${encodeURIComponent(title)}`
    };
  }
}

console.log('豆瓣图书馆借阅助手 - Background service worker started');
