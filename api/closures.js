// Vercel serverless function: /api/closures
// Manages "closed" days/time-ranges the owner sets (holidays, emergencies,
// half-day closures). The public booking calendar reads this list (GET,
// no auth needed — it's just used to grey out unavailable times) while
// adding/removing a closure requires the owner's login (same Basic Auth
// as /agenda).
//
// A closure with start_time/end_time = null means the WHOLE day is closed.
// A closure with both set means only that time range is blocked that day.
//
// GET    /api/closures          -> list all closures (public, read-only)
// POST   /api/closures          -> add a closure (owner only)
// DELETE /api/closures?id=...   -> remove a closure (owner only)

import { getSupabase, checkBasicAuth } from './_supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === 'GET') {
    // Public: the booking page needs this to know what's unavailable.
    const { data, error } = await supabase
      .from('closures')
      .select('*')
      .order('closure_date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ closures: data });
  }

  // Everything past this point modifies data — owner only.
  if (!checkBasicAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Agenda privee"');
    return res.status(401).json({ error: 'Acces refuse' });
  }

  if (req.method === 'POST') {
    const { date, startTime, endTime, reason } = req.body || {};
    if (!date) return res.status(400).json({ error: 'Date manquante' });
    const { data, error } = await supabase.from('closures').insert({
      closure_date: date,
      start_time: startTime || null,
      end_time: endTime || null,
      reason: reason || null
    }).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ closure: data[0] });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id manquant' });
    const { error } = await supabase.from('closures').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
