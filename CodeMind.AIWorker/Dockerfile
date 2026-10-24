FROM python:3.11-slim@sha256:b7a9e5f6a93d6d4a31f129bbd4bdee69efccb6ded0fb230d78aafaf37af98377

WORKDIR /app

ENV PYTHONUNBUFFERED=1

# Install system dependencies (e.g. for confluent-kafka compilation if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt requirements.lock ./
RUN pip install --no-cache-dir --require-hashes -r requirements.lock

# Copy source code
COPY . .

# Run the consumer main loop
CMD ["python", "main.py"]
