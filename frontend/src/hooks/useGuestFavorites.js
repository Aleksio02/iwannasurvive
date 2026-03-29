import { useState } from 'react'

const KEY = 'guest_favorites'

export default function useGuestFavorites() {
    const [favorites, setFavorites] = useState(() => {
        return JSON.parse(localStorage.getItem(KEY) || '[]')
    })

    const toggle = (id) => {
        let updated

        if (favorites.includes(id)) {
            updated = favorites.filter(f => f !== id)
        } else {
            updated = [...favorites, id]
        }

        setFavorites(updated)
        localStorage.setItem(KEY, JSON.stringify(updated))
    }

    return { favorites, toggle }
}