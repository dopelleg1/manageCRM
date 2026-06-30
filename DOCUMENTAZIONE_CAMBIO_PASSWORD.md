# Documentazione Tecnica: Gestione Password Utenti

## 1. Strategia di Aggiornamento Password

In seguito all'analisi delle funzionalità esistenti e per ottimizzare la manutenibilità del codice, il sistema di cambio password è stato unificato utilizzando l'Edge Function `create-user`.

### Implementazione Corrente
Il componente `ChangePasswordModal.jsx` non utilizza più una funzione dedicata (`admin-change-password`) ma sfrutta la logica idempotente della funzione di creazione utenti.

**Flusso:**
1. L'admin compila il form di cambio password.
2. Il frontend invoca: