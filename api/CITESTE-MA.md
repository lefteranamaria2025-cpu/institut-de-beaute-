# Institut de Beauté du Jardin Anglais — proiect site

## Ce conține acest folder
- `index.html` — site-ul public (pagina principală, categoriile, formularul de rezervare)
- `api/book.js` — funcția care trimite emailul de confirmare prin Brevo, atunci când cineva rezervă de pe site
- `package.json` — fișier tehnic necesar pentru Vercel

## Cum îl public (pe scurt)
1. Urci acest folder întreg pe Vercel (ori direct din interfața lor, ori legat de un cont GitHub — te ghidez la momentul respectiv).
2. În setările proiectului de pe Vercel, la **Environment Variables**, adaugi:
   - `BREVO_API_KEY` = cheia generată în Brevo (SMTP & API → API Keys)
   - `SALON_EMAIL` = emailul unde vrei să primești și tu notificare la fiecare rezervare nouă
   - `SALON_NAME` = Institut de Beauté du Jardin Anglais
3. Publici (Deploy). De acolo, formularul de rezervare de pe site trimite automat emailul de confirmare către clientă, plus o notificare către emailul salonului.
4. Legi domeniul `institutjardinanglais.fr` de proiectul de pe Vercel, din secțiunea Domains.

## Ce nu face încă
- Reamintirea automată cu 24h/48h înainte de programare — asta are nevoie de o bază de date (Supabase) care ține minte programările, plus o mică funcție care rulează zilnic. E următorul pas, după ce site-ul e live.
- Agenda ta internă (fișierul separat `jardin-anglais-agenda-exemplu.html`) încă salvează doar local, în acest browser — va fi conectată la aceeași bază de date când facem pasul cu Supabase.
