#!/usr/bin/env bash
set -euo pipefail

PROJECT_FILE="PsychonautWiki Journal.xcodeproj/project.pbxproj"

if [[ ! -f "$PROJECT_FILE" ]]; then
  echo "Project file not found: $PROJECT_FILE" >&2
  exit 1
fi

python3 - "$PROJECT_FILE" <<'PY'
from pathlib import Path
import sys

project = Path(sys.argv[1])
text = project.read_text(encoding="utf-8")

replacements = {
    "DEVELOPMENT_TEAM = 6S7AHDRUD6;": 'DEVELOPMENT_TEAM = "";',
    "isaak.PsychonautWiki-Journal-Debug.TimelineWidget": "com.drcarlos.psychonautjournal.debug.TimelineWidget",
    "isaak.PsychonautWiki-Journal.TimelineWidget": "com.drcarlos.psychonautjournal.TimelineWidget",
    "isaak.JournalTests": "com.drcarlos.psychonautjournal.tests",
    "isaak.PsychonautWiki-Journal-Debug": "com.drcarlos.psychonautjournal.debug",
    "isaak.PsychonautWiki-Journal": "com.drcarlos.psychonautjournal",
}

for old, new in replacements.items():
    text = text.replace(old, new)

project.write_text(text, encoding="utf-8")

for forbidden in ("6S7AHDRUD6", "isaak.PsychonautWiki-Journal", "isaak.JournalTests"):
    if forbidden in text:
        raise SystemExit(f"Rebrand incomplete; found legacy value: {forbidden}")

print("Rebrand complete:")
print("  app:    com.drcarlos.psychonautjournal")
print("  debug:  com.drcarlos.psychonautjournal.debug")
print("  widget: com.drcarlos.psychonautjournal.TimelineWidget")
print("  tests:  com.drcarlos.psychonautjournal.tests")
PY
