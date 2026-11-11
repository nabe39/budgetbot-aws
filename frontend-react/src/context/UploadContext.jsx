import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import apiClient from '../api/client';

const UploadContext = createContext(null);

export function useUpload() {
  return useContext(UploadContext);
}

export function UploadProvider({ children }) {
  // Active jobs: { [jobId]: { status, filename, ... } }
  const [jobs, setJobs] = useState({});
  // Toast notification queue
  const [toasts, setToasts] = useState([]);
  const [reviewTransactions, setReviewTransactions] = useState([]);
  
  // Refresh trigger to avoid window.reload()
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger(p => p + 1), []);
  
  const pollRefs = useRef({});

  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...toast }]);
    // Auto-dismiss after 8 seconds if not clicked
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 8000);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const startPolling = useCallback((jobId) => {
    if (pollRefs.current[jobId]) return; // Already polling

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/upload/status/${encodeURIComponent(jobId)}`);
        const data = res.data;

        setJobs(prev => ({
          ...prev,
          [jobId]: data,
        }));

        if (data.status === 'COMPLETED') {
          clearInterval(pollRefs.current[jobId]);
          delete pollRefs.current[jobId];

          const txnsToReview = data.all_transactions && data.all_transactions.length > 0
            ? data.all_transactions
            : (data.needs_review || []);

          const reviewCount = txnsToReview.length;
          let msg = `${data.filename}: ${data.rows_parsed || reviewCount} transactions parsed. Please review and confirm.`;
          let title = 'Review Statement Transactions';

          if (reviewCount > 0) {
            const txnsWithJobId = txnsToReview.map(t => ({ ...t, jobId }));
            setReviewTransactions(prev => {
              const filtered = prev.filter(t => t.jobId !== jobId);
              return [...filtered, ...txnsWithJobId];
            });
          }

          addToast({
            type: 'success',
            title: title,
            message: msg,
            jobId,
            needsReview: txnsToReview,
          });
        } else if (data.status === 'FAILED') {
          clearInterval(pollRefs.current[jobId]);
          delete pollRefs.current[jobId];

          addToast({
            type: 'error',
            title: 'Upload Failed',
            message: `${data.filename}: ${data.error_message || 'Unknown error'}`,
            jobId,
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds

    pollRefs.current[jobId] = interval;
  }, [addToast]);

  const submitUpload = useCallback(async (file) => {
    const fd = new FormData();
    fd.append('file', file);

    // Call upload with auto_commit=false so user can review all parsed transactions before saving
    const res = await apiClient.post('/upload?auto_commit=false', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const { job_id, filename, status } = res.data;

    // Register the job
    setJobs(prev => ({
      ...prev,
      [job_id]: { status, filename, job_id },
    }));

    // If already completed synchronously (local dev mode or immediate processing)
    if (status === 'COMPLETED') {
      const data = res.data;
      const txnsToReview = data.all_transactions && data.all_transactions.length > 0
        ? data.all_transactions
        : (data.needs_review || []);

      const reviewCount = txnsToReview.length;
      let msg = `${data.filename}: ${data.rows_parsed || reviewCount} transactions parsed. Please review and confirm.`;
      let title = 'Review Statement Transactions';

      if (reviewCount > 0) {
        const txnsWithJobId = txnsToReview.map(t => ({ ...t, jobId: job_id }));
        setReviewTransactions(prev => {
          const filtered = prev.filter(t => t.jobId !== job_id);
          return [...filtered, ...txnsWithJobId];
        });
      }

      addToast({
        type: 'success',
        title: title,
        message: msg,
        jobId: job_id,
        needsReview: txnsToReview,
      });

      return { success: true, ...res.data };
    }

    // Start polling for this job
    startPolling(job_id);

    return { success: true, ...res.data };
  }, [addToast, startPolling]);

  // Count active (processing) jobs
  const activeJobCount = Object.values(jobs).filter(
    j => j.status === 'PENDING' || j.status === 'PROCESSING'
  ).length;

  const value = {
    jobs,
    toasts,
    activeJobCount,
    reviewTransactions,
    setReviewTransactions,
    submitUpload,
    removeToast,
    refreshTrigger,
    triggerRefresh,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
}
