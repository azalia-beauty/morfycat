#!/usr/bin/env bash
# Morphin · Ghost — всё одной командой.
#   Windows: двойной клик по ghost.bat (он сам найдёт/поставит Git Bash и запустит этот файл)
#   ./ghost.sh              — меню
#   ./ghost.sh all          — ПОЛНЫЙ АВТОМАТ: установка → название → GitHub → сборка APK и exe → скачать APK
#   ./ghost.sh update       — новая функция от ИИ (из буфера обмена) → проверка → выпуск → уведомление на телефоне
#   ./ghost.sh --help       — все команды
set -u
cd "$(dirname "$0")" || exit 1
ROOT="$(pwd)"

C_C=$'\033[36m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_R=$'\033[31m'; C_D=$'\033[2m'; C_M=$'\033[35m'; C_0=$'\033[0m'
say()  { printf '%s[Morphin]%s %s\n' "$C_C" "$C_0" "$*"; }
ok()   { printf '%s ✓%s %s\n' "$C_G" "$C_0" "$*"; }
warn() { printf '%s !%s %s\n' "$C_Y" "$C_0" "$*"; }
die()  { printf '\n%s ✗ %s%s\n\n' "$C_R" "$*" "$C_0" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
ask()  { local a; read -r -p "$1 [Y/n] " a; a="${a%$'\r'}"; [ "$a" != "n" ] && [ "$a" != "N" ]; }

IS_WIN=0
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*) IS_WIN=1 ;;
esac

banner() {
  printf '%s' "$C_C"
  cat <<'ART'

   ╔╦╗╔═╗╦═╗╔═╗╦ ╦╦╔╗╔
   ║║║║ ║╠╦╝╠═╝╠═╣║║║║   //  ctOS-style builder
   ╩ ╩╚═╝╩╚═╩  ╩ ╩╩╝╚╝
ART
  printf '%s   сделано %sMorphin%s\n\n' "$C_D" "$C_M" "$C_0"
}

# Только что установленные программы ещё не в PATH этого окна — добавляем типичные места.
refresh_path() {
  [ "$IS_WIN" = 1 ] || return 0
  local extra="/c/Program Files/nodejs:/c/Program Files/Git/cmd:/c/Program Files/GitHub CLI"
  if have cygpath && [ -n "${APPDATA:-}" ]; then extra="$extra:$(cygpath -u "$APPDATA")/npm"; fi
  export PATH="$PATH:$extra"
}
refresh_path

cfg() { node -p "const c=require('./ghost.config.json'); String(c['$1'] === undefined ? '' : c['$1'])" 2>/dev/null; }

# Ввод текста с поддержкой кириллицы: в Windows через PowerShell (обычный read в консоли портит русские буквы).
ask_text() { # ask_text "вопрос" "по умолчанию"
  local q="$1" def="${2:-}" ans=""
  if [ "$IS_WIN" = 1 ] && have powershell.exe; then
    ans="$(powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; \$a = Read-Host '$q'; Write-Output \$a" 2>/dev/null | tr -d '\r')"
  else
    read -r -p "$q: " ans
  fi
  [ -z "$ans" ] && ans="$def"
  printf '%s' "$ans"
}

node_ok() { have node && [ "$(node -p 'parseInt(process.versions.node)' 2>/dev/null || echo 0)" -ge 20 ]; }

# ───────────────────────── установка ─────────────────────────
run_setup_ps() { # поставить недостающее (Node.js, Git, GitHub CLI) — Windows попросит права администратора
  [ "$IS_WIN" = 1 ] && have powershell.exe || return 1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
    "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"$(cygpath -w "$ROOT/scripts/setup-windows.ps1")\" -InstallOnly'"
  refresh_path
}

ensure_node() {
  node_ok && return 0
  say "Node.js не найден — ставлю (будет запрос Windows, нажмите «Да»)…"
  run_setup_ps
  node_ok || die "Нужен Node.js 20 или новее (https://nodejs.org, кнопка LTS). Поставьте и запустите снова."
}

ensure_git() {
  have git && return 0
  say "Git не найден — ставлю (будет запрос Windows, нажмите «Да»)…"
  run_setup_ps
  have git || die "Нужен Git (https://git-scm.com). Поставьте и запустите снова."
}

ensure_gh() {
  have gh && return 0
  if [ "$IS_WIN" = 1 ] && have winget; then
    say "Ставлю GitHub CLI…"
    winget install -e --id GitHub.cli --silent --accept-package-agreements --accept-source-agreements >/dev/null 2>&1
    refresh_path
  fi
  have gh || { run_setup_ps; }
  have gh || die "Нужен GitHub CLI: https://cli.github.com (поставьте и запустите снова)"
}

cmd_install() {
  ensure_node
  ok "Node.js $(node -v)"
  if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
    say "Ставлю зависимости (несколько минут)…"
    npm install --no-audit --no-fund || {
      warn "Не вышло — пробую зеркало загрузок…"
      ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install --no-audit --no-fund || die "npm install не удался"
    }
    touch node_modules 2>/dev/null
  fi
  ok "Зависимости на месте"
}

ensure_deps() { [ -d node_modules ] || cmd_install; }

# ───────────────────────── название приложения ─────────────────────────
cmd_name() {
  ensure_node
  if [ "$(cfg setupDone)" = "true" ]; then ok "Название: «$(cfg appName)»"; return 0; fi
  echo
  say "Как приложение будет называться на экране Android (и в Windows)?"
  echo "  Можно по-русски, с пробелами. Например: Мой Хакер, Ghost, Тень…"
  local n; n="$(ask_text 'Название приложения' 'Ghost')"
  node scripts/name-app.mjs "$n" || die "Не удалось задать название"
}

cmd_rename() {
  ensure_node
  local n; n="$(ask_text 'Новое название приложения' "$(cfg appName)")"
  node scripts/name-app.mjs --rename "$n" || die "Не удалось переименовать"
  ok "Готово. Чтобы название сменилось на телефоне, выпустите обновление: UPDATE.bat или ./ghost.sh release"
}

# ───────────────────────── повседневное ─────────────────────────
cmd_run()   { ensure_deps; say "Запускаю приложение из исходников…"; npm run win:dev; }
cmd_check() { ensure_node; node scripts/check.mjs && node scripts/selftest.mjs; }

cmd_build() {
  ensure_deps
  say "Собираю установщик Windows (первый раз — до 10 минут)…"
  npm run win:build || { warn "Пробую зеркало…"; ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ npm run win:build || die "Сборка не удалась"; }
  local exe; exe="$(ls -t release/*-Setup-*.exe 2>/dev/null | head -1)"
  [ -n "$exe" ] && ok "Готово: $ROOT/$exe"
  if [ "$IS_WIN" = 1 ] && [ -n "$exe" ] && ask "Установить на этот компьютер сейчас?"; then start "" "$exe" 2>/dev/null || cmd.exe /c start "" "$(cygpath -w "$ROOT/$exe")"; fi
}

# Добавить код от ИИ: ./ghost.sh add файл.txt   |   ./ghost.sh add --clip   (из буфера обмена)
cmd_add() {
  ensure_node
  if [ $# -eq 0 ]; then set -- --clip; fi
  node scripts/add-module.mjs "$@" || exit 1
  node scripts/check.mjs || die "После добавления проверка не прошла. Старые файлы лежат в .ghost-backup/ — верните их оттуда."
  ok "Код добавлен и проверен."
}

cmd_ai() { ensure_node; node scripts/ai-pack.mjs; }

# ───────────────────────── GitHub: репозиторий, ключ, секреты ─────────────────────────
secret_from_file() { # имя секрета → значение из ANDROID-KEY-SECRETS.txt
  node -e '
    const t = require("fs").readFileSync("ANDROID-KEY-SECRETS.txt", "utf8");
    const re = /(?:Имя|Name):\s*(\S+)\s*\r?\n(?:Значение|Value):\s*(\S+)/g; let m;
    while ((m = re.exec(t))) if (m[1] === process.argv[1]) { process.stdout.write(m[2]); process.exit(0); }
    process.exit(1);' "$1"
}

cmd_github() {
  ensure_node; ensure_git; ensure_gh

  if ! gh auth status >/dev/null 2>&1; then
    echo
    say "Вход в GitHub: сейчас откроется браузер — введите показанный код и нажмите «Authorize»."
    echo "  (Нет аккаунта? Зарегистрируйтесь на github.com — это бесплатно, и возвращайтесь.)"
    gh auth login --web --hostname github.com --git-protocol https || die "Вход не удался"
  fi
  gh auth setup-git >/dev/null 2>&1
  local owner; owner="$(gh api user -q .login)" || die "Не получилось узнать ваш логин GitHub"
  ok "GitHub: $owner"

  # Свой ключ подписи Android (создаётся один раз, копия хранится вне проекта)
  node scripts/make-keystore.mjs || die "Не удалось создать ключ подписи"

  local def; def="$(cfg repoName)"; [ -z "$def" ] && def="ghost"
  local name="$def"
  if grep -q 'YOUR_GITHUB_NAME' ghost.config.json; then
    read -r -p "Имя репозитория на GitHub [$def]: " name; name="${name%$'\r'}"; name="${name:-$def}"
  else
    name="$(cfg repo)"; name="${name#*/}"
  fi
  local repo="$owner/$name"

  [ -d .git ] || git init -q
  git branch -M main 2>/dev/null
  git config user.name  >/dev/null || git config user.name  "$owner"
  git config user.email >/dev/null || git config user.email "$(gh api user -q '(.id|tostring)+"+"+.login')@users.noreply.github.com"

  node -e '
    const fs = require("fs"); const c = JSON.parse(fs.readFileSync("ghost.config.json", "utf8"));
    c.repo = process.argv[1]; fs.writeFileSync("ghost.config.json", JSON.stringify(c, null, 2) + "\n");' "$repo"
  ok "Репозиторий: $repo"

  git add -A
  git diff --cached --quiet || git commit -q -m "Подготовка репозитория"

  if gh repo view "$repo" >/dev/null 2>&1; then
    ok "Репозиторий $repo уже есть"
    git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "https://github.com/$repo.git" || git remote add origin "https://github.com/$repo.git"
  else
    say "Создаю публичный репозиторий $repo…"
    gh repo create "$repo" --public --source=. --remote=origin >/dev/null || die "Не удалось создать репозиторий"
    ok "Создан: https://github.com/$repo"
  fi

  local pw b64
  pw="$(secret_from_file ANDROID_KEYSTORE_PASSWORD)" && b64="$(secret_from_file ANDROID_KEYSTORE_BASE64)" || die "Не разобрал ANDROID-KEY-SECRETS.txt (файл изменён?)"
  printf '%s' "$pw"  | gh secret set ANDROID_KEYSTORE_PASSWORD -R "$repo" >/dev/null || die "Не удалось записать секрет пароля"
  printf '%s' "$b64" | gh secret set ANDROID_KEYSTORE_BASE64   -R "$repo" >/dev/null || die "Не удалось записать секрет ключа"
  ok "Ключ подписи Android записан в GitHub"
  git push -q -u origin main 2>/dev/null || warn "Первую отправку сделает release"
}

# ───────────────────────── выпуск и ожидание сборки ─────────────────────────
cur_tag() { printf 'v%s' "$(node -p 'require("./package.json").version')"; }

wait_build() { # $1 — тег. Ждёт облачную сборку и скачивает APK в папку out/
  local tag="$1" repo; repo="$(cfg repo)"
  say "Облако собирает приложение (обычно 8–15 минут). Окно не закрывайте — компьютер можно не выключать только до конца этого шага."
  local id="" i
  for i in $(seq 1 30); do
    id="$(gh run list -R "$repo" --workflow build.yml --limit 10 --json databaseId,headBranch -q ".[] | select(.headBranch==\"$tag\") | .databaseId" 2>/dev/null | head -1)"
    [ -n "$id" ] && break
    sleep 4
  done
  if [ -z "$id" ]; then warn "Не нашёл запуск сборки. Следите здесь: https://github.com/$repo/actions"; return 1; fi
  gh run watch "$id" -R "$repo" --interval 15 --exit-status || true
  if fetch_apk "$tag"; then return 0; fi
  warn "APK не получился. Причина в журнале:"
  gh run view "$id" -R "$repo" --log-failed 2>/dev/null | tail -n 40
  echo "Полный журнал: https://github.com/$repo/actions/runs/$id"
  return 1
}

fetch_apk() { # $1 — тег (по умолчанию последний релиз)
  local repo; repo="$(cfg repo)"
  mkdir -p out
  if [ -n "${1:-}" ]; then gh release download "$1" -R "$repo" -p '*.apk' -D out --clobber 2>/dev/null
  else gh release download -R "$repo" -p '*.apk' -D out --clobber 2>/dev/null; fi || return 1
  local apk; apk="$(ls -t out/*.apk 2>/dev/null | head -1)"
  [ -n "$apk" ] || return 1
  echo
  ok "APK готов: $ROOT/$apk"
  echo "   Отправьте этот файл на телефон (например, через Telegram → «Избранное») и установите."
  echo "   Дальше приложение само сообщит о каждом обновлении — даже когда компьютер выключен."
  [ "$IS_WIN" = 1 ] && cmd.exe /c start "" "$(cygpath -w "$ROOT/out")" >/dev/null 2>&1
  return 0
}

cmd_apk() { ensure_node; ensure_gh; fetch_apk "" || die "На GitHub пока нет готового APK. Сначала: ./ghost.sh all"; }

cmd_release() {
  ensure_deps; ensure_git
  if grep -q 'YOUR_GITHUB_NAME' ghost.config.json; then say "Репозиторий не настроен — настраиваю."; cmd_github; fi
  node scripts/release.mjs "$@" || return 1
  wait_build "$(cur_tag)"
}

cmd_all() {
  banner
  cmd_install
  cmd_name
  cmd_github
  local first="0.1.0"
  git rev-parse -q --verify "refs/tags/v0.1.0" >/dev/null 2>&1 && first="patch"
  node scripts/release.mjs "$first" "Первый выпуск" || die "Выпуск не удался"
  wait_build "$(cur_tag)" || true
  echo
  ok "Готово. Для новых функций используйте UPDATE.bat."
}

# ───────────────────────── новая функция от ИИ → обновление на телефоне ─────────────────────────
cmd_update() {
  banner
  ensure_deps
  [ "$(cfg setupDone)" = "true" ] && ! grep -q 'YOUR_GITHUB_NAME' ghost.config.json || die "Сначала запустите MORPHIN-SETUP.bat (первичная настройка)."
  echo "  1) Скопируйте ответ ИИ целиком (Ctrl+C) и нажмите Enter — возьму из буфера обмена."
  echo "  2) Либо вставьте код сюда (правая кнопка мыши) и на новой строке напишите END."
  echo
  local first; IFS= read -r -p "> " first; first="${first%$'\r'}"
  if [ -z "$first" ]; then
    node scripts/add-module.mjs --clip || exit 1
  else
    local f; f="$(mktemp)"; printf '%s\n' "$first" > "$f"
    local line
    while IFS= read -r line; do
      line="${line%$'\r'}"
      case "$line" in END|end|End) break ;; esac
      printf '%s\n' "$line" >> "$f"
    done
    node scripts/add-module.mjs "$f" || { rm -f "$f"; exit 1; }
    rm -f "$f"
  fi
  node scripts/check.mjs || die "После добавления проверка не прошла. Старые файлы лежат в .ghost-backup/ — верните их оттуда."
  ok "Функция добавлена и проверена."
  local note; note="$(ask_text 'Что нового (покажется в уведомлении; Enter — пропустить)' 'Новая функция')"
  node scripts/release.mjs patch "$note" || die "Выпуск не удался"
  wait_build "$(cur_tag)" || true
  echo
  ok "Готово! Телефон покажет «Доступно обновление $(cur_tag)» сам (проверка раз в несколько часов или при запуске приложения)."
}

cmd_doctor() {
  echo "Папка:    $ROOT"
  echo "Название: $(cfg appName)  (id: $(cfg appId))"
  echo "Node:     $(node -v 2>/dev/null || echo 'нет')"
  echo "npm:      $(npm -v 2>/dev/null || echo 'нет')"
  echo "Git:      $(git --version 2>/dev/null || echo 'нет')"
  echo "GitHub:   $(have gh && (gh auth status >/dev/null 2>&1 && echo "вошли как $(gh api user -q .login)" || echo 'gh есть, не вошли') || echo 'gh нет')"
  echo "Репо:     $(cfg repo)"
  echo "Версия:   $(node -p 'require("./package.json").version' 2>/dev/null)"
  echo "Ключ APK: $([ -f ANDROID-KEY-SECRETS.txt ] && echo 'файл на месте' || echo 'пока нет (создастся при настройке)')"
  echo "node_modules: $([ -d node_modules ] && echo есть || echo нет)"
}

usage() {
cat <<EOF
Morphin · Ghost — команды (./ghost.sh <команда>):

  all                      ПОЛНЫЙ АВТОМАТ: установка → название → GitHub → сборка → APK на ПК
  update                   новая функция от ИИ (буфер обмена) → проверка → выпуск → уведомление на телефоне
  apk                      скачать последний готовый APK в папку out/
  rename                   поменять название приложения
  install                  поставить Node.js/Git (Windows) и зависимости проекта
  run                      запустить приложение из исходников
  build                    собрать установщик Windows (.exe) здесь, на ПК
  add [файл|--clip]        добавить код от ИИ без выпуска (из файла или буфера обмена)
  ai                       сделать текстовые файлы для ИИ в папке ai/
  github                   войти в GitHub, создать репозиторий, записать ключ подписи
  release [patch|minor|major|x.y.z] ["заметка"]   выпустить обновление и дождаться сборки
  check                    проверить код и самопроверка
  doctor                   показать, что установлено и настроено
EOF
}

menu() {
  while true; do
    echo; say "Что делаем?"
    echo "  1) ПОЛНЫЙ АВТОМАТ (первая установка и сборка APK)"
    echo "  2) Новая функция от ИИ → обновление на телефоне"
    echo "  3) Скачать готовый APK"
    echo "  4) Запустить приложение на ПК"
    echo "  5) Поменять название приложения"
    echo "  6) Собрать .exe здесь"
    echo "  7) Файлы для ИИ (ai/)"
    echo "  8) Что установлено (doctor)"
    echo "  0) Выход"
    local c; read -r -p "> " c; c="${c%$'\r'}"
    case "$c" in
      1) ( cmd_all ) ;;
      2) ( cmd_update ) ;;
      3) ( cmd_apk ) ;;
      4) ( cmd_run ) ;;
      5) ( cmd_rename ) ;;
      6) ( cmd_build ) ;;
      7) ( cmd_ai ) ;;
      8) cmd_doctor ;;
      0|q|"") exit 0 ;;
    esac
  done
}

cmd="${1:-menu}"; [ $# -gt 0 ] && shift
case "$cmd" in
  menu) menu ;;
  all) cmd_all ;;
  update) cmd_update ;;
  apk) cmd_apk ;;
  rename) cmd_rename ;;
  install) cmd_install ;;
  run) cmd_run ;;
  build) cmd_build ;;
  add) cmd_add "$@" ;;
  ai|ai-pack) cmd_ai ;;
  github) cmd_github ;;
  release) cmd_release "$@" ;;
  check) cmd_check ;;
  doctor) cmd_doctor ;;
  -h|--help|help) usage ;;
  *) usage; exit 1 ;;
esac
