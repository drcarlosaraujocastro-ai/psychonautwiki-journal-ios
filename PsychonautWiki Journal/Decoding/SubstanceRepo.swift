// Copyright (c) 2022. Isaak Hanimann.
// This file is part of PsychonautWiki Journal.
//
// PsychonautWiki Journal is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public Licence as published by
// the Free Software Foundation, either version 3 of the License, or (at
// your option) any later version.
//
// PsychonautWiki Journal is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with PsychonautWiki Journal. If not, see https://www.gnu.org/licenses/gpl-3.0.en.html.

import CoreData
import Foundation

class SubstanceRepo {
    static let shared = SubstanceRepo()

    private let bundledSubstances: [Substance]
    let categories: [Category]
    private let bundledSubstancesDict: [String: Substance]

    var substances: [Substance] {
        let customSubstances = ModernCustomSubstanceStore.substances
        let bundledNames = Set(bundledSubstances.map { $0.name.lowercased() })
        return bundledSubstances + customSubstances.filter {
            !bundledNames.contains($0.name.lowercased())
        }
    }

    init() {
        let data = SubstanceRepo.getInitialData()
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .deferredToDate
        decoder.keyDecodingStrategy = .useDefaultKeys
        // swiftlint:disable force_try
        let file = try! decoder.decode(SubstanceFile.self, from: data)
        // swiftlint:enable force_try
        bundledSubstances = file.substances
        categories = file.categories
        bundledSubstancesDict = Dictionary(
            uniqueKeysWithValues: bundledSubstances.map { substance in
                (substance.name, substance)
            }
        )
    }

    func getSubstance(name: String) -> Substance? {
        if let bundled = bundledSubstancesDict[name] {
            return bundled
        }
        return ModernCustomSubstanceStore.substances.first {
            $0.name.caseInsensitiveCompare(name) == .orderedSame
        }
    }

    func getSubstances<C: Collection>(names: C) -> [Substance] where C.Element == String {
        substances.filter { names.contains($0.name) }
    }

    private static func getInitialData() -> Data {
        let fileName = "substances"
        guard let url = Bundle.main.url(forResource: fileName, withExtension: "json") else {
            fatalError("Failed to locate \(fileName) in bundle.")
        }
        guard let data = try? Data(contentsOf: url) else {
            fatalError("Failed to load \(fileName) from bundle.")
        }
        return data
    }
}

// MARK: - Modern custom substances (Journal 14.x compatibility)

struct ModernCustomSubstanceFile: Codable {
    var customUnits: [ModernCustomUnit]
    var exportSource: String
}

struct ModernCustomUnit: Codable {
    var creationDate: Double?
    var color: String?
    var isArchived: Bool?
    var note: String?
    var name: String
    var unit: String
    var unitPlural: String?
    var id: Int
    var roaInfos: [ModernCustomRoaInfo]?
    var doseComponents: [ModernDoseComponent]?
}

struct ModernCustomRoaInfo: Codable {
    var creationDate: Double?
    var administrationRoute: String
    var id: Int?
    var doseInfo: ModernCustomDoseInfo?
    var durationInfo: ModernCustomDurationInfo?

    var administrationRouteValue: AdministrationRoute? {
        let normalized = administrationRoute
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        switch normalized {
        case "oral", "swallowed":
            return .oral
        case "sublingual":
            return .sublingual
        case "buccal":
            return .buccal
        case "insufflated", "intranasal", "nasal":
            return .insufflated
        case "rectal":
            return .rectal
        case "transdermal":
            return .transdermal
        case "subcutaneous":
            return .subcutaneous
        case "intramuscular":
            return .intramuscular
        case "intravenous":
            return .intravenous
        case "smoked":
            return .smoked
        case "inhaled", "inhalation", "vaporized", "vaped":
            return .inhaled
        default:
            return AdministrationRoute(rawValue: normalized)
        }
    }
}

struct ModernCustomDoseInfo: Codable {
    var lightMin: Double?
    var commonMin: Double?
    var strongMin: Double?
    var heavyMin: Double?
}

struct ModernCustomDurationInfo: Codable {
    var onset: DurationRange?
    var comeup: DurationRange?
    var peak: DurationRange?
    var offset: DurationRange?
    var total: DurationRange?
    var afterglow: DurationRange?
}

struct ModernDoseComponent: Codable {
    var substanceName: String?
    var customUnitId: Int?
}

enum ModernCustomSubstanceStore {
    static let revisionKey = "modernCustomSubstancesRevision"
    private static let storageFileName = "custom-substances-14.json"

    enum StoreError: LocalizedError {
        case unsupportedExportSource(String)

        var errorDescription: String? {
            switch self {
            case let .unsupportedExportSource(source):
                return "Unsupported custom substance export: \(source)"
            }
        }
    }

    static var substances: [Substance] {
        guard let file = loadFile() else { return [] }
        return file.customUnits
            .filter { !($0.isArchived ?? false) }
            .map(Substance.init(modernCustomUnit:))
    }

    static var importedCount: Int {
        loadFile()?.customUnits.filter { !($0.isArchived ?? false) }.count ?? 0
    }

