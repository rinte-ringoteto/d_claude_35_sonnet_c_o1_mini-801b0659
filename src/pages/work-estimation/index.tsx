import React, { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
import supabase from '@/supabase';
import { FaProjectDiagram, FaFileAlt, FaCode, FaCheckCircle } from 'react-icons/fa';
import { useRouter } from 'next/router';

const WorkEstimation: React.FC = () => {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [isEstimating, setIsEstimating] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('id, name');
                if (error) throw error;
                setProjects(data || []);
            } catch (err) {
                console.error(err);
                // サンプルデータを設定
                setProjects([
                    { id: 'sample-project-1', name: 'サンプルプロジェクト1' },
                    { id: 'sample-project-2', name: 'サンプルプロジェクト2' },
                ]);
                setError('プロジェクトの取得に失敗しました。サンプルデータを表示しています。');
            }
        };

        fetchProjects();
    }, []);

    useEffect(() => {
        let subscription: any;

        if (isEstimating && selectedProject) {
            subscription = supabase
                .from(`work_estimates:project_id=eq.${selectedProject}`)
                .on('UPDATE', payload => {
                    const estimate = payload.new.estimate;
                    const totalHours = estimate.total_hours;
                    const breakdown = estimate.breakdown;
                    // 進捗を計算（単純な例）
                    const completedPhases = breakdown.filter((phase: any) => phase.hours > 0).length;
                    const totalPhases = breakdown.length;
                    const currentProgress = Math.min((completedPhases / totalPhases) * 100, 100);
                    setProgress(currentProgress);

                    if (currentProgress >= 100) {
                        setIsEstimating(false);
                        router.push(`/work-estimation-result?projectId=${selectedProject}`);
                    }
                })
                .subscribe();
        }

        return () => {
            if (subscription) {
                supabase.removeSubscription(subscription);
            }
        };
    }, [isEstimating, selectedProject, router]);

    const handleStartEstimation = async () => {
        if (!selectedProject) {
            setError('プロジェクトを選択してください。');
            return;
        }

        setIsEstimating(true);
        setProgress(0);
        setError('');

        try {
            const response = await fetch('/api/work-estimation/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ project_id: selectedProject }),
            });

            if (!response.ok) {
                throw new Error('見積もりの開始に失敗しました。');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || '見積もりの開始に失敗しました。');
            setIsEstimating(false);
        }
    };

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex">
                {/* サイドバーが必要な場合はここに追加 */}
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-6 text-gray-800">工数見積画面</h1>
                    {error && (
                        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}
                    <div className="bg-white p-6 rounded shadow">
                        <div className="mb-4">
                            <label htmlFor="project" className="block text-gray-700 font-medium mb-2">
                                見積対象のプロジェクトを選択
                            </label>
                            <select
                                id="project"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                            >
                                <option value="">プロジェクトを選択してください</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleStartEstimation}
                            disabled={isEstimating}
                            className={`w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white font-medium rounded hover:bg-blue-600 active:bg-blue-700 transition duration-300 ease-out ${
                                isEstimating ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {isEstimating ? (
                                <>
                                    <FaCheckCircle className="mr-2 animate-spin" />
                                    見積開始中...
                                </>
                            ) : (
                                '見積開始'
                            )}
                        </button>
                        {isEstimating && (
                            <div className="mt-6">
                                <label className="block text-gray-700 font-medium mb-2">
                                    見積進捗
                                </label>
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div
                                        className="bg-blue-500 h-4 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="mt-2 text-gray-600">{Math.round(progress)}% 完了</p>
                            </div>
                        )}
                        {!isEstimating && progress > 0 && (
                            <div className="mt-6">
                                <p className="text-green-600">見積が完了しました。</p>
                                <button
                                    onClick={() => router.push(`/work-estimation-result?projectId=${selectedProject}`)}
                                    className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white font-medium rounded hover:bg-green-600 active:bg-green-700 transition duration-300 ease-out"
                                >
                                    見積結果を見る
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default WorkEstimation;