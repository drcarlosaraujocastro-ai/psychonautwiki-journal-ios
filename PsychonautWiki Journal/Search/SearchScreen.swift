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

import AppIntents
import SwiftUI

struct SearchScreen: View {
    @FocusState var isSearchFocused: Bool
    @Binding var searchText: String
    @Binding var selectedCategories: [String]
    let clearCategories: () -> Void

    @State private var isShowingAddCustomSubstance = false

    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \CustomSubstance.name, ascending: true)]
    ) private var customSubstances: FetchedResults<CustomSubstance>

    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \Ingestion.time, ascending: false)]
    ) private var ingestions: FetchedResults<Ingestion>

    @AppStorage("isSearchSubstanceSiriTipVisible") private var isSiriTipVisible = true

    private static let custom = "custom"

    private let allCategories = [custom] + SubstanceRepo.shared.categories.map(\.name)

    private var customFilteredWithCategories: [CustomSubstance] {
        if selectedCategories.isEmpty || selectedCategories.contains(Self.custom) {
            return Array(customSubstances)
        }
        return []
    }

    private var customSubstancesFiltered: [CustomSubstance] {
        let lowerCaseSearchText = searchText.lowercased()
        if searchText.count < 3 {
            return customFilteredWithCategories.filter { substance in
                substance.nameUnwrapped.lowercased().hasPrefix(lowerCaseSearchText)
            }
        }
        return customFilteredWithCategories.filter { substance in
            substance.nameUnwrapped.lowercased().contains(lowerCaseSearchText)
        }
    }

    private var substancesFilteredAndSorted: [Substance] {
        let substancesFilteredWithCategoriesOnly = SubstanceRepo.shared.substances.filter { substance in
            selectedCategories.allSatisfy { selected in
                substance.categories.contains(selected)
            }
        }
        let substanceNamesInOrder = ingestions.prefix(500).map(\.substanceNameUnwrapped).uniqued()
        return SearchLogic.getFilteredSubstancesSorted(
            substances: substancesFilteredWithCategoriesOnly,
            searchText: searchText,
            namesToSortBy: substanceNamesInOrder
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            SubstanceSearchBarWithFilter(
                text: $searchText,
                isFocused: $isSearchFocused,
                allCategories: allCategories,
                toggleCategory: toggleCategory,
                selectedCategories: selectedCategories,
                clearCategories: clearCategories
            )

            SiriTipView(intent: SearchSubstancesIntent(), isVisible: $isSiriTipVisible)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)

            List {
                ForEach(substancesFilteredAndSorted) { substance in
                    SearchSubstanceRow(substance: substance)
                }

                ForEach(customSubstancesFiltered) { customSubstance in
                    NavigationLink(
                        value: GlobalNavigationDestination.editCustomSubstance(
                            customSubstance: customSubstance
                        )
                    ) {
                        VStack(alignment: .leading) {
                            Text(customSubstance.nameUnwrapped)
                                .font(.headline)
                            Spacer().frame(height: 5)
                            Chip(name: Self.custom)
                        }
                    }
                }

                if substancesFilteredAndSorted.isEmpty && customSubstancesFiltered.isEmpty {
                    Text("No Results")
                        .foregroundColor(.secondary)
                }

                Button(action: presentAddCustomSubstance) {
                    Label("New Custom Substance", systemImage: "plus.circle.fill")
                        .labelStyle(.titleAndIcon)
                        .font(.headline)
                }
            }
            .listStyle(.plain)
            .scrollDismissesKeyboard(.interactively)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: presentAddCustomSubstance) {
                    Label("New Custom Substance", systemImage: "plus")
                }
                .accessibilityLabel("New Custom Substance")
            }
        }
        .sheet(isPresented: $isShowingAddCustomSubstance) {
            AddCustomSubstanceView(searchText: searchText, onAdded: { _ in })
        }
    }

    private func toggleCategory(_ category: String) {
        if selectedCategories.contains(category) {
            selectedCategories.removeAll { $0 == category }
        } else {
            selectedCategories.append(category)
        }
    }

    private func presentAddCustomSubstance() {
        isShowingAddCustomSubstance = true
    }
}
