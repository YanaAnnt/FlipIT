const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const rescan = document.getElementById('rescan');

chrome.storage.local.get('enabled', (r) => {
  const on = r.enabled !== false;
  toggle.checked = on;
  updateStatus(on);
});

toggle.addEventListener('change', () => {
  const on = toggle.checked;
  chrome.storage.local.set({ enabled: on });
  updateStatus(on);
  sendToTab(on ? 'enable' : 'disable');
});

rescan.addEventListener('click', () => {
  sendToTab('rescan');
  rescan.textContent = '✓ בוצע';
  setTimeout(() => { rescan.textContent = 'סרוק מחדש'; }, 1400);
});

function updateStatus(on) {
  status.textContent = on ? '● פעיל' : '○ כבוי';
  status.className = on ? 'status' : 'status off';
}

function sendToTab(action) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) chrome.tabs.sendMessage(tab.id, { action });
  });
}
