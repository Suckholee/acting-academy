# 김정태 배우아카데미 · KIM JUNG TAE ACTING ACADEMY

실제 배포 디자인을 보관한 `published-source/`에 컴포넌트 편집기를 결합합니다. `npm run build`의 출력과 Vercel 배포 경로는 `dist-published/`입니다. 관리자 운영 설정과 로컬 검수는 [컴포넌트 편집 안내](docs/component-editor-setup.md)를 확인하세요.

`npm run preview:published -- --demo` → http://127.0.0.1:4174 (테스트 비밀번호 `preview-only`, 메모리 저장). 운영에서는 서버 인증과 Supabase 설정이 필요합니다.

교육과정은 `content/courses.json`의 확정 6개 반을 기준으로 빌드합니다. 메인·교육과정 목록·추천·상세 안내·사이트맵에 함께 반영하며, 세부 커리큘럼과 반별 일정은 추후 안내로 표시합니다.

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

`published-source/event-popup.js`와 `event-popup.css`에서 첫 화면의 이미지 팝업을 관리합니다. 원본 이미지 두 장은 `published-source/assets/events/respect-for-acting-20261024/`의 `poster.png`, `announcement.png`입니다. 다운로드 폴더에서 이동했으며 빌드 시 배포 폴더에 함께 포함됩니다. 이미지 선택 버튼으로 전환하고 닫기·Esc·바깥 배경 클릭으로 닫을 수 있습니다. ‘오늘 하루 보지 않기’는 브라우저에 한국 시간 기준 날짜를 저장하여 자정까지 숨깁니다. 관리자 편집 주소(`?admin=1`)에서는 자동 표시하지 않습니다.
