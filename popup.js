async function getSites() {
  const { sites = [] } = await chrome.storage.local.get('sites');
  return sites;
}

async function saveSites(sites) {
  await chrome.storage.local.set({ sites });
  chrome.runtime.sendMessage({ type: 'SITES_UPDATED' }).catch(() => {
    // Background may not be awake yet; setupAlarms runs on startup anyway
  });
}

function generateId() {
  return 'site_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

function renderSites(sites) {
  const list = document.getElementById('sitesList');
  list.innerHTML = '';

  if (sites.length === 0) {
    list.innerHTML = '<div class="empty">No websites configured yet.</div>';
    return;
  }

  for (const site of sites) {
    const item = document.createElement('div');
    item.className = 'site-item';

    item.innerHTML = `
      <div class="site-info">
        <div class="site-url" title="${site.url}">${site.url}</div>
        <div class="site-meta">Refresh every ${site.intervalMinutes} minute${site.intervalMinutes !== 1 ? 's' : ''}</div>
      </div>
      <button class="delete-btn" data-id="${site.id}" title="Remove">&#128465;</button>
    `;

    list.appendChild(item);
  }

  // Attach delete handlers
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const current = await getSites();
      const updated = current.filter(s => s.id !== id);
      await saveSites(updated);
      renderSites(updated);
    });
  });
}

document.getElementById('addBtn').addEventListener('click', async () => {
  const urlInput = document.getElementById('urlInput');
  const intervalInput = document.getElementById('intervalInput');
  const errorMsg = document.getElementById('errorMsg');

  errorMsg.textContent = '';

  const rawUrl = urlInput.value.trim();
  const intervalMinutes = parseInt(intervalInput.value, 10);

  // Validate URL
  if (!rawUrl) {
    errorMsg.textContent = 'Please enter a URL.';
    return;
  }
  let normalizedUrl = rawUrl;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  try {
    new URL(normalizedUrl);
  } catch {
    errorMsg.textContent = 'Invalid URL. Include the full address (e.g. https://example.com/).';
    return;
  }

  // Validate interval
  if (!intervalMinutes || intervalMinutes < 1) {
    errorMsg.textContent = 'Interval must be at least 1 minute.';
    return;
  }

  const sites = await getSites();

  // Check for duplicate
  if (sites.some(s => s.url === normalizedUrl)) {
    errorMsg.textContent = 'This URL is already in the list.';
    return;
  }

  const newSite = {
    id: generateId(),
    url: normalizedUrl,
    intervalMinutes
  };

  const updated = [...sites, newSite];
  await saveSites(updated);
  renderSites(updated);

  // Reset form
  urlInput.value = '';
  intervalInput.value = '10';
});

// Allow submitting with Enter in the URL field
document.getElementById('urlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

// Initial render
getSites().then(renderSites);
