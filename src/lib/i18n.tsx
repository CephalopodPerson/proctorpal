"use client";

// Minimal i18n: a useT() hook returning t(key) -> localized string.
// Adding a new string:
//   1. Add an entry to BOTH `en` and `ko` dictionaries below using a dotted
//      key like "section.thing".
//   2. In a client component, `const t = useT();` then `t("section.thing")`.
//   3. Server components: import `tFor(locale, key)` directly.
//
// Locale persists in localStorage under "proctorpal_locale". Default is "en".

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Locale = "en" | "ko";
const DEFAULT: Locale = "en";

const en = {
  // ============================================================
  // Common
  // ============================================================
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
  "common.add": "Add",
  "common.remove": "Remove",
  "common.delete": "Delete",
  "common.close": "Close",
  "common.reopen": "Reopen",
  "common.back": "Back",
  "common.export": "Export",
  "common.import": "Import",
  "common.publish": "Publish",
  "common.preview": "Preview",
  "common.edit": "Edit",
  "common.points": "Points",
  "common.optional": "optional",
  "common.yes": "Yes",
  "common.no": "No",
  "common.confirm": "Confirm",
  "common.on": "On",
  "common.off": "Off",
  "common.done": "Done",

  // ============================================================
  // Home
  // ============================================================
  "home.title": "ProctorPal",
  "home.subtitle": "In-classroom online testing with tab-switch detection, copy/paste blocking, forced fullscreen, and a custom on-screen keyboard for tablets.",
  "home.imStudent": "I'm a student",
  "home.studentBlurb": "Enter your access code and student ID to start a test.",
  "home.imTeacher": "I'm a teacher",
  "home.teacherBlurb": "Build tests, monitor live sessions, grade responses.",

  // ============================================================
  // Auth
  // ============================================================
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

  // ============================================================
  // Student entry / waiting / runner / done
  // ============================================================
  "student.startTest": "Start a test",
  "student.entryHelp": "Enter the access code your teacher gave you, then your student ID.",
  "student.accessCode": "Access code",
  "student.studentId": "Student ID",
  "student.confirmIdentity": "Confirm identity",
  "student.continueToTest": "Continue to test",
  "student.signingInAs": "You're signing in as",
  "student.fixId": "If this is wrong, fix your student ID before continuing.",

  "waiting.title": "Waiting for your teacher",
  "waiting.body": "Your test will begin once your teacher admits you.",

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

  "done.title": "Submitted",
  "done.body": "Your responses have been saved. Your teacher will publish results.",

  // ============================================================
  // Teacher dashboard / nav
  // ============================================================
  "nav.classes": "Classes",
  "nav.tests": "Tests",

  "dashboard.classesTitle": "Classes",
  "dashboard.testsTitle": "Tests",
  "dashboard.manageClasses": "Manage classes",
  "dashboard.manageTests": "Manage tests",
  "dashboard.noClasses": "No classes yet. Create one to import your roster.",
  "dashboard.noTests": "No tests yet.",

  // ============================================================
  // Classes list / detail / gradebook
  // ============================================================
  "classes.title": "Classes",
  "classes.newPlaceholder": "New class name (e.g., Period 3 Biology)",
  "classes.studentsCount": "{n} students",
  "classes.empty": "No classes yet.",

  "classDetail.gradebookLink": "Gradebook",
  "classDetail.assignmentsTitle": "Tests assigned to this class",
  "classDetail.noAssignments": "No tests yet. Build a test, then publish it to this class from the test editor.",
  "classDetail.code": "Code",
  "classDetail.submittedOf": "{a}/{b} submitted",
  "classDetail.closed": "(closed)",
  "classDetail.monitor": "Monitor",
  "classDetail.grade": "Grade",
  "classDetail.addStudent": "Add student",
  "classDetail.idPlaceholder": "Student ID",
  "classDetail.namePlaceholder": "Display name",
  "classDetail.emailPlaceholder": "Email (optional)",
  "classDetail.bulkImport": "Bulk import (CSV)",
  "classDetail.downloadTemplate": "Download template",
  "classDetail.csvHelp": "Columns: student_id, display_name, email (email optional). Existing students with the same student_id are updated.",
  "classDetail.rosterCount": "Roster ({n})",
  "classDetail.rosterEmpty": "No students yet.",
  "classDetail.confirmRemove": "Remove this student from the class? Their existing test sessions stay intact.",
  "classDetail.duplicateId": "That student ID is already on this roster.",
  "classDetail.idAndNameRequired": "Student ID and name are required.",
  "classDetail.importedN": "Imported {n} students.",
  "classDetail.importFailed": "Import failed: {msg}",
  "classDetail.noValidRows": "No valid rows found in CSV.",

  "gradebook.title": "Gradebook",
  "gradebook.backToClass": "Back to class",
  "gradebook.exportCsv": "Export CSV",
  "gradebook.student": "Student",
  "gradebook.avgPct": "Avg %",
  "gradebook.ungraded": "ungraded",
  "gradebook.noTests": "No tests assigned to this class yet.",
  "gradebook.noStudents": "No students in this class.",
  "gradebook.legend": "Cells: 12/15 = published score, ungraded = submitted but not published, in progress / paused = active session, — = no session yet.",

  // ============================================================
  // Tests list / editor / preview
  // ============================================================
  "tests.title": "Tests",
  "tests.newPlaceholder": "New test title",
  "tests.newTest": "New test",
  "tests.import": "Import existing test",
  "tests.importBlurb": "Upload a JSON file (full structure, all 6 question types) or a CSV (one question per row, MC/TF/short/long only).",
  "tests.chooseFile": "Choose file...",
  "tests.downloadJson": "Download JSON template",
  "tests.downloadCsv": "Download CSV template",
  "tests.empty": "No tests yet.",
  "tests.statusDraft": "draft",
  "tests.statusPublished": "published",
  "tests.statusArchived": "archived",
  "tests.importing": "Importing...",
  "tests.invalidJson": "Invalid JSON file.",
  "tests.importFailed": "Import failed: {msg}",
  "tests.imported": "Imported. Redirecting to editor...",

  "editor.preview": "Preview",
  "editor.liveMonitor": "Live monitor",
  "editor.grade": "Grade",
  "editor.basics": "Basics",
  "editor.duration": "Duration (minutes)",
  "editor.resultsVisibility": "Results visibility",
  "editor.resultsAfterPublish": "After I publish them",
  "editor.resultsImmediate": "Immediately on submit",
  "editor.resultsAfterClose": "After test closes",
  "editor.shuffleQuestions": "Shuffle question order per student",
  "editor.proctoring": "Proctoring",
  "editor.proctoringHint": "Toggle individual rules below, or pick a preset. Use Practice mode to QA the test without fullscreen, focus, or paste blocking getting in your way.",
  "editor.preset.practice": "Practice mode",
  "editor.preset.practiceHint": "Everything off — for testing",
  "editor.preset.standard": "Standard",
  "editor.preset.standardHint": "Recommended classroom defaults",
  "editor.preset.strict": "Strict",
  "editor.preset.strictHint": "High-stakes / final exam",
  "editor.rule.fullscreen": "Require fullscreen",
  "editor.rule.fullscreenHint": "Test won't start until the student enters fullscreen. Pause on exit. iPads must use PWA mode instead.",
  "editor.rule.copyPaste": "Block copy / paste",
  "editor.rule.copyPasteHint": "Prevents copy, cut, paste, and the right-click menu inside the test.",
  "editor.rule.focus": "Detect tab / focus loss",
  "editor.rule.focusHint": "Pause the session when the student switches tabs, minimizes, or loses window focus.",
  "editor.rule.virtualKeyboard": "On-screen keyboard for tablets",
  "editor.rule.virtualKeyboardHint": "Replaces the OS keyboard on touch devices to suppress autocomplete and clipboard suggestions.",
  "editor.rule.admit": "Teacher admit",
  "editor.rule.admitHint": "Each student waits in a holding room until you click Admit on the live monitor.",
  "editor.draw": "Draw",
  "editor.drawOf": "of {n}",
  "editor.drawAll": "all",
  "editor.sectionPlaceholder": "Section instructions (optional)",
  "editor.deleteSection": "Delete section",
  "editor.confirmDeleteSection": "Delete this section and all its questions?",
  "editor.confirmDeleteQuestion": "Delete this question?",
  "editor.addSection": "+ Add section",
  "editor.publishToClass": "Publish to class",
  "editor.pickClass": "Pick a class first.",
  "editor.publishedCode": "Published. Access code: {code}",

  "qtype.multiple_choice": "Multiple choice",
  "qtype.true_false": "True / False",
  "qtype.short_answer": "Short answer",
  "qtype.long_answer": "Long answer",
  "qtype.matching": "Matching",
  "qtype.ordering": "Ordering",
  "qtype.add": "+ {label}",

  "qedit.promptPlaceholder": "Question prompt",
  "qedit.imagePlaceholder": "Image URL (optional)",
  "qedit.youtubePlaceholder": "YouTube video ID (optional)",
  "qedit.allowMultiCorrect": "Allow multiple correct answers",
  "qedit.option": "Option {n}",
  "qedit.addOption": "+ Add option",
  "qedit.correctAnswer": "Correct answer",
  "qedit.acceptedAnswers": "Accepted answers (any match earns full credit):",
  "qedit.modeExact": "Exact",
  "qedit.modeCi": "Case-insensitive",
  "qedit.modeWs": "Whitespace-tolerant",
  "qedit.modeContains": "Contains",
  "qedit.addAccepted": "+ Add accepted answer",
  "qedit.tolerance": "Numeric tolerance (optional, ± of accepted numeric values):",
  "qedit.rubric": "Rubric (visible only to you when grading):",
  "qedit.leftItems": "Left items",
  "qedit.rightItems": "Right items",
  "qedit.correctPairs": "Correct pairs (pick one right item per left item):",
  "qedit.unnamed": "(unnamed)",
  "qedit.pickOne": "— pick —",
  "qedit.itemsInOrder": "Items in correct order (top = first):",
  "qedit.addItem": "+ Add item",

  "preview.banner": "Preview mode — nothing is saved or recorded. Fullscreen, focus detection, and copy/paste blocking are off.",
  "preview.exit": "Exit preview",
  "preview.testPreview": "Test (preview)",
  "preview.endPreview": "End preview",
  "preview.empty": "This test has no questions yet.",
  "preview.backToEditor": "Back to editor",

  // ============================================================
  // Live monitor
  // ============================================================
  "monitor.backToTest": "Back to test",
  "monitor.accessCode": "Access code",
  "monitor.waiting": "Waiting",
  "monitor.active": "Active",
  "monitor.paused": "Paused",
  "monitor.submitted": "Submitted",
  "monitor.colStudent": "Student",
  "monitor.colStatus": "Status",
  "monitor.colTimeLeft": "Time left",
  "monitor.colProgress": "Progress",
  "monitor.colViolations": "Violations",
  "monitor.colActions": "Actions",
  "monitor.admit": "Admit",
  "monitor.pause": "Pause",
  "monitor.resume": "Resume",
  "monitor.unlockDevice": "Unlock device",
  "monitor.empty": "No sessions yet. Share the access code with your class.",
  "monitor.status.in_progress": "in progress",
  "monitor.status.paused": "paused",
  "monitor.status.pending_admit": "pending admit",
  "monitor.status.submitted": "submitted",
  "monitor.status.auto_submitted": "auto submitted",
  "monitor.status.voided": "voided",

  // ============================================================
  // Grading
  // ============================================================
  "grading.backToTest": "Back to test",
  "grading.publishGrades": "Publish grades",
  "grading.toReview": "{n} to review",
  "grading.noSubmissions": "No submissions yet.",
  "grading.pickStudent": "Pick a student to start grading.",
  "grading.studentResponse": "Student response",
  "grading.auto": "Auto",
  "grading.worth": "Worth",
  "grading.score": "Score",
  "grading.scorePlaceholder": "Score",
  "grading.commentPlaceholder": "Comment (optional)",
  "grading.noAnswer": "No answer",
  "grading.empty": "(empty)",
  "grading.publishedN": "Published {n} grade(s).",
  "grading.publishFailed": "Could not publish",
};

