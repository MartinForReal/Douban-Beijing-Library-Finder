import CryptoJS from 'crypto-js';

const SECRET_KEY = 'a8fdad21e5c9ef44aa96e6df1404e811';

/**
 * 生成嘉图云动态签名
 * @param bizParam 业务参数对象
 * @returns 包含签名信息的对象
 */
export function generateSignature(bizParam: Record<string, any> = {}) {
  const timestamp = new Date().getTime();
  const salt = Math.floor(Math.random() * 1e6) + 1;
  
  // 对 bizParam 进行排序
  const sortedBizParam = sortObjectKeys(bizParam);
  const bizParamStr = JSON.stringify(sortedBizParam);
  
  // 构造待签名字符串
  const signStr = `${bizParamStr}${timestamp}${SECRET_KEY}`;
  
  // MD5 签名
  const sign = CryptoJS.MD5(signStr).toString();
  
  return {
    libcode: 'BJYTH',
    channel: 'bjyth_web',
    timestamp,
    salt,
    sign,
    bizParam: sortedBizParam
  };
}

/**
 * 递归排序对象键
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  const sorted: Record<string, any> = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  
  return sorted;
}