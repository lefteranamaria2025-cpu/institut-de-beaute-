// Vercel serverless function: /api/clienti
// Serves the private client-dossier page (confidential), protected by the
// same HTTP Basic Auth as /agenda.
//
// Required environment variables: ADMIN_USER, ADMIN_PASSWORD

const CLIENTI_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dosarele clientelor — Jardin Anglais</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --cream:#F6F0E6; --cream-deep:#EFE6D6; --mocha:#4A342E; --ink:#2B211D;
    --gold:#B8935F; --line:rgba(74,52,46,0.16);
  }
  *{box-sizing:border-box; margin:0; padding:0;}
  body{background:var(--cream); color:var(--ink); font-family:'Jost',sans-serif; font-weight:300; min-height:100vh;}
  h1,h2,h3{font-family:'Playfair Display',serif; font-weight:500; color:var(--mocha);}
  .script{font-family:'Jost',sans-serif; font-weight:400; letter-spacing:0.24em; text-transform:uppercase; color:var(--gold); font-size:0.72rem;}

  header{padding:30px 6%; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px;}
  .brand{font-size:1.1rem;}
  header .tagline{font-size:0.78rem; opacity:0.55;}

  .wrap{max-width:900px; margin:0 auto; padding:44px 6%;}
  .search-row{margin-bottom:26px;}
  .search-row input{
    width:100%; padding:12px 16px; border:1px solid var(--line); border-radius:30px; background:#fff;
    font-family:'Jost',sans-serif; font-size:0.95rem; outline:none;
  }
  .search-row input:focus{border-color:var(--gold);}

  .client-card{
    background:#fff; border:1px solid var(--line); border-radius:8px; padding:22px 24px; margin-bottom:16px; cursor:pointer;
  }
  .client-card-head{display:flex; align-items:center; justify-content:space-between;}
  .client-name{font-family:'Playfair Display',serif; font-size:1.15rem; color:var(--mocha);}
  .client-meta{font-size:0.85rem; opacity:0.65; margin-top:4px;}
  .client-consents-count{font-size:0.75rem; color:var(--gold); text-transform:uppercase; letter-spacing:0.06em;}
  .client-detail{display:none; margin-top:18px; padding-top:18px; border-top:1px dashed var(--line);}
  .client-card.open .client-detail{display:block;}

  .detail-row{display:flex; gap:8px; font-size:0.9rem; margin-bottom:8px;}
  .detail-row .label{opacity:0.55; min-width:140px; text-transform:uppercase; font-size:0.72rem; letter-spacing:0.06em;}

  .consent-badge{
    display:inline-flex; align-items:center; gap:6px; background:rgba(184,147,95,0.12); color:var(--gold);
    padding:5px 12px; border-radius:20px; font-size:0.78rem; margin:4px 6px 0 0;
  }
  .no-consents{font-size:0.85rem; opacity:0.5; font-style:italic; margin-top:8px;}

  .delete-btn{
    background:none; border:1px solid var(--line); color:#b5453a; padding:7px 14px; border-radius:20px;
    font-size:0.75rem; cursor:pointer; margin-top:14px;
  }
  .empty{text-align:center; padding:60px 20px; opacity:0.55; font-style:italic; font-family:'Playfair Display',serif;}
</style>
</head>
<body>

<header>
  <div class="brand">Jardin Anglais &mdash; Dosarele clientelor</div>
  <div class="tagline">Confidențial &middot; acces restricționat</div>
</header>

<div class="wrap">
  <div class="search-row">
    <input type="text" id="searchBox" placeholder="Caută după nume, telefon sau email...">
  </div>
  <div id="countLabel" style="font-size:0.85rem; opacity:0.6; margin-bottom:20px;">Se încarcă...</div>
  <div id="clientsList"></div>
</div>

