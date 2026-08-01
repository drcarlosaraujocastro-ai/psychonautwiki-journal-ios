#!/usr/bin/env python3
"""Port selected PsyLog compatibility fixes without changing the Journal UI.

The source projects are GPL-3.0 compatible. This script is intentionally
idempotent so CI can verify or reapply the compatibility layer.
"""

from pathlib import Path

SETTINGS_VM = Path("PsychonautWiki Journal/Settings/Settings-ViewModel.swift")
SETTINGS_SCREEN = Path("PsychonautWiki Journal/Settings/SettingsScreen.swift")
TESTING_SERVICES = Path("PsychonautWiki Journal/Safer/Screens/TestingServicesScreen.swift")
SHARE_SCREEN = Path("PsychonautWiki Journal/Settings/Components/Share/ShareScreen.swift")


def port_modern_imports() -> None:
    text = SETTINGS_VM.read_text(encoding="utf-8")

    old_decode = "let file = try JSONDecoder().decode(JournalFile.self, from: data)"
    new_decode = (
        "let normalizedData = normalizeModernJournalExport(data)\n"
        "                let file = try JSONDecoder().decode(JournalFile.self, from: normalizedData)"
    )
    if old_decode in text:
        text = text.replace(old_decode, new_decode, 1)

    if "private func normalizeModernJournalExport" not in text:
        marker = (
            "        // swiftlint:enable cyclomatic_complexity function_body_length\n\n"
            "        func deleteEverything() {"
        )
        compatibility_layer = r'''        // Modern Journal exports changed the custom-unit model after version 11.11.
        // Adapted from PsyLog (GPL-3.0). Only recognized Journal backups are
        // transformed; unrelated or unknown JSON is returned unchanged.
        private func normalizeModernJournalExport(_ data: Data) -> Data {
            guard
                var root = try? JSONSerialization.jsonObject(
                    with: data,
                    options: .mutableContainers
                ) as? [String: Any],
                let exportSource = root["exportSource"] as? String,
                exportSource.hasPrefix("iOS Journal")
                    || exportSource.hasPrefix("Android Journal")
            else {
                return data
            }

            guard let modernUnits = root["customUnits"] as? [[String: Any]] else {
                return data
            }

            var customSubstances = root["customSubstances"] as? [[String: Any]] ?? []
            var companions = root["substanceCompanions"] as? [[String: String]] ?? []
            var companionNames = Set(companions.compactMap { $0["substanceName"] })
            var unitNamesByID: [Int: String] = [:]

            for unit in modernUnits {
                guard let unitID = integerValue(unit["id"]) else { continue }

                let displayName = unit["name"] as? String ?? "Custom Substance"
                let unitName = unit["unit"] as? String ?? "mg"
                let note = unit["note"] as? String ?? ""
                let component = (unit["doseComponents"] as? [[String: Any]])?.first
                let linkedSubstanceName = component?["substanceName"] as? String
                let linkedUnitID = integerValue(component?["customUnitId"])

                if let linkedUnitID = linkedUnitID {
                    unitNamesByID[unitID] = "#custom-unit:\(linkedUnitID)"
                } else {
                    unitNamesByID[unitID] = linkedSubstanceName ?? displayName
                }

                if !customSubstances.contains(where: { ($0["name"] as? String) == displayName }) {
                    customSubstances.append([
                        "name": displayName,
                        "units": unitName,
                        "description": note,
                    ])
                }

                if !companionNames.contains(displayName), let color = unit["color"] as? String {
                    companions.append([
                        "substanceName": displayName,
                        "color": color,
                    ])
                    companionNames.insert(displayName)
                }
            }

            func resolveName(for unitID: Int, visited: Set<Int> = []) -> String? {
                guard !visited.contains(unitID), let value = unitNamesByID[unitID] else {
                    return nil
                }
                guard value.hasPrefix("#custom-unit:") else { return value }
                guard let nestedID = Int(value.dropFirst("#custom-unit:".count)) else {
                    return nil
                }
                var nextVisited = visited
                nextVisited.insert(unitID)
                return resolveName(for: nestedID, visited: nextVisited)
            }

            if var experiences = root["experiences"] as? [[String: Any]] {
                for experienceIndex in experiences.indices {
                    guard var ingestions = experiences[experienceIndex]["ingestions"] as? [[String: Any]] else {
                        continue
                    }

                    for ingestionIndex in ingestions.indices {
                        let currentName = ingestions[ingestionIndex]["substanceName"] as? String
                        guard currentName == nil || currentName?.isEmpty == true else { continue }
                        guard
                            let unitID = integerValue(ingestions[ingestionIndex]["customUnitId"]),
                            let resolvedName = resolveName(for: unitID)
                        else {
                            continue
                        }
                        ingestions[ingestionIndex]["substanceName"] = resolvedName
                    }

                    experiences[experienceIndex]["ingestions"] = ingestions
                }
                root["experiences"] = experiences
            }

            root["customSubstances"] = customSubstances
            root["substanceCompanions"] = companions
            root["customUnits"] = []
            root.removeValue(forKey: "exportSource")

            return (try? JSONSerialization.data(withJSONObject: root)) ?? data
        }

        private func integerValue(_ value: Any?) -> Int? {
            switch value {
            case let number as NSNumber:
                return number.intValue
            case let text as String:
                return Int(text)
            default:
                return nil
            }
        }

        // swiftlint:enable cyclomatic_complexity function_body_length

        func deleteEverything() {'''
        if marker not in text:
            raise RuntimeError("Could not find Settings ViewModel insertion point")
        text = text.replace(marker, compatibility_layer, 1)

    SETTINGS_VM.write_text(text, encoding="utf-8")


def update_project_links() -> None:
    repository = "https://github.com/drcarlosaraujocastro-ai/psychonautwiki-journal-ios"
    issues = f"{repository}/issues"

    files_and_replacements = {
        SETTINGS_SCREEN: {
            "https://github.com/isaakhanimann/psychonautwiki-journal-ios": repository,
            "https://t.me/+ss8uZhBF6g00MTY8": issues,
            "https://t.me/isaakhanimann": issues,
        },
        TESTING_SERVICES: {
            "https://t.me/isaakhanimann": issues,
        },
        SHARE_SCREEN: {
            "https://apps.apple.com/ch/app/psychonautwiki-journal/id1582059415": repository,
            "https://play.google.com/store/apps/details?id=com.isaakhanimann.journal": repository,
        },
    }

    for path, replacements in files_and_replacements.items():
        text = path.read_text(encoding="utf-8")
        for old, new in replacements.items():
            text = text.replace(old, new)
        path.write_text(text, encoding="utf-8")


def main() -> None:
    port_modern_imports()
    update_project_links()
    print("PsyLog-compatible import layer and project links applied.")


if __name__ == "__main__":
    main()
