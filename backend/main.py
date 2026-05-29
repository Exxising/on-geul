"""
온글 (On-Geul) — 백엔드 메인
AI Agent 기반 대화 자동 문서화 서비스

실행: uvicorn main:app --reload --port 8000
"""

from dotenv import load_dotenv
load_dotenv()  # 라우터 import 전에 먼저 실행해야 모듈 레벨 env 변수가 올바르게 설정됨

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
import os

# 라우터 임포트
from routers import transcribe, process, schedule, notify, documents, graph, mask, entities

# ── 앱 초기화 ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="온글 API",
    description="AI Agent 기반 대화 자동 문서화 서비스 백엔드",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS 설정 ─────────────────────────────────────────────────────────────────
# 이수민 프론트 도메인을 환경변수로 관리
# 예: ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.run.app
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 전역 예외 핸들러 ───────────────────────────────────────────────────────────
# 프론트엔드는 error.response.data.message 를 읽음 → detail → message 통일
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )


# ── 라우터 등록 ────────────────────────────────────────────────────────────────
app.include_router(process.router)      # POST /process, POST /upload
app.include_router(documents.router)    # GET  /documents/{id}  ← 폴링용
app.include_router(mask.router)         # POST /mask            ← 마스킹
app.include_router(transcribe.router)   # POST /transcribe
app.include_router(schedule.router)     # POST /schedule        (Phase 2)
app.include_router(notify.router)       # POST /notify          (Phase 2)
app.include_router(entities.router)     # POST /extract-entities        (Phase 2)
app.include_router(graph.router)        # GET  /graph/{id}, POST /query  (Phase 3)


# ── 헬스체크 ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def health_check():
    """서버 상태 확인용 엔드포인트"""
    return {
        "status": "ok",
        "service": "온글 백엔드",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Cloud Run 헬스체크용"""
    return {"status": "healthy"}
