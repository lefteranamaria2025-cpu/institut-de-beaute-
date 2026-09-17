// Fichier utilitaire partagé : connexion à Supabase.
// Utilisé par les autres fonctions (book.js, bookings.js, send-reminders.js).
//
// Variables d'environnement nécessaires (à ajouter dans Vercel) :
//   SUPABASE_URL          -> "Project URL" trouvée dans Supabase (Settings > API)
//   SUPABASE_SERVICE_KEY  -> la clé "service_role" (jamais la clé "anon")

import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY manquantes');
  }

  client = createClient(url, key);
  return client;
}

export function checkBasicAuth(req) {
  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_USER || !ADMIN_PASSWORD) return false;

  const authHeader = req.headers.authorization || '';
  const expected = 'Basic ' + Buffer.from(ADMIN_USER + ':' + ADMIN_PASSWORD).toString('base64');
  return authHeader === expected;
}
