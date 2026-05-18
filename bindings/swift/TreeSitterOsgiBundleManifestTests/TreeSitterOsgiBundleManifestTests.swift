import XCTest
import SwiftTreeSitter
import TreeSitterOsgiBundleManifest

final class TreeSitterOsgiBundleManifestTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_osgi_bundle_manifest())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading OsgiBundleManifest grammar")
    }
}
