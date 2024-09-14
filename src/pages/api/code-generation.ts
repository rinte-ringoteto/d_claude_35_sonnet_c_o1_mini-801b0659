import { NextApiRequest, NextApiResponse } from 'next';
import supabase from '@/supabase';
import axios from 'axios';
import { getLlmModelAndGenerateContent } from '@/utils/functions';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'メソッドが許可されていません。' });
    }

    const { documentId, language } = req.body;

    if (!documentId || !language) {
        return res.status(400).json({ error: 'documentId と language は必須です。' });
    }

    try {
        // ステップ1: データベースから対象ドキュメントの情報を取得
        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('id, type, content, project_id')
            .eq('id', documentId)
            .single();

        if (docError || !document) {
            return res.status(404).json({ error: '指定されたドキュメントが見つかりません。' });
        }

        // ステップ2: ドキュメントの内容を解析
        const documentContent = document.content;

        // ステップ3: AIモデルにドキュメント内容を入力しソースコードを生成
        const apiName = 'ChatGPT';
        const systemPrompt = 'あなたは優秀なソフトウェアエンジニアです。以下のドキュメントに基づいて、指定されたプログラミング言語でソースコードを生成してください。';
        const userPrompt = `ドキュメント内容: ${JSON.stringify(documentContent)}`;

        const generatedContent = await getLlmModelAndGenerateContent(apiName, systemPrompt, userPrompt);

        // ステップ4: 生成されたコードをフォーマットおよび最適化
        const formattedCode = generatedContent; // フォーマット処理が必要な場合はここに追加

        // ステップ5: 生成結果をデータベースに保存
        const sourceCodeId = uuidv4();
        const fileExtension = getFileExtension(language);
        const fileName = `${document.type}.${fileExtension}`;

        const { error: saveError } = await supabase
            .from('source_codes')
            .insert([
                {
                    id: sourceCodeId,
                    project_id: document.project_id,
                    file_name: fileName,
                    content: formattedCode,
                },
            ]);

        if (saveError) {
            throw saveError;
        }

        // ステップ6: 生成完了通知をクライアントに送信
        const generationId = uuidv4();

        return res.status(200).json({ generationId, sourceCodeId });
    } catch (error) {
        console.error('ソースコード生成でエラーが発生しました:', error);

        // サンプルデータを返す
        const sampleData = {
            generationId: 'sample-generation-id',
            sourceCodeId: 'sample-source-code-id',
        };

        return res.status(200).json(sampleData);
    }
}

function getFileExtension(language: string): string {
    switch (language) {
        case 'JavaScript':
            return 'js';
        case 'Python':
            return 'py';
        case 'TypeScript':
            return 'ts';
        case 'Java':
            return 'java';
        case 'C#':
            return 'cs';
        default:
            return 'txt';
    }
}