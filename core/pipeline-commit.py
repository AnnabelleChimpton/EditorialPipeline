#!/usr/bin/env python3
"""Commit staged pipeline operations written by cron agents.

Runs via system crontab after agent jobs. Processes staging files in REFERENCE/.state/
and applies validated changes to the real JSONL files.
"""

import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import importlib
pt = importlib.import_module("pipeline-tools")

STATE_DIR = os.path.join(os.path.dirname(__file__), ".state")
STAGE_APPEND = os.path.join(STATE_DIR, "stage-append.jsonl")
STAGE_STATUS = os.path.join(STATE_DIR, "stage-status.jsonl")
STAGE_QUEUE = os.path.join(STATE_DIR, "stage-queue.jsonl")
RESULT_FILE = os.path.join(STATE_DIR, "commit-result.json")


def read_and_clear(path):
    """Read all lines from a staging file and truncate it."""
    entries = []
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return entries
    with open(path, "r") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError as e:
                entries.append({"_parse_error": str(e), "_raw": line, "_line": i})
    # Truncate after reading
    with open(path, "w") as f:
        pass
    return entries


def main():
    os.makedirs(STATE_DIR, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    result = {"timestamp": now, "appended": [], "statuses": [], "queued": [], "errors": [], "slop_checks": []}

    # --- Process index appends ---
    append_entries = read_and_clear(STAGE_APPEND)
    for entry in append_entries:
        if "_parse_error" in entry:
            result["errors"].append(f"Parse error in stage-append line {entry['_line']}: {entry['_parse_error']}")
            continue
        ok, err = pt.append_entry(pt.INDEX_FILE, entry)
        if ok:
            result["appended"].append(entry.get("id", "?"))
            # Slop-check any draft/revision/short-form files
            draft_path = entry.get("draft") or entry.get("shortForm")
            if draft_path and os.path.exists(draft_path):
                slop = pt.run_slop_check(draft_path)
                result["slop_checks"].append(slop)
        else:
            result["errors"].append(f"Append rejected for id={entry.get('id', '?')}: {err}")

    # --- Process status updates ---
    status_entries = read_and_clear(STAGE_STATUS)
    for entry in status_entries:
        if "_parse_error" in entry:
            result["errors"].append(f"Parse error in stage-status line {entry['_line']}: {entry['_parse_error']}")
            continue
        tid = entry.get("id")
        new_status = entry.get("status")
        if not tid or not new_status:
            result["errors"].append(f"Status update missing id or status: {entry}")
            continue
        ok, err = pt.update_topic_status(tid, new_status)
        if ok:
            result["statuses"].append({"id": tid, "status": new_status})
        else:
            result["errors"].append(f"Status update failed for {tid}: {err}")

    # --- Process queue appends ---
    queue_entries = read_and_clear(STAGE_QUEUE)
    for entry in queue_entries:
        if "_parse_error" in entry:
            result["errors"].append(f"Parse error in stage-queue line {entry['_line']}: {entry['_parse_error']}")
            continue
        ok, err = pt.append_entry(pt.QUEUE_FILE, entry)
        if ok:
            result["queued"].append(entry.get("id", "?"))
        else:
            result["errors"].append(f"Queue append rejected for id={entry.get('id', '?')}: {err}")

    # --- Write result ---
    with open(RESULT_FILE, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    total = len(result["appended"]) + len(result["statuses"]) + len(result["queued"])
    errors = len(result["errors"])

    if total == 0 and errors == 0:
        print(f"[{now}] Nothing staged")
    else:
        print(f"[{now}] Committed: {len(result['appended'])} appends, {len(result['statuses'])} statuses, {len(result['queued'])} queued. Errors: {errors}")

    # --- Refresh state files ---
    if total > 0:
        # Re-import and run the cron state computation
        import subprocess
        subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "pipeline-cron.py")],
                       cwd=os.path.dirname(os.path.dirname(__file__)))


if __name__ == "__main__":
    main()
