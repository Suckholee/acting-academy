# 김정태 배우아카데미 · KIM JUNG TAE ACTING ACADEMY

실제 배포 디자인을 보관한 `published-source/`에 컴포넌트 편집기를 결합합니다. `npm run build`의 출력과 Vercel 배포 경로는 `dist-published/`입니다. 관리자 운영 설정과 로컬 검수는 [컴포넌트 편집 안내](docs/component-editor-setup.md)를 확인하세요.

`npm run preview:published -- --demo` → http://127.0.0.1:4174 (테스트 비밀번호 `preview-only`, 메모리 저장). 운영에서는 서버 인증과 Supabase 설정이 필요합니다.

관리자 화면의 **오늘 방문자 / 누적 방문자**는 서버의 전용 연결키 설정 후 페이지 안에서 확인합니다. 상세 통계는 **방문 통계 ↗**에서 Vercel Web Analytics로 확인합니다. 공개 홈페이지와 특강 신청 화면을 집계하며 관리자·계정·개발 화면과 현재 주소의 쿼리·해시는 제외합니다. 집계 범위와 운영 설정은 [방문 통계 안내](docs/visitor-analytics.md)를 확인하세요.

관리자 메뉴의 **상담실**은 `/admin/consultation`에서 수강생별 상담방을 관리합니다. 수강생 정보·자료 배정 → 스와이프와 페이지 필기 → 상담일지 저장·완료로 이어집니다. 자료와 기록은 기존 관리자 인증 뒤에서만 제공됩니다. 운영 테이블 적용·자료 교체·검수 방법은 [상담실 안내](docs/consultation-viewer.md)를 확인하세요.

교육과정은 `content/courses.json`의 회의 반영 6개 반을 기준으로 빌드합니다. 메인·교육과정 목록·추천·상세 안내·사이트맵에 함께 반영하며, 세부 커리큘럼과 반별 일정은 추후 안내로 표시합니다.

아래 React/Vite 안내와 기존 정적 생성 스크립트는 이전 개발 구성에 대한 참고 자료입니다. 실제 배포용 컴포넌트 편집기와 인증 방식은 위 안내를 따릅니다.

## React + Vite 개발 서버 및 인라인 관리자 (kFSSEC 스타일)

- `npm run dev` 실행 시 `http://localhost:5173`에서 실행됩니다.
- **다국어 지원 (i18n)**:
  - 헤더의 언어 드롭다운 또는 관리자 상단 툴바에서 **한국어(KO) / 영어(EN) / 일본어(JA) / 중국어(ZH)** 로 실시간 언어 전환이 가능합니다.
- **kFSSEC 스타일 인라인 관리자 라이브 편집기**:
  - 이전 React 관리자 로그인은 비활성화되었습니다. 실제 운영 홈페이지의 관리자 모드 또는 `/admin/members`에서 서버 인증을 사용합니다.
  - **인라인 텍스트 수정**: 화면 상의 텍스트를 마우스로 클릭하여 바로 타이핑하여 수정 (`Tab`키로 다음 문구 이동, `Esc`로 취소)
  - **인라인 이미지 교체**: 이미지 위에 마우스를 올리고 [이미지 교체] 클릭 시 URL 변경 또는 파일 업로드 가능
  - **상단 라이브 툴바**:
    - `편집 모드 ON/OFF`: 라이브 인라인 편집 토글
    - `가이드 ON/OFF`: 수정 가능한 영역의 점선 테두리 및 펜 아이콘 강조 토글
    - `방문자 시점`: 편집선 없는 실제 사용자 화면 미리보기
    - `지금 화면 저장`: 수정사항을 로컬/스토리지에 영구 저장
    - `되돌리기`: 저장되지 않은 수정사항 취소
    - `관리 서랍`: 상담 신청 내역(신규/상담중/등록완료 상태 변경 및 메모) 실시간 확인, 기본 학원 정보 수정, JSON 백업/복원
    - `로그아웃`: 관리자 모드 종료

## Local preview (Legacy Static)

Run `node scripts/dev.cjs` and open http://127.0.0.1:4173. The preview includes the consultation API and clean course URLs.

