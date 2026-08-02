from pathlib import Path

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


# 1) Substance: add a dedicated initializer that maps modern custom-substance
# route/dose/duration data into the app's native Substance model.
path = 'PsychonautWiki Journal/Decoding/Substance.swift'
text = read(path)
marker = 'init(modernCustomUnit: ModernCustomUnit)'
if marker not in text:
    anchor = '''        saferUse = (try? container.decodeIfPresent([String].self, forKey: .saferUse)) ?? []\n    }\n\n    var administrationRoutesUnwrapped: [AdministrationRoute] {'''
    insertion = '''        saferUse = (try? container.decodeIfPresent([String].self, forKey: .saferUse)) ?? []\n    }\n\n    init(modernCustomUnit: ModernCustomUnit) {\n        name = modernCustomUnit.name\n\n        var searchURL = URLComponents(string: "https://psychonautwiki.org/w/index.php")\n        searchURL?.queryItems = [URLQueryItem(name: "search", value: modernCustomUnit.name)]\n        url = searchURL?.url ?? URL(string: "https://psychonautwiki.org/")!\n\n        commonNames = []\n        isApproved = false\n        tolerance = nil\n        crossTolerances = []\n        addictionPotential = nil\n        toxicities = []\n        categories = ["custom"]\n        interactions = nil\n\n        roas = (modernCustomUnit.roaInfos ?? []).compactMap { info in\n            guard let route = info.administrationRouteValue else { return nil }\n\n            let dose = info.doseInfo.map { info in\n                RoaDose(\n                    units: modernCustomUnit.unit,\n                    lightMin: info.lightMin,\n                    commonMin: info.commonMin,\n                    strongMin: info.strongMin,\n                    heavyMin: info.heavyMin\n                )\n            }\n\n            let duration = info.durationInfo.map { info in\n                RoaDuration(\n                    onset: info.onset,\n                    comeup: info.comeup,\n                    peak: info.peak,\n                    offset: info.offset,\n                    total: info.total,\n                    afterglow: info.afterglow\n                )\n            }\n\n            return Roa(\n                name: route,\n                dose: dose,\n                duration: duration,\n                bioavailability: nil\n            )\n        }\n\n        let trimmedNote = modernCustomUnit.note?.trimmingCharacters(in: .whitespacesAndNewlines)\n        summary = (trimmedNote?.isEmpty == false) ? trimmedNote : nil\n        effectsSummary = nil\n        dosageRemark = "Custom substance"\n        generalRisks = nil\n        longtermRisks = nil\n        saferUse = []\n    }\n\n    var administrationRoutesUnwrapped: [AdministrationRoute] {'''
    text = replace_once(text, anchor, insertion, 'Substance initializer')
    write(path, text)


# 2) SubstanceRepo: keep the bundled database immutable, but merge modern
# custom substances at read time. This lets existing search, dose, duration,
# ingestion and timeline code use them without a parallel UI.
path = 'PsychonautWiki Journal/Decoding/SubstanceRepo.swift'
text = read(path)
if 'enum ModernCustomSubstanceStore' not in text:
    header = text.split('class SubstanceRepo {', 1)[0]
    replacement = r'''class SubstanceRepo {
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
'''
    text = header + replacement
    write(path, text)


# 3) Settings ViewModel: import the modern custom-substance file without
# deleting journal data, and include it in Delete Everything.
path = 'PsychonautWiki Journal/Settings/Settings-ViewModel.swift'
text = read(path)
if 'func importCustomSubstances(data: Data)' not in text:
    modern_anchor = '        // Modern Journal exports changed the custom-unit model after version 11.11.\n'
    fallback_anchor = '        // swiftlint:enable cyclomatic_complexity function_body_length\n'
    method = '''        func importCustomSubstances(data: Data) {\n            do {\n                let count = try ModernCustomSubstanceStore.importData(data)\n                let noun = count == 1 ? "substance" : "substances"\n                showSuccessToast(message: "Imported \\(count) custom \\(noun)")\n            } catch {\n                print("Custom substance import failed: \\(error.localizedDescription)")\n                showErrorToast(message: "Custom Substance Import Failed")\n            }\n        }\n\n'''
    if modern_anchor in text:
        text = replace_once(text, modern_anchor, method + modern_anchor, 'Settings VM custom import')
    else:
        text = replace_once(text, fallback_anchor, method + fallback_anchor, 'Settings VM custom import fallback')

