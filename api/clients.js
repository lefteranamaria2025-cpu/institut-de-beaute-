// Vercel serverless function: /api/clients
// Manages confidential client dossiers (intake info + treatment consents).
//
// POST   /api/clients   -> PUBLIC. A client (or the owner) submits the intake
//                          form + selected treatment consents. Write-only:
//                          nothing is returned except a success flag, so a
//                          client filling this in can never read anyone
//                          else's data back.
// GET    /api/clients   -> OWNER ONLY. Lists every client dossier with their
//                          signed consents. Protected the same way as /agenda.
// DELETE /api/clients?id=...  -> OWNER ONLY. Removes a client dossier entirely.

import { getSupabase, checkBasicAuth } from './_supabase.js';

export default async function handler(req, res) {
  const supabase = getSupabase();

  if (req.method === 'POST') {
    const { name, phone, email, birthDate, address, medicalNotes, consents } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Nom manquant' });

    // Try to find an existing dossier for this same person, so repeated
    // visits (different treatments) stay in ONE file instead of creating
    // a new client each time. Matched by name + phone together (both must
    // match) — safer than either alone, since name alone could clash
    // between two different people, and phone alone could be shared
    // within a family.
    let clientId = null;

    if (name && phone) {
      const { data: byNamePhone } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', name)
        .eq('phone', phone)
        .limit(1);
      if (byNamePhone && byNamePhone.length > 0) clientId = byNamePhone[0].id;
    }
    if (!clientId && name && email) {
      const { data: byNameEmail } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', name)
        .eq('email', email)
        .limit(1);
      if (byNameEmail && byNameEmail.length > 0) clientId = byNameEmail[0].id;
    }

    if (clientId) {
      // Existing dossier found: update it with any newly provided info
      // (only overwrite fields that were actually filled in this time)
      const updates = {};
      if (name) updates.name = name;
      if (birthDate) updates.birth_date = birthDate;
      if (address) updates.address = address;
      if (medicalNotes) updates.medical_notes = medicalNotes;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.from('clients').update(updates).eq('id', clientId);
        if (updateError) return res.status(500).json({ error: updateError.message });
      }
    } else {
      // No match: create a new dossier
      const { data: clientRow, error: clientError } = await supabase
        .from('clients')
        .insert({
          name,
          phone: phone || null,
          email: email || null,
          birth_date: birthDate || null,
          address: address || null,
          medical_notes: medicalNotes || null
        })
        .select();

      if (clientError) return res.status(500).json({ error: clientError.message });
      clientId = clientRow[0].id;
    }

    if (Array.isArray(consents) && consents.length > 0) {
      const rows = consents.map(function (c) {
        return {
          client_id: clientId,
          treatment_type: c.treatmentType,
          signed_name: c.signedName,
          details: c.details || null
        };
      });
      const { error: consentError } = await supabase.from('consents').insert(rows);
      if (consentError) return res.status(500).json({ error: consentError.message });
    }

    // Deliberately return nothing but success — this is a write-only endpoint
    // from the client's point of view.
    return res.status(200).json({ success: true });
  }

  // Reading or deleting dossiers is confidential — owner only.
  if (!checkBasicAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Agenda privee"');
    return res.status(401).json({ error: 'Acces refuse' });
  }

  if (req.method === 'GET') {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const { data: consents, error: consentsError } = await supabase
      .from('consents')
      .select('*');
    if (consentsError) return res.status(500).json({ error: consentsError.message });

    const withConsents = clients.map(function (c) {
      return { ...c, consents: consents.filter(function (co) { return co.client_id === c.id; }) };
    });

    return res.status(200).json({ clients: withConsents });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id manquant' });
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
