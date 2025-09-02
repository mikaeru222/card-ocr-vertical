const cameraInput = document.getElementById('cameraInput');
const manualInput = document.getElementById('manualInput');
const appendStay = document.getElementById('appendStay');
const pad3 = document.getElementById('pad3');
const confirmBtn = document.getElementById('confirmBtn');
const skipBtn = document.getElementById('skipBtn');
const progressEl = document.getElementById('progress');
const candWrap = document.getElementById('candidates');
const tableBody = document.querySelector('#resultTable tbody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const clearBtn = document.getElementById('clearBtn');

const ROWS = 100;
const COLS = 12;

let results = Array.from({length: ROWS}, () => Array(COLS).fill(''));
let currentIndex = 0;

updateProgress();
renderTable();

cameraInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const text = await OCR.recognize(file);

  // 候補を複数提示
  const cands = OCR.extractCandidates(text);
  renderCandidates(cands);

  // 手入力は空にしてフォーカス
  manualInput.value = '';
  manualInput.focus();

  // 連続撮影できるようにリセット
  cameraInput.value = '';
});

function renderCandidates(list){
  candWrap.innerHTML = '';
  if (!list || !list.length) {
    candWrap.textContent = '（候補なし）';
    return;
  }
  // 上位5件までボタン化
  list.slice(0, 5).forEach(val => {
    const v = pad3.checked ? normalizeTo3(val) : val;
    const btn = document.createElement('button');
    btn.className = 'cand';
    btn.textContent = v;
    btn.addEventListener('click', () => {
      manualInput.value = v;
    });
    candWrap.appendChild(btn);
  });
}

confirmBtn.addEventListener('click', () => {
  if (currentIndex >= ROWS * COLS) return;

  let val = (manualInput.value || '').trim();
  if (!val) return;

  if (pad3.checked) val = normalizeTo3(val);

  const col = Math.floor(currentIndex / ROWS);
  const row = currentIndex % ROWS;

  // 追記 or 置換
  if (results[row][col]) {
    results[row][col] = results[row][col] + '/' + val;
  } else {
    results[row][col] = val;
  }

  renderTable();

  if (!appendStay.checked) {
    currentIndex = Math.min(currentIndex + 1, ROWS * COLS);
  }
  updateProgress();

  exportCsvBtn.disabled = false;
  clearBtn.disabled = false;

  manualInput.value = '';
});

skipBtn.addEventListener('click', () => {
  if (currentIndex >= ROWS * COLS) return;
  currentIndex = Math.min(currentIndex + 1, ROWS * COLS);
  updateProgress();
});

function normalizeTo3(s){
  // "69/70" はそのまま、単独数字は3桁ゼロ埋め、"40P"はPを残して数字部を3桁化
  const t = String(s).toUpperCase().replace(/\s+/g,'');
  if (/\d+\/\d+/.test(t)) return t; // スラッシュ併記は触らない
  const mP = t.match(/^(\d{1,3})P$/);
  if (mP) return mP[1].padStart(3,'0') + 'P';
  if (/^\d{1,3}$/.test(t)) return t.padStart(3,'0');
  return t;
}

function updateProgress(){
  const col = Math.floor(currentIndex / ROWS) + 1;
  const row = (currentIndex % ROWS) + 1;
  const filled = countFilled();
  progressEl.textContent = `列 ${col} / 行 ${row}（1列=${ROWS}） 合計 ${filled}`;
}

function countFilled(){
  let n = 0;
  for (let r=0;r<ROWS;r++){
    for (let c=0;c<COLS;c++){
      if (results[r][c]) n++;
    }
  }
  return n;
}

function renderTable(){
  tableBody.innerHTML = '';
  for (let r=0; r<ROWS; r++){
    const tr = document.createElement('tr');
    let html = `<td>${r+1}</td>`;
    for (let c=0; c<COLS; c++){
      html += `<td>${results[r][c] || ''}</td>`;
    }
    tr.innerHTML = html;
    tableBody.appendChild(tr);
  }
}

// CSV出力
exportCsvBtn.addEventListener('click', () => {
  let csv = 'No,' + Array.from({length:COLS},(_,i)=>`${i+1}`).join(',') + '\n';
  for (let r=0; r<ROWS; r++){
    const row = [r+1, ...results[r]];
    csv += row.map(csvEsc).join(',') + '\n';
  }
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `card_numbers_${fmtDate()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener('click', () => {
  results = Array.from({length: ROWS}, () => Array(COLS).fill(''));
  currentIndex = 0;
  renderTable();
  updateProgress();
  exportCsvBtn.disabled = true;
  clearBtn.disabled = true;
  manualInput.value='';
});

function csvEsc(s){
  if (s == null) return '';
  const t = String(s);
  if (/[",\n]/.test(t)) return '"' + t.replace(/"/g,'""') + '"';
  return t;
}

function fmtDate(){
  const d = new Date();
  const p = (n)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// PWA install
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();
  deferredPrompt=e;
  installBtn.hidden=false;
});
installBtn.addEventListener('click',async()=>{
  installBtn.hidden=true;
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
});
