export function exportToCSV(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const escape = (val: string | number | null) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function exportToJSON(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function exportToHTML(filename: string, title: string, bodyHTML: string) {
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; }
    h1 { color: #3b82f6; } h2 { border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .score { font-weight: bold; } .pass { color: #10b981; } .fail { color: #ef4444; }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
    .badge-pass { background: #d1fae5; color: #065f46; } .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-pending { background: #f3f4f6; color: #6b7280; }
    @media print { body { margin: 0; } }
  </style></head><body><h1>${title}</h1>${bodyHTML}</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { current.push(field); field = ''; }
      else if (ch === '\n') { current.push(field); rows.push(current); current = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
  }
  if (field || current.length) { current.push(field); rows.push(current); }
  return rows;
}

export async function downloadReport(url: string, format: 'csv' | 'pdf', filename: string) {
  const response = await fetch(`${url}?format=${format}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('securecode_token')}` },
  });
  if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
  const blob = await response.blob();
  downloadBlob(blob, filename);
}
