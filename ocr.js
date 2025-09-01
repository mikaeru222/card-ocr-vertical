const OCR = {
  recognize: async (file) => {
    const { data } = await Tesseract.recognize(file, 'eng', {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-/P'
    });
    return (data && data.text) ? data.text : '';
  },
  pickCardNumber: (rawText) => {
    const text = (rawText || '').replace(/\s+/g,' ').toUpperCase();
    // 候補: 69/70, 041, 12, 40P など
    // 最優先: スラッシュ併記（\d{1,3}/\d{1,3}）
    const mSlash = text.match(/\b\d{1,3}\s*\/\s*\d{1,3}\b/);
    if (mSlash) return mSlash[0].replace(/\s+/g,'');
    // 次: P付き or 2-3桁数字
    const mNum = text.match(/\b\d{2,3}P\b|\b\d{2,3}\b/);
    return mNum ? mNum[0] : '';
  }
};