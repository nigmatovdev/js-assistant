# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch (add --index-url https://download.pytorch.org/whl/cu121 for CUDA)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin            /usr/local/bin

# Copy only the source code (data/ and db/ are mounted as volumes)
COPY back/ back/

# Ensure db dir exists for SQLite (may also be provided by volume mount)
RUN mkdir -p /app/db

EXPOSE 8000

# Run Alembic migrations then start Uvicorn
CMD ["sh", "-c", \
     "alembic -c back/alembic.ini upgrade head && \
      uvicorn back.app.main:app --host 0.0.0.0 --port 8000"]
