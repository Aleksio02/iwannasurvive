import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { useLocation } from 'wouter'
import {
    getContacts,
    acceptContactRequest,
    declineContactRequest,
    removeContact
} from '../../api/interaction.js'

export default function Contacts() {
    const [, navigate] = useLocation()
    const { toast } = useToast()

    const [contacts, setContacts] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('incoming')
    const [processingIds, setProcessingIds] = useState(new Set())
    const currentUserId = Number(localStorage.getItem('userId'))

    useEffect(() => {
        const loadContacts = async () => {
            try {
                setLoading(true)
                const data = await getContacts()
                setContacts(data || [])
            } catch (e) {
                toast({
                    title: 'Ошибка',
                    description: 'Не удалось загрузить контакты',
                    variant: 'destructive'
                })
            } finally {
                setLoading(false)
            }
        }

        loadContacts()
    }, [])

    const { incoming, outgoing, accepted } = useMemo(() => {
        const incoming = contacts.filter(
            c => c.status === 'PENDING' && c.contactUserId !== currentUserId
        )
        const outgoing = contacts.filter(
            c => c.status === 'PENDING' && c.contactUserId === currentUserId
        )
        const accepted = contacts.filter(c => c.status === 'ACCEPTED')
        return { incoming, outgoing, accepted }
    }, [contacts, currentUserId])

    const setProcessing = (id, value) => {
        setProcessingIds(prev => {
            const next = new Set(prev)
            value ? next.add(id) : next.delete(id)
            return next
        })
    }

    const updateLocal = (id, updater) => {
        setContacts(prev =>
            prev.map(c => (c.contactUserId === id ? updater(c) : c))
        )
    }

    const removeLocal = id => {
        setContacts(prev => prev.filter(c => c.contactUserId !== id))
    }

    const handleAction = async (type, id) => {
        try {
            setProcessing(id, true)
            if (type === 'accept') {
                await acceptContactRequest(id)
                updateLocal(id, c => ({ ...c, status: 'ACCEPTED' }))
                toast({ title: 'Готово', description: 'Контакт принят' })
            }
            if (type === 'decline') {
                await declineContactRequest(id)
                removeLocal(id)
                toast({ title: 'Отклонено', description: 'Запрос отклонён' })
            }
            if (type === 'remove') {
                await removeContact(id)
                removeLocal(id)
                toast({ title: 'Удалено', description: 'Контакт удалён' })
            }
        } catch (e) {
            toast({ title: 'Ошибка', description: 'Операция не удалась', variant: 'destructive' })
        } finally {
            setProcessing(id, false)
        }
    }

    const renderEmpty = text => (
        <div style={{ opacity: 0.6, padding: 20 }}>{text}</div>
    )

    const renderList = (list, type) => {
        if (!list.length) {
            if (type === 'incoming') return renderEmpty('Нет входящих запросов')
            if (type === 'outgoing') return renderEmpty('Нет исходящих запросов')
            return renderEmpty('Нет контактов')
        }

        return list.map(c => {
            const loading = processingIds.has(c.contactUserId)
            return (
                <div key={c.contactUserId} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ marginBottom: 8 }}>
                        <span
                            style={{cursor: 'pointer', fontWeight: 'bold', color: '#007bff'}}
                            onClick={() => navigate(`/seekers/${c.contactUserId}`)}
                        >
                            {c.contactName || 'Пользователь'}
                        </span>
                    </div>

                    {type === 'incoming' && (
                        <div style={{display: 'flex', gap: 8}}>
                            <button disabled={loading} onClick={() => handleAction('accept', c.contactUserId)}>
                                Принять
                            </button>
                            <button disabled={loading} onClick={() => handleAction('decline', c.contactUserId)}>
                                Отклонить
                            </button>
                        </div>
                    )}

                    {type === 'outgoing' && (
                        <button disabled={loading} onClick={() => handleAction('remove', c.contactUserId)}>
                            Отменить запрос
                        </button>
                    )}

                    {type === 'accepted' && (
                        <button disabled={loading} onClick={() => handleAction('remove', c.contactUserId)}>
                            Удалить из контактов
                        </button>
                    )}
                </div>
            )
        })
    }

    if (loading) return <div>Загрузка...</div>

    return (
        <div>
            <h1>Контакты</h1>

            {/* Таб переключения */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                    onClick={() => setTab('incoming')}
                    style={{ fontWeight: tab === 'incoming' ? 'bold' : 'normal' }}
                >
                    Входящие ({incoming.length})
                </button>
                <button
                    onClick={() => setTab('outgoing')}
                    style={{ fontWeight: tab === 'outgoing' ? 'bold' : 'normal' }}
                >
                    Исходящие ({outgoing.length})
                </button>
                <button
                    onClick={() => setTab('accepted')}
                    style={{ fontWeight: tab === 'accepted' ? 'bold' : 'normal' }}
                >
                    Контакты ({accepted.length})
                </button>
            </div>

            <div>{tab === 'incoming' && renderList(incoming, 'incoming')}</div>
            <div>{tab === 'outgoing' && renderList(outgoing, 'outgoing')}</div>
            <div>{tab === 'accepted' && renderList(accepted, 'accepted')}</div>
        </div>
    )
}