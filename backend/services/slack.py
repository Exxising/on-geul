"""
Slack Webhook 서비스 (Phase 2)
Incoming Webhook URL로 회의 요약 결과를 Slack 채널에 전송합니다.

환경변수:
  SLACK_WEBHOOK_URL  https://hooks.slack.com/services/...
"""

import os
import logging

logger = logging.getLogger(__name__)


def _format_message(document: dict) -> dict:
    """
    DocumentResult dict를 Slack Block Kit 메시지로 변환합니다.
    """
    title = document.get("title", "회의록")
    domain_map = {"meeting": "회의록", "consultation": "상담일지", "welfare": "복지활동일지"}
    domain_label = domain_map.get(document.get("domain", "meeting"), "문서")

    participants = document.get("participants", [])
    participants_str = ", ".join(participants) if participants else "없음"

    content = document.get("content", {})
    summary = content.get("summary", "")

    action_items = document.get("actionItems", document.get("action_items", []))

    # 액션아이템 텍스트 생성
    action_text_lines = []
    for item in action_items[:5]:  # 최대 5개만 표시
        t = item.get("title", "")
        assignee = item.get("assignee") or item.get("assignee")
        due = item.get("dueDate") or item.get("due_date")
        line = f"• {t}"
        if assignee:
            line += f" — *{assignee}*"
        if due:
            line += f" ({due})"
        action_text_lines.append(line)

    action_text = "\n".join(action_text_lines) if action_text_lines else "없음"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"📝 {domain_label}: {title}"},
        },
        {"type": "divider"},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*👥 참석자*\n{participants_str}"},
                {"type": "mrkdwn", "text": f"*📂 문서 유형*\n{domain_label}"},
            ],
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*📋 요약*\n{summary}"},
        },
    ]

    if action_text_lines:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*✅ 액션아이템*\n{action_text}"},
        })

    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [
            {"type": "mrkdwn", "text": "온글(On-Geul) — AI 회의록 자동화 서비스"}
        ],
    })

    return {
        "text": f"[온글] {title} 회의록이 생성되었습니다.",  # 알림 fallback 텍스트
        "blocks": blocks,
    }


async def send_slack_notification(document: dict) -> bool:
    """
    문서 JSON을 받아 Slack 채널에 알림을 전송합니다.

    Args:
        document: DocumentResult.model_dump(by_alias=True) 딕셔너리

    Returns:
        True (성공) / False (실패 또는 미설정)
    """
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        logger.warning("SLACK_WEBHOOK_URL이 설정되지 않아 알림을 전송하지 않습니다.")
        return False

    import httpx

    payload = _format_message(document)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)

        if resp.status_code == 200 and resp.text == "ok":
            logger.info("Slack 알림 전송 완료")
            return True
        else:
            logger.error("Slack 알림 실패: status=%d body=%s", resp.status_code, resp.text)
            return False

    except Exception as e:
        logger.error("Slack 알림 전송 중 오류: %s", e)
        return False
