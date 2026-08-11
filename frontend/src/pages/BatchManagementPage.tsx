import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchAllBatches, fetchJobCards, fetchJobCardsForBatch, closeTransactionBatch, reopenTransactionBatch, type TransactionBatch } from '../lib/jobCards';
import { canReopenTransactionBatches, canCloseTransactionBatches, canManageFinancials } from '../lib/rbac';
import { getNetworkErrorMessage, supabase } from '../lib/supabase';
import { formatDate, formatDateShort, formatTime } from '../lib/dateUtils';
import { CheckCircle2, Loader2, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { Modal } from '../components/Modal';
import { GlassButton } from '../components/GlassButton';

export const BatchManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [batches, setBatches] = useState<TransactionBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<TransactionBatch | null>(null);
  const [batchJobs, setBatchJobs] = useState<number>(0);
  const [batchRevenue, setBatchRevenue] = useState<number | null>(null);
  const [batchAverageRevenue, setBatchAverageRevenue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'close' | 'reopen' | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordError, setExportPasswordError] = useState<string | null>(null);
  const [exportMonth, setExportMonth] = useState<string>('all');
  const [exportName, setExportName] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const canCloseBatch = canCloseTransactionBatches(user?.role);
  const canReopenBatch = canReopenTransactionBatches(user?.role);
  const canViewFinancials = canManageFinancials(user?.role);

  const loadBatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAllBatches();
      setBatches(data);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to load batch history.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCsvRow = (row: string[]) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');

  const getDefaultExportName = (month: string) => {
    const today = new Date().toISOString().slice(0, 10);
    if (month === 'all') {
      return `batch-export-all-${today}`;
    }

    const [year, monthNumber] = month.split('-');
    const monthLabel = new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    return `batch-export-${monthLabel.replace(/\s+/g, '-')}-${today}`;
  };

  const defaultExportName = getDefaultExportName(exportMonth);
  const trimmedExportName = exportName.trim();
  const isUsingCustomExportName = trimmedExportName.length > 0;

  const openExportModal = () => {
    setExportPassword('');
    setExportPasswordError(null);
    setConfirmExport(true);
  };

  const authenticateAndExport = async () => {
    if (!user?.email) return;
    setExportPasswordError(null);
    if (!exportPassword.trim()) {
      setExportPasswordError('Password is required.');
      return;
    }

    setIsExporting(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: exportPassword,
    });

    if (authError) {
      setExportPasswordError('Password is incorrect.');
      setIsExporting(false);
      return;
    }

    try {
      await exportBatchData();
      setConfirmExport(false);
      setExportPassword('');
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to export batch data.'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportBatchData = async () => {
    setIsExporting(true);
    try {
      const allJobCards = await fetchJobCards();
      const rows = [
        ['DATE IN', 'CONTACT NAME AND COMPANY', 'PHONE NO', 'DESCRIPTION', 'JOB CARD', 'PRICE', 'EFD NO', 'TIME OUT'],
      ];

      const filtered = allJobCards.filter((job) => {
        if (exportMonth === 'all') {
          return true;
        }

        const [year, monthNumber] = exportMonth.split('-').map(Number);
        const jobDate = new Date(job.created_at);
        return (
          jobDate.getFullYear() === year &&
          jobDate.getMonth() + 1 === monthNumber
        );
      });

      filtered.forEach((job) => {
        rows.push([
          formatDate(job.created_at),
          `${job.customer_name} / ${job.company_name}`,
          job.phone_number,
          job.notes || '',
          job.job_reference,
          job.price != null ? `K${job.price.toFixed(2)}` : 'K0.00',
          job.efd_receipt_num ?? '',
          job.status === 'COLLECTED' && job.updated_at ? formatTime(job.updated_at) : '',
        ]);
      });

      const csvContent = rows.map(createCsvRow).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);

      const safeName = isUsingCustomExportName
        ? trimmedExportName.replace(/[^a-zA-Z0-9-_ ]/g, '')
        : defaultExportName;
      link.setAttribute('download', `${safeName}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to export batch data.'));
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const openBatchDetails = async (batch: TransactionBatch) => {
    setSelectedBatch(batch);
    setBatchJobs(0);
    setBatchRevenue(null);
    setBatchAverageRevenue(null);
    setError(null);

    try {
      const jobs = await fetchJobCardsForBatch(batch.id);
      const revenue = jobs.reduce((sum, job) => sum + Number(job.price ?? 0), 0);
      setBatchJobs(jobs.length);
      setBatchRevenue(revenue);
      setBatchAverageRevenue(jobs.length ? revenue / jobs.length : 0);
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to load jobs for selected batch.'));
    }
  };

  const authenticateAndAct = async () => {
    if (!selectedBatch || !user?.email) return;
    setPasswordError(null);
    if (!password.trim()) {
      setPasswordError('Password is required.');
      return;
    }

    setIsBusy(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (authError) {
      setPasswordError('Password is incorrect.');
      setIsBusy(false);
      return;
    }

    try {
      if (confirmAction === 'close') {
        await closeTransactionBatch(selectedBatch.id, user.id, user.email);
        setSuccess('Batch closed successfully.');
      } else if (confirmAction === 'reopen') {
        await reopenTransactionBatch(selectedBatch.id, user.id, user.email);
        setSuccess('Batch reopened successfully.');
      }
      setPassword('');
      setConfirmAction(null);
      setSelectedBatch(null);
      await loadBatches();
    } catch (err: any) {
      setError(getNetworkErrorMessage(err, 'Unable to complete batch action.'));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              Batch Management
            </h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Review batch history and audit details.
          </p>
        </div>
        <GlassButton
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-full px-4 py-2 text-sm"
        >
          Back to overview
        </GlassButton>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Batch History</h3>
              <p className="text-xs text-slate-500">{batches.length} batches</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex flex-col gap-1 min-w-[200px]">
                <input
                  type="text"
                  value={exportName}
                  onChange={(event) => setExportName(event.target.value)}
                  placeholder="Export file name"
                  className="glass-input text-sm"
                />
              </div>
              <select
                value={exportMonth}
                onChange={(event) => setExportMonth(event.target.value)}
                className="glass-input text-sm max-w-[180px]"
              >
                <option value="all">All Months</option>
                {Array.from({ length: 12 }, (_, index) => {
                  const now = new Date();
                  const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
                  const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
                  const monthLabel = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                  return (
                    <option key={monthKey} value={monthKey}>
                      {monthLabel}
                    </option>
                  );
                })}
              </select>
              <GlassButton
                type="button"
                disabled={isExporting}
                onClick={openExportModal}
                className="rounded-full px-4 py-2 text-sm"
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </GlassButton>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-slate-400">
              <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            </div>
          ) : batches.length === 0 ? (
            <p className="text-sm text-slate-500">No batch history available.</p>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => openBatchDetails(batch)}
                  className="w-full rounded-3xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-indigo-500/30"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{formatDate(batch.batch_date)}</p>
                      <p className="text-xs text-slate-400">{batch.status}</p>
                    </div>
                    <div className="text-xs text-slate-400">{batch.closed_at ? 'Closed' : 'Open'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Batch Details</h3>
              <p className="text-xs text-slate-500">Audit and job count for selected batch.</p>
            </div>
          </div>

          {!selectedBatch ? (
            <p className="text-sm text-slate-500">Select a batch to view details.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Batch Date</p>
                    <p className="text-sm text-slate-100">{formatDate(selectedBatch.batch_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                    <p className="text-sm text-slate-100">{selectedBatch.status}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created</p>
                  <p className="text-sm text-slate-100">{formatDate(selectedBatch.created_at)}</p>
                  <p className="text-xs text-slate-500">Created by: {selectedBatch.created_by_email ?? selectedBatch.created_by ?? 'Unknown'}</p>
                </div>
                {selectedBatch.closed_at && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Closed</p>
                    <p className="text-sm text-slate-100">{formatDate(selectedBatch.closed_at)}</p>
                    <p className="text-xs text-slate-500">Closed by: {selectedBatch.closed_by_email ?? selectedBatch.closed_by ?? 'Unknown'}</p>
                  </div>
                )}
                {selectedBatch.reopened_at && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reopened</p>
                    <p className="text-sm text-slate-100">{formatDate(selectedBatch.reopened_at)}</p>
                    <p className="text-xs text-slate-500">Reopened by: {selectedBatch.reopened_by_email ?? selectedBatch.reopened_by ?? 'Unknown'}</p>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Job Count</p>
                <p className="text-sm text-slate-100">{batchJobs}</p>
              </div>

              {canViewFinancials && (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Batch Revenue</p>
                    <p className="text-sm text-slate-100">{batchRevenue != null ? `K${batchRevenue.toFixed(2)}` : 'K0.00'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Avg. per Job</p>
                    <p className="text-sm text-slate-100">{batchAverageRevenue != null ? `K${batchAverageRevenue.toFixed(2)}` : 'K0.00'}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {selectedBatch.status === 'OPEN' && canCloseBatch && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction('close');
                    }}
                    className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
                  >
                    Close Batch
                  </button>
                )}
                {selectedBatch.status === 'CLOSED' && canReopenBatch && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction('reopen');
                    }}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                  >
                    Reopen Batch
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={confirmAction !== null}
        onClose={() => {
          setConfirmAction(null);
          setPassword('');
          setPasswordError(null);
        }}
        title={confirmAction === 'close' ? 'Confirm Close Batch' : 'Confirm Reopen Batch'}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Please confirm by entering your password. This action will {confirmAction === 'close' ? 'close' : 'reopen'} the selected batch.
          </p>
          <div className="space-y-2">
            <label htmlFor="batch-password" className="block text-sm font-medium text-slate-400">
              Password
            </label>
            <input
              id="batch-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
              placeholder="Enter your password"
            />
            {passwordError && <p className="text-sm text-rose-400">{passwordError}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setConfirmAction(null);
                setPassword('');
                setPasswordError(null);
              }}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={authenticateAndAct}
              disabled={isBusy}
              className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {isBusy ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmExport}
        onClose={() => {
          setConfirmExport(false);
          setExportPassword('');
          setExportPasswordError(null);
        }}
        title="Confirm Export"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Enter your password to confirm batch export. This protects export access for your account.
          </p>
          <div className="space-y-2">
            <label htmlFor="export-password" className="block text-sm font-medium text-slate-400">
              Password
            </label>
            <input
              id="export-password"
              type="password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
              placeholder="Enter your password"
            />
            {exportPasswordError && <p className="text-sm text-rose-400">{exportPasswordError}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setConfirmExport(false);
                setExportPassword('');
                setExportPasswordError(null);
              }}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={authenticateAndExport}
              disabled={isExporting}
              className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};