import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Topbar from '@/components/Topbar';
import supabase from '@/supabase';
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

interface Issue {
    type: string;
    description: string;
    severity: string;
    suggestion?: string;
}

interface QualityCheck {
    id: string;
    project_id: string;
    type: string;
    result: {
        score: number;
        issues: Issue[];
    };
    created_at: string;
}

const ConsistencyCheckResult: React.FC = () => {
    const router = useRouter();
    const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQualityChecks = async () => {
            const user = supabase.auth.user();
            if (!user) {
                router.push('/login');
                return;
            }

            try {
                const { data, error } = await supabase
                    .from<QualityCheck>('quality_checks')
                    .select('*')
                    .eq('type', '整合性')
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }

                setQualityChecks(data || []);
            } catch (err) {
                console.error(err);
                setError('データの取得に失敗しました。サンプルデータを表示します。');
                setQualityChecks([
                    {
                        id: 'sample-id',
                        project_id: 'sample-project-id',
                        type: '整合性',
                        result: {
                            score: 85,
                            issues: [
                                {
                                    type: 'ドキュメント',
                                    description: 'セクション2の内容が不足しています。',
                                    severity: '高',
                                    suggestion: 'セクション2に詳細を追加してください。'
                                },
                                {
                                    type: 'ソースコード',
                                    description: '関数Xの実装が不完全です。',
                                    severity: '中',
                                    suggestion: '関数Xにエラーハンドリングを追加してください。'
                                }
                            ]
                        },
                        created_at: new Date().toISOString(),
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchQualityChecks();
    }, [router]);

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex">
                <aside className="w-64 bg-white shadow-md">
                    <nav className="mt-10">
                        <ul>
                            <li className="mb-4">
                                <Link href="/dashboard">
                                    <a className="flex items-center p-2 text-gray-700 hover:bg-gray-200">
                                        ダッシュボード
                                    </a>
                                </Link>
                            </li>
                            <li className="mb-4">
                                <Link href="/file-upload">
                                    <a className="flex items-center p-2 text-gray-700 hover:bg-gray-200">
                                        ファイルアップロード
                                    </a>
                                </Link>
                            </li>
                            <li className="mb-4">
                                <Link href="/document-generation">
                                    <a className="flex items-center p-2 text-gray-700 hover:bg-gray-200">
                                        ドキュメント生成
                                    </a>
                                </Link>
                            </li>
                            <li className="mb-4">
                                <Link href="/source-code-generation">
                                    <a className="flex items-center p-2 text-gray-700 hover:bg-gray-200">
                                        ソースコード生成
                                    </a>
                                </Link>
                            </li>
                            <li className="mb-4">
                                <Link href="/quality-check">
                                    <a className="flex items-center p-2 text-gray-700 hover:bg-gray-200">
                                        品質チェック
                                    </a>
                                </Link>
                            </li>
                            <li className="mb-4">
                                <Link href="/consistency-check-result">
                                    <a className="flex items-center p-2 text-blue-500 font-semibold bg-gray-200">
                                        整合性確認結果
                                    </a>
                                </Link>
                            </li>
                            <li className="mb-4">
                                <Link href="/work-estimate">
                                    <a className="flex items-center p-2 text-gray-700 hover:bg-gray-200">
                                        工数見積
                                    </a>
                                </Link>
                            </li>
                            <li className="mb-4">
                                <Link href="/proposal-creation">
                                    <a className="flex items-center p-2 text-gray-700 hover:bg-gray-200">
                                        提案資料作成
                                    </a>
                                </Link>
                            </li>
                            <li className="mb-4">
                                <Link href="/progress-report">
                                    <a className="flex items-center p-2 text-gray-700 hover:bg-gray-200">
                                        進捗レポート
                                    </a>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </aside>
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-6">整合性確認結果画面</h1>
                    {loading ? (
                        <p className="text-gray-700">読み込み中...</p>
                    ) : error ? (
                        <div className="mb-4 p-4 bg-yellow-100 text-yellow-700 rounded">
                            {error}
                        </div>
                    ) : (
                        qualityChecks.map((check) => (
                            <div key={check.id} className="mb-8 p-6 bg-white shadow rounded">
                                <div className="flex items-center mb-4">
                                    <FaCheckCircle className="text-blue-500 mr-2" />
                                    <h2 className="text-xl font-semibold">整合性スコア: {check.result.score}</h2>
                                    <img src="https://placehold.co/50" alt="Score Icon" className="ml-auto"/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium mb-2">不整合箇所リスト</h3>
                                    {check.result.issues.length === 0 ? (
                                        <p className="text-green-600">全ての整合性が取れています。</p>
                                    ) : (
                                        <ul className="space-y-4">
                                            {check.result.issues.map((issue, index) => (
                                                <li key={index} className="flex items-start p-4 bg-gray-50 rounded">
                                                    <FaExclamationTriangle className="text-red-500 mt-1 mr-3" />
                                                    <div>
                                                        <p className="font-semibold">{issue.type}</p>
                                                        <p className="text-gray-700">{issue.description}</p>
                                                        <p className="text-sm text-gray-500">重要度: {issue.severity}</p>
                                                        {issue.suggestion && (
                                                            <p className="text-sm text-gray-600">提案: {issue.suggestion}</p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="mt-6">
                                    <h3 className="text-lg font-medium mb-2">修正提案</h3>
                                    {check.result.issues.length === 0 ? (
                                        <p className="text-green-600">修正は不要です。</p>
                                    ) : (
                                        <ul className="space-y-4">
                                            {check.result.issues.map((issue, index) => (
                                                <li key={index} className="flex items-start p-4 bg-gray-50 rounded">
                                                    <FaCheckCircle className="text-green-500 mt-1 mr-3" />
                                                    <div>
                                                        <p className="font-semibold">{issue.type} 修正案</p>
                                                        <p className="text-gray-700">{issue.suggestion || '提案なし'}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </main>
            </div>
        </div>
    );
};

export default ConsistencyCheckResult;