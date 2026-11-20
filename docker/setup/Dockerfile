ARG EVERUNFOLD_PYTHON_IMAGE=python:3.12-slim-bookworm
ARG EVERUNFOLD_UV_IMAGE=ghcr.io/astral-sh/uv:0.9.0

FROM ${EVERUNFOLD_UV_IMAGE} AS uv
FROM ${EVERUNFOLD_PYTHON_IMAGE} AS everunfold-setup
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /opt/everunfold-setup
COPY deploy/assistant/pyproject.toml deploy/assistant/uv.lock ./
ENV UV_PROJECT_ENVIRONMENT=/opt/everunfold-setup/venv UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
ARG EVERUNFOLD_PYPI_INDEX
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=docker/uv-sync.sh,target=/tmp/uv-sync.sh \
    sh /tmp/uv-sync.sh
ENV PATH="/opt/everunfold-setup/venv/bin:${PATH}" PYTHONDONTWRITEBYTECODE=1
LABEL org.opencontainers.image.title="Everunfold Deployment Assistant"
CMD ["python"]
