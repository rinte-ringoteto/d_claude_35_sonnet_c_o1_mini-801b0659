import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Topbar from '@/components/Topbar';
import { supabase } from '@/supabase';
import { FaUpload, FaCheck, FaSpinner } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';

type Document = {
    id: string;
    project_id: string;
    type: string;
    content: any;
    created_at: string;
    updated_at: string;
};

type SourceCode = {
    id: string;
    project_id: string;
    file_name: string;
    content: string;
    created_at: string;
    updated_at: string;
};

type QualityCheck = {
    id: string;
    project_id: string;
    type: string;
    result: any;
    created_at: string;
};

const QualityCheckPage = () => {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [sourceCodes, setSourceCodes] = useState<SourceCode[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [progress, setProgress] = useState<number>(0);
    const [qualityCheckId, setQualityCheckId] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            const user = supabase.auth.user();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: docData, error: docError } = await supabase
                .from<Document>('documents')
                .select('*')
                .eq('created_by', user.id);

            if (docError) {
                console.error(docError);
                setDocuments([]);
            } else {
                setDocuments(docData || []);
            }

            const { data: srcData, error: srcError } = await supabase
                .from<SourceCode>('source_codes')
                .select('*')
                .eq('created_by', user.id);

            if (srcError) {
                console.error(srcError);
                setSourceCodes([]);
            } else {
                setSourceCodes(srcData || []);
            }
        };

        fetchData();
    }, [router]);

    useEffect(() => {
        if (qualityCheckId) {
            const subscription = supabase
                .from<QualityCheck>(`quality_checks:id=eq.${qualityCheckId}`)
                .on('UPDATE', payload => {
                    const result = payload.new.result;
                    const score = result.score;
                    setProgress(score);
                    if (score >= 100) {
                        setIsChecking(false);
                        router.push(`/quality-check-result?id=${qualityCheckId}`);
                    }
                })
                .subscribe();

            return () => {
                supabase.removeSubscription(subscription);
            };
        }
    }, [qualityCheckId, router]);

    const handleSelection = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const startCheck = async () => {
        if (selectedItems.length === 0) {
            alert('チェック対象を選択してください');
            return;
        }

        setIsChecking(true);
        const newQualityCheckId = uuidv4();
        setQualityCheckId(newQualityCheckId);

        const { data, error } = await supabase
            .from('quality_checks')
            .insert([
                {
                    id: newQualityCheckId,
                    project_id: 'プロジェクトIDをここに',
                    type: 'ドキュメント',
                    result: { score: 0, issues: [] },
                },
            ]);

        if (error) {
            console.error(error);
            setIsChecking(false);
            alert('品質チェックの開始に失敗しました');
        } else {
            // 実際の品質チェックロジックをここに実装
        }
    };

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex flex-col items-center p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">品質チェック画面</h1>
                <div className="w-full max-w-4xl bg-white shadow-md rounded p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-medium text-gray-700 mb-2">チェック対象の選択</h2>
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-600">ドキュメント</span>
                            {documents.length > 0 ? (
                                documents.map(doc => (
                                    <label key={doc.id} className="flex items-center mt-2">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-5 w-5 text-blue-600"
                                            checked={selectedItems.includes(doc.id)}
                                            onChange={() => handleSelection(doc.id)}
                                        />
                                        <span className="ml-2 text-gray-700">{doc.type} - {doc.id}</span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-gray-500">ドキュメントがありません</p>
                            )}
                        </div>
                        <div className="flex flex-col mt-4">
                            <span className="font-semibold text-gray-600">ソースコード</span>
                            {sourceCodes.length > 0 ? (
                                sourceCodes.map(src => (
                                    <label key={src.id} className="flex items-center mt-2">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-5 w-5 text-blue-600"
                                            checked={selectedItems.includes(src.id)}
                                            onChange={() => handleSelection(src.id)}
                                        />
                                        <span className="ml-2 text-gray-700">{src.file_name}</span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-gray-500">ソースコードがありません</p>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={startCheck}
                            className={`flex items-center px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none ${
                                isChecking ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={isChecking}
                        >
                            {isChecking ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
                            チェック開始
                        </button>
                    </div>
                    {isChecking && (
                        <div className="mt-6 text-center">
                            <p className="text-gray-700">チェックが進行中です...</p>
                            <div className="w-full bg-gray-200 rounded-full mt-2">
                                <div
                                    className="bg-blue-600 text-xs leading-none py-1 text-center text-white rounded-full"
                                    style={{ width: `${progress}%` }}
                                >
                                    {progress}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-8">
                    <img src="https://placehold.co/600x400" alt="品質チェックイメージ" className="rounded shadow-md" />
                </div>
            </div>
        </div>
    );
};

export default QualityCheckPage;