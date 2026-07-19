#!/usr/bin/env bash
# Push the Haze Bypass project to https://github.com/akila-maduranga/quality-bypass
#
# Run this script from your own machine (NOT the sandbox) where you have:
#   - git installed
#   - GitHub credentials configured (gh CLI, SSH key, or git credential helper)
#
# Two ways to use this:
#
#   Option A — push from the sandbox project directory directly:
#     1. Download /home/z/my-project/download/haze-bypass.zip
#     2. Unzip on your machine
#     3. cd into the unzipped directory
#     4. Run: bash push-to-github.sh
#
#   Option B — push from your own clone of the repo:
#     1. Clone the empty repo: git clone https://github.com/akila-maduranga/quality-bypass.git
#     2. Copy all files from the unzipped haze-bypass.zip into the clone
#     3. Run: bash push-to-github.sh

set -euo pipefail

REMOTE_URL="https://github.com/akila-maduranga/quality-bypass.git"
BRANCH="main"

echo "› Pushing Haze Bypass to $REMOTE_URL"

# Initialize git if not already
if [ ! -d .git ]; then
  git init -b "$BRANCH"
fi

# Make sure origin points to the right place
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE_URL"
else
  git remote set-url origin "$REMOTE_URL"
fi

# Stage everything (respects .gitignore)
git add -A

# Commit if there are staged changes
if ! git diff --cached --quiet; then
  git commit -m "feat: Haze Bypass — TikTok compression optimizer (Haze Method + FFmpeg.wasm)"
fi

# Push
echo "› Pushing to $BRANCH..."
git push -u origin "$BRANCH"

echo
echo "✓ Done. View your repo at:"
echo "  https://github.com/akila-maduranga/quality-bypass"
