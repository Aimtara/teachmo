// backend/orchestrator/agents/teacherBoundaryAgent.ts

type TeacherBoundaryDb = {
  getTeacherSettings: (teacherId: string) => Promise<{ auto_scheduling_enabled?: boolean }>;
  routeMessageToTeacherInbox?: (messageBody: string, teacherId: string, parentId: string) => Promise<unknown>;
  generateUniqueBookingLink?: (teacherId: string, parentId: string) => Promise<string>;
  sendAutomatedReply?: (parentId: string, payload: Record<string, unknown>) => Promise<unknown>;
  logTeacherBurdenSaved?: (teacherId: string, reason: string) => Promise<unknown>;
};

async function routeMessageToTeacherInbox(messageBody: string, teacherId: string, parentId: string, db: TeacherBoundaryDb) {
  if (db.routeMessageToTeacherInbox) {
    return db.routeMessageToTeacherInbox(messageBody, teacherId, parentId);
  }
  return { status: 'routed_to_teacher_inbox', teacherId, parentId };
}

async function generateUniqueBookingLink(teacherId: string, parentId: string, db: TeacherBoundaryDb) {
  if (db.generateUniqueBookingLink) {
    return db.generateUniqueBookingLink(teacherId, parentId);
  }
  return `/office-hours?teacher=${encodeURIComponent(teacherId)}&parent=${encodeURIComponent(parentId)}`;
}

async function sendAutomatedReply(parentId: string, payload: Record<string, unknown>, db: TeacherBoundaryDb) {
  if (db.sendAutomatedReply) {
    return db.sendAutomatedReply(parentId, payload);
  }
  return { status: 'reply_skipped_no_adapter', parentId };
}

async function logTeacherBurdenSaved(teacherId: string, reason: string, db: TeacherBoundaryDb) {
  if (db.logTeacherBurdenSaved) {
    return db.logTeacherBurdenSaved(teacherId, reason);
  }
  return { status: 'metric_skipped_no_adapter', teacherId, reason };
}

export async function handleInboundParentMessage(
  messageBody: string, 
  teacherId: string,
  parentId: string,
  db: TeacherBoundaryDb
) {
  // 1. Check Teacher's "Hemisphere" Rules (Do they allow auto-booking?)
  const teacherSettings = await db.getTeacherSettings(teacherId);
  if (!teacherSettings.auto_scheduling_enabled) {
    return routeMessageToTeacherInbox(messageBody, teacherId, parentId, db);
  }

  // 2. Lightweight Intent Detection (Regex reflex beats LLM for simple cases)
  const schedulingKeywords = /\b(meet|call|office hours|schedule|discuss|time to talk)\b/i;
  const hasSchedulingIntent = schedulingKeywords.test(messageBody);

  if (hasSchedulingIntent) {
    // 3. Generate Auto-Reply with Booking Link
    const bookingLink = await generateUniqueBookingLink(teacherId, parentId, db);
    
    await sendAutomatedReply(parentId, {
      body: `I received your message. If you'd like to schedule a time to talk, please use my office hours link: ${bookingLink}`,
      isAutomated: true,
      originalMessageRef: messageBody
    }, db);

    // 4. Log the deflection to calculate "teacher burden hours saved"
    await logTeacherBurdenSaved(teacherId, 'scheduling_deflection', db);
    return { status: 'deflected_to_scheduler' };
  }

  // Fallback to normal routing
  return routeMessageToTeacherInbox(messageBody, teacherId, parentId, db);
}
