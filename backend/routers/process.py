"""
POST /process
음성 파일 업로드 → STT → LLM 문서 생성 → 결과 반환
Phase 1의 핵심 통합 엔드포인트
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.schemas import ProcessResponse
from services.stt import transcribe_audio
from services.llm import generate_document

router = APIRouter(prefix="/process", tags=["Pipeline"])

SUPPORTED_DOMAINS = {"meeting", "consultation", "welfare"}


@router.post("", response_model=ProcessResponse)
async def process_audio(
    file: UploadFile = File(..., description="음성 파일 (mp3/wav/m4a, 최대 25MB)"),
    domain: str = Form(default="meeting", description="문서 도메인: meeting | consultation | welfare"),
):
    """
    음성 파일 하나로 STT + 문서 생성을 한 번에 처리합니다.

    - **file**: 음성 파일 (multipart/form-data)
    - **domain**: 문서 유형 (기본값: meeting)
    - **returns**: 텍스트 + 구조화된 문서 JSON
    """
    if domain not in SUPPORTED_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 도메인입니다. 지원 도메인: {', '.join(SUPPORTED_DOMAINS)}"
        )

    # 1단계: STT
    try:
        transcript, duration = await transcribe_audio(file)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"STT 처리 중 오류: {str(e)}")

    if not transcript.strip():
        raise HTTPException(status_code=422, detail="음성에서 텍스트를 추출하지 못했습니다.")

    # 2단계: LLM 문서 생성
    try:
        document = await generate_document(transcript=transcript, domain=domain)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"문서 생성 중 오류: {str(e)}")

    # Phase 2에서 Firebase 저장 후 doc_id 채울 예정
    return ProcessResponse(
        transcript=transcript,
        document=document,
        doc_id=None,
    )
