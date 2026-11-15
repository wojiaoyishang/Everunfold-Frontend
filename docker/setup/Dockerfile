# syntax=docker/dockerfile:1
FROM ghcr.io/astral-sh/uv:0.9.0 AS uv
FROM python:3.12-slim-bookworm AS everunfold-setup
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /opt/everunfold-setup
COPY deploy/assistant/pyproject.toml deploy/assistant/uv.lock ./
ENV UV_PROJECT_ENVIRONMENT=/opt/everunfold-setup/venv UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev
ENV PATH="/opt/everunfold-setup/venv/bin:${PATH}" PYTHONDONTWRITEBYTECODE=1
LABEL org.opencontainers.image.title="Everunfold Deployment Assistant"
CMD ["python"]
