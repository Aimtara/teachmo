import { useMemo, useState } from 'react';
import { Calendar, Clock, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  bookOfficeHoursSlot,
  cancelOfficeHoursBooking,
  createAvailabilityBlock,
  listOfficeHoursSlots,
} from '@/domains/officeHours';

const defaultTeacherId = 'teacher-demo';

export default function OfficeHours({ role = 'parent', teacherId = defaultTeacherId, requesterId = 'current-user' }) {
  const [slots, setSlots] = useState(() => listOfficeHoursSlots({ teacherId }));
  const [start, setStart] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const availableSlots = useMemo(() => slots.filter((slot) => slot.status === 'available'), [slots]);
  const bookedSlots = useMemo(() => slots.filter((slot) => slot.status === 'booked'), [slots]);

  const refresh = () => {
    setSlots(listOfficeHoursSlots({ teacherId }));
  };

  const handleCreateAvailability = (event) => {
    event.preventDefault();
    try {
      const startAt = new Date(start).toISOString();
      createAvailabilityBlock({ teacherId, startAt, durationMinutes: Number(durationMinutes), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      setMessage('Availability block created.');
      refresh();
    } catch (error) {
      setMessage(error?.message || 'Failed to create availability.');
    }
  };

  const handleBook = (event) => {
    event.preventDefault();
    try {
      bookOfficeHoursSlot({ slotId: selectedSlotId, requesterId, reason });
      setMessage('Office hours slot booked.');
      setReason('');
      setSelectedSlotId('');
      refresh();
    } catch (error) {
      setMessage(error?.message || 'Failed to book slot.');
    }
  };

  const handleCancel = (bookingId) => {
    try {
      cancelOfficeHoursBooking({ bookingId, actorId: requesterId });
      setMessage('Booking canceled.');
      refresh();
    } catch (error) {
      setMessage(error?.message || 'Failed to cancel booking.');
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <header className="text-center space-y-2">
          <Calendar className="w-12 h-12 mx-auto text-blue-500" />
          <p className="text-gray-900 font-medium">Office hours booking v0</p>
          <p className="text-sm text-gray-600">
            Timezone-safe pilot flow with conflict prevention, confirmation state, and cancel support.
          </p>
        </header>

        {message ? <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{message}</div> : null}

        {['teacher', 'admin', 'school_admin', 'district_admin', 'system_admin'].includes(role) ? (
          <form onSubmit={handleCreateAvailability} className="rounded border p-4 space-y-3">
            <h3 className="font-medium">Create availability</h3>
            <label className="block text-sm">
              Start time
              <input className="mt-1 w-full rounded border px-3 py-2" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label className="block text-sm">
              Duration
              <select className="mt-1 w-full rounded border px-3 py-2" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Add slot</button>
          </form>
        ) : null}

        <form onSubmit={handleBook} className="rounded border p-4 space-y-3">
          <h3 className="font-medium">Book a slot</h3>
          <label className="block text-sm">
            Available time
            <select className="mt-1 w-full rounded border px-3 py-2" value={selectedSlotId} onChange={(event) => setSelectedSlotId(event.target.value)} required>
              <option value="">Select a slot</option>
              {availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {new Date(slot.startAt).toLocaleString()} – {new Date(slot.endAt).toLocaleTimeString()}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Reason
            <textarea className="mt-1 w-full rounded border px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What would you like to discuss?" required />
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">Request booking</button>
        </form>

        <section className="space-y-2">
          <h3 className="font-medium">Confirmed bookings</h3>
          {bookedSlots.length === 0 ? <p className="text-sm text-gray-600">No confirmed bookings yet.</p> : null}
          {bookedSlots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between rounded border p-3 text-sm">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                {new Date(slot.startAt).toLocaleString()}
              </span>
              <button type="button" className="inline-flex items-center gap-1 text-red-700" onClick={() => handleCancel(slot.booking?.id)}>
                <Trash2 className="h-4 w-4" />
                Cancel
              </button>
            </div>
          ))}
        </section>
      </CardContent>
    </Card>
  );
}
