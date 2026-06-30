ANALISI COMPLETA CAMPI ALLEGATI/UPLOAD - DATABASE SUPABASE

TABELLE CON CAMPI ALLEGATI/UPLOAD:

1. TABELLA: documents
   - Campo: file_name
   - Tipo dato: character varying
   - Collegato a Storage: NO (Contiene solo il nome logico del file)
   - Record con dati: Variabile (dipende dall'utilizzo attivo)
   - Usato: SI
   - Note: Gestito attivamente dal componente DocumentManager.jsx

2. TABELLA: documents
   - Campo: file_path
   - Tipo dato: character varying
   - Collegato a Storage: SI (Punta direttamente ai file nel bucket 'documents')
   - Record con dati: Variabile
   - Usato: SI
   - Note: Fondamentale per il download e l'eliminazione dei file dallo storage Supabase.

3. TABELLA: documents
   - Campo: file_type
   - Tipo dato: character varying
   - Collegato a Storage: NO (Metadato MIME type)
   - Record con dati: Variabile
   - Usato: SI
   - Note: Usato per identificare il tipo di file allegato.

4. TABELLA: documents
   - Campo: file_size
   - Tipo dato: bigint
   - Collegato a Storage: NO (Metadato dimensione in byte)
   - Record con dati: Variabile
   - Usato: SI
   - Note: Salvato in fase di caricamento dal frontend.

5. TABELLA: commercial_activities
   - Campo: allegati_urls
   - Tipo dato: text
   - Collegato a Storage: In teoria SI (progettato originariamente per URL/paths)
   - Record con dati: Probabilmente 0 o solo record legacy
   - Usato: NO
   - Note: Campo obsoleto (Legacy). Attualmente l'applicazione usa la tabella relazionale 'documents' per gestire gli allegati delle attività commerciali. Non vi è traccia di utilizzo di questo campo nel codice React attuale.

6. TABELLA: potential_activities
   - Campo: allegati
   - Tipo dato: text
   - Collegato a Storage: In teoria SI
   - Record con dati: Probabilmente 0 o solo record legacy
   - Usato: NO
   - Note: Campo obsoleto (Legacy). Come per le attività commerciali, gli allegati vengono salvati nella tabella 'documents' referenziando l'ID del record.

7. TABELLA: potential_tobacconists
   - Campo: allegati
   - Tipo dato: text
   - Collegato a Storage: In teoria SI
   - Record con dati: Probabilmente 0 o solo record legacy
   - Usato: NO
   - Note: Campo obsoleto (Legacy). Gestito anch'esso centralmente tramite la tabella 'documents' e il DocumentManager.

8. TABELLA: backups
   - Campo: storage_path
   - Tipo dato: text
   - Collegato a Storage: SI (Punta ai file di dump del database nel bucket di sistema)
   - Record con dati: Variabile (dipende dallo storico backup)
   - Usato: SI
   - Note: Utilizzato dai moduli e script di backup per localizzare gli archivi .sql/.json su Supabase Storage per eventuale ripristino.

RIEPILOGO:
- Totale tabelle con campi allegati: 5 (documents, commercial_activities, potential_activities, potential_tobacconists, backups)
- Totale campi allegati trovati: 8
- Campi effettivamente usati: 5 (Tutti i campi di 'documents' + 'storage_path' in 'backups')
- Campi mai usati: 3 (Campi 'allegati' e 'allegati_urls' sparsi nelle tabelle entità, ormai superati dall'architettura relazionale di DocumentManager)

OSSERVAZIONI SULL'ARCHITETTURA:
Il sistema è già stato migrato verso un approccio "polimorfico" centralizzato. Tutti gli upload effettuati tramite l'interfaccia (es. RecordDetailModal) utilizzano il componente `DocumentManager.jsx`, che salva i file fisici nel bucket `documents` di Supabase Storage e registra i metadati esclusivamente nella tabella `documents`, associandoli al record madre tramite `record_id` e `table_name`. I vecchi campi diretti all'interno delle tabelle specifiche sono di fatto "codice morto" a livello di database.