import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ExternalLink, RefreshCw, X, Database } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';

export const RLS_SETUP_SQL = `-- PlanList: Supabase Row-Level Security (RLS) Policy Setup
-- Run this in your Supabase SQL Editor to enable cloud sync:

-- 1. Tasks Table RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;

CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.tasks TO authenticated;

-- 2. Lists Table RLS
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lists_select_policy" ON public.lists;
DROP POLICY IF EXISTS "lists_insert_policy" ON public.lists;
DROP POLICY IF EXISTS "lists_update_policy" ON public.lists;
DROP POLICY IF EXISTS "lists_delete_policy" ON public.lists;

CREATE POLICY "lists_select_policy" ON public.lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lists_insert_policy" ON public.lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists_update_policy" ON public.lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists_delete_policy" ON public.lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.lists TO authenticated;

-- 3. Goals Table RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goals_select_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_insert_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_update_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_delete_policy" ON public.goals;

CREATE POLICY "goals_select_policy" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "goals_insert_policy" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update_policy" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_delete_policy" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.goals TO authenticated;

-- 4. Plans Table RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_select_policy" ON public.plans;
DROP POLICY IF EXISTS "plans_insert_policy" ON public.plans;
DROP POLICY IF EXISTS "plans_update_policy" ON public.plans;
DROP POLICY IF EXISTS "plans_delete_policy" ON public.plans;

CREATE POLICY "plans_select_policy" ON public.plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "plans_insert_policy" ON public.plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_update_policy" ON public.plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_delete_policy" ON public.plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.plans TO authenticated;

-- 5. Notes Table RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes_select_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_insert_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_update_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_delete_policy" ON public.notes;

CREATE POLICY "notes_select_policy" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notes_insert_policy" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_policy" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_delete_policy" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.notes TO authenticated;`;

export const RlsHelpModal: React.FC = () => {
  const { isRlsModalOpen, closeRlsModal, retryLastSync, dismissSyncError } = usePlan();
  const [copied, setCopied] = useState(false);

  if (!isRlsModalOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(RLS_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRetry = () => {
    dismissSyncError();
    closeRlsModal();
    retryLastSync();
  };

  const dashboardSqlUrl =
    typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL?.includes('/sql/')
      ? process.env.VITE_SUPABASE_URL
      : 'https://supabase.com/dashboard/project/xivkkvknkygpmibczhvh/sql/fdbed1dc-0d61-4699-aaaf-bdc95830acb6';

  return (
    <div
      id="rls-help-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeRlsModal}
    >
      <div
        id="rls-help-modal-container"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supabase RLS Policy Setup</h3>
              <p className="text-xs text-slate-500">Enable cloud sync for your authenticated user account</p>
            </div>
          </div>
          <button
            id="close-rls-modal-btn"
            onClick={closeRlsModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Local Data Safe:</span> Your tasks and changes are preserved safely in local storage. Supabase currently rejects inserts with error 42501 because the database tables have Row-Level Security (RLS) enabled without an active <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">INSERT</code> policy for your authenticated user.
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">1. Run this SQL in Supabase SQL Editor:</span>
              <button
                id="copy-rls-sql-btn"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
              </button>
            </div>

            <div className="relative rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono text-xs text-slate-200 overflow-x-auto max-h-56">
              <pre className="whitespace-pre">{RLS_SETUP_SQL}</pre>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-700">2. Quick Steps to Apply:</p>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600">
              <li>Click <span className="font-medium text-slate-800">Copy SQL</span> above.</li>
              <li>Open your Supabase project's SQL Editor using the link below.</li>
              <li>Paste and click <span className="font-medium text-slate-800">Run</span> (or press Ctrl+Enter).</li>
              <li>Return here and click <span className="font-medium text-slate-800">Retry Cloud Sync</span>.</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <a
            id="open-supabase-dashboard-link"
            href={dashboardSqlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <span>Open Supabase SQL Editor</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={closeRlsModal}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              id="retry-sync-modal-btn"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Cloud Sync</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