if 'try ModernCustomSubstanceStore.deleteAll()' not in text:
    anchor = '''            do {\n                try PersistenceController.shared.deleteEverything()\n                showSuccessToast(message: "Delete Successful")\n'''
    insertion = '''            do {\n                try PersistenceController.shared.deleteEverything()\n                try ModernCustomSubstanceStore.deleteAll()\n                showSuccessToast(message: "Delete Successful")\n'''
    text = replace_once(text, anchor, insertion, 'Settings VM delete modern customs')
write(path, text)


# 4) Settings UI: separate importer for Custom Substances 14.x so it never
# replaces journal history.
path = 'PsychonautWiki Journal/Settings/SettingsScreen.swift'
text = read(path)
if 'importCustomSubstances:' not in text:
    anchor = '''            importData: { data in\n                viewModel.importData(data: data)\n            },\n            deleteEverything: {'''
    insertion = '''            importData: { data in\n                viewModel.importData(data: data)\n            },\n            importCustomSubstances: { data in\n                viewModel.importCustomSubstances(data: data)\n            },\n            deleteEverything: {'''
    text = replace_once(text, anchor, insertion, 'SettingsScreen pass import closure')

if 'let importCustomSubstances: (Data) -> Void' not in text:
    anchor = '''    let exportData: () -> Void\n    let importData: (Data) -> Void\n    let deleteEverything: () -> Void\n'''
    insertion = '''    let exportData: () -> Void\n    let importData: (Data) -> Void\n    let importCustomSubstances: (Data) -> Void\n    let deleteEverything: () -> Void\n'''
    text = replace_once(text, anchor, insertion, 'SettingsContent closure')

if '@State private var isImportingCustomSubstances = false' not in text:
    anchor = '''    @State private var isShowingDeleteConfirmation = false\n    @State private var isShowingImportAlert = false\n'''
    insertion = '''    @State private var isShowingDeleteConfirmation = false\n    @State private var isShowingImportAlert = false\n    @State private var isImportingCustomSubstances = false\n    @AppStorage(ModernCustomSubstanceStore.revisionKey) private var modernCustomSubstancesRevision = 0\n'''
    text = replace_once(text, anchor, insertion, 'SettingsContent state')

if 'Section("Custom Substances")' not in text:
    anchor = '''            Section("Communication") {\n'''
    insertion = '''            Section(\n                header: Text("Custom Substances"),\n                footer: Text("Imports Journal 14.x custom-substance files without replacing your experiences or journal history.")\n            ) {\n                Button {\n                    isImportingCustomSubstances = true\n                } label: {\n                    Label("Import Custom Substances", systemImage: "square.and.arrow.down")\n                }\n                HStack {\n                    Text("Imported")\n                    Spacer()\n                    Text("\\(ModernCustomSubstanceStore.importedCount)")\n                        .foregroundColor(.secondary)\n                }\n                .id(modernCustomSubstancesRevision)\n            }\n            Section("Communication") {\n'''
    text = replace_once(text, anchor, insertion, 'Settings custom section')

if 'isPresented: $isImportingCustomSubstances' not in text:
    anchor = '''        .fileExporter(\n            isPresented: $isExporting,\n'''
    insertion = '''        .fileImporter(\n            isPresented: $isImportingCustomSubstances,\n            allowedContentTypes: [.json]\n        ) { result in\n            do {\n                let selectedFile = try result.get()\n                let didStartAccess = selectedFile.startAccessingSecurityScopedResource()\n                defer {\n                    if didStartAccess {\n                        selectedFile.stopAccessingSecurityScopedResource()\n                    }\n                }\n                let data = try Data(contentsOf: selectedFile)\n                importCustomSubstances(data)\n            } catch {\n                toastViewModel.showErrorToast(message: "Custom Substance Import Failed")\n                print("Error importing custom substances: \\(error.localizedDescription)")\n            }\n        }\n        .fileExporter(\n            isPresented: $isExporting,\n'''
    text = replace_once(text, anchor, insertion, 'Settings custom file importer')

if 'importCustomSubstances: { _ in },' not in text:
    anchor = '''        exportData: {},\n        importData: { _ in },\n        deleteEverything: {},\n'''
    insertion = '''        exportData: {},\n        importData: { _ in },\n        importCustomSubstances: { _ in },\n        deleteEverything: {},\n'''
    text = replace_once(text, anchor, insertion, 'Settings preview')
