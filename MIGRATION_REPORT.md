# Report di Migrazione Database Supabase

## Task 1: Aggiornamento Credenziali (COMPLETATO)
Le credenziali del progetto sono state aggiornate tramite il gestore dei secrets per puntare al nuovo ambiente di sviluppo:
- **Nuovo URL:** `https://nhrhjdjfjrsghqmwoewn.supabase.co`
- **Nuova Anon Key:** `sb_publishable_xMPmTmx8ME4afkWz4vvEbA_a9xC2j_x`

Il client Supabase in `src/lib/customSupabaseClient.js` utilizzerà automaticamente queste nuove variabili d'ambiente.

## Task 2-8: Note sulla Migrazione Dati e Schema
*Nota di sistema: L'ambiente di esecuzione attuale è un ambiente frontend isolato. Non è possibile eseguire script diretti di copia dati (ETL) tra due istanze database remote separate direttamente da questo workspace.*

Per completare fisicamente i Task 2-8, è necessario eseguire i seguenti comandi tramite la CLI ufficiale di Supabase dal proprio terminale locale:

### 1. Esportazione Schema (Task 2)