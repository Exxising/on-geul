"""
온글 백엔드 — Pydantic 요청/응답 스키마 정의
강유민이 확정한 JSON 스키마와 필드명을 맞춰주세요.
"""

from pydantic import BaseModel
from typing import Optional


# ─── STT (/transcribe) ────────────────────────────────────────────────────────

class TranscribeResponse(BaseModel):
    transcript: str
    duration_seconds: Optional[float] = None


# ─── LLM 문서 생성 결과 (강유민 스키마 기준) ────────────────────────────────────

class ActionItem(BaseModel):
    task: str
    assignee: Optional[str] = None
    due: Optional[str] = None          # ISO 8601 (예: "2026-05-23")


class DocumentResult(BaseModel):
    title: str
    participants: list[str]
    content: str
    action_items: list[ActionItem]
    masked_fields: Optional[list[str]] = None   # Phase 2 마스킹 후 채워짐


# ─── 통합 파이프라인 (/process) ────────────────────────────────────────────────

class ProcessResponse(BaseModel):
    transcript: str
    document: DocumentResult
    doc_id: Optional[str] = None        # Firebase 저장 후 채워짐 (Phase 2)


# ─── Google Calendar (/schedule) ──────────────────────────────────────────────

class ScheduleRequest(BaseModel):
    action_items: list[ActionItem]
    calendar_token: Optional[str] = None   # OAuth2 access token


class ScheduleResponse(BaseModel):
    created_events: list[str]          # 생성된 이벤트 ID 목록
    message: str


# ─── Slack 알림 (/notify) ─────────────────────────────────────────────────────

class NotifyRequest(BaseModel):
    document: DocumentResult


class NotifyResponse(BaseModel):
    success: bool
    message: str


# ─── Firebase 회의록 (/documents) ─────────────────────────────────────────────

class DocumentRecord(BaseModel):
    doc_id: str
    created_at: str                    # ISO 8601
    domain: str                        # "meeting" | "consultation" | "welfare"
    result: DocumentResult


class DocumentListResponse(BaseModel):
    documents: list[DocumentRecord]


# ─── Neo4j 그래프 (/graph) ────────────────────────────────────────────────────

class Entity(BaseModel):
    people: list[str]
    topics: list[str]
    decisions: list[str]
    events: list[str]


class GraphRequest(BaseModel):
    doc_id: str
    entities: Entity


class GraphNode(BaseModel):
    id: str
    label: str
    type: str                          # "Person" | "Topic" | "Decision" | "Meeting"


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# ─── 자연어 질의 (/query-graph) ───────────────────────────────────────────────

class QueryRequest(BaseModel):
    cypher: str                        # 강유민이 Gemini로 생성한 Cypher 쿼리


class QueryResponse(BaseModel):
    results: list[dict]
    summary: Optional[str] = None
