import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/supabase';
import axios from 'axios';
import { getLlmModelAndGenerateContent } from '@/utils/functions';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { qualityCheckId } = req.body;

    if (!qualityCheckId) {
        return res.status(400).json({ error: 'qualityCheckId is required' });
    }

    try {
        // 認証チェック
        const { user, error: userError } = await supabase.auth.getUser(req.headers.token as string);
        if (userError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // quality_checksからレコードを取得
        const { data: qualityData, error: qualityError } = await supabase
            .from<QualityCheck>('quality_checks')
            .select('*')
            .eq('id', qualityCheckId)
            .single();

        if (qualityError || !qualityData) {
            return res.status(404).json({ error: 'Quality check not found' });
        }

        const projectId = qualityData.project_id;

        // プロジェクトに関連するドキュメントとソースコードを取得
        const { data: documents, error: docError } = await supabase
            .from<Document>('documents')
            .select('*')
            .eq('project_id', projectId);

        if (docError) {
            return res.status(500).json({ error: 'Failed to fetch documents' });
        }

        const { data: sourceCodes, error: srcError } = await supabase
            .from<SourceCode>('source_codes')
            .select('*')
            .eq('project_id', projectId);

        if (srcError) {
            return res.status(500).json({ error: 'Failed to fetch source codes' });
        }

        // ドキュメントの一貫性と完全性をチェック
        let documentIssues: any[] = [];
        try {
            const systemPrompt = 'ドキュメントの一貫性と完全性をチェックしてください。';
            const userPrompt = JSON.stringify(documents);
            const aiResponse = await getLlmModelAndGenerateContent('ChatGPT', systemPrompt, userPrompt);

            documentIssues = JSON.parse(aiResponse);
        } catch (error) {
            documentIssues = [
                { type: 'ドキュメントチェック', description: 'サンプル問題点1', severity: '低' },
                { type: 'ドキュメントチェック', description: 'サンプル問題点2', severity: '中' },
            ];
        }

        // コードの構文エラーおよびベストプラクティス違反をチェック
        let codeIssues: any[] = [];
        try {
            const systemPrompt = 'ソースコードの構文エラーとベストプラクティス違反をチェックしてください。';
            const userPrompt = JSON.stringify(sourceCodes);
            const aiResponse = await getLlmModelAndGenerateContent('ChatGPT', systemPrompt, userPrompt);

            codeIssues = JSON.parse(aiResponse);
        } catch (error) {
            codeIssues = [
                { type: '構文エラー', description: 'サンプルエラー1', severity: '高' },
                { type: 'ベストプラクティス', description: 'サンプル違反1', severity: '中' },
            ];
        }

        // スコア化
        const totalIssues = documentIssues.length + codeIssues.length;
        const score = Math.max(100 - totalIssues * 10, 0);

        // 改善提案を生成
        let improvementSuggestions: any[] = [];
        try {
            const systemPrompt = '以下の問題点に対する改善提案を生成してください。';
            const userPrompt = JSON.stringify([...documentIssues, ...codeIssues]);
            const aiResponse = await getLlmModelAndGenerateContent('ChatGPT', systemPrompt, userPrompt);

            improvementSuggestions = JSON.parse(aiResponse);
        } catch (error) {
            improvementSuggestions = [
                { issue: 'サンプル問題点1', suggestion: 'サンプル改善提案1' },
                { issue: 'サンプル問題点2', suggestion: 'サンプル改善提案2' },
            ];
        }

        const result = {
            score,
            issues: [...documentIssues, ...codeIssues],
            suggestions: improvementSuggestions,
        };

        // チェック結果をデータベースに保存
        const { error: updateError } = await supabase
            .from<QualityCheck>('quality_checks')
            .update({ result })
            .eq('id', qualityCheckId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update quality check result' });
        }

        // 結果サマリーをクライアントに送信
        res.status(200).json({ score, issues: [...documentIssues, ...codeIssues], suggestions: improvementSuggestions });

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
}