// Index level entry point wrapper for Hostinger (if looking for index.js)
import('./server/server.js').catch(err => {
  console.error("❌ CRITICAL: Failed to load Express server via index.js:", err);
  process.exit(1);
});
