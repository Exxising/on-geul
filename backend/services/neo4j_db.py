"""
Neo4j 서비스
Phase 2: AuraDB 연결 사전 검증
Phase 3: 지식그래프 본격 구현

환경변수:
  NEO4J_URI       neo4j+s://xxxx.databases.neo4j.io
  NEO4J_USERNAME  neo4j
  NEO4J_PASSWORD  ...
"""

import os
import logging

logger = logging.getLogger(__name__)


def _get_driver():
    from neo4j import AsyncGraphDatabase

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    if not uri or not password:
        raise RuntimeError("NEO4J_URI 또는 NEO4J_PASSWORD가 .env에 설정되지 않았습니다.")

    return AsyncGraphDatabase.driver(uri, auth=(user, password))


# ── Phase 2: 사전 검증 ────────────────────────────────────────────────────────

async def verify_connection() -> dict:
    """
    Neo4j AuraDB 연결을 테스트합니다.
    노드 저장 → 조회 → 삭제 전체 사이클을 검증합니다.

    Returns:
        { success: bool, message: str, detail: dict }
    """
    driver = _get_driver()
    test_id = "ongeul-verify-test"

    try:
        async with driver.session() as session:
            # 1. 노드 생성
            await session.run(
                "CREATE (n:VerifyTest {id: $id, name: '온글 검증 노드'}) RETURN n",
                id=test_id,
            )
            logger.info("Neo4j 검증: 노드 생성 완료")

            # 2. 노드 조회
            result = await session.run(
                "MATCH (n:VerifyTest {id: $id}) RETURN n.name AS name",
                id=test_id,
            )
            record = await result.single()
            name = record["name"] if record else None
            logger.info("Neo4j 검증: 노드 조회 완료 (name=%s)", name)

            # 3. 노드 삭제
            await session.run(
                "MATCH (n:VerifyTest {id: $id}) DELETE n",
                id=test_id,
            )
            logger.info("Neo4j 검증: 노드 삭제 완료")

        return {
            "success": True,
            "message": "Neo4j AuraDB 연결 및 CRUD 검증 완료",
            "detail": {"node_name": name},
        }

    except Exception as e:
        logger.error("Neo4j 검증 실패: %s", e)
        return {
            "success": False,
            "message": f"Neo4j 연결 실패: {str(e)}",
            "detail": {},
        }
    finally:
        await driver.close()


# ── Phase 3: 지식그래프 ────────────────────────────────────────────────────────

async def save_entities(doc_id: str, entities: dict) -> None:
    """
    엔티티 JSON을 Neo4j 노드/엣지로 저장합니다. (Phase 3)
    entities: { people, topics, decisions, events }
    """
    driver = _get_driver()

    try:
        async with driver.session() as session:
            # Meeting 노드 생성
            await session.run(
                "MERGE (m:Meeting {id: $doc_id})",
                doc_id=doc_id,
            )

            # Person 노드 + 관계
            for person in entities.get("people", []):
                await session.run(
                    """
                    MERGE (p:Person {name: $name})
                    WITH p
                    MATCH (m:Meeting {id: $doc_id})
                    MERGE (p)-[:PARTICIPATED_IN]->(m)
                    """,
                    name=person, doc_id=doc_id,
                )

            # Topic 노드 + 관계
            for topic in entities.get("topics", []):
                await session.run(
                    """
                    MERGE (t:Topic {name: $name})
                    WITH t
                    MATCH (m:Meeting {id: $doc_id})
                    MERGE (m)-[:DISCUSSED]->(t)
                    """,
                    name=topic, doc_id=doc_id,
                )

            # Decision 노드 + 관계
            for decision in entities.get("decisions", []):
                await session.run(
                    """
                    MERGE (d:Decision {content: $content})
                    WITH d
                    MATCH (m:Meeting {id: $doc_id})
                    MERGE (m)-[:DECIDED]->(d)
                    """,
                    content=decision, doc_id=doc_id,
                )

        logger.info("Neo4j 엔티티 저장 완료 (doc_id=%s)", doc_id)

    finally:
        await driver.close()


async def get_graph(doc_id: str) -> dict:
    """특정 회의의 노드/엣지를 반환합니다 (이수민 시각화용). (Phase 3)"""
    driver = _get_driver()

    try:
        async with driver.session() as session:
            result = await session.run(
                """
                MATCH (m:Meeting {id: $doc_id})-[r]-(n)
                RETURN m, r, n
                """,
                doc_id=doc_id,
            )
            records = await result.data()

        nodes = []
        edges = []
        seen_nodes = set()

        for rec in records:
            m = rec.get("m", {})
            n = rec.get("n", {})
            r = rec.get("r", {})

            m_id = m.get("id", doc_id)
            if m_id not in seen_nodes:
                nodes.append({"id": m_id, "label": "회의", "type": "Meeting"})
                seen_nodes.add(m_id)

            n_label = list(n.labels)[0] if hasattr(n, "labels") else "Node"
            n_id = n.get("id") or n.get("name") or n.get("content", "")
            if n_id and n_id not in seen_nodes:
                nodes.append({"id": n_id, "label": n_id, "type": n_label})
                seen_nodes.add(n_id)

            if n_id:
                edges.append({"source": m_id, "target": n_id, "relation": type(r).__name__})

        return {"nodes": nodes, "edges": edges}

    finally:
        await driver.close()


async def run_cypher(cypher: str) -> list:
    """Cypher 쿼리를 실행하고 결과를 반환합니다. (Phase 3)"""
    driver = _get_driver()

    try:
        async with driver.session() as session:
            result = await session.run(cypher)
            return await result.data()
    finally:
        await driver.close()
