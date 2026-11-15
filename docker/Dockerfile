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

ENV NEXT_TELEMETRY_DISABLED=1 \
    CONFIG_FILE=/workspace/config.runtime.toml \
    FRONTEND_BUILD_WORKERS=2 \
    FRONTEND_HOST=0.0.0.0 \
    FRONTEND_PORT=3000 \
    FRONTEND_RECEIVER_HOST=0.0.0.0 \
    FRONTEND_RECEIVER_PORT=3001

USER node
WORKDIR /workspace
EXPOSE 3000 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s \
    CMD ["node", "-e", "let host = process.env.FRONTEND_HOST || '0.0.0.0'; host = ({'0.0.0.0': '127.0.0.1', '::': '::1'})[host] || host; if (host.includes(':')) host = '[' + host + ']'; fetch('http://' + host + ':' + process.env.FRONTEND_PORT + '/health/ready', {signal: AbortSignal.timeout(4000)}).then(r => { if (!r.ok) process.exitCode = 1 }, () => { process.exitCode = 1 })"]
ENTRYPOINT ["/usr/local/bin/everunfold-frontend"]
CMD ["deploy"]
