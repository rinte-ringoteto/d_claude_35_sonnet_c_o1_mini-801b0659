typescript
import { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/supabase'
import axios from 'axios'
import { getLlmModelAndGenerateContent } from '@/utils/functions'

type ActivityLog = {
    id: string
    project_id: string
    phase: string
    status: string
    timestamp: string
    description: string
}

type ProgressReport = {
    overall_progress: number
    phases: Array<{
        name: string
        progress: number
        status: string
    }>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
    }

    const { project_id, start_date, end_date } = req.body

    if (!project_id || !start_date || !end_date) {
        return res.status(400).json({ message: '必要なパラメータが不足しています。' })
    }

    // ユーザー認証の確認
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
        return res.status(401).json({ message: '認証が必要です。' })
    }

    try {
        // アクティビティログの取得
        const { data: logs, error: fetchError } = await supabase
            .from<ActivityLog>('activity_logs')
            .select('*')
            .eq('project_id', project_id)
            .gte('timestamp', start_date)
            .lte('timestamp', end_date)

        if (fetchError) {
            throw fetchError
        }

        if (!logs || logs.length === 0) {
            return res.status(200).json({
                message: '指定された期間のアクティビティログが見つかりません。',
                report: {
                    overall_progress: 0,
                    phases: []
                },
                report_url: ''
            })
        }

        // フェーズごとの進捗率計算
        const phaseMap: { [key: string]: { completed: number; total: number; status: string } } = {}
        logs.forEach(log => {
            if (!phaseMap[log.phase]) {
                phaseMap[log.phase] = { completed: 0, total: 0, status: log.status }
            }
            phaseMap[log.phase].total += 1
            if (log.status === '完了') {
                phaseMap[log.phase].completed += 1
            }
        })

        const phases = Object.keys(phaseMap).map(phase => ({
            name: phase,
            progress: Math.round((phaseMap[phase].completed / phaseMap[phase].total) * 100),
            status: phaseMap[phase].status
        }))

        // 全体の進捗率算出
        const totalPhases = phases.length
        const completedPhases = phases.filter(phase => phase.progress >= 100).length
        const overall_progress = totalPhases === 0 ? 0 : Math.round((completedPhases / totalPhases) * 100)

        // 主要な課題や遅延要因の特定
        const issues = logs
            .filter(log => log.status === '遅延' || log.status === '問題')
            .map(log => ({
                phase: log.phase,
                description: log.description,
                timestamp: log.timestamp
            }))

        // レポートの生成
        let reportContent: string
        try {
            reportContent = await getLlmModelAndGenerateContent(
                "ChatGPT",
                "あなたはプロジェクトマネージャーです。プロジェクトの進捗レポートを生成してください。",
                `プロジェクトID: ${project_id}
期間: ${start_date} から ${end_date}
フェーズごとの進捗率: ${JSON.stringify(phases)}
主要な課題や遅延要因: ${JSON.stringify(issues)}`
            )
        } catch (apiError) {
            // AI APIのリクエストが失敗した場合のサンプルデータ
            reportContent = `
                全体の進捗率: ${overall_progress}%

                フェーズ別進捗状況:
                ${phases.map(phase => `- ${phase.name}: ${phase.progress}%`).join('
')}

                主要な課題や遅延要因:
                ${issues.length > 0 ? issues.map(issue => `- [${issue.phase}] ${issue.description}`).join('
') : 'なし'}
            `
        }

        // グラフと表を含むレポートの生成（ここでは単純なテキストとして扱います）
        const report: ProgressReport = {
            overall_progress,
            phases
        }

        // レポートをデータベースに保存
        const { data: reportData, error: insertError } = await supabase
            .from('progress_reports')
            .insert([
                {
                    project_id: project_id,
                    report: report
                }
            ])
            .select('id')

        if (insertError || !reportData || reportData.length === 0) {
            throw insertError || new Error('レポートの保存に失敗しました。')
        }

        const reportId = reportData[0].id
        const report_url = `${process.env.NEXT_PUBLIC_BASE_URL}/progress-report-display?id=${reportId}`

        // クライアントにレポートのサマリーとURLを送信
        res.status(200).json({
            message: '進捗レポートが正常に生成されました。',
            report: report,
            report_url: report_url
        })
    } catch (error: any) {
        console.error('進捗レポート生成中にエラーが発生しました:', error)
        res.status(500).json({ message: '進捗レポートの生成中にエラーが発生しました。サンプルデータを返します。', report: { overall_progress: 75, phases: [{ name: '設計', progress: 80, status: '進行中' }, { name: '開発', progress: 70, status: '遅延' }] }, report_url: '' })
    }
}