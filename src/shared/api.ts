import { generateSignature } from './sign';

const API_BASE = 'https://apps.jiatu.cloud/client';

export interface LibraryBook {
  available: boolean;
  borrowable: boolean;
  detailUrl: string;
  message?: string;
}

/**
 * 查询书籍在嘉图云的借阅状态
 */
export async function checkBookAvailability(isbn: string): Promise<LibraryBook> {
  try {
    const cleanIsbn = isbn.replace(/-/g, '');
    
    const signData = generateSignature({
      isbn: cleanIsbn
    });
    
    const response = await fetch(`${API_BASE}/book/detail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'clientInfo': JSON.stringify({
          libcode: 'BJYTH',
          channel: 'bjyth_web'
        })
      },
      body: JSON.stringify(signData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // 检查响应结构
    if (!data.success || !data.data) {
      return {
        available: false,
        borrowable: false,
        detailUrl: `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${cleanIsbn}`
      };
    }
    
    const bookData = data.data;
    
    // 判断是否可借：查看是否有库存和可借状态
    const borrowable = bookData.borrowCount > 0 && bookData.status === 0;
    
    return {
      available: true,
      borrowable,
      detailUrl: `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${cleanIsbn}`,
      message: bookData.borrowCount > 0 
        ? `可借 ${bookData.borrowCount} 本` 
        : '暂无可借'
    };
  } catch (error) {
    console.error('[Library Extension] API Error:', error);
    return {
      available: false,
      borrowable: false,
      detailUrl: `https://bjyth.jiatu.cloud/yuntu-pc/home/search/index?word=${isbn.replace(/-/g, '')}`
    };
  }
}