write(path, text)


# 5) Search: observe the import revision so a newly imported substance appears
# immediately when returning to Search.
path = 'PsychonautWiki Journal/Search/SearchScreen.swift'
text = read(path)
if 'modernCustomSubstancesRevision' not in text:
    anchor = '''    @AppStorage("isSearchSubstanceSiriTipVisible") private var isSiriTipVisible = true\n\n    private static let custom = "custom"\n'''
    insertion = '''    @AppStorage("isSearchSubstanceSiriTipVisible") private var isSiriTipVisible = true\n    @AppStorage(ModernCustomSubstanceStore.revisionKey) private var modernCustomSubstancesRevision = 0\n\n    private static let custom = "custom"\n'''
    text = replace_once(text, anchor, insertion, 'Search revision storage')

    anchor = '''    private var substancesFilteredAndSorted: [Substance] {\n        let substancesFilteredWithCategoriesOnly = SubstanceRepo.shared.substances.filter { substance in\n'''
    insertion = '''    private var substancesFilteredAndSorted: [Substance] {\n        _ = modernCustomSubstancesRevision\n        let substancesFilteredWithCategoriesOnly = SubstanceRepo.shared.substances.filter { substance in\n'''
    text = replace_once(text, anchor, insertion, 'Search revision consume')
write(path, text)


# 6) Tests: decode a real 14.1-shaped payload and verify dose/duration mapping.
path = 'JournalTests/DecodingTests.swift'
text = read(path)
if 'testModernCustomSubstance14Decoding' not in text:
    anchor = '''    private func getInitialData() throws -> Data {\n'''
    insertion = r'''    func testModernCustomSubstance14Decoding() throws {
        let json = #"""
        {
          "customUnits": [
            {
              "creationDate": 1774271988000,
              "color": "PINK",
              "isArchived": false,
              "note": "RC-Chemical, no reliable data, pls be careful",
              "name": "DMXE",
              "unit": "mg",
              "unitPlural": "mg",
              "id": -2051508362,
              "roaInfos": [
                {
                  "creationDate": 1774271988000,
                  "administrationRoute": "ORAL",
                  "id": 1454188326,
                  "doseInfo": {
                    "lightMin": 5,
                    "commonMin": 10,
                    "heavyMin": 40,
                    "strongMin": 20
                  },
                  "durationInfo": {
                    "onset": { "min": 15, "units": "minutes", "max": 45 },
                    "peak": { "min": 2, "units": "hours", "max": 4 },
                    "offset": { "min": 4, "units": "hours", "max": 8 },
                    "comeup": { "min": 30, "units": "minutes", "max": 90 }
                  }
                }
              ],
              "doseComponents": []
            }
          ],
          "exportSource": "iOS Custom Substances 14.1"
        }
        """#.data(using: .utf8)!

        let substances = try ModernCustomSubstanceStore.decodeSubstances(from: json)
        let dmxe = try XCTUnwrap(substances.first)

        XCTAssertEqual(dmxe.name, "DMXE")
        XCTAssertEqual(dmxe.categories, ["custom"])
        XCTAssertFalse(dmxe.isApproved)
        XCTAssertEqual(dmxe.administrationRoutesUnwrapped, [.oral])
        XCTAssertEqual(dmxe.getDose(for: .oral)?.commonMin, 10)
        XCTAssertEqual(dmxe.getDose(for: .oral)?.strongMin, 20)
        XCTAssertEqual(dmxe.getDuration(for: .oral)?.onset?.minSec, 15 * 60)
        XCTAssertEqual(dmxe.getDuration(for: .oral)?.peak?.maxSec, 4 * 60 * 60)
    }

    func testJournalBackupIsNotAcceptedAsCustomSubstanceExport() throws {
        let json = #"{\"customUnits\":[],\"exportSource\":\"iOS Journal 14.1\"}"#.data(using: .utf8)!
        XCTAssertThrowsError(try ModernCustomSubstanceStore.decodeSubstances(from: json))
    }

    private func getInitialData() throws -> Data {
'''
    text = replace_once(text, anchor, insertion, 'Decoding tests')
write(path, text)

print('Modern custom-substance compatibility patch applied.')
