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
const backupBtn = document.getElementById('backupBtn');
const importCsvInput = document.getElementById('importCsvInput');
const clearBtn = document.getElementById('clearBtn');

const ROWS = 100;
const COLS = 12;
const STORE_KEY = 'card_ocr_vertical_v1';

let results = Array.from({length: ROWS}, () => Array(COLS).fill(''));
let currentIndex = 0;

loadFromStorage();   // ← 起動時に自動復元
updateProgress();
renderTable();

cameraInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const text = await OCR.recognize(file);

  const cands = OCR.extractCandidates(text);
  renderCandidates(cands);

  manualInput.value = '';
  manualInput.focus();
  cameraInput.value = '';
});

function renderCandidates(list){
  candWrap.innerHTML = '';
  if (!list || !list.length) {
    candWrap.textContent = '（候補なし）';
    return;
  }
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

  autoSave();  // ← 自動セーブ
});

skipBtn.addEventListener('click', () => {
  if (currentIndex >= ROWS * COLS) return;
  currentIndex = Math.min(currentIndex + 1, ROWS * COLS);
  updateProgress();
  autoSave();  // ← 自動セーブ
});

function normalizeTo3(s){
  const t = String(s).toUpperCase().replace(/\s+/g,'');
  if (/\d+\/\d+/.test(t)) return t;
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

/* ===== CSV出力/途中保存/読み込み ===== */
exportCsvBtn.addEventListener('click', downloadCsv);
backupBtn.addEventListener('click', () => downloadCsv(true));
importCsvInput.addEventListener('change', handleImportCsv);

function downloadCsv(isBackup=false){
  let csv = 'No,' + Array.from({length:COLS},(_,i)=>`${i+1}`).join(',') + '\n';
  for (let r=0; r<ROWS; r++){
    const row = [r+1, ...results[r]];
    csv += row.map(csvEsc).join(',') + '\n';
  }
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = fmtDate();
  a.href = url;
  a.download = isBackup ? `card_numbers_backup_${stamp}.csv` : `card_numbers_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function handleImportCsv(e){
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const text = await f.text();
  const lines = text.replace(/\r\n/g,'\n').split('\n').filter(Boolean);

  // 先頭行はヘッダー（No,1..12）
  const body = lines.slice(1);
  const newResults = Array.from({length: ROWS}, () => Array(COLS).fill(''));

  body.slice(0, ROWS).forEach((line, idx) => {
    const cols = splitCsv(line);
    // 先頭はNo列なのでスキップ
    for (let c=0; c<COLS; c++) {
      newResults[idx][c] = cols[c+1] || '';
    }
  });

  results = newResults;
  // 次に入力すべきセルを推定（最初の空セル）
  currentIndex = findFirstEmptyIndex();
  renderTable();
  updateProgress();
  exportCsvBtn.disabled = countFilled() === 0;
  clearBtn.disabled = countFilled() === 0;
  autoSave(); // 復元後も保存
  e.target.value = '';
}

function findFirstEmptyIndex(){
  for (let i=0; i<ROWS*COLS; i++){
    const col = Math.floor(i / ROWS);
    const row = i % ROWS;
    if (!results[row][col]) return i;
  }
  return ROWS*COLS; // すべて埋まっていれば末尾
}

function csvEsc(s){
  if (s == null) return '';
  const t = String(s);
  if (/[",\n]/.test(t)) return '"' + t.replace(/"/g,'""') + '"';
  return t;
}

function splitCsv(line){
  const out = [];
  let cur = '', inQ = false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (inQ){
      if (ch === '"' && line[i+1] === '"'){ cur += '"'; i++; }
      else if (ch === '"'){ inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === ','){ out.push(cur); cur = ''; }
      else if (ch === '"'){ inQ = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}

function fmtDate(){
  const d = new Date();
  const p = (n)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/* ===== 自動セーブ（localStorage） ===== */
function autoSave(){
  try{
    const data = { results, currentIndex, ts: Date.now() };
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }catch(e){
    console.warn('autosave failed:', e);
  }
}

function loadFromStorage(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.results)) return;
    results = data.results;
    currentIndex = Number.isInteger(data.currentIndex) ? data.currentIndex : 0;
  }catch(e){
    console.warn('loadFromStorage failed:', e);
  }
}

window.addEventListener('beforeunload', autoSave);

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
