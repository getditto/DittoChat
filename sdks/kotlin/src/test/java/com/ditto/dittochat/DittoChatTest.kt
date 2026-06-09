package com.ditto.dittochat

import androidx.test.core.app.ApplicationProvider
import com.ditto.kotlin.Ditto
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DittoChatTest {

    private fun makeChat(initialIsAdmin: Boolean): DittoChatImpl {
        val ditto = mockk<Ditto>(relaxed = true)
        val localStore = mockk<LocalData>(relaxed = true)
        val p2pStore = mockk<DittoData>(relaxed = true)
        every { p2pStore.publicRoomsFlow } returns MutableStateFlow(emptyList())
        return DittoChatImpl(
            context = ApplicationProvider.getApplicationContext(),
            ditto = ditto,
            retentionPolicy = ChatRetentionPolicy(days = 30),
            usersCollection = "users",
            userId = null,
            userEmail = null,
            isAdmin = initialIsAdmin,
            acceptLargeImages = true,
            primaryColor = null,
            localStore = localStore,
            p2pStore = p2pStore
        )
    }

    @Test
    fun setIsAdminUpdatesStateFlow() {
        val chat = makeChat(initialIsAdmin = false)
        assertEquals(false, chat.isAdmin.value)

        chat.setIsAdmin(true)
        assertEquals(true, chat.isAdmin.value)

        chat.setIsAdmin(false)
        assertEquals(false, chat.isAdmin.value)
    }
}
