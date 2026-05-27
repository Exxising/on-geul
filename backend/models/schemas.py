"""
온글 백엔드 — Pydantic 요청/응답 스키마 정의
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List


# ─── 카멜케이스 직렬화 베이스 (문서 관련 모델) ────────────────────────────────────

class _CamelBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


# ─── STT (/transcribe) ────────────────────────────────────────────────────────

class TranscribeResponse(BaseModel):
    transcript: str
    duration_seconds: Optional[float] = None


# ─── LLM 문서 생성 결과 ─────────────────────────────────────────────────────────

class DiscussionItem(_CamelBase):
    topic: str
    details: str


class DocumentContent(_CamelBase):
    summary: str
    discussions: List[DiscussionItem] = []
    decisions: List[str] = []


class ActionItem(_CamelBase):
    title: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None      # JSON: "dueDate"
    completed: bool = False


class MaskedField(_CamelBase):
    # Phase 2 마스킹 작업 시 채워짐. Phase 1에서는 빈 배열로 둠.
    # type 예시: "name" | "phone" | "rrn" | "address" | "disease"
    #           | "card" | "email" | "account" | "businessNo" | "affiliation"
    type: str
    original: str   # 원본 텍스트 (예: "강유민")
    masked: str     # 마스킹 결과 (예: "[NAME_1]")


class DocumentResult(_CamelBase):
    title: str
    domain: str = "meeting"
    participants: List[str] = []
    content: DocumentContent
    action_items: List[ActionItem] = []     # JSON: "actionItems"
    masked_fields: List[MaskedField] = []   # JSON: "maskedFields"


# ─── 통합 파이프라인 (/process) ────────────────────────────────────────────────

class ProcessResponse(BaseModel):
    transcript: str
    document: DocumentResult
    doc_id: Optional[str] = None        # Firebase 저장 후 채워짐 (Phase 2)


# ─── Google Calendar (/schedule) ──────────────────────────────────────────────

class ScheduleRequest(BaseModel):
    action_items: List[ActionItem]
    calendar_token: Optional[str] = None   # OAuth2 access token


class ScheduleResponse(BaseModel):
    created_events: List[str]
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
    created_at: str                     # ISO 8601
    domain: str                         # "meeting" | "consultation" | "welfare"
    result: DocumentResult


class DocumentListResponse(BaseModel):
    documents: List[DocumentRecord]


# ─── Neo4j 그래프 (/graph) ────────────────────────────────────────────────────

class Entity(BaseModel):
    people: List[str]
    topics: List[str]
    decisions: List[str]
    events: List[str]


class GraphRequest(BaseModel):
    doc_id: str
    entities: Entity


class GraphNode(BaseModel):
    id: str
    label: str
    type: str                           # "Person" | "Topic" | "Decision" | "Meeting"


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# ─── 자연어 질의 (/query-graph) ───────────────────────────────────────────────

class QueryRequest(BaseModel):
    cypher: str                         # 강유민이 Gemini로 생성한 Cypher 쿼리


class QueryResponse(BaseModel):
    results: List[dict]
    summary: Optional[str] = None
