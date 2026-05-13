const toggle     = document.getElementById('toggle');
const mathToggle = document.getElementById('mathToggle');
const statusHint = document.getElementById('statusHint');
const statusDot  = document.getElementById('statusDot');
const reloadBtn  = document.getElementById('reload');

// Load saved settings
chrome.storage.local.get(['enabled', 'protectMath'], (r) => {
  const on   = r.enabled !== false;
  const math = r.protectMath !== false;
  toggle.checked     = on;
  mathToggle.checked = math;
  updateStatus(on);
});

toggle.addEventListener('change', () => {
  const on = toggle.checked;
  chrome.storage.local.set({ enabled: on });
  updateStatus(on);
  sendToTab(on ? 'enable' : 'disable');
});

mathToggle.addEventListener('change', () => {
  chrome.storage.local.set({ protectMath: mathToggle.checked });
  sendToTab('setMath', { protectMath: mathToggle.checked });
});

reloadBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) chrome.tabs.reload(tab.id);
  });
});

function updateStatus(on) {
  statusHint.textContent = on ? 'פעיל בדף זה' : 'כבוי';
  statusHint.style.color = on ? '#7c3aed' : '#ef4444';
  statusDot.className    = on ? 'status-dot' : 'status-dot off';
}

function sendToTab(action, data = {}) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) chrome.tabs.sendMessage(tab.id, { action, ...data });
  });
}
