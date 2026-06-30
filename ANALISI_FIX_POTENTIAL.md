# Analisi Fix: Inserimento e Aggiornamento Potenziali Attività

## Parte 1: Analisi Flusso INSERT (Attuale)
- **Stato Iniziale:** In `PotentialActivitiesPage.jsx`, la prop `onSave` passata al modale era una funzione "dummy": `async () => { await fetchAllData(); return {success:true}; }`.
- **Conseguenza:** Il modale simulava il salvataggio, chiudendosi e ricaricando i dati, ma **nessuna richiesta veniva inviata a Supabase**.
- **Gestione Errori:** Inesistente (poiché non c'era nessuna operazione reale).
- **Toast:** Non appariva nessun toast specifico di salvataggio (o appariva un generico successo fittizio).

## Parte 2: Analisi Flusso UPDATE (Attuale)
- **Stato Iniziale:** Stesso problema dell'INSERT. La funzione `onSave` non distingueva tra creazione o modifica e non eseguiva query `UPDATE`.
- **Conseguenza:** Le modifiche fatte nel form venivano perse alla chiusura del modale.

## Parte 3: Confronto con Attività Commerciali
| Feature | `ActivitiesPage.jsx` (Funzionante) | `PotentialActivitiesPage.jsx` (Rotto) |
| :--- | :--- | :--- |
| **Logica Save** | Implementa `handleSaveNew` e `handleSaveUpdate` con chiamate Supabase reali. | Implementa una funzione anonima vuota. |
| **Gestione File** | Gestisce upload su bucket `documents`. | Non gestisce upload. |
| **Feedback** | Toast specifici per successo/errore. | Nessun feedback reale. |

## Parte 4: Verifica RLS (Row Level Security)
Le policy su `potential_activities` sono corrette:
- **INSERT:** `true` (Tutti gli autenticati possono inserire).
- **UPDATE:** `(auth.role() = 'authenticated'::text) AND ((agente_id = auth.uid()) OR (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text])))`.
  - *Nota:* Un agente può aggiornare solo i record assegnati a se stesso.
- **SELECT:** `true` (Tutti gli autenticati possono leggere).

## Parte 5: Identificazione Blocco
Il "blocco" non era un errore di permessi o di database, ma la **mancanza totale di implementazione della logica di business** nel componente `PotentialActivitiesPage.jsx`.

## Parte 6: Soluzione Implementata
1.  **Nuove Funzioni:** Aggiunte `handleSaveNew` e `handleSaveUpdate` in `PotentialActivitiesPage.jsx`.
2.  **Integrazione Modale:** Collegato correttamente `RecordDetailModal` a queste funzioni.
3.  **Debug:** Aggiunti `console.log` dettagliati per tracciare il payload inviato e la risposta di Supabase.
4.  **Feedback Utente:** Implementati Toast di successo e di errore dettagliati.