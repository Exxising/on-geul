"""
POST /transcribe
음성 파일(mp3/wav/m4a)을 받아 텍스트로 변환합니다.
"""

from fastapi import APIRouter, UploadFile, File
from models.schemas import TranscribeResponse
from services.stt import transcribe_audio

router = APIRouter(prefix="/transcribe", tags=["STT"])


@router.post("", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(..., description="음성 파일 (mp3/wav/m4a, 최대 25MB)")
):
    """
    음성 파일을 업로드하면 텍스트(transcript)를 반환합니다.

    - **file**: multipart/form-data 형식의 음성 파일
    - **returns**: 변환된 텍스트 + 재생 시간(초)
    """
    transcript, duration = await transcribe_audio(file)
    return TranscribeResponse(transcript=transcript, duration_seconds=duration)
