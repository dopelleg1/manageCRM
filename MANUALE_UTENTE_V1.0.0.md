# **Manuale Utente CRM Immobiliare - Versione 1.0.0**

---

## **1. Introduzione**

Benvenuto nel tuo nuovo CRM Immobiliare! 

Questo manuale ti guiderà attraverso le funzionalità principali della piattaforma, pensata per semplificare e potenziare la gestione dei tuoi contatti, immobili e appuntamenti. 

L'interfaccia è stata progettata per essere intuitiva e potente, consentendoti di accedere rapidamente a tutte le informazioni di cui hai bisogno.

---

## **2. Accesso alla Piattaforma**

Per accedere al CRM, visita l'indirizzo web fornito e inserisci le tue credenziali (email e password) nella pagina di login. 

Una volta autenticato, verrai indirizzato direttamente alla tua **Dashboard** personale.

---

## **3. Panoramica dell'Interfaccia**

L'interfaccia è divisa in due aree principali:

*   **Barra di Navigazione Sinistra**: Il tuo centro di comando. Da qui puoi accedere a tutte le sezioni principali del CRM.
*   **Area di Lavoro Principale**: Lo spazio centrale dove visualizzerai e interagirai con i dati (tabelle, mappe, calendario, ecc.).

### **Sezioni Principali**

*   **Dashboard**: La tua schermata iniziale. Offre una visione d'insieme delle attività recenti, statistiche chiave e scorciatoie utili.
*   **Calendario**: Visualizza, aggiungi e gestisci tutti i tuoi appuntamenti e quelli del tuo team. Puoi vedere gli impegni per giorno, settimana o mese.
*   **Mappa**: Una mappa interattiva che mostra la posizione geografica di tutti i tuoi immobili e attività commerciali. Un potente strumento visivo per analisi territoriali.
*   **Tabelle Dati**: Il cuore del CRM, dove sono gestiti tutti i tuoi dati. Le sezioni principali sono:
    *   **Immobili**
    *   **Attività Commerciali**
    *   **Potenziali Tabaccherie**
    *   **Potenziali Acquirenti/Venditori**
    *   **Telemarketing**
    *   **Agenti** (solo Amministratore)
    *   **Configurazione** (solo Amministratore)

---

## **4. Funzionalità Principali**

### **Gestione delle Tabelle Dati**

Tutte le sezioni dati (es. Immobili, Attività Commerciali) funzionano in modo simile.

1.  **Visualizzare i Dati**: Accedendo a una sezione, vedrai una tabella con tutti i record inseriti.
2.  **Filtrare e Cercare**: Usa la barra di ricerca in alto per filtrare istantaneamente i risultati in base a qualsiasi informazione (nome, città, codice, ecc.).
3.  **Aggiungere un Nuovo Record**: Clicca sul pulsante **"Aggiungi"** (es. "Nuova Attività") per aprire la finestra di inserimento dati.
4.  **Azioni sui Record**: Accanto a ogni riga della tabella, troverai un'icona con tre puntini (`...`). Cliccandola, aprirai un menu con le azioni disponibili:
    *   **Dettagli**: Apre una finestra per visualizzare tutte le informazioni del record e, se hai i permessi, per modificarle.
    *   **Elimina**: Rimuove permanentemente il record (ti verrà chiesta una conferma).
    *   **Modifica e Assegna** (solo Telemarketing): Apre la finestra per modificare i dati del contatto e assegnarlo a un agente.

### **Gestione dei Documenti**

Puoi allegare file (PDF, immagini, documenti) a qualsiasi record del CRM.

1.  Apri un record cliccando su **Dettagli** dal menu azioni (`...`).
2.  Passa alla modalità **Modifica** cliccando sull'apposito pulsante.
3.  Seleziona la scheda **"Documenti"**.
4.  Usa il pulsante **"Aggiungi un file"** per caricare uno o più documenti dal tuo computer. I file verranno salvati solo dopo aver cliccato sul pulsante **"Salva"** principale del record.
5.  Dalla stessa sezione puoi **scaricare** o **eliminare** i file già allegati.

*Nota*: La gestione documentale è disponibile solo dopo aver salvato un record per la prima volta (in fase di creazione) o in modalità modifica per i record esistenti.

### **Importazione ed Esportazione Dati (Azioni Tabella)**

In ogni tabella, il menu **"Azioni Tabella"** ti permette di eseguire operazioni di massa:

*   **Importa CSV**: Carica centinaia di record in pochi secondi partendo da un file CSV.
*   **Esporta CSV**: Scarica tutti i dati della tabella corrente in un file CSV.
*   **Geolocalizza Tutti**: Tenta di trovare e salvare le coordinate geografiche per tutti i record che hanno un indirizzo ma non ancora delle coordinate.
*   **Svuota Tabella** (solo Amministratore): Elimina tutti i record presenti in quella tabella.

---

## **5. Ruoli Utente e Permessi**

Il CRM è progettato per adattarsi a diversi ruoli aziendali. Ogni ruolo ha accesso a funzionalità specifiche per garantire sicurezza ed efficienza.

### **👤 Agente**

L'Agente è il cuore operativo del sistema. Può gestire il proprio portafoglio di contatti e immobili.

*   **Può Fare**:
    *   Visualizzare tutti i dati (Immobili, Attività, Potenziali, ecc.).
    *   Aggiungere nuovi record in tutte le tabelle.
    *   Modificare ed eliminare **solo i record che gli sono stati assegnati** o che ha creato lui stesso.
    *   Gestire i propri appuntamenti sul calendario.
    *   Utilizzare la mappa e le funzioni di import/export.

*   **Non Può Fare**:
    *   Modificare o eliminare i record di altri agenti.
    *   Accedere alle sezioni "Agenti" e "Configurazione".
    *   Svuotare le tabelle.

### **📞 Telemarketing**

L'operatore di Telemarketing si concentra sulla qualificazione di nuovi contatti.

*   **Può Fare**:
    *   Accedere e gestire la tabella **"Telemarketing"**.
    *   Aggiungere nuovi contatti di telemarketing.
    *   Modificare i contatti e **assegnarli a un agente** per il follow-up.
    *   Visualizzare (ma non modificare) i dati delle altre tabelle (Immobili, Attività, ecc.) per avere un contesto durante le chiamate.

*   **Non Può Fare**:
    *   Aggiungere o modificare record al di fuori della sezione Telemarketing.
    *   Eliminare record (se non nella tabella Telemarketing e con i permessi corretti).
    *   Accedere alle sezioni "Agenti" e "Configurazione".

### **👑 Amministratore (Admin)**

L'Amministratore ha il controllo totale sulla piattaforma, sul team e sui dati.

*   **Può Fare**:
    *   **Tutto quello che possono fare gli Agenti e gli operatori di Telemarketing.**
    *   Modificare ed eliminare **qualsiasi record** in qualsiasi tabella, indipendentemente da chi l'ha creato.
    *   Accedere alla sezione **"Agenti"** per aggiungere, modificare o eliminare utenti dal sistema.
    *   Accedere alla sezione **"Configurazione"** per gestire le impostazioni globali del CRM.
    *   Eseguire azioni critiche come **"Svuota Tabella"**.

L'Admin ha la responsabilità di supervisionare il corretto funzionamento del CRM e di gestire i permessi e l'accesso degli altri utenti.

---
**Fine del Manuale - v1.0.0**