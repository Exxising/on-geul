"""
POST /schedule — Google Calendar 자동 등록 (Phase 2)
"""

from fastapi import APIRouter, HTTPException
from models.schemas import ScheduleRequest, ScheduleResponse

router = APIRouter(prefix="/schedule", tags=["Calendar"])


@router.post("", response_model=ScheduleResponse)
async def schedule_action_items(body: ScheduleRequest):
    """
    액션아이템 배열을 받아 Google Calendar에 일정을 등록합니다.
    Phase 2에서 구현 예정.
    """
    raise HTTPException(status_code=501, detail="Phase 2에서 구현 예정입니다.")
