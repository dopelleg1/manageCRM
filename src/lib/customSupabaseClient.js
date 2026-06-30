import { createClient } from '@supabase/supabase-js';
import databaseProvider from '../config/databaseProvider.js';

const realSupabaseUrl = 'https://bukfxhtbkgqzlqsiukwl.supabase.co';
const realSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a2Z4aHRia2dxemxxc2l1a3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDU1ODQsImV4cCI6MjA3NDQ4MTU4NH0.LyrSvfJw91gAZ-Go5OGKV2f2ZCbhh3ZjUXxrwL75-qY';

const realSupabase = createClient(realSupabaseUrl, realSupabaseAnonKey);

// --- MYSQL ADAPTER LAYER ---
const getLocalSession = () => {
  try {
    const saved = localStorage.getItem('mysql-session');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const setLocalSession = (session) => {
  try {
    if (session) {
      localStorage.setItem('mysql-session', JSON.stringify(session));
    } else {
      localStorage.removeItem('mysql-session');
    }
  } catch (e) {}
};

const authListeners = new Set();

const triggerAuthChange = (event, session) => {
  authListeners.forEach(callback => {
    try {
      callback(event, session);
    } catch (e) {
      console.error('Error in auth state change listener:', e);
    }
  });
};

const mysqlClient = {
  supabaseUrl: databaseProvider.apiUrl,
  
  auth: {
    getSession: async () => {
      const session = getLocalSession();
      return { data: { session }, error: null };
    },
    
    signInWithPassword: async ({ email, password }) => {
      try {
        const response = await fetch(`${databaseProvider.apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        if (!response.ok) {
          return { data: { session: null, user: null }, error: new Error(result.error || 'Login failed') };
        }
        
        setLocalSession(result.session);
        triggerAuthChange('SIGNED_IN', result.session);
        return { data: result.session, error: null };
      } catch (err) {
        return { data: { session: null, user: null }, error: err };
      }
    },
    
    signOut: async () => {
      setLocalSession(null);
      triggerAuthChange('SIGNED_OUT', null);
      return { error: null };
    },
    
    signUp: async ({ email, password, options }) => {
      try {
        const response = await fetch(`${databaseProvider.apiUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name: options?.data?.name || email.split('@')[0],
            role: options?.data?.role || 'agente'
          })
        });
        
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: new Error(result.error || 'Signup failed') };
        }
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    
    onAuthStateChange: (callback) => {
      authListeners.add(callback);
      const session = getLocalSession();
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            }
          }
        }
      };
    },

    updateUser: async ({ password }) => {
      return { data: { user: getLocalSession()?.user }, error: null };
    },

    resetPasswordForEmail: async (email, options) => {
      return { data: {}, error: null };
    }
  },
  
  from: (tableName) => {
    const queryBuilder = {
      table: tableName,
      action: 'select',
      data: null,
      filters: [],
      queryLimit: null,
      queryOrder: null,
      querySingle: false,
      
      select: function(fields) {
        this.action = 'select';
        return this;
      },
      
      insert: function(data) {
        this.action = 'insert';
        this.data = data;
        return this;
      },
      
      update: function(data) {
        this.action = 'update';
        this.data = data;
        return this;
      },
      
      delete: function() {
        this.action = 'delete';
        return this;
      },
      
      eq: function(column, value) {
        this.filters.push({ type: 'eq', column, value });
        return this;
      },
      
      neq: function(column, value) {
        this.filters.push({ type: 'neq', column, value });
        return this;
      },
      
      gt: function(column, value) {
        this.filters.push({ type: 'gt', column, value });
        return this;
      },
      
      gte: function(column, value) {
        this.filters.push({ type: 'gte', column, value });
        return this;
      },
      
      lt: function(column, value) {
        this.filters.push({ type: 'lt', column, value });
        return this;
      },
      
      lte: function(column, value) {
        this.filters.push({ type: 'lte', column, value });
        return this;
      },
      
      in: function(column, values) {
        this.filters.push({ type: 'in', column, value: values });
        return this;
      },
      
      contains: function(column, value) {
        this.filters.push({ type: 'contains', column, value });
        return this;
      },
      
      single: function() {
        this.querySingle = true;
        return this;
      },
      
      maybeSingle: function() {
        this.querySingle = true;
        return this;
      },
      
      limit: function(limit) {
        this.queryLimit = limit;
        return this;
      },
      
      order: function(column, options) {
        this.queryOrder = { column, ascending: options?.ascending !== false };
        return this;
      },
      
      then: function(onfulfilled, onrejected) {
        const session = getLocalSession();
        const headers = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        const executeQuery = async () => {
          try {
            const response = await fetch(`${databaseProvider.apiUrl}/api/db/query`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                table: this.table,
                action: this.action,
                data: this.data,
                filters: this.filters,
                limit: this.queryLimit,
                order: this.queryOrder,
                single: this.querySingle
              })
            });
            
            const result = await response.json();
            if (!response.ok) {
              return { data: null, error: new Error(result.error || 'Database query failed') };
            }
            return { data: result.data, error: result.error ? new Error(result.error) : null };
          } catch (err) {
            return { data: null, error: err };
          }
        };
        
        return executeQuery().then(onfulfilled, onrejected);
      }
    };
    
    return queryBuilder;
  },
  
  storage: {
    from: (bucketName) => {
      return {
        upload: async (filePath, file) => {
          const formData = new FormData();
          formData.append('file', file);
          
          try {
            const response = await fetch(`${databaseProvider.apiUrl}/api/storage/upload`, {
              method: 'POST',
              body: formData
            });
            
            const result = await response.json();
            if (!response.ok) {
              return { data: null, error: new Error(result.error || 'Upload failed') };
            }
            
            return { data: { path: result.data.path }, error: null };
          } catch (err) {
            return { data: null, error: err };
          }
        },
        
        download: async (filePath) => {
          const filename = filePath.split('/').pop();
          try {
            const response = await fetch(`${databaseProvider.apiUrl}/api/storage/download/${filename}`);
            if (!response.ok) {
              return { data: null, error: new Error('File download failed') };
            }
            const blob = await response.blob();
            return { data: blob, error: null };
          } catch (err) {
            return { data: null, error: err };
          }
        },
        
        remove: async (filePaths) => {
          try {
            for (const filePath of filePaths) {
              const filename = filePath.split('/').pop();
              await fetch(`${databaseProvider.apiUrl}/api/storage/delete/${filename}`, {
                method: 'DELETE'
              });
            }
            return { data: true, error: null };
          } catch (err) {
            return { data: null, error: err };
          }
        }
      };
    }
  },

  functions: {
    invoke: async (functionName, options) => {
      try {
        if (functionName === 'create-user') {
          const { email, password, name, role } = options.body;
          const response = await fetch(`${databaseProvider.apiUrl}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, role })
          });
          const result = await response.json();
          if (!response.ok) {
             return { data: null, error: new Error(result.error || 'Failed to invoke function') };
          }
          return { data: result, error: null };
        }
        return { data: { success: true }, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    }
  }
};

const isMysql = databaseProvider.provider === 'mysql';
const customSupabaseClient = isMysql ? mysqlClient : realSupabase;

console.log(`🔌 Database Provider active: ${databaseProvider.provider.toUpperCase()}`);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
