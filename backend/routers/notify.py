"""
POST /notify — Slack 자동 알림 (Phase 2)
"""

import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models.schemas import NotifyRequest, NotifyResponse
from services.slack import send_slack_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notify", tags=["Slack"])


@router.post("", response_model=NotifyResponse)
async def notify_slack(body: NotifyRequest):
    """
    회의록 문서를 Slack 채널에 전송합니다.

    - **document**: 전송할 DocumentResult
    - SLACK_WEBHOOK_URL이 .env에 설정되어 있어야 합니다.
    """
    doc_dict = body.document.model_dump(by_alias=True)
    success = await send_slack_notification(doc_dict)

    if success:
        return NotifyResponse(success=True, message="Slack 알림이 전송되었습니다.")

    return JSONResponse(
        status_code=502,
        content={
            "success": False,
            "message": "Slack 알림 전송에 실패했습니다. SLACK_WEBHOOK_URL을 확인하세요.",
        },
    )