## Validation

Run `node --check dist/app.js`, `node --check dist/experience.js`, and `node --test tests/consultations.test.cjs`.

## Consultation delivery

`api/consultations.js` is a Vercel serverless function. Without a destination it returns 503 and never claims an application was received. Personal information is not saved in browser storage or written to logs.

Before accepting real requests, configure an HTTPS `CONSULTATION_WEBHOOK_URL` and optional `CONSULTATION_WEBHOOK_TOKEN` in Vercel, finalize the operator/privacy retention notice in `dist/index.html`, and replace the preparation notice. The receiving service must persist or deliver the request and return a successful HTTP response only on acceptance. Requests include a generated ID, name, phone, selected purposes/courses, consent, and timestamp. No production recipient is configured yet.

Course descriptions and coach profiles are mockups. Replace them with approved business details before commercial launch. The hero film is an animated AI mockup photograph, not footage of real students. Reference facility photos do not depict the actual academy.

## Motion

Native sticky scroll stages, IntersectionObserver reveals, requestAnimationFrame parallax, CSS portrait marquee, native scroll-snap galleries, and a local MP4 background. Motion respects system reduced-motion preferences. The global pause button stops decorative motion, galleries, and video; each gallery also has its own playback control. No scroll hijacking library is used.

### 강사소개 페이지
`/trainers`에서 분야 필터를 이용하고 `/trainers/foundation`, `/trainers/camera`, `/trainers/audition`, `/trainers/scene`에서 프로필을 확인할 수 있습니다. 현재 인물과 소개는 예시이며 실제 강사의 경력으로 표시하지 않습니다.

문구와 분야별 데이터를 `content/trainers.json`에서 수정한 뒤 `node scripts/build-trainers.cjs`로 정적 페이지를 다시 생성합니다. 스타일과 필터/등장 효과는 `dist/faculty.css`, `dist/faculty.js`에서 관리합니다. 실제 인물 등록 시 생성 스크립트의 사진 및 학력·경력 항목도 함께 교체하세요.

## Private material collection

`/materials` provides separate operator/trainer forms, explicit account-based draft saving, private attachments, submission status and reviewer notes. It is not linked from the public navigation. With no Supabase configuration it displays a setup notice and a non-submitting form preview.

Run `npm ci && npm run build` before local preview; `npm test` includes PostgreSQL RLS checks using PGlite. `src/materials/` is the editable client source; `dist/materials-app.js` is bundled output. Vercel builds it automatically.

Apply `supabase/migrations/20261005_material_collection.sql` to a new Supabase project, configure public connection variables, email delivery and invited members. See `docs/자료제출_연결안내.txt` for setup. No Supabase project is connected yet; real Auth/Storage integration remains to be verified after connection. Never put service-role/secret keys into the public configuration endpoint.

## 회원 서비스

`/login`, `/signup`, `/account`, `/reset-password`, `/admin/members` 페이지를 제공합니다. [회원 인증 연결 안내](docs/member-auth-setup.md)에 AXYZ 기준과 계정 연결 정책, 운영 설정·미검증 사항을 정리했습니다. 회원가입만으로 관리자 권한을 얻을 수 없습니다.

## AI 상담 및 관리자 작업실

홈페이지의 AI 상담과 `/admin/ai` 작업실을 제공합니다. 로컬 예시 시연 및 실제 AI 연결 조건은 [AI 연결 안내](docs/ai-assistant-setup.md)를 확인하세요.

## 첫 화면 특강 팝업

메인 팝업의 첫 이미지는 다운로드 폴더의 `메타광고 포스터3.png`에서 만든 `published-source/assets/events/november-2026/meta-poster-3.webp`입니다. 11월 첫 개강·1기 모집 안내와 `/apply` 수강·상담 신청 버튼을 먼저 표시하고, 기존 무료특강 포스터 두 장도 탭으로 선택할 수 있습니다. 포스터를 바꾸면 제목과 신청 링크가 해당 안내에 맞게 함께 바뀝니다. 새 포스터용 하루 숨김 키를 사용하므로 기존 특강 팝업을 숨겼던 방문자도 새 개강 안내를 볼 수 있습니다.

