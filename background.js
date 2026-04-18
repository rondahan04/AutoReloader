'use strict';

const ALARM_PREFIX = 'sk_';

async function getStorage() {
  return chrome.storage.local.get({
    sites: [],
    globalEnabled: true,
    activeHours: { enabled: false, start: '08:00', end: '22:00' },
  });
}

// ─── Matching ────────────────────────────────────────────────────────────────

function tabMatchesSite(tabUrl, site) {
  try {
    const tab  = new URL(tabUrl);
    const base = new URL(site.url);
    switch (site.matchType) {
      case 'exact':
        return tabUrl === site.url;
      case 'domain': {
        const d = base.hostname;
        return tab.hostname === d || tab.hostname.endsWith('.' + d);
      }
      default: // 'startsWith'
        return tabUrl.startsWith(site.url);
    }
  } catch {
    return false;
  }
}

// ─── Active-hours gate ───────────────────────────────────────────────────────

function isInActiveHours({ enabled, start, end }) {
  if (!enabled) return true;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  // handles overnight ranges (e.g. 22:00 → 06:00)
  return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e;
}

// ─── Ghost ping ──────────────────────────────────────────────────────────────

async function ghostPing(site) {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    const open = tabs.some(t => t.url && tabMatchesSite(t.url, site));
    if (!open) return; // skip if no matching tab is open

    await fetch(site.url, {
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'include',
    });
  } catch {
    // intentionally silent
  }
}

// ─── Alarms ──────────────────────────────────────────────────────────────────

async function setupAlarms() {
  const existing = await chrome.alarms.getAll();
  await Promise.all(
    existing
      .filter(a => a.name.startsWith(ALARM_PREFIX))
      .map(a => chrome.alarms.clear(a.name))
  );
  const { sites } = await getStorage();
  for (const site of sites) {
    chrome.alarms.create(ALARM_PREFIX + site.id, {
      periodInMinutes: site.intervalMinutes,
    });
  }
}

// ─── Context menu ─────────────────────────────────────────────────────────────

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'sk_keepAlive',
      title: 'Keep this tab alive',
      contexts: ['page'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });
  });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const { sites } = await getStorage();
  if (sites.length === 0) {
    await chrome.storage.local.set({
      sites: [
        { id: 'default_0', url: 'https://my.runi.ac.il/',     intervalMinutes: 10, matchType: 'startsWith', enabled: true },
        { id: 'default_1', url: 'https://moodle.runi.ac.il/', intervalMinutes: 10, matchType: 'startsWith', enabled: true },
        { id: 'default_2', url: 'https://yedion.runi.ac.il/', intervalMinutes: 10, matchType: 'startsWith', enabled: true },
      ],
    });
  }
  setupContextMenu();
  await setupAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  setupContextMenu();
  await setupAlarms();
});

// ─── Alarm handler ───────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;

  const { sites, globalEnabled, activeHours } = await getStorage();
  if (!globalEnabled) return;
  if (!isInActiveHours(activeHours)) return;

  const siteId = alarm.name.slice(ALARM_PREFIX.length);
  const site   = sites.find(s => s.id === siteId);
  if (site?.enabled) await ghostPing(site);
});

// ─── Context-menu click ──────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'sk_keepAlive' || !tab?.url) return;
  try {
    const { hostname, protocol } = new URL(tab.url);
    const siteUrl = `${protocol}//${hostname}/`;
    const { sites } = await getStorage();
    if (sites.some(s => s.url === siteUrl)) return; // already tracked

    const newSite = {
      id: 'site_' + Date.now(),
      url: siteUrl,
      intervalMinutes: 10,
      matchType: 'domain',
      enabled: true,
    };
    await chrome.storage.local.set({ sites: [...sites, newSite] });
    await setupAlarms();
  } catch {
    // invalid URL — ignore
  }
});

// ─── Message bus ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === 'SITES_UPDATED') {
    setupAlarms().then(() => respond({ ok: true }));
    return true; // keep channel open for async response
  }
});
