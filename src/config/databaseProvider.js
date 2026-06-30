const env = typeof import.meta.env !== 'undefined' ? import.meta.env : process.env;

export const databaseProvider = {
  // Toggle between 'supabase' and 'mysql'
  provider: env.VITE_DATABASE_PROVIDER || 'supabase',
  // Local or remote API server URL
  apiUrl: env.VITE_API_URL || 'http://localhost:3001'
};

export default databaseProvider;
