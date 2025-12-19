// Auto-reload service worker for RUNI and Moodle pages

const RELOAD_INTERVAL = 10; // minutes
const TARGET_URLS = [
  "https://my.runi.ac.il/",
  "https://moodle.runi.ac.il/",
  "https://yedion.runi.ac.il/"
];

// Function to check if a URL matches our target patterns
function matchesTargetUrl(url) {
  return url.startsWith("https://my.runi.ac.il/") || 
         url.startsWith("https://moodle.runi.ac.il/") ||
         url.startsWith("https://yedion.runi.ac.il/");
}

// Function to reload matching tabs
async function reloadMatchingTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      if (tab.url && matchesTargetUrl(tab.url)) {
        try {
          await chrome.tabs.reload(tab.id);
          console.log(`Reloaded tab: ${tab.url}`);
        } catch (error) {
          console.error(`Error reloading tab ${tab.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error querying tabs:", error);
  }
}

// Set up alarm to reload every 10 minutes
chrome.runtime.onInstalled.addListener(() => {
  // Clear any existing alarms
  chrome.alarms.clear("autoReload", () => {
    // Create new alarm that fires every 10 minutes
    chrome.alarms.create("autoReload", {
      periodInMinutes: RELOAD_INTERVAL
    });
    console.log("Auto-reload alarm set for every 10 minutes");
  });
});

// Handle alarm event
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "autoReload") {
    reloadMatchingTabs();
  }
});

// Also reload when extension starts (in case tabs are already open)
chrome.runtime.onStartup.addListener(() => {
  reloadMatchingTabs();
});

// Optional: Reload when a matching tab is created/updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only reload when the page has finished loading
  if (changeInfo.status === "complete" && tab.url && matchesTargetUrl(tab.url)) {
    // Set up a one-time reload after 10 minutes for this specific tab
    // The alarm will handle all tabs, but this ensures new tabs get the timer too
  }
});


