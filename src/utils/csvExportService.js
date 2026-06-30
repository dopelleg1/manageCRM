import Papa from 'papaparse';

/**
 * Exports an array of objects to a CSV file and triggers download.
 * @param {string} tableName - Name of the table/entity (used for filename)
 * @param {Array} data - Array of objects to export
 * @returns {Promise<boolean>} - Resolves true on success
 */
export const exportTableToCSV = (tableName, data) => {
  return new Promise((resolve, reject) => {
    try {
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error("Nessun dato disponibile per l'esportazione.");
      }

      // Convert data to CSV string
      const csv = Papa.unparse(data, {
        quotes: true, // Force quotes around fields to handle special characters safely
        delimiter: ",",
        header: true, // Include keys as headers
        skipEmptyLines: true,
      });

      // Create a Blob from the CSV string
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename: tableName_export_YYYY-MM-DD.csv
      const dateStr = new Date().toISOString().split('T')[0];
      const sanitizedTableName = tableName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTableName}_export_${dateStr}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      resolve(true);
    } catch (error) {
      console.error("CSV Export Error:", error);
      reject(error);
    }
  });
};