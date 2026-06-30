# ANALISI STRUTTURA TABELLA - PROPERTIES

TABELLA: properties (Immobili)

Campo 1: id
- Tipo: uuid
- Nullable: NO
- Default: NESSUNO (generato automaticamente)
- Foreign Key: NO
- Descrizione: Identificatore univoco del record

Campo 2: codice
- Tipo: text
- Nullable: NO
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Codice identificativo della proprietà

Campo 3: categoria
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Categoria della proprietà (es. residenziale, commerciale)

Campo 4: tipologia
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Tipologia specifica (es. appartamento, villa, negozio)

Campo 5: agente_id
- Tipo: uuid
- Nullable: SI
- Default: NESSUNO
- Foreign Key: SI - agents(id)
- Descrizione: Riferimento all'agente responsabile

Campo 6: citta
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Città della proprietà

Campo 7: indirizzo
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Indirizzo completo

Campo 8: lat
- Tipo: numeric
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Latitudine per geolocalizzazione

Campo 9: lng
- Tipo: numeric
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Longitudine per geolocalizzazione

Campo 10: zona
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Zona geografica

Campo 11: regione
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Regione

Campo 12: prezzo
- Tipo: numeric
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Prezzo della proprietà

Campo 13: created_at
- Tipo: timestamp with time zone
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Data di creazione del record

Campo 14: mq
- Tipo: integer
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Metratura in metri quadri

Campo 15: locali
- Tipo: integer
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Numero di locali/stanze

Campo 16: bagni
- Tipo: integer
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Numero di bagni

Campo 17: caratteristiche
- Tipo: text[] (array di testo)
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Array di caratteristiche della proprietà (es. balcone, giardino, ascensore)

Campo 18: nome_proprietario
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Nome del proprietario

Campo 19: cognome_proprietario
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Cognome del proprietario

Campo 20: telefono_proprietario
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Numero di telefono del proprietario

Campo 21: email_proprietario
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Email del proprietario

Campo 22: note
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Note aggiuntive sulla proprietà

Campo 23: scadenza_mandato
- Tipo: date
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Data di scadenza del mandato di vendita/affitto

Campo 24: data_richiamo
- Tipo: date
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Data prevista per il prossimo richiamo/follow-up

Campo 25: stato
- Tipo: text
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Stato della proprietà (es. disponibile, venduta, affittata)

Campo 26: numero
- Tipo: integer
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Numero civico

Campo 27: is_master_record
- Tipo: boolean
- Nullable: SI
- Default: NESSUNO
- Foreign Key: NO
- Descrizione: Flag per identificare il record master in caso di duplicati

CAMPI SPECIALI:
- NESSUN campo "allegati" diretto nella tabella properties
- Gli allegati sono gestiti tramite la tabella "documents" con relazione tramite record_id e table_name='properties'
- La tabella properties supporta le seguenti operazioni RLS (Row Level Security):
  * SELECT: Tutti gli utenti autenticati
  * INSERT: Tutti gli utenti autenticati
  * UPDATE: Agente proprietario o admin/super_admin
  * DELETE: Agente proprietario o admin/super_admin

RELAZIONI:
- Foreign Key: agente_id → agents(id)
- Relazione inversa: documents (tramite record_id quando table_name='properties')
- Relazione inversa: appointments (tramite related_record_id quando related_table='properties')

INDICI E PERFORMANCE:
- Primary Key: id
- Colonne indicizzate: agente_id (per query filtrate per agente)
- Colonne geospaziali: lat, lng (per query geografiche)