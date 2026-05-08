import { supabaseAdmin } from '../utils/supabase';

const FUZZY_COLUMN_MAP: Record<string, string[]> = {
  property_id: ['propertyid', 'property_id', 'prop_id', 'propertynumber', 'prop_num'],
  unit_number: ['unitnumber', 'unit_number', 'unit_num', 'unit', 'unitid'],
  vendor_id: ['vendorid', 'vendor_id', 'vendornumber', 'vendor_num'],
  company_name: ['vendorname', 'company_name', 'vendor_name', 'companyname', 'name'],
  amount: ['amount', 'invoiceamount', 'total', 'totalamount', 'invoice_amount'],
  invoice_date: ['invoicedate', 'invoice_date', 'date', 'transactiondate'],
};

export function fuzzyMatchColumns(csvHeaders: string[]): Record<string, string> {
  const normalized = csvHeaders.map(h => h.toLowerCase().replace(/[\s_-]/g, ''));
  const mappings: Record<string, string> = {};

  for (const [canonicalField, aliases] of Object.entries(FUZZY_COLUMN_MAP)) {
    for (const alias of aliases) {
      const aliasNorm = alias.replace(/[\s_-]/g, '');
      const idx = normalized.indexOf(aliasNorm);
      if (idx !== -1) {
        mappings[canonicalField] = csvHeaders[idx];
        break;
      }
    }
  }

  return mappings;
}

export async function processYardiCSV(
  orgId: string,
  syncLogId: string,
  storagePath: string,
  columnMappings: Record<string, string>,
  conflictResolution: string,
  userId: string
) {
  const stats = { processed: 0, created: 0, updated: 0, skipped: 0, conflicted: 0 };

  try {
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('yardi-imports')
      .download(storagePath);

    if (downloadError) throw downloadError;

    const text = await fileData.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('CSV has no data rows');

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] || '' }), {} as Record<string, string>);
    });

    stats.processed = rows.length;

    await supabaseAdmin.from('yardi_sync_log').update({
      status: 'completed',
      records_processed: stats.processed,
      records_created: stats.created,
      records_updated: stats.updated,
      records_skipped: stats.skipped,
      records_conflicted: stats.conflicted,
      completed_at: new Date().toISOString(),
    }).eq('id', syncLogId);

    return stats;
  } catch (err: any) {
    await supabaseAdmin.from('yardi_sync_log').update({
      status: 'failed',
      error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq('id', syncLogId);
    throw err;
  }
}
