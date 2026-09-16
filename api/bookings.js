// Vercel serverless function: /api/bookings
// Used by the private agenda page to list, add, and delete bookings.
// Protected by the same Basic Auth as /agenda (browser reuses the credentials
// automatically since the realm is the same).
//
// GET    /api/bookings          -> list all bookings, soonest first
// POST   /api/bookings          -> add a booking manually (owner-entered)
// DELETE /api/bookings?id=...   -> remove a booking
// PATCH  /api/bookings?id=...   -> update attendance (prezent/absent/in_asteptare) —
//                                   sends a review request or missed-appointment email
//
// Optional environment variables for the PATCH emails:
//   GOOGLE_REVIEW_LINK -> the salon's Google "write a review" link
//   BREVO_API_KEY, SALON_EMAIL, SALON_NAME -> same as used by /api/book

import { getSupabase, checkBasicAuth } from './_supabase.js';

async function sendBrevoEmail(to, toName, subject, htmlContent) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SALON_EMAIL = process.env.SALON_EMAIL || 'contact@institutjardinanglais.fr';
  const SALON_NAME = process.env.SALON_NAME || 'Institut de Beauté du Jardin Anglais';
  if (!BREVO_API_KEY || !to) return;

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SALON_NAME, email: SALON_EMAIL },
        to: [{ email: to, name: toName }],
        subject,
        htmlContent
      })
    });
  } catch (e) {
    console.error('Brevo attendance email error:', e);
  }
}

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

  if (req.method === 'PATCH') {
    const id = req.query.id;
    const { attendance } = req.body || {};
    if (!id || !attendance) return res.status(400).json({ error: 'Champs manquants' });

    // Fetch the booking first so we know the client's email/name for the message
    const { data: existing, error: fetchError } = await supabase
      .from('bookings').select('*').eq('id', id).single();
    if (fetchError) return res.status(500).json({ error: fetchError.message });

    const { error } = await supabase.from('bookings').update({ attendance }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    if (existing && existing.email) {
      if (attendance === 'prezent') {
        const reviewLink = process.env.GOOGLE_REVIEW_LINK;
        const reviewBtn = reviewLink
          ? `<p style="text-align:center; margin:26px 0;"><a href="${reviewLink}" style="background:#141110; color:#fff; padding:14px 28px; border-radius:4px; text-decoration:none; font-size:0.85rem; letter-spacing:0.05em;">Laisser un avis Google</a></p>`
          : '';
        const html = `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #211C19;">
            <h2 style="font-weight: 500;">Merci de votre visite !</h2>
            <p>Bonjour ${existing.name},</p>
            <p>Ce fut un plaisir de vous accueillir à l'Institut de Beauté du Jardin Anglais pour votre soin "${existing.service}". Nous espérons que vous êtes ravie du résultat.</p>
            <p>Si vous avez apprécié votre visite, un petit avis nous aiderait énormément :</p>
            ${reviewBtn}
            <p style="margin-top:30px;">À très bientôt,<br>${process.env.SALON_NAME || 'Institut de Beauté du Jardin Anglais'}</p>
          </div>`;
        await sendBrevoEmail(existing.email, existing.name, 'Merci pour votre visite — votre avis compte !', html);
      } else if (attendance === 'absent') {
        const html = `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #211C19;">
            <h2 style="font-weight: 500;">Rendez-vous manqué</h2>
            <p>Bonjour ${existing.name},</p>
            <p>Nous avons remarqué que vous n'avez pas pu vous présenter à votre rendez-vous du ${existing.booking_date} à ${(existing.booking_time||'').slice(0,5)} pour "${existing.service}". Nous espérons que tout va bien de votre côté.</p>
            <p>N'hésitez pas à nous recontacter pour reprogrammer un nouveau rendez-vous quand cela vous conviendra.</p>
            <p style="margin-top:30px;">À bientôt,<br>${process.env.SALON_NAME || 'Institut de Beauté du Jardin Anglais'}</p>
          </div>`;
        await sendBrevoEmail(existing.email, existing.name, 'Nous vous avons manqué aujourd\'hui', html);
      }
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
