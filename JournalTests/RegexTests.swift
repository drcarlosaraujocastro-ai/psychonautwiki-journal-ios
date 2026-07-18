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

@testable import Journal
import XCTest

final class RegexTests: XCTestCase {
    func testDOxFamily() {
        XCTAssertTrue(InteractionChecker.hasXAndMatches(wordWithX: "DOx", matchWith: "DOM"))
        XCTAssertTrue(InteractionChecker.hasXAndMatches(wordWithX: "DOx", matchWith: "DOB"))
        XCTAssertFalse(InteractionChecker.hasXAndMatches(wordWithX: "DOx", matchWith: "Oxycodone"))
    }

    func test2CFamily() {
        XCTAssertTrue(InteractionChecker.hasXAndMatches(wordWithX: "2C-x", matchWith: "2C-B"))
        XCTAssertTrue(InteractionChecker.hasXAndMatches(wordWithX: "2C-T-X", matchWith: "2C-T-7"))
    }

    func testNBOMeFamily() {
        XCTAssertTrue(InteractionChecker.hasXAndMatches(wordWithX: "25x-NBOMe", matchWith: "25I-NBOMe"))
    }

    func testMeOFamily() {
        XCTAssertTrue(InteractionChecker.hasXAndMatches(wordWithX: "5-MeO-xxT", matchWith: "5-MeO-DMT"))
    }

    func testOrdinaryNamesContainingXAreNotWildcardPatterns() {
        XCTAssertFalse(
            InteractionChecker.hasXAndMatches(
                wordWithX: "Dextromethorphan",
                matchWith: "Dextromethorphan"
            )
        )
        XCTAssertFalse(
            InteractionChecker.hasXAndMatches(
                wordWithX: "Oxycodone",
                matchWith: "Oxycodone"
            )
        )
    }

    func testWildcardMatcherIsAnchored() {
        XCTAssertFalse(
            InteractionChecker.hasXAndMatches(
                wordWithX: "DOx",
                matchWith: "prefix-DOM-suffix"
            )
        )
    }
}
