# 01. 시스템 구성 및 구현 범위

## 1. 시스템 구조
정적 프론트엔드(HTML/CSS/Vanilla JS) → Vercel Node.js Function → OpenAI API → 결과 검증 → Supabase 저장 → 브라우저에 결과 응답.

브라우저는 OpenAI 또는 Supabase 관리자 권한으로 직접 통신하지 않는다.

## 2. 권장 파일 구조
```text
/
├─ AGENTS.md
├─ PRD.md
├─ package.json
├─ vercel.json
├─ .gitignore
├─ .env.example
├─ index.html
├─ css/
│  └─ styles.css
├─ js/
│  └─ app.js
├─ api/
│  └─ analyze.js
├─ lib/
│  ├─ openai.js
│  ├─ supabase.js
│  └─ validation.js
├─ supabase/
│  └─ schema.sql
└─ docs/
   ├─ 01-architecture-and-scope.md
   ├─ 02-ui-design.md
   ├─ 03-frontend-implementation.md
   ├─ 04-backend-api.md
   ├─ 05-openai-integration.md
   └─ 06-testing-deployment.md
```
에이전트는 이 구조를 기본안으로 사용하되, 기존 저장소에 구조가 이미 있다면 불필요하게 파일을 이동하지 않는다.

## 3. 데이터 흐름
1. `index.html`의 텍스트 영역에 사용자가 문장을 입력한다.
2. `js/app.js`가 길이와 공백을 1차 확인한다.
3. `POST /api/analyze`에 JSON 요청을 보낸다.
4. `api/analyze.js`가 서버 측에서 입력을 다시 검증한다.
5. `lib/openai.js`가 OpenAI API에 고정된 시스템 지침과 사용자 문장을 전달한다.
6. AI 결과를 JSON 스키마 및 값 범위로 검증한다.
7. `lib/supabase.js`가 분석 결과를 저장한다.
8. 저장 성공 여부와 분석 결과를 API 응답으로 전달한다.
9. 브라우저가 결과 카드와 저장 상태를 표시한다.

## 4. 책임 분리
- HTML: 의미 구조와 콘텐츠
- CSS: 색상, 레이아웃, 반응형 및 상태 스타일
- `js/app.js`: 입력, 로딩, API 요청, 결과 렌더링
- `api/analyze.js`: 요청/응답, 상태 코드, 서버 검증
- `lib/validation.js`: 공통 서버 입력/출력 검증
- `lib/openai.js`: OpenAI 호출과 프롬프트
- `lib/supabase.js`: DB 저장
- Supabase: 영속 데이터 저장

## 5. 범위 제약
- SPA 프레임워크 없이 단일 페이지로 구현한다.
- Node.js API는 Vercel Functions 환경에서 실행한다.
- 회원 기능과 사용자별 데이터 조회는 구현하지 않는다.
- 분석 기록 조회 UI는 구현하지 않는다.
- 기본 입력 제한은 2,000자다.
- 기본 UI 언어는 한국어다.
- 입력 문장은 OpenAI로 전송되고 Supabase에 저장될 수 있으므로 사용 전에 이를 안내한다.
- 외부 API 비용과 Vercel/Supabase 사용량은 사용자 계정 설정에 따른다.

## 6. 명시적으로 결정하지 않은 사항
- OpenAI 모델명은 환경변수 `OPENAI_MODEL`로 설정한다. 기본값을 코드에 둘 경우 문서에 사용 모델을 기록하고, 모델 변경은 임의로 하지 않는다.
- 배포 도메인, 프로젝트 ID, API 키는 사용자 계정에서 제공한다.
- 보존 기간/자동 삭제 정책은 별도 결정 전까지 임의로 만들지 않는다. 사용자에게 DB에 저장된다는 점을 안내한다.
