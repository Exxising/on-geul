"""
Neo4j 서비스 (Phase 2 검증 / Phase 3 본격 구현)
AuraDB 무료 인스턴스를 사용합니다.
노드 유형: Person, Topic, Decision, Meeting
"""

# TODO: Phase 2 - AuraDB 연동 검증
# TODO: Phase 3 - 지식그래프 본격 구현

# from neo4j import AsyncGraphDatabase
# import os

async def verify_connection() -> bool:
    """Neo4j 연결 테스트 (Phase 2)"""
    raise NotImplementedError("Phase 2에서 구현 예정")

async def save_entities(doc_id: str, entities: dict) -> None:
    """엔티티 JSON을 노드/엣지로 Neo4j에 저장합니다 (Phase 3)."""
    raise NotImplementedError("Phase 3에서 구현 예정")

async def get_graph(doc_id: str) -> dict:
    """특정 회의의 노드/엣지를 반환합니다 (Phase 3)."""
    raise NotImplementedError("Phase 3에서 구현 예정")

async def run_cypher(cypher: str) -> list:
    """Cypher 쿼리를 실행하고 결과를 반환합니다 (Phase 3)."""
    raise NotImplementedError("Phase 3에서 구현 예정")
