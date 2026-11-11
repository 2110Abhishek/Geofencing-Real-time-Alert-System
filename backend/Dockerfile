# Stage 1: Build binary
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git

COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/geotrack-server ./cmd/server

# Stage 2: Minimal runtime image
FROM alpine:3.19

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/geotrack-server /app/geotrack-server
COPY --from=builder /app/internal/database/migrations /app/internal/database/migrations

EXPOSE 8080

CMD ["/app/geotrack-server"]

