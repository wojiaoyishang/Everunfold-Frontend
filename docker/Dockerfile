# syntax=docker/dockerfile:1
FROM node:22.15.1-bookworm-slim AS everunfold-frontend-runtime

ARG BUILD_REVISION=unknown
ARG BUILD_CREATED=unknown
LABEL org.opencontainers.image.title="Everunfold Frontend" \
    org.opencontainers.image.description="Everunfold disposable builder and frontend runtime" \
    org.opencontainers.image.source="https://github.com/wojiaoyishang/Everunfold-Frontend" \
    org.opencontainers.image.revision="${BUILD_REVISION}" \
    org.opencontainers.image.created="${BUILD_CREATED}"
ENV EVERUNFOLD_IMAGE_REVISION=${BUILD_REVISION}

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git rsync \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o node -g node /build /output /plugins /data \
    && chmod 1777 /build
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/everunfold-frontend
COPY deploy/check.mjs /usr/local/lib/everunfold-check.mjs
COPY deploy/healthcheck.mjs /usr/local/lib/everunfold-healthcheck.mjs

ENV NEXT_TELEMETRY_DISABLED=1 \
    CONFIG_FILE=/workspace/config.yaml \
    FRONTEND_BUILD_WORKERS=2

USER node
WORKDIR /workspace
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s \
    CMD ["node", "--import", "tsx", "/usr/local/lib/everunfold-healthcheck.mjs"]
ENTRYPOINT ["/usr/local/bin/everunfold-frontend"]
CMD ["deploy"]
