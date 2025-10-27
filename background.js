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
});

// Function to generate salt and sign for API authentication
function generateAuthParams(bizParam) {
  try {
    console.log('🔐 [Auth] Generating authentication parameters...');
    console.log('🔐 [Auth] Input bizParam:', JSON.stringify(bizParam));
    
    // Generate random salt: Math.floor(Math.random() * 1e6 + 1)
    const salt = Math.floor(Math.random() * 1000000 + 1);
    console.log('🔐 [Auth] Generated salt:', salt);
    
    // Generate sign: MD5(JSON.stringify(bizParam) + timestamp + secret)
    const timestamp = Date.now();
    const secret = "a8fdad21e5c9ef44aa96e6df1404e811";
    console.log('🔐 [Auth] Timestamp:', timestamp);
    
    // Create the string to hash
    const bizParamStr = JSON.stringify(bizParam);
    const stringToHash = bizParamStr + timestamp + secret;
    console.log('🔐 [Auth] String to hash (first 100 chars):', stringToHash.substring(0, 100) + '...');
    
    // Simple MD5 implementation (for Service Worker environment)
    const sign = md5(stringToHash);
    console.log('🔐 [Auth] Generated sign:', sign);
    
    console.log('✅ [Auth] Auth params generated successfully:', { salt, timestamp, sign });
    return { salt, sign, timestamp };
  } catch (error) {
    console.error('❌ [Auth] Error generating auth params:', error);
    return null;
  }
}

