"use client";

// Minimal i18n: a useT() hook returning t(key) -> localized string.
// Adding a new string:
//   1. Add an entry to BOTH `en` and `ko` dictionaries below using a dotted
//      key like "section.thing".
//   2. In a client component, `const t = useT();` then `t("section.thing")`.
//   3. Server components: import `tFor(locale, key)` directly.
//
// Locale persists in localStorage under "proctorpal_locale". Default is "en".
// To set a new default for a fresh user (e.g. by school region), change DEFAULT
// or set the "proctorpal_locale" cookie server-side before first load.

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Locale = "en" | "ko";
const DEFAULT: Locale = "en";

const en = {
  // Common
  "common.signIn": "Sign in",
  "common.signUp": "Sign up",
  "common.signOut": "Sign out",
  "common.continue": "Continue",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.submit": "Submit",
  "common.start": "Start",
  "common.next": "Next",
  "common.previous": "Previous",
  "common.loading": "Loading...",
  "common.email": "Email",
  "common.password": "Password",
  "common.name": "Name",
  "common.language": "Language",

  // Home
  "home.title": "ProctorPal",
  "home.subtitle": "In-classroom online testing with tab-switch detection, copy/paste blocking, forced fullscreen, and a custom on-screen keyboard for tablets.",
  "home.imStudent": "I'm a student",
  "home.studentBlurb": "Enter your access code and student ID to start a test.",
  "home.imTeacher": "I'm a teacher",
  "home.teacherBlurb": "Build tests, monitor live sessions, grade responses.",

  // Auth
  "auth.signInTitle": "Teacher sign in",
  "auth.signUpTitle": "Create teacher account",
  "auth.yourName": "Your name",
  "auth.signingIn": "Signing in...",
  "auth.creating": "Creating...",
  "auth.newHere": "New here?",
  "auth.createAccount": "Create an account",
  "auth.alreadyRegistered": "Already registered?",
  "auth.inviteOnlyTitle": "Invite only",
  "auth.inviteOnlyBody": "Teacher accounts are invite-only on this instance. If your administrator has created an account for you, sign in.",
  "auth.goToSignIn": "Go to sign in",

  // Student entry
  "student.startTest": "Start a test",
  "student.entryHelp": "Enter the access code your teacher gave you, then your student ID.",
  "student.accessCode": "Access code",
  "student.studentId": "Student ID",
  "student.confirmIdentity": "Confirm identity",
  "student.continueToTest": "Continue to test",
  "student.signingInAs": "You're signing in as",
  "student.fixId": "If this is wrong, fix your student ID before continuing.",

  // Waiting room
  "waiting.title": "Waiting for your teacher",
  "waiting.body": "Your test will begin once your teacher admits you.",

  // Runner
  "runner.test": "Test",
  "runner.questionOf": "Question {n}/{total}",
  "runner.beforeYouStart": "Before you start",
  "runner.rule1": "Close every other tab and app.",
  "runner.rule2": "Put your phone face-down on the desk.",
  "runner.rule3": "Do not switch tabs, copy, or paste.",
  "runner.rule4": "If anything happens, raise your hand.",
  "runner.enterFullscreen": "Enter fullscreen to begin",
  "runner.startTest": "Start test",
  "runner.submit": "Submit test",
  "runner.submitting": "Submitting...",

  // Paused overlay
  "paused.title": "Test paused",
  "paused.askTeacher": "Please raise your hand. Your teacher will review the alert and resume your test when you're ready.",
  "paused.fullscreen_exit": "You left fullscreen.",
  "paused.tab_blur": "You switched to another window.",
  "paused.visibility_hidden": "The test page lost focus.",
  "paused.paste_attempt": "Pasting is not allowed during this test.",
  "paused.copy_attempt": "Copying is not allowed during this test.",
  "paused.cut_attempt": "Cutting is not allowed during this test.",
  "paused.context_menu": "The right-click menu is disabled during this test.",
  "paused.pwa_required": "Open this test from the home-screen icon to continue.",
  "paused.device_mismatch": "Your session was started on a different device.",
  "paused.unknown": "Your test is paused.",

  // Done
  "done.title": "Submitted",
  "done.body": "Your responses have been saved. Your teacher will publish results.",

  // Teacher nav
  "nav.classes": "Classes",
  "nav.tests": "Tests",
};

