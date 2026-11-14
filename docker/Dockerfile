# syntax=docker/dockerfile:1
FROM node:22.15.1-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git rsync util-linux \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o node -g node /build /releases /plugins /data
COPY --chmod=755 entrypoint.sh /usr/local/bin/everunfold-frontend

ENV NEXT_TELEMETRY_DISABLED=1 \
    CONFIG_FILE=/etc/everunfold/config.toml \
    FRONTEND_BUILD_WORKERS=2 \
    FRONTEND_PORT=3000 \
    FRONTEND_RECEIVER_HOST=0.0.0.0 \
    FRONTEND_RECEIVER_PORT=3001

USER node
WORKDIR /workspace
EXPOSE 3000 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.FRONTEND_PORT + '/health/ready', {signal: AbortSignal.timeout(4000)}).then(r => { if (!r.ok) process.exitCode = 1 }, () => { process.exitCode = 1 })"]
ENTRYPOINT ["/usr/local/bin/everunfold-frontend"]
CMD ["serve"]
