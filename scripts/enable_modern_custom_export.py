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


# Store: export the persisted file using the same top-level marker accepted by
# modern Journal custom-substance imports.
path = 'PsychonautWiki Journal/Decoding/SubstanceRepo.swift'
text = read(path)
if 'static func exportData() throws -> Data' not in text:
    anchor = '''    static func unit(named name: String) -> ModernCustomUnit? {\n        loadFile()?.customUnits.first {\n            $0.name.caseInsensitiveCompare(name) == .orderedSame\n        }\n    }\n\n    @discardableResult\n    static func upsertCustomSubstance('''
    insertion = '''    static func unit(named name: String) -> ModernCustomUnit? {\n        loadFile()?.customUnits.first {\n            $0.name.caseInsensitiveCompare(name) == .orderedSame\n        }\n    }\n\n    static func exportData() throws -> Data {\n        var file = loadFile() ?? ModernCustomSubstanceFile(\n            customUnits: [],\n            exportSource: "iOS Custom Substances 14.1"\n        )\n        file.exportSource = "iOS Custom Substances 14.1"\n        let encoder = JSONEncoder()\n        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]\n        return try encoder.encode(file)\n    }\n\n    @discardableResult\n    static func upsertCustomSubstance('''
    text = replace_once(text, anchor, insertion, 'custom export API')
    write(path, text)


# Settings ViewModel: own a FileDocument and trigger the exporter.
path = 'PsychonautWiki Journal/Settings/Settings-ViewModel.swift'
text = read(path)
if 'isExportingCustomSubstances' not in text:
    anchor = '''        @Published var isExporting = false\n        @Published var journalFile = JournalFile(experiences: [], customSubstances: [], customUnits: [])\n        @Published var isShowingToast = false\n'''
    insertion = '''        @Published var isExporting = false\n        @Published var journalFile = JournalFile(experiences: [], customSubstances: [], customUnits: [])\n        @Published var isExportingCustomSubstances = false\n        @Published var customSubstanceDocument = ModernCustomSubstanceDocument()\n        @Published var isShowingToast = false\n'''
    text = replace_once(text, anchor, insertion, 'Settings VM export state')

    anchor = '''        func importCustomSubstances(data: Data) {\n            do {\n                let count = try ModernCustomSubstanceStore.importData(data)\n                let noun = count == 1 ? "substance" : "substances"\n                showSuccessToast(message: "Imported \\(count) custom \\(noun)")\n            } catch {\n                print("Custom substance import failed: \\(error.localizedDescription)")\n                showErrorToast(message: "Custom Substance Import Failed")\n            }\n        }\n\n'''
    insertion = '''        func importCustomSubstances(data: Data) {\n            do {\n                let count = try ModernCustomSubstanceStore.importData(data)\n                let noun = count == 1 ? "substance" : "substances"\n                showSuccessToast(message: "Imported \\(count) custom \\(noun)")\n            } catch {\n                print("Custom substance import failed: \\(error.localizedDescription)")\n                showErrorToast(message: "Custom Substance Import Failed")\n            }\n        }\n\n        func exportCustomSubstances() {\n            do {\n                customSubstanceDocument = ModernCustomSubstanceDocument(\n                    data: try ModernCustomSubstanceStore.exportData()\n                )\n                isExportingCustomSubstances = true\n            } catch {\n                print("Custom substance export failed: \\(error.localizedDescription)")\n                showErrorToast(message: "Custom Substance Export Failed")\n            }\n        }\n\n'''
    text = replace_once(text, anchor, insertion, 'Settings VM export method')
    write(path, text)


