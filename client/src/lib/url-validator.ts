export interface ValidationResult {
  isValid: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export function validateTikTokUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return {
      isValid: false,
      message: 'Please enter a URL',
      type: 'error'
    };
  }

  const trimmedUrl = url.trim();
  
  const tiktokPatterns = [
    /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    /^https?:\/\/m\.tiktok\.com\/.+/i,
  ];

  const isValidTikTok = tiktokPatterns.some(pattern => pattern.test(trimmedUrl));

  if (!isValidTikTok) {
    return {
      isValid: false,
      message: 'Invalid TikTok URL format',
      type: 'error'
    };
  }

  if (trimmedUrl.includes('/music/')) {
    return {
      isValid: true,
      message: 'Audio track detected',
      type: 'warning'
    };
  }

  if (trimmedUrl.includes('/@')) {
    return {
      isValid: true,
      message: 'Valid TikTok video URL',
      type: 'success'
    };
  }

  return {
    isValid: true,
    message: 'Valid TikTok URL',
    type: 'success'
  };
}