const ko: typeof en = {
  // Common
  "common.signIn": "로그인",
  "common.signUp": "회원가입",
  "common.signOut": "로그아웃",
  "common.continue": "계속하기",
  "common.cancel": "취소",
  "common.save": "저장",
  "common.submit": "제출",
  "common.start": "시작",
  "common.next": "다음",
  "common.previous": "이전",
  "common.loading": "불러오는 중...",
  "common.email": "이메일",
  "common.password": "비밀번호",
  "common.name": "이름",
  "common.language": "언어",

  // Home
  "home.title": "ProctorPal",
  "home.subtitle": "교실 내 온라인 시험 - 탭 전환 감지, 복사/붙여넣기 차단, 전체 화면 강제, 태블릿용 자체 키보드 제공.",
  "home.imStudent": "학생입니다",
  "home.studentBlurb": "접속 코드와 학번을 입력하여 시험을 시작하세요.",
  "home.imTeacher": "교사입니다",
  "home.teacherBlurb": "시험을 만들고, 실시간으로 모니터링하고, 채점하세요.",

  // Auth
  "auth.signInTitle": "교사 로그인",
  "auth.signUpTitle": "교사 계정 만들기",
  "auth.yourName": "이름",
  "auth.signingIn": "로그인 중...",
  "auth.creating": "생성 중...",
  "auth.newHere": "처음이신가요?",
  "auth.createAccount": "계정 만들기",
  "auth.alreadyRegistered": "이미 가입하셨나요?",
  "auth.inviteOnlyTitle": "초대 전용",
  "auth.inviteOnlyBody": "이 시스템의 교사 계정은 초대 전용입니다. 관리자가 계정을 만들어 드렸다면 로그인하세요.",
  "auth.goToSignIn": "로그인하러 가기",

  // Student entry
  "student.startTest": "시험 시작",
  "student.entryHelp": "선생님이 알려주신 접속 코드와 학번을 입력하세요.",
  "student.accessCode": "접속 코드",
  "student.studentId": "학번",
  "student.confirmIdentity": "신원 확인",
  "student.continueToTest": "시험으로 이동",
  "student.signingInAs": "다음 학생으로 로그인합니다",
  "student.fixId": "이 정보가 틀렸다면, 계속하기 전에 학번을 수정하세요.",

  // Waiting room
  "waiting.title": "선생님을 기다리는 중",
  "waiting.body": "선생님이 입장을 허가하면 시험이 시작됩니다.",

  // Runner
  "runner.test": "시험",
  "runner.questionOf": "문제 {n}/{total}",
  "runner.beforeYouStart": "시작하기 전에",
  "runner.rule1": "다른 모든 탭과 앱을 닫으세요.",
  "runner.rule2": "휴대폰을 책상 위에 엎어 놓으세요.",
  "runner.rule3": "탭을 전환하거나, 복사하거나, 붙여넣기를 하지 마세요.",
  "runner.rule4": "문제가 생기면 손을 드세요.",
  "runner.enterFullscreen": "전체 화면으로 시작",
  "runner.startTest": "시험 시작",
  "runner.submit": "시험 제출",
  "runner.submitting": "제출 중...",

  // Paused overlay
  "paused.title": "시험 일시정지",
  "paused.askTeacher": "손을 드세요. 선생님이 알림을 확인하고 준비가 되면 시험을 재개해 드립니다.",
  "paused.fullscreen_exit": "전체 화면을 종료하셨습니다.",
  "paused.tab_blur": "다른 창으로 전환하셨습니다.",
  "paused.visibility_hidden": "시험 페이지에서 포커스가 사라졌습니다.",
  "paused.paste_attempt": "이 시험에서는 붙여넣기가 허용되지 않습니다.",
  "paused.copy_attempt": "이 시험에서는 복사가 허용되지 않습니다.",
  "paused.cut_attempt": "이 시험에서는 잘라내기가 허용되지 않습니다.",
  "paused.context_menu": "이 시험에서는 우클릭 메뉴가 비활성화되어 있습니다.",
  "paused.pwa_required": "홈 화면 아이콘에서 이 시험을 열어 계속하세요.",
  "paused.device_mismatch": "다른 기기에서 시작된 세션입니다.",
  "paused.unknown": "시험이 일시정지되었습니다.",

  // Done
  "done.title": "제출 완료",
  "done.body": "답안이 저장되었습니다. 선생님이 결과를 공개할 예정입니다.",

  // Teacher nav
  "nav.classes": "수업",
  "nav.tests": "시험",
};

const dicts: Record<Locale, typeof en> = { en, ko };

export function tFor(locale: Locale, key: keyof typeof en, vars?: Record<string, string | number>): string {
  const raw = dicts[locale]?.[key] ?? dicts.en[key] ?? String(key);
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? ""));
}

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
}
const Ctx = createContext<LocaleCtx>({ locale: DEFAULT, setLocale: () => {} });

const STORAGE_KEY = "proctorpal_locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "en" || saved === "ko") setLocaleState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
    document.documentElement.lang = l;
  }, []);

  return <Ctx.Provider value={{ locale, setLocale }}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx);
}

export function useT() {
  const { locale } = useLocale();
  return useCallback(
    (key: keyof typeof en, vars?: Record<string, string | number>) => tFor(locale, key, vars),
    [locale]
  );
}

export type TKey = keyof typeof en;
