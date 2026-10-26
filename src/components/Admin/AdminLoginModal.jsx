import React, { useState } from 'react';
import { useAdminEdit } from '../../context/AdminEditContext';
import { Shield, KeyRound, X, Check } from 'lucide-react';

export default function AdminLoginModal() {
  const { isLoginModalOpen, setIsLoginModalOpen, login } = useAdminEdit();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = login(password);
    if (!success) {
      setError(true);
    } else {
      setPassword('');
      setError(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-950 border border-amber-500/40 text-white rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Shield className="w-5 h-5" />
            <span>KJT 관리자 인증</span>
          </div>
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              관리자 비밀번호
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
            {error ? (
              <p className="text-rose-400 text-xs mt-1.5">
                비밀번호가 일치하지 않습니다. 다시 시도해 주세요.
              </p>
            ) : (
              <p className="text-slate-500 text-[11px] mt-1.5">
                관리자 기능은 운영 홈페이지의 관리자 모드에서 이용해주세요.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              닫기
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Check className="w-4 h-4" />
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
