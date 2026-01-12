package com.ditto.dittochat

import android.content.Context
import com.ditto.dittochat.ui.DittoChatUI
import com.google.gson.Gson
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import live.ditto.Ditto
import live.ditto.DittoIdentity
import live.ditto.android.DefaultAndroidDittoDependencies
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DittoChatModule {

    @Provides
    @Singleton
    internal fun provideLocalDataInterface(
        @ApplicationContext context: Context,
        gson: Gson
    ): LocalData {
        return LocalDataImpl(context, gson)
    }

    internal fun provideDittoDataInterface(
        localStore: LocalData,
        ditto: Ditto
    ): DittoData {
        return DittoDataImpl(
            privateStore = localStore,
            ditto = ditto,
            gson = Gson(),
            usersCollection = "users",
            chatRetentionPolicy = ChatRetentionPolicy(days = 30)
        )
    }

    internal fun provideDittoChat(
        localStore: LocalData,
        p2pStore: DittoData,
        dittoChatConfig: ChatConfig
    ): DittoChat {
        return DittoChatImpl(dittoChatConfig, localStore, p2pStore)
    }

    fun provideDittoChatUI(ditto: Ditto, localData: LocalData, dittoChatConfig: ChatConfig): DittoChatUI {
        return DittoChatUI(provideDittoChat(
            localData,
            provideDittoDataInterface(
                localData,
                ditto
            ),
            dittoChatConfig
        ))
    }
}
