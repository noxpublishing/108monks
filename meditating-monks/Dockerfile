FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    MM_DATA_DIR=/app/data MM_CONFIG=/app/config/node.json \
    MM_PEERS=/app/config/peers.json MM_MEDIA_DIR=/app/media
WORKDIR /app
COPY requirements-lock.txt ./
RUN pip install --no-cache-dir -r requirements-lock.txt \
    && groupadd --gid 10001 monk \
    && useradd --uid 10001 --gid 10001 --no-create-home monk
COPY --chown=10001:10001 . /app
RUN mkdir -p /app/data /app/media && chown -R 10001:10001 /app/data /app/media
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log", "--limit-concurrency", "200", "--timeout-keep-alive", "5"]
