"""
POST /schedule — Google Calendar 자동 등록 (Phase 2)
"""

import logging
from fastapi import APIRouter, HTTPException
from models.schemas import ScheduleRequest, ScheduleResponse
from services.calendar import create_calendar_events

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/schedule", tags=["Calendar"])


@router.post("", response_model=ScheduleResponse)
async def schedule_action_items(body: ScheduleRequest):
    """
    액션아이템 배열을 Google Calendar에 일정으로 등록합니다.

    - **action_items**: 등록할 액션아이템 목록
    - **calendar_token**: Google OAuth2 access token (프론트에서 로그인 후 전달)
    """
    if not body.calendar_token:
        raise HTTPException(
            status_code=400,
            detail="calendar_token이 필요합니다. Google 로그인 후 access token을 전달하세요.",
        )

    # ActionItem → dict 변환 (camelCase 포함)
    items_dict = [item.model_dump(by_alias=True) for item in body.action_items]

    try:
        created_ids = await create_calendar_events(
            action_items=items_dict,
            access_token=body.calendar_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Calendar 등록 중 예외: %s", e)
        raise HTTPException(status_code=500, detail=f"캘린더 등록 중 오류가 발생했습니다: {e}")

    count = len(created_ids)
    return ScheduleResponse(
        created_events=created_ids,
        message=f"{count}개의 일정이 Google Calendar에 등록되었습니다.",
    )