<script>
  var allClients = [];

  function fmtDate(d){
    if(!d) return '—';
    var parts = d.split('-');
    var months = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','noi','dec'];
    return parts[2] + ' ' + months[parseInt(parts[1],10)-1] + ' ' + parts[0];
  }

  async function loadClients(){
    try{
      var res = await fetch('/api/clients');
      var data = await res.json();
      allClients = data.clients || [];
      render(allClients);
    }catch(e){
      console.error('Nu s-au putut încărca dosarele', e);
      document.getElementById('countLabel').textContent = 'Eroare la încărcare';
    }
  }

  function render(list){
    var container = document.getElementById('clientsList');
    var countLabel = document.getElementById('countLabel');
    countLabel.textContent = list.length + (list.length === 1 ? ' dosar' : ' dosare');

    if(list.length === 0){
      container.innerHTML = '<div class="empty">Niciun dosar momentan.</div>';
      return;
    }

    container.innerHTML = list.map(function(c){
      var consentsHtml = (c.consents && c.consents.length > 0)
        ? c.consents.map(function(co){
            var detailsHtml = renderConsentDetails(co.details);
            return '<div style="margin-bottom:14px;">' +
              '<span class="consent-badge">&#10003; ' + co.treatment_type + ' &middot; semnat de ' + co.signed_name + ' &middot; ' + fmtDate((co.signed_at||'').slice(0,10)) + '</span>' +
              detailsHtml +
            '</div>';
          }).join('')
        : '<div class="no-consents">Niciun consimțământ semnat încă.</div>';

      return '<div class="client-card" data-id="'+c.id+'">' +
        '<div class="client-card-head" onclick="toggleCard(\\''+c.id+'\\')">' +
          '<div>' +
            '<div class="client-name">'+c.name+'</div>' +
            '<div class="client-meta">'+(c.phone||'—')+' &middot; '+(c.email||'—')+'</div>' +
          '</div>' +
          '<div class="client-consents-count">'+(c.consents ? c.consents.length : 0)+' consimțăminte</div>' +
        '</div>' +
        '<div class="client-detail">' +
          '<div class="detail-row"><span class="label">Data nașterii</span><span>'+fmtDate(c.birth_date)+'</span></div>' +
          '<div class="detail-row"><span class="label">Adresă</span><span>'+(c.address||'—')+'</span></div>' +
          '<div class="detail-row"><span class="label">Notițe medicale</span><span>'+(c.medical_notes||'—')+'</span></div>' +
          '<div class="detail-row"><span class="label">Fișă creată</span><span>'+fmtDate((c.created_at||'').slice(0,10))+'</span></div>' +
          '<div style="margin-top:14px;"><strong style="font-size:0.78rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--gold);">Consimțăminte semnate</strong></div>' +
          '<div style="margin-top:10px;">'+consentsHtml+'</div>' +
          '<div class="sessions-block" style="margin-top:22px; padding-top:18px; border-top:1px dashed var(--line);">' +
            '<strong style="font-size:0.78rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--gold);">Istoric ședințe</strong>' +
            '<div id="sessions-'+c.id+'" style="margin-top:12px;"><span style="font-size:0.85rem; opacity:0.5;">Se încarcă...</span></div>' +
            '<form onsubmit="return addSession(event, \\''+c.id+'\\')" style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">' +
              '<div><label style="font-size:0.68rem; text-transform:uppercase; opacity:0.55; display:block; margin-bottom:4px;">Data</label><input type="date" required style="border:1px solid var(--line); border-radius:4px; padding:6px 8px; font-family:inherit;" class="s-date"></div>' +
              '<div><label style="font-size:0.68rem; text-transform:uppercase; opacity:0.55; display:block; margin-bottom:4px;">Procedură</label><input type="text" required placeholder="Ex. Epilare laser axilă" style="border:1px solid var(--line); border-radius:4px; padding:6px 8px; font-family:inherit; min-width:180px;" class="s-proc"></div>' +
              '<div style="flex:1; min-width:160px;"><label style="font-size:0.68rem; text-transform:uppercase; opacity:0.55; display:block; margin-bottom:4px;">Notițe</label><input type="text" placeholder="Observații, rezultate..." style="border:1px solid var(--line); border-radius:4px; padding:6px 8px; font-family:inherit; width:100%;" class="s-notes"></div>' +
              '<button type="submit" style="background:var(--mocha); color:#fff; border:none; padding:8px 16px; border-radius:20px; font-size:0.78rem; cursor:pointer;">Adaugă</button>' +
            '</form>' +
          '</div>' +
          '<button class="delete-btn" onclick="event.stopPropagation(); removeClient(\\''+c.id+'\\')">&times; șterge dosarul</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderConsentDetails(details){
    if(!details) return '';
    var lines = [];
    Object.keys(details).forEach(function(key){
      var val = details[key];
      if(val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)){ return; }
      if(Array.isArray(val)){ val = val.join(', '); }
      if(val === true){ val = 'Da'; }
      if(val === false){ return; }
      lines.push('<div style="font-size:0.82rem; opacity:0.75; margin:3px 0 3px 12px;"><em style="opacity:0.6;">'+key+':</em> '+val+'</div>');
    });
    return lines.join('');
  }

  var loadedSessions = {};

  async function loadSessionsFor(clientId){
    var box = document.getElementById('sessions-'+clientId);
    try{
      var res = await fetch('/api/sessions?clientId=' + encodeURIComponent(clientId));
      var data = await res.json();
      var sessions = data.sessions || [];
      loadedSessions[clientId] = sessions;
      renderSessionsBox(clientId, sessions);
    }catch(e){
      console.error(e);
      if(box) box.innerHTML = '<span style="font-size:0.85rem; opacity:0.5;">Eroare la încărcare.</span>';
    }
  }

  function renderSessionsBox(clientId, sessions){
    var box = document.getElementById('sessions-'+clientId);
    if(!box) return;
    if(sessions.length === 0){
      box.innerHTML = '<span style="font-size:0.85rem; opacity:0.5; font-style:italic;">Nicio ședință notată încă.</span>';
      return;
    }
    box.innerHTML = sessions.map(function(s){
      return '<div style="display:flex; justify-content:space-between; gap:10px; font-size:0.85rem; padding:6px 0; border-bottom:1px dashed var(--line);">' +
        '<span><strong>'+fmtDate(s.session_date)+'</strong> &middot; '+s.procedure_type+(s.notes ? ' &middot; '+s.notes : '')+'</span>' +
        '<button onclick="removeSession(\\''+s.id+'\\', \\''+clientId+'\\')" style="background:none; border:none; color:#b5453a; opacity:0.5; cursor:pointer;">&times;</button>' +
      '</div>';
    }).join('');
  }

  window.addSession = function(e, clientId){
    e.preventDefault();
    var form = e.target;
    var payload = {
      clientId: clientId,
      date: form.querySelector('.s-date').value,
      procedureType: form.querySelector('.s-proc').value,
      notes: form.querySelector('.s-notes').value
    };
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(){ form.reset(); loadSessionsFor(clientId); })
      .catch(function(err){ console.error(err); alert('Eroare la salvare.'); });
    return false;
  };

  window.removeSession = function(id, clientId){
    fetch('/api/sessions?id=' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function(){ loadSessionsFor(clientId); })
      .catch(function(err){ console.error(err); });
  };

  function toggleCard(id){
    var card = document.querySelector('.client-card[data-id="'+id+'"]');
    if(card){
      card.classList.toggle('open');
      if(card.classList.contains('open') && !loadedSessions[id]){
        loadSessionsFor(id);
      }
    }
  }
  window.toggleCard = toggleCard;

  async function removeClient(id){
    if(!confirm('Ștergi definitiv acest dosar? Nu poate fi recuperat.')) return;
    try{
      await fetch('/api/clients?id=' + encodeURIComponent(id), { method: 'DELETE' });
    }catch(e){
      console.error(e);
    }
    loadClients();
  }
  window.removeClient = removeClient;

  document.getElementById('searchBox').addEventListener('input', function(){
    var q = this.value.toLowerCase();
    var filtered = allClients.filter(function(c){
      return (c.name||'').toLowerCase().includes(q) ||
             (c.phone||'').toLowerCase().includes(q) ||
             (c.email||'').toLowerCase().includes(q);
    });
    render(filtered);
  });

  loadClients();
</script>

</body>
</html>
`;

export default function handler(req, res) {
  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    res.status(500).send('Configuration serveur manquante (ADMIN_USER / ADMIN_PASSWORD).');
    return;
  }

  const authHeader = req.headers.authorization || '';
  const expected = 'Basic ' + Buffer.from(ADMIN_USER + ':' + ADMIN_PASSWORD).toString('base64');

  if (authHeader !== expected) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Agenda privee"');
    res.status(401).send('Acces refuse. Identifiants requis.');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(CLIENTI_HTML);
}
