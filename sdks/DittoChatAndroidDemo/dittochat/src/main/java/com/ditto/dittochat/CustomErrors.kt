package com.ditto.dittochat

sealed class AppError(message: String) : Exception(message) {
    class FeatureUnavailable(msg: String = "Feature not available") : AppError(msg)
    class QrCodeFail : AppError("QR code failed to generate")
    class Unknown(msg: String = "An unknown error occurred") : AppError(msg)
}

sealed class AttachmentError(message: String) : Exception(message) {
    class CreateFail : AttachmentError("Error updating attachment")
    class Deleted : AttachmentError("Attachment deleted")
    class DittoDataFail(msg: String) : AttachmentError("Attachment data fetch failed: $msg")
    class ImageDataFail : AttachmentError("Unknown error occurred initializing image")
    class MessageDocNotFound(msgId: String) : AttachmentError("No document found for message: $msgId")
    class ThumbnailCreateFail : AttachmentError("Error creating thumbnail")
    class Unknown(msg: String = "An unknown error occurred") : AttachmentError(msg)
}

enum class AttachmentType(val description: String) {
    THUMBNAIL_IMAGE("thumbnail"),
    LARGE_IMAGE("large")
}