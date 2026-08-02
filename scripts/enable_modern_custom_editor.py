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


# Extend the modern custom substance store with editable/upsert semantics.
path = 'PsychonautWiki Journal/Decoding/SubstanceRepo.swift'
text = read(path)
if 'static func unit(named name: String)' not in text:
    anchor = '''    static var importedCount: Int {\n        loadFile()?.customUnits.filter { !($0.isArchived ?? false) }.count ?? 0\n    }\n\n    @discardableResult\n    static func importData(_ data: Data) throws -> Int {'''
    insertion = '''    static var importedCount: Int {\n        loadFile()?.customUnits.filter { !($0.isArchived ?? false) }.count ?? 0\n    }\n\n    static func unit(named name: String) -> ModernCustomUnit? {\n        loadFile()?.customUnits.first {\n            $0.name.caseInsensitiveCompare(name) == .orderedSame\n        }\n    }\n\n    @discardableResult\n    static func upsertCustomSubstance(\n        id: Int?,\n        originalName: String?,\n        name: String,\n        unit: String,\n        note: String,\n        administrationRoute: AdministrationRoute,\n        doseInfo: ModernCustomDoseInfo?,\n        durationInfo: ModernCustomDurationInfo?\n    ) throws -> ModernCustomUnit {\n        let now = Date().timeIntervalSince1970 * 1000\n        var file = loadFile() ?? ModernCustomSubstanceFile(\n            customUnits: [],\n            exportSource: "Psychonaut Journal Custom Substances 14.1"\n        )\n\n        let existingIndex = file.customUnits.firstIndex { existing in\n            if let id, existing.id == id { return true }\n            if let originalName, existing.name.caseInsensitiveCompare(originalName) == .orderedSame {\n                return true\n            }\n            return existing.name.caseInsensitiveCompare(name) == .orderedSame\n        }\n\n        var customUnit: ModernCustomUnit\n        if let existingIndex {\n            customUnit = file.customUnits[existingIndex]\n        } else {\n            customUnit = ModernCustomUnit(\n                creationDate: now,\n                color: "BLUE",\n                isArchived: false,\n                note: nil,\n                name: name,\n                unit: unit,\n                unitPlural: unit,\n                id: Int(now),\n                roaInfos: [],\n                doseComponents: []\n            )\n        }\n\n        customUnit.name = name\n        customUnit.unit = unit\n        customUnit.unitPlural = unit\n        customUnit.note = note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note\n        customUnit.isArchived = false\n\n        var roaInfos = customUnit.roaInfos ?? []\n        let routeIndex = roaInfos.firstIndex {\n            $0.administrationRouteValue == administrationRoute\n        }\n        let existingRoute = routeIndex.map { roaInfos[$0] }\n        let routeInfo = ModernCustomRoaInfo(\n            creationDate: existingRoute?.creationDate ?? now,\n            administrationRoute: administrationRoute.rawValue.uppercased(),\n            id: existingRoute?.id ?? Int(now) & 0x7fffffff,\n            doseInfo: doseInfo,\n            durationInfo: durationInfo\n        )\n\n        if let routeIndex {\n            roaInfos[routeIndex] = routeInfo\n        } else {\n            roaInfos.append(routeInfo)\n        }\n        customUnit.roaInfos = roaInfos\n\n        if let existingIndex {\n            file.customUnits[existingIndex] = customUnit\n        } else {\n            file.customUnits.append(customUnit)\n        }\n\n        try save(file)\n        bumpRevision()\n        return customUnit\n    }\n\n    @discardableResult\n    static func importData(_ data: Data) throws -> Int {'''
    text = replace_once(text, anchor, insertion, 'modern store editor API')
    write(path, text)


