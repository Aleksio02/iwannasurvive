import { useEffect, useState } from 'react'
import { useRoute } from 'wouter'
import { httpJson } from '../../api/http'

export default function PublicProfile() {
    const [, params] = useRoute('/seekers/:id')
    const { id } = params || {}
    const [user, setUser] = useState(null)

    useEffect(() => {
        if (!id) return

        const loadUser = async () => {
            try {
                const data = await httpJson(`/api/users/${id}`)
                setUser(data)
            } catch (e) {
                console.error('Ошибка загрузки пользователя', e)
            }
        }

        loadUser()
    }, [id])

    if (!user) return <div>Загрузка...</div>

    return (
        <div>
            <h1>{user.name}</h1>
            <div>Университет: {user.university}</div>
            <div>Навыки: {user.skills?.join(', ')}</div>
            <div>О себе: {user.about}</div>
        </div>
    )
}