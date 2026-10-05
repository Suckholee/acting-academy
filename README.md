# 김정태 배우아카데미 · KIM JUNG TAE ACTING ACADEMY

Static HTML/CSS/JavaScript site. GitHub `main` deploys to Vercel, with `dist` as the output directory. No Sites deployment is needed.

## Local preview

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
