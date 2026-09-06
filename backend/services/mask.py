"""
LLM 기반 개인정보 마스킹 서비스 — Gemini API 사용

DUMMY_MODE=true  → 빈 결과 반환 (regex fallback은 routers/mask.py에서 처리)
DUMMY_MODE=false → Gemini API 실제 호출
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

DUMMY_MODE = os.getenv("DUMMY_MODE", "true").lower() == "true"

_MASKING_PROMPT = """\
You are a Korean privacy protection AI. Detect all personal information (PII) in the given Korean text.

## Detection targets
이름(name), 전화번호(phone), 주민번호(Korean SSN), 주소(address), 병명(medical condition),
금융정보(카드)(card number), 이메일(email), 계좌번호(bank account), 사업자번호(business registration number), 소속/직책(affiliation/title)

## Masking level: {level}
- full: replace with fixed placeholder (e.g., "***" for names, "[주소삭제]" for addresses, "[병명삭제]" for medical conditions, "****-****-****-****" for cards)
- pseudonym: partial masking (e.g., "홍*동" for 3-char names, "010-****-5678" for phones, "950101-*******" for SSN, first 2 chars + *** for emails)
- original: no masking — set masked equal to original value

## Output format
Return ONLY a JSON object — no markdown fences, no explanation:
{{
  "detected": [
    {{
      "type": "이름",
      "original": "홍길동",
      "masked": "홍*동"
    }}
  ]
}}

Rules:
- Detect ALL occurrences. For the same value appearing multiple times, include it only once.
- If nothing is detected, return {{"detected": []}}.
- Use the exact type names listed above (Korean).

Text to analyze:
{text}"""


async def mask_with_llm(
    text: str,
    level: str = "pseudonym",
    selected_types: Optional[dict] = None,
) -> tuple[str, list]:
    """
    Gemini API로 개인정보를 탐지·마스킹합니다.

    Returns:
        (masked_text, detected_items)
        detected_items: [{id, type, value, masked, level}]
    """
    if DUMMY_MODE:
        return text, []

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage
    from langchain_core.output_parsers import JsonOutputParser

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0,
    )
    chain = llm | JsonOutputParser()

    prompt = _MASKING_PROMPT.format(level=level, text=text)

    last_exc: Optional[Exception] = None
    for attempt in range(3):
        try:
            raw: dict = await chain.ainvoke([HumanMessage(content=prompt)])
            detected_raw: list = raw.get("detected", [])

            # selectedTypes 필터 적용
            if selected_types is not None:
                detected_raw = [
                    item for item in detected_raw
                    if selected_types.get(item.get("type"), True)
                ]

            level_label = (
                "완전삭제" if level == "full"
                else "가명처리" if level == "pseudonym"
                else "원본유지"
            )
            detected_items = [
                {
                    "id": idx + 1,
                    "type": item.get("type", ""),
                    "value": item.get("original", ""),
                    "masked": item.get("masked", item.get("original", "")),
                    "level": level_label,
                }
                for idx, item in enumerate(detected_raw)
            ]

            # 긴 문자열 먼저 치환 (서브스트링 충돌 방지)
            masked_text = text
            for item in sorted(detected_items, key=lambda x: len(x["value"]), reverse=True):
                if item["value"] and item["value"] != item["masked"]:
                    masked_text = masked_text.replace(item["value"], item["masked"])

            return masked_text, detected_items

        except Exception as e:
            last_exc = e
            logger.warning("LLM 마스킹 실패 (시도 %d/3): %s", attempt + 1, e)

    raise RuntimeError(f"LLM 마스킹 3회 모두 실패: {last_exc}") from last_exc
