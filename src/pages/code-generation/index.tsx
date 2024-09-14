import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Topbar from '@/components/Topbar'
import supabase from '@/supabase'
import axios from 'axios'
import { FaFileAlt, FaCode, FaSpinner } from 'react-icons/fa'

const CodeGeneration = () => {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [documents, setDocuments] = useState([])
    const [selectedDocument, setSelectedDocument] = useState('')
    const [language, setLanguage] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState(0)
    const programmingLanguages = ['JavaScript', 'Python', 'TypeScript', 'Java', 'C#']

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) {
                router.push('/login')
            } else {
                setUser(user)
                fetchDocuments(user.id)
            }
        }

        const fetchDocuments = async (userId) => {
            const { data, error } = await supabase
                .from('documents')
                .select('id, type, content')
                .eq('created_by', userId)
            if (error) {
                console.error('ドキュメントの取得に失敗しました。サンプルデータを表示します。')
                setDocuments([
                    { id: '1', type: '要件定義', content: { title: 'サンプルドキュメント', sections: [{ heading: 'セクション1', content: '内容1' }] } },
                    { id: '2', type: 'システム設計', content: { title: '設計ドキュメント', sections: [{ heading: 'セクションA', content: '内容A' }] } },
                ])
            } else {
                setDocuments(data)
            }
        }

        fetchUser()
    }, [router])

    const handleGenerate = async () => {
        if (!selectedDocument || !language) {
            alert('ドキュメントとプログラミング言語を選択してください。')
            return
        }

        setIsGenerating(true)
        setProgress(0)

        try {
            const response = await axios.post('/api/code-generation', {
                documentId: selectedDocument,
                language: language,
            })

            if (response.status === 200) {
                const generationId = response.data.generationId
                const interval = setInterval(async () => {
                    const statusRes = await axios.get(`/api/code-generation/status/${generationId}`)
                    if (statusRes.status === 200) {
                        setProgress(statusRes.data.progress)
                        if (statusRes.data.progress >= 100) {
                            clearInterval(interval)
                            router.push(`/source-code-display?id=${response.data.sourceCodeId}`)
                        }
                    } else {
                        clearInterval(interval)
                        alert('生成ステータスの取得に失敗しました。')
                        setIsGenerating(false)
                    }
                }, 2000)
            } else {
                alert('コード生成の開始に失敗しました。')
                setIsGenerating(false)
            }
        } catch (error) {
            console.error('生成プロセスでエラーが発生しました:', error)
            alert('生成プロセス中にエラーが発生しました。サンプルデータを表示します。')
            setProgress(100)
            setIsGenerating(false)
            router.push(`/source-code-display?id=sample`)
        }
    }

    return (
        <div className="min-h-screen h-full bg-[#F8F8F8]">
            <Topbar />
            <div className="flex">
                <aside className="w-64 bg-white shadow-md">
                    <nav className="mt-10">
                        <a href="/dashboard" className="flex items-center py-2 px-8 text-gray-700 hover:bg-[#F5A623] hover:text-white">
                            <FaFileAlt className="mr-3" />
                            ダッシュボード
                        </a>
                        <a href="/file-upload" className="flex items-center py-2 px-8 text-gray-700 hover:bg-[#F5A623] hover:text-white">
                            <FaFileAlt className="mr-3" />
                            ファイルアップロード
                        </a>
                        <a href="/document-generation" className="flex items-center py-2 px-8 text-gray-700 hover:bg-[#F5A623] hover:text-white">
                            <FaFileAlt className="mr-3" />
                            ドキュメント生成
                        </a>
                        <a href="/code-generation" className="flex items-center py-2 px-8 text-gray-700 bg-[#F5A623] text-white">
                            <FaCode className="mr-3" />
                            ソースコード生成
                        </a>
                        {/* 他のナビゲーションリンクをここに追加 */}
                    </nav>
                </aside>
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-6 text-[#333333]">ソースコード生成</h1>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="document">
                                生成対象のドキュメントを選択
                            </label>
                            <select
                                id="document"
                                value={selectedDocument}
                                onChange={(e) => setSelectedDocument(e.target.value)}
                                className="w-full border-b-2 border-gray-300 focus:border-[#4A90E2] py-2 px-4 text-gray-700"
                            >
                                <option value="">ドキュメントを選択</option>
                                {documents.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.type} - {doc.content.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="language">
                                生成するプログラミング言語を選択
                            </label>
                            <select
                                id="language"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full border-b-2 border-gray-300 focus:border-[#4A90E2] py-2 px-4 text-gray-700"
                            >
                                <option value="">言語を選択</option>
                                {programmingLanguages.map((lang) => (
                                    <option key={lang} value={lang}>
                                        {lang}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-center">
                            <button
                                onClick={handleGenerate}
                                className={`bg-[#4A90E2] text-white font-medium py-2 px-6 rounded-lg hover:bg-[#3b7dc4] active:bg-[#2a5aa3] transition duration-300 ${isGenerating ? 'cursor-not-allowed' : ''}`}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <div className="flex items-center">
                                        <FaSpinner className="animate-spin mr-2" />
                                        生成中...
                                    </div>
                                ) : (
                                    '生成開始'
                                )}
                            </button>
                        </div>
                        {isGenerating && (
                            <div className="mt-6">
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    生成進捗
                                </label>
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div
                                        className="bg-[#50E3C2] h-4 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-center mt-2 text-gray-700">{progress}% 完了</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default CodeGeneration