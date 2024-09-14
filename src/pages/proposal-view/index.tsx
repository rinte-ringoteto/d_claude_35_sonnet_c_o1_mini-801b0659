import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Topbar from '@/components/Topbar';
import { supabase } from '@/supabase';
import { FaEdit, FaDownload } from 'react-icons/fa';
import Link from 'next/link';

interface Document {
    id: string;
    project_id: string;
    type: string;
    content: {
        title: string;
        sections: {
            heading: string;
            content: string;
        }[];
    };
    created_at: string;
    updated_at: string;
}

const ProposalView = () => {
    const [document, setDocument] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchDocument = async () => {
            const user = supabase.auth.user();
            if (!user) {
                router.push('/login');
                return;
            }
            try {
                const { data, error } = await supabase
                    .from<Document>('documents')
                    .select('*')
                    .eq('type', '提案資料')
                    .single();
                if (error || !data) {
                    throw error;
                }
                setDocument(data);
            } catch (err) {
                setError(true);
                setDocument({
                    id: 'sample-id',
                    project_id: 'sample-project-id',
                    type: '提案資料',
                    content: {
                        title: 'サンプル提案タイトル',
                        sections: [
                            {
                                heading: 'セクション1',
                                content: 'ここにセクション1の内容が入ります。',
                            },
                            {
                                heading: 'セクション2',
                                content: 'ここにセクション2の内容が入ります。',
                            },
                        ],
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            } finally {
                setLoading(false);
            }
        };
        fetchDocument();
    }, [router]);

    const handleExport = () => {
        if (document) {
            const element = document.createElement("a");
            const file = new Blob([JSON.stringify(document.content, null, 2)], { type: 'application/json' });
            element.href = URL.createObjectURL(file);
            element.download = `${document.content.title}.json`;
            document.body.appendChild(element);
            element.click();
        }
    };

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex">
                <nav className="w-64 bg-white shadow-md">
                    <ul className="mt-4">
                        <li className="px-4 py-2 hover:bg-gray-200">
                            <Link href="/dashboard">
                                <a>ダッシュボード</a>
                            </Link>
                        </li>
                        <li className="px-4 py-2 hover:bg-gray-200">
                            <Link href="/file-upload">
                                <a>ファイルアップロード</a>
                            </Link>
                        </li>
                        <li className="px-4 py-2 hover:bg-gray-200">
                            <Link href="/proposal-view">
                                <a>提案資料表示</a>
                            </Link>
                        </li>
                    </ul>
                </nav>
                <main className="flex-1 p-8">
                    {loading ? (
                        <div className="flex justify-center items-center">
                            <img src="https://placehold.co/100x100" alt="ローディング中" />
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <h1 className="text-2xl font-bold text-gray-800 mb-4">{document?.content.title || 'タイトル未設定'}</h1>
                            {document?.content.sections.map((section, index) => (
                                <div key={index} className="mb-4">
                                    <h2 className="text-xl font-semibold text-gray-700">{section.heading}</h2>
                                    <p className="text-gray-600">{section.content}</p>
                                </div>
                            ))}
                            <div className="flex space-x-4 mt-6">
                                <button
                                    onClick={() => router.push('/proposal-edit')}
                                    className="flex items-center px-4 py-2 bg-[#4A90E2] text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition ease-out duration-300"
                                >
                                    <FaEdit className="mr-2" />
                                    編集
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="flex items-center px-4 py-2 bg-[#50E3C2] text-white rounded-lg hover:bg-teal-600 active:bg-teal-700 transition ease-out duration-300"
                                >
                                    <FaDownload className="mr-2" />
                                    エクスポート
                                </button>
                            </div>
                            {error && (
                                <div className="mt-4 p-4 bg-yellow-100 text-yellow-700 rounded">
                                    データの取得に失敗しました。サンプルデータを表示しています。
                                </div>
                            )}
                            <div className="mt-6">
                                <img src="https://placehold.co/600x400" alt="提案資料画像" className="w-full h-auto rounded" />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ProposalView;