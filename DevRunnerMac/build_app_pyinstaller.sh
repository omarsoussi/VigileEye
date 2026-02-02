#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

# Pick a working Python.
# Some systems can have a broken Homebrew python shim (0-byte executable).
PY="python3"

is_working_python() {
  local p="$1"
  [ -x "$p" ] || return 1
  # Ensure the symlink target isn't a 0-byte stub
  local sz
  sz=$(stat -f %z -L "$p" 2>/dev/null || echo 0)
  [ "$sz" -gt 0 ] || return 1
  # Ensure it's actually Python (not an empty script/shim)
  local out
  out=$("$p" -V 2>&1 || true)
  [[ "$out" == Python\ * ]] || return 1
  return 0
}

if is_working_python "/opt/homebrew/bin/python3.13"; then
  PY="/opt/homebrew/bin/python3.13"
elif is_working_python "/opt/homebrew/bin/python3"; then
  PY="/opt/homebrew/bin/python3"
elif [ -x "/opt/anaconda3/bin/python3" ]; then
  PY="/opt/anaconda3/bin/python3"
fi

"$PY" -m pip install --upgrade pip
"$PY" -m pip install --upgrade pyinstaller

rm -rf build dist

# macOS PyInstaller .app
"$PY" -m PyInstaller \
  --noconfirm \
  --windowed \
  --name "Dev Runner" \
  --add-data "projects.json:." \
  dev_runner.py

if [ ! -d "dist/Dev Runner.app" ]; then
  echo "ERROR: Build did not produce dist/Dev Runner.app" >&2
  exit 1
fi

echo "Built: dist/Dev Runner.app"
