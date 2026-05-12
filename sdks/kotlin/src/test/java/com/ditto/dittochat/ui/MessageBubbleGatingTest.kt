package com.ditto.dittochat.ui

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MessageBubbleGatingTest {

    // canEdit

    @Test
    fun adminCanEditTextMessage() {
        assertTrue(canEditMessage(isEditing = false, isImageMessage = false, isAdmin = true))
    }

    @Test
    fun adminCannotEditImageMessage() {
        assertFalse(canEditMessage(isEditing = false, isImageMessage = true, isAdmin = true))
    }

    @Test
    fun adminCannotEditWhileEditing() {
        assertFalse(canEditMessage(isEditing = true, isImageMessage = false, isAdmin = true))
    }

    @Test
    fun nonAdminCannotEdit() {
        assertFalse(canEditMessage(isEditing = false, isImageMessage = false, isAdmin = false))
        assertFalse(canEditMessage(isEditing = false, isImageMessage = true, isAdmin = false))
        assertFalse(canEditMessage(isEditing = true, isImageMessage = false, isAdmin = false))
    }

    // canDelete

    @Test
    fun adminCanDeleteMessage() {
        assertTrue(canDeleteMessage(isEditing = false, isAdmin = true))
    }

    @Test
    fun adminCannotDeleteWhileEditing() {
        assertFalse(canDeleteMessage(isEditing = true, isAdmin = true))
    }

    @Test
    fun nonAdminCannotDelete() {
        assertFalse(canDeleteMessage(isEditing = false, isAdmin = false))
        assertFalse(canDeleteMessage(isEditing = true, isAdmin = false))
    }
}
