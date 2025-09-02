const OCR = {
  recognize: async (file) => {
    const { data } = await Tesseract.recognize(file, 'eng', {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-/P'
    });
    return (data && data.text) ? data.text : '';
  },
  pickCardNumber: (rawText) => {
    const text = (rawText || '').replace(/\s+/g,' ').toUpperCase();
    const mSlash = text.match(/\b\d{1,3}\s*\/\s*\d{1,3}\b/);
    if (mSlash) return mSlash[0].replace(/\s+/g,'');
    const mNum = text.match(/\b\d{2,3}P\b|\b\d{2,3}\b/);
    return mNum ? mNum[0] : '';
  }
};
