import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/supabase';
import axios from 'axios';
import { getLlmModelAndGenerateContent } from '@/utils/functions';
import { v4 as uuidv4 } from 'uuid';

type QualityCheckResult = {
  score: number;
  issues: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { documentIds } = req.body;

    // ドキュメントIDの検証
    if (!documentIds || !Array.isArray(documentIds)) {
      return res.status(400).json({ error: '有効なdocumentIdsが必要です。' });
    }

    const checkId = uuidv4();

    try {
      // 1. データベースから関連するすべてのドキュメントを取得
      const { data: documents, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .in('id', documentIds);

      if (fetchError || !documents || documents.length === 0) {
        throw new Error('ドキュメントの取得に失敗しました。');
      }

      // 全てのドキュメントが同じプロジェクトに属しているか確認
      const projectIds = Array.from(new Set(documents.map(doc => doc.project_id)));
      if (projectIds.length !== 1) {
        return res.status(400).json({ error: '選択されたドキュメントは同じプロジェクトに属している必要があります。' });
      }
      const projectId = projectIds[0];

      // 初期チェックレコードの作成
      const initialResult: QualityCheckResult = {
        score: 0,
        issues: [],
      };

      const { error: insertError } = await supabase
        .from('quality_checks')
        .insert([
          {
            id: checkId,
            project_id: projectId,
            type: '整合性チェック',
            result: initialResult,
          },
        ]);

      if (insertError) {
        throw new Error('チェックレコードの作成に失敗しました。');
      }

      // 2. ドキュメント間の関連性を分析
      const systemPrompt = 'ドキュメント間の関連性を分析してください。';
      const userPrompt = JSON.stringify(documents);
      const analysisResponse = await getLlmModelAndGenerateContent('ChatGPT', systemPrompt, userPrompt);

      if (!analysisResponse) {
        throw new Error('関連性分析に失敗しました。');
      }

      // 3. キーワードと概念の一貫性をチェック
      const consistencySystemPrompt = 'キーワードと概念の一貫性をチェックしてください。';
      const consistencyUserPrompt = analysisResponse;
      const consistencyResponse = await getLlmModelAndGenerateContent('ChatGPT', consistencySystemPrompt, consistencyUserPrompt);

      if (!consistencyResponse) {
        throw new Error('一貫性チェックに失敗しました。');
      }

      // 4. 要件とデザインの追跡可能性を確認
      const traceabilitySystemPrompt = '要件とデザインの追跡可能性を確認してください。';
      const traceabilityUserPrompt = consistencyResponse;
      const traceabilityResponse = await getLlmModelAndGenerateContent('ChatGPT', traceabilitySystemPrompt, traceabilityUserPrompt);

      if (!traceabilityResponse) {
        throw new Error('追跡可能性確認に失敗しました。');
      }

      // 5. 不整合箇所を特定しリスト化
      const inconsistencySystemPrompt = '不整合箇所を特定し、リスト化してください。';
      const inconsistencyUserPrompt = traceabilityResponse;
      const inconsistencyResponse = await getLlmModelAndGenerateContent('ChatGPT', inconsistencySystemPrompt, inconsistencyUserPrompt);

      if (!inconsistencyResponse) {
        throw new Error('不整合箇所の特定に失敗しました。');
      }

      // 6. 整合性スコアを計算
      const scoringSystemPrompt = '整合性スコアを計算してください。';
      const scoringUserPrompt = inconsistencyResponse;
      const scoringResponse = await getLlmModelAndGenerateContent('ChatGPT', scoringSystemPrompt, scoringUserPrompt);

      if (!scoringResponse) {
        throw new Error('整合性スコアの計算に失敗しました。');
      }

      const score = parseInt(scoringResponse.replace(/\D/g, ''), 10) || 0;

      // 7. チェック結果と修正提案をデータベースに保存
      const finalResult: QualityCheckResult = {
        score: score,
        issues: [], // ここにissuesの詳細を追加するロジックが必要
      };

      const { error: updateError } = await supabase
        .from('quality_checks')
        .update({ result: finalResult })
        .eq('id', checkId);

      if (updateError) {
        throw new Error('チェック結果の更新に失敗しました。');
      }

      // 8. 結果サマリーをクライアントに送信
      return res.status(200).json({
        checkId,
        progress: 100,
        complete: true,
        summary: {
          score: finalResult.score,
          issues: finalResult.issues,
        },
      });
    } catch (error: any) {
      console.error(error);
      // サンプルデータの返却
      const sampleData = {
        checkId,
        progress: 100,
        complete: true,
        summary: {
          score: 80,
          issues: [
            {
              type: 'キーワード不一致',
              description: 'ドキュメントAとドキュメントBで使用されているキーワードが一致していません。',
              severity: '中',
            },
            {
              type: '追跡可能性欠如',
              description: '要件定義とデザインドキュメント間の追跡が不十分です。',
              severity: '高',
            },
          ],
        },
      };
      return res.status(500).json({ error: error.message, sampleData });
    }
  } else if (req.method === 'GET') {
    const { checkId } = req.query;

    if (!checkId || typeof checkId !== 'string') {
      return res.status(400).json({ error: '有効なcheckIdが必要です。' });
    }

    try {
      const { data, error } = await supabase
        .from('quality_checks')
        .select('result')
        .eq('id', checkId)
        .single();

      if (error || !data) {
        throw new Error('チェック結果の取得に失敗しました。');
      }

      const result: QualityCheckResult = data.result;

      // スコアに基づいて進捗と完了状況を設定
      let progress = 0;
      let complete = false;

      if (result.score > 0) {
        progress = 100;
        complete = true;
      }

      return res.status(200).json({ progress, complete, summary: result });
    } catch (error: any) {
      console.error(error);
      // サンプルデータの返却
      const sampleData = {
        progress: 100,
        complete: true,
        summary: {
          score: 80,
          issues: [
            {
              type: 'キーワード不一致',
              description: 'ドキュメントAとドキュメントBで使用されているキーワードが一致していません。',
              severity: '中',
            },
            {
              type: '追跡可能性欠如',
              description: '要件定義とデザインドキュメント間の追跡が不十分です。',
              severity: '高',
            },
          ],
        },
      };
      return res.status(500).json({ error: error.message, sampleData });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}