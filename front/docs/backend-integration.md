# 프론트 변경 요약 및 백엔드 연동 가이드

이 문서는 최근 프론트엔드에 적용한 변경사항들을 정리하고, 백엔드에서 구현해야 할 API 및 응답 형식, 보안/동작 주의점을 상세히 설명합니다.

---

## 1. 최근 프론트엔드에 추가/변경한 항목 (요약)

- 마스킹 패널 및 헤더
  - `탐지 목록` 버튼을 `마스킹 적용/해제` 버튼 바로 왼쪽에 배치하여 두 버튼이 인접하도록 정렬.
  - 마스킹 토글(`마스킹 적용` / `마스킹 해제`)은 헤더 오른쪽에 고정.

- 탐지(Detected) 목록 / 드로어
  - 탐지 항목마다 고유 id를 DOM에 `id="detected-item-<id>"` 형태로 추가하여 스크롤/포커싱 대상 가능.
  - `수정` 버튼 동작: 목록에서 `수정` 클릭 시 드로어를 열고(닫지 않음), 드로어 내에서 해당 항목 자리(목록 아이템)에서 바로 편집 폼을 연다.
  - 드로어 상단의 폼은 기본적으로 `탐지 항목 추가` 포지션으로 존재. (추가/편집 모두 여기서 처리 가능)
  - 인라인 편집(목록 내부 소형 편집)은 제거하거나 드로어 편집으로 통합.
  - 항목 편집 시 드로어 내 해당 항목으로 자동 스크롤하여 보여주도록 구현.

- 탐지 항목 CRUD
  - `customDetectedItems` 및 `hiddenDetectedIds` 상태로 커스터마이즈된 탐지 항목(추가/수정/삭제)과 숨김 여부를 관리.
  - 저장 시(추가/수정/삭제) 마스킹 결과(본문 반영)를 클라이언트에서 재계산하여 `editedContent`에 반영.

- 행동(액션) 아이템 UI
  - 모달 기반 `액션 아이템 추가` UI 유지 (제목/담당자/마감일).
  - Google Calendar 연동은 `addToCalendar` 호출(클라이언트 시뮬레이션 포함).

- 인증 / 외부연동 버튼
  - 상단 `Sign In` 버튼을 클릭하면 Slack OAuth authorize 엔드포인트로 리디렉트하도록 변경(`TopAppBar.jsx`).
  - 캘린더 페이지(`CalendarPage.jsx`) 우측 패널에 `슬랙 연결` 버튼 추가(동일한 Slack OAuth flow로 리디렉트).

- 프론트 클라이언트 설정
  - API 클라이언트는 `src/api/client.js`에서 `VITE_API_BASE_URL`을 사용하여 백엔드 주소를 참조.

---

## 2. 백엔드에서 구현하면 좋은 엔드포인트 및 응답 형식

아래는 프론트가 기대하는 호출 형태와 추천되는 구현 상세입니다. 모든 엔드포인트는 기본적으로 JSON 응답을 사용하며, 에러는 HTTP 상태 코드 + `{ error: string }` 형식을 권장합니다.

공통
- 기본 응답 헤더: `Content-Type: application/json`
- 인증/세션: OAuth/세션을 사용하는 경우 세션 쿠키 또는 Authorization 헤더(`Bearer <token>`)를 사용.

### 2.1 문서 조회 / 목록
- GET `/api/documents` (쿼리: `?domain=&date=` 등)
  - 응답 200
  - Body: `[{ id, title, domain, status, fileName, fileSize, duration, date, attendees: [], content, actionItems: [] }, ...]`

- GET `/api/documents/:id`
  - 응답 200
  - Body: `{
      id, title, domain, status, fileName, fileSize, duration, date,
      attendees: string[],
      content: string,
      actionItems: [{ title, assignee, dueDate, completed }]
    }`

프론트 참고: `src/api/documents.js`는 `actionItems`를 `actionItems` 또는 `action_items`에서 정규화하여 사용합니다.

---

### 2.2 업로드
- POST `/api/upload`
  - Content-Type: `multipart/form-data` (file + domain)
  - 요청 필드: `file` (오디오/텍스트 등), `domain` (optional)
  - 응답 202(비동기 처리 시작) 또는 200(동기 성공)
  - Body 예: `{ id: '<doc-id>', status: 'processing' }` 또는 `{ id: '<doc-id>', status: 'done', doc: { ... } }`

백엔드 작업: 오디오 파일은 STT, 요약, 탐지(PII) 파이프라인을 거쳐 문서 생성. 상태 조회 엔드포인트(`/api/documents/:id`)로 폴링 또는 webhook 방식 권장.

