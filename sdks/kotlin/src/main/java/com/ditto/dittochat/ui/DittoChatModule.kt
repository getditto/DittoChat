package com.ditto.dittochat.ui

import android.content.Context
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.DittoChatImpl
import com.ditto.dittochat.LocalData
import com.ditto.dittochat.LocalDataImpl
import com.google.gson.Gson
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import live.ditto.Ditto
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
internal object DittoChatModule {

    @Provides
    @Singleton
    fun provideDittoChatBuilder(
        localStore: LocalData
    ): DittoChatImpl.Builder {
        return DittoChatImpl.Builder(localStore)
    }

    @Provides
    @Singleton
    fun provideLocalData(
        @ApplicationContext context: Context
    ): LocalData {
        return LocalDataImpl(
            context,
            Gson()
        )
    }
}
