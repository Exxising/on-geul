# process.py 변경 내역 정리

`backend/routers/process.py` 파일의 구조가 동기식(Sync) 파이프라인에서 비동기식(Async) 백그라운드 태스크 및 폴링(Polling) 구조로 변경되었습니다.

---

## 1. 주요 변경 방향

*   **동기식 → 비동기 백그라운드 처리 (FastAPI `BackgroundTasks` 도입)**
    *   기존: 오디오 파일 업로드 시 STT와 LLM 생성이 모두 완료될 때까지 대기한 후 결과를 반환하여 시간이 오래 걸렸습니다.
    *   변경: 업로드 즉시 작업 ID(`doc_id`)와 `status: "processing"` 상태를 즉시 반환하고, 실제 STT/LLM 파이프라인은 백그라운드에서 실행합니다.
*   **엔드포인트 통합 및 하위 호환성 확보**
    *   `upload.py`를 삭제하고 모든 업로드/처리 로직을 `process.py`로 통합했습니다.
    *   프론트엔드 코드 수정 없이 호환되도록 `POST /process`와 `POST /upload` 엔드포인트를 모두 지원합니다.

---

## 2. 코드 구조 비교

### 변경 전 (구조 및 흐름)
```python
# 1. 파일 받음 (동기 대기)
# 2. STT 수행 (대기)
# 3. LLM 요약 (대기)
# 4. 결과 즉시 반환 (완료까지 약 30초~2분 대기 필요)

@router.post("", response_model=ProcessResponse)
async def process_audio(file: UploadFile, domain: str):
    transcript, duration = await transcribe_audio(file)
    document = await generate_document(transcript, domain)
    return ProcessResponse(transcript=transcript, document=document)
```

### 변경 후 (비동기 폴링 구조)
```python
# 1. 파일 받음
# 2. uuid 기반 고유 doc_id 생성 및 인메모리 저장소(_jobs)에 "processing" 상태 등록
# 3. BackgroundTasks에 STT -> LLM 파이프라인 등록
# 4. 즉시 {"id": doc_id, "status": "processing"} 응답 반환
# 5. 백그라운드에서 작업 완료 시 _jobs[doc_id]의 상태를 "done" 또는 "error"로 갱신

_jobs = {} # 인메모리 상태 저장소

async def _run_pipeline(doc_id, contents, filename, domain):
    # 백그라운드 실행 로직 (STT -> LLM)
    ...
    _jobs[doc_id]["status"] = "done"

@router.post("/process")
async def process_audio(background_tasks: BackgroundTasks, file: UploadFile, domain: str):
    return await _handle_upload(background_tasks, file, domain)

@router.post("/upload") # 하위 호환용 추가
async def upload_audio(background_tasks: BackgroundTasks, file: UploadFile, domain: str):
    return await _handle_upload(background_tasks, file, domain)
```

---

## 3. 디버깅 및 테스트 편의성 추가

*   **`DUMMY_STT` 환경 변수 지원**
    *   Groq Whisper API 호출 횟수를 아끼거나 API 키 설정 없이 백엔드 전체 흐름을 테스트하고 싶을 때 사용합니다.
    *   `.env`에 `DUMMY_STT=true`를 설정하면 Groq API 호출 없이 즉시 미리 정의된 한국어 더미 텍스트가 LLM 파이프라인으로 전달됩니다.
    *   LLM 파트의 `DUMMY_MODE=true`와 조합하여 **완전 오프라인 무료 테스트**가 가능합니다.
