// Vercel serverless function: /api/sessions
// Internal session-tracking log (owner only) — lets the owner record what
// was actually done at each visit for a client (date, procedure, notes/
// measurements), separate from the client-filled intake/consent forms.
//
// GET    /api/sessions?clientId=...   -> list sessions for one client
// POST   /api/sessions                -> add a session entry
// DELETE /api/sessions?id=...         -> remove a session entry
//
// All methods require the owner's login (same Basic Auth as /agenda).

import { getSupabase, checkBasicAuth } from './_supabase.js';

export default async function handler(req, res) {
  if (!checkBasicAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Agenda privee"');
    return res.status(401).json({ error: 'Acces refuse' });
  }

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const clientId = req.query.clientId;
    if (!clientId) return res.status(400).json({ error: 'clientId manquant' });
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('session_date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ sessions: data });
  }

  if (req.method === 'POST') {
    const { clientId, date, procedureType, notes } = req.body || {};
    if (!clientId || !date || !procedureType) {
      return res.status(400).json({ error: 'Champs manquants' });
    }
    const { data, error } = await supabase.from('sessions').insert({
      client_id: clientId,
      session_date: date,
      procedure_type: procedureType,
      notes: notes || null
    }).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ session: data[0] });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id manquant' });
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
