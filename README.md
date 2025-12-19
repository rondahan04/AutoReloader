# Auto Reloader for RUNI

A Chrome extension that automatically refreshes RUNI, Moodle, and Yedion pages every 10 minutes to keep your session alive.

## Features

- Automatically refreshes tabs matching `https://my.runi.ac.il/*`, `https://moodle.runi.ac.il/*`, and `https://yedion.runi.ac.il/*`
- Reloads every 10 minutes to prevent session timeout
- Works in the background without user intervention
- Lightweight and efficient

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `AutoReloader` folder
5. The extension is now installed and active!

## How It Works

- The extension monitors all open tabs
- Every 10 minutes, it automatically reloads any tabs that match the target URLs
- The extension uses Chrome's alarm API to schedule reloads efficiently
- No configuration needed - it works automatically once installed

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker that handles the auto-reload logic
- `popup.html` - Simple popup interface showing extension status
- `icon16.png`, `icon48.png`, `icon128.png` - Extension icons (you'll need to add these)

## Notes

- The extension requires permissions to access tabs and create alarms
- It only affects tabs matching the specified URL patterns
- The reload interval is set to 10 minutes (600,000 milliseconds)

## Customization

To change the reload interval, edit the `RELOAD_INTERVAL` constant in `background.js` (value is in minutes).


