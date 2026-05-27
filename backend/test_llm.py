"""
generate_document() 단독 테스트 스크립트
실행: python test_llm.py
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# backend/ 루트를 sys.path에 추가 (models, services import용)
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

TRANSCRIPT = (
    "오늘 회의에서 강유민이 LLM 파트를 맡고, "
    "이순재가 백엔드, 이수민이 프론트엔드를 담당하기로 했습니다. "
    "예선 제출은 5월 23일 토요일까지이고, "
    "강유민이 services/llm.py를 내일까지 완성하기로 결정했습니다."
)


async def main():
    dummy_mode = os.getenv("DUMMY_MODE", "true").lower() == "true"
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    print("=" * 60)
    print(f"DUMMY_MODE : {dummy_mode}")
    print(f"GEMINI_KEY : {'설정됨' if gemini_key else '없음 (DUMMY_MODE=true 필요)'}")
    print("=" * 60)

    if not dummy_mode and not gemini_key:
        print("[오류] DUMMY_MODE=false인데 GEMINI_API_KEY가 없습니다.")
        print("       .env 파일에 GEMINI_API_KEY=AIza... 를 추가하세요.")
        return

    from services.llm import generate_document

    print("\n[입력 텍스트]")
    print(TRANSCRIPT)
    print("\n[generate_document() 호출 중...]\n")

    result = await generate_document(transcript=TRANSCRIPT, domain="meeting")

    # camelCase JSON으로 출력
    print("[결과 JSON]")
    print(json.dumps(result.model_dump(by_alias=True), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
