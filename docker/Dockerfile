ARG EVERUNFOLD_NODE_IMAGE=node:22.15.1-bookworm-slim
ARG EVERUNFOLD_PYTHON_IMAGE=python:3.12-slim-bookworm

FROM ${EVERUNFOLD_PYTHON_IMAGE} AS debian-ca
FROM ${EVERUNFOLD_NODE_IMAGE} AS everunfold-frontend-runtime

ARG BUILD_REVISION=unknown
ARG BUILD_CREATED=unknown
LABEL org.opencontainers.image.title="Everunfold Frontend" \
    org.opencontainers.image.description="Everunfold disposable builder and frontend runtime" \
    org.opencontainers.image.source="https://github.com/wojiaoyishang/Everunfold-Frontend" \
    org.opencontainers.image.revision="${BUILD_REVISION}" \
    org.opencontainers.image.created="${BUILD_CREATED}" \
    org.everunfold.build.npm-mirror="1"
ENV EVERUNFOLD_IMAGE_REVISION=${BUILD_REVISION}

ARG EVERUNFOLD_APT_MIRROR
ARG EVERUNFOLD_APT_SECURITY_MIRROR
# Some slim Node images omit the trust store needed for the first HTTPS APT update.
RUN --mount=type=bind,source=docker/apt-mirrors.sh,target=/tmp/apt-mirrors.sh \
    --mount=type=bind,from=debian-ca,source=/etc/ssl/certs/ca-certificates.crt,target=/tmp/debian-ca.crt \
    if [ ! -s /etc/ssl/certs/ca-certificates.crt ]; then \
        install -D -m 0644 /tmp/debian-ca.crt /etc/ssl/certs/ca-certificates.crt; \
    fi \
    && sh /tmp/apt-mirrors.sh && apt-get -o APT::Update::Error-Mode=any update \
    && apt-get install -y --no-install-recommends ca-certificates git rsync \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o node -g node /build /output /plugins /data \
    && chmod 1777 /build
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/everunfold-frontend
COPY --chmod=755 docker/npm-ci.sh /usr/local/bin/everunfold-npm-ci
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
