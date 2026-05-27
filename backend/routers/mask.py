"""
POST /mask — 개인정보 마스킹 엔드포인트

서버사이드 정규식 기반 마스킹 엔진.
프론트엔드 요청: POST /mask { id, level, selectedTypes }
프론트엔드 기대 응답: { maskedContent, detectedItems }
"""

import re
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, List

router = APIRouter(tags=["Masking"])


class MaskRequest(BaseModel):
    id: str
    level: Optional[str] = "pseudonym"
    selectedTypes: Optional[Dict[str, bool]] = None


# ── 개인정보 패턴 정의 ─────────────────────────────────────────────────────────
_PATTERNS: Dict[str, str] = {
    "주민번호":       r"\b(\d{6})\s*-\s*([1-4]\d{6})\b",
    "금융정보(카드)": r"\b\d{4}-\d{4}-\d{4}-\d{4}\b",
    "계좌번호":       r"\b\d{3,6}-\d{2,6}-\d{4,8}\b",
    "사업자번호":     r"\b\d{3}-\d{2}-\d{5}\b",
    "전화번호":       r"\b(010|02|031|032|033|041|042|043|051|052|053|054|055|061|062|063|064|0505|070|080)-\d{3,4}-\d{4}\b",
    "이메일":         r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b",
    "주소":           r"\b(서울특별시|서울시|경기도|인천광역시|부산광역시|대구광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|강원도|제주도)\s+[가-힣0-9\s\-\.]+?(구|시|군|로|길|동|읍|면|번지)\b",
    "병명":           r"(고혈압|당뇨병|당뇨|관절염|우울증|조현병|치매|고지혈증|폐암|위암|대장암|심장질환|뇌졸중|불면증|수면장애|공황장애|불안장애|ADHD)",
    "소속/직책":      r"[가-힣]{1,6}?\s*(대리|과장|차장|부장|이사|상무|전무|사장|대표|팀장|실장|본부장|센터장|사회복지사|복지사|상담사|상담원|주임|수석|책임|선임)",
    "이름":           r"[가-힣]{2,4}",
}

_NAME_EXCLUSIONS = {
    "회의", "회의록", "결과", "전략", "협의", "의결", "차주", "할당", "일정", "달력", "디자인",
    "프론트", "백엔드", "상담", "복지", "어르신", "활동", "방문", "독거", "보건", "의사", "환자",
    "서울시", "경기도", "성남시", "강남구", "분당구", "대화", "요청", "확인", "의견",
    "네이버", "카카오", "구글", "라인", "토스", "대리", "과장", "부장", "차장", "사장",
    "완료", "처리", "적용", "등록", "배포", "연동", "설계", "구성", "개발", "업로드", "히스토리",
    "캘린더", "업그레이드", "라이브러리", "시스템", "컴포넌트", "환경", "템플릿", "화면", "전환",
    "뼈대", "완성", "공유", "작성", "가이드", "라인", "색상", "버튼", "테마", "컬러",
    "요약", "논의", "결정", "내용", "사항",
}


def _apply_mask(type_name: str, value: str, level: str) -> str:
    if level == "original":
        return value

    if level == "full":
        full_map = {
            "이름":           "***",
            "전화번호":        "***-****-****",
            "주민번호":        "******-*******",
            "주소":            "[주소삭제]",
            "병명":            "[병명삭제]",
            "금융정보(카드)":  "****-****-****-****",
            "이메일":          "***@***.***",
            "계좌번호":        "***-***-******",
            "사업자번호":      "***-**-*****",
            "소속/직책":       "[직책삭제]",
        }
        return full_map.get(type_name, "***")

    # pseudonym (가명처리)
    if type_name == "이름":
        if len(value) == 2:
            return value[0] + "*"
        if len(value) == 3:
            return value[0] + "*" + value[2]
        return value[0] + "*" * (len(value) - 2) + value[-1]

    if type_name == "전화번호":
        parts = value.split("-")
        return f"{parts[0]}-****-{parts[2]}" if len(parts) == 3 else "***-****-****"

    if type_name == "주민번호":
        parts = value.split("-")
        return f"{parts[0].strip()}-*******"

    if type_name == "이메일" and "@" in value:
        user, domain = value.split("@", 1)
        masked = user[0] + "*" if len(user) <= 2 else user[:2] + "*" * (len(user) - 2)
        return f"{masked}@{domain}"

    if type_name == "금융정보(카드)":
        parts = value.split("-")
        return f"{parts[0]}-****-****-{parts[3]}" if len(parts) >= 4 else "****-****-****-****"

    if type_name == "계좌번호":
        parts = value.split("-")
        return f"{parts[0]}-***-{'*' * len(parts[-1])}" if len(parts) >= 3 else "***-***-******"

    if type_name == "사업자번호":
        parts = value.split("-")
        return f"{parts[0]}-**-***{parts[2][-2:]}" if len(parts) == 3 else "***-**-*****"

    if type_name == "주소":
        words = value.strip().split()
        return f"{words[0]} {words[1]} ****" if len(words) >= 2 else f"{words[0]} ****"

    if type_name == "병명":
        return value[0] + "*" if len(value) == 2 else value[0] + "*" + value[-1]

    if type_name == "소속/직책":
        return value[0] + "*" if len(value) <= 2 else value[0] + "*" * (len(value) - 2) + value[-1]

    return value


