"""
POST /graph           — 엔티티 → Neo4j 저장 (Phase 3)
GET  /graph/{doc_id}  — 특정 회의 노드/엣지 반환 (Phase 3)
POST /graph/query     — Cypher 쿼리 실행 (Phase 3)
GET  /graph/verify    — Neo4j 연결 검증 (Phase 2 사전 검증)
"""

import logging
from fastapi import APIRouter, HTTPException
from models.schemas import GraphRequest, GraphResponse, QueryRequest, QueryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get("/verify")
async def verify_neo4j():
    """
    Neo4j AuraDB 연결 및 CRUD 동작을 검증합니다. (Phase 2 사전 검증용)
    NEO4J_URI, NEO4J_PASSWORD가 .env에 설정되어 있어야 합니다.
    """
    try:
        from services.neo4j_db import verify_connection
        result = await verify_connection()
        if not result["success"]:
            raise HTTPException(status_code=502, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neo4j 검증 중 오류: {e}")


@router.post("")
async def save_graph(body: GraphRequest):
    """엔티티 JSON을 Neo4j에 노드/엣지로 저장합니다. (Phase 3)"""
    try:
        from services.neo4j_db import save_entities
        entities_dict = body.entities.model_dump()
        await save_entities(doc_id=body.doc_id, entities=entities_dict)
        return {"success": True, "message": f"{body.doc_id} 엔티티 저장 완료"}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("그래프 저장 실패: %s", e)
        raise HTTPException(status_code=500, detail=f"그래프 저장 중 오류: {e}")


@router.get("/{doc_id}", response_model=GraphResponse)
async def get_graph(doc_id: str):
    """특정 회의의 노드/엣지를 반환합니다. (Phase 3, 이수민 시각화용)"""
    try:
        from services.neo4j_db import get_graph as neo4j_get_graph
        result = await neo4j_get_graph(doc_id)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"그래프 조회 중 오류: {e}")


@router.post("/query", response_model=QueryResponse)
async def query_graph(body: QueryRequest):
    """강유민이 생성한 Cypher 쿼리를 실행하고 결과를 반환합니다. (Phase 3)"""
    try:
        from services.neo4j_db import run_cypher
        results = await run_cypher(body.cypher)
        return QueryResponse(results=results)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"쿼리 실행 중 오류: {e}")
