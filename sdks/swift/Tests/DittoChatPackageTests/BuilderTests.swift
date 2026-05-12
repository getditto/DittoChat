import XCTest
@testable import DittoChatCore

@MainActor
final class BuilderTests: XCTestCase {
    func testIsAdminDefaultsToFalse() {
        let builder = DittoChat.builder()
        XCTAssertFalse(builder.isAdmin)
    }

    func testSetIsAdminTrue() {
        let builder = DittoChat.builder()
        builder.setIsAdmin(true)
        XCTAssertTrue(builder.isAdmin)
    }
}
