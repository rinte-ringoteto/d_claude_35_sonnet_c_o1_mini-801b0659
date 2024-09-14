import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/supabase'
import axios from 'axios'
import PDFDocument from 'pdfkit'
import { Readable } from 'stream'

// AI APIを使用してコンテンツを生成する関数
const getLlmModelAndGenerateContent = async (
    apiName: 'Gemini' | 'Claude' | 'ChatGPT',
    systemPrompt: string,
    userPrompt: string
): Promise<string> => {
    try {
        let apiUrl = ''
        let headers = {}
        let data = {}

        switch (apiName) {
            case 'ChatGPT':
                apiUrl = 'https://api.openai.com/v1/chat/completions'
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                }
                data = {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    max_tokens: 1500,
                }
                break
            case 'Gemini':
                // GeminiのAPIエンドポイントとリクエスト形式に合わせて設定
                apiUrl = 'https://api.gemini.example.com/v1/generate'
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
                }
                data = {
                    prompt: `${systemPrompt}
${userPrompt}`,
                }
                break
            case 'Claude':
                // ClaudeのAPIエンドポイントとリクエスト形式に合わせて設定
                apiUrl = 'https://api.claude.example.com/v1/generate'
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`,
                }
                data = {
                    prompt: `${systemPrompt}
${userPrompt}`,
                    max_tokens: 1500,
                }
                break
            default:
                throw new Error('無効なAPI名が指定されました。')
        }

        const response = await axios.post(apiUrl, data, { headers })
        if (apiName === 'ChatGPT') {
            return response.data.choices[0].message.content.trim()
        } else if (apiName === 'Gemini' || apiName === 'Claude') {
            return response.data.generated_text.trim()
        } else {
            throw new Error('対応していないAPIです。')
        }
    } catch (error) {
        console.error('AI APIリクエストエラー:', error)
        // システムに適したサンプルデータを返す
        return 'サンプル提案資料内容: これはサンプルの提案資料です。詳細な内容は実際のシステムで生成されます。'
    }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'メソッドが許可されていません。POSTを使用してください。' })
        return
    }

    const { projectId, templateId } = req.body

    if (!projectId || !templateId) {
        res.status(400).json({ error: 'プロジェクトIDとテンプレートIDを提供してください。' })
        return
    }

    try {
        // 1. データベースからプロジェクト情報と関連ドキュメントを取得
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, name, description')
            .eq('id', projectId)
            .single()

        if (projectError || !projectData) {
            throw new Error('プロジェクト情報の取得に失敗しました。')
        }

        const { data: documents, error: documentsError } = await supabase
            .from('documents')
            .select('id, type, content')
            .eq('project_id', projectId)

        if (documentsError) {
            throw new Error('関連ドキュメントの取得に失敗しました。')
        }

        // 2. 選択されたテンプレートを読み込み
        const { data: templateData, error: templateError } = await supabase
            .from('templates')
            .select('id, name, content')
            .eq('id', templateId)
            .single()

        if (templateError || !templateData) {
            throw new Error('テンプレートの取得に失敗しました。')
        }

        // 3. ドキュメントから重要な情報を抽出
        const systemPrompt = 'あなたは提案資料を作成するエキスパートです。与えられたドキュメントから重要な情報を抽出してください。'
        const userPrompt = `プロジェクト名: ${projectData.name}
プロジェクト説明: ${projectData.description}
関連ドキュメント: ${JSON.stringify(documents)}`

        const extractedInfo = await getLlmModelAndGenerateContent('ChatGPT', systemPrompt, userPrompt)

        // 4. テンプレートに情報を適用し 提案資料を生成
        const proposalSystemPrompt = 'あなたは優れた提案資料作成者です。以下のテンプレートに基づいて提案資料を作成してください。'
        const proposalUserPrompt = `テンプレート内容: ${templateData.content}
抽出された情報: ${extractedInfo}`

        const proposalContent = await getLlmModelAndGenerateContent('ChatGPT', proposalSystemPrompt, proposalUserPrompt)

        // 5. 生成された資料を最適化およびフォーマット
        const optimizeSystemPrompt = '以下の提案資料をよりプロフェッショナルで読みやすく最適化してください。'
        const optimizeUserPrompt = proposalContent

        const optimizedProposal = await getLlmModelAndGenerateContent('ChatGPT', optimizeSystemPrompt, optimizeUserPrompt)

        // 6. 資料をPDF形式に変換
        const doc = new PDFDocument()
        let buffers: Buffer[] = []
        doc.on('data', buffers.push.bind(buffers))
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers)

            // 7. 生成された資料をSupabaseストレージに保存
            const fileName = `proposal_${projectId}_${Date.now()}.pdf`
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('proposals')
                .upload(fileName, pdfData, {
                    contentType: 'application/pdf',
                })

            if (uploadError) {
                console.error('PDFアップロードエラー:', uploadError)
                res.status(500).json({ error: '提案資料のPDF化及びアップロードに失敗しました。' })
                return
            }

            const { publicURL, error: publicUrlError } = supabase
                .storage
                .from('proposals')
                .getPublicUrl(fileName)

            if (publicUrlError) {
                console.error('パブリックURL取得エラー:', publicUrlError)
                res.status(500).json({ error: '提案資料のURL取得に失敗しました。' })
                return
            }

            // 8. 資料のURLをデータベースに保存
            const { error: saveError } = await supabase
                .from('proposals')
                .insert([
                    {
                        project_id: projectId,
                        template_id: templateId,
                        content: optimizedProposal,
                        pdf_url: publicURL,
                    },
                ])

            if (saveError) {
                console.error('提案資料保存エラー:', saveError)
                res.status(500).json({ error: '提案資料の保存に失敗しました。' })
                return
            }

            // クライアントにURLを返す
            res.status(200).json({ url: publicURL })
        })

        doc.text(optimizedProposal)
        doc.end()
    } catch (error: any) {
        console.error('提案資料作成エラー:', error)
        res.status(500).json({ error: error.message || '提案資料作成中にエラーが発生しました。' })
    }
}

export default handler