`published-source/event-popup.js`와 `event-popup.css`에서 첫 화면의 이미지 팝업을 관리합니다. 원본 이미지 두 장은 `published-source/assets/events/respect-for-acting-20261107-free40/`의 `poster.png`, `announcement.png`입니다. 다운로드 폴더에서 이동했으며 빌드 시 배포 폴더에 함께 포함됩니다. 이미지 선택 버튼으로 전환하고 닫기·Esc·바깥 배경 클릭으로 닫을 수 있습니다. ‘오늘 하루 보지 않기’는 브라우저에 한국 시간 기준 날짜를 저장하여 자정까지 숨깁니다. 관리자 편집 주소(`?admin=1`)에서는 자동 표시하지 않습니다.

## 메인 소개 영상

`#instructor-video`의 ‘배우의 길을 함께 걷는 사람들.’ 영역은 다운로드 폴더의 `김정태배우아카데미 영상.mp4`를 사용합니다. 웹용 1080p H.264/AAC 파일은 `published-source/assets/videos/academy-main-20261029.mp4`, 실제 영상에서 추출한 표지는 같은 폴더의 `.jpg`입니다. 소리를 포함하며 방문자가 재생 버튼을 눌러 재생합니다. 모바일 인라인 재생과 전체화면을 지원하고, 처음에는 메타데이터만 불러옵니다. 관리자 편집기의 영상 기본값에도 연결되어 변경 취소 시 원래 영상으로 돌아옵니다.

영상 크기는 화면 높이에서 상단 메뉴와 하단 상담 바 공간을 제외해 맞춥니다. `published-source/video-viewing.js`는 재생 시 영상을 화면 가운데로 맞추고 고정 메뉴·상담·언어 버튼을 숨깁니다. 일시정지·종료·오류 또는 영상 영역을 벗어나면 버튼이 다시 보이며, 관리자 편집 화면에는 적용하지 않습니다.

## 배포 홈페이지 언어 선택

공개 페이지의 🌐 메뉴에서 한국어·영어·일본어·중국어를 선택합니다. 선택은 브라우저에 저장되며 페이지 이동 후에도 유지됩니다. 주요 메뉴·등록된 소개 문구·과정명을 번역하며, 미등록 문구는 한국어로 표시하고 외국어 선택 시 이를 안내합니다. 번역은 `src/i18n/translations.json`, 공개 페이지 연결은 `src/i18n/published.js`에서 관리합니다. 새로 표시되는 문구도 처리하며 관리자 편집 화면에는 적용하지 않습니다. `npm run build`로 배포 파일에 반영됩니다.

## 11/7 무료특강 전용 신청

- 공유 주소: `/events/kim-jung-tae-20261107` (팝업의 신청 버튼에서 연결).
- 전용 명단: `/admin/event-applications` — 기존 관리자 로그인 필요. 접수순 조회, 이름·연락처 검색, CSV 다운로드.
- `api/event-application.js`에서 이름·연락처·연령대·성별·관심 분야·연기 경험·사전 질문·동의를 검증하고 고정된 특강 식별자로 저장합니다. 일반 수강 상담의 `/api/admin-inquiries`에서는 `무료특강 신청` 항목을 제외합니다.
- 정원 40명 이내 접수와 이후 대기를 구분해 표시합니다. 참석은 운영자가 접수순으로 확인하고 개별 확정 안내하며 자동 연락은 보내지 않습니다. 11월 7일 오후 2시부터 신규 신청을 종료합니다.
- 특강 개인정보는 고지한 대로 특강 종료 후 30일 이내 운영자가 파기하고 CSV 사본도 함께 삭제해야 합니다.

## 오디션 공고 · 배우 지원 접수

`/auditions`에서 공고·배역·지원서를 제공하며 `/admin/casting`에서 공고·지원자·프로필·시간표·안내문·보고서를 관리합니다. 마지막에는 오디션 후 학원 상담 안내 선택 동의가 있습니다. [사용 및 운영 안내](docs/casting-setup.md)를 확인하세요.