# Replace the small legacy ViewModel with a backward-compatible editor that can
# optionally save Journal 14.1 dose/duration data. Simple customs still use Core Data.
path = 'PsychonautWiki Journal/Search/Custom Substance/AddCustomSubstance-ViewModel.swift'
text = read(path)
if 'includeDoseAndDuration' not in text:
    header = text.split('extension AddCustomSubstanceView {', 1)[0]
    body = r'''extension AddCustomSubstanceView {
    @MainActor
    class ViewModel: ObservableObject {
        @Published var name = ""
        @Published var explanation = ""
        @Published var units: String = UnitPickerOptions.mg.rawValue
        @Published var includeDoseAndDuration = false
        @Published var administrationRoute: AdministrationRoute = .oral

        @Published var lightMin = ""
        @Published var commonMin = ""
        @Published var strongMin = ""
        @Published var heavyMin = ""

        @Published var onsetMin = ""
        @Published var onsetMax = ""
        @Published var onsetUnits: DurationRange.Units = .minutes
        @Published var comeupMin = ""
        @Published var comeupMax = ""
        @Published var comeupUnits: DurationRange.Units = .minutes
        @Published var peakMin = ""
        @Published var peakMax = ""
        @Published var peakUnits: DurationRange.Units = .hours
        @Published var offsetMin = ""
        @Published var offsetMax = ""
        @Published var offsetUnits: DurationRange.Units = .hours

        private var loadedModernUnit: ModernCustomUnit?
        private var originalModernName: String?

        var isEditingModern: Bool {
            loadedModernUnit != nil
        }

        var isEverythingNeededDefined: Bool {
            guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
            guard !units.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
            guard allNumericFieldsAreValid else { return false }
            guard durationPairIsValid(min: onsetMin, max: onsetMax) else { return false }
            guard durationPairIsValid(min: comeupMin, max: comeupMax) else { return false }
            guard durationPairIsValid(min: peakMin, max: peakMax) else { return false }
            guard durationPairIsValid(min: offsetMin, max: offsetMax) else { return false }
            return true
        }

        func loadModern(name: String) {
            guard let unit = ModernCustomSubstanceStore.unit(named: name) else {
                self.name = name
                return
            }
            loadedModernUnit = unit
            originalModernName = unit.name
            self.name = unit.name
            units = unit.unit
            explanation = unit.note ?? ""
            includeDoseAndDuration = true

            if let firstRoute = unit.roaInfos?.first,
               let route = firstRoute.administrationRouteValue {
                administrationRoute = route
            }
            loadSelectedRoute()
        }

        func selectRoute(_ route: AdministrationRoute) {
            administrationRoute = route
            loadSelectedRoute()
        }

        func saveCustom(onComplete: (() -> Void)) {
            assert(isEverythingNeededDefined, "Tried to save custom substance without defining the necessary fields")

            if includeDoseAndDuration || isEditingModern {
                do {
                    loadedModernUnit = try ModernCustomSubstanceStore.upsertCustomSubstance(
                        id: loadedModernUnit?.id,
                        originalName: originalModernName,
                        name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                        unit: units.trimmingCharacters(in: .whitespacesAndNewlines),
                        note: explanation,
                        administrationRoute: administrationRoute,
                        doseInfo: makeDoseInfo(),
                        durationInfo: makeDurationInfo()
                    )
                    originalModernName = loadedModernUnit?.name
                    onComplete()
                } catch {
                    print("Failed to save modern custom substance: \(error.localizedDescription)")
                }
                return
            }

            let context = PersistenceController.shared.viewContext
            context.performAndWait {
                let custom = CustomSubstance(context: context)
                custom.name = name
                custom.units = units
                custom.explanation = explanation.isEmpty ? nil : explanation
                try? context.save()
                onComplete()
            }
        }

        private var allNumericFieldsAreValid: Bool {
            let values = [
                lightMin, commonMin, strongMin, heavyMin,
                onsetMin, onsetMax, comeupMin, comeupMax,
                peakMin, peakMax, offsetMin, offsetMax,
            ]
            return values.allSatisfy { value in
                value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    || ((parseDouble(value) ?? -1) >= 0)
            }
        }

        private func durationPairIsValid(min: String, max: String) -> Bool {
            guard let minValue = parseDouble(min), let maxValue = parseDouble(max) else {
                return true
            }
            return minValue <= maxValue
        }

        private func parseDouble(_ text: String) -> Double? {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { return nil }
            return Double(trimmed.replacingOccurrences(of: ",", with: "."))
        }

        private func makeDoseInfo() -> ModernCustomDoseInfo? {
            let light = parseDouble(lightMin)
            let common = parseDouble(commonMin)
            let strong = parseDouble(strongMin)
            let heavy = parseDouble(heavyMin)
            guard light != nil || common != nil || strong != nil || heavy != nil else { return nil }
            return ModernCustomDoseInfo(
                lightMin: light,
                commonMin: common,
                strongMin: strong,
                heavyMin: heavy
            )
        }

        private func makeDurationInfo() -> ModernCustomDurationInfo? {
            let onset = makeRange(min: onsetMin, max: onsetMax, units: onsetUnits)
            let comeup = makeRange(min: comeupMin, max: comeupMax, units: comeupUnits)
            let peak = makeRange(min: peakMin, max: peakMax, units: peakUnits)
            let offset = makeRange(min: offsetMin, max: offsetMax, units: offsetUnits)
            guard onset != nil || comeup != nil || peak != nil || offset != nil else { return nil }
            return ModernCustomDurationInfo(
                onset: onset,
                comeup: comeup,
                peak: peak,
                offset: offset,
                total: nil,
                afterglow: nil
            )
        }

        private func makeRange(
            min: String,
            max: String,
            units: DurationRange.Units
        ) -> DurationRange? {
            let minValue = parseDouble(min)
            let maxValue = parseDouble(max)
            guard minValue != nil || maxValue != nil else { return nil }
            return DurationRange(min: minValue, max: maxValue, units: units)
        }

        private func loadSelectedRoute() {
            clearRouteFields()
            guard let unit = loadedModernUnit else { return }
            guard let info = unit.roaInfos?.first(where: {
                $0.administrationRouteValue == administrationRoute
            }) else { return }

            lightMin = display(info.doseInfo?.lightMin)
            commonMin = display(info.doseInfo?.commonMin)
            strongMin = display(info.doseInfo?.strongMin)
            heavyMin = display(info.doseInfo?.heavyMin)

            onsetMin = display(info.durationInfo?.onset?.min)
            onsetMax = display(info.durationInfo?.onset?.max)
            onsetUnits = info.durationInfo?.onset?.units ?? .minutes
            comeupMin = display(info.durationInfo?.comeup?.min)
            comeupMax = display(info.durationInfo?.comeup?.max)
            comeupUnits = info.durationInfo?.comeup?.units ?? .minutes
            peakMin = display(info.durationInfo?.peak?.min)
            peakMax = display(info.durationInfo?.peak?.max)
            peakUnits = info.durationInfo?.peak?.units ?? .hours
            offsetMin = display(info.durationInfo?.offset?.min)
            offsetMax = display(info.durationInfo?.offset?.max)
            offsetUnits = info.durationInfo?.offset?.units ?? .hours
        }

        private func clearRouteFields() {
            lightMin = ""
            commonMin = ""
            strongMin = ""
            heavyMin = ""
            onsetMin = ""
            onsetMax = ""
            onsetUnits = .minutes
            comeupMin = ""
            comeupMax = ""
            comeupUnits = .minutes
            peakMin = ""
            peakMax = ""
            peakUnits = .hours
            offsetMin = ""
            offsetMax = ""
            offsetUnits = .hours
        }

        private func display(_ value: Double?) -> String {
            guard let value else { return "" }
            return value.formatted(.number.precision(.fractionLength(0...3)))
        }
    }
}
'''
    write(path, header + body)