def _detect_and_mask(text: str, level: str, selected_types: Optional[Dict[str, bool]] = None) -> tuple:
    """텍스트에서 개인정보를 탐지하고 마스킹 처리하여 (maskedContent, detectedItems) 반환."""
    detected: List[dict] = []
    seen: set = set()  # (type, value) 중복 방지

    # 패턴 순서: 특이적인 것 먼저 (서브스트링 충돌 방지)
    ordered_types = [
        "주민번호", "금융정보(카드)", "계좌번호", "사업자번호",
        "전화번호", "이메일", "주소", "병명", "소속/직책", "이름"
    ]

    for type_name in ordered_types:
        pattern = _PATTERNS[type_name]
        for m in re.finditer(pattern, text):
            val = m.group(0)

            # 이름 예외 처리
            if type_name == "이름":
                if val in _NAME_EXCLUSIONS:
                    continue
                # 이미 탐지된 다른 항목의 서브스트링이면 건너뜀
                if any(val in s_val for _, s_val in seen):
                    continue

            key = (type_name, val)
            if key not in seen:
                seen.add(key)
                detected.append({"type": type_name, "value": val})

    # ID 부여 + 마스킹 값 계산
    detected_items = []
    for idx, item in enumerate(detected, 1):
        masked_val = _apply_mask(item["type"], item["value"], level)
        detected_items.append({
            "id": idx,
            "type": item["type"],
            "value": item["value"],
            "masked": masked_val,
            "level": "완전삭제" if level == "full" else "가명처리" if level == "pseudonym" else "원본유지",
        })

    # 본문에서 실제 치환 (긴 문자열 먼저 → 서브스트링 오작동 방지)
    masked_content = text
    replace_items = sorted(detected_items, key=lambda x: len(x["value"]), reverse=True)

    for item in replace_items:
        # selectedTypes 체크: 해당 타입이 활성화된 경우만 치환
        is_active = True
        if selected_types is not None:
            is_active = selected_types.get(item["type"], True)

        if is_active:
            masked_content = masked_content.replace(item["value"], item["masked"])

    return masked_content, detected_items


@router.post("/mask")
async def mask_document(body: MaskRequest):
    """
    회의록 본문 내 개인정보를 서버사이드 정규식으로 탐지·마스킹하여 반환합니다.

    Response:
        maskedContent  - 마스킹 처리된 본문 문자열
        detectedItems  - 탐지된 개인정보 목록 [{id, type, value, masked}]
    """
    from routers.process import get_job

    job = get_job(body.id)
    if job is None:
        return JSONResponse(
            status_code=404,
            content={"message": "존재하지 않는 문서 ID입니다."},
        )

    # 문서 본문 텍스트 구성 (documents.py와 동일한 포맷팅)
    document = job.get("document")
    if document:
        summary = document.content.summary
        discussions_str = "\n".join(
            f"• {d.topic}: {d.details}" for d in document.content.discussions
        )
        decisions_str = "\n".join(f"- {dec}" for dec in document.content.decisions)

        parts = []
        if summary:
            parts.append(f"[요약]\n{summary}")
        if discussions_str:
            parts.append(f"[논의 내용]\n{discussions_str}")
        if decisions_str:
            parts.append(f"[결정 사항]\n{decisions_str}")
        text = "\n\n".join(parts)
    else:
        text = ""

    masked_content, detected_items = _detect_and_mask(text, body.level or "pseudonym", body.selectedTypes)

    return {
        "maskedContent": masked_content,
        "detectedItems": detected_items,
    }
