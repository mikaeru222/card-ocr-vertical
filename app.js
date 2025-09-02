const cameraInput = document.getElementById('cameraInput');
const manualInput = document.getElementById('manualInput');
const appendStay = document.getElementById('appendStay');
const pad3 = document.getElementById('pad3');
const confirmBtn = document.getElementById('confirmBtn');
const skipBtn = document.getElementById('skipBtn');
const progressEl = document.getElementById('progress');
const candWrap = document.getElementById('candidates');
const shotThumb = document.getElementById('shotThumb');
const statusBadge = document.getElementById('statusBadge');
const toast = document.getElementById('toast');
// …他の定義やresults, currentIndex, 関数は既存のまま…

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 1800);
}
function vibrate(ms=30){
  if (navigator.vibrate) navigator.vibrate(ms);
}

cameraInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  // サムネ表示
  const url = URL.createObjectURL(file);
  shotThumb.src = url;
  shotThumb.style.display = 'inline-block';

  // 状態表示
  statusBadge.textContent = 'OCR中…';
  statusBadge.classList.add('loading');
  statusBadge.style.display = 'inline-block';
  confirmBtn.disabled = true;

  try {
    const text = await OCR.recognize(file);
    const cands = OCR.extractCandidates(text);
    renderCandidates(cands);

    showToast(cands.length ? '読み取り完了' : '番号を見つけられません');
    vibrate(cands.length ? 15 : 40);
  } catch(err){
    console.error(err);
    renderCandidates([]);
    showToast('エラー：読み取り失敗');
    vibrate(60);
  } finally {
    statusBadge.style.display = 'none';
    statusBadge.classList.remove('loading');
    confirmBtn.disabled = false;
    cameraInput.value = '';
  }

  manualInput.value = '';
  manualInput.focus();
});
