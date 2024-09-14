import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Topbar from '@/components/Topbar';
import { createClient } from '@supabase/supabase-js';
import { FaCheck, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import Image from 'next/image';

const supabase = createClient('https://your-supabase-url.supabase.co', 'your-anon-key');

const ConsistencyCheck = () => {
    const router = useRouter();
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            const user = supabase.auth.user();
            if (!user) {
                router.push('/login');
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('documents')
                    .select('id, type, content, created_at')
                    .eq('created_by', user.id);
                if (error) throw error;
                setDocuments(data);
            } catch (err) {
                console.error(err);
                setError('ドキュメントの取得に失敗しました。サンプルデータを表示します。');
                setDocuments([
                    {
                        id: 'sample-1',
                        type: '要件定義',
                        content: { title: 'サンプルタイトル', sections: [{ heading: 'セクション1', content: '内容1' }] },
                        created_at: new Date().toISOString(),
                    },
                ]);
            }
        };
        fetchDocuments();
    }, [router]);

    const handleSelect = (id: string) => {
        setSelectedDocuments(prev =>
            prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
        );
    };

    const startCheck = async () => {
        if (selectedDocuments.length === 0) {
            alert('チェックするドキュメントを選択してください。');
            return;
        }
        setIsChecking(true);
        setProgress(0);
        setError(null);
        try {
            const response = await axios.post('/api/consistency-check', {
                documentIds: selectedDocuments,
            });
            const checkId = response.data.checkId;
            const interval = setInterval(async () => {
                const statusRes = await axios.get(`/api/consistency-check/${checkId}`);
                const status = statusRes.data.status;
                setProgress(status.progress);
                if (status.complete) {
                    clearInterval(interval);
                    router.push('/整合性確認結果画面');
                }
            }, 1000);
        } catch (err) {
            console.error(err);
            setError('整合性チェックの開始に失敗しました。');
            setIsChecking(false);
        }
    };

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex">
                <aside className="w-64 bg-white shadow-md p-4">
                    <nav className="space-y-2">
                        <a href="/ダッシュボード" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
                            <FaCheck className="mr-2" />
                            ダッシュボード
                        </a>
                        <a href="/ファイルアップロード画面" className="flex items-center p-2 text-gray-700 hover:bg-gray-200 rounded">
                            <FaCheck className="mr-2" />
                            ファイルアップロード
                        </a>
                        {/* 他のナビゲーションリンクを追加 */}
                    </nav>
                </aside>
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-4 text-gray-800">整合性確認画面</h1>
                    <div className="bg-white p-6 rounded shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">チェック対象のドキュメントを選択</h2>
                        {error && <p className="text-red-500 mb-4">{error}</p>}
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {documents.map(doc => (
                                <label key={doc.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedDocuments.includes(doc.id)}
                                        onChange={() => handleSelect(doc.id)}
                                        className="form-checkbox h-5 w-5 text-blue-600"
                                    />
                                    <span className="text-gray-700">{doc.type} - {doc.content.title}</span>
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={startCheck}
                            className={`mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700 flex items-center ${isChecking ? 'justify-center' : ''}`}
                            disabled={isChecking}
                        >
                            {isChecking ? <FaSpinner className="animate-spin" /> : 'チェック開始'}
                        </button>
                        {isChecking && (
                            <div className="mt-4">
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div
                                        className="bg-blue-600 h-4 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-gray-700 mt-2">進捗: {progress}%</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-8">
                        <Image src="https://placehold.co/600x400" alt="整合性確認イメージ" width={600} height={400} className="rounded shadow" />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ConsistencyCheck;