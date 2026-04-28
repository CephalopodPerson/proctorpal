// Auto-grader for question types where the answer can be checked
// deterministically. Long-answer is always manual. Short-answer that
// doesn't cleanly match any accept rule is routed to the teacher's
// review queue (auto_status="needs_review").

import type {
  AnswerPayload,
  AutoGradeResult,
  MCAnswer,
  MatchingAnswer,
  MatchingPayload,
  MultipleChoicePayload,
  OrderingAnswer,
  OrderingPayload,
  Question,
  ShortAnswer,
  ShortAnswerPayload,
  TFAnswer,
  TrueFalsePayload,
} from "@/types";

export function gradeAnswer(
  question: Question,
  answer: AnswerPayload["data"] | null
): AutoGradeResult {
  if (!answer) return { score: 0, status: "incorrect" };
  const points = question.points ?? 1;
  switch (question.type) {
    case "multiple_choice":
      return gradeMC(question.payload as MultipleChoicePayload, answer as MCAnswer, points);
    case "true_false":
      return gradeTF(question.payload as TrueFalsePayload, answer as TFAnswer, points);
    case "short_answer":
      return gradeShort(question.payload as ShortAnswerPayload, answer as ShortAnswer, points);
    case "long_answer":
      return { score: 0, status: "needs_review" };
    case "matching":
      return gradeMatch(question.payload as MatchingPayload, answer as MatchingAnswer, points);
    case "ordering":
      return gradeOrder(question.payload as OrderingPayload, answer as OrderingAnswer, points);
    default:
      return { score: 0, status: "needs_review" };
  }
}

function gradeMC(p: MultipleChoicePayload, a: MCAnswer, points: number): AutoGradeResult {
  const correct = new Set(p.correct);
  const selected = new Set(a.selected ?? []);
  if (!p.multi_select) {
    const ok = selected.size === 1 && correct.has(Array.from(selected)[0]!);
    return { score: ok ? points : 0, status: ok ? "correct" : "incorrect" };
  }
  // Multi-select: all correct selected, no incorrect selected.
  const allRight = [...correct].every((c) => selected.has(c));
  const noWrong = [...selected].every((s) => correct.has(s));
  const full = allRight && noWrong;
  return { score: full ? points : 0, status: full ? "correct" : "incorrect" };
}

function gradeTF(p: TrueFalsePayload, a: TFAnswer, points: number): AutoGradeResult {
  if (a.value === null || a.value === undefined) return { score: 0, status: "incorrect" };
  const ok = a.value === p.correct;
  return { score: ok ? points : 0, status: ok ? "correct" : "incorrect" };
}

function gradeShort(p: ShortAnswerPayload, a: ShortAnswer, points: number): AutoGradeResult {
  const v = (a.value ?? "").trim();
  if (!v) return { score: 0, status: "incorrect" };

  // Numeric path with tolerance.
  if (p.tolerance !== undefined) {
    const num = Number(v);
    if (Number.isFinite(num)) {
      for (const acc of p.accepts) {
        const target = Number(acc.value);
        if (Number.isFinite(target) && Math.abs(num - target) <= p.tolerance) {
          return { score: points, status: "correct" };
        }
      }
      return { score: 0, status: "incorrect" };
    }
    // Fall through to string comparison if not numeric input
  }

  for (const acc of p.accepts) {
    if (matches(v, acc.value, acc.mode)) {
      return { score: points, status: "correct" };
    }
  }
  // No clean match — route for teacher review.
  return { score: 0, status: "needs_review" };
}

function matches(input: string, target: string, mode: ShortAnswerPayload["accepts"][number]["mode"]): boolean {
  if (mode === "exact") return input === target;
  if (mode === "ci") return input.toLowerCase() === target.toLowerCase();
  if (mode === "ws")
    return input.replace(/\s+/g, " ").trim().toLowerCase() ===
      target.replace(/\s+/g, " ").trim().toLowerCase();
  if (mode === "contains")
    return input.toLowerCase().includes(target.toLowerCase());
  return false;
}

function gradeMatch(p: MatchingPayload, a: MatchingAnswer, points: number): AutoGradeResult {
  const truth = new Map(p.pairs);
  const given = new Map(a.pairs ?? []);
  if (truth.size === 0) return { score: 0, status: "needs_review" };
  let right = 0;
  for (const [l, r] of truth) {
    if (given.get(l) === r) right++;
  }
  const ratio = right / truth.size;
  const score = Math.round(points * ratio * 100) / 100;
  // Partial credit on matching is standard; full credit only on perfect.
  return { score, status: ratio === 1 ? "correct" : ratio === 0 ? "incorrect" : "needs_review" };
}

function gradeOrder(p: OrderingPayload, a: OrderingAnswer, points: number): AutoGradeResult {
  const truth = p.correct_order;
  const given = a.order ?? [];
  if (truth.length === 0 || given.length !== truth.length)
    return { score: 0, status: "incorrect" };
  let inPlace = 0;
  for (let i = 0; i < truth.length; i++) {
    if (given[i] === truth[i]) inPlace++;
  }
  const ratio = inPlace / truth.length;
  const score = Math.round(points * ratio * 100) / 100;
  return { score, status: ratio === 1 ? "correct" : ratio === 0 ? "incorrect" : "needs_review" };
}
