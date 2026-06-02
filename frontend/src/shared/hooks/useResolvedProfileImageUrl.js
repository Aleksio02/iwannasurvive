import { useEffect, useState } from 'react'
import { getFileDownloadUrlByUserAndFile } from '@/shared/api/profile'

export function useResolvedProfileImageUrl(role, userId, fileId) {
    const [displayUrl, setDisplayUrl] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        let objectUrl = null
        let cancelled = false
        const directUrl = getFileDownloadUrlByUserAndFile(role, userId, fileId)

        if (!directUrl) {
            setDisplayUrl(null)
            setIsLoading(false)
            setHasError(false)
            return undefined
        }

        setIsLoading(true)
        setHasError(false)
        setDisplayUrl(null)

        async function resolveImageUrl() {
            try {
                const response = await fetch(directUrl, { credentials: 'include' })
                if (!response.ok) {
                    throw new Error(`Failed to load profile file: ${response.status}`)
                }

                const blob = await response.blob()
                if (!blob.type.startsWith('image/')) {
                    throw new Error('Profile file is not an image')
                }

                objectUrl = URL.createObjectURL(blob)
                if (!cancelled) {
                    setDisplayUrl(objectUrl)
                }
            } catch {
                if (!cancelled) {
                    setDisplayUrl(directUrl)
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void resolveImageUrl()

        return () => {
            cancelled = true
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [role, userId, fileId])

    return {
        displayUrl,
        isLoading,
        hasError,
        setIsLoading,
        setHasError,
    }
}
