# 김정태 연기아카데미 · KIM JUNG TAE ACTING ACADEMY

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
