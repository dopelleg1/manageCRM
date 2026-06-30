# Analisi Flusso Inserimento: Potenziali Acq/Vend

## 1. Analisi Form (`CreatePotentialModal.jsx`)

Il componente `CreatePotentialModal.jsx` è utilizzato principalmente per la **conversione** di un contatto Telemarketing in una "Potenziale Attività" (Acquirente o Venditore) o "Potenziale Tabaccheria".

### Campi Identificati
| Campo | Tipo | Richiesto | Note |
|---|---|---|---|
| **Tipo Potenziale** | Select | Sì | Determina la tabella di destinazione (`potential_activities` o `potential_tobacconists`) |
| **Tipologia** | Select | Sì (Se Attività) | `venditore` o `acquirente` |
| **ID Numerico** | Input | **No** (Mancante) | Richiesto dall'utente, attualmente non presente nel form originale. |
| **Agente** | Select | Sì | ID dell'agente a cui assegnare il record |
| **Titolo Appunt.** | Input | No | Precompilato |
| **Data Inizio/Fine** | Date | Sì | Per l'appuntamento |
| **Note** | Textarea | No | Ereditate dal contatto |

### Validazione Corrente
- Verifica presenza `agentId`.
- Verifica presenza date appuntamento (`appointmentStart`, `appointmentEnd`).
- Se mancano, blocca il salvataggio e mostra un Toast di errore.

## 2. Tracciamento Flusso di Salvataggio (Save Flow)

1.  **Evento Click**: L'utente clicca su "Crea e Fissa Appuntamento".
2.  **Validazione**: Controllo campi obbligatori (Agente, Date).
3.  **Costruzione Oggetto `potentialData`**:
    - Mappatura campi dal contatto Telemarketing (Nome, Cognome, Indirizzo, ecc.).
    - Aggiunta metadati (Agente, Note, Data Richiamo, Tipo).
    - **Mancanza:** Il campo `numero` (ID Numerico) non veniva gestito.
4.  **Database Insert (Step 1)**:
    - Query su `potential_activities` (o `potential_tobacconists`).
    - `insert(potentialData).select().single()`.
5.  **Aggiornamento Context**: `addRecord` aggiunge il nuovo record allo stato locale.
6.  **Database Insert (Step 2)**:
    - Creazione record in `appointments` collegato al nuovo potenziale.
7.  **Database Update (Step 3)**:
    - Aggiornamento stato contatto in `telemarketing_contacts` a "Assegnato".
8.  **Feedback**: Toast di successo e chiusura modale.

## 3. Test Inserimento (Dati Campione)

Con le modifiche applicate, ecco come viene trattato il record richiesto:

**Input Dati:**
- **ID Numerico:** 12345
- **Tipologia:** Venditore
- **Nome:** lillo
- **Cognome:** pippo
- **Agente:** TEST (UUID Agente)
- **Stato:** ATTIVO
- **Telefono:** 5555

**Destinazione Database:**
Tabella: `public.potential_activities`

**Struttura Record Risultante:**