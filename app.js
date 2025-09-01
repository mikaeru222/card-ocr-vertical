const cameraInput = document.getElementById('cameraInput');
const ocrResultEl = document.getElementById('ocrResult');
const manualInput = document.getElementById('manualInput');
const appendStay = document.getElementById('appendStay');
const confirmBtn = document.getElementById('confirmBtn');
const skipBtn = document.getElementById('skipBtn');
const progressEl = document.getElementById('progress');
const tableBody = document.querySelector('#resultTable tbody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const clearBtn = document.getElementById('clearBtn');

// 固定サイズ: 100行 x 12列（No列は別）
const ROWS = 100;
const COLS = 12;

// 2次元配列初期化
let results = Array.from({length: ROWS}, () => Array(COLS).fill(''));
let currentIndex = 0; // 0..(ROWS*COLS-1)

updateProgress();
renderTable();

cameraInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const text = await OCR.recognize(file);
  const number = OCR.pickCardNumber(text);
  ocrResultEl.textContent = number || '（未検出）';
  manualInput.value = '';
  // 入力欄に自動フォーカス
  manualInput.focus();
});

confirmBtn.addEventListener('click', () => {
  if (currentIndex >= ROWS * COLS) return; // これ以上は記録しない（12列 x 100行）

  const number = (manualInput.value || ocrResultEl.textContent || '').trim();
  if (!number || number === '（未検出）') return;

  const col = Math.floor(currentIndex / ROWS);    // 列優先（0..11）
  const row = currentIndex % ROWS;                // 行（0..99）

  // 追記 or 置換
  if (results[row][col]) {
    results[row][col] = results[row][col] + '/' + number;
  } else {
    results[row][col] = number;
  }

  renderTable();

  // 進み方：appendStay がONなら同じセルに留まる
  if (!appendStay.checked) {
    currentIndex = Math.min(currentIndex + 1, ROWS * COLS); // 次のセルへ
  }
  updateProgress();

  exportCsvBtn.disabled = false;
  clearBtn.disabled = false;

  // 次の撮影に備えてリセット
  cameraInput.value = '';
  ocrResultEl.textContent = '';
  manualInput.value = '';
});

skipBtn.addEventListener('click', () => {
  if (currentIndex >= ROWS * COLS) return;
  currentIndex = Math.min(currentIndex + 1, ROWS * COLS);
  updateProgress();
});

function updateProgress(){
  const col = Math.floor(currentIndex / ROWS) + 1; // 1..12
  const row = (currentIndex % ROWS) + 1;           // 1..100
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

// CSV出力（No + 12列、100行固定）
exportCsvBtn.addEventListener('click', () => {
  let csv = 'No,' + Array.from({length:COLS},(_,i)=>`${i+1}`).join(',') + '\n';
  for (let r=0; r<ROWS; r++){
    const row = [r+1, ...results[r]];
    csv += row.map(csvEsc).join(',') + '\n';
  }
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'card_numbers.csv';
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
  cameraInput.value='';
  ocrResultEl.textContent='';
  manualInput.value='';
});

function csvEsc(s){
  if (s == null) return '';
  const t = String(s);
  if (/[",\n]/.test(t)) return '"' + t.replace(/"/g,'""') + '"';
  return t;
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
