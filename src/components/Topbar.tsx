typescript
import React, { useState } from 'react';
import Link from 'next/link';
import { FiMenu, FiX, FiUser } from 'react-icons/fi';

const navLinks = [
  { name: 'ダッシュボード', href: '/dashboard' },
  { name: 'ファイルアップロード', href: '/file-upload' },
  { name: 'ドキュメント生成', href: '/document-generation' },
  { name: 'ソースコード生成', href: '/code-generation' },
  { name: '品質チェック', href: '/quality-check' },
  { name: '整合性確認', href: '/consistency-check' },
  { name: '工数見積', href: '/work-estimation' },
  { name: '提案資料作成', href: '/proposal-creation' },
  { name: '進捗レポート', href: '/progress-report' },
  { name: 'ドキュメント表示', href: '/document-view' },
  { name: 'ソースコード表示', href: '/code-view' },
  { name: '品質チェック結果', href: '/quality-check-result' },
  { name: '整合性確認結果', href: '/consistency-check-result' },
  { name: '工数見積結果', href: '/work-estimation-result' },
  { name: '提案資料表示', href: '/proposal-view' },
  { name: '進捗レポート表示', href: '/progress-report-view' },
];

const Topbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-[#4A90E2] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/dashboard">
              <a className="flex-shrink-0 flex items-center text-xl font-bold">
                GEAR.indigo
              </a>
            </Link>
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <a className="px-3 py-2 rounded-md text-sm font-medium hover:bg-[#50E3C2] transition duration-300">
                    {link.name}
                  </a>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button className="flex items-center px-3 py-2 rounded-md hover:bg-[#50E3C2] transition duration-300">
              <FiUser className="h-6 w-6" />
              <span className="ml-2">ユーザー</span>
            </button>
            <div className="md:hidden ml-2">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-white hover:bg-[#50E3C2] p-2 rounded-md"
              >
                {isOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-[#4A90E2]">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <a className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#50E3C2] transition duration-300">
                  {link.name}
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;