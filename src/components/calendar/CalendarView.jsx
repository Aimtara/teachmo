
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, getDay, startOfDay, endOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Droppable } from '@hello-pangea/dnd';

const DayCell = ({ day, monthStart, onDayClick, children: dayChildren }) => {
    const dateStr = day.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    return (
        <Droppable droppableId={`calendar-${dateStr}`} type="ITEM">
            {(provided, snapshot) => (
                <motion.div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                    }}
                    className={`border-r border-b p-2 min-h-[120px] relative ${
                        !isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    } ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''} ${
                        snapshot.isDraggedOver ? 'bg-green-100 border-green-300' : ''
                    }`}
                >
                    <div 
                        className={`font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : ''} ${onDayClick ? 'cursor-pointer hover:text-blue-700' : ''}`}
                        onClick={onDayClick ? () => onDayClick(day) : undefined}
                    >
                        {format(day, "d")}
                    </div>
                    <div className="mt-1 space-y-1">
                        {dayChildren}
                    </div>
                    {provided.placeholder}
                </motion.div>
            )}
        </Droppable>
    );
};

const CalendarView = ({ currentDate, events, onEventClick, isLoading, view, onDayClick, childrenData }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        if (view === 'week') {
            const timerId = setInterval(() => setNow(new Date()), 60000);
            return () => clearInterval(timerId);
        }
    }, [view]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
        days.push(day);
        day = addDays(day, 1);
    }
    
    const getEventsForDay = (day) => {
        return events
          .filter(event => {
            if (!event || !event.start_time) return false;
            const start = new Date(event.start_time);
            if (isNaN(start.getTime())) return false;

            if (event.all_day) return isSameDay(start, day);
            
            if (!event.end_time) return false;
            const end = new Date(event.end_time);
            if(isNaN(end.getTime())) return false;

            return start <= endOfDay(day) && end >= startOfDay(day);
          })
          .sort((a,b) => {
            const dateA = new Date(a.start_time);
            const dateB = new Date(b.start_time);
            if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA - dateB;
          });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
        );
    }
    
    if (view === 'week') {
      const weekDays = Array.from({length: 7}, (_, i) => addDays(startOfWeek(currentDate), i));
      const timeSlots = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      
      const today = new Date();
      const isCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }).getTime() === startOfWeek(currentDate, { weekStartsOn: 0 }).getTime();

      return (
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl overflow-hidden relative">
          <div className="grid grid-cols-8 text-center sticky top-0 bg-white z-10">
            <div className="w-14"></div>
            {weekDays.map(d => (
              <div key={d.toString()} className="py-2 border-l">
                <div className={`text-sm ${isSameDay(d, new Date()) ? 'text-blue-600' : ''}`}>{format(d, 'ccc')}</div>
                <div className={`text-lg font-bold ${isSameDay(d, new Date()) ? 'text-blue-600' : ''}`}>{format(d, 'd')}</div>
              </div>
            ))}
          </div>

          <div className="flex h-[1200px] overflow-y-auto">
            <div className="w-14 text-xs text-gray-500">
              {timeSlots.map(time => (
                <div key={time} className="h-12 text-right pr-2 border-t -mt-px">{time}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-1 relative">
              {timeSlots.map((_, i) => (
                <div key={i} className="col-span-7 h-12 border-t"></div>
              ))}
              {Array.from({length: 6}).map((_, i) => (
                <div key={i} className={`row-start-1 row-span-24 h-full border-l col-start-${i + 2}`}></div>
              ))}
              
              {isCurrentWeek && (
                  <div
                      className="absolute w-full h-0.5 bg-red-500 z-20 flex items-center"
                      style={{ top: `${(now.getHours() + now.getMinutes() / 60) * 48}px` }}
                  >
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                  </div>
              )}

              {events.map(event => {
                if (!event || !event.start_time || !event.end_time) return null;
                const eventStart = new Date(event.start_time);
                const eventEnd = new Date(event.end_time);
                if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) return null;

                const startDayIndex = getDay(eventStart);
                const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;
                const duration = endHour - startHour;

                const weekStart = startOfWeek(currentDate);
                const weekEnd = addDays(weekStart, 6);

                const isEventInCurrentWeek = 
                    (eventStart <= endOfDay(weekEnd) && eventEnd >= startOfDay(weekStart));

                if (!isEventInCurrentWeek || event.all_day) {
                    return null;
                }

                const currentWeekStartDay = getDay(weekStart);
                const dayOffset = (startDayIndex - currentWeekStartDay + 7) % 7;

                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="absolute p-1 rounded text-xs cursor-pointer text-white truncate"
                    style={{
                      backgroundColor: event.color || 'var(--teachmo-blue)',
                      top: `${startHour * 48}px`,
                      height: `${duration * 48}px`,
                      left: `${(dayOffset / 7) * 100}%`,
                      width: `${(1/7) * 100}%`
                    }}
                  >
                    {format(eventStart, 'p')} {event.title}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    
    return (
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl overflow-hidden flex-1">
            <div className="grid grid-cols-7 text-center font-medium text-gray-600 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3">{day}</div>
                ))}
            </div>
            <motion.div 
                className="grid grid-cols-7 grid-rows-6"
                variants={{ visible: { transition: { staggerChildren: 0.02 } } }}
                initial="hidden"
                animate="visible"
            >
                {days.map((day) => (
                    <DayCell key={day.toString()} day={day} monthStart={monthStart} onDayClick={onDayClick}>
                        {getEventsForDay(day).slice(0, 3).map(event => {
                             // Ensure childrenData is an array before calling find
                             const eventChild = Array.isArray(childrenData) ? childrenData.find(c => c.id === event.child_id) : undefined;
                             return (
                                <div 
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className="p-1 rounded text-xs cursor-pointer text-white truncate flex items-center gap-1"
                                    style={{ backgroundColor: event.color || 'var(--teachmo-blue)'}}
                                >
                                    {eventChild && <div className="w-3 h-3 rounded-full bg-white/50 flex-shrink-0"></div>}
                                    <span className="truncate">{event.all_day ? '' : (event.start_time && format(new Date(event.start_time), 'p'))} {event.title}</span>
                                </div>
                             )
                        })}
                         {getEventsForDay(day).length > 3 && (
                            <div className="text-xs text-gray-500 mt-1">
                                + {getEventsForDay(day).length - 3} more
                            </div>
                        )}
                    </DayCell>
                ))}
            </motion.div>
        </div>
    );
};

export default CalendarView;
