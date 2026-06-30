/**
 * Task 2: Schema Migration Plan & SQL Generator
 * Provides the SQL script to recreate the schema in the new Supabase instance.
 */

export const generateSchemaMigrationSQL = () => {
  return `
-- Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
    id uuid NOT NULL PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    role text,
    color text,
    is_master_record boolean
);

-- Telemarketing Contacts
CREATE TABLE IF NOT EXISTS public.telemarketing_contacts (
    id uuid NOT NULL PRIMARY KEY,
    nome text,
    cognome text,
    nome_azienda text,
    categoria text,
    tipologia text,
    telefono text,
    email text,
    citta text,
    indirizzo text,
    lat numeric,
    lng numeric,
    regione text,
    data_ultimo_richiamo date,
    note text,
    agente_id uuid REFERENCES public.agents(id),
    created_at timestamp with time zone DEFAULT now(),
    stato text,
    anagrafica_type text,
    operatore_id uuid REFERENCES public.agents(id),
    is_master_record boolean,
    allegati_urls jsonb,
    phone_2 text
);

-- Potential Tobacconists
CREATE TABLE IF NOT EXISTS public.potential_tobacconists (
    id uuid NOT NULL PRIMARY KEY,
    nome text,
    cognome text,
    telefono text,
    email text,
    indirizzo text,
    lat numeric,
    lng numeric,
    citta text,
    zona text,
    regione text,
    agente_id uuid REFERENCES public.agents(id),
    categoria text,
    caratteristiche text,
    stato text,
    note text,
    data_ultimo_richiamo date,
    created_at timestamp with time zone DEFAULT now(),
    numero_rivendita integer,
    numero_ricevitoria text,
    tipo_rivendita text,
    distributore text,
    data_presa_in_carico date,
    is_master_record boolean,
    allegati_urls jsonb,
    phone_2 text
);

-- Super Admin Settings
CREATE TABLE IF NOT EXISTS public.super_admin_settings (
    id uuid NOT NULL PRIMARY KEY,
    setting_key text NOT NULL,
    setting_value jsonb,
    description text,
    updated_at timestamp with time zone,
    updated_by uuid REFERENCES public.agents(id)
);

-- Properties
CREATE TABLE IF NOT EXISTS public.properties (
    id uuid NOT NULL PRIMARY KEY,
    codice text NOT NULL,
    categoria text,
    tipologia text,
    agente_id uuid REFERENCES public.agents(id),
    citta text,
    indirizzo text,
    lat numeric,
    lng numeric,
    zona text,
    regione text,
    prezzo numeric,
    created_at timestamp with time zone DEFAULT now(),
    mq integer,
    locali integer,
    bagni integer,
    caratteristiche text[],
    nome_proprietario text,
    cognome_proprietario text,
    telefono_proprietario text,
    email_proprietario text,
    note text,
    scadenza_mandato date,
    data_richiamo date,
    stato text,
    numero integer,
    is_master_record boolean,
    allegati_urls jsonb,
    phone_2 text
);

-- Commercial Activities
CREATE TABLE IF NOT EXISTS public.commercial_activities (
    id uuid NOT NULL PRIMARY KEY,
    categoria text,
    agente_id uuid REFERENCES public.agents(id),
    citta text,
    indirizzo text,
    lat numeric,
    lng numeric,
    zona character varying,
    regione text,
    aggi numeric,
    ricavo numeric,
    prezzo numeric,
    mq integer,
    nome_proprietario text,
    cognome_proprietario text,
    telefono_proprietario text,
    email_proprietario text,
    note text,
    scadenza_mandato date,
    data_richiamo date,
    vetrina date,
    stato character varying,
    created_at timestamp with time zone DEFAULT now(),
    codice character varying,
    numero integer,
    allegati_urls jsonb,
    is_master_record boolean,
    phone_2 text
);

-- Potential Activities
CREATE TABLE IF NOT EXISTS public.potential_activities (
    id uuid NOT NULL PRIMARY KEY,
    type text NOT NULL,
    nome text,
    cognome text,
    telefono text,
    email text,
    indirizzo text,
    lat numeric,
    lng numeric,
    citta text,
    zona text,
    regione text,
    agente_id uuid REFERENCES public.agents(id),
    note text,
    data_richiamo date,
    created_at timestamp with time zone DEFAULT now(),
    budget numeric,
    locali integer,
    mq integer,
    bagni integer,
    aggi text,
    ricavo numeric,
    categoria text,
    caratteristiche text,
    stato_presa_in_carico text,
    numero integer,
    stato text,
    anagrafica_type text,
    locali_min integer,
    locali_max integer,
    mq_min integer,
    mq_max integer,
    bagni_status text,
    arredo text,
    stato_prima_visita text,
    stato_prima_visita_data date,
    is_master_record boolean,
    allegati_urls jsonb,
    phone_2 text
);

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid NOT NULL PRIMARY KEY,
    title text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    agente_id uuid REFERENCES public.agents(id),
    related_record_id uuid,
    related_table text,
    created_at timestamp with time zone DEFAULT now()
);

-- Configurations
CREATE TABLE IF NOT EXISTS public.configurations (
    id uuid NOT NULL PRIMARY KEY,
    type text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Password Change Log
CREATE TABLE IF NOT EXISTS public.password_change_log (
    id uuid NOT NULL PRIMARY KEY,
    changed_by_id uuid REFERENCES public.agents(id),
    user_id uuid NOT NULL,
    changed_at timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text
);

-- Documents
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid NOT NULL PRIMARY KEY,
    record_id uuid NOT NULL,
    table_name character varying NOT NULL,
    file_name character varying NOT NULL,
    file_path character varying NOT NULL,
    file_type character varying,
    file_size bigint,
    uploaded_by uuid REFERENCES public.agents(id),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Assignment Logs
CREATE TABLE IF NOT EXISTS public.assignment_logs (
    id uuid NOT NULL PRIMARY KEY,
    telemarketing_id uuid REFERENCES public.telemarketing_contacts(id),
    old_agent_id uuid REFERENCES public.agents(id),
    new_agent_id uuid REFERENCES public.agents(id),
    action text NOT NULL,
    performed_by uuid REFERENCES public.agents(id),
    performed_at timestamp with time zone DEFAULT now(),
    notes text
);

-- Duplicate Deletion Logs
CREATE TABLE IF NOT EXISTS public.duplicate_deletion_logs (
    id uuid NOT NULL PRIMARY KEY,
    table_name text NOT NULL,
    deleted_record_id uuid,
    master_record_id uuid,
    deleted_at timestamp with time zone DEFAULT now(),
    deleted_by uuid,
    notes text
);

-- Backups
CREATE TABLE IF NOT EXISTS public.backups (
    id uuid NOT NULL PRIMARY KEY,
    version text NOT NULL,
    type text NOT NULL,
    date timestamp with time zone,
    size bigint,
    status text,
    created_by uuid,
    storage_path text,
    is_master_record boolean,
    last_restored timestamp with time zone,
    restore_count integer,
    notes text
);

-- Enable RLS for all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemarketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE potential_tobacconists ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE potential_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_deletion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
  `;
};