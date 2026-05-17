"""
POST /notify — Slack 자동 알림 (Phase 2)
"""

from fastapi import APIRouter, HTTPException
from models.schemas import NotifyRequest, NotifyResponse

router = APIRouter(prefix="/notify", tags=["Slack"])


@router.post("", response_model=NotifyResponse)
async def notify_slack(body: NotifyRequest):
    """
    문서 결과를 Slack 채널에 전송합니다.
    Phase 2에서 구현 예정.
    """
    raise HTTPException(status_code=501, detail="Phase 2에서 구현 예정입니다.")
