import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';
import { processYardiCSV } from '../services/yardiImport';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const UploadInitSchema = z.object({
  fileName: z.string(),
  dataType: z.enum(['properties', 'units', 'vendors', 'work_orders', 'invoices', 'transactions', 'tenants']),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

const ProcessSchema = z.object({
  syncLogId: z.string().uuid(),
  storagePath: z.string(),
  columnMappings: z.record(z.string()),
  conflictResolution: z.enum(['keep_bidiq', 'use_yardi', 'ask']).default('ask'),
});

const ConflictResolveSchema = z.object({
  conflictIds: z.array(z.string().uuid()),
  resolution: z.enum(['kept_bidiq', 'used_yardi']),
});

router.get('/sync-log', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('yardi_sync_log')
      .select('*')
      .eq('org_id', req.orgId!)
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/upload-init', ...auth, requireRole('project_manager'), validateBody(UploadInitSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { fileName, dataType, fileSize, mimeType } = req.body;
    const storagePath = `${req.orgId}/yardi/${dataType}/${Date.now()}_${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('yardi-imports')
      .createSignedUploadUrl(storagePath);

    if (uploadError) return res.status(400).json({ error: uploadError.message });

    const { data: syncLog, error: logError } = await supabaseAdmin
      .from('yardi_sync_log')
      .insert({
        org_id: req.orgId,
        sync_type: 'manual_upload',
        data_type: dataType,
        file_name: fileName,
        storage_path: storagePath,
        status: 'processing',
        initiated_by: req.userId,
      })
      .select()
      .single();

    if (logError) return res.status(400).json({ error: logError.message });

    res.json({ data: { syncLogId: syncLog.id, storagePath, signedUrl: uploadData.signedUrl, token: uploadData.token } });
  } catch (err) { next(err); }
});

router.post('/process', ...auth, requireRole('project_manager'), validateBody(ProcessSchema), auditLog('import', 'yardi_sync_log'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { syncLogId, storagePath, columnMappings, conflictResolution } = req.body;
    const result = await processYardiCSV(req.orgId!, syncLogId, storagePath, columnMappings, conflictResolution, req.userId!);
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/conflicts', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('sync_conflicts')
      .select('*, yardi_sync_log(data_type, file_name, started_at)')
      .eq('org_id', req.orgId!)
      .is('resolution', null)
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/conflicts/resolve', ...auth, requireRole('project_manager'), validateBody(ConflictResolveSchema), auditLog('update', 'sync_conflicts'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { conflictIds, resolution } = req.body;
    const { error } = await supabaseAdmin
      .from('sync_conflicts')
      .update({ resolution, resolved_at: new Date().toISOString(), resolved_by: req.userId })
      .in('id', conflictIds)
      .eq('org_id', req.orgId!);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: { resolved: conflictIds.length } });
  } catch (err) { next(err); }
});

export default router;
