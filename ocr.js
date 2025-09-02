const OCR = {
  recognize: async (file) => {
    // 文字種を絞って誤検出（74など）を抑制
    const { data } = await Tesseract.recognize(file, 'eng', {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-/P'
      // 必要ならページ分割モードの調整も検討（psm=6/7）
      // tessedit_pageseg_mode: '6'
    });
    return (data && data.text) ? data.text : '';
  },

  // 生テキストから候補番号を「複数」抽出してスコア順に返す
  extractCandidates: (rawText) => {
    const text = (rawText || '').replace(/\s+/g, ' ').toUpperCase();

    const candidates = new Map(); // 候補 => 最大スコア（重複抑止）

    const add = (val, score) => {
      if (!val) return;
      const key = val.trim();
      const prev = candidates.get(key) ?? -Infinity;
      if (score > prev) candidates.set(key, score);
    };

    // 1) 典型パターン: [英字1-3][数字2桁] [- ] [番号2-3桁 or P付き]
    //   例: CX03-001, X03-001, SC04-066, CX-03 041 など
    for (const m of text.matchAll(/\b[A-Z]{1,3}\s?-?\s?\d{2}\s?[- ]\s?(\d{2,3}P?|\d{1,3}\/\d{1,3})\b/g)) {
      const num = m[1].replace(/\s+/g, '');
      add(num, 100); // 最優先
    }

    // 2) スラッシュ併記（69/70 など）
    for (const m of text.matchAll(/\b(\d{1,3}\s*\/\s*\d{1,3})\b/g)) {
      add(m[1].replace(/\s+/g, ''), 80);
    }

    // 3) 3桁数字 or 3桁+P
    for (const m of text.matchAll(/\b(\d{3}P|\d{3})\b/g)) {
      add(m[1], 60);
    }

    // 4) 2桁数字（誤検出を下位に）
    for (const m of text.matchAll(/\b(\d{2})\b/g)) {
      add(m[1], 20);
    }

    // スコア降順 → 同点は短いものより3桁を優先
    const arr = [...candidates.entries()]
      .sort((a, b) => b[1] - a[1] || (b[0].length - a[0].length));

    return arr.map(([v]) => v);
  },

  // 最有力1件（UIの既定値に使う）
  pickTop: (rawText) => {
    const list = OCR.extractCandidates(rawText);
    return list[0] || '';
  }
};
