// Vercel serverless function: /api/book
// Receives a booking submitted from the site's public form, saves it in
// Supabase, and sends a confirmation email to the client via Brevo.
//
// Required environment variables (set in Vercel, never in this file):
//   BREVO_API_KEY         -> the API key generated in Brevo (SMTP & API > API Keys)
//   SUPABASE_URL          -> Supabase project URL
//   SUPABASE_SERVICE_KEY  -> Supabase service_role key
//
// Optional environment variables:
//   SALON_EMAIL     -> email address bookings should also be copied to (the salon's inbox)
//   SALON_NAME      -> display name used as the "from" name in emails (defaults below)

import { getSupabase } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, service, date, time, dureeMin, reminderHours } = req.body || {};

  if (!name || !email || !service || !date || !time) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SALON_EMAIL = process.env.SALON_EMAIL || 'contact@institutjardinanglais.fr';
  const SALON_NAME = process.env.SALON_NAME || 'Institut de Beauté du Jardin Anglais';

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY is not set');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const formattedDate = new Date(date + 'T' + time).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const clientEmailBody = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #211C19;">
      <h2 style="font-weight: 500;">Réservation confirmée</h2>
      <p>Bonjour ${name},</p>
      <p>Votre rendez-vous est confirmé :</p>
      <ul style="line-height:1.8;">
        <li><strong>Soin :</strong> ${service}</li>
        <li><strong>Date :</strong> ${formattedDate}</li>
        <li><strong>Heure :</strong> ${time}</li>
      </ul>
      <p>Un rappel automatique vous sera envoyé avant votre rendez-vous.</p>
      <p style="margin-top:30px;">À très bientôt,<br>${SALON_NAME}</p>
    </div>
  `;

  const salonEmailBody = `
    <div style="font-family: sans-serif;">
      <h3>Nouvelle réservation en ligne</h3>
      <ul>
        <li><strong>Nom :</strong> ${name}</li>
        <li><strong>Téléphone :</strong> ${phone || '—'}</li>
        <li><strong>Email :</strong> ${email}</li>
        <li><strong>Soin :</strong> ${service}</li>
        <li><strong>Date :</strong> ${formattedDate}</li>
        <li><strong>Heure :</strong> ${time}</li>
      </ul>
    </div>
  `;

  try {
    // 1. Save the booking in Supabase first (so it exists even if the email step has an issue)
    try {
      const supabase = getSupabase();
      const { error: dbError } = await supabase.from('bookings').insert({
        name, phone: phone || null, email, service,
        duree_min: dureeMin || 60,
        booking_date: date,
        booking_time: time,
        reminder_hours: reminderHours || 24,
        reminder_sent: false,
        confirmation_sent: true
      });
      if (dbError) console.error('Supabase insert error:', dbError);
    } catch (dbErr) {
      console.error('Supabase connection error:', dbErr);
    }

    // 2. Send confirmation to the client
    const clientResp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SALON_NAME, email: SALON_EMAIL },
        to: [{ email, name }],
        subject: 'Confirmation de votre rendez-vous',
        htmlContent: clientEmailBody
      })
    });

    if (!clientResp.ok) {
      const errText = await clientResp.text();
      console.error('Brevo error (client email):', errText);
      return res.status(502).json({ error: "Brevo: " + errText, status: clientResp.status });
    }

    // 3. Notify the salon of the new booking (best-effort, doesn't block the response)
    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SALON_NAME, email: SALON_EMAIL },
        to: [{ email: SALON_EMAIL }],
        subject: `Nouvelle réservation — ${name}`,
        htmlContent: salonEmailBody
      })
    }).catch((e) => console.error('Brevo error (salon notice):', e));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

