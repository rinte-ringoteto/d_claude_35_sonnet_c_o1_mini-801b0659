import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import supabase from '@/supabase';
import { useRouter } from 'next/router';
import { FaPlus, FaFileUpload, FaFileAlt, FaCode, FaCheck, FaCogs, FaEstimate, FaReport } from 'react-icons/fa';

interface Project {
    id: string;
    name: string;
    description: string;
    created_by: string;
    created_at: string;
}

const Dashboard: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
            }
        };
        checkAuth();
    }, [router]);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*');
                if (error) {
                    throw error;
                }
                setProjects(data as Project[]);
            } catch (error) {
                console.error('プロジェクトの取得に失敗しました:', error);
                setProjects([
                    {
                        id: 'sample-uuid-1',
                        name: 'サンプルプロジェクト1',
                        description: 'これはサンプルプロジェクトの説明です。',
                        created_by: 'sample-uuid-user',
                        created_at: new Date().toISOString(),
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const handleCreateProject = async () => {
        const projectName = prompt('新しいプロジェクト名を入力してください');
        if (!projectName) return;

        try {
            const user = supabase.auth.user();
            const { data, error } = await supabase
                .from('projects')
                .insert([
                    {
                        name: projectName,
                        description: '',
                        created_by: user?.id,
                    },
                ])
                .select('*')
                .single();
            if (error) {
                throw error;
            }
            setProjects([...projects, data as Project]);
        } catch (error) {
            console.error('プロジェクトの作成に失敗しました:', error);
            alert('プロジェクトの作成に失敗しました。もう一度お試しください。');
        }
    };

    const quickLinks = [
        { name: 'ファイルアップロード', icon: <FaFileUpload />, url: '/file-upload' },
        { name: 'ドキュメント生成', icon: <FaFileAlt />, url: '/document-generation' },
        { name: 'ソースコード生成', icon: <FaCode />, url: '/source-code-generation' },
        { name: '品質チェック', icon: <FaCheck />, url: '/quality-check' },
        { name: '整合性確認', icon: <FaCogs />, url: '/consistency-check' },
        { name: '工数見積', icon: <FaEstimate />, url: '/work-estimate' },
        { name: '進捗レポート', icon: <FaReport />, url: '/progress-report' },
    ];

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="container mx-auto p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
                    <button
                        onClick={handleCreateProject}
                        className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 active:bg-blue-700 transition duration-300 ease-out"
                    >
                        <FaPlus className="mr-2" />
                        新規プロジェクト作成
                    </button>
                </div>
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">プロジェクト一覧</h2>
                    {loading ? (
                        <p>読み込み中...</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="bg-white p-4 rounded-lg shadow hover:shadow-md transition duration-300 ease-out cursor-pointer"
                                    onClick={() => router.push(`/projects/${project.id}`)}
                                >
                                    <img src="https://placehold.co/600x400" alt="プロジェクト画像" className="w-full h-32 object-cover rounded-md mb-4" />
                                    <h3 className="text-lg font-bold text-gray-800">{project.name}</h3>
                                    <p className="text-gray-600">{project.description || '説明がありません。'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">各機能へのクイックアクセス</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {quickLinks.map((link) => (
                            <button
                                key={link.name}
                                onClick={() => router.push(link.url)}
                                className="flex flex-col items-center justify-center bg-white p-4 rounded-lg shadow hover:shadow-md transition duration-300 ease-out"
                            >
                                <div className="text-blue-500 text-3xl mb-2">{link.icon}</div>
                                <span className="text-gray-700">{link.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;