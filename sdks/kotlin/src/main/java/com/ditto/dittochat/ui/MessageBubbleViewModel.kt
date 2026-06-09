package com.ditto.dittochat.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import android.net.Uri
import com.ditto.dittochat.DittoData
import com.ditto.dittochat.Message
import com.ditto.kotlin.DittoAttachmentFetchResult


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
                    val result = dittoData.ditto.store.fetchAttachment(
                        tokenMap = token,
                        onFetchProgress = {downloadedBytes, totalBytes -> _thumbnailProgress.value = downloadedBytes.toDouble() / totalBytes.toDouble()}
                    )

                    when (result) {
                        is DittoAttachmentFetchResult.Completed -> {
                            val data = result.attachment.getData()
                            val bitmap = BitmapFactory.decodeByteArray(data, 0, data.size)
                            _thumbnailImage.value = bitmap
                            _thumbnailProgress.value = 1.0
                        }
                        else -> {}
                    }
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
                    val result = dittoData.ditto.store.fetchAttachment(
                        tokenMap = token,
                        onFetchProgress = {downloadedBytes, totalBytes -> _fetchProgress.value = downloadedBytes.toDouble() / totalBytes.toDouble()}
                    )

                    when (result) {
                        is DittoAttachmentFetchResult.Completed -> {
                            _fetchProgress.value = 1.0
                            // Save to temp file and create URI
                            // Implementation would save file and update _fileUri
                        }
                        else -> {}
                    }
                } catch (e: Exception) {
                    // Handle error
                }
            }
        }
    }
}