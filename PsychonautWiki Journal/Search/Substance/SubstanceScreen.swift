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
        let displayedSubstance = displayedSubstance
        List {
            if !displayedSubstance.isApproved {
                Section {
                    Text("Info Not PW Approved")
                }
            }
            Group {
                Group { // group is here because we cannot have more than 10 subviews
                    if let summary = displayedSubstance.summary {
                        Section("Summary") {
                            VStack {
                                Text(summary)
                                if !displayedSubstance.categories.isEmpty {
                                    CategorySection(substance: displayedSubstance)
                                }
                            }
                        }
                    } else {
                        if !displayedSubstance.categories.isEmpty {
                            Section("Categories") {
                                CategorySection(substance: displayedSubstance)
                            }
                        }
                    }
                    if let effects = displayedSubstance.effectsSummary {
                        Section("Effects") {
                            Text(effects)
                        }
                    }
                }
                Group {
                    if displayedSubstance.dosageRemark != nil || !displayedSubstance.doseInfos.isEmpty {
                        DosesSection(substance: displayedSubstance)
                    }
                    let durationInfos = displayedSubstance.durationInfos
                    if !durationInfos.isEmpty {
                        DurationSection(substance: displayedSubstance)
                    }
                    if let interactions = displayedSubstance.interactions {
                        Section("Interactions") {
                            InteractionsGroup(
                                interactions: interactions,
                                substance: displayedSubstance
                            )
                        }
                    }
                    if displayedSubstance.tolerance != nil || !displayedSubstance.crossTolerances.isEmpty {
                        ToleranceSection(substance: displayedSubstance)
                    }
                    if !displayedSubstance.toxicities.isEmpty {
                        ToxicitySection(substance: displayedSubstance)
                    }
                }
                Group {
                    if let acute = displayedSubstance.generalRisks {
                        Section("Acute Risk") {
                            Text(acute)
                        }
                    }
                    if let longTerm = displayedSubstance.longtermRisks {
                        Section("Long-term Risk") {
                            Text(longTerm)
                        }
                    }
                    if !displayedSubstance.saferUse.isEmpty {
                        Section("Safer Use") {
                            ForEach(displayedSubstance.saferUse, id: \.self) { point in
                                Text(point)
                            }
                        }
                    }
                    if let addictionPotential = displayedSubstance.addictionPotential {
                        Section("Addiction Potential") {
                            Text(addictionPotential)
                        }
                    }
                }
            }

        }
        .toolbar {
            if displayedSubstance.categories.contains("custom") {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") {
                        isShowingEditCustomSubstanceSheet = true
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(
                    "Article",
                    value: GlobalNavigationDestination.webView(articleURL: displayedSubstance.url)
                )
            }
        }
        .sheet(isPresented: $isShowingEditCustomSubstanceSheet) {
            AddCustomSubstanceView(
                searchText: displayedSubstance.name,
                editingModernName: displayedSubstance.name
            ) { arguments in
                currentCustomName = arguments.substanceName
            }
        }
        .fullScreenCover(isPresented: $isShowingAddIngestionSheet) {
            NavigationStack {
                AcknowledgeInteractionsView(substance: displayedSubstance) {
                    isShowingAddIngestionSheet.toggle()
                }
            }
        }
        .navigationTitle(displayedSubstance.name)
    }
}

#Preview {
    NavigationStack {
        SubstanceScreen(
            substance: SubstanceRepo.shared.getSubstance(name: "MDMA")!
        )
    }
}
