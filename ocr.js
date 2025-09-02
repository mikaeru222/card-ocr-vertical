const OCR = {
  recognize: async (file) => {
    const { data } = await Tesseract.recognize(file, 'eng', {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-/P',
      psm: 7 // 数字や単一行に強いモード
    });
    return (data && data.text) ? data.text : '';
  },

  extractCandidates: (rawText) => {
    const text = (rawText || '').replace(/\s+/g, ' ').toUpperCase();
    const candidates = new Map();
    const add = (val, score) => {
      if (!val) return;
      const key = val.trim();
      const prev = candidates.get(key) ?? -Infinity;
      if (score > prev) candidates.set(key, score);
    };
    for (const m of text.matchAll(/\b[A-Z]{1,3}\s?-?\s?\d{2}\s?[- ]\s?(\d{2,3}P?|\d{1,3}\/\d{1,3})\b/g)) {
      add(m[1].replace(/\s+/g, ''), 100);
    }
    for (const m of text.matchAll(/\b(\d{1,3}\s*\/\s*\d{1,3})\b/g)) {
      add(m[1].replace(/\s+/g, ''), 80);
    }
    for (const m of text.matchAll(/\b(\d{3}P|\d{3})\b/g)) {
      add(m[1], 60);
    }
    for (const m of text.matchAll(/\b(\d{2})\b/g)) {
      add(m[1], 20);
    }
    const arr = [...candidates.entries()]
      .sort((a, b) => b[1] - a[1] || (b[0].length - a[0].length));
    return arr.map(([v]) => v);
  }
};
