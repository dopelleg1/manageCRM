// Default values
let provider = 'supabase';
let apiUrl = ''; // Relative path for unified server deployments

// 1. Automatic Domain-Based Detection
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname.includes('hostingersite.com') || hostname === 'localhost' || hostname === '127.0.0.1') {
    provider = 'mysql';
    console.log(`🔌 Auto-detected DEV/TEST environment. Switching default to MYSQL.`);
  } else if (hostname === 'manage.studiobpitalia.it') {
    provider = 'supabase';
    console.log(`🔌 Auto-detected PRODUCTION environment. Switching default to SUPABASE.`);
  }
}

// 2. Runtime config override (config.json)
try {
  const response = await fetch('/config.json');
  if (response.ok) {
    const config = await response.json();
    provider = config.VITE_DATABASE_PROVIDER || provider;
    apiUrl = config.VITE_API_URL !== undefined ? config.VITE_API_URL : apiUrl;
    console.log(`⚙️ Dynamic runtime config applied. Provider: ${provider.toUpperCase()}`);
  }
} catch (e) {
  // Fallback to build-time environment variables
  const env = typeof import.meta.env !== 'undefined' ? import.meta.env : process.env;
  provider = env.VITE_DATABASE_PROVIDER || provider;
  apiUrl = env.VITE_API_URL || apiUrl;
}

export const databaseProvider = { provider, apiUrl };
export default databaseProvider;
