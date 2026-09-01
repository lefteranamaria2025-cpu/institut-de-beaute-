// Vercel serverless function: /api/agenda
// Serves the private salon agenda page, protected by HTTP Basic Auth.
// Only the salon owner (with the correct username/password) can view it.
//
// Required environment variables (set in Vercel, never in this file):
//   ADMIN_USER      -> the username the owner will type in the login prompt
//   ADMIN_PASSWORD  -> the password the owner will type in the login prompt

const AGENDA_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agenda &mdash; Jardin Anglais</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Great+Vibes&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --cream:#F6F0E6; --cream-deep:#EFE6D6; --mocha:#4A342E; --ink:#2B211D;
    --gold:#B8935F; --gold-soft:#D9C29B; --blush:#D9A79C; --line:rgba(74,52,46,0.16);
    --ok:#7A8C6C;
  }
  *{box-sizing:border-box; margin:0; padding:0;}
  body{background:var(--cream); color:var(--ink); font-family:'Jost',sans-serif; font-weight:300; min-height:100vh;}
  h1,h2,h3{font-family:'Playfair Display',serif; font-weight:500; color:var(--mocha);}
  .script{font-family:'Jost',sans-serif; font-weight:400; letter-spacing:0.28em; text-transform:uppercase; font-size:0.75rem; color:var(--gold);}

  header{
    padding:34px 6% 26px; border-bottom:1px solid var(--line);
    display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;
  }
  .brand{font-family:'Playfair Display',serif; font-size:1.15rem;}
  .brand span{font-family:'Playfair Display',serif; font-style:italic; color:var(--gold); font-size:1.15rem;}
  header .tagline{font-size:0.8rem; opacity:0.6; letter-spacing:0.05em;}

  .layout{
    display:grid; grid-template-columns:380px 1fr; gap:0; min-height:calc(100vh - 100px);
  }
  .panel-add{
    padding:44px 40px; border-right:1px solid var(--line); background:var(--cream-deep);
  }
  .panel-add .script{display:block; margin-bottom:10px;}
  .panel-add h2{font-size:1.4rem; margin-bottom:26px;}

  .field{display:flex; flex-direction:column; gap:7px; margin-bottom:18px;}
  .field label{font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--mocha); opacity:0.7;}
  .field input, .field select{
    border:none; border-bottom:1px solid var(--line); background:transparent;
    padding:9px 2px; font-family:'Jost',sans-serif; font-size:0.98rem; color:var(--ink); outline:none;
  }
  .field input:focus, .field select:focus{border-color:var(--gold);}
  .row2{display:flex; gap:14px;}
  .row2 .field{flex:1;}

  button.add-btn{
    width:100%; margin-top:10px; background:var(--mocha); color:var(--cream); border:none;
    padding:15px; border-radius:4px; font-size:0.82rem; letter-spacing:0.1em; text-transform:uppercase;
    cursor:pointer; transition:background .3s ease;
  }
  button.add-btn:hover{background:var(--ink);}

  .panel-list{padding:44px 48px; overflow-y:auto;}
  .panel-list h2{font-size:1.4rem; margin-bottom:6px;}
  .panel-list .sub{font-size:0.85rem; opacity:0.6; margin-bottom:30px;}

  .empty{
    text-align:center; padding:70px 20px; opacity:0.55; font-style:italic; font-family:'Playfair Display',serif;
  }

  .client-card{
    display:flex; align-items:center; justify-content:space-between; gap:18px;
    padding:20px 22px; background:#fff; border:1px solid var(--line); border-radius:6px; margin-bottom:14px;
  }
  .client-info{display:flex; flex-direction:column; gap:4px;}
  .client-info .badges-row{display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;}
  .client-name{font-family:'Playfair Display',serif; font-size:1.08rem; color:var(--mocha);}
  .client-meta{font-size:0.85rem; opacity:0.7;}
  .client-when{
    text-align:right; font-size:0.85rem;
  }
  .client-when .date{font-family:'Playfair Display',serif; font-style:italic; color:var(--gold); font-size:1rem;}
  .badge{
    display:inline-flex; align-items:center; gap:6px; font-size:0.72rem; letter-spacing:0.06em; text-transform:uppercase;
    padding:5px 12px; border-radius:20px;
  }
  .badge.pending{background:rgba(184,147,95,0.15); color:var(--gold);}
  .badge.sent{background:rgba(122,140,108,0.15); color:var(--ok);}
  .badge .dot{width:6px; height:6px; border-radius:50%; background:currentColor;}
  .remove-btn{
    background:none; border:none; color:var(--mocha); opacity:0.4; cursor:pointer; font-size:1.1rem;
    transition:opacity .2s ease;
  }
  .remove-btn:hover{opacity:1; color:#b5453a;}

  .note-box{
    margin-top:36px; padding:20px 22px; border:1px dashed var(--gold); border-radius:6px; font-size:0.85rem; opacity:0.85;
    display:flex; gap:12px;
  }
  .note-box .dot{width:6px; height:6px; border-radius:50%; background:var(--gold); margin-top:7px; flex-shrink:0;}

  /* VIEW TOGGLE */
  .view-toggle{display:flex; border:1px solid var(--line); border-radius:30px; overflow:hidden;}
  .toggle-btn{
    background:none; border:none; padding:8px 20px; font-family:'Jost',sans-serif; font-size:0.78rem;
    letter-spacing:0.05em; text-transform:uppercase; cursor:pointer; color:var(--mocha); opacity:0.6;
  }
  .toggle-btn.active{background:var(--mocha); color:#fff; opacity:1;}

  /* CALENDAR */
  .cal-header{display:flex; align-items:center; justify-content:space-between; margin:18px 0 14px;}
  .cal-month-label{font-family:'Playfair Display',serif; font-style:italic; font-size:1.15rem; color:var(--mocha);}
  .cal-nav{background:none; border:1px solid var(--line); border-radius:50%; width:32px; height:32px; cursor:pointer; color:var(--mocha); font-size:0.95rem;}
  .cal-grid{display:grid; grid-template-columns:repeat(7,1fr); gap:6px;}
  .cal-dow{text-align:center; font-size:0.68rem; letter-spacing:0.06em; text-transform:uppercase; opacity:0.5; padding-bottom:6px;}
  .cal-day{
    aspect-ratio:1/1; border:1px solid var(--line); border-radius:6px; background:#fff; cursor:pointer;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; position:relative;
    transition:border-color .2s ease;
  }
  .cal-day:hover{border-color:var(--gold);}
  .cal-day.empty{border:none; background:none; cursor:default;}
  .cal-day.today{border-color:var(--gold); border-width:2px;}
  .cal-day.selected{background:var(--mocha); color:#fff;}
  .cal-day .num{font-size:0.85rem;}
  .cal-day .count-dot{
    min-width:16px; height:16px; border-radius:50%; background:var(--gold); color:#fff; font-size:0.62rem;
    display:flex; align-items:center; justify-content:center; padding:0 3px;
  }
  #dayDetail{margin-top:22px;}
  .day-detail-label{font-size:0.75rem; letter-spacing:0.1em; text-transform:uppercase; opacity:0.55; margin-bottom:12px;}

  @media(max-width:820px){
    .layout{grid-template-columns:1fr;}
    .panel-add{border-right:none; border-bottom:1px solid var(--line);}
  }
</style>
</head>
<body>

<header>
  <div class="brand"><span>J</span>ardin Anglais &mdash; Agenda</div>
  <div class="tagline">Uz intern &middot; gestionarea programărilor</div>
</header>

<div class="layout">
  <div class="panel-add">
    <span class="script">adaugă o programare</span>
    <h2>Fișă nouă</h2>

    <form id="addForm">
      <div class="field">
        <label for="cname">Nume clientă</label>
        <input type="text" id="cname" required placeholder="Ex. Claire Dubois">
      </div>
      <div class="field">
        <label for="cphone">Telefon</label>
        <input type="tel" id="cphone" required placeholder="06 12 34 56 78">
      </div>
      <div class="field">
        <label for="cemail">Email (pentru reamintire)</label>
        <input type="email" id="cemail" placeholder="clienta@exemplu.com">
      </div>
      <div class="field">
        <label for="cservice">Serviciu</label>
        <select id="cservice" required>
          <option value="">Selectează</option>
          <optgroup label="Soins de Visage">
            <option data-duree="100">Nettoyage de la peau</option>
            <option data-duree="120">Nettoyage de la peau + Peeling chimique</option>
            <option data-duree="60">Peeling Biorepeel cl3 TCA 35%</option>
            <option data-duree="90">Peeling Biorepeel cl3 TCA 50% corps</option>
            <option data-duree="30">Exfoliant combiné avec 3 acides</option>
            <option data-duree="75">Hydrafacial</option>
            <option data-duree="80">Dermapen</option>
            <option data-duree="80">Dermapen + Peeling Biorepeel</option>
            <option data-duree="45">RF lifting premium</option>
            <option data-duree="30">Masque alginate</option>
            <option data-duree="60">Traitement Casmara</option>
            <option data-duree="60">Soin hydratant</option>
            <option data-duree="30">Détatouage sourcils avec laser</option>
          </optgroup>
          <optgroup label="Épilation à la Cire">
            <option>Sourcils</option>
            <option>Lèvres</option>
            <option>Visage</option>
            <option>Aisselles</option>
            <option>Bras</option>
            <option>Jambes entières</option>
            <option>Maillot brésilien</option>
            <option>Maillot intégral</option>
          </optgroup>
          <optgroup label="Épilation au Laser">
            <option>Épilation laser</option>
          </optgroup>
          <optgroup label="Remodelage Corporel">
            <option>Consultation cryolipolyse</option>
            <option>Consultation V-Shape Platinum</option>
            <option>Vacuum</option>
          </optgroup>
          <optgroup label="Cils &amp; Sourcils">
            <option>Rehaussement des cils</option>
            <option>Rehaussement des sourcils</option>
          </optgroup>
          <optgroup label="Manucure &amp; Pédicure">
            <option>Manucure</option>
            <option>Pédicure</option>
          </optgroup>
        </select>
      </div>
      <div class="field" id="dureeField" style="display:none;">
        <label>Durată estimată</label>
        <div id="dureeDisplay" style="padding:9px 2px; font-size:0.98rem; color:var(--gold); font-style:italic; font-family:'Playfair Display',serif;"></div>
      </div>
      <div class="row2">
        <div class="field">
          <label for="cdate">Data</label>
          <input type="date" id="cdate" required>
        </div>
        <div class="field">
          <label for="ctime">Ora</label>
          <input type="time" id="ctime" required>
        </div>
      </div>
      <div class="field">
        <label for="creminder">Reamintire trimisă cu</label>
        <select id="creminder">
          <option value="24">24 ore înainte</option>
          <option value="48">48 ore înainte</option>
        </select>
      </div>
      <button type="submit" class="add-btn">Adaugă în agendă</button>
    </form>

    <div class="note-box" id="previewBox" style="display:none;">
      <span class="dot"></span>
      <span id="previewText"></span>
    </div>

    <div class="note-box">
      <span class="dot"></span>
      <span>Aici e doar interfața de adăugare. În versiunea live, de îndată ce salvezi o clientă, sistemul trimite singur mesajul personalizat de reamintire (24h sau 48h, cum alegi mai jos) &mdash; fără să mai faci nimic.</span>
    </div>

    <div style="margin-top:40px; padding-top:32px; border-top:1px solid var(--line);">
      <span class="script">urgențe &amp; concedii</span>
      <h2 style="font-size:1.3rem; margin-bottom:20px;">Blochează o zi sau un interval</h2>
      <form id="closureForm">
        <div class="field">
          <label for="clzDate">Data</label>
          <input type="date" id="clzDate" required>
        </div>
        <div class="row2">
          <div class="field">
            <label for="clzStart">De la ora (opțional)</label>
            <input type="time" id="clzStart">
          </div>
          <div class="field">
            <label for="clzEnd">Până la ora (opțional)</label>
            <input type="time" id="clzEnd">
          </div>
        </div>
        <div class="field">
          <label for="clzReason">Motiv (opțional, doar pentru tine)</label>
          <input type="text" id="clzReason" placeholder="Ex. urgență medicală">
        </div>
        <div class="agenda-note">
          <span class="dot"></span>
          <span>Lasă orele goale ca să blochezi toată ziua. Completează-le ca să blochezi doar un interval (ex. 13:00–18:30 pentru jumătate de zi).</span>
        </div>
        <button type="submit" class="add-btn">Blochează</button>
      </form>
      <div id="closuresList" style="margin-top:20px;"></div>
    </div>
  </div>

  <div class="panel-list">
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; margin-bottom:6px;">
      <h2 style="margin-bottom:0;">Programările tale</h2>
      <div class="view-toggle">
        <button class="toggle-btn active" id="btnListView" onclick="setView('list')">Listă</button>
        <button class="toggle-btn" id="btnCalView" onclick="setView('calendar')">Calendar</button>
      </div>
    </div>
    <div class="sub" id="countLabel">Se încarcă...</div>

    <div id="listView">
      <div id="listArea"></div>
    </div>

    <div id="calendarView" style="display:none;">
      <div class="cal-header">
        <button class="cal-nav" onclick="shiftMonth(-1)">&larr;</button>
        <div class="cal-month-label" id="calMonthLabel"></div>
        <button class="cal-nav" onclick="shiftMonth(1)">&rarr;</button>
      </div>
      <div class="cal-grid" id="calGrid"></div>
      <div id="dayDetail"></div>
    </div>
  </div>
</div>

<script>
  var STORAGE_KEY = 'jardin-anglais-clients';
  var clients = [];

  function fmtDate(d){
    var parts = d.split('-');
    var months = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','noi','dec'];
    return parts[2] + ' ' + months[parseInt(parts[1],10)-1] + ' ' + parts[0];
  }

  function buildConfirmMessage(c){
    return 'Bonjour ' + c.name + ', votre rendez-vous à l\\'Institut de Beauté du Jardin Anglais est confirmé : "' +
      c.service + '" le ' + fmtDate(c.date) + ' à ' + c.time + '. À bientôt !';
  }

  function buildMessage(c){
    return 'Bonjour ' + c.name + ', un petit rappel : vous avez rendez-vous à l\\'Institut de Beauté du Jardin Anglais le ' +
      fmtDate(c.date) + ' à ' + c.time + ' pour "' + c.service + '". À très bientôt ! (Envoyé automatiquement ' + c.reminder + 'h avant.)';
  }

  function hoursUntil(dateStr, timeStr){
    var target = new Date(dateStr + 'T' + timeStr);
    return (target - new Date()) / 3600000;
  }

  var currentView = 'list';
  var calMonth = new Date().getMonth();
  var calYear = new Date().getFullYear();

  function setView(v){
    currentView = v;
    document.getElementById('listView').style.display = v === 'list' ? 'block' : 'none';
    document.getElementById('calendarView').style.display = v === 'calendar' ? 'block' : 'none';
    document.getElementById('btnListView').classList.toggle('active', v === 'list');
    document.getElementById('btnCalView').classList.toggle('active', v === 'calendar');
    if(v === 'calendar'){ renderCalendar(); }
  }
  window.setView = setView;

  function shiftMonth(delta){
    calMonth += delta;
    if(calMonth < 0){ calMonth = 11; calYear--; }
    if(calMonth > 11){ calMonth = 0; calYear++; }
    renderCalendar();
  }
  window.shiftMonth = shiftMonth;

  function toLocalDateStr(y,m,d){
    return y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
  }

  function renderCalendar(){
    var monthNames = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
    document.getElementById('calMonthLabel').textContent = monthNames[calMonth] + ' ' + calYear;

    var byDate = {};
    clients.forEach(function(c){
      if(!byDate[c.date]){ byDate[c.date] = []; }
      byDate[c.date].push(c);
    });

    var firstDay = new Date(calYear, calMonth, 1).getDay();
    firstDay = (firstDay + 6) % 7; // make Monday = 0
    var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    var todayStr = toLocalDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    var grid = document.getElementById('calGrid');
    var dowLabels = ['L','Ma','Mi','J','V','S','D'];
    var html = dowLabels.map(function(d){ return '<div class="cal-dow">'+d+'</div>'; }).join('');

    for(var i=0; i<firstDay; i++){ html += '<div class="cal-day empty"></div>'; }
    for(var day=1; day<=daysInMonth; day++){
      var dateStr = toLocalDateStr(calYear, calMonth, day);
      var count = byDate[dateStr] ? byDate[dateStr].length : 0;
      var isToday = dateStr === todayStr ? ' today' : '';
      html += '<div class="cal-day'+isToday+'" onclick="showDay(\\''+dateStr+'\\')">' +
        '<span class="num">'+day+'</span>' +
        (count ? '<span class="count-dot">'+count+'</span>' : '') +
        '</div>';
    }
    grid.innerHTML = html;
  }

  function showDay(dateStr){
    var dayClients = clients.filter(function(c){ return c.date === dateStr; })
      .sort(function(a,b){ return a.time.localeCompare(b.time); });
    var detail = document.getElementById('dayDetail');
    if(dayClients.length === 0){
      detail.innerHTML = '<div class="day-detail-label">'+fmtDate(dateStr)+'</div><div class="empty" style="padding:30px 10px;">Nicio programare în această zi.</div>';
      return;
    }
    detail.innerHTML = '<div class="day-detail-label">'+fmtDate(dateStr)+' &middot; '+dayClients.length+' programări</div>' +
      dayClients.map(function(c){
        return '<div class="client-card">' +
          '<div class="client-info">' +
            '<div class="client-name">'+c.name+'</div>' +
            '<div class="client-meta">'+c.service+' &middot; '+c.phone+(c.duree ? ' &middot; '+fmtDuree(c.duree) : '')+'</div>' +
          '</div>' +
          '<div class="client-when"><div class="date">'+c.time+'</div>' +
          '<button class="remove-btn" onclick="removeClient(\\''+c.id+'\\')">&times; șterge</button></div>' +
        '</div>';
      }).join('');
  }
  window.showDay = showDay;

  function updatePreview(){
    var name = document.getElementById('cname').value || 'Claire Dubois';
    var service = document.getElementById('cservice').value || '[service]';
    var date = document.getElementById('cdate').value;
    var time = document.getElementById('ctime').value || '14:00';
    var reminder = document.getElementById('creminder').value;
    var box = document.getElementById('previewBox');
    var text = document.getElementById('previewText');
    if(!date){ box.style.display = 'none'; return; }
    var fake = {name: name, service: service, date: date, time: time, reminder: reminder};
    text.innerHTML = '<strong>Confirmation (envoyée aujourd\\'hui) :</strong> "' + buildConfirmMessage(fake) + '"' +
      '<br><br><strong>Rappel (' + reminder + 'h avant) :</strong> "' + buildMessage(fake) + '"';
    box.style.display = 'flex';
  }
  ['cname','cservice','cdate','ctime','creminder'].forEach(function(id){
    document.getElementById(id).addEventListener('input', updatePreview);
    document.getElementById(id).addEventListener('change', updatePreview);
  });

  function render(){
    var listArea = document.getElementById('listArea');
    var countLabel = document.getElementById('countLabel');
    if(clients.length === 0){
      countLabel.textContent = 'Nicio programare încă';
      listArea.innerHTML = '<div class="empty">Agenda e goală &mdash; adaugă prima programare din stânga.</div>';
      return;
    }
    var sorted = clients.slice().sort(function(a,b){
      return new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time);
    });
    countLabel.textContent = sorted.length + (sorted.length === 1 ? ' programare' : ' programări');
    listArea.innerHTML = sorted.map(function(c){
      var hrs = hoursUntil(c.date, c.time);
      var threshold = c.reminder || 24;
      var badge = hrs <= threshold && hrs > -1
        ? '<span class="badge sent"><span class="dot"></span>reminder trimis</span>'
        : '<span class="badge pending"><span class="dot"></span>reminder cu '+threshold+'h înainte</span>';
      return '<div class="client-card" data-id="'+c.id+'">' +
        '<div class="client-info">' +
          '<div class="client-name">'+c.name+'</div>' +
          '<div class="client-meta">'+c.service+' &middot; '+c.phone+(c.duree ? ' &middot; '+fmtDuree(c.duree) : '')+'</div>' +
          '<div class="badges-row"><span class="badge sent"><span class="dot"></span>confirmare trimisă</span>' + badge + '</div>' +
        '</div>' +
        '<div class="client-when">' +
          '<div class="date">'+fmtDate(c.date)+'</div>' +
          '<div>'+c.time+'</div>' +
          '<button class="remove-btn" onclick="removeClient(\\''+c.id+'\\')">&times; șterge</button>' +
        '</div>' +
      '</div>';
    }).join('');
    if(currentView === 'calendar'){ renderCalendar(); }
  }

  function rowToClient(r){
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      service: r.service,
      date: r.booking_date,
      time: (r.booking_time || '').slice(0,5),
      reminder: r.reminder_hours,
      duree: r.duree_min
    };
  }

  async function loadClients(){
    try{
      var res = await fetch('/api/bookings');
      if(!res.ok){ throw new Error('HTTP ' + res.status); }
      var data = await res.json();
      clients = (data.bookings || []).map(rowToClient);
    }catch(e){
      console.error('Nu s-au putut încărca programările', e);
      clients = [];
    }
    render();
  }

  async function removeClient(id){
    try{
      await fetch('/api/bookings?id=' + encodeURIComponent(id), { method: 'DELETE' });
    }catch(e){
      console.error('Nu s-a putut șterge', e);
    }
    await loadClients();
  }
  window.removeClient = removeClient;

  document.getElementById('addForm').addEventListener('submit', function(e){
    e.preventDefault();
    var serviceSelect = document.getElementById('cservice');
    var dureeAttr = serviceSelect.selectedOptions[0].getAttribute('data-duree');
    var entry = {
      name: document.getElementById('cname').value,
      phone: document.getElementById('cphone').value,
      email: document.getElementById('cemail').value,
      service: serviceSelect.value,
      date: document.getElementById('cdate').value,
      time: document.getElementById('ctime').value,
      reminderHours: parseInt(document.getElementById('creminder').value, 10),
      dureeMin: dureeAttr ? parseInt(dureeAttr, 10) : null
    };
    var addBtn = e.target.querySelector('.add-btn');
    var originalText = addBtn.textContent;
    addBtn.disabled = true;
    addBtn.textContent = '...';

    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    })
      .then(function(res){ return res.json().then(function(data){ return { ok: res.ok, data: data }; }); })
      .then(function(result){
        addBtn.disabled = false;
        if(!result.ok){
          addBtn.textContent = originalText;
          alert('Eroare: ' + (result.data && result.data.error ? result.data.error : 'necunoscută'));
          return;
        }
        loadClients();
        e.target.reset();
        document.getElementById('previewBox').style.display = 'none';
        document.getElementById('dureeField').style.display = 'none';
        addBtn.textContent = '✓ Programare adăugată';
        setTimeout(function(){ addBtn.textContent = originalText; }, 2600);
      })
      .catch(function(err){
        addBtn.disabled = false;
        addBtn.textContent = originalText;
        console.error(err);
        alert('Eroare la salvare. Încearcă din nou.');
      });
  });

  function fmtDuree(min){
    var h = Math.floor(min/60), m = min%60;
    if(h && m) return h+'h'+String(m).padStart(2,'0');
    if(h) return h+'h';
    return m+'min';
  }

  document.getElementById('cservice').addEventListener('change', function(){
    var opt = this.selectedOptions[0];
    var duree = opt ? opt.getAttribute('data-duree') : null;
    var field = document.getElementById('dureeField');
    var display = document.getElementById('dureeDisplay');
    if(duree){
      var startTime = document.getElementById('ctime').value;
      var durText = fmtDuree(parseInt(duree,10));
      if(startTime){
        var start = new Date('2000-01-01T' + startTime);
        var end = new Date(start.getTime() + parseInt(duree,10)*60000);
        var endStr = String(end.getHours()).padStart(2,'0')+':'+String(end.getMinutes()).padStart(2,'0');
        display.textContent = durText + ' (' + startTime + ' \\u2192 ' + endStr + ')';
      } else {
        display.textContent = durText;
      }
      field.style.display = 'flex';
    } else {
      field.style.display = 'none';
    }
  });
  document.getElementById('ctime').addEventListener('change', function(){
    document.getElementById('cservice').dispatchEvent(new Event('change'));
  });

  // --- Blocare zile / intervale ---
  function fmtClzTime(t){
    return t ? t.slice(0,5) : '';
  }

  async function loadClosures(){
    try{
      var res = await fetch('/api/closures');
      var data = await res.json();
      renderClosuresList(data.closures || []);
    }catch(e){
      console.error('Nu s-au putut încărca blocările', e);
    }
  }

  function renderClosuresList(list){
    var container = document.getElementById('closuresList');
    if(list.length === 0){
      container.innerHTML = '<div class="empty" style="padding:16px 4px;">Nicio zi blocată momentan.</div>';
      return;
    }
    var sorted = list.slice().sort(function(a,b){ return a.closure_date.localeCompare(b.closure_date); });
    container.innerHTML = sorted.map(function(c){
      var whenLabel = fmtDate(c.closure_date);
      var rangeLabel = (c.start_time && c.end_time)
        ? (fmtClzTime(c.start_time) + '–' + fmtClzTime(c.end_time))
        : 'toată ziua';
      return '<div class="client-card">' +
        '<div class="client-info">' +
          '<div class="client-name">'+whenLabel+'</div>' +
          '<div class="client-meta">'+rangeLabel+(c.reason ? ' &middot; '+c.reason : '')+'</div>' +
        '</div>' +
        '<div class="client-when">' +
          '<button class="remove-btn" onclick="removeClosure(\\''+c.id+'\\')">&times; deblochează</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  async function removeClosure(id){
    try{
      await fetch('/api/closures?id=' + encodeURIComponent(id), { method: 'DELETE' });
    }catch(e){
      console.error('Nu s-a putut deploca', e);
    }
    await loadClosures();
  }
  window.removeClosure = removeClosure;

  document.getElementById('closureForm').addEventListener('submit', function(e){
    e.preventDefault();
    var payload = {
      date: document.getElementById('clzDate').value,
      startTime: document.getElementById('clzStart').value || null,
      endTime: document.getElementById('clzEnd').value || null,
      reason: document.getElementById('clzReason').value || null
    };
    var btn = e.target.querySelector('.add-btn');
    var original = btn.textContent;
    btn.disabled = true; btn.textContent = '...';

    fetch('/api/closures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res){ return res.json().then(function(data){ return { ok: res.ok, data: data }; }); })
      .then(function(result){
        btn.disabled = false; btn.textContent = original;
        if(!result.ok){
          alert('Eroare: ' + (result.data && result.data.error ? result.data.error : 'necunoscută'));
          return;
        }
        e.target.reset();
        loadClosures();
      })
      .catch(function(err){
        btn.disabled = false; btn.textContent = original;
        console.error(err);
        alert('Eroare la salvare. Încearcă din nou.');
      });
  });

  loadClosures();
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
  res.status(200).send(AGENDA_HTML);
}
