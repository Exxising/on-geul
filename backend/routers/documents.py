"""
GET /documents      — 저장된 회의록 목록 (Phase 2: Firebase)
GET /documents/{id} — 업로드 후 폴링용 상태 조회 (인메모리 우선, Firebase fallback)
"""

import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("")
async def list_documents():
    """
    저장된 회의록 목록을 Firebase에서 반환합니다. (Phase 2)
    Firebase 미설정 시 빈 목록 반환.
    """
    from services.firebase import get_documents

    docs = await get_documents()

    # Firebase 레코드 → 프론트 기대 형식으로 변환
    items = []
    for doc in docs:
        items.append({
            "id": doc.get("doc_id"),
            "createdAt": doc.get("created_at"),
            "domain": doc.get("domain"),
            "title": doc.get("result", {}).get("title", ""),
            "participants": doc.get("result", {}).get("participants", []),
        })

    return {"documents": items}


@router.get("/{doc_id}")
async def get_document(doc_id: str):
    """
    업로드 후 폴링용 상태 조회 엔드포인트.
    프론트엔드 LoadingPage.jsx 가 2초마다 이 엔드포인트를 호출합니다.

    우선순위:
      1. 인메모리 _jobs (처리 중 / 방금 완료)
      2. Firebase (이전 세션 기록)

    - status == 'processing' → 아직 처리 중
    - status == 'done'       → document, transcript 포함
    - status == 'error'      → 422 + { message }
    """
    from routers.process import get_job

    # ── 1순위: 인메모리 ──────────────────────────────────────────────────────────
    job = get_job(doc_id)
    if job is not None:
        status = job["status"]

        if status == "processing":
            return {
                "id": doc_id,
                "status": "processing",
                "fileName": job.get("fileName"),
                "fileSize": job.get("fileSize"),
            }

        if status == "error":
            return JSONResponse(
                status_code=422,
                content={
                    "id": doc_id,
                    "status": "error",
                    "message": job.get("errorMessage", "알 수 없는 오류가 발생했습니다."),
                },
            )

        # status == "done"
        document = job.get("document")
        return {
            "id": doc_id,
            "status": "done",
            "fileName": job.get("fileName"),
            "fileSize": job.get("fileSize"),
            "transcript": job.get("transcript"),
            "document": document.model_dump(by_alias=True) if document else None,
        }

    # ── 2순위: Firebase fallback (서버 재시작 후에도 이력 조회 가능) ───────────────
    from services.firebase import get_document as firebase_get

    record = await firebase_get(doc_id)
    if record:
        return {
            "id": doc_id,
            "status": "done",
            "fileName": None,
            "fileSize": None,
            "transcript": record.get("transcript"),
            "document": record.get("result"),
        }

    return JSONResponse(
        status_code=404,
        content={"message": "존재하지 않는 문서 ID입니다."},
    )
