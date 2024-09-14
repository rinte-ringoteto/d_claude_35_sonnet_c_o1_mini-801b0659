import React, { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Topbar from '@/components/Topbar'
import { supabase } from '@/supabase'
import { FaEnvelope, FaLock } from 'react-icons/fa'
import Link from 'next/link'

const Login: React.FC = () => {
    const router = useRouter()
    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [error, setError] = useState<string>('')

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        const { error } = await supabase.auth.signIn({
            email,
            password,
        })
        if (error) {
            setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
        } else {
            router.push('/dashboard')
        }
    }

    return (
        <div className="min-h-screen h-full bg-f8f8f8">
            <Topbar />
            <div className="flex justify-center items-center mt-16">
                <div className="w-full max-w-md bg-white p-8 rounded shadow">
                    <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">ログイン</h2>
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-gray-700 mb-2">メールアドレス</label>
                            <div className="flex items-center border-b border-gray-300 focus-within:border-indigo-500">
                                <FaEnvelope className="text-gray-400 mr-2" />
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full py-2 px-0 bg-transparent focus:outline-none text-gray-700"
                                    placeholder="例: user@example.com"
                                />
                            </div>
                        </div>
                        <div className="mb-6">
                            <label htmlFor="password" className="block text-gray-700 mb-2">パスワード</label>
                            <div className="flex items-center border-b border-gray-300 focus-within:border-indigo-500">
                                <FaLock className="text-gray-400 mr-2" />
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full py-2 px-0 bg-transparent focus:outline-none text-gray-700"
                                    placeholder="パスワードを入力"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-500 active:bg-indigo-700 transition duration-300"
                        >
                            ログイン
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <Link href="/password-reset">
                            <a className="text-indigo-600 hover:text-indigo-500">パスワードをお忘れですか？</a>
                        </Link>
                    </div>
                    <div className="mt-6 flex justify-center">
                        <img src="https://placehold.co/150x150" alt="プレースホルダー画像" className="w-24 h-24" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login