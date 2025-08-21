import React from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isSameDay } from 'date-fns';
import { Loader2, Calendar as CalendarIcon, Sun, Sparkles, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const getEventIcon = (type) => {
  switch (type) {
    case 'suggested_activity': return <Sparkles className="w-4 h-4 text-green-500" />;
    case 'local_event': return <MapPin className="w-4 h-4 text-red-500" />;
    default: return <CalendarIcon className="w-4 h-4 text-blue-500" />;
  }
};

const AgendaItem = ({ event, onEventClick }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex items-start gap-4 cursor-pointer group"
    onClick={() => onEventClick(event)}
  >
    <div className="w-20 text-right shrink-0 pt-1">
      <p className="font-semibold text-sm text-gray-800">
        {event.all_day ? 'All Day' : format(new Date(event.start_time), 'h:mm a')}
      </p>
    </div>
    <div className="relative w-full">
      <div className="absolute top-3 left-[-25px] w-4 h-4 rounded-full bg-white border-2 group-hover:scale-110 transition-transform" style={{ borderColor: event.color || 'var(--teachmo-blue)' }}></div>
      <div className="ml-4 border-l-2 pl-6 pb-6" style={{ borderColor: event.color || 'var(--teachmo-blue)' }}>
        <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{event.title}</p>
        <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {getEventIcon(event.type)}
          <Badge variant="outline" className="capitalize text-xs">{event.type.replace(/_/g, ' ')}</Badge>
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              <span>{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </motion.div>
);

const DailyAgendaView = ({ currentDate, events, onEventClick, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const dayEvents = events
    .filter(event => {
      if (!event || !event.start_time) return false;
      const eventDate = new Date(event.start_time);
      if (isNaN(eventDate.getTime())) return false;
      return isSameDay(eventDate, currentDate);
    })
    .sort((a, b) => {
        if (a.all_day && !b.all_day) return -1;
        if (!a.all_day && b.all_day) return 1;
        return new Date(a.start_time) - new Date(b.start_time)
    });
    
  const allDayEvents = dayEvents.filter(e => e.all_day);
  const timedEvents = dayEvents.filter(e => !e.all_day);

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-xl">
          {format(currentDate, 'eeee, MMMM d')}
          {isToday(currentDate) && <Badge className="ml-3">Today</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dayEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No events scheduled.</h3>
            <p className="text-gray-500">A perfect day to discover a new activity!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allDayEvents.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-600 uppercase text-sm mb-2 flex items-center gap-2 pl-24"><Sun className="w-4 h-4"/>All-Day Events</h3>
                <div className="relative">
                  {allDayEvents.map(event => <AgendaItem key={event.id} event={event} onEventClick={onEventClick} />)}
                </div>
              </div>
            )}
            {timedEvents.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-600 uppercase text-sm my-4 flex items-center gap-2 pl-24"><Clock className="w-4 h-4"/>Timeline</h3>
                <div className="relative">
                  {timedEvents.map(event => <AgendaItem key={event.id} event={event} onEventClick={onEventClick} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyAgendaView;