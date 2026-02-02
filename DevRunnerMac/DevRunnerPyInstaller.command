#!/bin/zsh

cd "$(dirname "$0")"

# Builds the .app into dist/
zsh build_app_pyinstaller.sh

# Open the output folder
open "dist" || true
