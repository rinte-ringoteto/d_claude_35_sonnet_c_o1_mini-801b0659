import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Topbar from '@/components/Topbar'
import supabase from '@/supabase'
import { FaBars, FaHome, FaUpload, FaFileAlt, FaCode, FaCheck, FaAlignLeft, FaChartLine, FaFileInvoice, FaRegChartBar } from 'react-icons/fa'

interface WorkEstimate {
    id: string
    project_id: string
    estimate: {
        total_hours: number
        breakdown: { phase: string, hours: number }[]
    }
    created_at: string
}

export default function WorkEstimationResult() {
    const [workEstimates, setWorkEstimates] = useState<WorkEstimate[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string>('')
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

    useEffect(() => {
        const fetchWorkEstimates = async () => {
            const user = supabase.auth.user()
            if (!user) {
                router.push('/login')
                return
            }
            try {
                const { data, error } = await supabase
                    .from<WorkEstimate>('work_estimates')
                    .select('*')
                    .eq('project_id', user.id)

                if (error) throw error
                setWorkEstimates(data || [])
            } catch (err) {
                console.error(err)
                setError('データの取得に失敗しました。サンプルデータを表示します。')
                setWorkEstimates([
                    {
                        id: 'sample-id',
                        project_id: 'sample-project-id',
                        estimate: {
                            total_hours: 100,
                            breakdown: [
                                { phase: '要件定義', hours: 30 },
                                { phase: '設計', hours: 20 },
                                { phase: '開発', hours: 40 },
                                { phase: 'テスト', hours: 10 }
                            ]
                        },
                        created_at: new Date().toISOString()
                    }
                ])
            } finally {
                setLoading(false)
            }
        }

        fetchWorkEstimates()
    }, [router])

    const handleAdjust = (estimateId: string) => {
        // Implement工数調整オプションのロジック
        alert(`工数調整オプションを実装してください: ${estimateId}`)
    }

    const navigation = [
        { name: 'ダッシュボード', icon: FaHome, href: '/dashboard' },
        { name: 'ファイルアップロード', icon: FaUpload, href: '/file-upload' },
        { name: 'ドキュメント生成', icon: FaFileAlt, href: '/document-generation' },
        { name: 'ソースコード生成', icon: FaCode, href: '/source-code-generation' },
        { name: '品質チェック', icon: FaCheck, href: '/quality-check' },
        { name: '整合性確認', icon: FaAlignLeft, href: '/integrity-check' },
        { name: '工数見積', icon: FaRegChartBar, href: '/work-estimation-result' },
        { name: '提案資料作成', icon: FaFileInvoice, href: '/proposal-creation' },
        { name: '進捗レポート', icon: FaChartLine, href: '/progress-report' }
    ]

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <div className="flex">
                <aside className={`fixed top-16 left-0 w-64 bg-white shadow-md h-full transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:shadow-none`}>
                    <nav className="mt-10">
                        {navigation.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className="flex items-center py-2 px-8 text-gray-700 hover:bg-blue-100"
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.name}
                            </a>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 ml-0 lg:ml-64 p-8">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">工数見積結果</h1>
                    {loading ? (
                        <p>読み込み中...</p>
                    ) : error ? (
                        <p className="text-red-500 mb-4">{error}</p>
                    ) : workEstimates.length === 0 ? (
                        <p>工数見積データがありません。</p>
                    ) : (
                        workEstimates.map((estimate) => (
                            <div key={estimate.id} className="bg-white shadow rounded-lg p-6 mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-blue-600">プロジェクトID: {estimate.project_id}</h2>
                                    <button
                                        onClick={() => handleAdjust(estimate.id)}
                                        className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 active:bg-orange-700 transition duration-300"
                                    >
                                        工数調整
                                    </button>
                                </div>
                                <div className="mb-4">
                                    <img src="https://placehold.co/600x200" alt="工数グラフ" className="w-full h-auto rounded" />
                                </div>
                                <div className="mb-4">
                                    <p className="text-lg font-medium text-gray-700">総工数: <span className="text-blue-600">{estimate.estimate.total_hours} 時間</span></p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">フェーズ別工数内訳</h3>
                                    <table className="min-w-full bg-white">
                                        <thead>
                                            <tr>
                                                <th className="py-2 px-4 border-b text-left text-gray-700">フェーズ</th>
                                                <th className="py-2 px-4 border-b text-left text-gray-700">工数 (時間)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {estimate.estimate.breakdown.map((breakdown, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="py-2 px-4 border-b text-gray-600">{breakdown.phase}</td>
                                                    <td className="py-2 px-4 border-b text-gray-600">{breakdown.hours}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </main>
            </div>
        </div>
    )
}