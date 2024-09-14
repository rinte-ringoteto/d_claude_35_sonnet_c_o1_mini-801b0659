import { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Topbar from '@/components/Topbar'
import { createClient } from '@supabase/supabase-js'
import { FaEdit, FaDownload } from 'react-icons/fa'

const supabase = createClient('https://your-supabase-url.supabase.co', 'your-anon-key')

interface Document {
    id: string
    project_id: string
    type: string
    content: {
        title: string
        sections: { heading: string, content: string }[]
    }
    created_at: string
    updated_at: string
}

const DocumentView: NextPage = () => {
    const router = useRouter()
    const [document, setDocument] = useState<Document | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchDocument = async () => {
            const user = supabase.auth.user()
            if (!user) {
                router.push('/login')
                return
            }

            try {
                const { data, error } = await supabase
                    .from<Document>('documents')
                    .select('*')
                    .single()

                if (error) throw error

                setDocument(data)
            } catch (err: any) {
                setError('ドキュメントの取得に失敗しました。サンプルデータを表示します。')
                setDocument({
                    id: 'sample-id',
                    project_id: 'sample-project-id',
                    type: '要件定義',
                    content: {
                        title: 'サンプルドキュメント',
                        sections: [
                            { heading: 'セクション1', content: 'セクション1の内容' },
                            { heading: 'セクション2', content: 'セクション2の内容' },
                        ],
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
            } finally {
                setLoading(false)
            }
        }

        fetchDocument()
    }, [router])

    const handleDownload = () => {
        if (!document) return
        const blob = new Blob([JSON.stringify(document.content, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${document.content.title}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) {
        return (
            <div className="min-h-screen h-full bg-gray-100">
                <Topbar />
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">読み込み中...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="container mx-auto p-4">
                {error && (
                    <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}
                <div className="bg-white shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold mb-4 text-gray-800">{document?.content.title || 'タイトル未定'}</h1>
                    {document?.content.sections.map((section, index) => (
                        <div key={index} className="mb-4">
                            <h2 className="text-xl font-semibold text-gray-700">{section.heading}</h2>
                            <p className="text-gray-600">{section.content}</p>
                        </div>
                    ))}
                    <div className="flex space-x-4 mt-6">
                        <Link href="/document-edit">
                            <a className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700 transition ease-out duration-300">
                                <FaEdit className="mr-2" />
                                編集
                            </a>
                        </Link>
                        <button
                            onClick={handleDownload}
                            className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 active:bg-green-700 transition ease-out duration-300"
                        >
                            <FaDownload className="mr-2" />
                            ダウンロード
                        </button>
                    </div>
                </div>
                <div className="mt-6">
                    <img src="https://placehold.co/600x400" alt="ドキュメントイメージ" className="w-full h-auto rounded" />
                </div>
            </div>
        </div>
    )
}

export default DocumentView