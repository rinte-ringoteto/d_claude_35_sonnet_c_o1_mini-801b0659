import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Topbar from '@/components/Topbar'
import supabase from '@/supabase'
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa'

interface QualityCheck {
    id: string
    project_id: string
    type: string
    result: {
        score: number
        issues: Array<{
            type: string
            description: string
            severity: string
        }>
    }
    created_at: string
}

const QualityCheckResult: React.FC = () => {
    const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const fetchQualityChecks = async () => {
            const user = supabase.auth.user()
            if (!user) {
                router.push('/login')
                return
            }
            try {
                const { data, error } = await supabase
                    .from<QualityCheck>('quality_checks')
                    .select('*')
                    .eq('project_id', 'your_project_id') // 適切なプロジェクトIDに置き換えてください
                if (error) throw error
                setQualityChecks(data || [])
            } catch (err) {
                console.error(err)
                setError('データの取得に失敗しました。サンプルデータを表示します。')
                setQualityChecks([
                    {
                        id: 'sample-id',
                        project_id: 'sample-project',
                        type: 'ソースコード',
                        result: {
                            score: 85,
                            issues: [
                                {
                                    type: '警告',
                                    description: '未使用の変数があります。',
                                    severity: '中',
                                },
                            ],
                        },
                        created_at: new Date().toISOString(),
                    },
                ])
            } finally {
                setLoading(false)
            }
        }
        fetchQualityChecks()
    }, [router])

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex">
                <aside className="w-64 bg-white shadow-md">
                    <nav className="mt-10">
                        <a href="/dashboard" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary">
                            ダッシュボード
                        </a>
                        <a href="/file-upload" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary">
                            ファイルアップロード
                        </a>
                        <a href="/document-generation" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary">
                            ドキュメント生成
                        </a>
                        <a href="/source-code-generation" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary">
                            ソースコード生成
                        </a>
                        <a href="/quality-check-result" className="block py-2.5 px-4 rounded bg-primary text-white">
                            品質チェック結果
                        </a>
                        <a href="/consistency-check" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary">
                            整合性確認
                        </a>
                        <a href="/work-estimate" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary">
                            工数見積
                        </a>
                        <a href="/proposal" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary">
                            提案資料作成
                        </a>
                        <a href="/progress-report" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary">
                            進捗レポート
                        </a>
                    </nav>
                </aside>
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-6">品質チェック結果サマリー</h1>
                    {loading ? (
                        <p>読み込み中...</p>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : (
                        qualityChecks.map((check) => (
                            <div key={check.id} className="bg-white shadow-md rounded-lg p-6 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold">{check.type} チェック</h2>
                                    <span className="flex items-center">
                                        {check.result.score >= 80 ? (
                                            <FaCheckCircle className="text-green-500 mr-2" />
                                        ) : check.result.score >= 50 ? (
                                            <FaExclamationTriangle className="text-yellow-500 mr-2" />
                                        ) : (
                                            <FaTimesCircle className="text-red-500 mr-2" />
                                        )}
                                        <span>{check.result.score} 点</span>
                                    </span>
                                </div>
                                <div className="mb-4">
                                    <h3 className="text-lg font-medium mb-2">詳細結果</h3>
                                    {check.result.issues.length > 0 ? (
                                        <ul className="list-disc list-inside">
                                            {check.result.issues.map((issue, index) => (
                                                <li key={index} className="mb-1">
                                                    <span className="font-semibold">{issue.type}:</span> {issue.description} <span className="text-sm text-gray-500">({issue.severity})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>問題は見つかりませんでした。</p>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium mb-2">改善提案</h3>
                                    {check.result.issues.length > 0 ? (
                                        <ul className="list-disc list-inside">
                                            {check.result.issues.map((issue, index) => (
                                                <li key={index} className="mb-1">
                                                    {issue.description} の修正をお勧めします。
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>特に改善の必要はありません。</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div className="mt-8">
                        <h2 className="text-xl font-bold mb-4">プロジェクト概要</h2>
                        <div className="flex items-center">
                            <img src="https://placehold.co/100x100" alt="プロジェクト画像" className="w-24 h-24 mr-4 rounded" />
                            <div>
                                <p className="font-semibold">プロジェクト名: サンプルプロジェクト</p>
                                <p className="text-gray-600">説明: これはサンプルプロジェクトの説明です。</p>
                                <p className="text-gray-600">作成日時: 2023-10-01</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default QualityCheckResult