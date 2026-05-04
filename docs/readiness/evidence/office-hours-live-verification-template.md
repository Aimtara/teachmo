 # Office Hours Live Verification Evidence Template

 Use this packet before enabling office-hours booking for a pilot or broad production cohort.

 ## Metadata

 | Field | Value |
 | --- | --- |
 | Environment | staging / production |
 | Tenant / district |  |
 | Teacher account |  |
 | Parent/student account |  |
 | Executor |  |
 | Reviewer |  |
 | Date/time |  |
 | Feature flag state (`OFFICE_HOURS`) |  |

 ## Verification steps

 1. Teacher creates an availability block with tenant timezone noted.
 2. Parent/student views available slots and books one slot.
 3. A second requester attempts the same slot and is blocked with a conflict/availability message.
 4. Teacher and requester can see the confirmed booking.
 5. Booking cancellation returns the slot to the available pool or records the expected cancelled state.
 6. Notification/reminder behavior is verified or explicitly marked out of launch scope.
 7. Audit/log evidence is reviewed for actor, action, status, timestamp, and absence of raw sensitive notes.

 ## Evidence

 | Check | Expected | Actual | Pass/fail | Artifact link |
 | --- | --- | --- | --- | --- |
 | Availability create | Slot appears for parent/student |  |  |  |
 | Booking create | Booking confirmed once |  |  |  |
 | Conflict prevention | Duplicate booking blocked |  |  |  |
 | Cancel/reschedule | State changes as expected |  |  |  |
 | Timezone | Display matches tenant/browser expectation |  |  |  |
 | Audit/redaction | No raw PII beyond approved identifiers |  |  |  |

 ## Signoff

 - Engineering owner:
 - Product owner:
 - Support/on-call owner:
