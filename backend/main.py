"""
온글 (On-Geul) — 백엔드 메인
AI Agent 기반 대화 자동 문서화 서비스

실행: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# 라우터 임포트
from routers import transcribe, process, schedule, notify, documents, graph

load_dotenv()

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

# ── 라우터 등록 ────────────────────────────────────────────────────────────────
app.include_router(transcribe.router)   # POST /transcribe
app.include_router(process.router)      # POST /process
app.include_router(schedule.router)     # POST /schedule      (Phase 2)
app.include_router(notify.router)       # POST /notify        (Phase 2)
app.include_router(documents.router)    # GET  /documents     (Phase 2)
app.include_router(graph.router)        # POST /graph, GET /graph/{id}, POST /graph/query  (Phase 3)


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
