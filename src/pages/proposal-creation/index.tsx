import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Topbar from '@/components/Topbar'
import supabase from '@/supabase'
import { FaProjectDiagram, FaFileAlt, FaPlay, FaSpinner } from 'react-icons/fa'

const ProposalCreation: React.FC = () => {
    const router = useRouter()
    const [projects, setProjects] = useState<any[]>([])
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedProject, setSelectedProject] = useState<string>('')
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')
    const [isCreating, setIsCreating] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const [error, setError] = useState<string>('')

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('id, name')
            if (error) {
                console.error(error)
                setError('プロジェクトの取得に失敗しました。')
                // サンプルデータを設定
                setProjects([
                    { id: '1', name: 'プロジェクトA' },
                    { id: '2', name: 'プロジェクトB' }
                ])
            } else {
                setProjects(data)
            }
        }

        const fetchTemplates = async () => {
            // テンプレートは固定と仮定し、サンプルデータを使用
            setTemplates([
                { id: 'template1', name: 'テンプレート1' },
                { id: 'template2', name: 'テンプレート2' }
            ])
        }

        fetchProjects()
        fetchTemplates()
    }, [])

    const startCreation = async () => {
        if (!selectedProject || !selectedTemplate) {
            setError('プロジェクトとテンプレートを選択してください。')
            return
        }

        setIsCreating(true)
        setError('')
        setProgress(0)

        try {
            const { data, error } = await supabase
                .from('creation_jobs')
                .insert([
                    { project_id: selectedProject, template_id: selectedTemplate }
                ])
                .single()

            if (error) {
                throw error
            }

            const jobId = data.id

            const interval = setInterval(async () => {
                const { data: jobData, error: jobError } = await supabase
                    .from('creation_jobs')
                    .select('status, progress')
                    .eq('id', jobId)
                    .single()

                if (jobError) {
                    console.error(jobError)
                    setError('進捗の取得に失敗しました。')
                    setIsCreating(false)
                    clearInterval(interval)
                    return
                }

                setProgress(jobData.progress)

                if (jobData.status === 'completed') {
                    setIsCreating(false)
                    clearInterval(interval)
                    router.push('/proposal-display')
                } else if (jobData.status === 'failed') {
                    setError('資料作成に失敗しました。')
                    setIsCreating(false)
                    clearInterval(interval)
                }
            }, 1000)
        } catch (err) {
            console.error(err)
            setError('資料作成の開始に失敗しました。')
            setIsCreating(false)
        }
    }

    return (
        <div className="min-h-screen h-full bg-gray-100 flex">
            {/* サイドバー */}
            <aside className="w-64 bg-white shadow-md">
                <div className="p-4">
                    <img src="https://placehold.co/150x50" alt="ロゴ" className="mb-4" />
                    <nav className="space-y-2">
                        <a href="/dashboard" className="flex items-center p-2 text-gray-700 hover:bg-blue-100 rounded">
                            <FaProjectDiagram className="mr-3" />
                            ダッシュボード
                        </a>
                        <a href="/file-upload" className="flex items-center p-2 text-gray-700 hover:bg-blue-100 rounded">
                            <FaFileAlt className="mr-3" />
                            ファイルアップロード
                        </a>
                        <a href="/proposal-creation" className="flex items-center p-2 text-blue-500 bg-blue-50 rounded">
                            <FaPlay className="mr-3" />
                            提案資料作成
                        </a>
                        {/* 他のナビゲーションリンクを追加 */}
                    </nav>
                </div>
            </aside>

            {/* メインコンテンツ */}
            <div className="flex-1 flex flex-col">
                <Topbar />

                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">提案資料作成画面</h1>

                    {error && (
                        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <div className="bg-white p-6 rounded shadow-md">
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">資料作成対象プロジェクト</label>
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="w-full border-b-2 border-gray-300 focus:border-blue-500 px-2 py-1"
                            >
                                <option value="">プロジェクトを選択</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">使用するテンプレート</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="w-full border-b-2 border-gray-300 focus:border-blue-500 px-2 py-1"
                            >
                                <option value="">テンプレートを選択</option>
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center">
                            <button
                                onClick={startCreation}
                                className={`flex items-center justify-center px-4 py-2 bg-blue-500 text-white font-medium rounded hover:bg-blue-600 active:bg-blue-700 transition duration-300 ${
                                    isCreating ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <>
                                        <FaSpinner className="animate-spin mr-2" />
                                        作成中...
                                    </>
                                ) : (
                                    '作成開始'
                                )}
                            </button>
                        </div>

                        {isCreating && (
                            <div className="mt-6">
                                <label className="block text-gray-700 font-medium mb-2">作成進捗</label>
                                <div className="w-full bg-gray-200 rounded">
                                    <div
                                        className="bg-blue-500 text-xs leading-none py-1 text-center text-white rounded"
                                        style={{ width: `${progress}%` }}
                                    >
                                        {progress}%
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-center">
                        <img src="https://placehold.co/600x400" alt="提案資料作成イメージ" className="rounded shadow-md" />
                    </div>
                </main>
            </div>
        </div>
    )
}

export default ProposalCreation