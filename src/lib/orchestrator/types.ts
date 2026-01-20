export type OrchestratorChannel = 'CHAT' | 'PUSH' | 'EMAIL' | 'UI_ACTION' | 'SYSTEM_EVENT';

export type OrchestratorRoute =
  | 'HUB_MESSAGE_SEND'
  | 'HUB_THREAD_SUMMARIZE'
  | 'WEEKLY_BRIEF_GENERATE'
  | 'OFFICE_HOURS_BOOK'
  | 'HOMEWORK_HELP'
  | 'EXPLORE_DEEP_LINK'
  | 'SAFETY_ESCALATE'
  | 'UNKNOWN_CLARIFY';

export type OrchestratorSafetyLevel = 'NONE' | 'SENSITIVE' | 'URGENT' | 'BLOCKED';

export type OrchestratorUiType = 'CARD' | 'DEEPLINK' | 'CHOICE' | 'FOLLOWUP_QUESTION' | 'ERROR';

export interface OrchestratorActor {
  userId: string;
  role: string;
}

export interface OrchestratorSelectedContext {
  childId?: string;
  schoolId?: string;
  teacherId?: string;
  threadId?: string;
  recipientUserId?: string;
}

export interface OrchestratorMetadata {
  locale?: string;
  timezone?: string;
}

export interface OrchestratorRequestInput {
  requestId: string;
  actor: OrchestratorActor;
  channel: OrchestratorChannel;
  text?: string;
  selected?: OrchestratorSelectedContext;
  metadata?: OrchestratorMetadata;
  recent?: { summary?: string };
}

export interface OrchestratorSafety {
  level: OrchestratorSafetyLevel;
  reasons: string[];
}

export interface OrchestratorPromptChoice {
  type: 'CHOICE';
  title: string;
  options: Array<{ label: string; value: string }>;
}

export interface OrchestratorPromptQuestion {
  type: 'FOLLOWUP_QUESTION';
  title: string;
  placeholder?: string;
}

export type OrchestratorPromptUser = OrchestratorPromptChoice | OrchestratorPromptQuestion;

export interface OrchestratorNeeds {
  missing: string[];
  promptUser?: OrchestratorPromptUser;
}

export interface OrchestratorUiAction {
  label: string;
  action: string;
}

export interface OrchestratorUi {
  type: OrchestratorUiType;
  title: string;
  body?: string;
  deepLink?: string;
  primaryAction?: OrchestratorUiAction;
}

export interface OrchestratorResponse {
  route: OrchestratorRoute;
  confidence: number;
  safety: OrchestratorSafety;
  needs?: OrchestratorNeeds;
  ui: OrchestratorUi;
  result?: Record<string, unknown>;
  sideEffects?: string[];
  success?: boolean;
}
