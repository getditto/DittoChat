package com.ditto.dittochat

import android.content.Context
import io.mockk.mockk
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BuilderTest {
    private fun newBuilder(): DittoChatImpl.Builder {
        val localStore = mockk<LocalData>(relaxed = true)
        val context = mockk<Context>(relaxed = true)
        return DittoChatImpl.Builder(localStore, context)
    }

    @Test
    fun isAdminDefaultsToFalse() {
        assertFalse(newBuilder().isAdmin)
    }

    @Test
    fun setIsAdminTrue() {
        val builder = newBuilder()
        builder.setIsAdmin(true)
        assertTrue(builder.isAdmin)
    }
}
