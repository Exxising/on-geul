"""
GET  /documents      — 저장된 회의록 목록 (Phase 2)
GET  /documents/{id} — 특정 회의록 상세 (Phase 2)
"""

from fastapi import APIRouter, HTTPException
from models.schemas import DocumentListResponse, DocumentRecord

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents():
    """저장된 회의록 목록을 반환합니다. Phase 2에서 Firebase 연동 예정."""
    raise HTTPException(status_code=501, detail="Phase 2에서 구현 예정입니다.")


@router.get("/{doc_id}", response_model=DocumentRecord)
async def get_document(doc_id: str):
    """특정 회의록 상세 내용을 반환합니다. Phase 2에서 Firebase 연동 예정."""
    raise HTTPException(status_code=501, detail="Phase 2에서 구현 예정입니다.")
