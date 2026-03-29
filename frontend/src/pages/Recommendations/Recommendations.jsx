import { useEffect, useState } from 'react'
import {
    getIncomingRecommendations,
    getOutgoingRecommendations,
    deleteRecommendation
} from '../../api/recommendations'
import { useToast } from '../../hooks/use-toast'

export default function RecommendationsPage() {
    const { toast } = useToast()

    const [tab, setTab] = useState('incoming')
    const [incoming, setIncoming] = useState([])
    const [outgoing, setOutgoing] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        load()
    }, [])

    const load = async () => {
        try {
            setLoading(true)

            const [inc, out] = await Promise.all([
                getIncomingRecommendations(),
                getOutgoingRecommendations()
            ])

            setIncoming(inc || [])
            setOutgoing(out || [])

        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить рекомендации',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        await deleteRecommendation(id)

        setIncoming(prev => prev.filter(i => i.id !== id))
        setOutgoing(prev => prev.filter(i => i.id !== id))
    }

    const renderList = (list, type) => {
        if (!list.length) return <div>Пусто</div>

        return list.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: 10 }}>
                <div><b>{r.opportunityTitle}</b></div>
                <div>{r.companyName}</div>

                {type === 'incoming' && (
                    <div>От: {r.fromApplicantName}</div>
                )}

                {type === 'outgoing' && (
                    <div>Кому: {r.toApplicantName}</div>
                )}

                {r.message && <div style={{ marginTop: 8 }}>{r.message}</div>}

                <button onClick={() => handleDelete(r.id)}>
                    Удалить
                </button>
            </div>
        ))
    }

    if (loading) return <div>Загрузка...</div>

    return (
        <div>
            <h1>Рекомендации</h1>

            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setTab('incoming')}>
                    Входящие ({incoming.length})
                </button>
                <button onClick={() => setTab('outgoing')}>
                    Исходящие ({outgoing.length})
                </button>
            </div>

            <div style={{ marginTop: 20 }}>
                {tab === 'incoming' && renderList(incoming, 'incoming')}
                {tab === 'outgoing' && renderList(outgoing, 'outgoing')}
            </div>
        </div>
    )
}