"""
엔티티 추출 서비스 — Gemini API 사용
지식그래프용 people / topics / decisions / events 추출

DUMMY_MODE=true  → 더미 결과 반환
DUMMY_MODE=false → Gemini API 실제 호출
"""

import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DUMMY_MODE = os.getenv("DUMMY_MODE", "true").lower() == "true"

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_entities_v1.txt"

_DUMMY_ENTITIES = {
    "people": ["강유민", "이순재", "이수민"],
    "topics": ["Phase 1 목표", "역할 분담", "API 스키마 확정", "배포 전략"],
    "decisions": [
        "백엔드 프레임워크는 FastAPI로 확정한다.",
        "LLM은 Google Gemini API를 사용하기로 결정했다.",
        "JSON 응답 키는 camelCase로 통일하기로 했다.",
    ],
    "events": [
        "2026-05-23 예선 제출 마감",
        "2026-06-05 본선 발표 (경북대학교)",
    ],
}


async def extract_entities(text: str) -> dict:
    """
    텍스트에서 지식그래프용 엔티티를 추출합니다.

    Returns:
        {"people": [...], "topics": [...], "decisions": [...], "events": [...]}
    """
    if DUMMY_MODE:
        return _DUMMY_ENTITIES

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_core.output_parsers import JsonOutputParser

    system_prompt = _PROMPT_PATH.read_text(encoding="utf-8")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0,
    )
    chain = llm | JsonOutputParser()

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=text),
    ]

    last_exc: Optional[Exception] = None
    for attempt in range(3):
        try:
            raw: dict = await chain.ainvoke(messages)
            return {
                "people":    raw.get("people", []),
                "topics":    raw.get("topics", []),
                "decisions": raw.get("decisions", []),
                "events":    raw.get("events", []),
            }
        except Exception as e:
            last_exc = e
            logger.warning("엔티티 추출 실패 (시도 %d/3): %s", attempt + 1, e)

    raise RuntimeError(f"엔티티 추출 3회 모두 실패: {last_exc}") from last_exc
