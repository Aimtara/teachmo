import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Plus, X } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase } from '@/components/shared/SupabaseProvider';
import BookingModal from './BookingModal';

export default function OfficeHours({ userRole = 'parent' }) {
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const { supabase, isConfigured } = useSupabase();

  useEffect(() => {
    if (isConfigured && supabase) {
      loadOfficeHours();
    }
  }, [isConfigured, supabase, selectedWeek]);

  const loadOfficeHours = async () => {
    if (!supabase) return;

    try {
      setIsLoading(true);
      
      // Get the week's date range
      const weekStart = selectedWeek;
      const weekEnd = addDays(weekStart, 6);

      // Load available slots for the week
      const { data: slotsData, error: slotsError } = await supabase
        .from('office_hours_slots')
        .select('*')
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time');

      if (slotsError) throw slotsError;

      // Load bookings for the week
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('office_hour_bookings')
        .select(`
          *,
          office_hours_slots (
            start_time,
            end_time,
            title
          )
        `)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      if (bookingsError) throw bookingsError;

      setSlots(slotsData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Failed to load office hours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSlot = async (slot) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = async (bookingData) => {
    if (!supabase || !selectedSlot) return;

    try {
      const { data, error } = await supabase
        .from('office_hour_bookings')
        .insert({
          slot_id: selectedSlot.id,
          user_id: bookingData.userId,
          notes: bookingData.notes,
          status: 'confirmed'
        });

      if (error) throw error;

      setShowBookingModal(false);
      setSelectedSlot(null);
      await loadOfficeHours();
    } catch (error) {
      console.error('Failed to book slot:', error);
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(selectedWeek, i));
    }
    return days;
  };

  const getSlotsForDay = (day) => {
    return slots.filter(slot => 
      isSameDay(new Date(slot.start_time), day)
    );
  };

  const getBookingForSlot = (slotId) => {
    return bookings.find(booking => booking.slot_id === slotId);
  };

  const navigateWeek = (direction) => {
    setSelectedWeek(prev => addDays(prev, direction * 7));
  };

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Office Hours requires Supabase configuration.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Office Hours
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateWeek(-1)}
              >
                ← Previous
              </Button>
              <span className="font-medium">
                {format(selectedWeek, 'MMM d')} - {format(addDays(selectedWeek, 6), 'MMM d, yyyy')}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateWeek(1)}
              >
                Next →
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Week View */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {getWeekDays().map((day, index) => {
          const daySlots = getSlotsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card key={index} className={isToday ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-center">
                  {format(day, 'EEE')}
                  <div className="text-lg font-bold">{format(day, 'd')}</div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatePresence>
                  {daySlots.map(slot => {
                    const booking = getBookingForSlot(slot.id);
                    const isBooked = !!booking;

                    return (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`
                          p-2 rounded-lg border text-xs
                          ${isBooked 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-green-50 border-green-200 cursor-pointer hover:bg-green-100'
                          }
                        `}
                        onClick={() => !isBooked && handleBookSlot(slot)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {format(new Date(slot.start_time), 'h:mm a')}
                          </span>
                          {isBooked ? (
                            <Badge variant="destructive" className="text-xs">
                              Booked
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Available
                            </Badge>
                          )}
                        </div>
                        <div className="text-gray-600">
                          {slot.title || 'Office Hours'}
                        </div>
                        {isBooked && booking.user_id && (
                          <div className="flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            <span className="truncate">Booked</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {daySlots.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-xs">
                    No slots available
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          onConfirm={handleConfirmBooking}
          onCancel={() => {
            setShowBookingModal(false);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}