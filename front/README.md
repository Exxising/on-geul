# 온글(On-Geul) AI 회의록 프론트엔드 - 백엔드 연동 가이드

이 문서는 온글(On-Geul) AI 회의록 서비스의 프론트엔드 프로젝트 저장소입니다.
특히 **백엔드 개발자**가 프론트엔드의 구조를 파악하고 원활하게 API를 연동할 수 있도록 상세한 가이드를 제공합니다.

## 🚀 기술 스택
- **프레임워크**: React 18 + Vite
- **스타일링**: Tailwind CSS
- **상태 관리 & API**: Axios, React Hooks
- **주요 라이브러리**: react-force-graph-2d (지식그래프), react-markdown

## ⚙️ 환경 변수 세팅
프로젝트 루트(`front/.env`)에 다음 환경변수를 설정합니다. (현재 `.gitignore` 처리되어 있으므로 직접 생성해야 합니다.)
```env
VITE_API_BASE_URL=http://localhost:8000  # 백엔드 서버 주소로 변경하세요
```

## 🔌 백엔드 연동 가이드 (핵심)

프론트엔드는 백엔드가 완성되지 않은 상태에서도 UI 테스트가 가능하도록 **"이중 하이브리드 Mock Fallback"** 구조로 설계되어 있습니다. 
즉, `try` 블록에서 실제 백엔드 API를 호출하고, 통신 실패 시 `catch` 블록에서 **더미 데이터(Mock)**를 반환하여 화면을 그립니다.

모든 API 호출 및 더미 데이터 로직은 **`src/api/documents.js`** 단일 파일에 집중되어 있습니다.
백엔드 개발자는 이 파일의 `catch` 블록에 있는 더미 데이터 구조(JSON 스키마)를 참고하여, 실제 백엔드 API 응답값을 동일한 포맷으로 내려주면 자동으로 연동이 완료됩니다.

### 📍 API 명세 및 연동 현황 (`src/api/documents.js`)

#### 1. 파일 업로드 및 변환 (STT)
- **Endpoint**: `POST /upload`
- **현재 상태**: 미연동 (더미 로직 동작 중)
- **수정 위치**: `uploadAudio` 함수
- **요구 응답**: `{ docId: "서버가발급한ID", status: "processing" }`

#### 2. 문서 목록 조회
- **Endpoint**: `GET /documents`
- **현재 상태**: 미연동 (초기 더미 `initialDocs` 데이터 사용)
- **수정 위치**: `getDocuments` 함수
- **더미 데이터 위치**: `documents.js` 파일 상단의 `initialDocs` 배열 참조.

#### 3. 특정 문서 상세 조회
- **Endpoint**: `GET /documents/{doc_id}`
- **현재 상태**: 미연동
- **수정 위치**: `getDocumentById` 함수

#### 4. 개인정보 마스킹 처리 (Phase 2)
- **Endpoint**: `POST /mask`
- **현재 상태**: 미연동 (프론트엔드 자체 Regex 엔진 시뮬레이션 중)
- **수정 위치**: `maskDocument(docId, level, selectedTypes)` 함수
- **Payload**: `{ id: "문서ID", level: "full" | "pseudonym" | "original", types: ["이름", "전화번호", ...] }`
- **요구 응답**: Python 백엔드의 `security.py` 모듈을 거친 결과값을 아래 포맷으로 반환.
  ```json
  {
    "maskedContent": "마스킹 처리된 전체 HTML 텍스트",
    "detectedItems": [
      { "id": 1, "type": "이름", "value": "김철수", "masked": "김*수", "level": "가명처리" }
    ]
  }
  ```

#### 5. 지식 그래프 시각화 (Phase 3)
- **Endpoint**: `GET /graph/{doc_id}`
- **현재 상태**: 미연동 (하드코딩된 그래프 노드/링크 더미 반환)
- **수정 위치**: `fetchGraphData` 함수
- **더미 데이터 위치**: 해당 함수 내의 `nodes` 및 `links` 배열 참조.

#### 6. AI RAG 기반 문서 질의응답 (Phase 3)
- **Endpoint**: `POST /query`
- **현재 상태**: 미연동 (지연 시간 후 하드코딩된 답변 반환)
- **수정 위치**: `askQuery` 함수

#### 7. 액션 아이템 캘린더 등록
- **Endpoint**: `POST /calendar`
- **현재 상태**: 미연동 (`localStorage`를 통한 프론트 자체 동작)
- **수정 위치**: `addToCalendar` 함수

#### 8. 슬랙(Slack) 요약 알림 전송
- **Endpoint**: `POST /notify`
- **현재 상태**: 미연동 (성공 시뮬레이션)
- **수정 위치**: `sendSlackNotification` 함수

---

## 🏃‍♂️ 실행 방법 (로컬)
```bash
# 의존성 설치
npm install

# 개발 서버 실행 (localhost:5173)
npm run dev
```

## 🐳 Docker Cloud Run 배포
프론트엔드는 Cloud Run 배포에 최적화된 Nginx 기반 Dockerfile이 포함되어 있습니다.
```bash
# GCP Cloud Run 자동 배포 명령어
gcloud run deploy ongle-front --source . --port 8080 --allow-unauthenticated
```
