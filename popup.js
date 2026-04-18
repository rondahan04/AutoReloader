'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

let allSites      = [];
let globalEnabled = true;
let activeHours   = { enabled: false, start: '08:00', end: '22:00' };

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function loadStorage() {
  const data = await chrome.storage.local.get({
    sites:         [],
    globalEnabled: true,
    activeHours:   { enabled: false, start: '08:00', end: '22:00' },
  });
  allSites      = data.sites;
  globalEnabled = data.globalEnabled;
  activeHours   = data.activeHours;
}

async function persist() {
  await chrome.storage.local.set({ sites: allSites, globalEnabled, activeHours });
  chrome.runtime.sendMessage({ type: 'SITES_UPDATED' }).catch(() => {});
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MATCH_LABELS = { startsWith: 'Starts With', domain: 'Domain', exact: 'Exact' };
const BADGE_CLASS  = { startsWith: 'match-badge', domain: 'match-badge domain', exact: 'match-badge exact' };

function esc(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Render sites ─────────────────────────────────────────────────────────────

function renderSites() {
  const list = document.getElementById('sitesList');
  list.innerHTML = '';

  if (allSites.length === 0) {
    list.innerHTML = '<div class="empty">No websites configured yet.</div>';
    return;
  }

  for (const site of allSites) {
    // A site is "effectively active" only when both the master switch AND
    // the per-site toggle are on.
    const effectivelyActive = globalEnabled && site.enabled;

    const item = document.createElement('div');
    item.className = [
      'site-item',
      !globalEnabled  ? 'is-globally-paused' : '',
      !site.enabled   ? 'is-site-paused'     : '',
    ].filter(Boolean).join(' ');

    const badge = BADGE_CLASS[site.matchType] ?? 'match-badge';
    const label = MATCH_LABELS[site.matchType] ?? 'Starts With';

    item.innerHTML = `
      <div class="ghost-status ${effectivelyActive ? '' : 'is-paused'}"></div>
      <div class="site-info">
        <div class="site-url" title="${esc(site.url)}">${esc(site.url)}</div>
        <div class="site-meta">Every ${site.intervalMinutes} min</div>
      </div>
      <span class="${badge}">${label}</span>
      <label class="toggle on-card" title="${site.enabled ? 'Pause this site' : 'Resume this site'}">
        <input type="checkbox" class="site-toggle-cb" data-id="${site.id}" ${site.enabled ? 'checked' : ''}>
        <span class="track"></span>
      </label>
      <button class="delete-btn" data-id="${site.id}" title="Remove">&#128465;</button>
    `;

    list.appendChild(item);
  }

  // Per-site toggle
  list.querySelectorAll('.site-toggle-cb').forEach(cb => {
    cb.addEventListener('change', async () => {
      const site = allSites.find(s => s.id === cb.dataset.id);
      if (!site) return;
      site.enabled = cb.checked;
      await persist();
      renderSites();
    });
  });

  // Delete
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      allSites = allSites.filter(s => s.id !== btn.dataset.id);
      await persist();
      renderSites();
    });
  });
}

// ─── Master switch ────────────────────────────────────────────────────────────

function initMasterSwitch() {
  const sw = document.getElementById('masterSwitch');
  sw.checked = globalEnabled;
  sw.addEventListener('change', async () => {
    globalEnabled = sw.checked;
    await persist();
    renderSites(); // ghost states depend on globalEnabled
  });
}

// ─── Active hours ─────────────────────────────────────────────────────────────

function initActiveHours() {
  const enabledCb = document.getElementById('hoursEnabled');
  const hoursRow  = document.getElementById('hoursRow');
  const startIn   = document.getElementById('hoursStart');
  const endIn     = document.getElementById('hoursEnd');

  enabledCb.checked = activeHours.enabled;
  startIn.value     = activeHours.start;
  endIn.value       = activeHours.end;
  hoursRow.classList.toggle('hidden', !activeHours.enabled);

  enabledCb.addEventListener('change', async () => {
    activeHours.enabled = enabledCb.checked;
    hoursRow.classList.toggle('hidden', !activeHours.enabled);
    await persist();
  });

  const onTimeChange = async () => {
    activeHours.start = startIn.value;
    activeHours.end   = endIn.value;
    await persist();
  };
  startIn.addEventListener('change', onTimeChange);
  endIn.addEventListener('change', onTimeChange);
}

// ─── Add form ─────────────────────────────────────────────────────────────────

function initAddForm() {
  const urlInput   = document.getElementById('urlInput');
  const matchSel   = document.getElementById('matchType');
  const intervalIn = document.getElementById('intervalInput');
  const addBtn     = document.getElementById('addBtn');
  const errorMsg   = document.getElementById('errorMsg');

  const doAdd = async () => {
    errorMsg.textContent = '';
    let raw = urlInput.value.trim();
    if (!raw) { errorMsg.textContent = 'Please enter a URL.'; return; }
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    try { new URL(raw); } catch {
      errorMsg.textContent = 'Invalid URL — include the full address.';
      return;
    }
    const interval = parseInt(intervalIn.value, 10);
    if (!interval || interval < 1) {
      errorMsg.textContent = 'Interval must be at least 1 minute.';
      return;
    }
    if (allSites.some(s => s.url === raw)) {
      errorMsg.textContent = 'This URL is already in the list.';
      return;
    }

    allSites.push({
      id:              'site_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      url:             raw,
      intervalMinutes: interval,
      matchType:       matchSel.value,
      enabled:         true,
    });

    await persist();
    renderSites();
    urlInput.value   = '';
    intervalIn.value = '10';
    matchSel.value   = 'startsWith';
    urlInput.focus();
  };

  addBtn.addEventListener('click', doAdd);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  await loadStorage();
  initMasterSwitch();
  initActiveHours();
  initAddForm();
  renderSites();
})();
