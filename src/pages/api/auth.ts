typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/supabase'
import axios from 'axios'

type Data = {
    message: string
    token?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'メソッドが許可されていません。' })
    }

    const { action, email, password, role } = req.body

    if (!action || !email || !password) {
        return res.status(400).json({ message: '必要なフィールドが不足しています。' })
    }

    if (action === 'register') {
        if (!role) {
            return res.status(400).json({ message: '役割が指定されていません。' })
        }

        // ユーザー登録
        const { user, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        })

        if (signUpError) {
            return res.status(400).json({ message: `登録に失敗しました: ${signUpError.message}` })
        }

        if (user) {
            // users テーブルに追加
            const { error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        id: user.id,
                        email: user.email,
                        role: role,
                    },
                ])

            if (insertError) {
                return res.status(500).json({ message: `ユーザー情報の保存に失敗しました: ${insertError.message}` })
            }

            return res.status(200).json({ message: '登録が成功しました。' })
        }
    } else if (action === 'login') {
        // ログイン処理
        const { session, error: signInError } = await supabase.auth.signIn({
            email,
            password,
        })

        if (signInError) {
            return res.status(400).json({ message: 'ログインに失敗しました。メールアドレスとパスワードを確認してください。' })
        }

        if (session) {
            return res.status(200).json({ message: 'ログインに成功しました。', token: session.access_token })
        }
    } else {
        return res.status(400).json({ message: '無効なアクションが指定されました。' })
    }
}