    static func unit(named name: String) -> ModernCustomUnit? {
        loadFile()?.customUnits.first {
            $0.name.caseInsensitiveCompare(name) == .orderedSame
        }
    }

    static func exportData() throws -> Data {
        var file = loadFile() ?? ModernCustomSubstanceFile(
            customUnits: [],
            exportSource: "iOS Custom Substances 14.1"
        )
        file.exportSource = "iOS Custom Substances 14.1"
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(file)
    }

    @discardableResult
    static func upsertCustomSubstance(
        id: Int?,
        originalName: String?,
        name: String,
        unit: String,
        note: String,
        administrationRoute: AdministrationRoute,
        doseInfo: ModernCustomDoseInfo?,
        durationInfo: ModernCustomDurationInfo?
    ) throws -> ModernCustomUnit {
        let now = Date().timeIntervalSince1970 * 1000
        var file = loadFile() ?? ModernCustomSubstanceFile(
            customUnits: [],
            exportSource: "Psychonaut Journal Custom Substances 14.1"
        )

        let existingIndex = file.customUnits.firstIndex { existing in
            if let id, existing.id == id { return true }
            if let originalName, existing.name.caseInsensitiveCompare(originalName) == .orderedSame {
                return true
            }
            return existing.name.caseInsensitiveCompare(name) == .orderedSame
        }

        var customUnit: ModernCustomUnit
        if let existingIndex {
            customUnit = file.customUnits[existingIndex]
        } else {
            customUnit = ModernCustomUnit(
                creationDate: now,
                color: "BLUE",
                isArchived: false,
                note: nil,
                name: name,
                unit: unit,
                unitPlural: unit,
                id: Int(now),
                roaInfos: [],
                doseComponents: []
            )
        }

        customUnit.name = name
        customUnit.unit = unit
        customUnit.unitPlural = unit
        customUnit.note = note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note
        customUnit.isArchived = false

        var roaInfos = customUnit.roaInfos ?? []
        let routeIndex = roaInfos.firstIndex {
            $0.administrationRouteValue == administrationRoute
        }
        let existingRoute = routeIndex.map { roaInfos[$0] }
        let routeInfo = ModernCustomRoaInfo(
            creationDate: existingRoute?.creationDate ?? now,
            administrationRoute: administrationRoute.rawValue.uppercased(),
            id: existingRoute?.id ?? Int(now) & 0x7fffffff,
            doseInfo: doseInfo,
            durationInfo: durationInfo
        )

        if let routeIndex {
            roaInfos[routeIndex] = routeInfo
        } else {
            roaInfos.append(routeInfo)
        }
        customUnit.roaInfos = roaInfos

        if let existingIndex {
            file.customUnits[existingIndex] = customUnit
        } else {
            file.customUnits.append(customUnit)
        }

        try save(file)
        bumpRevision()
        return customUnit
    }

    @discardableResult
    static func importData(_ data: Data) throws -> Int {
        let incoming = try decodeAndValidate(data)
        let existing = loadFile()

        var merged = existing?.customUnits ?? []
        for unit in incoming.customUnits {
            if let index = merged.firstIndex(where: {
                $0.id == unit.id || $0.name.caseInsensitiveCompare(unit.name) == .orderedSame
            }) {
                merged[index] = unit
            } else {
                merged.append(unit)
            }
        }

        let file = ModernCustomSubstanceFile(
            customUnits: merged,
            exportSource: "Psychonaut Journal Custom Substances 14.1"
        )
        try save(file)
        bumpRevision()
        return incoming.customUnits.count
    }

    static func decodeSubstances(from data: Data) throws -> [Substance] {
        let file = try decodeAndValidate(data)
        return file.customUnits
            .filter { !($0.isArchived ?? false) }
            .map(Substance.init(modernCustomUnit:))
    }

    static func deleteAll() throws {
        let url = storageURL
        if FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.removeItem(at: url)
        }
        bumpRevision()
    }

    private static func decodeAndValidate(_ data: Data) throws -> ModernCustomSubstanceFile {
        let file = try JSONDecoder().decode(ModernCustomSubstanceFile.self, from: data)
        let source = file.exportSource.lowercased()
        guard source.contains("custom substances") else {
            throw StoreError.unsupportedExportSource(file.exportSource)
        }
        return file
    }

    private static func loadFile() -> ModernCustomSubstanceFile? {
        guard let data = try? Data(contentsOf: storageURL) else { return nil }
        return try? JSONDecoder().decode(ModernCustomSubstanceFile.self, from: data)
    }

    private static func save(_ file: ModernCustomSubstanceFile) throws {
        let directory = storageURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try encoder.encode(file).write(to: storageURL, options: .atomic)
    }

    private static var storageURL: URL {
        let directory = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first ?? FileManager.default.temporaryDirectory
        return directory
            .appendingPathComponent("PsychonautJournal", isDirectory: true)
            .appendingPathComponent(storageFileName)
    }

    private static func bumpRevision() {
        let defaults = UserDefaults.standard
        defaults.set(defaults.integer(forKey: revisionKey) + 1, forKey: revisionKey)
    }
}