# Settings UI: remove duplicate legacy sections created by older generator runs,
# then add a second exporter in the surviving Custom Substances section.
path = 'PsychonautWiki Journal/Settings/SettingsScreen.swift'
text = read(path)
legacy_custom_section = '''            Section(\n                header: Text("Custom Substances"),\n                footer: Text("Imports Journal 14.x custom-substance files without replacing your experiences or journal history.")\n            ) {\n                Button {\n                    isImportingCustomSubstances = true\n                } label: {\n                    Label("Import Custom Substances", systemImage: "square.and.arrow.down")\n                }\n                HStack {\n                    Text("Imported")\n                    Spacer()\n                    Text("\\(ModernCustomSubstanceStore.importedCount)")\n                        .foregroundColor(.secondary)\n                }\n                .id(modernCustomSubstancesRevision)\n            }\n'''
while text.count('header: Text("Custom Substances")') > 1 and legacy_custom_section in text:
    text = text.replace(legacy_custom_section, '', 1)

if 'ModernCustomSubstanceDocument' not in text:
    text = text.replace('import SwiftUI\n', 'import SwiftUI\nimport UniformTypeIdentifiers\n', 1)

    anchor = '''            importCustomSubstances: { data in\n                viewModel.importCustomSubstances(data: data)\n            },\n            deleteEverything: {'''
    insertion = '''            importCustomSubstances: { data in\n                viewModel.importCustomSubstances(data: data)\n            },\n            isExportingCustomSubstances: $viewModel.isExportingCustomSubstances,\n            customSubstanceDocument: viewModel.customSubstanceDocument,\n            exportCustomSubstances: {\n                viewModel.exportCustomSubstances()\n            },\n            deleteEverything: {'''
    text = replace_once(text, anchor, insertion, 'Settings export arguments')

    anchor = '''    let importData: (Data) -> Void\n    let importCustomSubstances: (Data) -> Void\n    let deleteEverything: () -> Void\n'''
    insertion = '''    let importData: (Data) -> Void\n    let importCustomSubstances: (Data) -> Void\n    @Binding var isExportingCustomSubstances: Bool\n    let customSubstanceDocument: ModernCustomSubstanceDocument\n    let exportCustomSubstances: () -> Void\n    let deleteEverything: () -> Void\n'''
    text = replace_once(text, anchor, insertion, 'SettingsContent export props')

    anchor = '''                Button {\n                    isImportingCustomSubstances = true\n                } label: {\n                    Label("Import Custom Substances", systemImage: "square.and.arrow.down")\n                }\n                HStack {'''
    insertion = '''                Button {\n                    isImportingCustomSubstances = true\n                } label: {\n                    Label("Import Custom Substances", systemImage: "square.and.arrow.down")\n                }\n                Button {\n                    exportCustomSubstances()\n                } label: {\n                    Label("Export Custom Substances", systemImage: "square.and.arrow.up")\n                }\n                .disabled(ModernCustomSubstanceStore.importedCount == 0)\n                HStack {'''
    text = replace_once(text, anchor, insertion, 'Settings export button')

    anchor = '''        .fileExporter(\n            isPresented: $isExporting,\n            document: journalFile,\n'''
    insertion = '''        .fileExporter(\n            isPresented: $isExportingCustomSubstances,\n            document: customSubstanceDocument,\n            contentType: .json,\n            defaultFilename: "Custom Substances \\(Date().asDateString)"\n        ) { result in\n            if case .success = result {\n                toastViewModel.showSuccessToast(message: "Custom Substance Export Successful")\n            } else {\n                toastViewModel.showErrorToast(message: "Custom Substance Export Failed")\n            }\n        }\n        .fileExporter(\n            isPresented: $isExporting,\n            document: journalFile,\n'''
    text = replace_once(text, anchor, insertion, 'Settings custom fileExporter')

    anchor = '''        importData: { _ in },\n        importCustomSubstances: { _ in },\n        deleteEverything: {},\n'''
    insertion = '''        importData: { _ in },\n        importCustomSubstances: { _ in },\n        isExportingCustomSubstances: .constant(false),\n        customSubstanceDocument: ModernCustomSubstanceDocument(),\n        exportCustomSubstances: {},\n        deleteEverything: {},\n'''
    text = replace_once(text, anchor, insertion, 'Settings preview export args')

    text += r'''

struct ModernCustomSubstanceDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }

    var data: Data

    init(data: Data = Data()) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}
'''

write(path, text)
print('Modern custom substance export patch applied.')
