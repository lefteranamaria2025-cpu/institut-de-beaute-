// Vercel serverless function: /api/bookings
// Used by the private agenda page to list, add, and delete bookings.
// Protected by the same Basic Auth as /agenda (browser reuses the credentials
// automatically since the realm is the same).
//
// GET    /api/bookings          -> list all bookings, soonest first
// POST   /api/bookings          -> add a booking manually (owner-entered)
// DELETE /api/bookings?id=...   -> remove a booking

import { getSupabase, checkBasicAuth } from './_supabase.js';

export default async function handler(req, res) {
  if (!checkBasicAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Agenda privee"');
    return res.status(401).json({ error: 'Acces refuse' });
  }

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ bookings: data });
  }

  if (req.method === 'POST') {
    const { name, phone, email, service, dureeMin, date, time, reminderHours } = req.body || {};
    if (!name || !service || !date || !time) {
      return res.status(400).json({ error: 'Champs manquants' });
    }
    const { data, error } = await supabase.from('bookings').insert({
      name, phone: phone || null, email: email || null, service,
      duree_min: dureeMin || 60,
      booking_date: date,
      booking_time: time,
      reminder_hours: reminderHours || 24,
      reminder_sent: false,
      confirmation_sent: false
    }).select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ booking: data[0] });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id manquant' });
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
