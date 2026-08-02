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

import SwiftUI

struct AddCustomSubstanceView: View {

    let searchText: String
    let editingModernName: String?
    let onAdded: (CustomSubstanceChooseRouteScreenArguments) -> Void

    @StateObject private var viewModel = ViewModel()
    @Environment(\.dismiss) private var dismiss
    @AppStorage(PersistenceController.isEyeOpenKey2) var isEyeOpen: Bool = false

    init(
        searchText: String,
        editingModernName: String? = nil,
        onAdded: @escaping (CustomSubstanceChooseRouteScreenArguments) -> Void
    ) {
        self.searchText = searchText
        self.editingModernName = editingModernName
        self.onAdded = onAdded
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField(
                        "Name",
                        text: $viewModel.name,
                        prompt: Text("Enter Name")
                    )
                    .disableAutocorrection(true)
                }
                Section("Description") {
                    TextField(
                        "Description",
                        text: $viewModel.explanation,
                        prompt: Text("Enter Description")
                    )
                    .disableAutocorrection(true)
                }
                Section("Units") {
                    UnitsPicker(units: $viewModel.units)
                }
                Section(
                    header: Text("Dose & Duration"),
                    footer: Text("Optional. When enabled, this custom substance uses the same dose, duration and timeline views as built-in substances.")
                ) {
                    Toggle("Add dose and duration data", isOn: $viewModel.includeDoseAndDuration)
                }
                if viewModel.includeDoseAndDuration {
                    Section("Route") {
                        Picker("Administration Route", selection: $viewModel.administrationRoute) {
                            ForEach(AdministrationRoute.allCases) { route in
                                Text(route.rawValue.localizedCapitalized).tag(route)
                            }
                        }
                        .onChange(of: viewModel.administrationRoute) { route in
                            viewModel.selectRoute(route)
                        }
                    }
                    Section(
                        header: Text("Dose"),
                        footer: Text("Values are the lower bounds for each dose range. Leave unknown values empty.")
                    ) {
                        NumericCustomField(title: "Light", text: $viewModel.lightMin, units: viewModel.units)
                        NumericCustomField(title: "Common", text: $viewModel.commonMin, units: viewModel.units)
                        NumericCustomField(title: "Strong", text: $viewModel.strongMin, units: viewModel.units)
                        NumericCustomField(title: "Heavy", text: $viewModel.heavyMin, units: viewModel.units)
                    }
                    Section(
                        header: Text("Duration"),
                        footer: Text("These ranges drive the Journal timeline graph.")
                    ) {
                        DurationRangeEditorRow(
                            title: "Onset",
                            min: $viewModel.onsetMin,
                            max: $viewModel.onsetMax,
                            units: $viewModel.onsetUnits
                        )
                        DurationRangeEditorRow(
                            title: "Come-up",
                            min: $viewModel.comeupMin,
                            max: $viewModel.comeupMax,
                            units: $viewModel.comeupUnits
                        )
                        DurationRangeEditorRow(
                            title: "Peak",
                            min: $viewModel.peakMin,
                            max: $viewModel.peakMax,
                            units: $viewModel.peakUnits
                        )
                        DurationRangeEditorRow(
                            title: "Offset",
                            min: $viewModel.offsetMin,
                            max: $viewModel.offsetMax,
                            units: $viewModel.offsetUnits
                        )
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: viewModel.name) { newValue in
                if !isEyeOpen {
                    let allSubstances = SubstanceRepo.shared.substances
                    let originalFiltered = SearchLogic.getFilteredSubstancesSorted(substances: allSubstances, searchText: newValue, namesToSortBy: [])
                    if newValue.count > 3 && originalFiltered.count > 0 {
                        isEyeOpen = true
                    }
                }
            }
            .onAppear {
                if let editingModernName {
                    viewModel.loadModern(name: editingModernName)
                } else {
                    viewModel.name = searchText
                }
            }
            .navigationTitle(editingModernName == nil ? "Create Custom" : "Edit Custom")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    if viewModel.isEverythingNeededDefined {
                        DoneButton {
                            viewModel.saveCustom {
                                onAdded(CustomSubstanceChooseRouteScreenArguments(substanceName: viewModel.name, units: viewModel.units))
                                dismiss()
                            }
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    AddCustomSubstanceView(searchText: "My subs", onAdded: {_ in })
}


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
