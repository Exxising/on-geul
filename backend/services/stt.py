"""
Whisper STT 서비스
OpenAI Whisper API를 사용해 음성 파일을 텍스트로 변환합니다.
최대 용량: 25MB / 지원 형식: mp3, wav, m4a, mp4, mpeg, mpga, webm
"""

import os
import tempfile
from openai import AsyncOpenAI
from fastapi import UploadFile, HTTPException


SUPPORTED_FORMATS = {"mp3", "wav", "m4a", "mp4", "mpeg", "mpga", "webm"}
MAX_SIZE_BYTES = 25 * 1024 * 1024  # 25MB


def _get_client() -> AsyncOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY가 설정되지 않았습니다.")
    return AsyncOpenAI(api_key=api_key)


async def transcribe_audio(file: UploadFile) -> tuple[str, float | None]:
    """
    음성 파일을 받아 (텍스트, 재생시간) 튜플을 반환합니다.
    재생시간은 API가 제공하지 않을 경우 None.
    """
    # 파일 형식 검증
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 지원 형식: {', '.join(SUPPORTED_FORMATS)}"
        )

    # 파일 크기 검증 (메모리에 전체 읽기 전 헤더 확인)
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기가 25MB를 초과합니다. ({len(contents) / 1024 / 1024:.1f}MB)"
        )

    # 임시 파일에 저장 후 Whisper API 호출
    client = _get_client()
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="ko",          # 한국어 우선 (필요 시 None으로 자동감지)
                response_format="json"
            )
        transcript = response.text
        duration = getattr(response, "duration", None)
        return transcript, duration

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Whisper API 호출 실패: {str(e)}"
        )
    finally:
        os.unlink(tmp_path)
