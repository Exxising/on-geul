"""
GET /documents/{id} — 업로드 후 폴링용 상태 조회 (Phase 1: 인메모리, Phase 2: Firebase 교체 예정)
GET /documents      — 저장된 회의록 목록 (Phase 2 예정)
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("")
async def list_documents():
    """저장된 회의록 목록을 반환합니다. Phase 2에서 Firebase 연동 예정."""
    return JSONResponse(
        status_code=501,
        content={"message": "Phase 2에서 구현 예정입니다."},
    )


@router.get("/{doc_id}")
async def get_document(doc_id: str):
    """
    업로드 후 폴링용 상태 조회 엔드포인트.
    프론트엔드 LoadingPage.jsx 가 2초마다 이 엔드포인트를 호출합니다.

    - status == 'processing' → 아직 처리 중 (fileName, fileSize 포함)
    - status == 'done'       → document, transcript 포함
    - status == 'error'      → 422 + { message }
    """
    from routers.process import get_job

    job = get_job(doc_id)
    if job is None:
        return JSONResponse(
            status_code=404,
            content={"message": "존재하지 않는 문서 ID입니다."},
        )

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
