// Root level entry point with dynamic import to support all Hostinger environments (Passenger/CommonJS)
import('./server/server.js').catch(err => {
  console.error("❌ CRITICAL: Failed to load Express server:", err);
  process.exit(1);
});
