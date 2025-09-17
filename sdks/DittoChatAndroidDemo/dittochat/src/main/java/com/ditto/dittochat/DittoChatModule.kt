package com.ditto.dittochat

import android.content.Context
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
    fun provideGson(): Gson = Gson()

    @Provides
    @Singleton
    fun provideDitto(@ApplicationContext context: Context): Ditto {
        val androidDependencies = DefaultAndroidDittoDependencies(context)
        val identity = DittoIdentity.OnlinePlayground(
            dependencies = androidDependencies,
            appId = "",
            token = ""
        )
        val ditto = Ditto(androidDependencies, identity)
        ditto.transportConfig.connect.websocketUrls = mutableSetOf("wss://i83inp.cloud.dittolive.app/3f40f790-a871-4dcc-9701-f5c2193d52ff")
        return ditto
    }

    @Provides
    @Singleton
    fun provideLocalDataInterface(
        @ApplicationContext context: Context,
        gson: Gson
    ): LocalData {
        return LocalService(context, gson)
    }

    @Provides
    @Singleton
    fun provideDittoDataInterface(
        localStore: LocalData,
        ditto: Ditto,
        gson: Gson
    ): DittoData {
        return DittoDataImpl(
            privateStore = localStore,
            ditto = ditto,
            gson = gson,
            usersCollection = "users",
            chatRetentionPolicy = ChatRetentionPolicy(days = 30)
        )
    }

    @Provides
    @Singleton
    fun provideDittoChat(
        localStore: LocalData,
        p2pStore: DittoData
    ): DittoChat {
        return DittoChatImpl(localStore, p2pStore)
    }
}