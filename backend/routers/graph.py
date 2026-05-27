"""
POST /graph           — 엔티티 → Neo4j 저장 (Phase 3)
GET  /graph/{doc_id}  — 특정 회의 노드/엣지 반환 (Phase 3)
POST /query-graph     — Cypher 쿼리 실행 (Phase 3)
"""

from fastapi import APIRouter, HTTPException
from models.schemas import GraphRequest, GraphResponse, QueryRequest, QueryResponse

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.post("", response_model=GraphResponse)
async def save_graph(body: GraphRequest):
    """엔티티 JSON을 Neo4j에 노드/엣지로 저장합니다. Phase 3에서 구현 예정."""
    raise HTTPException(status_code=501, detail="Phase 3에서 구현 예정입니다.")


@router.get("/{doc_id}", response_model=GraphResponse)
async def get_graph(doc_id: str):
    """특정 회의의 노드/엣지를 반환합니다 (이수민 시각화용). Phase 3에서 구현 예정."""
    raise HTTPException(status_code=501, detail="Phase 3에서 구현 예정입니다.")


@router.post("/query", response_model=QueryResponse)
async def query_graph(body: QueryRequest):
    """강유민이 생성한 Cypher 쿼리를 실행하고 결과를 반환합니다. Phase 3에서 구현 예정."""
    raise HTTPException(status_code=501, detail="Phase 3에서 구현 예정입니다.")