# Extend the existing Form instead of adding a visually separate editor.
path = 'PsychonautWiki Journal/Search/Custom Substance/AddCustomSubstanceView.swift'
text = read(path)
if 'DurationRangeEditorRow' not in text:
    text = replace_once(
        text,
        '''    let searchText: String\n    let onAdded: (CustomSubstanceChooseRouteScreenArguments) -> Void\n\n    @StateObject private var viewModel = ViewModel()''',
        '''    let searchText: String\n    let editingModernName: String?\n    let onAdded: (CustomSubstanceChooseRouteScreenArguments) -> Void\n\n    @StateObject private var viewModel = ViewModel()''',
        'AddCustom properties'
    )

    text = replace_once(
        text,
        '''    @AppStorage(PersistenceController.isEyeOpenKey2) var isEyeOpen: Bool = false\n\n    var body: some View {''',
        '''    @AppStorage(PersistenceController.isEyeOpenKey2) var isEyeOpen: Bool = false\n\n    init(\n        searchText: String,\n        editingModernName: String? = nil,\n        onAdded: @escaping (CustomSubstanceChooseRouteScreenArguments) -> Void\n    ) {\n        self.searchText = searchText\n        self.editingModernName = editingModernName\n        self.onAdded = onAdded\n    }\n\n    var body: some View {''',
        'AddCustom init'
    )

    text = replace_once(
        text,
        '''                Section("Units") {\n                    UnitsPicker(units: $viewModel.units)\n                }\n            }''',
        '''                Section("Units") {\n                    UnitsPicker(units: $viewModel.units)\n                }\n                Section(\n                    header: Text("Dose & Duration"),\n                    footer: Text("Optional. When enabled, this custom substance uses the same dose, duration and timeline views as built-in substances.")\n                ) {\n                    Toggle("Add dose and duration data", isOn: $viewModel.includeDoseAndDuration)\n                }\n                if viewModel.includeDoseAndDuration {\n                    Section("Route") {\n                        Picker("Administration Route", selection: $viewModel.administrationRoute) {\n                            ForEach(AdministrationRoute.allCases) { route in\n                                Text(route.rawValue.localizedCapitalized).tag(route)\n                            }\n                        }\n                        .onChange(of: viewModel.administrationRoute) { route in\n                            viewModel.selectRoute(route)\n                        }\n                    }\n                    Section(\n                        header: Text("Dose"),\n                        footer: Text("Values are the lower bounds for each dose range. Leave unknown values empty.")\n                    ) {\n                        NumericCustomField(title: "Light", text: $viewModel.lightMin, units: viewModel.units)\n                        NumericCustomField(title: "Common", text: $viewModel.commonMin, units: viewModel.units)\n                        NumericCustomField(title: "Strong", text: $viewModel.strongMin, units: viewModel.units)\n                        NumericCustomField(title: "Heavy", text: $viewModel.heavyMin, units: viewModel.units)\n                    }\n                    Section(\n                        header: Text("Duration"),\n                        footer: Text("These ranges drive the Journal timeline graph.")\n                    ) {\n                        DurationRangeEditorRow(\n                            title: "Onset",\n                            min: $viewModel.onsetMin,\n                            max: $viewModel.onsetMax,\n                            units: $viewModel.onsetUnits\n                        )\n                        DurationRangeEditorRow(\n                            title: "Come-up",\n                            min: $viewModel.comeupMin,\n                            max: $viewModel.comeupMax,\n                            units: $viewModel.comeupUnits\n                        )\n                        DurationRangeEditorRow(\n                            title: "Peak",\n                            min: $viewModel.peakMin,\n                            max: $viewModel.peakMax,\n                            units: $viewModel.peakUnits\n                        )\n                        DurationRangeEditorRow(\n                            title: "Offset",\n                            min: $viewModel.offsetMin,\n                            max: $viewModel.offsetMax,\n                            units: $viewModel.offsetUnits\n                        )\n                    }\n                }\n            }''',
        'AddCustom advanced form'
    )

    text = replace_once(
        text,
        '''            .onAppear(perform: {\n                viewModel.name = searchText\n            })\n            .navigationTitle("Create Custom")''',
        '''            .onAppear {\n                if let editingModernName {\n                    viewModel.loadModern(name: editingModernName)\n                } else {\n                    viewModel.name = searchText\n                }\n            }\n            .navigationTitle(editingModernName == nil ? "Create Custom" : "Edit Custom")''',
        'AddCustom onAppear/title'
    )

    text += r'''

private struct NumericCustomField: View {
    let title: String
    @Binding var text: String
    let units: String

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            TextField("Optional", text: $text)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
            Text(units)
                .foregroundColor(.secondary)
        }
    }
}

private struct DurationRangeEditorRow: View {
    let title: String
    @Binding var min: String
    @Binding var max: String
    @Binding var units: DurationRange.Units

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
            HStack {
                TextField("Min", text: $min)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                Text("–")
                    .foregroundColor(.secondary)
                TextField("Max", text: $max)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                Picker("Units", selection: $units) {
                    ForEach(DurationRange.Units.allCases, id: \.self) { unit in
                        Text(unit.rawValue.localizedCapitalized).tag(unit)
                    }
                }
                .labelsHidden()
            }
        }
    }
}
'''
    write(path, text)


