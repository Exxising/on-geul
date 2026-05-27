"""
Firebase Realtime DB 서비스 (Phase 2)
변환 완료된 회의록을 Firebase에 저장/조회합니다.
저장 구조: {doc_id, created_at, domain, result_json, masked_fields}
"""

# TODO: Phase 2 구현
# import firebase_admin
# from firebase_admin import credentials, db

async def save_document(domain: str, result: dict) -> str:
    """문서를 Firebase에 저장하고 doc_id를 반환합니다."""
    raise NotImplementedError("Phase 2에서 구현 예정")

async def get_documents() -> list:
    """저장된 회의록 목록을 반환합니다."""
    raise NotImplementedError("Phase 2에서 구현 예정")

async def get_document(doc_id: str) -> dict:
    """특정 회의록 상세 내용을 반환합니다."""
    raise NotImplementedError("Phase 2에서 구현 예정")
