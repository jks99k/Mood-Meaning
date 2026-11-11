# 04. 백엔드 및 API 계약

## 1. 실행 환경
Node.js 기반 Vercel Function을 사용한다. 권장 엔드포인트 파일은 `api/analyze.js`이며 HTTP 메서드는 `POST`만 허용한다.

## 2. 요청 계약
`POST /api/analyze`

요청 헤더:
```http
Content-Type: application/json
```

요청 본문:
```json
{
  "text": "오늘은 정말 즐거운 하루였어."
}
```

검증:
- JSON 본문이어야 한다.
- `text`는 문자열이어야 한다.
- trim 이후 빈 문자열이면 거부한다.
- trim 이후 길이가 2,000자를 초과하면 거부한다.
- 요청 크기와 실행 시간은 Vercel 플랫폼 제한 안에서 처리한다.
- 지원하지 않는 메서드는 `405`를 반환한다.

## 3. 성공 응답 계약
HTTP `200`
```json
{
  "success": true,
  "result": {
    "sentiment": "positive",
    "confidence": 92,
    "reason": "즐겁고 만족스러운 감정을 직접 표현하고 있습니다."
  },
  "saved": true
}
```

필드:
- `sentiment`: `positive | negative | neutral`
- `confidence`: 0~100 정수
- `reason`: 비어 있지 않은 짧은 문자열
- `saved`: Supabase 저장 성공 여부

Supabase 저장 실패 시에도 AI 분석 자체가 성공했다면 HTTP `200`과 `saved: false`를 반환한다. 클라이언트가 결과와 저장 실패 안내를 함께 보여줄 수 있어야 한다.

## 4. 오류 응답 계약
공통 형식:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "분석할 문장을 입력해 주세요."
  }
}
```

권장 상태 코드:
- `400 INVALID_INPUT`: 입력 누락, 빈 값, 2,000자 초과, 잘못된 JSON
- `405 METHOD_NOT_ALLOWED`: POST 외 메서드
- `429 RATE_LIMITED`: 외부 API/호출 제한
- `502 AI_PROVIDER_ERROR`: OpenAI 호출 실패
- `502 INVALID_AI_RESPONSE`: AI 응답 파싱/검증 실패
- `500 INTERNAL_ERROR`: 예상하지 못한 서버 오류

오류 메시지는 사용자가 이해할 수 있는 한국어로 제공한다. 공급자 원문 오류, 스택 트레이스, 비밀정보는 노출하지 않는다.

## 5. 서버 처리 순서
1. HTTP 메서드 검사
2. 요청 본문 파싱
3. 입력 검증
4. OpenAI 호출
5. AI 응답 검증
6. Supabase 저장 시도
7. 성공 응답 반환

AI 분석이 실패하면 저장을 시도하지 않는다. 저장만 실패하면 분석 결과는 반환한다.

## 6. 서버 보안
- API 키는 Vercel 환경변수에서 읽는다.
- 브라우저가 보낸 `sentiment`, `confidence`, `reason`을 신뢰하거나 그대로 저장하지 않는다. 서버가 AI 응답으로 생성한 값만 저장한다.
- 입력 길이 제한은 서버에서도 반드시 적용한다.
- 클라이언트가 전달한 임의의 모델명/프롬프트를 실행하지 않는다.
- 에러 로그에는 요청 본문을 포함하지 않는다.
- MVP에서는 별도 인증이 없으므로 공개 API에 대한 비용 악용 방지(예: Vercel Firewall/외부 rate limit 정책)는 배포 설정에서 검토한다. 미구현 상태를 완료로 표시하지 않는다.

## 7. 환경변수
`.env.example`에 이름만 기록한다.
```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```
키 값은 사용자가 각 서비스 대시보드에서 발급해 Vercel 환경변수에 직접 등록한다. `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트에 전달하지 않는다.
