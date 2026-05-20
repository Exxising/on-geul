"""
LLM 서비스 — Gemini API 기반 회의록 문서 생성

DUMMY_MODE=true  → 더미 JSON 반환 (기본값, 프론트 연동 즉시 가능)
DUMMY_MODE=false → Gemini API 실제 호출
"""

import os
import logging
from pathlib import Path
from typing import Optional

from models.schemas import (
    ActionItem, DocumentContent, DocumentResult, DiscussionItem,
)

logger = logging.getLogger(__name__)

DUMMY_MODE = os.getenv("DUMMY_MODE", "true").lower() == "true"

_PROMPT_DIR = Path(__file__).parent.parent / "prompts"

# ── 더미 결과 (새 스키마 기준) ─────────────────────────────────────────────────

_DUMMY_RESULT = DocumentResult(
    title="온글 프로젝트 킥오프 회의",
    domain="meeting",
    participants=["이순재", "강유민", "이수민"],
    content=DocumentContent(
        summary=(
            "온글 프로젝트의 Phase 1 목표와 역할 분담을 논의하였다. "
            "백엔드는 FastAPI + Whisper API로 STT 파이프라인을 구축하고, "
            "LLM은 Gemini API 기반으로 강유민이 담당한다. "
            "프론트엔드는 Vite + React로 이수민이 구현한다."
        ),
        discussions=[
            DiscussionItem(
                topic="프로젝트 개요 및 목표",
                details="대회 일정과 Phase 1 완료 기준을 공유하고 서비스 방향성을 확정하였다.",
            ),
            DiscussionItem(
                topic="역할 분담",
                details=(
                    "이순재: 백엔드 FastAPI 구조 설계. "
                    "강유민: Gemini LLM 연동 및 문서 생성. "
                    "이수민: 프론트엔드 Vite + React 구현."
                ),
            ),
        ],
        decisions=[
            "백엔드 프레임워크는 FastAPI로 확정한다.",
            "LLM은 Google Gemini API를 사용한다.",
            "JSON 응답 키는 카멜케이스로 통일한다.",
        ],
    ),
    action_items=[
        ActionItem(title="GitHub 레포 생성 및 팀원 초대", assignee="이순재", due_date="2026-05-17"),
        ActionItem(title="JSON 스키마 확정 후 팀 공유",   assignee="강유민", due_date="2026-05-16"),
        ActionItem(title="업로드 UI 기본 세팅",           assignee="이수민", due_date="2026-05-18"),
    ],
    masked_fields=[],
)


# ── 내부 헬퍼 ──────────────────────────────────────────────────────────────────

def _load_prompt(domain: str) -> str:
    path = _PROMPT_DIR / f"{domain}_v1.txt"
    if not path.exists():
        fallback = _PROMPT_DIR / "meeting_v1.txt"
        logger.warning("%s 프롬프트 없음, meeting으로 대체 (%s)", domain, path)
        return fallback.read_text(encoding="utf-8")
    return path.read_text(encoding="utf-8")


def _build_document(raw: dict, domain: str) -> DocumentResult:
    """LLM raw dict → DocumentResult. camelCase / snake_case 키 모두 허용."""
    c = raw.get("content", {})
    content = DocumentContent(
        summary=c.get("summary", ""),
        discussions=[
            DiscussionItem(topic=d["topic"], details=d["details"])
            for d in c.get("discussions", [])
        ],
        decisions=c.get("decisions", []),
    )

    action_items = [
        ActionItem(
            title=a.get("title", ""),
            assignee=a.get("assignee"),
            due_date=a.get("dueDate") or a.get("due_date"),
            completed=a.get("completed", False),
        )
        for a in raw.get("actionItems", raw.get("action_items", []))
    ]

    return DocumentResult(
        title=raw.get("title", ""),
        domain=domain,
        participants=raw.get("participants", []),
        content=content,
        action_items=action_items,
        masked_fields=[],
    )


# ── 메인 함수 ──────────────────────────────────────────────────────────────────

async def generate_document(transcript: str, domain: str = "meeting") -> DocumentResult:
    """
    STT 텍스트와 도메인을 받아 구조화된 문서 JSON을 반환합니다.

    Args:
        transcript: STT로 변환된 텍스트
        domain:     "meeting" | "consultation" | "welfare"

    Returns:
        DocumentResult
    """
    if DUMMY_MODE:
        return _DUMMY_RESULT

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_core.output_parsers import JsonOutputParser
    from datetime import date

    today = date.today().isoformat()
    system_prompt = f"Today's date: {today}\n\n" + _load_prompt(domain)

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.2,
    )
    chain = llm | JsonOutputParser()

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=transcript),
    ]

    last_exc: Optional[Exception] = None
    for attempt in range(3):
        try:
            raw: dict = await chain.ainvoke(messages)
            return _build_document(raw, domain)
        except Exception as e:
            last_exc = e
            logger.warning("LLM 문서 생성 실패 (시도 %d/3): %s", attempt + 1, e)

    raise RuntimeError(f"LLM 문서 생성 3회 모두 실패: {last_exc}") from last_exc
