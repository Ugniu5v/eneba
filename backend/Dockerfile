FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
# lib/pq is replaced with the in-tree copy, so it must exist before go mod download.
COPY third_party ./third_party
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/eneba-api ./cmd/api

FROM alpine:3.22
RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p /app/data && chown -R app:app /app
WORKDIR /app
COPY --from=build /out/eneba-api /usr/local/bin/eneba-api
USER app
ENV PORT=8080 \
    DB_PATH=/app/data/eneba.db
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --start-period=10s --retries=4 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
CMD ["eneba-api"]
