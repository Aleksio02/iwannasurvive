package ru.itplanet.trampline.auth.model

import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.JsonDeserializer
import com.fasterxml.jackson.databind.JsonSerializer
import com.fasterxml.jackson.databind.SerializerProvider
import com.fasterxml.jackson.databind.annotation.JsonDeserialize
import com.fasterxml.jackson.databind.annotation.JsonSerialize
import java.io.IOException
import java.time.Instant
import java.util.*

class TokenPayload @JvmOverloads constructor(
    val userId: UUID,
    @field:JsonDeserialize(
        using = CustomInstantDeserializer::class
    ) @field:JsonSerialize(using = CustomInstantSerializer::class)
    val created: Instant = Instant.now(),
    @field:JsonDeserialize(
        using = CustomInstantDeserializer::class
    ) @field:JsonSerialize(using = CustomInstantSerializer::class)
    var expires: Instant = Instant.now()
        .plusSeconds(3600)
) {
    internal class CustomInstantSerializer : JsonSerializer<Instant>() {
        @Throws(IOException::class)
        override fun serialize(
            value: Instant,
            gen: JsonGenerator,
            serializers: SerializerProvider
        ) {
            gen.writeString(value.toString())
        }
    }

    internal class CustomInstantDeserializer : JsonDeserializer<Instant>() {
        @Throws(IOException::class)
        override fun deserialize(p: JsonParser, ctxt: DeserializationContext): Instant {
            return Instant.parse(p.valueAsString)
        }
    }
}