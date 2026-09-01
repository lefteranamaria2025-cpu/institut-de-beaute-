// Vercel serverless function: /api/send-reminders
// Runs automatically once a day (see vercel.json "crons"). Finds bookings
// whose reminder is now due (reminder_hours before the appointment) and
// haven't had a reminder sent yet, sends a personalized email via Brevo,
// then marks them as sent.
//
// Because this runs once a day, "due" is checked as: the appointment is
// within the next 24h of the reminder threshold — this keeps reminders
// from being missed between two daily runs.
//
// Required environment variables: BREVO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
// Optional: SALON_EMAIL, SALON_NAME, CRON_SECRET (recommended, see below)

import { getSupabase } from './_supabase.js';

export default async function handler(req, res) {
  // Optional extra protection: if CRON_SECRET is set, require it as a Bearer token,
  // so this endpoint can't be triggered by random visitors hitting the URL.
  const CRON_SECRET = process.env.CRON_SECRET;
  if (CRON_SECRET) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SALON_EMAIL = process.env.SALON_EMAIL || 'contact@institutjardinanglais.fr';
  const SALON_NAME = process.env.SALON_NAME || 'Institut de Beauté du Jardin Anglais';

  if (!BREVO_API_KEY) {
    return res.status(500).json({ error: 'BREVO_API_KEY manquante' });
  }

  const supabase = getSupabase();

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('reminder_sent', false);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  const now = new Date();
  const sent = [];
  const skipped = [];

  for (const b of bookings) {
    const apptTime = new Date(`${b.booking_date}T${b.booking_time}`);
    const reminderTime = new Date(apptTime.getTime() - b.reminder_hours * 3600000);

    // Reminder is due once we've reached its threshold, and the appointment
    // hasn't already passed.
    if (now >= reminderTime && now < apptTime) {
      if (!b.email) { skipped.push(b.id); continue; }

      const formattedDate = apptTime.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      const emailBody = `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #211C19;">
          <h2 style="font-weight: 500;">Rappel de rendez-vous</h2>
          <p>Bonjour ${b.name},</p>
          <p>Petit rappel : vous avez rendez-vous à l'Institut de Beauté du Jardin Anglais.</p>
          <ul style="line-height:1.8;">
            <li><strong>Soin :</strong> ${b.service}</li>
            <li><strong>Date :</strong> ${formattedDate}</li>
            <li><strong>Heure :</strong> ${b.booking_time.slice(0,5)}</li>
          </ul>
          <p style="margin-top:30px;">À très bientôt,<br>${SALON_NAME}</p>
        </div>
      `;

      try {
        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: SALON_NAME, email: SALON_EMAIL },
            to: [{ email: b.email, name: b.name }],
            subject: 'Rappel de votre rendez-vous',
            htmlContent: emailBody
          })
        });

        if (resp.ok) {
          await supabase.from('bookings').update({ reminder_sent: true }).eq('id', b.id);
          sent.push(b.id);
        } else {
          const errText = await resp.text();
          console.error('Brevo reminder error for', b.id, errText);
          skipped.push(b.id);
        }
      } catch (e) {
        console.error('Reminder send error for', b.id, e);
        skipped.push(b.id);
      }
    }
  }

  return res.status(200).json({ checked: bookings.length, sent, skipped });
}
