import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { AiFillProject, AiFillSetting, AiOutlineLoading3Quarters } from 'react-icons/ai'
import Topbar from '@/components/Topbar'
import supabase from '@/supabase'

const ProgressReport: React.FC = () => {
    const router = useRouter()
    const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
    const [selectedProject, setSelectedProject] = useState<string>('')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const [reportId, setReportId] = useState<string>('')

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase.from('projects').select('id, name')
            if (error) {
                console.error('プロジェクトの取得に失敗しました:', error)
                setProjects([
                    { id: 'sample1', name: 'サンプルプロジェクト1' },
                    { id: 'sample2', name: 'サンプルプロジェクト2' },
                ])
            } else {
                setProjects(data)
            }
        }
        fetchProjects()
    }, [])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isGenerating && reportId) {
            interval = setInterval(async () => {
                const { data, error } = await supabase
                    .from('progress_reports')
                    .select('report')
                    .eq('id', reportId)
                    .single()
                if (error) {
                    console.error('進捗の取得に失敗しました:', error)
                    setProgress(0)
                    clearInterval(interval)
                } else {
                    const currentProgress = data.report.overall_progress
                    setProgress(currentProgress)
                    if (currentProgress >= 100) {
                        clearInterval(interval)
                        router.push('/progress-report-display')
                    }
                }
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isGenerating, reportId, router])

    const handleGenerate = async () => {
        if (!selectedProject || !startDate || !endDate) {
            alert('すべてのフィールドを入力してください。')
            return
        }
        setIsGenerating(true)
        const { data, error } = await supabase.from('progress_reports').insert([
            {
                project_id: selectedProject,
                report: {
                    overall_progress: 0,
                    phases: [],
                },
            },
        ]).select('id')
        if (error) {
            console.error('レポートの作成に失敗しました:', error)
            alert('レポートの作成に失敗しました。サンプルデータを表示します。')
            setProgress(100)
            setIsGenerating(false)
            router.push('/progress-report-display')
        } else {
            setReportId(data[0].id)
        }
    }

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex">
                <aside className="w-64 bg-white shadow-md">
                    <nav className="mt-10">
                        <Link href="/dashboard">
                            <a className="flex items-center py-2 px-8 text-gray-700 hover:bg-gray-200">
                                <AiFillProject className="mr-3" />
                                ダッシュボード
                            </a>
                        </Link>
                        <Link href="/file-upload">
                            <a className="flex items-center py-2 px-8 text-gray-700 hover:bg-gray-200">
                                <AiFillSetting className="mr-3" />
                                ファイルアップロード画面
                            </a>
                        </Link>
                        <Link href="/progress-report">
                            <a className="flex items-center py-2 px-8 text-gray-700 bg-gray-200">
                                <AiFillProject className="mr-3" />
                                進捗レポート画面
                            </a>
                        </Link>
                        {/* 他のナビゲーションリンクを追加 */}
                    </nav>
                </aside>
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-6">進捗レポート生成</h1>
                    <div className="bg-white p-6 rounded shadow-md">
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-medium mb-2">レポート対象プロジェクト</label>
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="w-full border-b-2 border-blue-500 py-2 px-4 focus:outline-none"
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
                            <label className="block text-gray-700 text-sm font-medium mb-2">レポート期間設定</label>
                            <div className="flex space-x-4">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-1/2 border-b-2 border-blue-500 py-2 px-4 focus:outline-none"
                                />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-1/2 border-b-2 border-blue-500 py-2 px-4 focus:outline-none"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleGenerate}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 active:bg-blue-700 transition duration-300"
                            disabled={isGenerating}
                        >
                            生成開始
                        </button>
                        {isGenerating && (
                            <div className="mt-6 flex items-center">
                                <AiOutlineLoading3Quarters className="animate-spin mr-3 text-blue-500" size={24} />
                                <span className="text-gray-700">レポートを生成中...</span>
                            </div>
                        )}
                        {isGenerating && (
                            <div className="mt-4">
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div
                                        className="bg-blue-500 h-4 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-gray-700 mt-2">{progress}% 完了</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default ProgressReport