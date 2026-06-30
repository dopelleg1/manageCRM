# Project Version Information

- **Version:** v2.0
- **Release Date:** 2026-02-02
- **Status:** STABILE - Funzionante

## Description
Versione stabile con sessionStorage, senza ricariche DB non necessarie, tutte le tabelle allineate, sistema di gestione dati ottimizzato. Questa versione include un sistema di caching locale per i form non salvati e una gestione migliorata delle entità.

## Key Features
- **Unsaved Data Management:** Implementazione del `useSessionStorage` hook per preservare i dati dei form tra le navigazioni senza scritture su DB.
- **Optimized Performance:** Rimozione dei refresh manuali e inutili ricaricamenti. I dati vengono caricati al mount e gestiti via stato locale/cache.
- **Enhanced UI/UX:** `RecordDetailModal` unificato per tutte le entità, feedback visivo immediato (toast notifications).
- **Calendar Integration:** Integrazione completa con il calendario appuntamenti.
- **Map Features:** Geocoding automatico e visualizzazione su mappa interattiva.
- **Import/Export:** Funzionalità complete di importazione CSV e esportazione dati.
- **Admin Dashboard:** Pannello di controllo avanzato con statistiche e gestione utenti.
- **Telemarketing System:** Modulo dedicato per la gestione lead e chiamate.

## Database Tables
Il sistema si basa sulle seguenti tabelle Supabase (PostgreSQL):
- `agents`
- `telemarketing_contacts`
- `potential_tobacconists`
- `properties`
- `potential_activities`
- `commercial_activities`
- `appointments`
- `configurations`
- `documents`
- `super_admin_settings`

## Last Tested
2026-02-02

## Recovery Instructions
In caso di problemi critici con aggiornamenti futuri:
1. Individuare la cartella `crm2.0/` nella root del progetto.
2. Copiare il contenuto di `crm2.0/src/` sovrascrivendo la cartella `src/` attuale.
3. Copiare i file di configurazione (`package.json`, `vite.config.js`, ecc.) dalla root di `crm2.0/` alla root del progetto.
4. Eseguire `npm install` per ripristinare le dipendenze della versione stabile.