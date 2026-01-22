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

export type OrchestratorArtifactType = 'MESSAGE_DRAFT' | 'BRIEF' | 'SUMMARY' | 'DEEPLINK' | 'OTHER';

export type OrchestratorUiType = 'CARD' | 'DEEPLINK' | 'CHOICE' | 'ERROR';

export interface OrchestratorActor {
  userId: string;
  role: string;
}

export interface OrchestratorSelectedContext {
  childId?: string;
  schoolId?: string;
}

export interface OrchestratorMetadata {
  locale?: string;
  timezone?: string;
  /**
   * Optional UI action envelope for deterministic routing.
   * When channel=UI_ACTION, metadata.action.id should be set.
   */
  action?: {
    id: string;
    payload?: unknown;
  };
}

export interface OrchestratorRequestInput {
  requestId: string;
  actor: OrchestratorActor;
  channel: OrchestratorChannel;
  text?: string;
  selected?: OrchestratorSelectedContext;
  metadata?: OrchestratorMetadata;
}

export interface OrchestratorSafety {
  level: OrchestratorSafetyLevel;
  reasons: string[];
}

export interface OrchestratorPromptQuestion {
  type: 'FOLLOWUP_QUESTION';
  question: string;
  placeholder?: string;
}

export type OrchestratorPromptUser = OrchestratorPromptQuestion;

export interface OrchestratorNeeds {
  missing: string[];
  promptUser?: OrchestratorPromptUser;
}

export interface OrchestratorUiAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface OrchestratorUiOption {
  label: string;
  value: string;
  description?: string;
}

export interface OrchestratorUi {
  type: OrchestratorUiType;
  title: string;
  subtitle?: string;
  body?: string;
  message?: string;
  deepLink?: string;
  options?: OrchestratorUiOption[];
  primaryAction?: OrchestratorUiAction;
  secondaryAction?: OrchestratorUiAction;
}

export interface OrchestratorArtifact {
  id?: string;
  type: OrchestratorArtifactType;
  payload: Record<string, unknown>;
  expiresAt?: string | null;
}

export interface OrchestratorResponseDebug {
  extractedEntities: Record<string, unknown>;
}

export interface OrchestratorResponse {
  route: OrchestratorRoute;
  confidence: number;
  safety: OrchestratorSafety;
  needs?: OrchestratorNeeds;
  ui: OrchestratorUi;
  artifact?: OrchestratorArtifact;
  debug?: OrchestratorResponseDebug;
}
