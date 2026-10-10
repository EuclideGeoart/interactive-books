#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HOST="127.0.0.1"
PORT="${BOOK_PORT:-4323}"
URL="http://${HOST}:${PORT}/"
LOG="/tmp/interactive-dsa-book-${PORT}.log"

book_ready() {
    curl -fsS --max-time 5 "${URL}chapters/00-cpp-foundations/" >/dev/null 2>&1 &&
    curl -fsS --max-time 5 "${URL}chapters/23-unordered-map/" >/dev/null 2>&1 &&
    curl -fsS --max-time 5 "${URL}chapters/36-union-find/" >/dev/null 2>&1 &&
    curl -fsS --max-time 5 "${URL}chapters/44-counting-radix-sort/" >/dev/null 2>&1 &&
    curl -fsS --max-time 5 "${URL}chapters/50-memoization-tabulation/" >/dev/null 2>&1 &&
    curl -fsS --max-time 5 "${URL}chapters/59-lock-free-introduction/" >/dev/null 2>&1 &&
    curl -fsS --max-time 5 "${URL}chapters/66-broad-phase-spatial-indexing/" >/dev/null 2>&1
}

cd "$ROOT"

# If the book is already running, just open it.
if curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; then
    if ! book_ready; then
        echo "Port $PORT is not serving the integrated book through Chapter 66."
        echo "Stop that server, or run BOOK_PORT=4324 ./open-book.sh."
        exit 1
    fi
    echo "Interactive DSA Book is already running:"
    echo "$URL"
    xdg-open "$URL" >/dev/null 2>&1 || true
    exit 0
fi

# Install dependencies only if needed.
if [[ ! -d node_modules ]]; then
    echo "Installing dependencies..."
    npm ci
fi

echo "Starting Interactive DSA Book..."
echo "$URL"

nohup env ASTRO_TELEMETRY_DISABLED=1 npm run dev -- --host "$HOST" --port "$PORT" > "$LOG" 2>&1 < /dev/null &
SERVER_PID=$!

# Allow the complete book to compile on a cold development-server start.
for _ in {1..300}; do
    if book_ready; then
        xdg-open "$URL" >/dev/null 2>&1 || true
        echo "Book opened."
        echo "Server PID: $SERVER_PID"
        echo "Log: $LOG"
        exit 0
    fi

    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Server failed to start."
        cat "$LOG"
        exit 1
    fi

    sleep 0.2
done

echo "Server did not become ready."
cat "$LOG"
exit 1
