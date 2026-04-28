// ============================================================================
// Domain types
// ----------------------------------------------------------------------------
// These mirror the database schema but model the type-specific question and
// answer payloads as discriminated unions, validated at the API boundary
// with zod (see /lib/schemas).
// ============================================================================

export type UUID = string;

// ----------------------------------------------------------------------------
// Question payloads (stored as JSONB on questions.payload)
// ----------------------------------------------------------------------------
export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "long_answer"
  | "matching"
  | "ordering";

export interface MCOption {
  id: string;
  text: string;
}

export interface MultipleChoicePayload {
  options: MCOption[];
  correct: string[];        // option ids
  multi_select: boolean;
}

export interface TrueFalsePayload {
  correct: boolean;
}

export type ShortAnswerMatchMode = "exact" | "ci" | "ws" | "contains";

export interface ShortAnswerAccept {
  value: string;
  mode: ShortAnswerMatchMode;
}

export interface ShortAnswerPayload {
  accepts: ShortAnswerAccept[];
  // Optional numeric tolerance: if both the answer and accepts are numeric,
  // allow a delta of this size.
  tolerance?: number;
}

export interface LongAnswerPayload {
  rubric?: string;
}

export interface MatchingItem {
  id: string;
  text: string;
}

export interface MatchingPayload {
  left: MatchingItem[];
  right: MatchingItem[];
  // Authoritative pairs: [leftId, rightId][]
  pairs: Array<[string, string]>;
}

export interface OrderingPayload {
  items: MatchingItem[];
  correct_order: string[];  // item ids in correct order
}

export type QuestionPayload =
  | { type: "multiple_choice"; data: MultipleChoicePayload }
  | { type: "true_false"; data: TrueFalsePayload }
  | { type: "short_answer"; data: ShortAnswerPayload }
  | { type: "long_answer"; data: LongAnswerPayload }
  | { type: "matching"; data: MatchingPayload }
  | { type: "ordering"; data: OrderingPayload };

// ----------------------------------------------------------------------------
// Question (row) — payload typed loosely here, narrowed at use sites.
// ----------------------------------------------------------------------------
export interface Question {
  id: UUID;
  bank_id: UUID;
  type: QuestionType;
  prompt: string;
  payload: QuestionPayload["data"]; // narrow with the type discriminator
  image_url: string | null;
  youtube_id: string | null;
  points: number;
  position: number;
}

// ----------------------------------------------------------------------------
// Answer payloads (stored as JSONB on answers.payload)
// ----------------------------------------------------------------------------
export interface MCAnswer {
  selected: string[];
}
export interface TFAnswer {
  value: boolean | null;
}
export interface ShortAnswer {
  value: string;
}
export interface LongAnswer {
  value: string;
}
export interface MatchingAnswer {
  pairs: Array<[string, string]>;
}
export interface OrderingAnswer {
  order: string[];
}

export type AnswerPayload =
  | { type: "multiple_choice"; data: MCAnswer }
  | { type: "true_false"; data: TFAnswer }
  | { type: "short_answer"; data: ShortAnswer }
  | { type: "long_answer"; data: LongAnswer }
  | { type: "matching"; data: MatchingAnswer }
  | { type: "ordering"; data: OrderingAnswer };

// ----------------------------------------------------------------------------
// Sessions and proctoring
// ----------------------------------------------------------------------------
export type SessionStatus =
  | "pending_admit"
  | "in_progress"
  | "paused"
  | "submitted"
  | "auto_submitted"
  | "voided";

export type ViolationType =
  | "fullscreen_exit"
  | "tab_blur"
  | "visibility_hidden"
  | "copy_attempt"
  | "paste_attempt"
  | "cut_attempt"
  | "context_menu"
  | "devtools_open"
  | "pwa_required"
  | "device_mismatch"
  | "time_drift"
  | "unknown";

export type Platform =
  | "windows"
  | "mac"
  | "linux"
  | "ios"
  | "ipados"
  | "android"
  | "unknown";

export interface SessionSummary {
  id: UUID;
  assignment_id: UUID;
  student_id: UUID;
  status: SessionStatus;
  started_at: string | null;
  duration_seconds_remaining: number;
  paused_at: string | null;
  submitted_at: string | null;
  platform: Platform | null;
  is_pwa_standalone: boolean | null;
}

export interface Violation {
  id: UUID;
  session_id: UUID;
  type: ViolationType;
  details: Record<string, unknown> | null;
  paused_session: boolean;
  occurred_at: string;
}

// ----------------------------------------------------------------------------
// Auto-grading
// ----------------------------------------------------------------------------
export type AutoStatus = "correct" | "incorrect" | "needs_review" | null;

export interface AutoGradeResult {
  score: number;
  status: AutoStatus;
}
