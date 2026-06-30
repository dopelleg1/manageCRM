import React, { useMemo, useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import it from 'date-fns/locale/it';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const locales = {
  'it': it,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const CustomCalendar = ({ onEventClick }) => {
  const { 
    activities, 
    properties, 
    potentialTobacconists, 
    potentialActivities, 
    telemarketing, 
    appointments, 
    agents 
  } = useData();
  const { user, userRole } = useAuth();
  const [view, setView] = useState('agenti');

  const agentMap = useMemo(() => {
    return agents.reduce((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {});
  }, [agents]);

  const events = useMemo(() => {
    let allEvents = [];
    const getRole = (id) => agentMap[id]?.role;

    // IMMOBILI
    properties.forEach(prop => {
      const agent = agentMap[prop.agente_id];
      const resource = { ...prop, recordType: 'Immobile' };
      if (prop.scadenza_mandato) {
        allEvents.push({
          title: `Scad. Mandato: ${agent?.name || 'N/A'}`,
          start: new Date(prop.scadenza_mandato),
          end: new Date(prop.scadenza_mandato),
          allDay: true,
          resource,
          color: '#f6ad55',
          agente_id: prop.agente_id,
          role: getRole(prop.agente_id)
        });
      }
      if (prop.data_richiamo) {
        allEvents.push({
          title: `Richiamo Immobile: ${agent?.name || 'N/A'}`,
          start: new Date(prop.data_richiamo),
          end: new Date(prop.data_richiamo),
          allDay: true,
          resource,
          color: '#48bb78',
          agente_id: prop.agente_id,
          role: getRole(prop.agente_id)
        });
      }
    });

    // ATTIVITA COMMERCIALI
    activities.forEach(activity => {
      const agent = agentMap[activity.agente_id];
      const resource = { ...activity, recordType: 'Attività Commerciale' };
      if (activity.scadenza_mandato) {
        allEvents.push({
          title: `Scad. Mandato: ${agent?.name || 'N/A'}`,
          start: new Date(activity.scadenza_mandato),
          end: new Date(activity.scadenza_mandato),
          allDay: true,
          resource,
          color: '#f6ad55',
          agente_id: activity.agente_id,
          role: getRole(activity.agente_id)
        });
      }
      if (activity.data_richiamo) {
        allEvents.push({
          title: `Richiamo Attività: ${agent?.name || 'N/A'}`,
          start: new Date(activity.data_richiamo),
          end: new Date(activity.data_richiamo),
          allDay: true,
          resource,
          color: '#48bb78',
          agente_id: activity.agente_id,
          role: getRole(activity.agente_id)
        });
      }
    });

    // POTENZIALI TABACCHERIE
    potentialTobacconists.forEach(pt => {
      const agent = agentMap[pt.agente_id];
      const resource = { ...pt, recordType: 'Potenziale Tabaccheria' };
      if (pt.data_presa_in_carico) {
        allEvents.push({
          title: `Presa Carico: ${agent?.name || 'N/A'}`,
          start: new Date(pt.data_presa_in_carico),
          end: new Date(pt.data_presa_in_carico),
          allDay: true,
          resource,
          color: '#4299e1',
          agente_id: pt.agente_id,
          role: getRole(pt.agente_id)
        });
      }
      if (pt.data_ultimo_richiamo) {
        allEvents.push({
          title: `Richiamo Tabaccheria: ${agent?.name || 'N/A'}`,
          start: new Date(pt.data_ultimo_richiamo),
          end: new Date(pt.data_ultimo_richiamo),
          allDay: true,
          resource,
          color: '#48bb78',
          agente_id: pt.agente_id,
          role: getRole(pt.agente_id)
        });
      }
    });

    // POTENZIALI ATTIVITA
    potentialActivities.forEach(pa => {
      const agent = agentMap[pa.agente_id];
      // CRITICAL FIX: Ensure recordType matches what RecordDetailModal expects ('Potenziale Acquirente/Venditore')
      const resource = { ...pa, recordType: 'Potenziale Acquirente/Venditore' };
      if (pa.data_richiamo) {
        allEvents.push({
          title: `Richiamo Potenziale: ${agent?.name || 'N/A'}`,
          start: new Date(pa.data_richiamo),
          end: new Date(pa.data_richiamo),
          allDay: true,
          resource,
          color: '#48bb78',
          agente_id: pa.agente_id,
          role: getRole(pa.agente_id)
        });
      }
    });

    // TELEMARKETING
    telemarketing.forEach(tm => {
        const resource = { ...tm, recordType: 'Telemarketing' };
        if (tm.data_ultimo_richiamo) {
            allEvents.push({
                title: `Richiamo TMK: ${tm.nome_azienda || tm.nome}`,
                start: new Date(tm.data_ultimo_richiamo),
                end: new Date(tm.data_ultimo_richiamo),
                allDay: true,
                resource,
                color: '#ed8936', // Arancione scuro
                agente_id: null, 
                role: 'telemarketing'
            });
        }
    });

    // APPUNTAMENTI
    appointments.forEach(appointment => {
      const agent = agentMap[appointment.agente_id];
      const resource = { ...appointment, recordType: 'Appuntamento' };
      allEvents.push({
        title: appointment.title,
        start: new Date(appointment.start_time),
        end: new Date(appointment.end_time),
        allDay: false,
        resource,
        color: '#a0aec0',
        agente_id: appointment.agente_id,
        role: getRole(appointment.agente_id)
      });
    });

    // FILTERING LOGIC
    if (['admin', 'super_admin'].includes(userRole)) {
        if (view === 'telemarketing') {
            return allEvents.filter(e => e.role === 'telemarketing');
        }
        // Admin and Super Admin see all agents, admins, super admins, and general appointments
        return allEvents.filter(e => 
            e.role === 'agente' || 
            e.role === 'admin' || 
            e.role === 'super_admin' || 
            e.recordType === 'Appuntamento'
        );
    } else if (userRole === 'agente') {
        return allEvents.filter(e => e.agente_id === user.id && (e.role === 'agente' || e.role === 'admin' || e.role === 'super_admin'));
    } else if (userRole === 'telemarketing') {
        // A telemarketer user should only see telemarketing events
        return allEvents.filter(e => e.role === 'telemarketing');
    }

    return [];
  }, [activities, properties, potentialTobacconists, potentialActivities, telemarketing, appointments, agentMap, user, userRole, view]);

  const eventStyleGetter = (event) => {
    let backgroundColor = event.color;
    // For agent-related events, use their specific color
    if (event.agente_id && agentMap[event.agente_id] && event.role !== 'telemarketing') {
      backgroundColor = agentMap[event.agente_id].color;
    }
    
    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
    };
    return {
      style: style,
    };
  };

  const handleSelectEvent = (event) => {
    if (onEventClick) {
      onEventClick(event.resource);
    }
  };

  return (
    <div className="h-[75vh] bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col">
      {['admin', 'super_admin'].includes(userRole) && (
        <div className="mb-4 flex justify-center">
          <Tabs value={view} onValueChange={setView} className="w-auto">
            <TabsList>
              <TabsTrigger value="agenti">Agenti</TabsTrigger>
              <TabsTrigger value="telemarketing">Telemarketing</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      <div className="flex-grow">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          messages={{
            next: "Successivo",
            previous: "Precedente",
            today: "Oggi",
            month: "Mese",
            week: "Settimana",
            day: "Giorno",
            agenda: "Agenda",
            date: "Data",
            time: "Ora",
            event: "Evento",
            noEventsInRange: "Nessun evento in questo intervallo.",
            showMore: total => `+${total} più`,
          }}
          culture="it"
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
        />
      </div>
    </div>
  );
};

export default CustomCalendar;