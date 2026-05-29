"""
POST /process (또는 /upload) — 음성 파일 업로드 + 비동기 STT→LLM 파이프라인
GET  /process/status/{id}  — 내부 상태 조회 (documents.py에서 직접 get_job 사용)

흐름:
  1. POST /process → { id, status: "processing" } 즉시 반환
  2. GET /documents/{id} 폴링 → status: "done" 이면 document 포함
"""

import uuid
import os
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from models.schemas import DocumentResult

router = APIRouter(tags=["Pipeline"])

# ── 인메모리 상태 저장소 ─────────────────────────────────────────────────────────
# Phase 2에서 Firebase로 교체 예정
# { doc_id: { status, document, transcript, fileName, fileSize, errorMessage } }
_jobs: dict[str, dict] = {}

# ── 개발 편의 더미 플래그 ─────────────────────────────────────────────────────────
# DUMMY_STT=true  → Groq 호출 없이 더미 transcript 사용 (비용 $0)
# DUMMY_MODE=true → Gemini 호출 없이 더미 문서 반환 (services/llm.py 에서 관리)
_DUMMY_STT = os.getenv("DUMMY_STT", "false").lower() == "true"
_DUMMY_TRANSCRIPT = (
    "안녕하세요, 오늘 온글 프로젝트 킥오프 회의를 시작하겠습니다. "
    "백엔드는 FastAPI로 강유민님이 LLM 파트를 맡고, "
    "이수민님이 프론트엔드 React를 담당합니다. "
    "이번 주 금요일까지 GitHub 레포를 생성하고 팀원을 초대하기로 결정했습니다. "
    "다음 주 월요일에는 JSON 스키마 확정 후 팀 공유가 목표입니다."
)

SUPPORTED_DOMAINS = {"meeting", "consultation", "welfare"}
SUPPORTED_EXTS = {"mp3", "wav", "m4a", "mp4", "mpeg", "mpga", "webm"}
MAX_BYTES = 25 * 1024 * 1024  # 25MB


def get_job(doc_id: str) -> dict | None:
    """documents.py 및 mask.py에서 폴링 시 호출하는 저장소 조회 함수."""
    return _jobs.get(doc_id)


# ── 백그라운드 파이프라인 ──────────────────────────────────────────────────────────

async def _run_pipeline(
    doc_id: str,
    contents: bytes,
    filename: str,
    domain: str,
):
    """
    백그라운드에서 STT → LLM 순차 실행 후 _jobs에 결과를 저장합니다.
    """
    from services.stt import transcribe_audio
    from services.llm import generate_document
    from fastapi import HTTPException

    try:
        # ── 1단계: STT ────────────────────────────────────────────────────────────
        if _DUMMY_STT:
            # DUMMY_STT=true: Groq 호출 없이 더미 텍스트 사용
            transcript = _DUMMY_TRANSCRIPT
        else:
            # BackgroundTask에서는 원본 UploadFile을 재사용할 수 없으므로 래퍼 생성
            class _FakeUploadFile:
                def __init__(self):
                    self.filename = filename
                async def read(self):
                    return contents

            transcript, _ = await transcribe_audio(_FakeUploadFile())

        if not transcript.strip():
            _jobs[doc_id]["status"] = "error"
            _jobs[doc_id]["errorMessage"] = "음성에서 텍스트를 추출하지 못했습니다."
            return

        # ── 2단계: LLM 문서 생성 ──────────────────────────────────────────────────
        document: DocumentResult = await generate_document(
            transcript=transcript, domain=domain
        )

        _jobs[doc_id].update({
            "status": "done",
            "transcript": transcript,
            "document": document,
        })

    except HTTPException as e:
        _jobs[doc_id]["status"] = "error"
        _jobs[doc_id]["errorMessage"] = e.detail
    except Exception as e:
        _jobs[doc_id]["status"] = "error"
        _jobs[doc_id]["errorMessage"] = f"처리 중 오류가 발생했습니다: {str(e)}"


# ── 공통 핸들러 (엔드포인트 중복 방지) ────────────────────────────────────────────

async def _handle_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    domain: str,
):
    """
    /process 와 /upload 가 공유하는 업로드 처리 함수.
    즉시 { id, status: 'processing' } 반환.
    """
    # 도메인 검증
    if domain not in SUPPORTED_DOMAINS:
        return JSONResponse(
            status_code=400,
            content={
                "message": f"지원하지 않는 도메인입니다. 지원 도메인: {', '.join(SUPPORTED_DOMAINS)}"
            },
        )

    # 파일 형식 검증
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_EXTS:
        return JSONResponse(
            status_code=400,
            content={"message": "지원하지 않는 파일 형식입니다. (mp3, wav, m4a만 가능)"},
        )

    # 파일 내용 읽기 및 크기 검증
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        return JSONResponse(
            status_code=400,
            content={
                "message": (
                    f"파일 크기는 최대 25MB를 초과할 수 없습니다. "
                    f"({len(contents)/1024/1024:.1f}MB)"
                )
            },
        )

    # Job 등록 (즉시 id 반환)
    doc_id = str(uuid.uuid4())
    _jobs[doc_id] = {
        "status": "processing",
        "fileName": file.filename,
        "fileSize": f"{len(contents)/1024/1024:.2f} MB",
        "domain": domain,
        "document": None,
        "transcript": None,
        "errorMessage": None,
    }

    # 백그라운드에서 STT + LLM 처리
    background_tasks.add_task(
        _run_pipeline,
        doc_id=doc_id,
        contents=contents,
        filename=file.filename or f"audio.{ext}",
        domain=domain,
    )

    return {"id": doc_id, "status": "processing"}


# ── 엔드포인트 등록 ──────────────────────────────────────────────────────────────

@router.post("/process")
async def process_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="음성 파일 (mp3/wav/m4a, 최대 25MB)"),
    domain: str = Form(
        default="meeting",
        description="문서 도메인: meeting | consultation | welfare",
    ),
):
    """
    음성 파일을 업로드하면 즉시 `id`와 `status: processing`을 반환합니다.
    이후 `GET /documents/{id}`를 2초마다 폴링하여 완료 여부를 확인하세요.
    """
    return await _handle_upload(background_tasks, file, domain)


@router.post("/upload")
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="음성 파일 (mp3/wav/m4a, 최대 25MB)"),
    domain: str = Form(
        default="meeting",
        description="문서 도메인: meeting | consultation | welfare",
    ),
):
    """
    /process 와 동일한 처리. 프론트엔드 하위 호환성 유지용.
    """
    return await _handle_upload(background_tasks, file, domain)
