const STORAGE_KEY = 'substackFilterWords';
const listEl = document.getElementById('termsList');
const countEl = document.getElementById('count');
const input = document.getElementById('newTerm');
const addBtn = document.getElementById('addBtn');

function render(terms) {
  if (terms.length === 0) {
    listEl.innerHTML = '<div class="empty">No blocked words yet. Add some above.</div>';
    countEl.textContent = '';
    return;
  }
  listEl.innerHTML = terms.map((t, i) =>
    `<div class="term"><span>${escHtml(t)}</span><button class="btn-remove" data-i="${i}">&times;</button></div>`
  ).join('');
  countEl.textContent = `${terms.length} term${terms.length === 1 ? '' : 's'} blocked`;
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function load() {
  chrome.storage.sync.get(STORAGE_KEY, (data) => {
    render(data[STORAGE_KEY] || []);
  });
}

function save(terms) {
  chrome.storage.sync.set({ [STORAGE_KEY]: terms }, () => render(terms));
}

addBtn.addEventListener('click', () => {
  const val = input.value.trim();
  if (!val) return;
  chrome.storage.sync.get(STORAGE_KEY, (data) => {
    const terms = data[STORAGE_KEY] || [];
    if (!terms.some(t => t.toLowerCase() === val.toLowerCase())) {
      terms.push(val);
      save(terms);
    }
    input.value = '';
    input.focus();
  });
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBtn.click();
});

listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-remove');
  if (!btn) return;
  const idx = parseInt(btn.dataset.i);
  chrome.storage.sync.get(STORAGE_KEY, (data) => {
    const terms = data[STORAGE_KEY] || [];
    terms.splice(idx, 1);
    save(terms);
  });
});

load();

// Tip address copy
const tipAddr = document.getElementById('tipAddr');
if (tipAddr) {
  tipAddr.addEventListener('click', () => {
    navigator.clipboard.writeText(tipAddr.textContent.trim());
    tipAddr.classList.add('tip-copied');
    tipAddr.textContent = 'Copied!';
    setTimeout(() => {
      tipAddr.classList.remove('tip-copied');
      tipAddr.textContent = '0xc4F311a5099F21A5dea4097feF4Db529D6E1da5D';
    }, 1500);
  });
}