// Simple MD5 implementation for Service Worker
function md5(string) {
  function rotateLeft(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }
  
  function addUnsigned(x, y) {
    return ((x & 0x7FFFFFFF) + (y & 0x7FFFFFFF)) ^ (x & 0x80000000) ^ (y & 0x80000000);
  }
  
  function md5_F(x, y, z) { return (x & y) | ((~x) & z); }
  function md5_G(x, y, z) { return (x & z) | (y & (~z)); }
  function md5_H(x, y, z) { return x ^ y ^ z; }
  function md5_I(x, y, z) { return y ^ (x | (~z)); }
  
  function md5_FF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function md5_GG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function md5_HH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function md5_II(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function convertToWordArray(string) {
    let wordArray = [];
    for (let i = 0; i < string.length * 8; i += 8) {
      wordArray[i >> 5] |= (string.charCodeAt(i / 8) & 0xFF) << (i % 32);
    }
    return wordArray;
  }
  
  function wordToHex(value) {
    let hex = '', byte;
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
  
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
  
  for (let i = 0; i < x.length; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;
    
    a = md5_FF(a, b, c, d, x[i+ 0], 7 , 0xD76AA478);
    d = md5_FF(d, a, b, c, x[i+ 1], 12, 0xE8C7B756);
    c = md5_FF(c, d, a, b, x[i+ 2], 17, 0x242070DB);
    b = md5_FF(b, c, d, a, x[i+ 3], 22, 0xC1BDCEEE);
    a = md5_FF(a, b, c, d, x[i+ 4], 7 , 0xF57C0FAF);
    d = md5_FF(d, a, b, c, x[i+ 5], 12, 0x4787C62A);
    c = md5_FF(c, d, a, b, x[i+ 6], 17, 0xA8304613);
    b = md5_FF(b, c, d, a, x[i+ 7], 22, 0xFD469501);
    a = md5_FF(a, b, c, d, x[i+ 8], 7 , 0x698098D8);
    d = md5_FF(d, a, b, c, x[i+ 9], 12, 0x8B44F7AF);
    c = md5_FF(c, d, a, b, x[i+10], 17, 0xFFFF5BB1);
    b = md5_FF(b, c, d, a, x[i+11], 22, 0x895CD7BE);
    a = md5_FF(a, b, c, d, x[i+12], 7 , 0x6B901122);
    d = md5_FF(d, a, b, c, x[i+13], 12, 0xFD987193);
    c = md5_FF(c, d, a, b, x[i+14], 17, 0xA679438E);
    b = md5_FF(b, c, d, a, x[i+15], 22, 0x49B40821);
    
    a = md5_GG(a, b, c, d, x[i+ 1], 5 , 0xF61E2562);
    d = md5_GG(d, a, b, c, x[i+ 6], 9 , 0xC040B340);
    c = md5_GG(c, d, a, b, x[i+11], 14, 0x265E5A51);
    b = md5_GG(b, c, d, a, x[i+ 0], 20, 0xE9B6C7AA);
    a = md5_GG(a, b, c, d, x[i+ 5], 5 , 0xD62F105D);
    d = md5_GG(d, a, b, c, x[i+10], 9 , 0x02441453);
    c = md5_GG(c, d, a, b, x[i+15], 14, 0xD8A1E681);
    b = md5_GG(b, c, d, a, x[i+ 4], 20, 0xE7D3FBC8);
    a = md5_GG(a, b, c, d, x[i+ 9], 5 , 0x21E1CDE6);
    d = md5_GG(d, a, b, c, x[i+14], 9 , 0xC33707D6);
    c = md5_GG(c, d, a, b, x[i+ 3], 14, 0xF4D50D87);
    b = md5_GG(b, c, d, a, x[i+ 8], 20, 0x455A14ED);
    a = md5_GG(a, b, c, d, x[i+13], 5 , 0xA9E3E905);
    d = md5_GG(d, a, b, c, x[i+ 2], 9 , 0xFCEFA3F8);
    c = md5_GG(c, d, a, b, x[i+ 7], 14, 0x676F02D9);
    b = md5_GG(b, c, d, a, x[i+12], 20, 0x8D2A4C8A);
    
    a = md5_HH(a, b, c, d, x[i+ 5], 4 , 0xFFFA3942);
    d = md5_HH(d, a, b, c, x[i+ 8], 11, 0x8771F681);
    c = md5_HH(c, d, a, b, x[i+11], 16, 0x6D9D6122);
    b = md5_HH(b, c, d, a, x[i+14], 23, 0xFDE5380C);
    a = md5_HH(a, b, c, d, x[i+ 1], 4 , 0xA4BEEA44);
    d = md5_HH(d, a, b, c, x[i+ 4], 11, 0x4BDECFA9);
    c = md5_HH(c, d, a, b, x[i+ 7], 16, 0xF6BB4B60);
    b = md5_HH(b, c, d, a, x[i+10], 23, 0xBEBFBC70);
    a = md5_HH(a, b, c, d, x[i+13], 4 , 0x289B7EC6);
    d = md5_HH(d, a, b, c, x[i+ 0], 11, 0xEAA127FA);
    c = md5_HH(c, d, a, b, x[i+ 3], 16, 0xD4EF3085);
    b = md5_HH(b, c, d, a, x[i+ 6], 23, 0x04881D05);
    a = md5_HH(a, b, c, d, x[i+ 9], 4 , 0xD9D4D039);
    d = md5_HH(d, a, b, c, x[i+12], 11, 0xE6DB99E5);
    c = md5_HH(c, d, a, b, x[i+15], 16, 0x1FA27CF8);
    b = md5_HH(b, c, d, a, x[i+ 2], 23, 0xC4AC5665);
    
    a = md5_II(a, b, c, d, x[i+ 0], 6 , 0xF4292244);
    d = md5_II(d, a, b, c, x[i+ 7], 10, 0x432AFF97);
    c = md5_II(c, d, a, b, x[i+14], 15, 0xAB9423A7);
    b = md5_II(b, c, d, a, x[i+ 5], 21, 0xFC93A039);
    a = md5_II(a, b, c, d, x[i+12], 6 , 0x655B59C3);
    d = md5_II(d, a, b, c, x[i+ 3], 10, 0x8F0CCC92);
    c = md5_II(c, d, a, b, x[i+10], 15, 0xFFEFF47D);
    b = md5_II(b, c, d, a, x[i+ 1], 21, 0x85845DD1);
    a = md5_II(a, b, c, d, x[i+ 8], 6 , 0x6FA87E4F);
    d = md5_II(d, a, b, c, x[i+15], 10, 0xFE2CE6E0);
    c = md5_II(c, d, a, b, x[i+ 6], 15, 0xA3014314);
    b = md5_II(b, c, d, a, x[i+13], 21, 0x4E0811A1);
    a = md5_II(a, b, c, d, x[i+ 4], 6 , 0xF7537E82);
    d = md5_II(d, a, b, c, x[i+11], 10, 0xBD3AF235);
    c = md5_II(c, d, a, b, x[i+ 2], 15, 0x2AD7D2BB);
    b = md5_II(b, c, d, a, x[i+ 9], 21, 0xEB86D391);
    
    a = addUnsigned(a, olda);
    b = addUnsigned(b, oldb);
    c = addUnsigned(c, oldc);
    d = addUnsigned(d, oldd);
  }
  
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// Function to check book availability in Beijing Library
async function checkLibraryAvailability(isbn) {
  try {
    console.log('📚 [Search] ========== Starting search for ISBN:', isbn, '==========');
    
    // Prepare bizParam for the API request
    const bizParam = {
      holdingStatus: 0,
      pageNo: 1,
      pageSize: 8,
      sort: "",
      sortCol: "",
      keyword: isbn,
      searchType: 1
    };
    console.log('📚 [Search] Prepared bizParam:', JSON.stringify(bizParam));
    
    // Generate authentication parameters
    console.log('📚 [Search] Calling generateAuthParams...');
    const authParams = generateAuthParams(bizParam);
    const searchUrl = `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${isbn}`;
    
    if (!authParams) {
      console.error('❌ [Search] Failed to generate auth parameters');
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
    console.log('📚 [Search] API URL:', apiUrl);
    
    const requestBody = {
      libcode: "BJYTH",
      channel: "bjyth_web",
      timestamp: authParams.timestamp,
      salt: authParams.salt,
      sign: authParams.sign,
      bizParam: bizParam
    };
    console.log('📚 [Search] Request body:', JSON.stringify(requestBody, null, 2));
    
    console.log('📡 [API] Sending POST request directly...');
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Content-Type': 'application/json;charset=UTF-8',
        'clientinfo': '{"libcode":"BJYTH","channel":"bjyth_web"}',
        'DNT': '1',
        'jwt': '',
        'Origin': 'https://bjyth.jiatu.cloud/',
        'Priority': 'u=1, i',
        'Referer': 'https://bjyth.jiatu.cloud/',
        'Sec-CH-UA': '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 [API] Response status:', apiResponse.status, apiResponse.statusText);
    
    if (!apiResponse.ok) {
      let errorText = '';
      try {
        errorText = await apiResponse.text();
        console.error('❌ [API] Request failed. Status:', apiResponse.status);
        console.error('❌ [API] Response body:', errorText);
        const headers = {};
        apiResponse.headers.forEach((value, key) => {
          headers[key] = value;
        });
        console.error('❌ [API] Response headers:', headers);
      } catch (e) {
        console.error('❌ [API] Could not read error response:', e);
      }
      throw new Error(`API request failed with status: ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    console.log('✅ [API] Response received:', JSON.stringify(apiData, null, 2));
    
    if (!apiData || !apiData.success || !apiData.data) {
      console.error('❌ [API] API returned error:', apiData?.msg || 'Unknown error');
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
    console.log(`📖 [Parse] Found ${books.length} books in API response`);
    
    if (books.length === 0) {
      console.log('❌ [Search] No books found in API response');
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
        console.log('� [Parse] Library name map:', JSON.stringify(libraryNameMap));
      }
    }
    
    // Process all books and extract library availability
    const allLibraries = [];
    let totalAvailableCopies = 0;
    let hasAvailableBooks = false;
    
    books.forEach((book, index) => {
      console.log(`📖 [Parse] Processing book ${index + 1}:`, {
        id: book.id,
        title: book.title,
        availableNumber: book.availableNumber,
        availableLibs: book.availableLibs,
        ownerLibs: book.ownerLibs
      });
      
      // Process libraries that have available copies
      if (book.availableLibs && book.availableLibs.length > 0) {
        book.availableLibs.forEach(libcode => {
          // Only include libraries that are in the map
          if (!libraryNameMap[libcode]) {
            console.warn(`⚠️ [Parse] Skipping unknown library code: ${libcode}`);
            return;
          }
          const libName = libraryNameMap[libcode];
          allLibraries.push({
            name: libName,
            available: true,
            availableCount: book.availableNumber || 1
          });
          console.log(`✅ [Parse] Available at ${libName} (${libcode})`);
        });
        totalAvailableCopies += book.availableNumber || 0;
        hasAvailableBooks = true;
      }
      
      // Process libraries that own the book but have no available copies
      if (book.ownerLibs && book.ownerLibs.length > 0) {
        book.ownerLibs.forEach(libcode => {
          // Skip if already in availableLibs
          if (book.availableLibs && book.availableLibs.includes(libcode)) {
            return;
          }
          // Only include libraries that are in the map
          if (!libraryNameMap[libcode]) {
            console.warn(`⚠️ [Parse] Skipping unknown library code: ${libcode}`);
            return;
          }
          const libName = libraryNameMap[libcode];
          allLibraries.push({
            name: libName,
            available: false,
            availableCount: 0
          });
          console.log(`📚 [Parse] Unavailable at ${libName} (${libcode})`);
        });
      }
    });
    
    console.log(`✅ [Result] Total libraries: ${allLibraries.length}`);
    console.log(`✅ [Result] Available libraries: ${allLibraries.filter(l => l.available).length}`);
    console.log(`✅ [Result] Total available copies: ${totalAvailableCopies}`);
    
    const firstBook = books[0];
    const detailUrl = firstBook.id ? `https://bjyth.jiatu.cloud/yuntu-pc/book/detail?id=${firstBook.id}` : null;
    
    const finalResult = {
      available: hasAvailableBooks,
      url: detailUrl || searchUrl,
      detailUrl: detailUrl,
      searchUrl,
      hasBook: true,
      libraries: allLibraries,
      totalCopies: books.reduce((sum, b) => sum + (b.availableNumber || 0), 0),
      availableCopies: totalAvailableCopies,
      message: hasAvailableBooks 
        ? `共 ${allLibraries.filter(l => l.available).length} 个分馆可借，共 ${totalAvailableCopies} 本`
        : '图书馆有此书，但当前无可借'
    };
    
    console.log('✅ [Result] Final result:', JSON.stringify(finalResult, null, 2));
    return finalResult;
    
  } catch (error) {
    console.error('❌ [Error] Error checking library:', error);
    return {
      available: false,
      error: error.message
    };
  }
}

// Function to parse library availability from book detail page
function parseLibraryAvailability(html, detailUrl, searchUrl) {
  try {
    const libraries = [];
    let totalAvailable = 0;
    let totalCopies = 0;
    let isAvailable = false;
    
    // Try to find patterns like: "北京顺义区图书馆...可借：2"
    // This captures branch name followed by availability info
    const branchAvailabilityPattern = /(首都图书馆|北京[^<>]{0,20}?图书馆|顺义[^<>]{0,10}?图书馆|朝阳[^<>]{0,10}?图书馆|海淀[^<>]{0,10}?图书馆|东城[^<>]{0,10}?图书馆|西城[^<>]{0,10}?图书馆|丰台[^<>]{0,10}?图书馆|石景山[^<>]{0,10}?图书馆|门头沟[^<>]{0,10}?图书馆|房山[^<>]{0,10}?图书馆|通州[^<>]{0,10}?图书馆|大兴[^<>]{0,10}?图书馆|昌平[^<>]{0,10}?图书馆|平谷[^<>]{0,10}?图书馆|怀柔[^<>]{0,10}?图书馆|密云[^<>]{0,10}?图书馆|延庆[^<>]{0,10}?图书馆)[\s\S]{0,200}?可借[：:]\s*(\d+)/g;
    
    let match;
    const seenBranches = new Set();
    
    while ((match = branchAvailabilityPattern.exec(html)) !== null) {
      const branchName = match[1].trim();
      const availableCount = parseInt(match[2], 10);
      
      // Skip duplicates
      if (seenBranches.has(branchName)) {
        continue;
      }
      seenBranches.add(branchName);
      
      console.log(`Found branch: ${branchName}, available: ${availableCount}`);
      
      libraries.push({
        name: branchName,
        available: availableCount > 0,
        availableCount: availableCount  // Store the actual count
      });
      
      totalAvailable += availableCount;
      totalCopies += availableCount;  // Count all copies, not just branches
      
      if (availableCount > 0) {
        isAvailable = true;
      }
    }
    
    // If we found branches with the pattern, return the results
    if (libraries.length > 0) {
      const availableBranches = libraries.filter(lib => lib.available);
      let message = '';
      
      if (isAvailable) {
        const branchNames = availableBranches.map(lib => lib.name).join('、');
        message = `共 ${totalAvailable} 本可借，分布在：${branchNames}`;
      } else {
        message = '所有分馆已全部借出';
      }
      
      console.log('Parsed availability (multi-branch):', {
        available: isAvailable,
        totalCopies,
        totalAvailable,
        libraries,
        message
      });
      
      return {
        available: isAvailable,
        url: detailUrl || searchUrl,
        detailUrl: detailUrl || null,
        searchUrl: searchUrl || null,
        hasBook: true,
        totalCopies,
        availableCopies: totalAvailable,
        libraries,
        message
      };
    }
    
    // Fallback: single branch extraction
    let branchName = '首都图书馆';
    const branchPatterns = [
      /首都图书馆/,
      /北京.*?图书馆/,
      /顺义.*?图书馆/,
      /朝阳.*?图书馆/,
      /海淀.*?图书馆/,
      /东城.*?图书馆/,
      /西城.*?图书馆/,
      /丰台.*?图书馆/,
      /石景山.*?图书馆/,
      /门头沟.*?图书馆/,
      /房山.*?图书馆/,
      /通州.*?图书馆/,
      /大兴.*?图书馆/,
      /昌平.*?图书馆/,
      /平谷.*?图书馆/,
      /怀柔.*?图书馆/,
      /密云.*?图书馆/,
      /延庆.*?图书馆/
    ];
    
    for (const pattern of branchPatterns) {
      const branchMatch = html.match(pattern);
      if (branchMatch) {
        branchName = branchMatch[0];
        console.log('Found branch name (fallback):', branchName);
        break;
      }
    }
    
    // Look for "可借：" (available) count
    const availablePattern = /可借[：:]\s*(\d+)/;
    const availableMatch = html.match(availablePattern);
    
    if (availableMatch) {
      const availableCount = parseInt(availableMatch[1], 10);
      isAvailable = availableCount > 0;
      totalAvailable = availableCount;
      totalCopies = availableCount;  // Use actual count, not just 1
      
      console.log(`Found availability info for ${branchName}: 可借 ${availableCount} copies`);
      
      libraries.push({
        name: branchName,
        available: isAvailable,
        availableCount: availableCount
      });
    } else if (html.includes('暂无可借')) {
      // No copies available
      isAvailable = false;
      totalAvailable = 0;
      totalCopies = 0;
      libraries.push({ 
        name: branchName, 
        available: false,
        availableCount: 0
      });
    } else {
      // Last fallback: check for keywords
      const availabilityIndicators = {
        available: ['在馆', '在架', '可借阅', '可外借'],
        unavailable: ['已借出', '借出', '已预约', '不可借', '馆内阅览', '仅供阅览']
      };
      
      for (const indicator of availabilityIndicators.available) {
        if (html.includes(indicator)) {
          isAvailable = true;
          totalAvailable = 1;  // Unknown count, assume 1
          totalCopies = 1;
          libraries.push({ 
            name: branchName, 
            available: true,
            availableCount: 1
          });
          console.log(`Found availability indicator: ${indicator}`);
          break;
        }
      }
      
      if (!isAvailable) {
        for (const indicator of availabilityIndicators.unavailable) {
          if (html.includes(indicator)) {
            isAvailable = false;
            totalAvailable = 0;
            totalCopies = 0;
            libraries.push({ 
              name: branchName, 
              available: false,
              availableCount: 0
            });
            console.log(`Found unavailability indicator: ${indicator}`);
            break;
          }
        }
      }
    }
    
    // Generate message
    let message = '';
    if (totalAvailable > 0) {
      message = `${branchName}有 ${totalAvailable} 本可借`;
    } else if (totalCopies > 0 || libraries.length > 0) {
      message = `${branchName}已借完`;
    } else {
      message = '已找到图书';
    }
    
    console.log('Parsed availability (single-branch):', {
      branch: branchName,
      available: isAvailable,
      totalCopies,
      totalAvailable,
      libraries,
      message
    });
    
    return {
      available: isAvailable,
      url: detailUrl || searchUrl,
      detailUrl: detailUrl || null,
      searchUrl: searchUrl || null,
      hasBook: true,
      totalCopies,
      availableCopies: totalAvailable,
      libraries,
      message
    };
    
  } catch (error) {
    console.error('Error parsing library availability:', error);
    return {
      available: false,
      url: detailUrl || searchUrl,
      detailUrl: detailUrl || null,
      searchUrl: searchUrl || null,
      hasBook: true,
      error: error.message,
      message: '无法解析图书馆信息'
    };
  }
}

// Log when the service worker starts
console.log('豆瓣图书馆借阅助手 - Background service worker started');