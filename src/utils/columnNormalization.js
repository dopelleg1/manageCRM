/**
 * Normalizes a column name for consistent matching.
 * - Converts to lowercase
 * - Removes accents (NFD normalization)
 * - Removes apostrophes (e.g., CITTA' -> CITTA)
 * - Replaces non-alphanumeric characters with spaces
 * - Trims and replaces multiple spaces with underscores
 * 
 * @param {string} name 
 * @returns {string} normalized name
 */
export const normalizeColumnName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/'/g, '') // Remove apostrophes (CITTA' -> CITTA)
    .replace(/[^a-z0-9\s]/g, ' ') // Replace other special chars with space
    .trim()
    .replace(/\s+/g, '_'); // Replace spaces with underscore
};

/**
 * Explicit mappings for Telemarketing Contacts table.
 * Key: Normalized CSV Header
 * Value: Database Field Key
 */
export const TELEMARKETING_CONTACTS_MAPPING = {
  // Variations for "Nome/Cognome"
  "contatto_azienda_persona_fisica": "cognome", 
  "contatto": "cognome",
  "nome_cognome": "cognome",
  
  // Variations for "Azienda"
  "azienda": "nome_azienda",
  "ragione_sociale": "nome_azienda",
  "nome_azienda": "nome_azienda",

  // Variations for "Telefono"
  "telefono": "telefono",
  "cellulare": "telefono",
  "tel": "telefono",

  // Variations for "Email"
  "mail": "email",
  "e_mail": "email",
  "email": "email",

  // Variations for "Città"
  "citta": "citta", // Handles CITTA' -> citta
  "comune": "citta",

  // Variations for "Indirizzo"
  "indirizzo": "indirizzo",
  "via": "indirizzo",

  // Variations for "Regione"
  "regione": "regione",

  // Variations for "Data Richiamo"
  "data_richiamo": "data_ultimo_richiamo", 
  "data_ultimo_richiamo": "data_ultimo_richiamo",
  "richiamo": "data_ultimo_richiamo",

  // Variations for "Note"
  "note": "note",
  "descrizione": "note",

  // Variations for "Operatore"
  "operatore": "operatore_id",
  "operatore_id": "operatore_id",
  
  // Variations for "Stato"
  "stato": "stato",
  "chamata": "stato", // As requested per user typo/column name
  "chiamata": "stato",
  
  // Other fields
  "categoria": "categoria",
  "tipologia": "tipologia",
  "cap": "ignore", // Usually part of address, explicitly ignore or could append
  "appuntamento": "ignore" // Explicitly ignore as per current requirements unless mapping to notes is requested
};

/**
 * Creates a matcher function that finds the best database field for a given CSV column name.
 * 
 * @param {Array<{key: string, label: string}>} dbFields - List of target database fields
 * @returns {function(string): string|null} Matcher function returning field key or null
 */
export const createColumnMatcher = (dbFields) => {
  // Pre-normalize db fields for performance
  const normalizedDbFields = dbFields.map(field => ({
    key: field.key,
    normalizedKey: normalizeColumnName(field.key),
    normalizedLabel: normalizeColumnName(field.label)
  }));

  return (csvColumnName) => {
    const normalizedCsv = normalizeColumnName(csvColumnName);
    if (!normalizedCsv) return null;

    // 1. Exact Match on Key or Label
    const exact = normalizedDbFields.find(f => 
      f.normalizedKey === normalizedCsv || 
      f.normalizedLabel === normalizedCsv
    );
    if (exact) return exact.key;

    // 2. Contains Match (Fuzzy)
    // High confidence if the CSV header contains the DB field or vice versa
    
    let bestMatch = null;
    let maxScore = 0;

    normalizedDbFields.forEach(f => {
      let score = 0;
      
      // Label matching is preferred (usually more descriptive)
      if (normalizedCsv.includes(f.normalizedLabel) || f.normalizedLabel.includes(normalizedCsv)) score += 3;
      
      // Key matching
      if (normalizedCsv.includes(f.normalizedKey) || f.normalizedKey.includes(normalizedCsv)) score += 2;

      // Penalties for very short matches to avoid false positives (e.g. 'id' matching 'inside')
      if (normalizedCsv.length < 3 || f.normalizedKey.length < 3) score -= 1;

      if (score > maxScore && score > 1) {
        maxScore = score;
        bestMatch = f.key;
      }
    });

    return bestMatch;
  };
};