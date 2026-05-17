"""
LLM 서비스 — 강유민 모듈 연동 자리
강유민이 /generate 엔드포인트를 완성하면 아래 generate_document 함수를 실제 구현으로 교체하세요.

현재: DUMMY_MODE=True 시 더미 JSON 반환 (이수민 프론트 연동 즉시 가능)
연동 후: DUMMY_MODE=False + 강유민 함수 import
"""

import os
from models.schemas import DocumentResult, ActionItem

# ── 더미 모드 설정 ────────────────────────────────────────────────────────────
# 강유민 모듈 연동 완료 전까지는 True 유지
# 연동 완료 후 False로 변경하거나 .env에서 DUMMY_MODE=false 로 끔
DUMMY_MODE = os.getenv("DUMMY_MODE", "true").lower() == "true"

# ── 더미 결과 ────────────────────────────────────────────────────────────────
_DUMMY_RESULT = DocumentResult(
    title="[더미] 온글 프로젝트 킥오프 회의",
    participants=["이순재", "강유민", "이수민"],
    content=(
        "온글 프로젝트의 Phase 1 목표와 일정을 공유했다. "
        "백엔드는 FastAPI + Whisper API로 STT 파이프라인을 구축하고, "
        "LLM은 Gemini API 기반으로 강유민이 담당한다. "
        "프론트엔드는 Vite + React로 이수민이 구현한다."
    ),
    action_items=[
        ActionItem(task="GitHub 레포 생성 및 팀원 초대", assignee="이순재", due="2026-05-17"),
        ActionItem(task="JSON 스키마 확정 후 팀 공유", assignee="강유민", due="2026-05-16"),
        ActionItem(task="업로드 UI 기본 세팅", assignee="이수민", due="2026-05-18"),
    ],
    masked_fields=None,
)


# ── 메인 함수 (여기를 강유민 모듈로 교체) ──────────────────────────────────────

async def generate_document(transcript: str, domain: str = "meeting") -> DocumentResult:
    """
    텍스트와 도메인을 받아 구조화된 문서 JSON을 반환합니다.

    강유민 연동 전: 더미 데이터 반환
    강유민 연동 후: 아래 주석 해제 + DUMMY_MODE=False

    Args:
        transcript: STT로 변환된 회의 텍스트
        domain: "meeting" | "consultation" | "welfare"

    Returns:
        DocumentResult (title, participants, content, action_items, masked_fields)
    """
    if DUMMY_MODE:
        return _DUMMY_RESULT

    # ── 강유민 연동 시 아래 주석 해제 ──────────────────────────────────────────
    # from services.yoomin_llm import generate as yoomin_generate
    # result_dict = await yoomin_generate(text=transcript, domain=domain)
    # return DocumentResult(**result_dict)
    # ─────────────────────────────────────────────────────────────────────────

    raise NotImplementedError("강유민 LLM 모듈이 아직 연동되지 않았습니다. DUMMY_MODE=true로 설정하세요.")
