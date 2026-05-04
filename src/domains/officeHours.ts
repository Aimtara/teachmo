export type OfficeHoursRole = 'teacher' | 'admin' | 'parent' | 'student';

export type AvailabilityBlock = {
  id: string;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  slots?: OfficeHoursSlot[];
};

export type OfficeHoursSlot = {
  id: string;
  blockId: string;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: 'open' | 'booked';
};

export type BookingRequest = {
  blockId: string;
  slotId?: string;
  requesterId: string;
  requesterRole: OfficeHoursRole;
  studentId?: string | null;
  note?: string | null;
  reason?: string | null;
};

export type OfficeHoursBooking = {
  id: string;
  blockId: string;
  teacherId: string;
  requesterId: string;
  requesterRole: OfficeHoursRole;
  studentId?: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: 'confirmed' | 'cancelled';
  auditEvent: string;
};

const officeHoursStore = {
  blocks: [] as AvailabilityBlock[],
  bookings: [] as OfficeHoursBooking[],
};

export function createAvailabilityBlock(
  input: Omit<AvailabilityBlock, 'id' | 'slots'> & { id?: string; slotMinutes?: number },
) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error('Availability block must use valid ISO timestamps.');
  }
  if (endsAt <= startsAt) {
    throw new Error('Availability block end must be after the start.');
  }

  const block = {
    ...input,
    id: input.id ?? `oh_${input.teacherId}_${startsAt.toISOString()}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    timezone: input.timezone || 'UTC',
  };

  const slotMinutes = input.slotMinutes && input.slotMinutes > 0 ? input.slotMinutes : Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));
  const slots: OfficeHoursSlot[] = [];
  for (let cursor = startsAt.getTime(), index = 0; cursor < endsAt.getTime(); cursor += slotMinutes * 60000, index += 1) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(Math.min(cursor + slotMinutes * 60000, endsAt.getTime()));
    slots.push({
      id: `${block.id}_slot_${index}`,
      blockId: block.id,
      teacherId: block.teacherId,
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
      timezone: block.timezone,
      status: 'open',
    });
  }

  const withSlots = { ...block, slots };
  officeHoursStore.blocks.push(withSlots);
  return withSlots;
}

export function bookOfficeHoursSlot(
  blocks: AvailabilityBlock[],
  bookings: OfficeHoursBooking[],
  request: BookingRequest,
) {
  const block = blocks.find((item) => item.id === request.blockId);
  if (!block) throw new Error('Selected office hours slot is no longer available.');
  if (!['parent', 'student', 'admin'].includes(request.requesterRole)) {
    throw new Error('Requester is not allowed to book office hours.');
  }

  const activeConflict = bookings.find(
    (booking) => booking.blockId === request.blockId && booking.status === 'confirmed',
  );
  if (activeConflict) throw new Error('Selected office hours slot is already booked.');

  const booking: OfficeHoursBooking = {
    id: `ohb_${request.blockId}_${request.requesterId}`,
    blockId: request.blockId,
    teacherId: block.teacherId,
    requesterId: request.requesterId,
    requesterRole: request.requesterRole,
    studentId: request.studentId ?? null,
    startsAt: block.startsAt,
    endsAt: block.endsAt,
    timezone: block.timezone,
    status: 'confirmed',
    auditEvent: 'office_hours.booking.confirmed',
  };

  return booking;
}

export function cancelOfficeHoursBooking(booking: OfficeHoursBooking, actorId: string) {
  return {
    ...booking,
    status: 'cancelled' as const,
    cancelledBy: actorId,
    auditEvent: 'office_hours.booking.cancelled',
  };
}

export function listOfficeHourSlots(teacherId: string) {
  const activeBookings = new Set(officeHoursStore.bookings.filter((booking) => booking.status === 'confirmed').map((booking) => booking.blockId));
  return officeHoursStore.blocks
    .filter((block) => block.teacherId === teacherId)
    .flatMap((block) => block.slots ?? [{ ...block, blockId: block.id, status: 'open' as const }])
    .map((slot) => ({
      ...slot,
      status: activeBookings.has(slot.id) || activeBookings.has(slot.blockId) ? 'booked' as const : 'open' as const,
    }));
}

export function bookOfficeHourSlot(request: Omit<BookingRequest, 'blockId' | 'requesterRole'> & { requesterRole?: OfficeHoursRole }) {
  const slot = officeHoursStore.blocks.flatMap((block) => block.slots ?? []).find((item) => item.id === request.slotId);
  if (!slot) throw new Error('slot_unavailable');
  let booking;
  try {
    booking = bookOfficeHoursSlot(
      [{ id: slot.id, teacherId: slot.teacherId, startsAt: slot.startsAt, endsAt: slot.endsAt, timezone: slot.timezone }],
      officeHoursStore.bookings,
      { blockId: slot.id, requesterId: request.requesterId, requesterRole: request.requesterRole ?? 'parent', studentId: request.studentId, note: request.reason },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('already booked')) {
      throw new Error('slot_unavailable');
    }
    throw error;
  }
  officeHoursStore.bookings.push(booking);
  return booking;
}

export function cancelOfficeHourBooking(bookingId: string, actorId: string) {
  const index = officeHoursStore.bookings.findIndex((booking) => booking.id === bookingId);
  if (index < 0) throw new Error('booking_not_found');
  const cancelled = cancelOfficeHoursBooking(officeHoursStore.bookings[index], actorId);
  officeHoursStore.bookings[index] = cancelled;
  return cancelled;
}

export function resetOfficeHoursStoreForTests() {
  officeHoursStore.blocks = [];
  officeHoursStore.bookings = [];
}
