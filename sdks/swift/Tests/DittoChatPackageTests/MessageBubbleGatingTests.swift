import XCTest
@testable import DittoChatUI

final class MessageBubbleGatingTests: XCTestCase {

    // MARK: - canEdit

    func testAdminCanEditTextMessage() {
        XCTAssertTrue(canEditMessage(isEditing: false, isImageMessage: false, isAdmin: true))
    }

    func testAdminCannotEditImageMessage() {
        XCTAssertFalse(canEditMessage(isEditing: false, isImageMessage: true, isAdmin: true))
    }

    func testAdminCannotEditWhileEditing() {
        XCTAssertFalse(canEditMessage(isEditing: true, isImageMessage: false, isAdmin: true))
    }

    func testNonAdminCannotEdit() {
        XCTAssertFalse(canEditMessage(isEditing: false, isImageMessage: false, isAdmin: false))
        XCTAssertFalse(canEditMessage(isEditing: false, isImageMessage: true, isAdmin: false))
        XCTAssertFalse(canEditMessage(isEditing: true, isImageMessage: false, isAdmin: false))
    }

    // MARK: - canDelete

    func testAdminCanDeleteMessage() {
        XCTAssertTrue(canDeleteMessage(isEditing: false, isAdmin: true))
    }

    func testAdminCannotDeleteWhileEditing() {
        XCTAssertFalse(canDeleteMessage(isEditing: true, isAdmin: true))
    }

    func testNonAdminCannotDelete() {
        XCTAssertFalse(canDeleteMessage(isEditing: false, isAdmin: false))
        XCTAssertFalse(canDeleteMessage(isEditing: true, isAdmin: false))
    }
}
