"""
Google Calendar 서비스 (Phase 2)
OAuth2 액세스 토큰을 받아 액션아이템을 Google Calendar 이벤트로 등록합니다.

프론트엔드가 OAuth2 로그인 후 받은 access_token을 POST /schedule 바디에 담아 전송합니다.

환경변수 (OAuth2 클라이언트 정보 — 프론트 로그인에서 사용):
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
"""

import os
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def _build_service(access_token: str):
    """액세스 토큰으로 Google Calendar API 서비스 객체를 생성합니다."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(token=access_token)
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _parse_due_date(due_date_str: str | None) -> tuple[str, str]:
    """
    due_date 문자열을 파싱해 (start, end) ISO 8601 datetime 문자열을 반환합니다.
    값이 없으면 내일 09:00 ~ 10:00으로 설정합니다.
    """
    try:
        if due_date_str:
            # "2026-05-30" 형식 → 해당 날 09:00~10:00
            dt = datetime.fromisoformat(due_date_str)
        else:
            dt = datetime.now(timezone.utc) + timedelta(days=1)

        dt = dt.replace(hour=9, minute=0, second=0, microsecond=0)
        start = dt.isoformat()
        end = (dt + timedelta(hours=1)).isoformat()
        return start, end

    except Exception:
        # 파싱 실패 시 내일 09:00
        dt = datetime.now(timezone.utc) + timedelta(days=1)
        dt = dt.replace(hour=9, minute=0, second=0, microsecond=0)
        return dt.isoformat(), (dt + timedelta(hours=1)).isoformat()


async def create_calendar_events(action_items: list[dict], access_token: str) -> list[str]:
    """
    액션아이템 배열을 받아 Google Calendar에 이벤트를 등록합니다.

    Args:
        action_items: ActionItem 딕셔너리 목록
                      각 항목: { title, assignee, dueDate, completed }
        access_token: 프론트엔드 OAuth2 로그인으로 받은 access token

    Returns:
        생성된 이벤트 ID 목록
    """
    if not access_token:
        raise ValueError("access_token이 필요합니다. 프론트에서 Google OAuth2 로그인 후 전달하세요.")

    try:
        service = _build_service(access_token)
    except Exception as e:
        raise RuntimeError(f"Google Calendar 서비스 초기화 실패: {e}") from e

    created_ids: list[str] = []

    for item in action_items:
        title = item.get("title", "")
        assignee = item.get("assignee") or item.get("assignee")
        due_date = item.get("dueDate") or item.get("due_date")

        if not title:
            continue

        start_dt, end_dt = _parse_due_date(due_date)

        description_parts = ["[온글 자동 생성]"]
        if assignee:
            description_parts.append(f"담당자: {assignee}")

        event_body = {
            "summary": title,
            "description": "\n".join(description_parts),
            "start": {
                "dateTime": start_dt,
                "timeZone": "Asia/Seoul",
            },
            "end": {
                "dateTime": end_dt,
                "timeZone": "Asia/Seoul",
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 30},
                ],
            },
        }

        try:
            result = service.events().insert(
                calendarId="primary",
                body=event_body,
            ).execute()

            event_id = result.get("id", "")
            created_ids.append(event_id)
            logger.info("Calendar 이벤트 생성: %s (id=%s)", title, event_id)

        except Exception as e:
            logger.error("이벤트 생성 실패 (%s): %s", title, e)
            # 개별 이벤트 실패는 건너뜀 (전체 중단 X)

    return created_ids
