typescript
import { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import { createClient } from '@supabase/supabase-js';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { IconContext } from 'react-icons';
import { FiAlertCircle } from 'react-icons/fi';

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const supabase = createClient('https://your-supabase-url.supabase.co', 'your-anon-key');

interface ProgressReport {
  id: string;
  project_id: string;
  report: {
    overall_progress: number;
    phases: Array<{
      name: string;
      progress: number;
      status: string;
    }>;
  };
  created_at: string;
}

const ProgressReportView = () => {
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchProgressReport = async () => {
      setLoading(true);
      const user = supabase.auth.user();
      if (!user) {
        setError('ユーザーがログインしていません。');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from<ProgressReport>('progress_reports')
        .select('*')
        .eq('project_id', 'your-project-id')
        .single();

      if (error) {
        console.error(error);
        setError('進捗レポートの取得に失敗しました。サンプルデータを表示します。');
        setReport({
          id: 'sample-id',
          project_id: 'sample-project-id',
          report: {
            overall_progress: 75,
            phases: [
              { name: '設計', progress: 80, status: '順調' },
              { name: '開発', progress: 70, status: 'やや遅延' },
              { name: 'テスト', progress: 60, status: '遅延' },
            ],
          },
          created_at: new Date().toISOString(),
        });
      } else {
        setReport(data);
      }
      setLoading(false);
    };

    fetchProgressReport();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen h-full bg-gray-100">
        <Topbar />
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-700 text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="min-h-screen h-full bg-gray-100">
        <Topbar />
        <div className="flex justify-center items-center h-full">
          <p className="text-red-500 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  const overallData = {
    labels: ['進捗'],
    datasets: [
      {
        data: [report?.report.overall_progress || 0, 100 - (report?.report.overall_progress || 0)],
        backgroundColor: ['#4A90E2', '#F5A623'],
        hoverBackgroundColor: ['#50E3C2', '#F5A623'],
      },
    ],
  };

  const phaseData = {
    labels: report?.report.phases.map((phase) => phase.name) || [],
    datasets: [
      {
        label: '進捗 (%)',
        data: report?.report.phases.map((phase) => phase.progress) || [],
        backgroundColor: '#4A90E2',
      },
    ],
  };

  return (
    <div className="min-h-screen h-full bg-gray-100">
      <Topbar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">進捗レポート表示画面</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">全体進捗グラフ</h2>
            <Pie data={overallData} />
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">フェーズ別進捗状況</h2>
            <Bar data={phaseData} />
          </div>
        </div>
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">課題リスト</h2>
          <ul className="list-disc list-inside">
            {report?.report.phases.map((phase, index) => (
              <li key={index} className="flex items-center mb-2 text-gray-600">
                <FiAlertCircle className="mr-2 text-orange-500" />
                {phase.name}: {phase.status}
              </li>
            )) || <li className="text-gray-600">課題はありません。</li>}
          </ul>
        </div>
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">操作手順</h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-1">
            <li>全体進捗グラフで進捗状況を視覚的に確認</li>
            <li>フェーズ別進捗状況で詳細を確認</li>
            <li>課題リストで現在の問題点や遅延要因を確認</li>
            <li>必要に応じてプロジェクト計画の調整を検討</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ProgressReportView;