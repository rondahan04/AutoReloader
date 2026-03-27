const ALARM_PREFIX = 'autoreload_';

async function getSites() {
  const { sites = [] } = await chrome.storage.local.get('sites');
  return sites;
}

async function setupAlarms() {
  // Clear all existing autoreload alarms
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith(ALARM_PREFIX)) {
      await chrome.alarms.clear(alarm.name);
    }
  }

  // Create one alarm per site
  const sites = await getSites();
  for (const site of sites) {
    chrome.alarms.create(ALARM_PREFIX + site.id, {
      periodInMinutes: site.intervalMinutes
    });
  }
}

async function reloadSiteTabs(siteUrl) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url || !tab.url.startsWith(siteUrl)) continue;

      // Skip the tab if the user is currently looking at it
      if (tab.active) {
        console.log(`Skipping active tab: ${tab.url}`);
        continue;
      }

      try {
        await chrome.tabs.reload(tab.id);
        console.log(`Reloaded tab: ${tab.url}`);
      } catch (error) {
        console.error(`Error reloading tab ${tab.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error querying tabs:', error);
  }
}

// On first install, seed with the original three RUNI sites
chrome.runtime.onInstalled.addListener(async () => {
  const { sites } = await chrome.storage.local.get('sites');
  if (!sites) {
    const defaultSites = [
      { id: 'default_0', url: 'https://my.runi.ac.il/',     intervalMinutes: 10 },
      { id: 'default_1', url: 'https://moodle.runi.ac.il/', intervalMinutes: 10 },
      { id: 'default_2', url: 'https://yedion.runi.ac.il/', intervalMinutes: 10 }
    ];
    await chrome.storage.local.set({ sites: defaultSites });
  }
  await setupAlarms();
});

// Re-create alarms after browser restarts (service worker may have been killed)
chrome.runtime.onStartup.addListener(async () => {
  await setupAlarms();
});

// Fire when an alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;

  const siteId = alarm.name.slice(ALARM_PREFIX.length);
  const sites = await getSites();
  const site = sites.find(s => s.id === siteId);

  if (site) {
    await reloadSiteTabs(site.url);
  }
});

// Popup notifies us when the site list changes so we can rebuild alarms
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SITES_UPDATED') {
    setupAlarms().then(() => sendResponse({ success: true }));
    return true; // keep message channel open for async response
  }
});
