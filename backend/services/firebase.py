"""
Firebase Realtime DB 서비스 (Phase 2)
변환 완료된 회의록을 Firebase에 저장/조회합니다.

저장 경로: /documents/{doc_id}
저장 구조: { doc_id, created_at, domain, transcript, result }

환경변수:
  FIREBASE_CREDENTIALS_PATH  서비스 계정 JSON 파일 경로
  FIREBASE_DATABASE_URL       https://<project>.firebaseio.com
"""

import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_initialized = False


def _init() -> None:
    """Firebase Admin SDK를 한 번만 초기화합니다."""
    global _initialized
    if _initialized:
        return

    import firebase_admin
    from firebase_admin import credentials

    # 이미 다른 곳에서 초기화된 경우 재사용
    if firebase_admin._apps:
        _initialized = True
        return

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    db_url = os.getenv("FIREBASE_DATABASE_URL")

    if not cred_path or not db_url:
        raise RuntimeError(
            "FIREBASE_CREDENTIALS_PATH 또는 FIREBASE_DATABASE_URL이 .env에 설정되지 않았습니다."
        )

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {"databaseURL": db_url})
    _initialized = True
    logger.info("Firebase Admin SDK 초기화 완료")


def _is_configured() -> bool:
    """Firebase 환경변수가 설정됐는지 확인합니다."""
    return bool(
        os.getenv("FIREBASE_CREDENTIALS_PATH") and
        os.getenv("FIREBASE_DATABASE_URL")
    )


async def save_document(doc_id: str, domain: str, transcript: str, result: dict) -> str:
    """
    변환 완료된 회의록을 Firebase Realtime DB에 저장합니다.
    Firebase 미설정 시 조용히 건너뜁니다 (doc_id는 그대로 반환).

    Args:
        doc_id:     인메모리 job ID (UUID)
        domain:     "meeting" | "consultation" | "welfare"
        transcript: STT 텍스트
        result:     DocumentResult.model_dump() 딕셔너리

    Returns:
        doc_id (Firebase 저장 여부와 무관하게 동일)
    """
    if not _is_configured():
        logger.debug("Firebase 미설정 — 저장 건너뜀 (doc_id=%s)", doc_id)
        return doc_id

    try:
        _init()
        from firebase_admin import db

        record = {
            "doc_id": doc_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "domain": domain,
            "transcript": transcript,
            "result": result,
        }

        db.reference(f"/documents/{doc_id}").set(record)
        logger.info("Firebase 저장 완료 (doc_id=%s)", doc_id)

    except Exception as e:
        # 저장 실패가 파이프라인 전체를 막으면 안 됨
        logger.error("Firebase 저장 실패 (doc_id=%s): %s", doc_id, e)

    return doc_id


async def get_documents() -> list[dict]:
    """
    저장된 회의록 목록을 created_at 내림차순으로 반환합니다.
    Firebase 미설정 시 빈 목록 반환.
    """
    if not _is_configured():
        return []

    try:
        _init()
        from firebase_admin import db

        snapshot = db.reference("/documents").get()
        if not snapshot:
            return []

        docs = list(snapshot.values())
        # created_at 내림차순 정렬
        docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
        return docs

    except Exception as e:
        logger.error("Firebase 목록 조회 실패: %s", e)
        return []


async def get_document(doc_id: str) -> dict | None:
    """
    특정 회의록 상세 내용을 반환합니다.
    없으면 None 반환.
    """
    if not _is_configured():
        return None

    try:
        _init()
        from firebase_admin import db

        return db.reference(f"/documents/{doc_id}").get()

    except Exception as e:
        logger.error("Firebase 문서 조회 실패 (doc_id=%s): %s", doc_id, e)
        return None
