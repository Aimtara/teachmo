import {
  bookOfficeHourSlot,
  cancelOfficeHourBooking,
  createAvailabilityBlock,
  listOfficeHourSlots,
  resetOfficeHoursStoreForTests,
  rescheduleOfficeHourBooking,
} from '../officeHours';

describe('office hours domain', () => {
  beforeEach(() => {
    resetOfficeHoursStoreForTests();
  });

  it('creates availability and prevents double booking', async () => {
    const block = await createAvailabilityBlock({
      teacherId: 'teacher-1',
      startsAt: '2026-05-04T15:00:00-04:00',
      endsAt: '2026-05-04T16:00:00-04:00',
      slotMinutes: 30,
      timezone: 'America/New_York',
    });

    expect(block.slots).toHaveLength(2);
    const [firstSlot] = await listOfficeHourSlots('teacher-1');

    const booking = await bookOfficeHourSlot({
      slotId: firstSlot.id,
      requesterId: 'parent-1',
      studentId: 'student-1',
      reason: 'Reading support',
    });

    expect(booking.status).toBe('confirmed');

    expect(() =>
      bookOfficeHourSlot({
        slotId: firstSlot.id,
        requesterId: 'parent-2',
        reason: 'Second request',
      }),
    ).toThrow('slot_unavailable');
  });

  it('releases a slot after cancellation', async () => {
    const block = await createAvailabilityBlock({
      teacherId: 'teacher-1',
      startsAt: '2026-05-04T15:00:00Z',
      endsAt: '2026-05-04T15:30:00Z',
    });
    const slot = block.slots[0];
    const booking = await bookOfficeHourSlot({ slotId: slot.id, requesterId: 'parent-1' });

    await cancelOfficeHourBooking(booking.id, 'parent-1');

    const [released] = await listOfficeHourSlots('teacher-1');
    expect(released.status).toBe('open');
  });

  it('reschedules by cancelling the original booking and reserving the new slot', async () => {
    const block = await createAvailabilityBlock({
      teacherId: 'teacher-1',
      startsAt: '2026-05-04T15:00:00Z',
      endsAt: '2026-05-04T16:00:00Z',
      slotMinutes: 30,
      timezone: 'UTC',
    });
    const [firstSlot, secondSlot] = block.slots;
    const original = await bookOfficeHourSlot({ slotId: firstSlot.id, requesterId: 'parent-1' });

    const rescheduled = await rescheduleOfficeHourBooking(original.id, {
      blockId: secondSlot.id,
      slotId: secondSlot.id,
      reason: 'Parent schedule changed',
    });

    expect(rescheduled.status).toBe('confirmed');
    expect(rescheduled.auditEvent).toBe('office_hours.booking.rescheduled');
    const slots = await listOfficeHourSlots('teacher-1');
    expect(slots.find((slot) => slot.id === firstSlot.id)?.status).toBe('open');
    expect(slots.find((slot) => slot.id === secondSlot.id)?.status).toBe('booked');
  });

  it('rejects teacher self-booking and preserves timezone metadata', async () => {
    const block = await createAvailabilityBlock({
      teacherId: 'teacher-1',
      startsAt: '2026-05-04T15:00:00-04:00',
      endsAt: '2026-05-04T15:30:00-04:00',
      timezone: 'America/New_York',
    });

    expect(block.timezone).toBe('America/New_York');
    expect(() =>
      bookOfficeHourSlot({
        slotId: block.slots[0].id,
        requesterId: 'teacher-1',
        requesterRole: 'teacher',
      }),
    ).toThrow('Requester is not allowed to book office hours.');
  });
});
