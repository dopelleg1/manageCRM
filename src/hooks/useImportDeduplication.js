import { useState } from 'react';
import { importWithDeduplication } from '@/services/deduplicationService';

export const useImportDeduplication = (tableName) => {
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

    const executeImport = async (records, options = {}) => {
        setIsProcessing(true);
        setProgress(0);
        setReport(null);
        setError(null);

        try {
            const finalReport = await importWithDeduplication(tableName, records, {
                ...options,
                onProgress: (percent, currentReport) => {
                    setProgress(percent);
                    // Optionally update partial report state if needed for live stats
                }
            });
            setReport(finalReport);
            return finalReport;
        } catch (err) {
            console.error("Import execution failed:", err);
            setError(err);
            return null;
        } finally {
            setIsProcessing(false);
            setProgress(100);
        }
    };

    const reset = () => {
        setProgress(0);
        setIsProcessing(false);
        setReport(null);
        setError(null);
    };

    return {
        progress,
        isProcessing,
        report,
        error,
        executeImport,
        reset
    };
};