# hilly_po — 힐리힐리 지도만들기 (유저용 웹)

힐리힐리 앱 유저가 웹에서 직접 코스지도/스탬프지도를 만드는 사이트.
TurfHunt 스타일: 지도 클릭 체크포인트 배치 · 설명/사진/객관식 퀴즈 · GPS 도착 반경 · GPX 업로드.

## 스택

- Next.js 15 (App Router) + TypeScript + Tailwind 3.4 + shadcn/ui (hilly_home과 동일 구성 — 컴포넌트 상호 이식 가능)
- Mapbox GL JS 3 (`outdoors-v12`, 한국어 라벨: `lib/mapbox-locale.ts`)
- Supabase (앱과 **공유 prod 프로젝트**): `@supabase/supabase-js` + `@supabase/ssr`, 전화번호 OTP 로그인, RLS(`created_by = auth.uid()`)가 보안 경계 — service role 키 없음

## 개발

```bash
pnpm install
pnpm dev        # http://localhost:3200
```

`.env.local`: `.env.example` 참고 (Supabase URL/anon key는 hilly_rn, Mapbox 토큰은 hilly_home과 동일 값).

## 구조

- `app/maps` — 대시보드(내 지도) / `new` 생성 위저드 / `[id]/edit` 에디터 (map_type에 따라 Course/StampEditor 분기)
- `components/map` — hilly_home에서 이식한 Mapbox 컴포넌트 + 도착 반경 원 레이어(`radius-layer.ts`)
- `components/editor` — 에디터 UI (QuizForm, RadiusControl, PhotoUploader)
- `lib/repos` — hilly_rn 저장소 레이어의 웹 포트 (insert 컬럼 구성은 라이브 RLS로 검증된 형태 유지)
- `lib/gpx-prep.ts` — 의존성 없는 GPX 파서 (hilly_rn/hilly_home과 동일 알고리즘 → distance_km 등 값 일치)

## DB 마이그레이션

마이그레이션은 **hilly_rn/supabase/migrations/** 이 단일 소스 (`supabase/README.md` 참고).
이 프로젝트가 필요로 하는 컬럼: `radius_m`, `quiz_question/quiz_choices/quiz_answer_index` (trail_checkpoints, stamp_points).

## 디자인

- 앱 디자인 시스템 계승: 다크 모노크롬(#121212 canvas) + 브랜드 레드 #DC2F55(핵심 CTA만) + Pretendard
- `.agents/skills/design-taste-frontend` (taste-skill) 가이드 적용
