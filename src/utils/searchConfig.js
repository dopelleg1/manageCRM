export const searchConfig = {
  commercial_activities: {
    tableName: 'commercial_activities',
    displayName: 'Attività Commerciali',
    searchableFields: ['codice', 'numero', 'categoria', 'citta', 'indirizzo', 'stato', 'full_code'],
    rolePermissions: {
      agente: 'own', // Can only search own data
      telemarketing: 'own',
      admin: 'all',
      super_admin: 'all'
    }
  },
  properties: {
    tableName: 'properties',
    displayName: 'Immobili',
    searchableFields: ['codice', 'numero', 'citta', 'indirizzo', 'zona', 'stato', 'full_code', 'nome_proprietario', 'cognome_proprietario'],
    rolePermissions: {
      agente: 'own',
      telemarketing: 'own',
      admin: 'all',
      super_admin: 'all'
    }
  },
  potential_tobacconists: {
    tableName: 'potential_tobacconists',
    displayName: 'Potenziali Tabaccherie',
    searchableFields: ['numero_rivendita', 'nome', 'cognome', 'citta', 'zona', 'indirizzo'],
    rolePermissions: {
      agente: 'own',
      telemarketing: 'own',
      admin: 'all',
      super_admin: 'all'
    }
  },
  potential_activities: {
    tableName: 'potential_activities',
    displayName: 'Potenziali Attività',
    searchableFields: ['nome', 'cognome', 'email', 'telefono', 'numero', 'note', 'citta', 'zona'],
    rolePermissions: {
      agente: 'own',
      telemarketing: 'own',
      admin: 'all',
      super_admin: 'all'
    }
  },
  telemarketing_contacts: {
    tableName: 'telemarketing_contacts',
    displayName: 'Telemarketing',
    searchableFields: ['nome_azienda', 'nome', 'cognome', 'telefono', 'email', 'citta', 'indirizzo'],
    rolePermissions: {
      agente: 'none', // Agents typically don't see raw telemarketing data unless assigned (handled by data context)
      telemarketing: 'all', // Telemarketing role sees all
      admin: 'all',
      super_admin: 'all'
    }
  }
};

export const getSearchableFields = (tableName) => {
  return searchConfig[tableName]?.searchableFields || [];
};

export const getRolePermission = (tableName, role) => {
  const config = searchConfig[tableName];
  if (!config) return 'none';
  return config.rolePermissions[role] || 'none';
};