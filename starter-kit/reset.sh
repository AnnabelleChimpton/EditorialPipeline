#!/usr/bin/env bash
# Reset pipeline state for a clean test run.
# Usage: bash reset.sh [workspace-path]
# Example: bash reset.sh ~/.openclaw/workspace-breaking-news

set -euo pipefail

WORKSPACE="${1:?Usage: bash reset.sh <workspace-path>}"

if [ ! -d "$WORKSPACE" ]; then
  echo "Error: $WORKSPACE is not a directory"
  exit 1
fi

if [ ! -f "$WORKSPACE/REFERENCE/topic-queue.jsonl" ]; then
  echo "Error: $WORKSPACE doesn't look like a pipeline workspace (no REFERENCE/topic-queue.jsonl)"
  exit 1
fi

echo "Resetting pipeline state in: $WORKSPACE"

# Empty state files
> "$WORKSPACE/REFERENCE/topic-queue.jsonl"
> "$WORKSPACE/REFERENCE/dossier-index.jsonl"
echo "# Event Inbox" > "$WORKSPACE/topics/inbox.md"

echo "  Cleared: topic-queue.jsonl, dossier-index.jsonl, topics/inbox.md"

# Remove generated artifacts
artifact_dirs=("cards" "dossiers" "briefs" "drafts" "qa")
removed=0
for dir in "${artifact_dirs[@]}"; do
  target="$WORKSPACE/REFERENCE/$dir"
  if [ -d "$target" ]; then
    count=$(find "$target" -type f -name "*.md" | wc -l)
    if [ "$count" -gt 0 ]; then
      rm "$target"/*.md
      removed=$((removed + count))
    fi
  fi
done

echo "  Removed: $removed artifact files from ${artifact_dirs[*]}"
echo "Done. Pipeline is ready for a fresh run."
