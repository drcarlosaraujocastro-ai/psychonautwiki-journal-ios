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

final class DecodingTests: XCTestCase {
    func testRoaDecoding() throws {
        let data = try getInitialData()
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .deferredToDate
        decoder.keyDecodingStrategy = .useDefaultKeys

        let result = try decoder.decode(RoaDecodable.self, from: data)
        XCTAssertEqual(result.roas.count, 5)
    }

    func testModernCustomSubstance14Decoding() throws {
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
        let testBundle = Bundle(for: type(of: self))
        let url = try XCTUnwrap(
            testBundle.url(forResource: "Roa", withExtension: "json"),
            "Failed to locate Roa.json."
        )
        return try Data(contentsOf: url)
    }
}

struct RoaDecodable: Decodable {
    let roas: [Roa]

    enum CodingKeys: String, CodingKey {
        case roas
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        roas = try container.decode([Roa].self, forKey: .roas)
    }
}
