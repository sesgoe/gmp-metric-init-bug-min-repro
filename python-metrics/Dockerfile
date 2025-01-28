FROM python:3.12-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy project files
ADD . .

# Install dependencies using uv
RUN uv sync --frozen

EXPOSE 8080

CMD ["uv", "run", "main.py"]
