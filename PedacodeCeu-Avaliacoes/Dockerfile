FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# --root-path /api: o nginx recebe /api/avaliacoes/... e repassa como /avaliacoes/...
# Com isso o Swagger (/api/avaliacoes/docs) monta os links certos.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--root-path", "/api", "--no-access-log", "--proxy-headers", "--forwarded-allow-ips", "*"]
