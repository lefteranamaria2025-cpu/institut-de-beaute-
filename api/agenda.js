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
  .att-btn{
    background:#fff; border:1px solid var(--line); color:var(--mocha); opacity:0.55;
    padding:4px 10px; border-radius:14px; font-size:0.7rem; cursor:pointer; font-family:'Jost',sans-serif;
  }
  .att-btn.active{opacity:1; font-weight:500;}
  .att-btn.att-prezent.active{background:rgba(122,140,108,0.15); border-color:var(--ok); color:var(--ok);}
  .att-btn.att-absent.active{background:rgba(181,69,58,0.12); border-color:#b5453a; color:#b5453a;}
  .att-btn.att-in_asteptare.active{background:rgba(184,147,95,0.15); border-color:var(--gold); color:var(--gold);}
  .slot-suggest-btn{
    background:#fff; border:1px solid var(--line); color:var(--mocha); padding:7px 14px; border-radius:16px;
    font-family:'Jost',sans-serif; font-size:0.82rem; cursor:pointer; transition:all .15s ease;
  }
  .slot-suggest-btn:hover{border-color:var(--gold);}
  .slot-suggest-btn.chosen{background:var(--mocha); color:#fff; border-color:var(--mocha);}
  .name-sugg-item{
    padding:10px 14px; cursor:pointer; font-size:0.92rem; border-bottom:1px solid var(--line);
    display:flex; justify-content:space-between; align-items:center; gap:10px;
  }
  .name-sugg-item:last-child{border-bottom:none;}
  .name-sugg-item:hover{background:var(--cream-deep);}
  .name-sugg-item .sugg-meta{font-size:0.75rem; opacity:0.55;}
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
      <div class="field" style="position:relative;">
        <label for="cname">Nume clientă</label>
        <input type="text" id="cname" required placeholder="Ex. Claire Dubois" autocomplete="off">
        <div id="nameSuggestions" style="display:none; position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 10px 24px rgba(0,0,0,0.1); z-index:20; max-height:220px; overflow-y:auto;"></div>
      </div>
      <div id="clientHistoryBox" style="display:none; margin:-8px 0 18px; padding:14px 16px; background:var(--cream-deep); border-radius:6px; border:1px solid var(--line);"></div>
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
      <div class="field" id="dureeField">
        <label>Durată &mdash; poți modifica</label>
        <div style="display:flex; gap:10px; align-items:center;">
          <input type="number" id="cdureeH" min="0" max="12" placeholder="0" value="1" style="width:70px;"><span style="font-size:0.85rem; opacity:0.6;">ore</span>
          <input type="number" id="cdureeM" min="0" max="55" step="5" placeholder="0" value="0" style="width:70px;"><span style="font-size:0.85rem; opacity:0.6;">min</span>
        </div>
        <div id="dureeHint" style="font-size:0.78rem; color:var(--gold); margin-top:4px;"></div>
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
      <div id="suggestedSlotsBox" style="margin:-6px 0 18px; display:none;">
        <div style="font-size:0.72rem; letter-spacing:0.08em; text-transform:uppercase; opacity:0.55; margin-bottom:8px;">Sloturi libere sugerate (poți alege sau scrie orice oră vrei)</div>
        <div id="suggestedSlotsGrid" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
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
    <div style="position:relative; margin-bottom:30px; padding-bottom:26px; border-bottom:1px solid var(--line);">
      <span class="script">căutare rapidă</span>
      <h2 style="font-size:1.2rem; margin:6px 0 14px;">Caută o clientă</h2>
      <input type="text" id="clientSearchBox" placeholder="Scrie un nume..." autocomplete="off"
        style="width:100%; padding:11px 14px; border:1px solid var(--line); border-radius:6px; font-family:'Jost',sans-serif; font-size:0.95rem; outline:none;">
      <div id="searchSuggestions" style="display:none; position:absolute; top:100%; left:0; right:0; margin-top:2px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 10px 24px rgba(0,0,0,0.1); z-index:20; max-height:220px; overflow-y:auto;"></div>
      <div id="searchResultBox" style="display:none; margin-top:16px; padding:18px 20px; background:var(--cream-deep); border-radius:6px; border:1px solid var(--line);"></div>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; margin-bottom:6px;">
      <h2 style="margin-bottom:0;">Programările tale</h2>
      <div class="view-toggle">
        <button class="toggle-btn active" id="btnListView" onclick="setView('list')">Listă</button>
        <button class="toggle-btn" id="btnCalView" onclick="setView('calendar')">Calendar</button>
      </div>
    </div>
    <div class="sub" id="countLabel">Se încarcă...</div>
    <div id="listFilterToggle" class="view-toggle" style="margin-bottom:16px; width:fit-content;">
      <button class="toggle-btn active" id="btnFilterToday" onclick="setListFilter('today')">Azi</button>
      <button class="toggle-btn" id="btnFilterAll" onclick="setListFilter('all')">Toate</button>
    </div>

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
  var listFilter = 'today';
  var calMonth = new Date().getMonth();
  var calYear = new Date().getFullYear();

  function setView(v){
    currentView = v;
    document.getElementById('listView').style.display = v === 'list' ? 'block' : 'none';
    document.getElementById('calendarView').style.display = v === 'calendar' ? 'block' : 'none';
    document.getElementById('listFilterToggle').style.display = v === 'list' ? 'flex' : 'none';
    document.getElementById('btnListView').classList.toggle('active', v === 'list');
    document.getElementById('btnCalView').classList.toggle('active', v === 'calendar');
    if(v === 'calendar'){ renderCalendar(); } else { render(); }
  }
  window.setView = setView;

  function setListFilter(f){
    listFilter = f;
    document.getElementById('btnFilterToday').classList.toggle('active', f === 'today');
    document.getElementById('btnFilterAll').classList.toggle('active', f === 'all');
    render();
  }
  window.setListFilter = setListFilter;

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

    var appointmentsHtml = dayClients.length === 0
      ? '<div class="empty" style="padding:20px 10px;">Nicio programare în această zi.</div>'
      : dayClients.map(function(c){
          return '<div class="client-card">' +
            '<div class="client-info">' +
              '<div class="client-name">'+c.name+'</div>' +
              '<div class="client-meta">'+c.service+' &middot; '+c.phone+(c.duree ? ' &middot; '+fmtDuree(c.duree) : '')+'</div>' +
              attendanceButtonsHtml(c.id, c.attendance) +
            '</div>' +
            '<div class="client-when"><div class="date">'+c.time+'</div>' +
            '<button class="remove-btn" onclick="removeClient(\\''+c.id+'\\')">&times; șterge</button></div>' +
          '</div>';
        }).join('');

    var slotsHtml = renderAvailableSlotsForDay(dateStr);

    detail.innerHTML =
      '<div class="day-detail-label">'+fmtDate(dateStr)+' &middot; '+dayClients.length+(dayClients.length===1?' programare':' programări')+'</div>' +
      appointmentsHtml +
      '<div style="margin-top:24px; padding-top:18px; border-top:1px dashed var(--line);">' +
        '<div style="font-size:0.75rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--gold); margin-bottom:10px;">Ore disponibile (durată implicită: 1h)</div>' +
        slotsHtml +
      '</div>';
  }
  window.showDay = showDay;

  function renderAvailableSlotsForDay(dateStr){
    var day = new Date(dateStr + 'T00:00:00').getDay();
    var hours = SALON_HOURS[day];
    if(!hours){
      return '<span style="font-size:0.85rem; opacity:0.55; font-style:italic;">Salon închis conform orarului oficial în această zi.</span>';
    }
    var fullDayClosed = ownerClosures.some(function(cl){ return cl.closure_date === dateStr && !cl.start_time && !cl.end_time; });
    if(fullDayClosed){
      return '<span style="font-size:0.85rem; opacity:0.55; font-style:italic;">Ai blocat toată ziua aceasta.</span>';
    }
    var blockedRanges = ownerClosures.filter(function(cl){
      return cl.closure_date === dateStr && cl.start_time && cl.end_time;
    }).map(function(cl){ return { start: timeToMin(cl.start_time.slice(0,5)), end: timeToMin(cl.end_time.slice(0,5)) }; });

    var takenRanges = clients.filter(function(c){ return c.date === dateStr; }).map(function(c){
      var start = timeToMin(c.time);
      return { start: start, end: start + (c.duree || 60) };
    });

    var duration = 60;
    var openMin = timeToMin(hours.open);
    var closeMin = timeToMin(hours.close);
    var lastStart = closeMin - duration;
    var slots = [];
    for(var t = openMin; t <= lastStart; t += SLOT_STEP){
      var slotEnd = t + duration;
      var overlaps = blockedRanges.concat(takenRanges).some(function(r){ return t < r.end && slotEnd > r.start; });
      if(!overlaps){ slots.push(t); }
    }
    if(slots.length === 0){
      return '<span style="font-size:0.85rem; opacity:0.55; font-style:italic;">Nicio oră liberă în această zi.</span>';
    }
    return '<div style="display:flex; flex-wrap:wrap; gap:8px;">' +
      slots.map(function(m){
        var label = minToTime(m);
        return '<button type="button" class="slot-suggest-btn" onclick="useSlotForNewBooking(\\''+dateStr+'\\', \\''+label+'\\')">'+label+'</button>';
      }).join('') +
    '</div>';
  }

  window.useSlotForNewBooking = function(dateStr, label){
    document.getElementById('cdate').value = dateStr;
    document.getElementById('ctime').value = label;
    setView('list'); setListFilter('all');
    document.getElementById('cname').focus();
    renderSuggestedSlots();
  };

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

  function todayStr(){
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  }

  function render(){
    var listArea = document.getElementById('listArea');
    var countLabel = document.getElementById('countLabel');
    if(clients.length === 0){
      countLabel.textContent = 'Nicio programare încă';
      listArea.innerHTML = '<div class="empty">Agenda e goală &mdash; adaugă prima programare din stânga.</div>';
      return;
    }
    var base = (currentView === 'list' && listFilter === 'today')
      ? clients.filter(function(c){ return c.date === todayStr(); })
      : clients;
    var sorted = base.slice().sort(function(a,b){
      return new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time);
    });
    if(sorted.length === 0){
      countLabel.textContent = (listFilter === 'today') ? 'Nicio programare azi' : 'Nicio programare';
      listArea.innerHTML = '<div class="empty">'+(listFilter === 'today' ? 'Nicio programare astăzi.' : 'Nicio programare încă.')+'</div>';
      if(currentView === 'calendar'){ renderCalendar(); }
      return;
    }
    countLabel.textContent = sorted.length + (sorted.length === 1 ? ' programare' : ' programări') + (listFilter === 'today' ? ' azi' : '');
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
          attendanceButtonsHtml(c.id, c.attendance) +
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

  function attendanceButtonsHtml(id, attendance){
    attendance = attendance || 'in_asteptare';
    function btn(status, label){
      var active = attendance === status ? ' active' : '';
      return '<button type="button" class="att-btn att-'+status+active+'" onclick="setAttendance(\\''+id+'\\', \\''+status+'\\')">'+label+'</button>';
    }
    return '<div class="att-row" style="margin-top:8px; display:flex; gap:6px;">' +
      btn('prezent', '&#10003; A venit') +
      btn('absent', '&times; Nu a venit') +
      btn('in_asteptare', '? Încă neștiut') +
    '</div>';
  }

  async function setAttendance(id, status){
    try{
      await fetch('/api/bookings?id=' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: status })
      });
    }catch(e){
      console.error('Nu s-a putut actualiza prezența', e);
    }
    await loadClients();
  }
  window.setAttendance = setAttendance;

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
      duree: r.duree_min,
      attendance: r.attendance || 'in_asteptare'
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
    var totalDuree = (parseInt(document.getElementById('cdureeH').value, 10) || 0) * 60 +
                      (parseInt(document.getElementById('cdureeM').value, 10) || 0);
    var entry = {
      name: document.getElementById('cname').value,
      phone: document.getElementById('cphone').value,
      email: document.getElementById('cemail').value,
      service: serviceSelect.value,
      date: document.getElementById('cdate').value,
      time: document.getElementById('ctime').value,
      reminderHours: parseInt(document.getElementById('creminder').value, 10),
      dureeMin: totalDuree || null
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
        document.getElementById('cdureeH').value = '1';
        document.getElementById('cdureeM').value = '0';
        document.getElementById('dureeHint').textContent = '';
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

  function updateDureeHint(){
    var hInput = document.getElementById('cdureeH');
    var mInput = document.getElementById('cdureeM');
    var hint = document.getElementById('dureeHint');
    var startTime = document.getElementById('ctime').value;
    var minutes = (parseInt(hInput.value, 10) || 0) * 60 + (parseInt(mInput.value, 10) || 0);
    if(startTime && minutes){
      var start = new Date('2000-01-01T' + startTime);
      var end = new Date(start.getTime() + minutes*60000);
      var endStr = String(end.getHours()).padStart(2,'0')+':'+String(end.getMinutes()).padStart(2,'0');
      hint.textContent = fmtDuree(minutes) + ' (' + startTime + ' \u2192 ' + endStr + ')';
    } else {
      hint.textContent = '';
    }
  }

  document.getElementById('cservice').addEventListener('change', function(){
    var opt = this.selectedOptions[0];
    var duree = opt ? opt.getAttribute('data-duree') : null;
    // Pre-fill with the standard duration if this service has one — but the
    // fields stay editable, so any duration can be chosen for any service.
    if(duree){
      var totalMin = parseInt(duree, 10);
      document.getElementById('cdureeH').value = Math.floor(totalMin / 60);
      document.getElementById('cdureeM').value = totalMin % 60;
    }
    updateDureeHint();
  });

  document.getElementById('cdureeH').addEventListener('input', updateDureeHint);
  document.getElementById('cdureeM').addEventListener('input', updateDureeHint);
  document.getElementById('ctime').addEventListener('change', function(){
    document.getElementById('cservice').dispatchEvent(new Event('change'));
  });

  // --- Blocare zile / intervale ---
  function fmtClzTime(t){
    return t ? t.slice(0,5) : '';
  }

  var ownerClosures = [];

  async function loadClosures(){
    try{
      var res = await fetch('/api/closures');
      var data = await res.json();
      ownerClosures = data.closures || [];
      renderClosuresList(ownerClosures);
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

  // --- Sugestii de sloturi libere (informativ, nu restrictiv) ---
  var SALON_HOURS = {
    1: { open: '10:00', close: '18:30' }, // luni
    2: { open: '10:00', close: '18:30' }, // marți
    4: { open: '10:00', close: '18:30' }, // joi
    5: { open: '10:00', close: '18:30' }, // vineri
    6: { open: '10:00', close: '16:00' }  // sâmbătă
    // 0 (duminică) și 3 (miercuri): închis
  };
  var SLOT_STEP = 30;

  function timeToMin(t){ var p = t.split(':'); return parseInt(p[0],10)*60 + parseInt(p[1],10); }
  function minToTime(m){ return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }

  function renderSuggestedSlots(){
    var dateEl = document.getElementById('cdate');
    var box = document.getElementById('suggestedSlotsBox');
    var grid = document.getElementById('suggestedSlotsGrid');
    if(!dateEl.value){ box.style.display = 'none'; return; }

    var day = new Date(dateEl.value + 'T00:00:00').getDay();
    var hours = SALON_HOURS[day];
    var duration = (parseInt(document.getElementById('cdureeH').value,10)||0)*60 + (parseInt(document.getElementById('cdureeM').value,10)||0);
    if(!duration) duration = 60;

    box.style.display = 'block';

    if(!hours){
      grid.innerHTML = '<span style="font-size:0.85rem; opacity:0.55; font-style:italic;">Salonul e închis în această zi (marcat ca atare în orarul oficial) &mdash; poți totuși nota o programare, dacă e cazul.</span>';
      return;
    }

    var fullDayClosed = ownerClosures.some(function(cl){ return cl.closure_date === dateEl.value && !cl.start_time && !cl.end_time; });
    if(fullDayClosed){
      grid.innerHTML = '<span style="font-size:0.85rem; opacity:0.55; font-style:italic;">Ai blocat toată ziua aceasta.</span>';
      return;
    }

    var blockedRanges = ownerClosures.filter(function(cl){
      return cl.closure_date === dateEl.value && cl.start_time && cl.end_time;
    }).map(function(cl){
      return { start: timeToMin(cl.start_time.slice(0,5)), end: timeToMin(cl.end_time.slice(0,5)) };
    });

    var takenRanges = clients.filter(function(c){ return c.date === dateEl.value; }).map(function(c){
      var start = timeToMin(c.time);
      return { start: start, end: start + (c.duree || 60) };
    });

    var openMin = timeToMin(hours.open);
    var closeMin = timeToMin(hours.close);
    var lastStart = closeMin - duration;

    var slots = [];
    for(var t = openMin; t <= lastStart; t += SLOT_STEP){
      var slotEnd = t + duration;
      var overlaps = blockedRanges.concat(takenRanges).some(function(r){ return t < r.end && slotEnd > r.start; });
      if(!overlaps){ slots.push(t); }
    }

    if(slots.length === 0){
      grid.innerHTML = '<span style="font-size:0.85rem; opacity:0.55; font-style:italic;">Nu mai e niciun interval liber în ziua asta, cu durata aleasă &mdash; dar poți suprapune manual, dacă vrei.</span>';
      return;
    }

    grid.innerHTML = slots.map(function(m){
      var label = minToTime(m);
      return '<button type="button" class="slot-suggest-btn" onclick="chooseSuggestedSlot(this, \\''+label+'\\')">'+label+'</button>';
    }).join('');
  }

  window.chooseSuggestedSlot = function(btn, label){
    document.getElementById('ctime').value = label;
    document.querySelectorAll('.slot-suggest-btn').forEach(function(b){ b.classList.remove('chosen'); });
    btn.classList.add('chosen');
    updateDureeHint();
  };

  document.getElementById('cdate').addEventListener('change', renderSuggestedSlots);
  document.getElementById('cdureeH').addEventListener('input', renderSuggestedSlots);
  document.getElementById('cdureeM').addEventListener('input', renderSuggestedSlots);

  // --- Istoric clientă (după nume) + sugestii de selecție rapidă ---
  var historyAutofillDone = false;

  function attendanceLabel(a){
    if(a === 'prezent') return '<span style="color:var(--ok);">&#10003; a venit</span>';
    if(a === 'absent') return '<span style="color:#b5453a;">&times; nu a venit</span>';
    return '<span style="color:var(--gold);">? neștiut</span>';
  }

  function showHistoryFor(name){
    var box = document.getElementById('clientHistoryBox');
    var matches = clients.filter(function(c){ return (c.name||'').toLowerCase() === name.toLowerCase(); });
    if(matches.length === 0){ box.style.display = 'none'; return; }

    matches.sort(function(a,b){ return new Date(b.date+'T'+b.time) - new Date(a.date+'T'+a.time); });

    var prezent = matches.filter(function(c){ return c.attendance === 'prezent'; }).length;
    var absent = matches.filter(function(c){ return c.attendance === 'absent'; }).length;
    var neștiut = matches.length - prezent - absent;

    var rows = matches.slice(0, 6).map(function(c){
      return '<div style="display:flex; justify-content:space-between; gap:10px; font-size:0.82rem; padding:4px 0;">' +
        '<span>'+fmtDate(c.date)+' &middot; '+c.service+'</span>' + attendanceLabel(c.attendance) +
      '</div>';
    }).join('');

    box.style.display = 'block';
    box.innerHTML =
      '<div style="font-size:0.78rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--gold); margin-bottom:8px;">' +
        matches.length + ' programări anterioare &middot; ' + prezent + ' au venit, ' + absent + ' nu au venit, ' + neștiut + ' neștiut' +
      '</div>' + rows + (matches.length > 6 ? '<div style="font-size:0.78rem; opacity:0.5; margin-top:6px;">...și încă '+(matches.length-6)+'</div>' : '');

    var exact = matches[0];
    if(exact && !historyAutofillDone){
      var phoneEl = document.getElementById('cphone');
      var emailEl = document.getElementById('cemail');
      if(!phoneEl.value && exact.phone){ phoneEl.value = exact.phone; }
      if(!emailEl.value && exact.email){ emailEl.value = exact.email; }
      historyAutofillDone = true;
    }
  }

  window.selectClientSuggestion = function(name){
    document.getElementById('cname').value = name;
    document.getElementById('nameSuggestions').style.display = 'none';
    historyAutofillDone = false;
    showHistoryFor(name);
  };

  document.getElementById('cname').addEventListener('input', function(){
    var query = this.value.trim().toLowerCase();
    var box = document.getElementById('clientHistoryBox');
    var sugg = document.getElementById('nameSuggestions');

    if(query.length < 2){
      box.style.display = 'none'; sugg.style.display = 'none'; historyAutofillDone = false; return;
    }

    var matches = clients.filter(function(c){ return (c.name||'').toLowerCase().indexOf(query) !== -1; });
    if(matches.length === 0){
      box.style.display = 'none'; sugg.style.display = 'none'; historyAutofillDone = false; return;
    }

    // Dropdown cu nume unice (cea mai recentă programare per nume)
    var byName = {};
    matches.forEach(function(c){
      var key = c.name.toLowerCase();
      if(!byName[key] || new Date(c.date+'T'+c.time) > new Date(byName[key].date+'T'+byName[key].time)){
        byName[key] = c;
      }
    });
    var uniqueNames = Object.keys(byName).map(function(k){ return byName[k]; })
      .sort(function(a,b){ return a.name.localeCompare(b.name); });

    sugg.style.display = 'block';
    sugg.innerHTML = uniqueNames.map(function(c){
      var count = matches.filter(function(m){ return m.name.toLowerCase() === c.name.toLowerCase(); }).length;
      return '<div class="name-sugg-item" onclick="selectClientSuggestion(\\''+c.name.replace(/'/g,"\\'")+'\\')">' +
        '<span>'+c.name+'</span><span class="sugg-meta">'+(c.phone||'')+' &middot; '+count+' programări</span>' +
      '</div>';
    }).join('');

    // Afișează istoricul live pe măsură ce scrie, dacă potrivirea e deja exactă
    var exactMatch = matches.some(function(c){ return (c.name||'').toLowerCase() === query; });
    if(exactMatch){ showHistoryFor(query); } else { box.style.display = 'none'; }
  });

  document.addEventListener('click', function(e){
    var sugg = document.getElementById('nameSuggestions');
    if(sugg && !e.target.closest('#cname') && !e.target.closest('#nameSuggestions')){
      sugg.style.display = 'none';
    }
  });

  // --- Căutare independentă: istoricul oricărei cliente, fără a adăuga o programare ---
  document.getElementById('clientSearchBox').addEventListener('input', function(){
    var query = this.value.trim().toLowerCase();
    var sugg = document.getElementById('searchSuggestions');
    var resultBox = document.getElementById('searchResultBox');

    if(query.length < 2){ sugg.style.display = 'none'; resultBox.style.display = 'none'; return; }

    var matches = clients.filter(function(c){ return (c.name||'').toLowerCase().indexOf(query) !== -1; });
    if(matches.length === 0){ sugg.style.display = 'none'; resultBox.style.display = 'none'; return; }

    var byName = {};
    matches.forEach(function(c){
      var key = c.name.toLowerCase();
      if(!byName[key] || new Date(c.date+'T'+c.time) > new Date(byName[key].date+'T'+byName[key].time)){
        byName[key] = c;
      }
    });
    var uniqueNames = Object.keys(byName).map(function(k){ return byName[k]; })
      .sort(function(a,b){ return a.name.localeCompare(b.name); });

    sugg.style.display = 'block';
    sugg.innerHTML = uniqueNames.map(function(c){
      var count = matches.filter(function(m){ return m.name.toLowerCase() === c.name.toLowerCase(); }).length;
      return '<div class="name-sugg-item" onclick="showSearchResult(\\''+c.name.replace(/'/g,"\\'")+'\\')">' +
        '<span>'+c.name+'</span><span class="sugg-meta">'+(c.phone||'')+' &middot; '+count+' programări</span>' +
      '</div>';
    }).join('');
  });

  window.showSearchResult = function(name){
    document.getElementById('clientSearchBox').value = name;
    document.getElementById('searchSuggestions').style.display = 'none';
    var resultBox = document.getElementById('searchResultBox');
    var matches = clients.filter(function(c){ return (c.name||'').toLowerCase() === name.toLowerCase(); })
      .sort(function(a,b){ return new Date(b.date+'T'+b.time) - new Date(a.date+'T'+a.time); });
    if(matches.length === 0){ resultBox.style.display = 'none'; return; }

    var prezent = matches.filter(function(c){ return c.attendance === 'prezent'; }).length;
    var absent = matches.filter(function(c){ return c.attendance === 'absent'; }).length;
    var neștiut = matches.length - prezent - absent;

    var rows = matches.map(function(c){
      return '<div style="display:flex; justify-content:space-between; gap:10px; font-size:0.88rem; padding:6px 0; border-bottom:1px dashed var(--line);">' +
        '<span>'+fmtDate(c.date)+' &middot; '+c.time+' &middot; '+c.service+'</span>' + attendanceLabel(c.attendance) +
      '</div>';
    }).join('');

    resultBox.style.display = 'block';
    resultBox.innerHTML =
      '<div style="font-family:\\'Playfair Display\\',serif; font-size:1.1rem; color:var(--mocha); margin-bottom:4px;">'+matches[0].name+'</div>' +
      '<div style="font-size:0.85rem; opacity:0.65; margin-bottom:12px;">'+(matches[0].phone||'—')+' &middot; '+(matches[0].email||'—')+'</div>' +
      '<div style="font-size:0.78rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--gold); margin-bottom:10px;">' +
        matches.length + ' programări &middot; ' + prezent + ' au venit, ' + absent + ' nu au venit, ' + neștiut + ' neștiut' +
      '</div>' + rows;
  };

  document.addEventListener('click', function(e){
    var sugg = document.getElementById('searchSuggestions');
    if(sugg && !e.target.closest('#clientSearchBox') && !e.target.closest('#searchSuggestions')){
      sugg.style.display = 'none';
    }
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
