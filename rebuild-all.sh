#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
PARENT_POM="$SERVER_DIR/pom.xml"
MIGRATION_POM="$SERVER_DIR/migration/pom.xml"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

PROJECT_NAME="${PROJECT_NAME:-iwannasurvive}"
SKIP_TESTS="${SKIP_TESTS:-true}"
BUILD_MIGRATION="${BUILD_MIGRATION:-true}"
RUN_DOCKER="${RUN_DOCKER:-false}"

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

fail() {
  printf '\n[ERROR] %s\n' "$*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "Не найден файл: $path"
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Не найдена команда: $cmd"
}

build_with_maven() {
  local pom_file="$1"
  local label="$2"

  local -a args=(-f "$pom_file" clean package)

  if [[ "$SKIP_TESTS" == "true" ]]; then
    args+=(-DskipTests)
  fi

  log "Сборка: $label"
  mvn "${args[@]}"
}

main() {
  require_cmd mvn
  require_file "$PARENT_POM"

  build_with_maven "$PARENT_POM" "server multi-module"

  if [[ "$BUILD_MIGRATION" == "true" && -f "$MIGRATION_POM" ]]; then
    build_with_maven "$MIGRATION_POM" "migration"
  fi

  log "Сборка завершена"

  if [[ "$RUN_DOCKER" == "true" ]]; then
    require_cmd docker
    require_file "$COMPOSE_FILE"
    require_file "$ROOT_DIR/creds.env"
#    require_file "$ROOT_DIR/host_urls.env"

    log "Запуск docker compose"
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build
    log "docker compose завершен"
  fi
}

main "$@"
