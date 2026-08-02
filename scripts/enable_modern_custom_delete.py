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


# Store: delete one modern custom substance while preserving every other unit.
path = 'PsychonautWiki Journal/Decoding/SubstanceRepo.swift'
text = read(path)
if 'static func deleteUnit(id: Int?, name: String)' not in text:
    anchor = '''    static func deleteAll() throws {\n        let url = storageURL\n'''
    insertion = '''    @discardableResult\n    static func deleteUnit(id: Int?, name: String) throws -> Bool {\n        guard var file = loadFile() else { return false }\n        let before = file.customUnits.count\n        file.customUnits.removeAll { unit in\n            if let id, unit.id == id { return true }\n            return unit.name.caseInsensitiveCompare(name) == .orderedSame\n        }\n        guard file.customUnits.count != before else { return false }\n        try save(file)\n        bumpRevision()\n        return true\n    }\n\n    static func deleteAll() throws {\n        let url = storageURL\n'''
    text = replace_once(text, anchor, insertion, 'store delete unit')
    write(path, text)


# Editor ViewModel: expose deletion of the currently loaded modern unit.
path = 'PsychonautWiki Journal/Search/Custom Substance/AddCustomSubstance-ViewModel.swift'
text = read(path)
if 'func deleteModern(onComplete:' not in text:
    anchor = '''        func saveCustom(onComplete: (() -> Void)) {\n'''
    method = '''        func deleteModern(onComplete: (() -> Void)) {\n            guard let loadedModernUnit else { return }\n            do {\n                _ = try ModernCustomSubstanceStore.deleteUnit(\n                    id: loadedModernUnit.id,\n                    name: originalModernName ?? loadedModernUnit.name\n                )\n                self.loadedModernUnit = nil\n                originalModernName = nil\n                onComplete()\n            } catch {\n                print("Failed to delete modern custom substance: \\(error.localizedDescription)")\n            }\n        }\n\n        func saveCustom(onComplete: (() -> Void)) {\n'''
    text = replace_once(text, anchor, method, 'ViewModel delete method')
    write(path, text)


# Existing Form: add a destructive action only when editing a modern substance.
path = 'PsychonautWiki Journal/Search/Custom Substance/AddCustomSubstanceView.swift'
text = read(path)
if 'Delete Custom Substance' not in text:
    text = replace_once(
        text,
        '''    let editingModernName: String?\n    let onAdded: (CustomSubstanceChooseRouteScreenArguments) -> Void\n\n    @StateObject private var viewModel = ViewModel()''',
        '''    let editingModernName: String?\n    let onDeleted: (() -> Void)?\n    let onAdded: (CustomSubstanceChooseRouteScreenArguments) -> Void\n\n    @StateObject private var viewModel = ViewModel()\n    @State private var isShowingDeleteConfirmation = false''',
        'editor delete properties'
    )

    text = replace_once(
        text,
        '''        searchText: String,\n        editingModernName: String? = nil,\n        onAdded: @escaping (CustomSubstanceChooseRouteScreenArguments) -> Void\n    ) {\n        self.searchText = searchText\n        self.editingModernName = editingModernName\n        self.onAdded = onAdded\n''',
        '''        searchText: String,\n        editingModernName: String? = nil,\n        onDeleted: (() -> Void)? = nil,\n        onAdded: @escaping (CustomSubstanceChooseRouteScreenArguments) -> Void\n    ) {\n        self.searchText = searchText\n        self.editingModernName = editingModernName\n        self.onDeleted = onDeleted\n        self.onAdded = onAdded\n''',
        'editor delete init'
    )

    anchor = '''                if viewModel.includeDoseAndDuration {\n                    Section("Route") {'''
    # Keep sections exactly where they are; deletion is appended after duration block below.
    if anchor not in text:
        raise SystemExit('advanced editor section anchor missing')

    close_anchor = '''                    }\n                }\n            }\n            .scrollDismissesKeyboard(.interactively)'''
    insertion = '''                    }\n                }\n                if editingModernName != nil {\n                    Section {\n                        Button("Delete Custom Substance", role: .destructive) {\n                            isShowingDeleteConfirmation = true\n                        }\n                    }\n                }\n            }\n            .scrollDismissesKeyboard(.interactively)'''
    text = replace_once(text, close_anchor, insertion, 'editor delete section')

    anchor = '''            .navigationTitle(editingModernName == nil ? "Create Custom" : "Edit Custom")\n            .toolbar {'''
    insertion = '''            .navigationTitle(editingModernName == nil ? "Create Custom" : "Edit Custom")\n            .confirmationDialog(\n                "Delete this custom substance?",\n                isPresented: $isShowingDeleteConfirmation,\n                titleVisibility: .visible\n            ) {\n                Button("Delete Custom Substance", role: .destructive) {\n                    viewModel.deleteModern {\n                        onDeleted?()\n                        dismiss()\n                    }\n                }\n                Button("Cancel", role: .cancel) {}\n            } message: {\n                Text("This removes its custom dose and duration definition. Existing journal entries are not deleted.")\n            }\n            .toolbar {'''
    text = replace_once(text, anchor, insertion, 'editor delete confirmation')
    write(path, text)


# Detail screen: when the sheet deletes the custom substance, close the now
# invalid detail destination instead of displaying a stale snapshot.
path = 'PsychonautWiki Journal/Search/Substance/SubstanceScreen.swift'
text = read(path)
if '@Environment(\\.dismiss) private var dismiss' not in text:
    anchor = '''    let substance: Substance\n\n    @State private var isShowingAddIngestionSheet = false\n'''
    insertion = '''    let substance: Substance\n\n    @Environment(\\.dismiss) private var dismiss\n    @State private var isShowingAddIngestionSheet = false\n'''
    text = replace_once(text, anchor, insertion, 'SubstanceScreen dismiss env')

if 'onDeleted: {' not in text:
    anchor = '''            AddCustomSubstanceView(\n                searchText: currentSubstance.name,\n                editingModernName: currentSubstance.name\n            ) { arguments in\n'''
    insertion = '''            AddCustomSubstanceView(\n                searchText: currentSubstance.name,\n                editingModernName: currentSubstance.name,\n                onDeleted: {\n                    dismiss()\n                }\n            ) { arguments in\n'''
    text = replace_once(text, anchor, insertion, 'SubstanceScreen delete callback')
write(path, text)

print('Modern custom substance deletion patch applied.')
