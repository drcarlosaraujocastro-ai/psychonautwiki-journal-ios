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
