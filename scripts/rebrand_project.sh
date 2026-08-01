#!/usr/bin/env bash
set -euo pipefail

PROJECT_FILE="PsychonautWiki Journal.xcodeproj/project.pbxproj"
ENTITLEMENTS_FILE="PsychonautWiki Journal/PsychonautWiki Journal.entitlements"

if [[ ! -f "$PROJECT_FILE" ]]; then
  echo "Project file not found: $PROJECT_FILE" >&2
  exit 1
fi

python3 - "$PROJECT_FILE" "$ENTITLEMENTS_FILE" <<'PY'
from pathlib import Path
import sys

project = Path(sys.argv[1])
entitlements = Path(sys.argv[2])
text = project.read_text(encoding="utf-8")

replacements = {
    "DEVELOPMENT_TEAM = 6S7AHDRUD6;": 'DEVELOPMENT_TEAM = "";',
    "isaak.PsychonautWiki-Journal-Debug.TimelineWidget": "com.drcarlos.psychonautjournal.debug.TimelineWidget",
    "isaak.PsychonautWiki-Journal.TimelineWidget": "com.drcarlos.psychonautjournal.TimelineWidget",
    "isaak.JournalTests": "com.drcarlos.psychonautjournal.tests",
    "isaak.PsychonautWiki-Journal-Debug": "com.drcarlos.psychonautjournal.debug",
    "isaak.PsychonautWiki-Journal": "com.drcarlos.psychonautjournal",
    "MY_BUNDLE_DISPLAY_NAME = Debug;": 'MY_BUNDLE_DISPLAY_NAME = "Psychonaut Journal Debug";',
    "MY_BUNDLE_DISPLAY_NAME = Journal;": 'MY_BUNDLE_DISPLAY_NAME = "Psychonaut Journal";',
}

for old, new in replacements.items():
    text = text.replace(old, new)

project.write_text(text, encoding="utf-8")

# Associated Domains is not needed by the core Journal features and blocks
# free-development provisioning on some Apple IDs. Keep an empty entitlement
# container so the project remains ready for optional capabilities later.
entitlements.write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" '
    '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
    '<plist version="1.0">\n<dict/>\n</plist>\n',
    encoding="utf-8",
)

for forbidden in ("6S7AHDRUD6", "isaak.PsychonautWiki-Journal", "isaak.JournalTests"):
    if forbidden in text:
        raise SystemExit(f"Rebrand incomplete; found legacy value: {forbidden}")

print("Rebrand complete:")
print("  name:   Psychonaut Journal")
print("  app:    com.drcarlos.psychonautjournal")
print("  debug:  com.drcarlos.psychonautjournal.debug")
print("  widget: com.drcarlos.psychonautjournal.TimelineWidget")
print("  tests:  com.drcarlos.psychonautjournal.tests")
print("  associated-domains entitlement: disabled for sideload compatibility")
PY
