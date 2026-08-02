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

struct SubstanceScreen: View {
    let substance: Substance

    @State private var isShowingAddIngestionSheet = false
    @State private var isShowingEditCustomSubstanceSheet = false
    @State private var currentCustomName: String?
    @AppStorage(ModernCustomSubstanceStore.revisionKey) private var modernCustomSubstancesRevision = 0

    private var displayedSubstance: Substance {
        _ = modernCustomSubstancesRevision
        let lookupName = currentCustomName ?? substance.name
        if substance.categories.contains("custom"),
           let updated = SubstanceRepo.shared.getSubstance(name: lookupName) {
            return updated
        }
        return substance
    }

    var body: some View {
        let currentSubstance = self.displayedSubstance
        List {
            if !currentSubstance.isApproved {
                Section {
                    Text("Info Not PW Approved")
                }
            }
            Group {
                Group { // group is here because we cannot have more than 10 subviews
                    if let summary = currentSubstance.summary {
                        Section("Summary") {
                            VStack {
                                Text(summary)
                                if !currentSubstance.categories.isEmpty {
                                    CategorySection(substance: currentSubstance)
                                }
                            }
                        }
                    } else if !currentSubstance.categories.isEmpty {
                        Section("Categories") {
                            CategorySection(substance: currentSubstance)
                        }
                    }
                    if let effects = currentSubstance.effectsSummary {
                        Section("Effects") {
                            Text(effects)
                        }
                    }
                }
                Group {
                    if currentSubstance.dosageRemark != nil || !currentSubstance.doseInfos.isEmpty {
                        DosesSection(substance: currentSubstance)
                    }
                    let durationInfos = currentSubstance.durationInfos
                    if !durationInfos.isEmpty {
                        DurationSection(substance: currentSubstance)
                    }
                    if let interactions = currentSubstance.interactions {
                        Section("Interactions") {
                            InteractionsGroup(
                                interactions: interactions,
                                substance: currentSubstance
                            )
                        }
                    }
                    if currentSubstance.tolerance != nil || !currentSubstance.crossTolerances.isEmpty {
                        ToleranceSection(substance: currentSubstance)
                    }
                    if !currentSubstance.toxicities.isEmpty {
                        ToxicitySection(substance: currentSubstance)
                    }
                }
                Group {
                    if let acute = currentSubstance.generalRisks {
                        Section("Acute Risk") {
                            Text(acute)
                        }
                    }
                    if let longTerm = currentSubstance.longtermRisks {
                        Section("Long-term Risk") {
                            Text(longTerm)
                        }
                    }
                    if !currentSubstance.saferUse.isEmpty {
                        Section("Safer Use") {
                            ForEach(currentSubstance.saferUse, id: \.self) { point in
                                Text(point)
                            }
                        }
                    }
                    if let addictionPotential = currentSubstance.addictionPotential {
                        Section("Addiction Potential") {
                            Text(addictionPotential)
                        }
                    }
                }
            }
        }
        .toolbar {
            if currentSubstance.categories.contains("custom") {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") {
                        isShowingEditCustomSubstanceSheet = true
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(
                    "Article",
                    value: GlobalNavigationDestination.webView(articleURL: currentSubstance.url)
                )
            }
        }
        .sheet(isPresented: $isShowingEditCustomSubstanceSheet) {
            AddCustomSubstanceView(
                searchText: currentSubstance.name,
                editingModernName: currentSubstance.name
            ) { arguments in
                currentCustomName = arguments.substanceName
            }
        }
        .fullScreenCover(isPresented: $isShowingAddIngestionSheet) {
            NavigationStack {
                AcknowledgeInteractionsView(substance: currentSubstance) {
                    isShowingAddIngestionSheet.toggle()
                }
            }
        }
        .navigationTitle(currentSubstance.name)
    }
}

#Preview {
    NavigationStack {
        SubstanceScreen(
            substance: SubstanceRepo.shared.getSubstance(name: "MDMA")!
        )
    }
}
