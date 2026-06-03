package ru.itplanet.trampline.opportunity.ai.service

import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.springframework.stereotype.Component

@Component
class PdfResumeTextExtractor {
    fun extractText(bytes: ByteArray): String {
        return Loader.loadPDF(bytes).use { document ->
            PDFTextStripper().getText(document)
        }
            .trim()
            .replace(WHITESPACE_REGEX, " ")
    }

    private companion object {
        val WHITESPACE_REGEX = Regex("\\s+")
    }
}
