import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
}

/**
 * Export data to Excel file
 * @param data Array of objects to export
 * @param headers Column headers (keys from data objects)
 * @param options Export options
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  options: ExcelExportOptions = {}
): void {
  // Prepare worksheet data
  const worksheetData = [
    // Header row
    headers.map(h => h.label),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header.key];
        // Handle dates
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }
        return value;
      })
    ),
  ];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Sheet1');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = options.filename 
    ? `${options.filename}_${timestamp}.xlsx`
    : `export_${timestamp}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
}