---

### 2.3 마스킹 관련
프론트는 클라이언트 사이드에서도 마스킹을 실행하지만, 서버 측에서도 일관된 결과를 얻고자 할 때 다음 API를 권장합니다.

- POST `/api/documents/:id/mask`
  - 설명: 본문에 마스킹을 적용하거나 탐지 결과를 재계산.
  - Body 예: `{ level: 'full'|'pseudonym'|'original', types?: string[], customDetected?: [{ id?, sourceId?, type, value, masked, level }] , hiddenDetectedIds?: [id] }
  - 응답 200
  - Body 예: `{
      maskedContent: '<masked html or text>',
      detectedItems: [{ id, type, value, masked, level, sourceId? }],
      customDetectedItems: [...],
      hiddenDetectedIds: [...]
    }`

서버 구현 시 고려사항:
- 탐지(Detection) 엔진은 프론트와 동일한 정규식/룰을 사용해야 일관성 보장.
- longest-first 치환 전략을 적용하여 부분 중복을 방지.
- 민감도(레벨)별로 마스킹 결과(가명/완전삭제 등)를 반환.

---

### 2.4 탐지 항목(커스텀) CRUD
- POST `/api/documents/:id/detected` (추가)
  - Body: `{ type, value, level }`
  - 응답 201: `{ id, sourceId?, type, value, masked, level, custom: true }`

- PUT `/api/documents/:id/detected/:detectedId` (수정)
  - Body: `{ type?, value?, level? }`
  - 응답 200: `{ id, type, value, masked, level, custom: true }`

- DELETE `/api/documents/:id/detected/:detectedId` (삭제)
  - 응답 204

프론트 기대: 변경 후 서버가 새로운 마스킹 결과(또는 변경된 탐지 목록)를 반환하면 프론트는 그 결과를 `editedContent`에 반영합니다.

---

### 2.5 액션 아이템 (Action Items) CRUD
- POST `/api/documents/:id/action-items`
  - Body: `{ title, assignee, dueDate }`
  - 응답 201: `{ id, title, assignee, dueDate, completed: false }`

- PUT `/api/documents/:id/action-items/:itemId`
  - Body: `{ title?, assignee?, dueDate?, completed? }`
  - 응답 200: 업데이트된 항목

- DELETE `/api/documents/:id/action-items/:itemId`
  - 응답 204

프론트 참고: 캘린더 등록은 클라이언트에서 `addToCalendar`로 호출하며, 서버에서 일괄 동기화/저장하고자 할 경우 위 엔드포인트를 통해 액션아이템을 저장/조회합니다.

---

### 2.6 지식 그래프
- GET `/api/graph/:docId`
  - 응답 200
  - Body 예: `{
      nodes: [{ id, label, type, desc }],
      edges: [{ source, target, label }]
    }`

프론트는 이 형식으로 노드/엣지를 받아 그래프 라이브러리(react-force-graph 등)에 전달합니다.

---

### 2.7 AI 질의 (문서 내 질의 응답)
- POST `/api/query`
  - Body: `{ doc_id, query }`
  - 응답 200
  - Body 예: `{ answer: '<text>', citation: '<optional citation text>' }`

권장 구현:
- 내부적으로 문서 임베딩 + 유사도 검색(Retrieval)으로 컨텍스트를 구성하고, LLM에 prompt와 컨텍스트를 보내 요약/답변을 생성.
- 응답에 `citation`이나 `references` 배열을 추가하여 프론트에서 출처를 보여줄 수 있게 함.

---

### 2.8 Slack 알림(공유)
- POST `/api/notify`
  - Body: `{ id, channel?: '<channel-id>', message?: '<text>' }`
  - 동작: 서버가 저장된 Slack 토큰(사용자 또는 서비스 토큰)을 사용해 `chat.postMessage` 또는 파일 업로드 API 호출.
  - 응답 200: `{ success: true, channel, ts }` 또는 실패 시 적절한 에러.

서버 구현 포인트:
- Slack OAuth flow로 각 사용자 토큰을 발급/저장하려면 `/auth/slack/start` 및 `/auth/slack/callback` 엔드포인트 필요.
- 서비스 계정(앱 수준 토큰)이 필요한 권한(채널에 메시지 전송 등)인지 확인.
- 메시지 내용에는 문서 링크(`/result/:id`) 또는 파일(텍스트/요약)을 포함.

---

### 2.9 업로드(파일 변환/처리) 상태 콜백
- 대용량 음성/비동기 처리 시 백엔드는 작업 시작 응답(202)과 함께 작업 id를 반환.
- 선택사항: 작업 완료 시 프론트로 webhook 또는 WebSocket 알림을 보냄.

---

### 2.10 OAuth 로그인(슬랙/구글) 권장 플로우
- 프론트는 현재 직접 Slack authorize URL로 리디렉션하지만, 더 안전한 방식은 백엔드에서 `state` 생성 및 리디렉트(anti-CSRF)를 담당.

권장 엔드포인트
- GET `/auth/slack/start` -> 서버가 `state` 생성 후 Slack authorize URL로 리디렉트
- GET `/auth/slack/callback?code=&state=` -> 서버가 `code`를 교환하여 액세스 토큰 수령(`https://slack.com/api/oauth.v2.access`), 사용자 식별·저장, 세션 생성 또는 JWT 발급 후 프론트로 리디렉트

