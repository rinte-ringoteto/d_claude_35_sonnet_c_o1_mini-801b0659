import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import { supabase } from '@/supabase';
import { AiOutlineEdit, AiOutlineDownload } from 'react-icons/ai';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const CodeView: React.FC = () => {
    const router = useRouter();
    const [codeContent, setCodeContent] = useState<string>('');
    const [fileName, setFileName] = useState<string>('code-view.tsx');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editedContent, setEditedContent] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            const user = supabase.auth.user();
            if (!user) {
                router.push('/login');
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('source_codes')
                    .select('content, file_name')
                    .eq('file_name', 'code-view.tsx')
                    .single();

                if (error) {
                    throw error;
                }

                setCodeContent(data.content);
                setFileName(data.file_name);
            } catch (err) {
                console.error(err);
                setError('ソースコードの取得に失敗しました。サンプルデータを表示します。');
                setCodeContent('// サンプルコード
console.log("Hello, World!");');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleEdit = () => {
        setIsEditing(true);
        setEditedContent(codeContent);
    };

    const handleSave = async () => {
        const user = supabase.auth.user();
        if (!user) {
            router.push('/login');
            return;
        }

        try {
            const { error } = await supabase
                .from('source_codes')
                .update({ content: editedContent, updated_at: new Date().toISOString() })
                .eq('file_name', fileName);

            if (error) {
                throw error;
            }

            setCodeContent(editedContent);
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            setError('ソースコードの保存に失敗しました。');
        }
    };

    const handleDownload = () => {
        const blob = new Blob([codeContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen h-full bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500">読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex flex-col items-center p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">ソースコード表示エリア</h1>
                {error && (
                    <div className="mb-4 p-2 bg-red-200 text-red-800 rounded">
                        {error}
                    </div>
                )}
                <div className="w-full max-w-4xl bg-white shadow rounded p-4">
                    <div className="flex justify-between mb-4">
                        <span className="text-lg font-medium text-gray-700">{fileName}</span>
                        <div className="flex space-x-2">
                            {!isEditing ? (
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700 transition duration-300"
                                >
                                    <AiOutlineEdit className="mr-2" />
                                    編集
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 active:bg-green-700 transition duration-300"
                                >
                                    保存
                                </button>
                            )}
                            <button
                                onClick={handleDownload}
                                className="flex items-center px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 active:bg-orange-700 transition duration-300"
                            >
                                <AiOutlineDownload className="mr-2" />
                                ダウンロード
                            </button>
                        </div>
                    </div>
                    {isEditing ? (
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full h-64 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        />
                    ) : (
                        <SyntaxHighlighter language="typescript" style={coy}>
                            {codeContent}
                        </SyntaxHighlighter>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodeView;