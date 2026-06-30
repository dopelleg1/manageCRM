// Default values
let provider = 'supabase';
let apiUrl = 'http://localhost:3001';

// Attempt to load configurations dynamically from a runtime config.json file
try {
  // Using top-level await to load configuration before exporting
  const response = await fetch('/config.json');
  if (response.ok) {
    const config = await response.json();
    provider = config.VITE_DATABASE_PROVIDER || provider;
    apiUrl = config.VITE_API_URL || apiUrl;
    console.log(`⚙️ Loaded dynamic runtime config. Provider: ${provider.toUpperCase()}`);
  }
} catch (e) {
  // Fallback to build-time environment variables if config.json is not found
  const env = typeof import.meta.env !== 'undefined' ? import.meta.env : process.env;
  provider = env.VITE_DATABASE_PROVIDER || provider;
  apiUrl = env.VITE_API_URL || apiUrl;
}

export const databaseProvider = { provider, apiUrl };
export default databaseProvider;
