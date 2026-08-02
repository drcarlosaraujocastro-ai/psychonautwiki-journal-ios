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

import Foundation

extension AddCustomSubstanceView {
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

        func deleteModern(onComplete: (() -> Void)) {
            guard let loadedModernUnit else { return }
            do {
                _ = try ModernCustomSubstanceStore.deleteUnit(
                    id: loadedModernUnit.id,
                    name: originalModernName ?? loadedModernUnit.name
                )
                self.loadedModernUnit = nil
                originalModernName = nil
                onComplete()
            } catch {
                print("Failed to delete modern custom substance: \(error.localizedDescription)")
            }
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
