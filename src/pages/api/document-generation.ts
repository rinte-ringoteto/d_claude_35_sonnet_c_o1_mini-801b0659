import { NextApiRequest, NextApiResponse } from 'next';
import supabase from '@/supabase';
import axios from 'axios';
import { getLlmModelAndGenerateContent } from '@/utils/functions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'メソッドが許可されていません。POSTのみ許可されています。' });
    }

    const { documentId } = req.body;

    if (!documentId) {
        return res.status(400).json({ error: 'documentIdが提供されていません。' });
    }

    // ドキュメントをデータベースから取得
    const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

    if (fetchError || !document) {
        return res.status(404).json({ error: '指定されたドキュメントが見つかりません。' });
    }

    const createdBy = document.created_by;
    const type = document.type;
    const content = document.content;

    const fileName = content.title;
    const filePath = `${createdBy}/${fileName}`;

    // 進捗を20%に更新
    const { error: updateError1 } = await supabase
        .from('documents')
        .update({ content: { ...content, progress: 20 } })
        .eq('id', documentId);
    if (updateError1) {
        return res.status(500).json({ error: 'ドキュメントの進捗を更新できませんでした。' });
    }

    // Supabaseストレージからファイルを取得
    const { data: fileData, error: storageError } = await supabase
        .storage
        .from('uploads')
        .download(filePath);

    if (storageError || !fileData) {
        // エラー時に進捗を100%に設定しサンプルデータを返す
        const sampleContent = {
            title: fileName,
            sections: [
                {
                    heading: 'サンプルセクション',
                    content: 'AIによるドキュメント生成に失敗しました。以下はサンプルのドキュメントです。',
                },
            ],
            progress: 100
        };
        await supabase
            .from('documents')
            .update({ content: sampleContent })
            .eq('id', documentId);
        return res.status(500).json({ error: 'ファイルの取得に失敗しました。サンプルデータを返します。' });
    }

    let fileContent = '';

    if (type === 'テキスト') {
        const text = await fileData.text();
        fileContent = text;
    } else if (type === 'PDF') {
        // PDFのテキスト抽出処理が必要ですが、ここではサンプルデータを使用
        fileContent = 'PDFファイルの内容を抽出できませんでした。';
    } else {
        fileContent = '不明なファイルタイプです。';
    }

    // 進捗を40%に更新
    const { error: updateError2 } = await supabase
        .from('documents')
        .update({ content: { ...content, progress: 40 } })
        .eq('id', documentId);
    if (updateError2) {
        return res.status(500).json({ error: 'ドキュメントの進捗を更新できませんでした。' });
    }

    // システムプロンプトとユーザープロンプトの定義
    const systemPrompt = 'あなたは優秀な技術文書生成AIです。提供された情報を基に詳細な開発ドキュメントを作成してください。';
    const userPrompt = fileContent;

    // AI APIを呼び出し
    let aiResponse;
    try {
        aiResponse = await getLlmModelAndGenerateContent('ChatGPT', systemPrompt, userPrompt);
    } catch (aiError) {
        // エラー時に進捗を100%に設定しサンプルデータを返す
        const sampleContent = {
            title: fileName,
            sections: [
                {
                    heading: 'サンプルセクション',
                    content: 'AI APIへのリクエストに失敗しました。以下はサンプルのドキュメントです。',
                },
            ],
            progress: 100
        };
        await supabase
            .from('documents')
            .update({ content: sampleContent })
            .eq('id', documentId);
        return res.status(500).json({ error: 'AI APIへのリクエストに失敗しました。サンプルデータを返します。' });
    }

    const generatedContent = aiResponse;

    // 進捗を80%に更新
    const { error: updateError3 } = await supabase
        .from('documents')
        .update({ content: { ...content, progress: 80 } })
        .eq('id', documentId);
    if (updateError3) {
        return res.status(500).json({ error: 'ドキュメントの進捗を更新できませんでした。' });
    }

    // 生成されたドキュメントをフォーマット（必要に応じて実装）

    // 生成結果をデータベースに保存し進捗を100%に更新
    const finalContent = {
        ...content,
        sections: generatedContent.sections, // AIからの生成内容がsectionsとして返されることを想定
        progress: 100
    };

    const { error: updateError4 } = await supabase
        .from('documents')
        .update({ content: finalContent })
        .eq('id', documentId);
    if (updateError4) {
        return res.status(500).json({ error: '生成されたドキュメントを保存できませんでした。' });
    }

    return res.status(200).json({ message: 'ドキュメントの生成が完了しました。' });
}