응답/세션
- 로그인 성공 시 HTTPS 전용 세션 쿠키를 설정하거나, 프론트에 리다이렉트할 때 JWT 토큰을 쿼리/헤더로 전달(보안상 권장되지 않음 — cookie 권장).

---

## 3. 프론트에서 기대하는 구체적 요청/응답 예시

- GET `/api/documents/demo-roadmap-q4`
  - 200
  - Body: see section 2.1

- POST `/api/documents/demo-roadmap-q4/mask`
  - Req: `{ level: 'pseudonym', types: ['전화번호','이메일'] }`
  - Res 200: `{ maskedContent: '...', detectedItems: [{ id: '42', type: '전화번호', value: '010-1234-5678', masked: '010-****-5678', level: '가명처리' }], customDetectedItems: [], hiddenDetectedIds: [] }`

- POST `/api/notify` (Slack)
  - Req: `{ id: 'demo-roadmap-q4', channel: 'C1234', message: '회의록 요약입니다.' }`
  - Res 200: `{ success: true, channel: 'C1234', ts: '165...' }`

- POST `/api/query`
  - Req: `{ doc_id: 'demo-roadmap-q4', query: '이번 회의의 핵심 합의는?' }`
  - Res 200: `{ answer: '핵심 합의는 ...', citation: '참조: 1. UI 디자인 개편 세부안' }`

- POST `/api/upload` (multipart)
  - Res 202: `{ id: 'doc-xxxx', status: 'processing' }`

- POST `/api/documents/:id/action-items` (추가)
  - Req: `{ title: '리포트 배포', assignee: '김철수', dueDate: '2026-05-25' }`
  - Res 201: `{ id: 'a1', title: '리포트 배포', assignee: '김철수', dueDate: '2026-05-25', completed: false }`

---

## 4. 보안·운영 권장 사항

- OAuth 클라이언트 ID/비밀은 서버에서 관리. 클라이언트(프론트)에는 client_id만 필요.
- Redirect URI는 백엔드에서 고정하고 검증.
- 민감한 정보(개인정보 마스킹 관련): 로그에 원본값을 남기지 않도록 주의.
- 요청/응답 길이 제한, rate limiting, 파일 업로드 크기 제한 설정.
- CSRF/State 체크: OAuth 콜백 시 반드시 state 검증.

---

## 5. 개발 우선순위 제안(백엔드)

1. 문서 조회(`/api/documents/:id`) 및 업로드(`/api/upload`) 기본 구현
2. 지식 그래프(`/api/graph/:id`) 및 AI 질의(`/api/query`) — LLM 연동
3. 탐지/마스킹 `/api/documents/:id/mask` — 서버측 규칙 검증 및 일관성 확보
4. 탐지 항목 CRUD 및 액션 아이템 CRUD
5. OAuth (Slack, Google) 및 `/api/notify`, `/api/schedule` 연동
6. Webhook/비동기 작업 상태 알림 및 모니터링

---

## 6. 참조: 프론트에서의 클라이언트 사용 예
- `src/api/client.js`에서 `baseURL = VITE_API_BASE_URL || 'http://localhost:8000'`로 선언되어 있습니다.
- 따라서 백엔드는 `VITE_API_BASE_URL`에서 설정한 도메인(예: `http://localhost:8000/api`)에 맞춰 엔드포인트를 제공해야 합니다.

---

원하시면 이 문서를 기반으로 바로 백엔드용 Express/Flask/FastAPI 템플릿 라우트(예: `routes/api.py` 또는 `controllers/documents.py`) 스텁을 생성해 드리겠습니다.
