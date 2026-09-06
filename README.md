# 온글(On-Geul)

음성 대화를 회의록·상담일지·복지활동일지로 자동 정리하는 AI 문서화 서비스임.

- 기간: 2026.05.17 ~ 2026.05.31
- 구분: Google Cloud AI Agent Challenge 팀 프로젝트
- 팀명: 따뜻한눈사람
- 담당: 팀장, AI 기능 및 백엔드 통합

## 만든 이유

- 대화가 끝난 뒤 다시 듣고 문서로 옮기는 시간을 줄이고자 했음.
- 음성 업로드부터 문서 생성, 개인정보 마스킹, 일정 등록까지 한 흐름으로 만드는 것을 목표로 했음.

## 내가 맡은 부분

- 팀장으로 기능 범위와 개발 일정을 정리하고 백엔드 통합을 맡았음.
- Gemini 2.5 Flash를 연결하고 회의록·상담일지·복지활동일지용 프롬프트를 작성했음.
- 프론트에서 바로 사용할 수 있도록 문서 응답 형식과 데이터 구조를 맞췄음.
- Groq Whisper를 연결해 음성을 한국어 텍스트로 바꾸는 기능을 구현했음.
- 개인정보 마스킹과 지식그래프용 정보 추출 기능을 구현했음.
- FastAPI 예외 처리와 CORS를 정리하고 Google Cloud Run 배포까지 진행했음.

## 동작 흐름

1. 음성 파일과 만들 문서 종류를 선택해 업로드함.
2. Groq Whisper가 음성을 텍스트로 변환함.
3. Gemini가 내용을 정리해 문서와 할 일을 생성함.
4. 결과를 Firebase에 저장하고 개인정보를 마스킹함.
5. 필요한 경우 Google Calendar, Slack, Neo4j와 연결함.

## 주요 기능

- 회의록·상담일지·복지활동일지 3종 생성함.
- 음성 처리를 백그라운드에서 진행하고 완료 여부를 확인할 수 있게 했음.
- 이름, 전화번호, 주민번호, 주소, 병명 등 개인정보를 찾아 가리도록 했음.
- 사람·주제·결정·일정을 추출해 지식그래프로 저장할 수 있게 했음.
- API 키가 없어도 전체 흐름을 확인할 수 있는 더미 모드를 넣었음.

## 사용 기술

- 백엔드: Python, FastAPI, Pydantic
- AI: Gemini 2.5 Flash, Groq Whisper Large v3 Turbo, LangChain
- 데이터 및 연동: Firebase, Neo4j, Google Calendar API, Slack Webhook
- 프론트엔드: React, Vite, Tailwind CSS
- 배포: Docker, Google Cloud Run

## 프로젝트 구조

```text
on-geul/
├── backend/   FastAPI 서버, STT, LLM, 외부 서비스 연동
└── front/     React 화면과 API 연결 코드
```

## 실행 방법

### 백엔드

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

- 처음 확인할 때는 `.env`의 `DUMMY_MODE`와 `DUMMY_STT`를 `true`로 사용하면 됨.
- 실제 AI 기능을 사용할 때는 두 값을 `false`로 바꾸고 Gemini와 Groq API 키를 입력해야 함.
- 실행 후 `http://localhost:8000/docs`에서 API를 확인할 수 있음.

### 프론트엔드

```bash
cd front
npm install
npm run dev
```

- 필요하면 `front/.env`에 `VITE_API_BASE_URL=http://localhost:8000`을 추가하면 됨.

## 진행 결과

- 음성 업로드부터 문서 생성과 저장까지 이어지는 기본 흐름을 구현했음.
- Google Cloud AI Agent Challenge 제출을 완료했음.
- 백엔드와 프론트엔드를 Docker로 배포할 수 있게 구성했음.
- 프론트 일부 기능은 백엔드가 꺼져 있을 때 더미 데이터로 대신 동작함.

## 보안

- API 키와 서비스 계정 파일은 저장소에 올리지 않도록 제외했음.
- 실제 키는 각 폴더의 `.env`에서 따로 관리해야 함.
