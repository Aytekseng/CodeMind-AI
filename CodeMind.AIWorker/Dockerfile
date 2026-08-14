FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (e.g. for confluent-kafka compilation if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Run the consumer main loop
CMD ["python", "main.py"]
