"use client";

// Routes a question to the right component based on its type.
// Centralizes the answer-type narrowing so individual components don't
// have to know about the discriminated union.

import type {
  AnswerPayload,
  Question,
  MultipleChoicePayload,
  TrueFalsePayload,
  ShortAnswerPayload,
  LongAnswerPayload,
  MatchingPayload,
  OrderingPayload,
  MCAnswer,
  TFAnswer,
  ShortAnswer,
  LongAnswer,
  MatchingAnswer,
  OrderingAnswer,
} from "@/types";
import { MultipleChoice } from "./MultipleChoice";
import { TrueFalse } from "./TrueFalse";
import { ShortAnswerQ } from "./ShortAnswerQ";
import { LongAnswerQ } from "./LongAnswerQ";
import { Matching } from "./Matching";
import { Ordering } from "./Ordering";
import { QuestionMedia } from "./QuestionMedia";

export interface QuestionRendererProps {
  question: Question;
  answer: AnswerPayload["data"] | null;
  onAnswerChange: (next: AnswerPayload["data"]) => void;
  showVirtualKeyboard: boolean;
  disabled?: boolean;
}

export function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  showVirtualKeyboard,
  disabled,
}: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <div className="text-lg font-medium text-slate-900 whitespace-pre-wrap">
        {question.prompt}
      </div>
      <QuestionMedia imageUrl={question.image_url} youtubeId={question.youtube_id} />
      <Body
        question={question}
        answer={answer}
        onAnswerChange={onAnswerChange}
        showVirtualKeyboard={showVirtualKeyboard}
        disabled={disabled}
      />
    </div>
  );
}

function Body({
  question,
  answer,
  onAnswerChange,
  showVirtualKeyboard,
  disabled,
}: QuestionRendererProps) {
  switch (question.type) {
    case "multiple_choice":
      return (
        <MultipleChoice
          payload={question.payload as MultipleChoicePayload}
          answer={(answer as MCAnswer) ?? null}
          onChange={(a) => onAnswerChange(a)}
          disabled={disabled}
        />
      );
    case "true_false":
      // payload not actually needed by the component (only correct, server-side)
      void (question.payload as TrueFalsePayload);
      return (
        <TrueFalse
          answer={(answer as TFAnswer) ?? null}
          onChange={(a) => onAnswerChange(a)}
          disabled={disabled}
        />
      );
    case "short_answer": {
      const sa = question.payload as ShortAnswerPayload;
      const numeric = sa.tolerance !== undefined;
      return (
        <ShortAnswerQ
          answer={(answer as ShortAnswer) ?? null}
          onChange={(a) => onAnswerChange(a)}
          showVirtualKeyboard={showVirtualKeyboard}
          numeric={numeric}
          disabled={disabled}
        />
      );
    }
    case "long_answer":
      void (question.payload as LongAnswerPayload);
      return (
        <LongAnswerQ
          answer={(answer as LongAnswer) ?? null}
          onChange={(a) => onAnswerChange(a)}
          disabled={disabled}
        />
      );
    case "matching":
      return (
        <Matching
          payload={question.payload as MatchingPayload}
          answer={(answer as MatchingAnswer) ?? null}
          onChange={(a) => onAnswerChange(a)}
          disabled={disabled}
        />
      );
    case "ordering":
      return (
        <Ordering
          payload={question.payload as OrderingPayload}
          answer={(answer as OrderingAnswer) ?? null}
          onChange={(a) => onAnswerChange(a)}
          disabled={disabled}
        />
      );
    default:
      return <div className="text-sm text-violation">Unknown question type</div>;
  }
}
