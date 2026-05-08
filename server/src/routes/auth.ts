import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validateBody';
import { supabaseAdmin } from '../utils/supabase';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  orgName: z.string().min(2),
  orgSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

const MagicLinkSchema = z.object({
  email: z.string().email(),
});

const InviteAcceptSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

router.post('/login', validateBody(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ data: { session: data.session, user: data.user } });
  } catch (err) { next(err); }
});

router.post('/register', validateBody(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, fullName, orgName, orgSlug } = req.body;

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: orgName, slug: orgSlug })
      .select()
      .single();

    if (orgError) return res.status(400).json({ error: orgError.message });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      return res.status(400).json({ error: authError.message });
    }

    await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      org_id: orgData.id,
      email,
      full_name: fullName,
      role: 'admin',
    });

    const { data: session } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    res.status(201).json({ data: { session: session.session, org: orgData } });
  } catch (err) { next(err); }
});

router.post('/magic-link', validateBody(MagicLinkSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const { error } = await supabaseAdmin.auth.signInWithOtp({ email });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: { message: 'Magic link sent' } });
  } catch (err) { next(err); }
});

router.post('/invite-accept', validateBody(InviteAcceptSchema), async (req, res, next) => {
  try {
    const { token, password, fullName } = req.body;
    const { data, error } = await supabaseAdmin.auth.verifyOtp({ token_hash: token, type: 'invite' });
    if (error || !data.user) return res.status(400).json({ error: error?.message || 'Invalid token' });

    await supabaseAdmin.auth.admin.updateUserById(data.user.id, { password });
    await supabaseAdmin.from('users').update({ full_name: fullName }).eq('id', data.user.id);

    res.json({ data: { message: 'Account activated' } });
  } catch (err) { next(err); }
});

export default router;
