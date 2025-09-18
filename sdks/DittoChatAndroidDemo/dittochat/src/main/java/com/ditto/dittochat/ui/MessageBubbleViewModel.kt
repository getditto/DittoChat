package com.ditto.dittochat.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.*
import android.net.Uri
import com.ditto.dittochat.DittoData
import com.ditto.dittochat.Message
import live.ditto.DittoAttachmentFetchEvent
import live.ditto.DittoStore


class MessageBubbleViewModel(
    private val message: Message,
    private val messagesId: String,
    private val dittoData: DittoData
) : ViewModel() {

    private val _thumbnailImage = MutableStateFlow<Bitmap?>(null)
    val thumbnailImage: StateFlow<Bitmap?> = _thumbnailImage.asStateFlow()

    private val _thumbnailProgress = MutableStateFlow(0.0)
    val thumbnailProgress: StateFlow<Double> = _thumbnailProgress.asStateFlow()

    private val _fetchProgress = MutableStateFlow(0.0)
    val fetchProgress: StateFlow<Double> = _fetchProgress.asStateFlow()

    private val _fileUri = MutableStateFlow<Uri?>(null)
    val fileUri: StateFlow<Uri?> = _fileUri.asStateFlow()

    fun fetchThumbnail() {
        viewModelScope.launch {
            message.thumbnailImageToken?.let { token ->
                try {
                    dittoData.ditto.store.fetchAttachment(
                        tokenMap = token,
                        onFetchEvent = { event ->
                            when (event) {
                                is DittoAttachmentFetchEvent.Progress -> {
                                    val progress = event.downloadedBytes.toDouble() /
                                            event.totalBytes.toDouble()
                                    _thumbnailProgress.value = progress
                                }
                                is DittoAttachmentFetchEvent.Completed -> {
                                    val data = event.attachment.getData()
                                    val bitmap = BitmapFactory.decodeByteArray(
                                        data, 0, data.size
                                    )
                                    _thumbnailImage.value = bitmap
                                }
                                else -> {}
                            }
                        }
                    )
                } catch (e: Exception) {
                    // Handle error
                }
            }
        }
    }

    fun fetchLargeImage() {
        viewModelScope.launch {
            message.largeImageToken?.let { token ->
                try {
                    dittoData.ditto.store.fetchAttachment(
                        tokenMap = token,
                        onFetchEvent = { event ->
                            when (event) {
                                is DittoAttachmentFetchEvent.Progress -> {
                                    val progress = event.downloadedBytes.toDouble() /
                                            event.totalBytes.toDouble()
                                    _fetchProgress.value = progress
                                }
                                is DittoAttachmentFetchEvent.Completed -> {
                                    // Save to temp file and create URI
                                    // Implementation would save file and update _fileUri
                                }
                                else -> {}
                            }
                        }
                    )
                } catch (e: Exception) {
                    // Handle error
                }
            }
        }
    }
}