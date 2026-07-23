# Supabase 마이그레이션 위치 안내

이 레포는 자체 마이그레이션 디렉터리를 갖지 않습니다.
DB 스키마의 단일 소스는 **`../hilly_rn/supabase/migrations/`** 입니다.

hilly_po가 필요로 하는 마이그레이션:

- `20260723000001_point_arrival_radius.sql` — trail_checkpoints/stamp_points에 `radius_m`
- `20260723000002_point_quiz.sql` — 객관식 퀴즈 컬럼 (`quiz_question`, `quiz_choices`, `quiz_answer_index`)

적용 방법 (hilly_rn/CLAUDE.md 참고):

```bash
cd ../hilly_rn
supabase link --project-ref sblutnaukpjxpmkcbvct   # prod
printf 'Y\n' | supabase db push
```
