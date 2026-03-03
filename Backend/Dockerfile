FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make startup script executable
RUN chmod +x startup.sh

EXPOSE 8000
CMD ["./startup.sh"]
