"""
POST /extract-entities — 지식그래프용 엔티티 추출
이순재 Neo4j 연동 및 이수민 그래프 시각화에 활용
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["Entities"])


class EntitiesRequest(BaseModel):
    doc_id: Optional[str] = None   # _jobs에서 transcript 조회
    text: Optional[str] = None     # 직접 텍스트 전달 시


class EntitiesResponse(BaseModel):
    people: list[str]
    topics: list[str]
    decisions: list[str]
    events: list[str]


@router.post("/extract-entities", response_model=EntitiesResponse)
async def extract_entities(body: EntitiesRequest):
    """
    회의록·상담일지·복지활동일지 텍스트에서 지식그래프용 엔티티를 추출합니다.

    - **doc_id**: 처리 완료된 문서 ID (POST /process 응답의 id)
    - **text**: 직접 텍스트를 전달하는 경우 사용
    - **returns**: {people, topics, decisions, events}
    """
    from services.entities import extract_entities as _extract

    # 텍스트 소스 결정
    if body.doc_id:
        from routers.process import get_job
        job = get_job(body.doc_id)
        if job is None:
            raise HTTPException(status_code=404, detail="존재하지 않는 문서 ID입니다.")
        if job["status"] != "done":
            raise HTTPException(status_code=409, detail="문서 처리가 아직 완료되지 않았습니다.")

        transcript = job.get("transcript", "")
        document = job.get("document")
        # transcript + 문서 요약을 합쳐서 엔티티 추출 정확도 향상
        if document:
            doc_text = document.content.summary + "\n" + "\n".join(
                f"{d.topic}: {d.details}" for d in document.content.discussions
            )
            text = f"{transcript}\n\n[문서 요약]\n{doc_text}"
        else:
            text = transcript

    elif body.text:
        text = body.text

    else:
        raise HTTPException(status_code=400, detail="doc_id 또는 text 중 하나를 반드시 제공해야 합니다.")

    try:
        result = await _extract(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"엔티티 추출 중 오류: {str(e)}")

    return result
