// Vercel serverless function: /api/debug-supabase
// TEMPORARY diagnostic endpoint. Visit it directly in the browser to see
// exactly what's happening with the Supabase connection, without going
// through the booking form. Delete this file once the issue is fixed.

import { getSupabase } from './_supabase.js';

export default async function handler(req, res) {
  const report = {
    SUPABASE_URL_present: !!process.env.SUPABASE_URL,
    SUPABASE_URL_preview: process.env.SUPABASE_URL
      ? process.env.SUPABASE_URL.slice(0, 20) + '...'
      : null,
    SUPABASE_SERVICE_KEY_present: !!process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_SERVICE_KEY_length: process.env.SUPABASE_SERVICE_KEY
      ? process.env.SUPABASE_SERVICE_KEY.length
      : 0,
  };

  try {
    const supabase = getSupabase();
    const { data, error, status, statusText } = await supabase
      .from('bookings')
      .insert({
        name: 'TEST DEBUG',
        email: 'test@example.com',
        service: 'Test',
        duree_min: 60,
        booking_date: '2026-01-01',
        booking_time: '10:00',
        reminder_hours: 24,
        reminder_sent: false,
        confirmation_sent: false
      })
      .select();

    report.insert_attempted = true;
    report.insert_error = error ? { message: error.message, details: error.details, hint: error.hint, code: error.code } : null;
    report.insert_status = status;
    report.insert_statusText = statusText;
    report.insert_data = data;
  } catch (err) {
    report.exception = err.message;
  }

  return res.status(200).json(report);
}
