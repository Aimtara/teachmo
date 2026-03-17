// backend/orchestrator/agents/teacherBoundaryAgent.ts

export async function handleInboundParentMessage(
  messageBody: string, 
  teacherId: string,
  parentId: string,
  db: any
) {
  // 1. Check Teacher's "Hemisphere" Rules (Do they allow auto-booking?)
  const teacherSettings = await db.getTeacherSettings(teacherId);
  if (!teacherSettings.auto_scheduling_enabled) {
    return routeMessageToTeacherInbox(messageBody, teacherId, parentId);
  }

  // 2. Lightweight Intent Detection (Regex reflex beats LLM for simple cases)
  const schedulingKeywords = /\b(meet|call|office hours|schedule|discuss|time to talk)\b/i;
  const hasSchedulingIntent = schedulingKeywords.test(messageBody);

  if (hasSchedulingIntent) {
    // 3. Generate Auto-Reply with Booking Link
    const bookingLink = await generateUniqueBookingLink(teacherId, parentId);
    
    await sendAutomatedReply(parentId, {
      body: `I received your message. If you'd like to schedule a time to talk, please use my office hours link: ${bookingLink}`,
      isAutomated: true,
      originalMessageRef: messageBody
    });

    // 4. Log the deflection to calculate "teacher burden hours saved"
    await logTeacherBurdenSaved(teacherId, 'scheduling_deflection');
    return { status: 'deflected_to_scheduler' };
  }

  // Fallback to normal routing
  return routeMessageToTeacherInbox(messageBody, teacherId, parentId);
}
