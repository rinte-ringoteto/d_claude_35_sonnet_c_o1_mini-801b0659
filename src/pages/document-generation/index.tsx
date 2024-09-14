import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Topbar from '@/components/Topbar'
import supabase from '@/supabase'
import { FaSpinner } from 'react-icons/fa'

const DocumentGeneration = () => {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [documentType, setDocumentType] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
            } else {
                router.push('/login')
            }
        }
        fetchUser()
    }, [router])

    const handleGenerate = async () => {
        if (!documentType) {
            setError('ドキュメントの種類を選択してください。')
            return
        }
        setError('')
        setIsGenerating(true)
        setProgress(0)
        try {
            const { data, error } = await supabase
                .from('documents')
                .insert([{ type: documentType, created_by: user.id }])
                .select()
            if (error) throw error
            const documentId = data[0].id
            // Start generation process
            const generationResponse = await fetch('/api/document-generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documentId }),
            })
            if (!generationResponse.ok) {
                throw new Error('ドキュメント生成に失敗しました。')
            }
            // Polling for progress
            const interval = setInterval(async () => {
                const { data, error } = await supabase
                    .from('documents')
                    .select('content')
                    .eq('id', documentId)
                    .single()
                if (error) {
                    clearInterval(interval)
                    setError('進捗の取得に失敗しました。')
                    setIsGenerating(false)
                    return
                }
                if (data.content && data.content.progress) {
                    setProgress(data.content.progress)
                    if (data.content.progress >= 100) {
                        clearInterval(interval)
                        router.push(`/document-display?id=${documentId}`)
                    }
                }
            }, 1000)
        } catch (err) {
            setError(err.message)
            setIsGenerating(false)
        }
    }

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex">
                <nav className="w-64 bg-white shadow-md h-screen">
                    <ul className="mt-10">
                        <li className="mt-2">
                            <Link href="/dashboard">
                                <a className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-100">
                                    ダッシュボード
                                </a>
                            </Link>
                        </li>
                        <li className="mt-2">
                            <Link href="/file-upload">
                                <a className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-100">
                                    ファイルアップロード
                                </a>
                            </Link>
                        </li>
                        <li className="mt-2">
                            <Link href="/document-generation">
                                <a className="flex items-center px-4 py-2 text-blue-500 bg-blue-50">
                                    ドキュメント生成
                                </a>
                            </Link>
                        </li>
                        <li className="mt-2">
                            <Link href="/source-code-generation">
                                <a className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-100">
                                    ソースコード生成
                                </a>
                            </Link>
                        </li>
                        {/* 他のリンクも同様に追加 */}
                    </ul>
                </nav>
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">ドキュメント生成画面</h1>
                    {error && <div className="mb-4 text-red-500">{error}</div>}
                    <div className="bg-white p-6 rounded shadow-md">
                        <label className="block mb-4">
                            <span className="text-gray-700">生成するドキュメントの種類</span>
                            <select
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                            >
                                <option value="">選択してください</option>
                                <option value="要件定義">要件定義</option>
                                <option value="システム設計">システム設計</option>
                                <option value="開発">開発</option>
                                <option value="テスト">テスト</option>
                                <option value="提案資料">提案資料</option>
                            </select>
                        </label>
                        <button
                            onClick={handleGenerate}
                            className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <div className="flex items-center justify-center">
                                    <FaSpinner className="animate-spin mr-2" />
                                    生成中...
                                </div>
                            ) : (
                                '生成開始'
                            )}
                        </button>
                        {isGenerating && (
                            <div className="mt-6">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-blue-700">進捗: {progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div
                                        className="bg-blue-500 h-4 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default DocumentGeneration