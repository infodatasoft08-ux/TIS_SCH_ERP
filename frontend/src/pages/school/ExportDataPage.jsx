import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Download, 
  FileSpreadsheet, 
  Archive, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Database,
  ShieldCheck,
  Layers
} from 'lucide-react';

import { useAuth } from '@/auth/AuthContext';

export default function ExportDataPage() {
  const { user } = useAuth();
  const [format, setFormat] = useState('xlsx');
  const [isExporting, setIsExporting] = useState(false);
  const [currentExportId, setCurrentExportId] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  const isDeveloper = Boolean(
    user?.role_id === 6 || 
    user?.role_id === 3 || 
    user?.sub_role === 'developer' || 
    user?.role_name?.toLowerCase().includes('developer') || 
    user?.email?.toLowerCase().includes('developer') || 
    user?.is_developer
  );

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get('/api/admin/export/history');
      if (res.data && res.data.success) {
        setHistory(res.data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch export history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let interval = null;
    if (isExporting && currentExportId) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/api/admin/export/status/${currentExportId}`);
          if (res.data && res.data.success) {
            const exp = res.data.export;
            setExportStatus(exp);

            if (exp.status === 'completed') {
              setIsExporting(false);
              clearInterval(interval);
              fetchHistory();

              if (!autoDownloaded) {
                setAutoDownloaded(true);
                triggerDirectDownload(exp.export_id, exp.file_name);
              }
            } else if (exp.status === 'failed') {
              setIsExporting(false);
              clearInterval(interval);
              fetchHistory();
            }
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExporting, currentExportId, autoDownloaded]);

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportStatus({ status: 'pending', progress: 5, current_step: 'Submitting job...' });
    setAutoDownloaded(false);

    try {
      const res = await axios.post('/api/admin/export/start', { format });
      if (res.data && res.data.success) {
        setCurrentExportId(res.data.exportId);
      } else {
        setIsExporting(false);
        alert(res.data?.message || 'Failed to start export job');
      }
    } catch (err) {
      setIsExporting(false);
      alert(err.response?.data?.message || 'Server error while starting export');
    }
  };

  const triggerDirectDownload = (exportId, fileName) => {
    const downloadUrl = `/api/admin/export/download/${exportId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName || 'Times_International_ERP_Export.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isDeveloper) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[60vh]">
        <ShieldCheck className="w-16 h-16 text-rose-500" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Access Restricted</h2>
        <p className="text-slate-500 max-w-md">
          The Production Complete Data Export Engine is restricted to Developer / Super Admin role accounts only. Please contact system administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-10 -translate-y-10">
          <Database size={320} />
        </div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-semibold tracking-wide">
            <ShieldCheck size={14} /> Production Complete ERP Data Portability Engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Complete ERP Data Export Center
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Export all database modules of Times International School into comprehensive, human-readable Excel workbooks or CSV archives. Includes resolved foreign keys, detailed fee balances, exam dynamic components & sub-subjects, and full student directories.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="text-blue-600 dark:text-blue-400" size={22} /> Select Export Format & Scope
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose your preferred output format. All exports include multi-sheet relational resolution and metadata summary.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label 
            onClick={() => setFormat('xlsx')}
            className={`cursor-pointer p-5 rounded-xl border-2 transition-all flex items-start gap-4 ${
              format === 'xlsx' 
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-md' 
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className={`p-3 rounded-lg ${format === 'xlsx' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <FileSpreadsheet size={28} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Excel Workbook (.xlsx)</span>
                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Recommended</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Single master file with color-coded worksheets, auto-fitted columns, header styling, and metadata summary sheet.
              </p>
            </div>
          </label>

          <label 
            onClick={() => setFormat('zip')}
            className={`cursor-pointer p-5 rounded-xl border-2 transition-all flex items-start gap-4 ${
              format === 'zip' 
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-md' 
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className={`p-3 rounded-lg ${format === 'zip' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <Archive size={28} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">CSV & JSON Archive (.zip)</span>
                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Archival</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Compressed ZIP containing individual CSV files and clean raw JSON data files for external migrations.
              </p>
            </div>
          </label>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" size={16} /> Password hashes, JWT secrets & private credentials are automatically stripped.
          </div>
          <button
            onClick={handleStartExport}
            disabled={isExporting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <RefreshCw className="animate-spin" size={18} /> Processing Export...
              </>
            ) : (
              <>
                <Download size={18} /> Generate Complete Export Now
              </>
            )}
          </button>
        </div>
      </div>

      {isExporting && exportStatus && (
        <div className="bg-gradient-to-r from-blue-900/90 to-indigo-950/90 text-white rounded-2xl p-6 shadow-xl border border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="animate-spin text-blue-400" size={24} />
              <div>
                <h3 className="font-bold text-base">Export Job in Progress</h3>
                <p className="text-xs text-slate-300">{exportStatus.current_step || 'Processing data chunks...'}</p>
              </div>
            </div>
            <span className="text-2xl font-black text-blue-400">{exportStatus.progress || 0}%</span>
          </div>

          <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden p-0.5 border border-slate-600">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(exportStatus.progress || 5, 5)}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="text-blue-600 dark:text-blue-400" size={20} /> Export Audit Logs & Downloads
          </h2>
          <button 
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <RefreshCw className={loadingHistory ? 'animate-spin' : ''} size={18} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            No export history available yet. Generate your first export above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Export ID</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Initiated By</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.export_id}
                    </td>
                    <td className="py-3 px-4 font-medium uppercase">
                      {item.export_type}
                    </td>
                    <td className="py-3 px-4">
                      {item.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          <RefreshCw className="animate-spin" size={12} /> {item.progress}%
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock size={12} /> Queued
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <AlertCircle size={12} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {item.user_name || 'Admin'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">
                      {formatBytes(item.file_size)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === 'completed' && (
                        <button
                          onClick={() => triggerDirectDownload(item.export_id, item.file_name)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 text-xs shadow-sm"
                        >
                          <Download size={14} /> Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
