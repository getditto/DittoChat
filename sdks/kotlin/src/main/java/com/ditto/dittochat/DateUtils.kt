package com.ditto.dittochat

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object DateUtils {
    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    fun toISOString(date: Date): String {
        return isoFormat.format(date)
    }

    fun fromISOString(dateString: String): Date? {
        return try {
            isoFormat.parse(dateString)
        } catch (e: Exception) {
            null
        }
    }

    fun fromMillis(millis: Long): Date {
        return Date(millis)
    }

    fun toMillis(date: Date): Long {
        return date.time
    }
}