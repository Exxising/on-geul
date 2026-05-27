# ── 온글 백엔드 Dockerfile ────────────────────────────────────────────────────
# GCP Cloud Run 배포용
# 로컬 빌드 테스트: docker build -t ongeul-backend . && docker run -p 8000:8000 --env-file .env ongeul-backend

FROM python:3.11-slim

# 작업 디렉토리
WORKDIR /app

# 의존성 먼저 복사 (레이어 캐싱 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# 포트 노출 (Cloud Run 기본 포트)
EXPOSE 8080

# 실행 (Cloud Run은 PORT 환경변수를 주입함)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