// Korean dictionary - same keys, translated values.
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
  "common.add": "추가",
  "common.remove": "제거",
  "common.delete": "삭제",
  "common.close": "마감",
  "common.reopen": "재개방",
  "common.back": "뒤로",
  "common.export": "내보내기",
  "common.import": "가져오기",
  "common.publish": "공개",
  "common.preview": "미리보기",
  "common.edit": "편집",
  "common.points": "점수",
  "common.optional": "선택",
  "common.yes": "예",
  "common.no": "아니오",
  "common.confirm": "확인",
  "common.on": "켜짐",
  "common.off": "꺼짐",
  "common.done": "완료",

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

  // Student
  "student.startTest": "시험 시작",
  "student.entryHelp": "선생님이 알려주신 접속 코드와 학번을 입력하세요.",
  "student.accessCode": "접속 코드",
  "student.studentId": "학번",
  "student.confirmIdentity": "신원 확인",
  "student.continueToTest": "시험으로 이동",
  "student.signingInAs": "다음 학생으로 로그인합니다",
  "student.fixId": "이 정보가 틀렸다면, 계속하기 전에 학번을 수정하세요.",

  "waiting.title": "선생님을 기다리는 중",
  "waiting.body": "선생님이 입장을 허가하면 시험이 시작됩니다.",

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

  "done.title": "제출 완료",
  "done.body": "답안이 저장되었습니다. 선생님이 결과를 공개할 예정입니다.",

  // Teacher nav / dashboard
  "nav.classes": "수업",
  "nav.tests": "시험",

  "dashboard.classesTitle": "수업",
  "dashboard.testsTitle": "시험",
  "dashboard.manageClasses": "수업 관리",
  "dashboard.manageTests": "시험 관리",
  "dashboard.noClasses": "아직 수업이 없습니다. 수업을 만들어 학생 명단을 가져오세요.",
  "dashboard.noTests": "아직 시험이 없습니다.",

  // Classes
  "classes.title": "수업",
  "classes.newPlaceholder": "새 수업 이름 (예: 3교시 생물)",
  "classes.studentsCount": "학생 {n}명",
  "classes.empty": "아직 수업이 없습니다.",

  "classDetail.gradebookLink": "성적부",
  "classDetail.assignmentsTitle": "이 수업에 배정된 시험",
  "classDetail.noAssignments": "아직 시험이 없습니다. 시험을 만든 후, 시험 편집기에서 이 수업에 공개하세요.",
  "classDetail.code": "코드",
  "classDetail.submittedOf": "{a}/{b} 제출",
  "classDetail.closed": "(마감됨)",
  "classDetail.monitor": "모니터",
  "classDetail.grade": "채점",
  "classDetail.addStudent": "학생 추가",
  "classDetail.idPlaceholder": "학번",
  "classDetail.namePlaceholder": "표시 이름",
  "classDetail.emailPlaceholder": "이메일 (선택)",
  "classDetail.bulkImport": "일괄 가져오기 (CSV)",
  "classDetail.downloadTemplate": "템플릿 다운로드",
  "classDetail.csvHelp": "열: student_id, display_name, email (이메일은 선택 사항). 동일한 student_id를 가진 기존 학생은 업데이트됩니다.",
  "classDetail.rosterCount": "학생 명단 ({n}명)",
  "classDetail.rosterEmpty": "아직 학생이 없습니다.",
  "classDetail.confirmRemove": "이 학생을 수업에서 제거하시겠습니까? 기존 시험 세션은 그대로 유지됩니다.",
  "classDetail.duplicateId": "해당 학번은 이미 이 명단에 있습니다.",
  "classDetail.idAndNameRequired": "학번과 이름은 필수입니다.",
  "classDetail.importedN": "{n}명의 학생을 가져왔습니다.",
  "classDetail.importFailed": "가져오기 실패: {msg}",
  "classDetail.noValidRows": "CSV에서 유효한 행을 찾을 수 없습니다.",

  "gradebook.title": "성적부",
  "gradebook.backToClass": "수업으로 돌아가기",
  "gradebook.exportCsv": "CSV로 내보내기",
  "gradebook.student": "학생",
  "gradebook.avgPct": "평균 %",
  "gradebook.ungraded": "미채점",
  "gradebook.noTests": "이 수업에 아직 시험이 배정되지 않았습니다.",
  "gradebook.noStudents": "이 수업에 학생이 없습니다.",
  "gradebook.legend": "셀: 12/15 = 공개된 점수, 미채점 = 제출했으나 미공개, 진행 중 / 일시정지 = 활성 세션, — = 세션 없음.",

  // Tests
  "tests.title": "시험",
  "tests.newPlaceholder": "새 시험 제목",
  "tests.newTest": "새 시험",
  "tests.import": "기존 시험 가져오기",
  "tests.importBlurb": "JSON 파일(전체 구조, 6개 문제 유형 모두 지원) 또는 CSV(한 행에 한 문제, 객관식/참거짓/단답/장문만 지원)를 업로드하세요.",
  "tests.chooseFile": "파일 선택...",
  "tests.downloadJson": "JSON 템플릿 다운로드",
  "tests.downloadCsv": "CSV 템플릿 다운로드",
  "tests.empty": "아직 시험이 없습니다.",
  "tests.statusDraft": "초안",
  "tests.statusPublished": "공개됨",
  "tests.statusArchived": "보관됨",
  "tests.importing": "가져오는 중...",
  "tests.invalidJson": "잘못된 JSON 파일입니다.",
  "tests.importFailed": "가져오기 실패: {msg}",
  "tests.imported": "가져왔습니다. 편집기로 이동 중...",

  "editor.preview": "미리보기",
  "editor.liveMonitor": "실시간 모니터",
  "editor.grade": "채점",
  "editor.basics": "기본 설정",
  "editor.duration": "시험 시간 (분)",
  "editor.resultsVisibility": "결과 공개",
  "editor.resultsAfterPublish": "내가 공개한 후",
  "editor.resultsImmediate": "제출 즉시",
  "editor.resultsAfterClose": "시험 마감 후",
  "editor.shuffleQuestions": "학생별 문제 순서 섞기",
  "editor.proctoring": "감독",
  "editor.proctoringHint": "아래에서 개별 규칙을 토글하거나 프리셋을 선택하세요. 시험을 점검할 때는 전체 화면, 포커스 감지, 붙여넣기 차단이 방해되지 않도록 연습 모드를 사용하세요.",
  "editor.preset.practice": "연습 모드",
  "editor.preset.practiceHint": "모두 끔 — 점검용",
  "editor.preset.standard": "표준",
  "editor.preset.standardHint": "권장 교실 기본값",
  "editor.preset.strict": "엄격",
  "editor.preset.strictHint": "중요 시험 / 기말고사",
  "editor.rule.fullscreen": "전체 화면 강제",
  "editor.rule.fullscreenHint": "학생이 전체 화면에 진입할 때까지 시험이 시작되지 않습니다. 종료 시 일시정지. iPad는 PWA 모드를 사용해야 합니다.",
  "editor.rule.copyPaste": "복사 / 붙여넣기 차단",
  "editor.rule.copyPasteHint": "시험 중 복사, 잘라내기, 붙여넣기, 우클릭 메뉴를 차단합니다.",
  "editor.rule.focus": "탭 / 포커스 이탈 감지",
  "editor.rule.focusHint": "학생이 탭을 전환하거나, 최소화하거나, 창 포커스를 잃으면 세션을 일시정지합니다.",
  "editor.rule.virtualKeyboard": "태블릿용 자체 키보드",
  "editor.rule.virtualKeyboardHint": "터치 기기에서 OS 키보드를 대체하여 자동 완성과 클립보드 제안을 차단합니다.",
  "editor.rule.admit": "교사 승인",
  "editor.rule.admitHint": "각 학생은 교사가 실시간 모니터에서 승인을 클릭할 때까지 대기실에서 기다립니다.",
  "editor.draw": "추출",
  "editor.drawOf": "{n} 중",
  "editor.drawAll": "전체",
  "editor.sectionPlaceholder": "섹션 안내 (선택)",
  "editor.deleteSection": "섹션 삭제",
  "editor.confirmDeleteSection": "이 섹션과 모든 문제를 삭제하시겠습니까?",
  "editor.confirmDeleteQuestion": "이 문제를 삭제하시겠습니까?",
  "editor.addSection": "+ 섹션 추가",
  "editor.publishToClass": "수업에 공개",
  "editor.pickClass": "먼저 수업을 선택하세요.",
  "editor.publishedCode": "공개됨. 접속 코드: {code}",

  "qtype.multiple_choice": "객관식",
  "qtype.true_false": "참 / 거짓",
  "qtype.short_answer": "단답형",
  "qtype.long_answer": "서술형",
  "qtype.matching": "짝짓기",
  "qtype.ordering": "순서 정렬",
  "qtype.add": "+ {label}",

  "qedit.promptPlaceholder": "문제 내용",
  "qedit.imagePlaceholder": "이미지 URL (선택)",
  "qedit.youtubePlaceholder": "유튜브 영상 ID (선택)",
  "qedit.allowMultiCorrect": "복수 정답 허용",
  "qedit.option": "선택지 {n}",
  "qedit.addOption": "+ 선택지 추가",
  "qedit.correctAnswer": "정답",
  "qedit.acceptedAnswers": "정답 인정 (일치하는 것이 있으면 만점):",
  "qedit.modeExact": "완전 일치",
  "qedit.modeCi": "대소문자 무시",
  "qedit.modeWs": "공백 허용",
  "qedit.modeContains": "포함",
  "qedit.addAccepted": "+ 정답 추가",
  "qedit.tolerance": "수치 허용 오차 (선택, 인정 수치 ± 범위):",
  "qedit.rubric": "채점 기준 (채점 시 교사에게만 표시):",
  "qedit.leftItems": "왼쪽 항목",
  "qedit.rightItems": "오른쪽 항목",
  "qedit.correctPairs": "정답 짝 (왼쪽 항목당 오른쪽 항목 하나 선택):",
  "qedit.unnamed": "(이름 없음)",
  "qedit.pickOne": "— 선택 —",
  "qedit.itemsInOrder": "올바른 순서대로 항목 (위 = 처음):",
  "qedit.addItem": "+ 항목 추가",

  "preview.banner": "미리보기 모드 — 저장되거나 기록되지 않습니다. 전체 화면, 포커스 감지, 복사/붙여넣기 차단이 모두 꺼져 있습니다.",
  "preview.exit": "미리보기 종료",
  "preview.testPreview": "시험 (미리보기)",
  "preview.endPreview": "미리보기 끝내기",
  "preview.empty": "이 시험에는 아직 문제가 없습니다.",
  "preview.backToEditor": "편집기로 돌아가기",

  // Monitor
  "monitor.backToTest": "시험으로 돌아가기",
  "monitor.accessCode": "접속 코드",
  "monitor.waiting": "대기 중",
  "monitor.active": "응시 중",
  "monitor.paused": "일시정지",
  "monitor.submitted": "제출됨",
  "monitor.colStudent": "학생",
  "monitor.colStatus": "상태",
  "monitor.colTimeLeft": "남은 시간",
  "monitor.colProgress": "진행도",
  "monitor.colViolations": "위반",
  "monitor.colActions": "조치",
  "monitor.admit": "승인",
  "monitor.pause": "일시정지",
  "monitor.resume": "재개",
  "monitor.unlockDevice": "기기 잠금 해제",
  "monitor.empty": "아직 세션이 없습니다. 학생들에게 접속 코드를 공유하세요.",
  "monitor.status.in_progress": "응시 중",
  "monitor.status.paused": "일시정지",
  "monitor.status.pending_admit": "승인 대기",
  "monitor.status.submitted": "제출됨",
  "monitor.status.auto_submitted": "자동 제출",
  "monitor.status.voided": "무효",

  // Grading
  "grading.backToTest": "시험으로 돌아가기",
  "grading.publishGrades": "성적 공개",
  "grading.toReview": "검토 {n}건",
  "grading.noSubmissions": "아직 제출된 답안이 없습니다.",
  "grading.pickStudent": "채점할 학생을 선택하세요.",
  "grading.studentResponse": "학생 답안",
  "grading.auto": "자동",
  "grading.worth": "배점",
  "grading.score": "점수",
  "grading.scorePlaceholder": "점수",
  "grading.commentPlaceholder": "코멘트 (선택)",
  "grading.noAnswer": "답안 없음",
  "grading.empty": "(비어 있음)",
  "grading.publishedN": "성적 {n}건 공개.",
  "grading.publishFailed": "공개 실패",
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
