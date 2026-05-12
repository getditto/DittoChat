package com.ditto.dittochat.ui

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.ditto.dittochat.ChatUser
import com.ditto.dittochat.Message
import com.ditto.dittochat.MessageWithUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MessageBubbleComposeTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun makeMessageWithUser(isImage: Boolean = false): MessageWithUser {
        val message = Message(
            id = "msg-1",
            createdOn = "2026-01-01T00:00:00Z",
            roomId = "room-1",
            text = "hello",
            userId = "user-1",
            thumbnailImageToken = if (isImage) mapOf("k" to "v") else null
        )
        val user = ChatUser(id = "user-1", name = "Alice")
        return MessageWithUser(message, user)
    }

    private fun setMessageBubble(isAdmin: StateFlow<Boolean>) {
        composeTestRule.setContent {
            MessageBubble(
                messageWithUser = makeMessageWithUser(),
                currentUserId = "user-1",
                onEditClick = {},
                onDeleteClick = {},
                onImageClick = {},
                isAdmin = isAdmin
            )
        }
        // Open the dropdown menu by clicking the message bubble surface.
        composeTestRule.onNodeWithText("hello").performClick()
    }

    @Test
    fun editButtonHiddenForNonAdmin() {
        setMessageBubble(MutableStateFlow(false))
        composeTestRule.onNodeWithText("Edit").assertDoesNotExist()
    }

    @Test
    fun editButtonVisibleForAdminTextMessage() {
        setMessageBubble(MutableStateFlow(true))
        composeTestRule.onNodeWithText("Edit").assertExists()
    }

    @Test
    fun deleteButtonHiddenForNonAdmin() {
        setMessageBubble(MutableStateFlow(false))
        composeTestRule.onNodeWithText("Delete").assertDoesNotExist()
    }

    @Test
    fun deleteButtonVisibleForAdmin() {
        setMessageBubble(MutableStateFlow(true))
        composeTestRule.onNodeWithText("Delete").assertExists()
    }

    @Test
    fun buttonsRecomposeOnIsAdminChange() {
        val flow = MutableStateFlow(false)
        composeTestRule.setContent {
            MessageBubble(
                messageWithUser = makeMessageWithUser(),
                currentUserId = "user-1",
                onEditClick = {},
                onDeleteClick = {},
                onImageClick = {},
                isAdmin = flow
            )
        }
        composeTestRule.onNodeWithText("hello").performClick()

        composeTestRule.onNodeWithText("Edit").assertDoesNotExist()
        composeTestRule.onNodeWithText("Delete").assertDoesNotExist()

        flow.value = true
        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Edit").assertExists()
        composeTestRule.onNodeWithText("Delete").assertExists()
    }
}
