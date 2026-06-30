// App level entry point wrapper for Hostinger (if looking for app.js)
import('./server/server.js').catch(err => {
  console.error("❌ CRITICAL: Failed to load Express server via app.js:", err);
  process.exit(1);
});
