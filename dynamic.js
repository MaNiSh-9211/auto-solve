const { app, globalShortcut } = require('electron');
const uiohook = require('uiohook-napi');

app.on('ready', () => {
  console.log('Background service started. Press Alt + any key to register a dynamic shortcut.');

  // Listen for global keydown events
  uiohook.on('keydown', (event) => {
    const { altKey, rawcode } = event;

    // Check if the Alt key is pressed
    if (altKey) {
      const keyName = String.fromCharCode(rawcode);
      const shortcut = `Alt+${keyName.toUpperCase()}`;
      console.log(`Detected shortcut: ${shortcut}`);

      // Register the shortcut using Electron's globalShortcut
      const success = globalShortcut.register(shortcut, () => {
        console.log(`Shortcut ${shortcut} is working!`);
      });

      if (!success) {
        console.error(`Failed to register shortcut: ${shortcut}`);
      } else {
        console.log(`Shortcut ${shortcut} successfully registered.`);
      }
    }
  });

  // Start uiohook to listen for global events
  try {
    uiohook.start();
    console.log('uiohook started listening for global events.');
  } catch (error) {
    console.error('Failed to start uiohook listener:', error.message);
  }

  // Clean up on app quit
  app.on('will-quit', () => {
    console.log('Cleaning up resources...');
    globalShortcut.unregisterAll();
    uiohook.stop();
    uiohook.removeAllListeners();
  });
});

app.on('window-all-closed', () => {
  // Prevent the app from quitting if no windows are open
});