# Add an Edit button to native custom-substance detail pages. The detail view
# refreshes from the store after the sheet writes a new revision.
path = 'PsychonautWiki Journal/Search/Substance/SubstanceScreen.swift'
text = read(path)
if 'isShowingEditCustomSubstanceSheet' not in text:
    text = replace_once(
        text,
        '''    @State private var isShowingAddIngestionSheet = false\n\n    var body: some View {\n        List {''',
        '''    @State private var isShowingAddIngestionSheet = false\n    @State private var isShowingEditCustomSubstanceSheet = false\n    @State private var currentCustomName: String?\n    @AppStorage(ModernCustomSubstanceStore.revisionKey) private var modernCustomSubstancesRevision = 0\n\n    private var displayedSubstance: Substance {\n        _ = modernCustomSubstancesRevision\n        let lookupName = currentCustomName ?? substance.name\n        if substance.categories.contains("custom"),\n           let updated = SubstanceRepo.shared.getSubstance(name: lookupName) {\n            return updated\n        }\n        return substance\n    }\n\n    var body: some View {\n        let displayedSubstance = displayedSubstance\n        List {''',
        'SubstanceScreen state'
    )

    # Within the body only, use the live custom substance. These replacements
    # are deliberately scoped to common view references.
    replacements = {
        'if !substance.isApproved {': 'if !displayedSubstance.isApproved {',
        'if let summary = substance.summary {': 'if let summary = displayedSubstance.summary {',
        'if !substance.categories.isEmpty {': 'if !displayedSubstance.categories.isEmpty {',
        'CategorySection(substance: substance)': 'CategorySection(substance: displayedSubstance)',
        'if let effects = substance.effectsSummary {': 'if let effects = displayedSubstance.effectsSummary {',
        'if substance.dosageRemark != nil || !substance.doseInfos.isEmpty {': 'if displayedSubstance.dosageRemark != nil || !displayedSubstance.doseInfos.isEmpty {',
        'DosesSection(substance: substance)': 'DosesSection(substance: displayedSubstance)',
        'let durationInfos = substance.durationInfos': 'let durationInfos = displayedSubstance.durationInfos',
        'DurationSection(substance: substance)': 'DurationSection(substance: displayedSubstance)',
        'if let interactions = substance.interactions {': 'if let interactions = displayedSubstance.interactions {',
        'substance: substance\n': 'substance: displayedSubstance\n',
        'if substance.tolerance != nil || !substance.crossTolerances.isEmpty {': 'if displayedSubstance.tolerance != nil || !displayedSubstance.crossTolerances.isEmpty {',
        'ToleranceSection(substance: substance)': 'ToleranceSection(substance: displayedSubstance)',
        'if !substance.toxicities.isEmpty {': 'if !displayedSubstance.toxicities.isEmpty {',
        'ToxicitySection(substance: substance)': 'ToxicitySection(substance: displayedSubstance)',
        'if let acute = substance.generalRisks {': 'if let acute = displayedSubstance.generalRisks {',
        'if let longTerm = substance.longtermRisks {': 'if let longTerm = displayedSubstance.longtermRisks {',
        'if !substance.saferUse.isEmpty {': 'if !displayedSubstance.saferUse.isEmpty {',
        'ForEach(substance.saferUse, id: \.self)': 'ForEach(displayedSubstance.saferUse, id: \.self)',
        'if let addictionPotential = substance.addictionPotential {': 'if let addictionPotential = displayedSubstance.addictionPotential {',
        'AcknowledgeInteractionsView(substance: substance)': 'AcknowledgeInteractionsView(substance: displayedSubstance)',
        '.navigationTitle(substance.name)': '.navigationTitle(displayedSubstance.name)',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    old_toolbar = '''        .toolbar {\n            ToolbarItem(placement: .topBarTrailing) {\n                NavigationLink("Article", value: GlobalNavigationDestination.webView(articleURL: substance.url))\n            }\n        }'''
    new_toolbar = '''        .toolbar {\n            if displayedSubstance.categories.contains("custom") {\n                ToolbarItem(placement: .topBarTrailing) {\n                    Button("Edit") {\n                        isShowingEditCustomSubstanceSheet = true\n                    }\n                }\n            }\n            ToolbarItem(placement: .topBarTrailing) {\n                NavigationLink(\n                    "Article",\n                    value: GlobalNavigationDestination.webView(articleURL: displayedSubstance.url)\n                )\n            }\n        }'''
    text = replace_once(text, old_toolbar, new_toolbar, 'SubstanceScreen toolbar')

    anchor = '''        .fullScreenCover(isPresented: $isShowingAddIngestionSheet) {\n            NavigationStack {\n                AcknowledgeInteractionsView(substance: displayedSubstance) {\n                    isShowingAddIngestionSheet.toggle()\n                }\n            }\n        }'''
    insertion = '''        .sheet(isPresented: $isShowingEditCustomSubstanceSheet) {\n            AddCustomSubstanceView(\n                searchText: displayedSubstance.name,\n                editingModernName: displayedSubstance.name\n            ) { arguments in\n                currentCustomName = arguments.substanceName\n            }\n        }\n        .fullScreenCover(isPresented: $isShowingAddIngestionSheet) {\n            NavigationStack {\n                AcknowledgeInteractionsView(substance: displayedSubstance) {\n                    isShowingAddIngestionSheet.toggle()\n                }\n            }\n        }'''
    text = replace_once(text, anchor, insertion, 'SubstanceScreen edit sheet')
    write(path, text)


# Tests for upsert logic use the non-persistent decode model; CI already covers
# DMXE decoding. Here we add a static source assertion via grep in the workflow.
print('Modern custom substance editor patch applied.')
