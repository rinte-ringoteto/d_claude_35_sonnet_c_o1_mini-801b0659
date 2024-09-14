import { useState, useEffect, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/router';
import Topbar from '@/components/Topbar';
import { supabase } from '@/supabase';
import { FaUpload } from 'react-icons/fa';

const FileUpload = () => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const session = supabase.auth.session();
        if (session) {
            setUser(session.user);
        } else {
            router.push('/login');
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session) {
                    setUser(session.user);
                } else {
                    setUser(null);
                    router.push('/login');
                }
            }
        );

        return () => {
            authListener?.unsubscribe();
        };
    }, [router]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('ファイルが選択されていません。');
            return;
        }

        setIsUploading(true);
        setError('');

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, file);

        if (uploadError) {
            setError('ファイルのアップロードに失敗しました。');
            setIsUploading(false);
            return;
        }

        const { error: dbError } = await supabase
            .from('documents')
            .insert([
                {
                    project_id: 'プロジェクトIDをここに入力',
                    type: file.type.includes('pdf') ? 'PDF' : 'テキスト',
                    content: JSON.stringify({ title: file.name, sections: [] }),
                },
            ]);

        if (dbError) {
            setError('データベースへの記録に失敗しました。');
            setIsUploading(false);
            return;
        }

        router.push('/document-generation');
    };

    return (
        <div className="min-h-screen h-full bg-gray-100">
            <Topbar />
            <div className="flex">
                <aside className="w-64 bg-white shadow-md">
                    <nav className="mt-10">
                        <a href="/dashboard" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-white">
                            ダッシュボード
                        </a>
                        <a href="/file-upload" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-white">
                            ファイルアップロード
                        </a>
                        <a href="/document-generation" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-white">
                            ドキュメント生成
                        </a>
                        {/* 他のナビゲーションリンクを追加 */}
                    </nav>
                </aside>
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-6">ファイルアップロード画面</h1>
                    <div
                        className="border-2 border-dashed border-primary rounded-lg p-6 text-center cursor-pointer bg-white"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <FaUpload className="text-4xl text-primary mx-auto mb-4" />
                        <p className="text-gray-700">ファイルをドラッグ&ドロップするか、以下のボタンをクリックして選択してください。</p>
                        <input
                            type="file"
                            accept=".txt, .pdf"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="file-upload" className="mt-4 inline-block bg-primary text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300">
                            ファイル選択
                        </label>
                        {file && (
                            <div className="mt-4">
                                <p className="text-gray-800">選択されたファイル: {file.name}</p>
                                <img src="https://placehold.co/400x200" alt="ファイルプレビュー" className="mt-2 mx-auto" />
                            </div>
                        )}
                    </div>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                    <button
                        onClick={handleUpload}
                        className="mt-6 bg-secondary text-white py-2 px-4 rounded hover:bg-teal-500 transition duration-300"
                        disabled={isUploading}
                    >
                        {isUploading ? 'アップロード中...' : 'アップロード'}
                    </button>
                </main>
            </div>
        </div>
    );
};

export default FileUpload;