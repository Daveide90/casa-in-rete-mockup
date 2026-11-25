(function () {
  'use strict';

  /* ---------- utilità ---------- */
  const CHIAVE = 'casa-in-rete-prova-v4f'; // nuova chiave: i dati salvati della prima v4 non servono più
  const clona = o => JSON.parse(JSON.stringify(o));
  // Ogni testo variabile passa da esc() prima di entrare nell'HTML: niente iniezioni.
  // Vale anche per i testi scritti dagli utenti (presentazione, note, motivo dell'aiuto).
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const aChi = n => (/^[aeiouAEIOU]/.test(n) ? 'ad ' : 'a ') + n; // «ad Adele», «a Bruna»
  const euro = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
  const isoData = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daIso = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const dataLunga = s => { const d = daIso(s); return isNaN(d) ? 'data da fissare' : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }); };
  const traGiorni = n => { const d = new Date(OGGI); d.setDate(d.getDate() + n); return isoData(d); };
  const traMesi = (s, m) => { const d = daIso(s); d.setMonth(d.getMonth() + m); return isoData(d); };
  const giorniDa = s => Math.round((OGGI - daIso(s)) / 86400000);
  const opzTesto = (lista, valore) => lista.map(t => `<option${t === valore ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const descr = p => `${p.sesso === 'F' ? 'Donna' : 'Uomo'}, ${Number(p.eta)} anni`;
  const plurale = (n, uno, molti) => `${n} ${n === 1 ? uno : molti}`;
  const casa = id => S.case.find(c => c.id === id);
  const inf = id => INFERMIERI[id];
  const caseDi = id => S.case.filter(c => c.infermiere === id);
  const oraDi = r => r.ora ? ` alle ${r.ora}` : '';
  const meseNome = s => daIso(s + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const giornoNome = s => daIso(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  // Foto delle stanze generate con l'IA: data URI costruiti da prepara-v4.py (solo caratteri base64). Senza foto, il disegno.
  const fotoCasa = c => FOTO[c.id] ? `<img class="foto-ia" src="${FOTO[c.id]}" alt="Foto di prova della stanza nella casa di ${esc(c.ospita.nome)}, generata con l'IA" loading="lazy">` : facciataSVG(c);
  const imgIA = (src, alt) => `<img class="foto-ia" src="${src}" alt="${esc(alt)}" loading="lazy">`;
  const fotoSala = c => FOTO[c.id + '-sala'] ? imgIA(FOTO[c.id + '-sala'], `Foto di prova del soggiorno nella casa di ${c.ospita.nome}, generata con l'IA`) : salaSVG(c);
  const fotoEsterno = c => FOTO[c.id + '-esterno'] ? imgIA(FOTO[c.id + '-esterno'], `Foto di prova dell'esterno della casa di ${c.ospita.nome}, generata con l'IA`) : facciataSVG(c);
  const NOTA_FOTO = '<p class="muto micro" style="margin-top:6px">Foto di prova generate con l\'intelligenza artificiale: non sono case vere.</p>';
  const coinquilini = () => S.case.flatMap(c => c.abitanti.filter(a => a.ruolo === 'coinquilino' && a.nome).map(a => ({ a, c })));
  const residente = () => coinquilini().find(x => x.a.id === S.residente) || coinquilini()[0];
  const persona = id => { for (const c of S.case) { const a = c.abitanti.find(x => x.id === id); if (a) return { a, c }; } return {}; };

  /* ---------- parenti e consenso (GDPR artt. 7, 9, 25; L. 219/2017 art. 1 c. 3) ---------- */
  const chiaveConsenso = () => S.parente || (S.utenza === 'cerca' ? 'cerca' : S.utenza === 'alloggia' ? residente().a.id : S.utenza === 'ospita' ? 'ospita:' + S.casaOspite : null);
  const nomeParte = p => (PARTI.find(x => x[0] === p) || [p, p])[1];
  // Il parente vede solo le parti che la persona ha scelto, e niente se il consenso è stato tolto.
  const vede = parte => { if (!S.parente) return true; const k = S.consensi[S.parente]; return !!(k && k.attivo && k.permessi[parte]); };
  const nascosto = parte => { const k = S.consensi[S.parente]; return `<div class="vuoto">${ico('scudo')} ${esc(k.persona)} non ha scelto di mostrarti «${esc(nomeParte(parte).toLowerCase())}». Solo ${esc(k.persona)} può cambiarlo, dal suo account.</div>`; };
  function bannerParente() {
    if (!S.parente) return '';
    const k = S.consensi[S.parente];
    if (!k.attivo) return `<div class="avviso rausch" style="margin:16px 0">${ico('scudo')}<span>${esc(k.persona)} ha tolto il consenso: non vedi più il suo account.</span></div>`;
    const parti = PARTI.filter(([p]) => k.permessi[p]).map(([, t]) => t.toLowerCase()).join(', ') || 'nessuna parte';
    return `<div class="avviso blu" style="margin:16px 0">${ico('persone')}<span>Sei <b>${esc(k.parente.nome)}</b>, ${esc(k.parente.relazione)} di ${esc(k.persona)}. Guardi il suo account con il consenso dato da ${esc(k.persona)} il ${esc(dataLunga(k.dal))}. Vedi: ${esc(parti)}. Non puoi agire al suo posto.</span></div>`;
  }
  const registra = cosa => { if (!S.parente) return; const k = S.consensi[S.parente]; if (k && k.attivo) k.registro.unshift({ quando: '2026-11-25 ' + new Date().toTimeString().slice(0, 5), cosa }); };

  /* ---------- agenda dell'infermiere: sopralluoghi, visite programmate, controlli che scadono ---------- */
  function agendaDi(idInf, giorni) {
    const fine = traGiorni(giorni), oggi = isoData(OGGI), mie = caseDi(idInf).map(c => c.id);
    const sop = S.richieste.filter(r => r.stato === 'sopralluogo' && mie.includes(r.casa) && r.sopralluogo >= oggi && r.sopralluogo <= fine)
      .map(r => ({ data: r.sopralluogo, ora: r.ora || '', casa: r.casa, chi: r.id, tipo: 'sopralluogo', cosa: `Sopralluogo e valutazione d'ingresso (${r.id}, ${descr(r.persona).toLowerCase()})` }));
    const vis = S.visite.filter(v => v.inf === idInf && v.data >= oggi && v.data <= fine);
    const ctr = caseDi(idInf).flatMap(c => seguiti(c).filter(a => a.controllo >= oggi && a.controllo <= fine && !vis.some(v => v.chi === a.id && v.tipo === 'controllo'))
      .map(a => ({ data: a.controllo, ora: 'da fissare', casa: c.id, chi: a.id, tipo: 'controllo', cosa: a.fase >= 2 ? 'Controllo ravvicinato (segnali di memoria)' : `Controllo dei ${REGOLE.controlloMesi} mesi` })));
    return [...sop, ...vis, ...ctr].sort((x, y) => (x.data + (/\d/.test(x.ora) ? x.ora.padStart(5, '0') : '99')).localeCompare(y.data + (/\d/.test(y.ora) ? y.ora.padStart(5, '0') : '99')));
  }
  const COLORE_TIPO = { sopralluogo: '#e8a33d', controllo: '#1f63b8', trattamento: '#008a05', visita: '#8a4fbf' };
  const rigaAgenda = (v, conData) => `<div><span class="puntino" style="background:${COLORE_TIPO[v.tipo] || '#6a6a6a'}"></span><span><b>${conData ? esc(giornoNome(v.data)) + ' · ' : ''}${esc(v.ora || '')}</b> · <span class="muto">${esc(casa(v.casa).quartiere)} · ${esc(v.tipo)}</span><br>${esc(v.cosa)}${v.chi && /^A-/.test(v.chi) ? ` <span class="muto piccolo">(${esc(v.chi)})</span>` : ''}</span></div>`;

  /* ---------- giorni feriali (F61): domeniche e festivi esclusi; a Roma anche il 29 giugno ---------- */
  function pasqua(y) { // calcolo di Meeus, Jones e Butcher
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, mm = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * mm + 114) / 31) - 1, ((h + l - 7 * mm + 114) % 31) + 1);
  }
  const FESTE = ['01-01', '01-06', '04-25', '05-01', '06-02', '06-29', '08-15', '11-01', '12-08', '12-25', '12-26'];
  const festivo = s => { const d = daIso(s); if (d.getDay() === 0 || FESTE.includes(String(s).slice(5))) return true; const q = pasqua(d.getFullYear()); q.setDate(q.getDate() + 1); return isoData(q) === s; };
  const feriali = m => { let n = 0; const d = daIso(m + '-01'); while (isoData(d).slice(0, 7) === m) { if (!festivo(isoData(d))) n++; d.setDate(d.getDate() + 1); } return n; };
  const quotaCasaMese = m => REGOLE.euroGiornoCasa * feriali(m || isoData(OGGI).slice(0, 7));
  const INTERV_MESE = () => REGOLE.prezzoIntervento * REGOLE.interventiInclusi;

  /* ---------- interventi compresi e addebiti del mese dopo ---------- */
  const meseDopo = m => isoData(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 1)).slice(0, 7);
  const mesePrima = m => isoData(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 2, 1)).slice(0, 7);
  const meseOggi = () => isoData(OGGI).slice(0, 7);
  // In casa contano visite e piccoli trattamenti; non contano sopralluogo, controllo dei 6 mesi e telefonate.
  function interventiMese(id, m) {
    const fatti = S.interventi.filter(x => x.chi === id && x.data.startsWith(m));
    const prog = S.visite.filter(v => v.chi === id && v.data.startsWith(m) && ['visita', 'trattamento'].includes(v.tipo));
    const tutti = [...fatti, ...prog], festExtra = tutti.filter(x => festivo(x.data) && !x.terapia).length, normali = tutti.length - festExtra;
    return { fatti, prog, n: tutti.length, normali, festExtra, oltre: Math.max(0, normali - REGOLE.interventiInclusi) };
  }
  const oltreDi = (id, m) => interventiMese(id, m).oltre;
  // I 6 del mese sono già pagati nella quota dell'infermiere (F61); si pagano a 20 € quelli oltre i 6 e quelli festivi fuori da una terapia iniziata in un feriale.
  const costoInterventi = (id, m) => { const k = interventiMese(id, m); return (k.oltre + k.festExtra) * REGOLE.tariffaIntervento; };
  const contatore = (id, m) => {
    const k = interventiMese(id, m), tutti = [...k.fatti.map(x => Object.assign({ f: 1 }, x)), ...k.prog].sort((p, q) => p.data.localeCompare(q.data)); let norm = 0;
    const quad = tutti.map(x => { const fest = festivo(x.data) && !x.terapia; if (!fest) norm++; return `<i class="${x.f ? 'fatto' : 'prog'}${fest || norm > REGOLE.interventiInclusi ? ' oltre' : ''}" title="${esc(dataLunga(x.data))}${fest ? ', festivo' : ''}${x.terapia ? ', terapia' : ''}"></i>`; }).join('')
      + [...Array(Math.max(0, REGOLE.interventiInclusi - k.normali))].map(() => '<i></i>').join(''), costo = costoInterventi(id, m);
    return `<div class="contatore">${quad}</div>
      <p class="piccolo"><b>${plurale(k.n, 'intervento', 'interventi')}</b> a ${esc(meseNome(m).split(' ')[0])} (${k.fatti.length} fatti, ${k.prog.length} programmati). ${REGOLE.interventiInclusi} sono già pagati nella quota dell'infermiere${k.festExtra ? `; ${plurale(k.festExtra, 'intervento festivo', 'interventi festivi')} a ${euro(REGOLE.tariffaIntervento)}` : ''}${k.oltre ? `; ${k.oltre} oltre i ${REGOLE.interventiInclusi} a ${euro(REGOLE.tariffaIntervento)}` : ''}.${costo ? ` <span class="pill attesa">${euro(costo)} all'infermiere a ${esc(meseNome(meseDopo(m)).split(' ')[0])}</span>` : ''}</p>`;
  };

  /* ---------- badante o OSS a ore (F60) e parte dell'infermiere di chi affitta ---------- */
  const FIGURE = { badante: 'Badante', oss: 'OSS' };
  const fineMese = m => isoData(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0));
  function costoAssistenza(id, m) {
    return S.assistenze.filter(x => x.chi === id && x.stato !== 'annullata').reduce((t, x) => {
      const ini = x.dal > m + '-01' ? x.dal : m + '-01', fin = x.al && x.al < fineMese(m) ? x.al : fineMese(m);
      if (ini > fin) return t;
      const giorni = Math.round((daIso(fin) - daIso(ini)) / 86400000) + 1;
      return t + x.ore * x.giorni / 7 * giorni * REGOLE.tariffe[x.figura];
    }, 0);
  }
  const casaAttiva = c => c.abitanti.some(a => a.ruolo === 'coinquilino');
  // La quota della casa parte con il primo ospite e si divide fra tutte le persone seguite: la parte di chi affitta la paga lui all'infermiere, con una parte dell'affitto che riceve.
  const quotaHost = (c, m) => { const h = seguiti(c).filter(a => a.ruolo === 'ospitante').length; return casaAttiva(c) ? (quotaCasaMese(m) / Math.max(1, seguiti(c).length) + INTERV_MESE()) * h : 0; };

  /* ---------- pagamenti di chi alloggia, mese per mese ---------- */
  function quotaAiuto(c, a) {
    const h = c.aiuto; if (!h || !h.persone.includes(a.id)) return 0;
    const chi = h.persone.map(id => c.abitanti.find(x => x.id === id)).filter(Boolean), tot = chi.reduce((t, x) => t + punti(x), 0) || 1;
    return h.ore * (REGOLE.tariffe[h.tipo] || REGOLE.tariffe.oss) * 30 * punti(a) / tot;
  }
  function pagamenti(c, a) {
    const righe = [], ini = daIso(a.ingresso || isoData(OGGI)), fine = new Date(OGGI.getFullYear(), OGGI.getMonth() + 1, 1);
    for (let d = new Date(ini.getFullYear(), ini.getMonth(), 1); d <= fine; d.setMonth(d.getMonth() + 1)) {
      const m = isoData(d).slice(0, 7), x = canone(c, true, m), extra = 0; // niente servizi venduti né spese extra (regole della gara)
      const oltre = costoInterventi(a.id, mesePrima(m)), assist = 0; // badante o OSS: contratto e pagamento diretti, fuori dal promemoria
      let aiuto = 0;
      if (c.aiuto) { // giorni di aiuto dentro il mese, al massimo fino ai 60 giorni dall'inizio
        const ini = c.aiuto.inizio > m + '-01' ? c.aiuto.inizio : m + '-01', L = daIso(c.aiuto.inizio); L.setDate(L.getDate() + REGOLE.aiutoGiorniMax - 1); const lim = isoData(L);
        const fin = lim < fineMese(m) ? lim : fineMese(m);
        if (ini <= fin) aiuto = quotaAiuto(c, a) * (Math.round((daIso(fin) - daIso(ini)) / 86400000) + 1) / 30;
      }
      const futuro = d > OGGI;
      righe.push({ mese: m, base: x.affitto + x.spese, quota: x.quota + x.interv, comm: x.comm, aiuto, extra, oltre, assist, totale: x.totale + aiuto + extra + oltre + assist,
        stato: futuro ? 'da pagare' : 'pagato', pagato: futuro ? null : `${m}-0${1 + (d.getMonth() % 4)}` });
    }
    return righe.reverse();
  }

  /* ---------- icone (tratto 1,6 su 24 pixel), riprese dalla v3 ---------- */
  const I = {
    casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
    cohousing: '<path d="M2 12.5 7 8l5 4.5"/><path d="M3.5 11.5V20h7v-8.5"/><path d="M12 12.5 17 8l5 4.5"/><path d="M13.5 11.5V20h7v-8.5"/>',
    cerca: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    letto: '<path d="M3 19v-8h18v8"/><path d="M3 15h18"/><path d="M6 11V8h5v3"/>',
    bagno: '<path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M6 12V6.5a2.5 2.5 0 0 1 5 0"/>',
    campanello: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5h4"/>',
    albero: '<path d="M12 21v-6"/><circle cx="12" cy="10" r="5.5"/>',
    germoglio: '<path d="M12 21v-9"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z"/><path d="M12 10c0-3 2-5 6-5 0 3-2 5-6 5z"/>',
    centro: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    zampa: '<circle cx="8" cy="8" r="1.8"/><circle cx="16" cy="8" r="1.8"/><circle cx="5" cy="12.5" r="1.6"/><circle cx="19" cy="12.5" r="1.6"/><path d="M8.5 18.5c0-2.5 1.6-5 3.5-5s3.5 2.5 3.5 5c0 1.4-1.2 2-3.5 2s-3.5-.6-3.5-2z"/>',
    pentola: '<path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M2 10h20"/><path d="M9 7V5M12 7V4M15 7V5"/>',
    bus: '<rect x="5" y="3.5" width="14" height="14" rx="3"/><path d="M5 11h14"/><path d="M8 17.5V20M16 17.5V20"/>',
    sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    ascensore: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 9.5 12 6.5l3 3M9 14.5l3 3 3-3"/>',
    infermiere: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/><path d="M12 10.5v5M9.5 13h5"/>',
    persone: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
    persona: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    scudo: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
    euro: '<path d="M17 6.5A7 7 0 1 0 17 17.5"/><path d="M4 10h9M4 14h9"/>',
    regola: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    chiudi: '<path d="M6 6l12 12M18 6 6 18"/>',
    sinistra: '<path d="M15 5l-7 7 7 7"/>',
    destra: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    cuore: '<path d="M12 20.5s-8-5.2-8-11A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9c0 5.8-8 11-8 11z"/>',
    condividi: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v8h14v-8"/>',
    mano: '<path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V10M10 9.5v-5a1.5 1.5 0 0 1 3 0v5M13 9.5V6a1.5 1.5 0 0 1 3 0v6M16 10a1.5 1.5 0 0 1 3 0v3.5A7.5 7.5 0 0 1 11.5 21 6.5 6.5 0 0 1 5 14.5V12a1.5 1.5 0 0 1 3 0"/>'
  };
  I.telefono = '<path d="M6 3.5h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 5.5 5.5l1.4-2.3 4.6 1.8V18a2 2 0 0 1-2 2A16 16 0 0 1 4 5.5a2 2 0 0 1 2-2z"/>';
  const ico = (n, cls) => `<span class="${cls || 'ico'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg></span>`;
  const CUORE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-5.2-8-11A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9c0 5.8-8 11-8 11z"/></svg>';
  const TAG_ICO = { 'Piano terra': 'casa', 'Cortile': 'albero', 'Vicino al bus': 'bus', 'Ascensore': 'ascensore', 'Terrazzo': 'sole', 'Vicino al centro': 'centro', 'Giardino': 'albero', 'Animali ammessi': 'zampa', 'Parco vicino': 'germoglio' };

  /* ---------- stato ---------- */
  function iniziale() {
    return {
      utenza: null, vista: 'accesso', scheda: null, provenienza: null, menuAperto: false,
      filtri: { quartiere: 'tutti', maxCanone: 0, tipo: '', tag: null },
      case: clona(CASE), richieste: clona(RICHIESTE), visite: clona(VISITE), consensi: clona(CONSENSI), interventi: clona(INTERVENTI), richiesteInf: clona(RICHIESTE_INF), assistenze: clona(ASSISTENZE),
      casaOspite: 'casa-monteverde', infermiere: 'inf-sara', residente: 'A-52', parente: null,
      tabOspita: 'richieste', tabInf: 'case', tabAll: 'casa'
    };
  }
  let S;
  // Online niente memoria nel browser (zero cookie e zero localStorage): la prova riparte a ogni apertura.
  // Aperto dal PC (file://) lo stato resta salvato fra un caricamento e l'altro.
  const MEMORIA = location.protocol === 'file:';
  try { S = (MEMORIA && JSON.parse(localStorage.getItem(CHIAVE))) || iniziale(); } catch (e) { S = iniziale(); }
  const salva = () => { if (!MEMORIA) return; try { localStorage.setItem(CHIAVE, JSON.stringify(S)); } catch (e) { /* senza memoria la prova funziona lo stesso */ } };

  /* ---------- Barthel, carico della casa, costi del mese ---------- */
  const classeBarthel = b => b === 100 ? { nome: 'Indipendente', punti: 1 } : b >= 91 ? { nome: 'Dipendenza lieve', punti: 2 }
    : b >= 61 ? { nome: 'Dipendenza moderata', punti: 3 } : b >= 21 ? { nome: 'Dipendenza grave', punti: 0 } : { nome: 'Dipendenza totale', punti: 0 };
  const punti = a => (a.barthel === undefined ? 2 : (classeBarthel(a.barthel).punti || 3));
  const seguiti = c => c.abitanti.filter(a => a.seguito);
  const postiLiberi = c => Math.max(0, Math.min(c.stanzeLibere, REGOLE.maxAbitanti - c.abitanti.length));
  // carico = punti delle persone seguite rispetto a 2 punti medi a testa: oltre il 100% la casa scivola verso una struttura
  const caricoPct = (c, extra) => { const s = seguiti(c), n = s.length + (extra ? 1 : 0); return n ? Math.round((s.reduce((t, a) => t + punti(a), 0) + (extra || 0)) / (n * REGOLE.caricoPerPersona) * 100) : 0; };
  // Colore della casa: verde se tutti sono autonomi o con dipendenza lieve; giallo se c'è almeno una dipendenza moderata
  // (la casa si avvicina al confine con una struttura); rosso oltre il 125% (più persone con dipendenza moderata).
  const classeCasa = (c, extra) => { const p = caricoPct(c, extra), moderata = seguiti(c).some(a => punti(a) >= 3) || extra >= 3;
    return p > 125 ? 'no' : moderata ? 'attesa' : 'ok'; };
  const traccia = (pct, classe) => `<div class="carico-traccia"><i style="width:${Math.min(100, pct)}%;background:${{ ok: 'var(--verde)', attesa: '#e8a33d', no: 'var(--errore)' }[classe]}"></i></div>`;
  const barraCarico = (c, extra) => { const p = caricoPct(c, extra); return `<div class="carico">${traccia(p, classeCasa(c, extra))}<span>carico ${p}%</span></div>`; };
  // canone(c): per chi deve entrare (la quota si divide contando anche lui); giaDentro: per chi alloggia già.
  function canone(c, giaDentro, m) {
    const n = Math.max(1, seguiti(c).length + (giaDentro ? 0 : 1)), quotaCasa = quotaCasaMese(m), quota = quotaCasa / n, interv = INTERV_MESE(), comm = c.affitto * REGOLE.commissione;
    return { affitto: c.affitto, spese: c.spese, quota, quotaCasa, feriali: feriali(m || isoData(OGGI).slice(0, 7)), interv, comm, n, totale: c.affitto + c.spese + quota + interv + comm };
  }
  const vociCanone = (x, c) => `<div class="voci">
      <div><span>Affitto della stanza, ${esc(aChi(c.ospita.nome))}</span><span>${euro(x.affitto)}</span></div>
      <div><span>Spese di casa: utenze e pulizie</span><span>${euro(x.spese)}</span></div>
      <div><span>Quota dell'infermiere (${euro(REGOLE.euroGiornoCasa)} per ${x.feriali} giorni feriali: ${euro(x.quotaCasa)} divisi per ${x.n})</span><span>${euro(x.quota)}</span></div>
      <div><span>${REGOLE.interventiInclusi} interventi dell'infermiere già pagati (${REGOLE.interventiInclusi} × ${euro(REGOLE.prezzoIntervento)})</span><span>${euro(x.interv)}</span></div>
      <div class="totale"><span>Totale al mese</span><span>${euro(x.totale)}</span></div></div>
    <p class="muto micro" style="margin-top:6px">Pagamenti diretti: affitto e spese ${esc(aChi(c.ospita.nome))}, la quota all'infermiere. Il programma non incassa nulla e non ha commissioni.</p>`;

  /* ---------- scene disegnate (al posto delle foto), riprese dalla v3 ---------- */
  let nSvg = 0;
  function fiore(cx, cy, r, k) {
    let s = '';
    for (let i = 0; i < 8; i++) s += `<ellipse cx="${cx}" cy="${cy - r * 0.55}" rx="${r * 0.2}" ry="${r * 0.45}" fill="${k.accento}" transform="rotate(${i * 45} ${cx} ${cy})"/>`;
    return s + `<circle cx="${cx}" cy="${cy}" r="${r * 0.26}" fill="${k.coperta}"/>`;
  }
  function letto(x, w, k) {
    return `<rect x="${x}" y="112" width="14" height="88" rx="4" fill="#6B4A33"/><rect x="${x + w - 12}" y="142" width="12" height="58" rx="3" fill="#6B4A33"/>
      <rect x="${x + 10}" y="152" width="${w - 20}" height="24" rx="7" fill="#FFFFFF" stroke="#E6E0D6"/>
      <path d="M${x + 52} 150 q ${(w - 64) / 2} -8 ${w - 64} 0 v 30 h -${w - 64} z" fill="${k.coperta}"/>
      <rect x="${x + 52}" y="149" width="10" height="31" fill="${k.accento}" opacity=".85"/>
      <rect x="${x + 17}" y="139" width="38" height="16" rx="8" fill="#FFFFFF" stroke="#E6E0D6"/>`;
  }
  const scena = (vb, par, label, corpo) => `<svg class="scena" viewBox="${vb}" preserveAspectRatio="${par}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}">${corpo}</svg>`;
  function stanzaSVG(x) {
    const k = x.colori, id = 's' + (nSvg++), doppia = x.stanza && /^Doppia/.test(x.stanza.tipo);
    const letti = doppia ? letto(18, 118, k) + letto(146, 118, k)
      : letto(30, 190, k) + `<rect x="228" y="152" width="40" height="48" rx="3" fill="#8A6244"/><circle cx="248" cy="118" r="34" fill="url(#l${id})"/><rect x="244" y="138" width="8" height="14" fill="#5A3D2A"/><polygon points="234,138 262,138 256,118 240,118" fill="${k.accento}"/>`;
    return scena('0 -70 400 320', 'xMidYMax slice', 'Disegno della camera', `
      <defs><linearGradient id="c${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C6DDEA"/><stop offset="1" stop-color="#F7EBD3"/></linearGradient>
      <radialGradient id="l${id}"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE7A8" stop-opacity="0"/></radialGradient></defs>
      <rect y="-70" width="400" height="320" fill="${k.parete}"/>
      ${Array.from({ length: 14 }, (_, i) => `<line x1="${i * 30 + 8}" y1="-70" x2="${i * 30 + 8}" y2="150" stroke="#000" stroke-opacity=".03" stroke-width="10"/>`).join('')}
      <line x1="200" y1="-70" x2="200" y2="-30" stroke="#5A3D2A" stroke-width="1.5"/><path d="M184 -30h32l-6 14h-20z" fill="${k.accento}"/>
      <rect y="150" width="400" height="48" fill="#000" opacity=".04"/><rect y="196" width="400" height="4" fill="#FFFFFF" opacity=".7"/>
      <rect y="198" width="400" height="52" fill="${k.pavimento}"/>
      ${Array.from({ length: 9 }, (_, i) => `<line x1="${i * 50 - 10}" y1="198" x2="${i * 50 - 30}" y2="250" stroke="#000" stroke-opacity=".12"/>`).join('')}
      <polygon points="282,132 368,132 330,250 200,250" fill="#FFFFFF" opacity=".15"/>
      <ellipse cx="190" cy="226" rx="128" ry="13" fill="${k.accento}" opacity=".35"/>
      <g transform="translate(276 30)"><path d="M-14 -4 h22 v118 c-10 -20 -18 -50 -22 -118z" fill="${k.tenda}"/><path d="M106 -4 h22 c-4 68 -12 98 -22 118z" fill="${k.tenda}"/>
        <rect width="100" height="100" rx="3" fill="#FFFFFF"/><rect x="7" y="7" width="86" height="86" fill="url(#c${id})"/>
        <path d="M7 78 q 22 -22 44 -6 q 20 -16 42 2 v19 h-86z" fill="#9DB48A"/><circle cx="28" cy="66" r="11" fill="#6F8F72"/><circle cx="70" cy="28" r="7" fill="#F5D27A"/>
        <rect x="48" y="7" width="4" height="86" fill="#FFFFFF"/><rect x="7" y="48" width="86" height="4" fill="#FFFFFF"/><rect x="-6" y="98" width="112" height="7" rx="2" fill="#FFFFFF"/></g>
      <g transform="translate(64 40)"><rect width="66" height="50" rx="2" fill="#7A5539"/><rect x="5" y="5" width="56" height="40" fill="#FBF6EA"/>${fiore(33, 25, 15, k)}</g>
      ${letti}
      <g transform="translate(352 160)"><path d="M-4 -26 q -16 -22 -2 -40 q 6 18 6 40z" fill="#4F7A52"/><path d="M4 -26 q 18 -16 10 -40 q -12 14 -14 40z" fill="#6F8F72"/><path d="M0 -24 q -2 -26 6 -46 q 6 22 -2 46z" fill="#5E8A60"/>
        <polygon points="-16,-26 16,-26 11,40 -11,40" fill="#B4532C"/><rect x="-18" y="-30" width="36" height="7" rx="2" fill="#8E3E1F"/></g>`);
  }
  function facciataSVG(x) {
    const k = x.colori, id = 'f' + (nSvg++);
    const finestra = (fx, fy) => `<rect x="${fx}" y="${fy}" width="26" height="32" fill="#CFE3EE" stroke="#FFFFFF" stroke-width="3"/><rect x="${fx - 11}" y="${fy}" width="10" height="32" fill="#5E7D5A"/><rect x="${fx + 27}" y="${fy}" width="10" height="32" fill="#5E7D5A"/>`;
    return scena('0 0 400 320', 'xMidYMax slice', 'Disegno della casa vista da fuori', `
      <defs><linearGradient id="k${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD9EA"/><stop offset="1" stop-color="#F8EFE0"/></linearGradient></defs>
      <rect width="400" height="320" fill="url(#k${id})"/><circle cx="330" cy="60" r="20" fill="#F7D57E" opacity=".9"/>
      <path d="M0 200 q 80 -50 170 -20 q 110 -50 230 0 v 120 h-400z" fill="#B9CBA0"/><path d="M0 230 q 120 -40 230 -10 q 90 -20 170 0 v 100 h-400z" fill="#9DB48A"/>
      <g><rect x="40" y="170" width="8" height="60" fill="#6B4A33"/><circle cx="44" cy="160" r="30" fill="#6F8F72"/><circle cx="28" cy="176" r="18" fill="#5E8A60"/></g>
      <rect x="110" y="120" width="180" height="130" fill="${k.esterno}"/>
      <polygon points="98,126 200,66 302,126" fill="#B4532C"/><rect x="246" y="76" width="16" height="30" fill="#8E3E1F"/>
      ${finestra(134, 140)}${finestra(240, 140)}${finestra(134, 196)}${finestra(240, 196)}
      <path d="M184 250 v-44 a16 16 0 0 1 32 0 v44z" fill="#6B4A33"/><circle cx="210" cy="230" r="2" fill="#F5D27A"/>
      <rect x="110" y="246" width="180" height="6" fill="#000" opacity=".08"/>
      <path d="M184 252 L 168 320 h 64 L 216 252z" fill="#E9DCC4"/>
      <rect y="262" width="400" height="58" fill="#A8BF8A"/><path d="M184 262 L 172 320 h 56 L 216 262z" fill="#E9DCC4"/>
      ${[96, 120, 300, 326].map((bx, i) => `<circle cx="${bx}" cy="${262 - (i % 2) * 4}" r="${14 + (i % 2) * 4}" fill="#5E8A60"/>`).join('')}
      ${[90, 104, 118, 296, 312, 330].map((fx, i) => `<circle cx="${fx}" cy="${254 + (i % 3) * 4}" r="3.5" fill="${k.accento}"/>`).join('')}
      ${Array.from({ length: 16 }, (_, i) => i < 6 || i > 9 ? `<rect x="${i * 25 + 4}" y="276" width="6" height="30" rx="2" fill="#FFFFFF" opacity=".9"/>` : '').join('')}
      <rect x="0" y="284" width="150" height="4" fill="#FFFFFF" opacity=".9"/><rect x="250" y="284" width="150" height="4" fill="#FFFFFF" opacity=".9"/>`);
  }
  function salaSVG(x) {
    const k = x.colori;
    const sedia = sx => `<rect x="${sx}" y="170" width="8" height="56" rx="3" fill="${k.coperta}"/><rect x="${sx}" y="200" width="34" height="8" rx="3" fill="${k.coperta}"/><rect x="${sx + 26}" y="206" width="6" height="22" fill="${k.coperta}"/>`;
    return scena('0 0 400 320', 'xMidYMax slice', 'Disegno della sala comune', `
      <rect width="400" height="320" fill="${k.parete}"/><rect y="236" width="400" height="84" fill="${k.pavimento}"/>
      ${Array.from({ length: 9 }, (_, i) => `<line x1="${i * 50 - 10}" y1="236" x2="${i * 50 - 34}" y2="320" stroke="#000" stroke-opacity=".12"/>`).join('')}
      <g transform="translate(28 60)"><rect width="96" height="116" rx="3" fill="#FFFFFF"/><rect x="7" y="7" width="82" height="102" fill="#CFE3EE"/><rect x="45" y="7" width="5" height="102" fill="#FFFFFF"/>
        <path d="M-12 -6 h20 v136 c-10 -24 -16 -60 -20 -136z" fill="${k.tenda}"/></g>
      <g transform="translate(300 70)"><rect width="76" height="166" fill="#8A6244"/>${[0, 1, 2, 3].map(r => `<rect x="6" y="${8 + r * 40}" width="64" height="4" fill="#6B4A33"/>${[0, 1, 2, 3, 4].map(b => `<rect x="${10 + b * 11}" y="${16 + r * 40}" width="8" height="${22 - (b % 2) * 4}" fill="${['#B4532C', k.accento, '#2B5A85', '#C98F1E', k.coperta][b]}"/>`).join('')}`).join('')}</g>
      <line x1="200" y1="0" x2="200" y2="70" stroke="#5A3D2A" stroke-width="1.5"/><path d="M178 70h44l-8 18h-28z" fill="${k.accento}"/>
      <ellipse cx="200" cy="292" rx="150" ry="16" fill="${k.accento}" opacity=".3"/>
      ${sedia(118)}${sedia(250)}
      <rect x="140" y="196" width="122" height="10" rx="3" fill="#7A5539"/><rect x="150" y="206" width="8" height="40" fill="#6B4A33"/><rect x="244" y="206" width="8" height="40" fill="#6B4A33"/>
      <rect x="146" y="190" width="110" height="8" fill="#FFFFFF" opacity=".85"/>
      <rect x="194" y="168" width="14" height="24" rx="4" fill="#FFFFFF" stroke="#E6E0D6"/>${fiore(201, 160, 12, k)}
      <circle cx="166" cy="186" r="7" fill="#FFFFFF" stroke="#E6E0D6"/><circle cx="236" cy="186" r="7" fill="#FFFFFF" stroke="#E6E0D6"/>`);
  }


  const MARCHIO = '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M17 3 3 14v17h28V14z" fill="#ff385c"/><circle cx="11" cy="22" r="3" fill="#fff"/><circle cx="23" cy="22" r="3" fill="#fff"/><circle cx="17" cy="15.5" r="3" fill="#fff"/><path d="M11 22l6-6.5 6 6.5" stroke="#fff" stroke-width="1.8" fill="none"/></svg>';

  function mappaInfermiere(i, piccola) {
    const pos = [[110, 80], [410, 80], [110, 290], [410, 290]], cx = 260, cy = 185;
    const nodi = caseDi(i.id).slice(0, 4).map((c, k) => ({ c, x: pos[k][0], y: pos[k][1] }));
    const fili = nodi.map(h => `<path class="filo" d="M${cx} ${cy} Q ${(cx + h.x) / 2 + 30} ${(cy + h.y) / 2 - 20} ${h.x} ${h.y}" stroke="${i.colore}"/>`).join('');
    const casetta = (x, y, colore) => `<g transform="translate(${x - 22} ${y - 30})"><rect x="4" y="17" width="36" height="28" fill="${colore}"/><polygon points="-2,20 22,0 46,20" fill="#222222"/><rect x="18" y="29" width="9" height="16" rx="4" fill="#FFFFFF"/></g>`;
    const disegno = nodi.map(h => `<g${piccola ? '' : ` data-azione="scheda" data-id="${h.c.id}" style="cursor:pointer" role="link" aria-label="Apri la casa di ${esc(h.c.ospita.nome)}"`}>
        <circle cx="${h.x}" cy="${h.y - 8}" r="38" fill="#FFFFFF" stroke="#DDDDDD"/>${casetta(h.x, h.y, h.c.colori.accento)}
        <text x="${h.x}" y="${h.y + 32}" text-anchor="middle" font-size="14" font-weight="600" fill="#222222">${esc(h.c.quartiere)}</text>
        ${piccola ? '' : `<text x="${h.x}" y="${h.y + 48}" text-anchor="middle" font-size="12" fill="#6a6a6a">${plurale(seguiti(h.c).length, 'persona seguita', 'persone seguite')}</text>`}</g>`).join('');
    return `<svg class="mappa-rete" viewBox="0 0 520 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Le case seguite da ${esc(i.nome)}" font-family="Lato, system-ui, sans-serif">${fili}${disegno}
      <circle cx="${cx}" cy="${cy}" r="56" fill="${i.colore}" opacity=".08"/><circle cx="${cx}" cy="${cy}" r="38" fill="#222222" stroke="#FFFFFF" stroke-width="4"/>
      <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-size="20" font-weight="700" fill="#FFFFFF">${esc(i.iniziali)}</text>
      <text x="${cx}" y="${cy + 58}" text-anchor="middle" font-size="12.5" font-weight="600" fill="#222222">${esc(i.nome)}</text></svg>`;
  }

  /* ---------- pezzi riusati ---------- */
  const punto = (icona, titolo, testo, extra) => `<div class="punto">${ico(icona)}<div><b>${esc(titolo)}</b><p class="muto piccolo">${esc(testo)}</p>${extra || ''}</div></div>`;
  const etichette = lista => `<div class="etichette">${(lista || []).map(t => `<span class="etichetta-tag">${esc(t)}</span>`).join('') || '<span class="muto piccolo">nessuna indicata</span>'}</div>`;
  function profilo(a, perInf) {
    const ruolo = a.ruolo === 'ospitante' ? 'vive qui e ospita' : (a.sesso === 'F' ? 'coinquilina' : 'coinquilino');
    return `<div class="profilo"><div class="chi"><span class="avatar grigio">${ico('persona')}</span><div><b>${esc(descr(a))}</b><br><span class="muto piccolo">${esc(ruolo)}${perInf ? ` · ${esc(a.id)}` : ''}</span></div></div>
      <div><span class="muto micro">Abitudini</span>${etichette(a.abitudini)}</div><div><span class="muto micro">Hobby</span>${etichette(a.hobby)}</div>
      ${perInf && a.seguito ? `<div class="piccolo">Barthel <b>${Number(a.barthel)}</b> · ${esc(classeBarthel(a.barthel).nome.toLowerCase())}${a.cognitivi.length ? ` <span class="pill attesa">${esc(a.cognitivi[0])}</span>` : ''}</div>` : ''}
      ${perInf && !a.seguito ? '<div class="muto piccolo">Non seguito dall\'infermiere</div>' : ''}</div>`;
  }
  const listaIdoneita = (c, mod) => `<div class="lista-controllo">${IDONEITA.map(([k, t]) => mod
    ? `<button type="button" class="chip" data-azione="idoneita" data-id="${k}" aria-pressed="${!!c.idoneita[k]}">${esc(t)}</button>`
    : `<div class="${c.idoneita[k] ? '' : 'no'}">${ico(c.idoneita[k] ? 'check' : 'chiudi')}<span>${esc(t)}${c.idoneita[k] ? '' : ': manca'}</span></div>`).join('')}</div>`;
  const prossimoControllo = c => seguiti(c).map(a => a.controllo).sort()[0];

  /* ---------- intestazione ---------- */
  function navHtml() {
    const u = S.utenza;
    let centro = '', destra = '';
    const tab = (azione, id, attivo, icona, testo, n) => `<button class="scheda-centrale" data-azione="${azione}" data-id="${id}" aria-current="${attivo ? 'page' : 'false'}">${icona ? ico(icona) : ''}${esc(testo)}${n ? `<span class="pill rausch" style="margin-left:2px">${n}</span>` : ''}</button>`;
    const fam = (azione, attivo) => tab(azione, 'famiglia', attivo, 'persone', S.parente ? 'Che cosa vedo' : 'Famiglia e consenso');
    if (u === 'cerca') {
      const n = S.richieste.filter(r => r.mia && ['sopralluogo', 'valutata', 'accettata'].includes(r.stato)).length;
      centro = tab('tab-c', 'cerca', ['cerca', 'scheda'].includes(S.vista), 'cerca', 'Cerca una stanza') + tab('tab-c', 'richieste', S.vista === 'richieste', 'calendario', 'Le richieste', n) + fam('tab-c', S.vista === 'famiglia');
    } else if (u === 'ospita') {
      const n = S.richieste.filter(r => r.casa === S.casaOspite && ['nuova', 'valutata'].includes(r.stato)).length, t = S.vista === 'ospita' ? S.tabOspita : '';
      centro = tab('tab-o', 'richieste', t === 'richieste', 'calendario', 'Richieste', n) + tab('tab-o', 'casa', t === 'casa', 'casa', 'La casa') + tab('tab-o', 'incassi', t === 'incassi', 'euro', 'Incassi') + tab('tab-o', 'vantaggi', t === 'vantaggi', 'scudo', 'I vantaggi')
        + (casa(S.casaOspite).ospita.tipo === 'anziano' ? fam('tab-o', t === 'famiglia') : '');
    } else if (u === 'infermiere') {
      const mie = caseDi(S.infermiere), t = S.vista === 'infermiere' ? S.tabInf : '';
      const nS = S.richieste.filter(r => ['nuova', 'sopralluogo'].includes(r.stato) && mie.some(c => c.id === r.casa)).length;
      const nD = mie.flatMap(seguiti).filter(a => a.fase >= 2).length;
      centro = tab('tab-i', 'case', t === 'case', 'casa', 'Le tue case') + tab('tab-i', 'sopralluoghi', t === 'sopralluoghi', 'calendario', 'Richieste e agenda', nS)
        + tab('tab-i', 'demenze', t === 'demenze', 'persona', 'Percorsi', nD) + tab('tab-i', 'aiuto', t === 'aiuto', 'mano', 'Aiuto condiviso');
    } else if (u === 'alloggia') {
      const t = S.vista === 'alloggia' ? S.tabAll : '';
      centro = tab('tab-a', 'casa', t === 'casa', 'casa', 'La mia casa') + tab('tab-a', 'costi', t === 'costi', 'euro', 'Costi del mese') + tab('tab-a', 'servizi', t === 'servizi', 'mano', 'Richieste e servizi') + tab('tab-a', 'visite', t === 'visite', 'infermiere', 'Visite e salute') + fam('tab-a', t === 'famiglia');
    }
    if (u) {
      const k = S.parente && S.consensi[S.parente];
      const nome = k ? `${k.parente.nome}, ${k.parente.relazione} di ${k.persona}` : u === 'ospita' ? `${casa(S.casaOspite).ospita.nome}, ${casa(S.casaOspite).quartiere}` : u === 'infermiere' ? inf(S.infermiere).nome : u === 'alloggia' ? `${residente().a.nome}, ${residente().c.quartiere}` : UTENZE[u].account;
      destra = `<div class="conto"><button class="conto-pill" data-azione="menu-conto" aria-expanded="${S.menuAperto}" aria-label="Menu dell'account">${ico('menu')}<span class="avatar">${esc(nome.charAt(0))}</span></button>
        ${S.menuAperto ? `<div class="menu-conto"><div class="intestazione"><b>${esc(nome)}</b><br><span class="muto piccolo">Utenza: ${esc(k ? UTENZE.parente.nome : UTENZE[u].nome)}</span></div>
          <button data-azione="esci">Esci</button><button data-azione="ripristina">Ripristina i dati di prova</button></div>` : ''}</div>`;
    }
    return `<div class="wrap"><button class="logo" data-azione="logo" aria-label="Casa in Rete, inizio">${MARCHIO}<span>casainrete</span></button><nav class="schede-centrali" aria-label="Sezioni">${centro}</nav><div class="destra">${destra}</div></div>`;
  }

  /* ---------- vista: accesso con le quattro utenze e i parenti ---------- */
  /* ---------- guida al servizio, sotto il login (F62) ----------
     Spiega il servizio a tutti: il futuro nei dati, i passi, i vantaggi per ognuno, le regole, i limiti.
     Grafici in SVG disegnati qui, senza librerie (la CSP non ne carica). Dati demografici: solo i valori
     verificati in scheda-fatti.md (F1-F5, F36, F45, F17-F19, F24). Conti: le stesse funzioni del mockup.
     Colori: primi sei slot della tavolozza di riferimento della skill dataviz, validati sul bianco
     (verde acqua, giallo e rosa sotto 3:1: ogni valore è anche scritto accanto).
     Aggiornamenti: i pulsanti ridisegnano la vista con disegna() (stesso modello di tutto il mockup, testi già
     passati da esc()); i cursori cambiano solo testo con textContent mentre si muovono, e il grafico al rilascio. */
  const SERIE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
  const PASSATO = '#86b6ef'; // stesso blu, gradino più chiaro: l'anno di partenza
  const G = { anima: true, ind: 'over65', passo: 0, ruolo: 'ospita', affitto: 400, ospiti: 1, casaC: 'casa-garbatella', prest: 4, fest: 0, nCase: 6, nPers: 2, tabella: false,
    perm: { richieste: true, costi: true, visite: false, salute: false } };
  const dec = (v, d) => Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
  const FONTE_ISTAT = 'ISTAT, «Previsioni della popolazione residente e delle famiglie», base 1/1/2023, comunicato del 24/7/2024: scenario mediano; intervallo di confidenza al 90% dove indicato.';
  const FUTURO = [
    { id: 'over65', bottone: '65 anni e più', titolo: 'Persone con 65 anni e più', unita: 'per cento della popolazione', a: [2023, 24.0], b: [2050, 34.5], int: [33.1, 35.8], suff: '%', circa: [false, false],
      frase: 'Fra 25 anni più di una persona su tre avrà 65 anni o più.' },
    { id: 'over85', bottone: '85 anni e più', titolo: 'Persone con 85 anni e più', unita: 'per cento della popolazione', a: [2023, 3.8], b: [2050, 7.2], int: [6.4, 8.0], suff: '%', circa: [false, false],
      frase: 'Le persone molto anziane quasi raddoppiano.' },
    { id: 'soli', bottone: 'Anziani che vivono soli', titolo: 'Persone con 65 anni e più che vivono sole', unita: 'milioni di persone', a: [2023, 4.4], b: [2043, 6.2], int: null, suff: ' mln', circa: [false, false],
      frase: 'Quasi due milioni in più in vent\'anni: nel 2043 saranno il 57,7% di tutte le persone che vivono sole.' },
    { id: 'lavoro', bottone: 'Chi è in età di lavoro', titolo: 'Persone in età di lavoro (15-64 anni) per ogni persona fuori da quell\'età', unita: 'valori approssimati: «circa tre a due», «circa uno a uno»', a: [2023, 1.5], b: [2050, 1.0], int: null, suff: '', circa: [true, true],
      frase: 'Meno persone in età di lavoro, anche per assistere chi invecchia.' },
    { id: 'abitanti', bottone: 'Abitanti', titolo: 'Popolazione residente in Italia', unita: 'milioni di persone', a: [2023, 59.0], b: [2050, 54.8], int: null, suff: ' mln', circa: [true, false],
      frase: 'Circa quattro milioni di abitanti in meno, e più anziani.' }
  ];
  const nI = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const fmtF = (d, v, circa) => (circa ? 'circa ' : '') + dec(v, 1) + d.suff;
  const passoScala = top => [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(s => top / s <= 5) || 5000;
  // barra verticale con la cima arrotondata (4 px) e la base dritta sulla linea dello zero
  const barraV = (x, w, yt, base, attr) => { const r = Math.min(4, (base - yt) / 2, w / 2); return `<path d="M${x},${base}V${yt + r}Q${x},${yt} ${x + r},${yt}H${x + w - r}Q${x + w},${yt} ${x + w},${yt + r}V${base}Z" ${attr}/>`; };
  const tip = (valore, chi, nota) => `tabindex="0" data-tip="${esc([valore, chi, nota].filter(Boolean).join('|'))}"`;
  const griglia = (ticks, y, L, R, W, d) => `<g class="g-griglia">${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${dec(v, d)}</text>`).join('')}</g>`;

  function graficoFuturo(d) {
    const W = 400, H = 262, L = 44, R = 12, T = 34, B = 34, pw = W - L - R, ph = H - T - B, base = T + ph, bw = 96;
    const top = Math.max(d.a[1], d.b[1], d.int ? d.int[1] : 0), st = passoScala(top), max = Math.ceil(top * 1.04 / st) * st;
    const y = v => T + ph - v / max * ph, ticks = []; for (let v = 0; v <= max + 1e-9; v += st) ticks.push(v);
    const barra = (cx, v, anno, circa, nota, col) => barraV(cx - bw / 2, bw, y(v), base, `class="${G.anima ? 'g-barra' : ''}" fill="${col}" ${tip(fmtF(d, v, circa), `${d.titolo}, ${anno}`, nota)}`);
    const c1 = L + pw * 0.3, c2 = L + pw * 0.72, sopra2 = d.int ? y(d.int[1]) : y(d.b[1]);
    const baffo = d.int ? `<g class="g-baffo"><line x1="${c2}" x2="${c2}" y1="${y(d.int[0])}" y2="${y(d.int[1])}"/><line x1="${c2 - 8}" x2="${c2 + 8}" y1="${y(d.int[0])}" y2="${y(d.int[0])}"/><line x1="${c2 - 8}" x2="${c2 + 8}" y1="${y(d.int[1])}" y2="${y(d.int[1])}"/></g>` : '';
    return `<svg class="g-svg g-svg-futuro" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(`${d.titolo}: ${fmtF(d, d.a[1], d.circa[0])} nel ${d.a[0]}, ${fmtF(d, d.b[1], d.circa[1])} nel ${d.b[0]}`)}">
      ${griglia(ticks, y, L, R, W, st < 1 ? (st < 0.5 ? 2 : 1) : 0)}
      ${barra(c1, d.a[1], d.a[0], d.circa[0], 'dato di partenza', PASSATO)}
      ${barra(c2, d.b[1], d.b[0], d.circa[1], d.int ? `previsione; intervallo al 90%: ${dec(d.int[0], 1)}-${dec(d.int[1], 1)}${d.suff}` : 'previsione, scenario mediano', SERIE[0])}
      ${baffo}
      <text class="g-val" x="${c1}" y="${y(d.a[1]) - 8}" text-anchor="middle">${esc(fmtF(d, d.a[1], d.circa[0]))}</text>
      <text class="g-val" x="${c2}" y="${sopra2 - 8}" text-anchor="middle">${esc(fmtF(d, d.b[1], d.circa[1]))}</text>
      <text class="g-anno" x="${c1}" y="${base + 20}" text-anchor="middle">${d.a[0]}</text>
      <text class="g-anno" x="${c2}" y="${base + 20}" text-anchor="middle">${d.b[0]} · previsione</text>
    </svg>`;
  }

  function futuroBox() {
    const d = FUTURO.find(x => x.id === G.ind) || FUTURO[0], anni = d.b[0] - d.a[0], rel = Math.round((d.b[1] / d.a[1] - 1) * 100);
    return `<div class="g-seg" role="group" aria-label="Scegli il dato">${FUTURO.map(x => `<button type="button" data-azione="guida" data-id="ind:${x.id}" aria-pressed="${G.ind === x.id}">${esc(x.bottone)}</button>`).join('')}</div>
      <div class="g-carta"><div class="g-graf-testa"><div><h3>${esc(d.titolo)}</h3><p class="muto piccolo">${esc(d.unita)}</p></div>
        <div class="g-delta"><b>${rel > 0 ? '+' : '−'}${Math.abs(rel)}%</b><span>${esc(`dal ${d.a[0]} al ${d.b[0]}, in ${anni} anni`)}</span></div></div>
        <div class="g-futuro-corpo">${graficoFuturo(d)}<div><p class="g-frase">${esc(d.frase)}</p><p class="g-fonte">${esc(FONTE_ISTAT)}</p>
          <p class="muto micro" style="margin-top:8px">Passa sulle barre, o usa il tasto Tab, per leggere i valori.</p></div></div></div>`;
  }
  const tabellaFuturo = () => `<div class="g-scorri"><table class="tabella"><thead><tr><th>Dato</th><th class="num">Partenza</th><th class="num">Previsione</th><th>Intervallo al 90%</th></tr></thead><tbody>${FUTURO.map(d => `<tr><td>${esc(d.titolo)}</td>
      <td class="num">${esc(`${fmtF(d, d.a[1], d.circa[0])} (${d.a[0]})`)}</td><td class="num">${esc(`${fmtF(d, d.b[1], d.circa[1])} (${d.b[0]})`)}</td>
      <td>${d.int ? esc(`${dec(d.int[0], 1)}-${dec(d.int[1], 1)}${d.suff}`) : '<span class="muto">non indicato</span>'}</td></tr>`).join('')}</tbody></table></div><p class="g-fonte">${esc(FONTE_ISTAT)}</p>`;

  const PASSI = [
    { titolo: 'Apre la casa', chi: 'ospita', email: 'bruna@casainrete.example',
      testo: 'Una persona anziana che vive sola in una casa troppo grande decide di affittare una stanza a un coetaneo, per non restare sola. Se serve, un figlio o un altro parente la aiuta con l\'account, con il suo consenso. Pubblica la stanza con le foto, le regole di casa, le sue abitudini e i suoi hobby, e dichiara agibilità e sicurezza: scale, bagno, gas, luce.',
      app: 'Le richieste per la stanza, gli incassi mese per mese, i vantaggi, il consenso per i parenti.' },
    { titolo: 'Chi cerca sceglie', chi: 'cerca', email: 'giulio@casainrete.example',
      testo: 'Una persona anziana sola che cerca compagnia guarda le case del suo quartiere e chi ci vive: solo età, abitudini e hobby, mai i dati di salute. Compila un questionario breve sull\'autonomia (indice di Barthel, da 91 in su), da sola o con un familiare, sceglie mattina o pomeriggio e manda la richiesta.',
      app: 'Ricerca per quartiere e costo, scheda della casa con i costi voce per voce, le richieste, il consenso per i parenti.' },
    { titolo: 'L\'infermiere valuta', chi: 'infermiere', email: 'sara.colombo@casainrete.example',
      testo: 'L\'infermiere di zona riceve la richiesta, programma il sopralluogo, incontra la persona e la casa e dice se la convivenza è adatta. Senza il suo sì non si entra: la casa resta una casa, non una struttura.',
      app: 'Le case seguite, le richieste da programmare, l\'agenda di 14 giorni, la valutazione d\'ingresso.' },
    { titolo: 'Si firma', chi: 'alloggia', email: 'aldo@casainrete.example',
      testo: 'Chi entra firma con chi affitta un contratto di locazione della stanza, per esempio a canone concordato (3 anni più 2), e a parte l\'accordo con l\'infermiere. Deposito di due mesi di affitto. Si paga direttamente: l\'affitto a chi apre la casa, la quota all\'infermiere. Il programma non incassa nulla.',
      app: 'Contratto, scadenze e pagamenti mese per mese nel conto di chi alloggia.' },
    { titolo: 'Si vive insieme', chi: 'alloggia', email: 'aldo@casainrete.example',
      testo: `Ogni mese l'affitto e le spese a chi apre la casa, e all'infermiere una quota con dentro ${REGOLE.interventiInclusi} interventi. Dall'app si chiede l'infermiere, si trovano i servizi del territorio e si segnala se serve qualche ora di badante o di OSS, con contratto diretto. Controlli ogni ${REGOLE.controlloMesi} mesi, prima se arrivano segnali.`,
      app: 'Costi voce per voce, richieste e servizi, visite, famiglia e consenso.' },
    { titolo: 'I parenti, se la persona vuole', chi: 'parente', email: 'silvia@casainrete.example',
      testo: `Chi affitta e chi alloggia possono far vedere il proprio account a un parente. La persona sceglie le parti (richieste, costi, visite; la salute è un consenso a parte), toglie il consenso con un clic e lo riconferma ogni ${REGOLE.controlloMesi} mesi. Se la salute cambia, l'uscita si accompagna insieme alla famiglia e ai servizi.`,
      app: 'Solo le parti scelte dalla persona, con un riquadro che lo ricorda; il parente guarda e non può agire.' }
  ];
  function passiHtml() {
    const i = G.passo, p = PASSI[i] || PASSI[0];
    return `<ol class="g-passi">${PASSI.map((x, k) => `<li><button type="button" data-azione="guida" data-id="passo:${k}" aria-pressed="${i === k}"><span class="n">${k + 1}</span><b>${esc(x.titolo)}</b><span class="muto micro">${esc(UTENZE[x.chi].nome)}</span></button></li>`).join('')}</ol>
      <div class="g-carta g-passo"><div><span class="pill">${esc(`Passo ${i + 1} di ${PASSI.length}`)}</span><h3>${esc(p.titolo)}</h3><p>${esc(p.testo)}</p>
          <div class="g-avanti">${i > 0 ? `<button type="button" class="btn secondario piccolo" data-azione="guida" data-id="passo:${i - 1}">Indietro</button>` : ''}${i < PASSI.length - 1 ? `<button type="button" class="btn piccolo" data-azione="guida" data-id="passo:${i + 1}">Passo dopo</button>` : ''}</div></div>
        <div class="g-app"><b>${esc(`Nell'app: ${UTENZE[p.chi].nome}`)}</b><p class="muto piccolo">${esc(p.app)}</p>
          <button type="button" class="btn scuro piccolo" data-azione="riempi-login" data-id="${esc(p.email)}">Provalo con l'account di prova</button></div></div>`;
  }

  const RUOLI = [['ospita', 'Chi apre la casa'], ['cerca', 'Chi cerca una stanza'], ['parente', 'I parenti'], ['infermiere', 'L\'infermiere'], ['citta', 'La città e la sanità']];
  const VANTAGGI = {
    ospita: [
      ['persone', 'Non resti più solo in casa', 'Scegli tu chi entra, fra persone della tua età con abitudini e hobby simili, dopo la valutazione dell\'infermiere.'],
      ['euro', 'Un affitto ogni mese', 'Chi entra ti paga affitto e spese direttamente, con bonifico. Nessuna commissione: il programma non incassa nulla.'],
      ['infermiere', 'L\'infermiere segue anche te', `Sei una persona seguita come le altre: controlli ogni ${REGOLE.controlloMesi} mesi e ${REGOLE.interventiInclusi} interventi al mese anche per te. La tua parte la paghi all'infermiere con una parte dell'affitto che ricevi: non metti soldi di tasca tua.`],
      ['mano', 'Un figlio può aiutarti', 'Se vuoi, un parente gestisce con te richieste e incassi dal suo account. Il consenso lo dai tu e lo togli quando vuoi.'],
      ['scudo', 'Resta casa tua', 'Non diventi una struttura: non organizzi l\'assistenza, ogni ospite firma da sé con l\'infermiere.']],
    cerca: [
      ['casa', 'Una casa vera, non una struttura', `Una stanza tua in una casa del quartiere, con al massimo ${REGOLE.maxAbitanti} persone.`],
      ['persone', 'Compagnia scelta', 'Vedi età, abitudini e hobby di chi ci vive prima di chiedere; l\'infermiere valuta se la convivenza può funzionare.'],
      ['infermiere', 'Un infermiere che ti conosce', `${REGOLE.interventiInclusi} interventi al mese già pagati, controlli ogni ${REGOLE.controlloMesi} mesi, reperibile al telefono. Dalla ${REGOLE.interventiInclusi + 1}ª prestazione del mese, e nei festivi fuori da una terapia, ${euro(REGOLE.tariffaIntervento)} l'una.`],
      ['euro', 'Costi chiari, pagati direttamente', 'Affitto e spese a chi apre la casa, la quota all\'infermiere; nessuna commissione. Servizi del territorio e ore di badante o di OSS solo se servono, con contratto diretto.']],
    parente: [
      ['persone', 'Vedi solo ciò che la persona sceglie', 'Richieste, costi, visite: ogni parte si accende e si spegne dall\'account della persona. Tu guardi, non puoi agire al suo posto.'],
      ['scudo', 'La salute è un consenso a parte', 'Per i dati di salute serve un consenso esplicito e specifico (GDPR, art. 9).'],
      ['calendario', 'Il consenso si rinnova', `Va riconfermato ogni ${REGOLE.controlloMesi} mesi e si toglie con un clic, con la stessa facilità con cui si dà (GDPR, art. 7).`],
      ['regola', 'Se la persona non può più decidere', 'Decide chi ne ha il titolo: l\'amministratore di sostegno con poteri in ambito sanitario o il fiduciario indicato nelle DAT (L. 219/2017, artt. 3 e 4).']],
    infermiere: [
      ['infermiere', 'Sceglie le sue case', `Al massimo ${REGOLE.maxCaseInfermiere} case nella sua zona; per ogni casa ${euro(REGOLE.euroGiornoCasa)} per ogni giorno feriale.`],
      ['euro', 'Tutto il compenso a lui', `${REGOLE.interventiInclusi} interventi al mese per persona già pagati (${euro(REGOLE.prezzoIntervento)} l'uno); dalla ${REGOLE.interventiInclusi + 1}ª prestazione e nei festivi ${euro(REGOLE.tariffaIntervento)}. Nessuna commissione: tutto il compenso è suo, pagato direttamente.`],
      ['calendario', 'Le fasce le decide lui', 'Indica le ore in cui è reperibile e il collega che lo sostituisce.'],
      ['scudo', 'Anche chi lavora nel servizio pubblico', 'Fino al 31/12/2027 gli infermieri dipendenti possono lavorare anche in libera professione, fuori orario e con l\'autorizzazione della loro azienda (art. 3-quater DL 127/2021).']],
    citta: [
      ['casa', 'Nessun edificio da costruire', 'Si usano le stanze vuote delle case che ci sono già.'],
      ['infermiere', 'L\'infermiere vicino alle case', 'Il DM 77/2022 prevede almeno un infermiere di famiglia o di comunità ogni 3.000 abitanti: qui trova persone anziane riunite in poche case.'],
      ['persone', 'Meno solitudine', 'In uno studio su 171 persone anziane, chi vive in co-housing si sente meno solo e ha più sostegno sociale. È uno studio trasversale: un\'associazione, non una prova di causa.'],
      ['regola', 'Da misurare nel pilota', 'Accessi al pronto soccorso, ricoveri, ingressi in RSA, solitudine e costi: sono gli esiti da misurare, non ancora dimostrati.']]
  };
  const TITOLI_CALC = { ospita: 'Quanto ti resta ogni mese', cerca: 'Quanto paghi ogni mese', infermiere: 'Quanto guadagna l\'infermiere' };
  const valoreG = k => k === 'affitto' ? `${euro(G.affitto)} al mese` : String(G[k]);
  const cursore = (k, testo, min, max, st) => `<label class="g-range"><span>${esc(testo)} <b id="g-v-${k}">${esc(valoreG(k))}</b></span><input type="range" min="${min}" max="${max}" step="${st}" value="${G[k]}" data-guida-in="${k}"></label>`;
  function controlli(r) {
    if (r === 'ospita') return `<div class="g-controlli">${cursore('affitto', 'Affitto della stanza', 300, 600, 10)}${cursore('ospiti', 'Ospiti in casa', 1, REGOLE.maxAbitanti - 1, 1)}</div>`;
    if (r === 'cerca') return `<div class="g-controlli"><label class="g-range"><span>Casa di esempio</span><select data-guida-in="casaC">${S.case.map(c => `<option value="${c.id}"${G.casaC === c.id ? ' selected' : ''}>${esc(`Casa di ${c.ospita.nome}, ${c.quartiere}`)}</option>`).join('')}</select></label>
      ${cursore('prest', 'Interventi dell\'infermiere nei giorni feriali, in un mese', 0, 12, 1)}${cursore('fest', 'Interventi nei festivi, fuori da una terapia', 0, 4, 1)}</div>`;
    if (r === 'infermiere') return `<div class="g-controlli">${cursore('nCase', 'Case seguite', 1, REGOLE.maxCaseInfermiere, 1)}${cursore('nPers', 'Persone seguite in ogni casa', 1, REGOLE.maxAbitanti, 1)}</div>`;
    return '';
  }
  // i conti dei tre calcolatori, in un posto solo: li usano sia il disegno sia l'aggiornamento dal vivo
  function conti() {
    const q = quotaCasaMese(), inc = REGOLE.interventiInclusi, tar = REGOLE.tariffaIntervento;
    if (G.ruolo === 'ospita') { const n = G.ospiti + 1, parte = q / n + INTERV_MESE(), entrate = G.ospiti * G.affitto, netto = entrate - parte; return { q, n, parte, entrate, netto, vivo: { netto: euro(netto), anno: euro(netto * 12) } }; }
    if (G.ruolo === 'cerca') { const c = casa(G.casaC) || S.case[0], x = canone(c, postiLiberi(c) === 0), oltre = Math.max(0, G.prest - inc), extra = (oltre + G.fest) * tar; return { c, x, oltre, extra, vivo: { totale: euro(x.totale), extra: extra ? '+' + euro(extra) : 'niente' } }; }
    if (G.ruolo === 'infermiere') { const pp = INTERV_MESE(), a = G.nCase * q, b = G.nCase * G.nPers * pp; return { q, pp, a, b, vivo: { tot: euro(a + b), anno: euro((a + b) * 12) } }; }
    return { vivo: {} };
  }
  // barre orizzontali in HTML: ogni valore è scritto accanto alla barra
  function barreH(righe, fmt) {
    const f = fmt || euro, max = Math.max(...righe.map(r => r[1]), 1e-9);
    return `<div class="g-hbar">${righe.map(([t, v, col, nota]) => `<div class="riga" ${tip(f(v), t, nota)}><div class="testa"><span>${esc(t)}</span><b>${esc(f(v))}</b></div>
      <div class="traccia"><div class="fill" style="width:${(v / max * 100).toFixed(1)}%;background:${col}"></div></div>${nota ? `<span class="muto micro">${esc(nota)}</span>` : ''}</div>`).join('')}</div>`;
  }
  function colonneExtra() {
    const W = 420, H = 196, L = 40, R = 8, T = 26, B = 30, pw = W - L - R, ph = H - T - B, base = T + ph, n = 13, inc = REGOLE.interventiInclusi, tar = REGOLE.tariffaIntervento;
    const max = (12 - inc + 4) * tar, y = v => T + ph - v / max * ph, slot = pw / n, bw = slot - 6, ticks = [0, 50, 100, 150, 200];
    const cols = Array.from({ length: n }, (_, k) => {
      const v = (Math.max(0, k - inc) + G.fest) * tar, x = L + k * slot + 3, sel = k === G.prest, yt = Math.min(base - 2, y(v));
      return barraV(x, bw, yt, base, `fill="${SERIE[0]}" opacity="${sel ? 1 : 0.32}" ${tip(`+${euro(v)}`, `${nI(k, 'intervento feriale', 'interventi feriali')}${G.fest ? ` e ${nI(G.fest, 'festivo', 'festivi')}` : ''}`, 'da pagare all\'infermiere il mese dopo')}`)
        + `<text x="${x + bw / 2}" y="${base + 18}" text-anchor="middle"${sel ? ' class="g-anno"' : ''}>${k}</text>`
        + (sel ? `<text class="g-val" x="${x + bw / 2}" y="${yt - 7}" text-anchor="middle">+${esc(euro(v))}</text>` : '');
    }).join('');
    const xs = L + (inc + 1) * slot;
    return `<svg class="g-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(`Quanto si paga in più all'infermiere il mese dopo: niente fino a ${inc} interventi feriali, poi ${tar} euro per ogni intervento in più e per ogni festivo`)}">
      ${griglia(ticks, y, L, R, W, 0)}${cols}<line class="g-asse" x1="${xs}" x2="${xs}" y1="${T - 12}" y2="${base}"/><text class="g-nota" x="${xs + 6}" y="${T - 2}">${esc(`dalla ${inc + 1}ª: ${euro(tar)} l'una`)}</text></svg>
      <p class="muto micro">In basso gli interventi feriali del mese; la barra dice quanto si paga in più all'infermiere il mese dopo (euro). Si aggiorna quando lasci il cursore.</p>`;
  }
  function colonneInf() {
    const W = 420, H = 210, L = 46, R = 8, T = 24, B = 30, pw = W - L - R, ph = H - T - B, base = T + ph, n = REGOLE.maxCaseInfermiere;
    const q = quotaCasaMese(), pp = INTERV_MESE(), max = 5000, y = v => T + ph - v / max * ph, slot = pw / n, bw = slot - 8, ticks = [0, 1000, 2000, 3000, 4000, 5000];
    const cols = Array.from({ length: n }, (_, i) => {
      const k = i + 1, a = k * q, b = k * G.nPers * pp, x = L + i * slot + 4, sel = k === G.nCase, op = sel ? 1 : 0.32, ya = y(a), yb = y(a + b);
      return `<rect x="${x}" y="${ya}" width="${bw}" height="${base - ya}" fill="${SERIE[0]}" opacity="${op}" ${tip(euro(a), `Quota delle case, con ${k} case`, `${k} × ${euro(q)}`)}/>`
        + barraV(x, bw, yb, ya - 2, `fill="${SERIE[1]}" opacity="${op}" ${tip(euro(b), `Interventi già pagati, con ${k} case`, `${k * G.nPers} persone × ${euro(pp)}`)}`)
        + `<text x="${x + bw / 2}" y="${base + 18}" text-anchor="middle"${sel ? ' class="g-anno"' : ''}>${k}</text>`
        + (sel ? `<text class="g-val" x="${x + bw / 2}" y="${yb - 7}" text-anchor="middle">${esc(euro(a + b))}</text>` : '');
    }).join('');
    return `<svg class="g-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc('Compenso al mese dell\'infermiere da 1 a 10 case')}">${griglia(ticks, y, L, R, W, 0)}${cols}</svg>`;
  }
  const vivo = (k, testo) => `<b class="g-grande" data-g-live="${k}">${esc(testo)}</b>`;
  const vivoMedio = (k, testo) => `<b class="g-medio" data-g-live="${k}">${esc(testo)}</b>`;
  function calcOut() {
    const r = G.ruolo, k = conti(), fer = feriali(isoData(OGGI).slice(0, 7)), tar = REGOLE.tariffaIntervento, inc = REGOLE.interventiInclusi;
    if (r === 'ospita') {
      return `<div class="g-esito" aria-live="polite"><div><span class="etichetta">Ti restano ogni mese</span>${vivo('netto', k.vivo.netto)}</div><div><span class="etichetta">In un anno</span>${vivoMedio('anno', k.vivo.anno)}</div></div>
        ${barreH([['Affitti che incassi', k.entrate, SERIE[0], `${G.ospiti} × ${euro(G.affitto)}`],
          ['La tua parte dell\'infermiere, che paghi tu', k.parte, SERIE[1], `${euro(k.q)} della casa (${euro(REGOLE.euroGiornoCasa)} × ${fer} giorni feriali) divisi fra ${k.n} persone seguite, più ${euro(INTERV_MESE())} per i tuoi ${inc} interventi`]])}
        <p class="muto micro" style="margin-top:12px">${esc(`Affitto e spese te li paga direttamente chi entra; nessuna commissione. Valori di prova, novembre 2026; le tasse dell'affitto vanno verificate con un commercialista. Le barre si aggiornano quando lasci il cursore.`)}</p>`;
    }
    if (r === 'cerca') {
      const x = k.x, voci = [['Affitto della stanza', x.affitto, aChi(k.c.ospita.nome)], ['Spese di casa', x.spese, 'utenze e pulizie'], ['Quota dell\'infermiere', x.quota, `${euro(x.quotaCasa)} della casa divisi fra ${x.n} persone seguite`],
        [`${inc} interventi già pagati`, x.interv, `${inc} × ${euro(REGOLE.prezzoIntervento)}`]];
      return `<div class="g-esito" aria-live="polite"><div><span class="etichetta">Costo del mese</span>${vivo('totale', k.vivo.totale)}</div><div><span class="etichetta">In più all'infermiere il mese dopo</span>${vivoMedio('extra', k.vivo.extra)}</div></div>
        <div class="g-pila" role="img" aria-label="${esc('Il costo del mese diviso per voce: ' + voci.map(v => `${v[0]} ${euro(v[1])}`).join(', '))}">${voci.map((v, i) => `<span style="flex:${v[1].toFixed(2)};background:${SERIE[i]}" ${tip(euro(v[1]), v[0], v[2])}></span>`).join('')}</div>
        <table class="g-legenda"><tbody>${voci.map((v, i) => `<tr><td><i class="sw" style="background:${SERIE[i]}"></i>${esc(v[0])} <span class="muto micro">${esc(v[2])}</span></td><td class="num">${esc(euro(v[1]))}</td></tr>`).join('')}
          <tr class="tot"><td>Totale del mese</td><td class="num">${esc(euro(x.totale))}</td></tr></tbody></table>
        <p class="piccolo" style="margin:16px 0 4px">${esc(k.extra ? `${k.oltre ? `${nI(k.oltre, 'intervento', 'interventi')} oltre i ${inc}` : ''}${k.oltre && G.fest ? ' e ' : ''}${G.fest ? nI(G.fest, 'intervento festivo', 'interventi festivi') : ''}: ${k.oltre + G.fest} × ${euro(tar)} = ${euro(k.extra)} da pagare all'infermiere il mese dopo.` : `Fino a ${inc} interventi feriali al mese non paghi niente in più.`)}</p>
        ${colonneExtra()}`;
    }
    if (r === 'infermiere') {
      return `<div class="g-esito" aria-live="polite"><div><span class="etichetta">Al mese, lordi</span>${vivo('tot', k.vivo.tot)}</div><div><span class="etichetta">In un anno</span>${vivoMedio('anno', k.vivo.anno)}</div></div>
        ${colonneInf()}
        <div class="g-chiave"><span><i style="background:${SERIE[0]}"></i>${esc(`Quota delle case: ${G.nCase} × ${euro(k.q)} = ${euro(k.a)}`)}</span><span><i style="background:${SERIE[1]}"></i>${esc(`Interventi già pagati: ${G.nCase * G.nPers} persone × ${euro(k.pp)} = ${euro(k.b)}`)}</span></div>
        <p class="muto micro" style="margin-top:10px">${esc(`In basso il numero di case. Prima di tasse e contributi, con ${fer} giorni feriali (novembre 2026). In più ${euro(tar)} per ogni prestazione dalla ${inc + 1}ª del mese e nei festivi. Stima del progetto: con 10 case da 2 persone, da 40 a 80 ore di lavoro al mese. Il grafico si aggiorna quando lasci il cursore.`)}</p>`;
    }
    return '';
  }
  function consensoDemo() {
    const n = PARTI.filter(([k]) => G.perm[k]).length;
    return `<div class="g-carta"><h3>Prova: Lucia decide che cosa vede Marta</h3><p class="muto piccolo" style="margin-top:4px">Lucia, 82 anni, affitta una stanza alla Garbatella; la figlia Marta la aiuta dal suo account. Tocca gli interruttori.</p>
      <div class="g-interruttori">${PARTI.map(([k, t]) => `<button type="button" class="g-int" role="switch" aria-checked="${!!G.perm[k]}" data-azione="guida" data-id="perm:${k}"><span><b>${esc(t)}</b>${k === 'salute' ? '<span class="muto micro" style="display:block">consenso a parte, esplicito (GDPR, art. 9)</span>' : ''}</span><span class="leva" aria-hidden="true"></span></button>`).join('')}</div>
      <div class="g-vede"><b>Che cosa vede Marta</b>${PARTI.map(([k, t]) => `<div>${G.perm[k] ? '<span class="pill ok">vede</span>' : '<span class="pill">nascosto</span>'}<span>${esc(t)}</span></div>`).join('')}</div>
      <p class="muto micro" style="margin-top:12px">${esc(n ? `Marta vede ${n} parti su ${PARTI.length}. Ogni suo accesso finisce in un registro che Lucia può leggere.` : 'Marta non vede niente finché Lucia non accende una parte.')}</p></div>`;
  }
  const cittaCarta = () => `<div class="g-carta"><h3>Infermieri ogni 1.000 abitanti, 2022</h3><p class="muto piccolo" style="margin:4px 0 14px">Infermieri che lavorano con i pazienti.</p>
      ${barreH([['Italia', 6.5, SERIE[0], ''], ['Media dell\'Unione europea', 7.6, SERIE[1], '']], v => dec(v, 1))}
      <p class="g-fonte">Commissione europea, Country Report Italia 2025, SWD(2025) 212, tabella A14.1.</p>
      <p class="piccolo" style="margin-top:14px">Con meno infermieri della media europea, l'assistenza rende di più se va dove le persone vivono già, e le trova riunite.</p></div>`;
  function ruoloHtml() {
    const r = G.ruolo;
    const destra = r === 'parente' ? consensoDemo() : r === 'citta' ? cittaCarta()
      : `<div class="g-carta"><h3>${esc(TITOLI_CALC[r])}</h3>${controlli(r)}<div id="g-calc-out">${calcOut()}</div></div>`;
    return `<div class="g-seg" role="group" aria-label="Per chi">${RUOLI.map(([k, t]) => `<button type="button" data-azione="guida" data-id="ruolo:${k}" aria-pressed="${r === k}">${esc(t)}</button>`).join('')}</div>
      <div class="g-ruolo-griglia"><div class="punti">${VANTAGGI[r].map(x => punto(...x)).join('')}</div>${destra}</div>`;
  }

  function guida() {
    const capitoli = [['g-futuro', 'Il futuro nei dati'], ['g-come', 'Come funziona'], ['g-vantaggi', 'I vantaggi per ognuno'], ['g-regole', 'Le regole'], ['g-limiti', 'Cosa non sappiamo ancora']];
    const kicker = (n, t) => `<div class="g-kicker"><span>${String(n).padStart(2, '0')}</span>${esc(t)}</div>`;
    const tessera = (num, testo, fonte) => `<div class="tessera"><b class="grande">${esc(num)}</b><span>${esc(testo)}</span><span class="muto micro">${esc(fonte)}</span></div>`;
    const paragrafo = (t, x) => `<p><b>${esc(t)}</b>${esc(x)}</p>`;
    return `<div class="guida" id="guida">
      <div class="g-testa"><span class="pill rausch">Il servizio, spiegato a tutti</span>
        <h2 class="g-titolo">Due persone sole, una casa. <em>E un infermiere che le conosce.</em></h2>
        <p class="sotto">Per chi apre la casa, per chi cerca una stanza, per i parenti e per gli infermieri: come funziona, quanto costa, che cosa ci guadagna ognuno e perché i dati indicano questa direzione.</p>
        <nav class="g-indice" aria-label="Capitoli della guida">${capitoli.map(([id, t], i) => `<a href="#${id}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(t)}</a>`).join('')}</nav></div>

      <section class="g-sez" id="g-futuro">${kicker(1, 'Il futuro nei dati')}
        <h2>L'Italia invecchia, e sempre più anziani vivono soli</h2>
        <p class="g-intro">Non è un'opinione: sono le previsioni dell'ISTAT. Scegli un dato.</p>
        <div id="g-futuro-box">${futuroBox()}</div>
        <details class="g-dettagli" id="g-det"${G.tabella ? ' open' : ''}><summary>Tutti i dati in tabella, con la fonte</summary>${tabellaFuturo()}</details>
        <div class="g-tessere">
          ${tessera('+30%', 'rischio di demenza in chi vive da solo', 'RR 1,30 (IC 95% 1,15-1,46), 12 studi osservazionali; Desai 2020')}
          ${tessera('26%', 'della spesa sanitaria la pagano già famiglie e privati', 'Italia, 2023; Commissione europea 2025')}
          ${tessera('6,5 contro 7,6', 'infermieri ogni 1.000 abitanti, Italia e media UE', '2022; Commissione europea 2025')}
          ${tessera('1 ogni 3.000', 'abitanti: l\'infermiere di famiglia o di comunità previsto', 'DM 77/2022')}
        </div>
        <div class="g-perche">
          ${paragrafo('Più bisogno, meno mani. ', 'Più persone anziane e più persone sole, meno persone in età di lavoro e meno infermieri della media europea: l\'assistenza dovrà arrivare dove le persone vivono già.')}
          ${paragrafo('Due solitudini, una soluzione. ', 'Chi è rimasto solo in una casa grande ha una stanza vuota; chi è solo e cerca casa ha bisogno di compagnia e di un affitto sostenibile. Insieme, con un infermiere che li conosce, i due problemi diventano una risposta, senza costruire niente.')}
          ${paragrafo('La legge va nella stessa direzione. ', 'Il D.lgs. 29/2024 (art. 15) prevede linee guida nazionali sul senior cohousing; il DM 77/2022 porta l\'infermiere di famiglia e di comunità vicino alle case. Che le linee guida siano già state adottate è da verificare.')}
        </div>
      </section>

      <section class="g-sez" id="g-come">${kicker(2, 'Come funziona')}
        <h2>Dalla stanza vuota alla vita insieme, in sei passi</h2>
        <p class="g-intro">Tocca un passo. Ogni passo si può provare con un account di prova.</p>
        <div id="g-come-box">${passiHtml()}</div>
      </section>

      <section class="g-sez" id="g-vantaggi">${kicker(3, 'I vantaggi per ognuno')}
        <h2>Che cosa ci guadagna ognuno</h2>
        <p class="g-intro">Scegli per chi. I conti usano le stesse regole del mockup: muovi i cursori.</p>
        <div id="g-ruolo-box">${ruoloHtml()}</div>
      </section>

      <section class="g-sez" id="g-regole">${kicker(4, 'Le regole')}
        <h2>Le regole, in breve</h2>
        <div class="punti g-regole">
          ${punto('persone', 'Chi affitta è una persona anziana', 'Vive sola, o in coppia, e affitta una stanza per non restare sola. Un figlio o un altro parente può aiutarla con l\'account, con il suo consenso.')}
          ${punto('euro', 'I costi', `Affitto e spese a chi affitta, all'infermiere una quota (${euro(REGOLE.euroGiornoCasa)} per ogni giorno feriale, divisi fra le persone seguite) con ${REGOLE.interventiInclusi} interventi al mese già pagati (${euro(REGOLE.prezzoIntervento)} l'uno); dalla ${REGOLE.interventiInclusi + 1}ª prestazione del mese e nei festivi ${euro(REGOLE.tariffaIntervento)} l'una. Pagamenti diretti, nessuna commissione. Valori di prova.`)}
          ${punto('scudo', 'Una casa, non una struttura', `Al massimo ${REGOLE.maxAbitanti} persone in casa, si entra con Barthel da ${REGOLE.barthelMin} in su, nessuna assistenza continua: il TAR Lazio (sentenza 1286/2022) chiude come struttura abusiva la casa dove si vive per ricevere assistenza organizzata da altri.`)}
          ${punto('infermiere', 'Infermieri a partita IVA', `${euro(REGOLE.euroGiornoCasa)} per ogni giorno feriale e ogni casa seguita, al massimo ${REGOLE.maxCaseInfermiere} case, più gli interventi: tutto a loro. Fino al 31/12/2027 possono unirsi anche i dipendenti del servizio sanitario, fuori orario e con autorizzazione (art. 3-quater DL 127/2021).`)}
          ${punto('calendario', 'Il pilota', 'Proposta: partire con un Comune come programma di coabitazione (L.R. Lazio 16/2026, art. 8), con la sola comunicazione di inizio attività.')}
        </div>
      </section>

      <section class="g-sez" id="g-limiti">${kicker(5, 'Cosa non sappiamo ancora')}
        <h2>Che cosa è provato e che cosa no</h2>
        <div class="g-limiti">
          ${paragrafo('Le prove sul co-housing sono indirette. ', 'Gli studi riguardano comunità con appartamenti separati e spazi comuni (Delgado-Losada 2026; Rusinovic 2019). Per coinquilini nella stessa casa non abbiamo trovato prove dirette.')}
          ${paragrafo('Vivere da soli e demenza: un\'associazione. ', 'Il rischio più alto viene da studi osservazionali: non dimostra che vivere insieme lo riduca.')}
          ${paragrafo('I prezzi sono di prova. ', 'Affitti, compenso dell\'infermiere e costi del programma vanno validati con un pilota e con un commercialista.')}
          ${paragrafo('Le regole vanno verificate. ', 'Il confine con le strutture (TAR Lazio 1286/2022), la coabitazione con un Comune (L.R. Lazio 16/2026) e il trattamento dei dati di salute vanno controllati con un legale e con il responsabile della protezione dei dati.')}
          ${paragrafo('Le previsioni sono scenari. ', 'L\'ISTAT dà uno scenario mediano con un intervallo di incertezza; per le persone sole la previsione arriva al 2043.')}
        </div>
        <div class="g-fonti"><b>Fonti</b>
          <span>ISTAT, Previsioni della popolazione residente e delle famiglie, base 1/1/2023, comunicato del 24/7/2024.</span>
          <span>Desai R. e altri, Ageing Research Reviews 2020, DOI 10.1016/j.arr.2020.101122.</span>
          <span>Delgado-Losada M. L. e altri, Frontiers in Public Health 2026, DOI 10.3389/fpubh.2026.1778370. Rusinovic K. e altri, IJERPH 2019, DOI 10.3390/ijerph16193776.</span>
          <span>Commissione europea, 2025 Country Report Italy, SWD(2025) 212. DM 77/2022. D.lgs. 29/2024, art. 15. L. 219/2017. Regolamento UE 2016/679, artt. 7 e 9. DL 127/2021, art. 3-quater. TAR Lazio, sez. II bis, sentenza 1286/2022. L.R. Lazio 16/2026.</span>
        </div>
      </section>
      <div id="g-tip" class="g-tip" role="tooltip" hidden></div>
    </div>`;
  }
  // ridisegna la vista d'accesso senza perdere posizione, elemento attivo e quanto scritto nel login
  function ridisegnaGuida(fuoco, anima) {
    G.anima = !!anima;
    const e0 = document.getElementById('login-email'), p0 = document.getElementById('login-pw'), em = e0 ? e0.value : '', pw = p0 ? p0.value : '', y = window.scrollY;
    disegna();
    const v = document.querySelector('#app > .vista'); if (v) v.style.animation = 'none'; // niente dissolvenza d'ingresso a ogni clic
    const e1 = document.getElementById('login-email'), p1 = document.getElementById('login-pw'); if (e1) e1.value = em; if (p1) p1.value = pw;
    window.scrollTo({ top: y, behavior: 'instant' });
    const b = fuoco && document.querySelector(fuoco); if (b) b.focus({ preventScroll: true });
  }
  function guidaClic(id) {
    const [k, v] = String(id).split(':');
    if (k === 'ind' && FUTURO.some(x => x.id === v)) G.ind = v;
    else if (k === 'passo') G.passo = Math.max(0, Math.min(PASSI.length - 1, Number(v) || 0));
    else if (k === 'ruolo' && VANTAGGI[v]) G.ruolo = v;
    else if (k === 'perm' && v in G.perm) G.perm[v] = !G.perm[v];
    else return;
    ridisegnaGuida(`.guida [data-id="${k}:${k === 'passo' ? G.passo : v}"]`, k === 'ind');
  }
  // mentre il cursore si muove cambiano solo i testi (textContent); il grafico si ridisegna al rilascio
  function guidaDalVivo(k, valoreNuovo) {
    G[k] = valoreNuovo;
    const etichetta = document.getElementById('g-v-' + k); if (etichetta) etichetta.textContent = valoreG(k);
    const v = conti().vivo; document.querySelectorAll('[data-g-live]').forEach(el => { if (el.dataset.gLive in v) el.textContent = v[el.dataset.gLive]; });
  }
  function mostraTip(el, x, y) {
    const t = document.getElementById('g-tip'); if (!t) return;
    const [v, ...resto] = String(el.dataset.tip || '').split('|');
    t.replaceChildren(); const b = document.createElement('b'); b.textContent = v; t.appendChild(b);
    resto.forEach(r => { const s = document.createElement('span'); s.textContent = r; t.appendChild(s); });
    t.hidden = false; const w = t.offsetWidth, h = t.offsetHeight;
    t.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + 'px';
    t.style.top = (y - h - 14 < 8 ? y + 18 : y - h - 14) + 'px';
  }
  const nascondiTip = () => { const t = document.getElementById('g-tip'); if (t && !t.hidden) t.hidden = true; };

  function vistaAccesso() {
    const carta = (id, figura, chi) => `<button class="carta-utenza" data-azione="entra" data-id="${id}"><div class="figura">${figura}</div>
      <div class="testo"><h3>${esc(UTENZE[id].nome)}</h3><span class="chi">${esc(chi)}</span><p class="piccolo">${esc(UTENZE[id].testo)}</p><span class="vai">Entra ${ico('destra')}</span></div></button>`;
    return `<section class="vista accesso">
      <span class="pill rausch">Hackathon · la salute fra 30 anni</span>
      <h1 style="margin-top:16px">Una stanza in una casa vera, <em>con un infermiere di riferimento</em>.</h1>
      <p class="sotto">Una persona anziana che vive sola in una casa troppo grande affitta una stanza a un coetaneo, con l'aiuto dei parenti se serve: così nessuno dei due resta solo. Il programma, gestito senza commissioni da un Comune o da un ente del Terzo settore, mette in contatto le persone e affida la casa a un infermiere di zona, che riceve le richieste, programma il sopralluogo, valuta di persona e resta il riferimento della casa. Un parente può seguire l'account di ognuno dei due, se la persona lo vuole.</p>
      <div class="login-griglia">
        <div class="login-box" role="form" aria-label="Accesso">
          <h2>Accedi</h2>
          <label class="campo">Email<input id="login-email" type="email" autocomplete="off" placeholder="nome@casainrete.example"></label>
          <label class="campo">Password<input id="login-pw" type="password" autocomplete="off" placeholder="password"></label>
          <button class="btn pieno" type="button" data-azione="login">Accedi</button>
          <p class="muto micro">Login finto: è un mockup e non c'è un server. Per ogni account di prova la password è «prova».</p>
        </div>
        <div><h2 style="margin-bottom:6px">Account di prova</h2><p class="muto piccolo" style="margin-bottom:12px">Tocca un account per riempire il modulo, poi «Accedi».</p>
          <div class="lista-account">${ACCOUNT_PROVA.map(x => `<button type="button" class="account-prova" data-azione="riempi-login" data-id="${esc(x.email)}"><b>${esc(UTENZE[x.ruolo].nome)}</b><span>${esc(x.email)}</span></button>`).join('')}</div></div>
      </div>
      ${guida()}
    </section>`;
  }

  /* ---------- vista: ricerca ---------- */
  function vistaCerca() {
    const f = S.filtri, quartieri = [...new Set(S.case.map(c => c.quartiere))];
    const pill = `<div class="segmento"><label for="q">Dove</label><select id="q" data-filtro="quartiere"><option value="tutti">Tutta Roma (prova)</option>${quartieri.map(q => `<option${f.quartiere === q ? ' selected' : ''}>${esc(q)}</option>`).join('')}</select></div>
      <div class="segmento"><label for="mc">Canone al mese</label><select id="mc" data-filtro="maxCanone">${[[0, 'Qualsiasi cifra'], [600, 'Fino a 600 €'], [650, 'Fino a 650 €'], [700, 'Fino a 700 €']].map(([v, t]) => `<option value="${v}"${f.maxCanone === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="segmento"><label for="ti">Chi ospita</label><select id="ti" data-filtro="tipo"><option value="">Da sola o in coppia</option><option value="sola"${f.tipo === 'sola' ? ' selected' : ''}>Una persona sola</option><option value="coppia"${f.tipo === 'coppia' ? ' selected' : ''}>Una coppia</option></select></div>`;
    const tags = [...new Set(S.case.flatMap(c => c.tag))];
    const lista = S.case.filter(c => f.quartiere === 'tutti' || c.quartiere === f.quartiere).filter(c => !f.tag || c.tag.includes(f.tag))
      .filter(c => !f.maxCanone || canone(c).totale <= f.maxCanone).filter(c => !f.tipo || (f.tipo === 'coppia') === !!c.ospita.coppia)
      .sort((a, b) => (postiLiberi(b) > 0) - (postiLiberi(a) > 0) || canone(a).totale - canone(b).totale);
    const carta = c => {
      const x = canone(c), lib = postiLiberi(c);
      return `<button class="annuncio" data-azione="scheda" data-id="${c.id}" aria-label="Apri la casa di ${esc(c.ospita.nome)}">
        <div class="foto">${fotoCasa(c)}<span class="cuore">${CUORE}</span></div>
        <div class="righe"><div class="riga"><b>${esc(c.quartiere)} · Casa di ${esc(c.ospita.nome)}</b></div>
          <span class="muto">${esc(c.stanza.tipo)} · ${esc(c.stanza.piano)}</span>
          <span class="muto">${lib ? `Ci vivono ${plurale(c.abitanti.length, 'persona', 'persone')}` : 'Al completo'} · infermiere: ${esc(inf(c.infermiere).nome)}</span>
          <span class="prezzo"><b>${euro(x.totale)}</b> al mese con la quota dell'infermiere</span></div></button>`;
    };
    return `<section class="vista">
      <div class="zona-ricerca"><div class="ricerca-pill" role="search">${pill}<button class="orb" data-azione="cerca" aria-label="Cerca">${ico('cerca')}</button></div></div>
      <div class="categorie">${tags.map(t => `<button class="categoria" data-azione="categoria" data-id="${esc(t)}" aria-pressed="${f.tag === t}">${ico(TAG_ICO[t] || 'check')}${esc(t)}</button>`).join('')}</div>
      <div class="titolo-lista" id="risultati"><h2>${plurale(lista.length, 'casa', 'case')} con una stanza</h2><span class="muto piccolo">Costo al mese per persona: affitto, spese e quota dell'infermiere, pagati direttamente. Nessuna commissione.</span></div>
      ${bannerParente()}
      <div class="griglia-annunci">${lista.map(carta).join('') || '<div class="vuoto">Nessuna casa con questi filtri.</div>'}</div>
      ${NOTA_FOTO}
      <div class="avviso grigio" style="margin-top:32px">${ico('casa')}<span>Vivi da solo in una casa troppo grande, o ci vive un tuo genitore? <button class="btn terziario" data-azione="entra" data-id="ospita">Guarda come funziona per chi affitta la stanza</button></span></div>
    </section>`;
  }

  /* ---------- vista: scheda della casa ---------- */
  function vistaScheda() {
    const c = casa(S.scheda), i = inf(c.infermiere), sost = inf(i.sostituto), x = canone(c), lib = postiLiberi(c);
    const giaChiesta = S.richieste.some(r => r.mia && r.casa === c.id && !['rifiutata', 'non-adatta'].includes(r.stato));
    const puo = S.utenza === 'cerca' && !S.parente && lib > 0 && !giaChiesta && c.agibilita.dichiarata;
    const bottone = S.utenza !== 'cerca' ? 'Solo per chi cerca casa' : S.parente ? 'Solo Giulio può mandare la richiesta' : !c.agibilita.dichiarata ? 'Annuncio in preparazione: manca l\'agibilità' : giaChiesta ? 'Richiesta già mandata' : lib ? 'Chiedi un sopralluogo' : 'Al completo';
    return `<section class="vista">
      <button class="indietro" data-azione="indietro">${ico('sinistra')} Indietro</button>
      <div class="annuncio-testa"><div><h1>Casa di ${esc(c.ospita.nome)}: ${esc(c.titolo.charAt(0).toLowerCase() + c.titolo.slice(1))}</h1>
        <p class="piccolo" style="margin-top:6px">${esc(c.quartiere)}, Roma · <span class="pill ${lib ? 'ok' : 'no'}">${lib ? plurale(lib, 'stanza libera', 'stanze libere') : 'Al completo'}</span></p></div>
        <div class="azioni-testa"><button class="btn terziario">${ico('condividi')} Condividi</button><button class="btn terziario">${ico('cuore')} Salva</button></div></div>
      <div class="galleria"><div>${fotoCasa(c)}</div><div>${fotoEsterno(c)}</div><div>${fotoSala(c)}</div></div>
      ${FOTO[c.id] ? NOTA_FOTO : ''}
      <div class="dettaglio"><div>
        <div class="sezione sottotitolo-annuncio"><h2>${esc(c.stanza.tipo)}, ${c.stanza.mq} m²</h2><p>${esc(c.stanza.piano)} · ${plurale(c.abitanti.length, 'persona vive', 'persone vivono')} già qui · al massimo ${REGOLE.maxAbitanti} in casa</p></div>
        <div class="sezione"><div class="host"><span class="avatar">${esc(c.ospita.nome.charAt(0))}</span><div><b>Ospita ${esc(c.ospita.nome)}${c.ospita.eta ? `, ${esc(String(c.ospita.eta))} anni` : ''}</b><p class="muto piccolo">${esc(c.ospita.presentazione)}</p></div></div></div>
        <div class="sezione"><h2>Chi vive già qui</h2><p class="muto piccolo">Solo età, abitudini e hobby, scelti da ognuno. I dati di salute li vede solo l'infermiere.</p><div class="profili">${c.abitanti.map(a => profilo(a)).join('')}</div></div>
        <div class="sezione punti">
          ${punto('infermiere', `Infermiere di riferimento: ${i.nome}`, `${i.titolo}. Reperibile al telefono ${i.fasce}; lo sostituisce ${sost.nome}. Di notte: 112 e continuità assistenziale.`)}
          ${punto('check', 'Che cosa fa', 'Valuta al sopralluogo, controlla ogni 6 mesi, fa piccoli trattamenti prescritti dal medico (medicazioni, iniezioni), parla con il medico di famiglia.')}
          ${punto('regola', 'Che cosa non fa', 'Non è presente in casa ogni giorno e non fa assistenza continua: se diventa necessaria, accompagna verso il servizio giusto.')}
          ${punto('mano', 'Aiuto condiviso quando serve', `Per un periodo la casa può dividersi una collaboratrice o un OSS, fino a ${REGOLE.aiutoOreMax} ore al giorno e ${REGOLE.aiutoGiorniMax} giorni: il prezzo si divide secondo il bisogno valutato dall'infermiere.`)}
        </div>
        <div class="sezione"><h2>La casa è adatta?</h2><p class="muto piccolo" style="margin-bottom:12px">Controllata con foto e descrizione, confermata dall'infermiere al sopralluogo. ${c.agibilita.dichiarata ? esc(c.agibilita.estremi) + '.' : 'Agibilità non ancora dichiarata.'} L'agibilità è un atto depositato in Comune: il programma non la certifica.</p>${listaIdoneita(c)}</div>
        <div class="sezione"><h2>Regole della casa</h2><div class="lista-segni">${c.regole.map(o => `<div>${ico('regola')}<span>${esc(o)}</span></div>`).join('')}</div></div>
      </div>
      <aside class="prenota" aria-label="Costi del mese">
        <div class="prezzo-grande"><b>${euro(x.totale)}</b><span>al mese: affitto e spese a chi apre la casa, quota all'infermiere; nessuna commissione</span></div>
        <button class="btn pieno" data-azione="apri-questionario" ${puo ? '' : 'disabled'}>${esc(bottone)}</button>
        <p class="nota">Prima il questionario; poi ${esc(i.nome)} programma il sopralluogo e ti dice giorno e ora.</p>
        ${vociCanone(x, c)}
        <p class="muto piccolo" style="margin-top:8px">La quota dell'infermiere comprende ${REGOLE.interventiInclusi} interventi al mese. Dalla ${REGOLE.interventiInclusi + 1}ª prestazione del mese, e per ogni intervento in un giorno festivo, ${euro(REGOLE.tariffaIntervento)} da pagare all'infermiere il mese dopo; nei festivi no, se continua una terapia iniziata in un giorno feriale.</p>
        <p class="muto micro" style="margin-top:12px">Contratto di locazione della stanza (L. 431/1998). Tasse dell'affitto e ruolo del programma da verificare con un legale: è una prova.</p>
      </aside></div>
    </section>`;
  }

  /* ---------- vista: le richieste di chi cerca ---------- */
  const STATO_R = {
    nuova: ['attesa', 'L\'infermiere deve programmare il sopralluogo'], sopralluogo: ['info', 'Sopralluogo'], valutata: ['ok', 'L\'infermiere dice: adatta'],
    accettata: ['ok', 'Accettata: si firma il contratto'], 'non-adatta': ['no', 'Serve un altro servizio'], rifiutata: ['no', 'Non accettata']
  };
  const pillStato = r => `<span class="pill ${STATO_R[r.stato][0]}">${esc(STATO_R[r.stato][1])}${r.stato === 'sopralluogo' ? ' il ' + esc(dataLunga(r.sopralluogo) + oraDi(r)) : ''}</span>`;
  function passi(r) {
    const no = ['non-adatta', 'rifiutata'].includes(r.stato), k = ['nuova', 'sopralluogo', 'valutata', 'accettata'].indexOf(r.stato);
    const st = [['Questionario mandato', true], [r.sopralluogo ? 'Sopralluogo il ' + dataLunga(r.sopralluogo) + oraDi(r) : 'Sopralluogo da programmare', k >= 1 || no], ['Valutazione dell\'infermiere', k >= 2 || r.stato === 'non-adatta'],
      [r.stato === 'non-adatta' ? 'Altro servizio' : r.stato === 'rifiutata' ? 'Non accettata' : 'Ingresso', r.stato === 'accettata' || no]];
    return `<div class="passi">${st.map(([t, f], i) => `<span class="${f ? (no && i === 3 ? 'no' : 'fatto') : ''}">${esc(t)}</span>`).join('')}</div>`;
  }
  function vistaRichieste() {
    const mie = S.richieste.filter(r => r.mia);
    if (!vede('richieste')) return `<section class="vista">${bannerParente()}${nascosto('richieste')}</section>`;
    return `<section class="vista">${bannerParente()}
      <div class="pagina-titolo"><h1>${S.parente ? 'Le richieste di Giulio' : 'Le tue richieste'}</h1><p>Chi affitta vede età, abitudini e hobby, non il nome. L'infermiere della casa riceve la richiesta e programma il sopralluogo nella fascia indicata. Nome e documenti si condividono dopo l'accettazione.</p></div>
      <div class="blocco">${mie.map(r => { const c = casa(r.casa); return `<div class="carta-viaggio">
        <div class="mini">${fotoCasa(c)}</div>
        <div><h3>Casa di ${esc(c.ospita.nome)}, ${esc(c.quartiere)}</h3><p class="muto piccolo" style="margin-top:4px">Richiesta ${esc(r.id)} · compilata da: ${esc(r.persona.compila.toLowerCase())} · mandata il ${esc(dataLunga(r.ricevuta))} · preferenza: ${esc(r.fascia.toLowerCase())} · ${euro(canone(c).totale)} al mese · infermiere: ${esc(inf(c.infermiere).nome)}</p>
          ${r.valutazione ? `<p class="piccolo" style="margin-top:6px">Valutazione di ${esc(inf(c.infermiere).nome)}: ${vede('salute') ? esc(r.valutazione.note) : 'esito disponibile, dettagli di salute non condivisi.'}${r.valutazione.servizio ? ` <b>Servizio indicato:</b> ${esc(r.valutazione.servizio)}.` : ''}</p>` : ''}
          ${r.stato === 'accettata' ? '<p class="piccolo" style="margin-top:6px;color:var(--verde)">Ora condividete nome e documenti e firmate il contratto di locazione della stanza.</p>' : ''}
          ${passi(r)}</div>
        <div class="azioni-v">${pillStato(r)}<button class="btn secondario piccolo" data-azione="scheda" data-id="${c.id}">Vedi la casa</button>
          ${r.stato === 'nuova' && !S.parente ? `<button class="btn terziario" data-azione="ritira" data-id="${esc(r.id)}">Ritira</button>` : ''}${['non-adatta', 'rifiutata'].includes(r.stato) ? '<button class="btn piccolo" data-azione="tab-c" data-id="cerca">Cerca un\'altra casa</button>' : ''}</div>
      </div>`; }).join('') || '<div class="vuoto">Nessuna richiesta. Cerca una casa e chiedi un sopralluogo.</div>'}</div>
    </section>`;
  }

  /* ---------- vista: chi ospita ---------- */
  function vistaOspita() {
    const c = casa(S.casaOspite), i = inf(c.infermiere), tab = S.tabOspita;
    const titolo = { richieste: 'Le richieste per la stanza', casa: 'La casa', incassi: 'Incassi', vantaggi: 'I vantaggi di affittare con Casa in Rete', famiglia: S.parente ? 'Che cosa vedo' : 'Famiglia e consenso' }[tab];
    const testa = `<div class="saluto"><div><h1>${esc(titolo)}</h1><p>Casa di ${esc(c.ospita.nome)} · ${esc(c.quartiere)} · infermiere di riferimento: ${esc(i.nome)}</p></div>
      ${S.parente ? '' : `<label class="scelta-demo">Chi affitta (solo per la prova)<select data-azione-cambio="casa">${S.case.map(x => `<option value="${x.id}"${x.id === c.id ? ' selected' : ''}>${esc(x.ospita.nome)} · ${esc(x.quartiere)}</option>`).join('')}</select></label>`}</div>${bannerParente()}`;
    if (tab === 'famiglia') return `<section class="vista">${testa}${pannelloConsenso('ospita:' + c.id, c.ospita.nome)}</section>`;
    if (tab === 'vantaggi') return `<section class="vista">${testa}${vistaVantaggi(c, i)}</section>`;
    if (tab === 'incassi' && !vede('costi')) return `<section class="vista">${testa}${nascosto('costi')}</section>`;
    if (tab === 'richieste' && !vede('richieste')) return `<section class="vista">${testa}${nascosto('richieste')}</section>`;
    if (tab === 'casa') {
      const manca = IDONEITA.filter(([k]) => !c.idoneita[k]).length;
      return `<section class="vista">${testa}
        <div class="riepilogo" style="margin-top:24px">
          <div class="tessera"><span class="etichetta">Persone in casa</span><b class="grande">${c.abitanti.length} <span class="muto" style="font-size:16px;font-weight:400">su ${REGOLE.maxAbitanti} al massimo</span></b></div>
          <div class="tessera"><span class="etichetta">Stanze libere</span><b class="grande">${postiLiberi(c)}</b></div>
          <div class="tessera"><span class="etichetta">Canone per chi entra</span><b class="grande">${euro(canone(c).totale)}</b></div>
          <div class="tessera"><span class="etichetta">Idoneità</span><b class="grande">${IDONEITA.length - manca} <span class="muto" style="font-size:16px;font-weight:400">su ${IDONEITA.length}</span></b></div>
        </div>
        <div class="griglia-2"><div>
          <h2 style="margin-bottom:8px">Idoneità per una persona anziana</h2><p class="muto piccolo" style="margin-bottom:12px">Tocca una voce per segnarla. Quello che manca si vede nell'annuncio; l'infermiere lo controlla al sopralluogo.</p>
          ${listaIdoneita(c, true)}
          <h2 style="margin:28px 0 8px">Agibilità</h2>
          <button type="button" class="chip" data-azione="agibilita" aria-pressed="${c.agibilita.dichiarata}">Dichiaro che la casa ha l'agibilità</button>
          <p class="muto piccolo" style="margin-top:8px">${esc(c.agibilita.estremi)}. È una segnalazione certificata depositata in Comune (DPR 380/2001, art. 24): foto e descrizione non la sostituiscono.</p>
        </div><div>
          <h2 style="margin-bottom:8px">Le regole per chi ospita</h2>
          <div class="punti">
            ${punto('scudo', 'Non organizzi l\'assistenza', 'Ogni persona firma da sola con l\'infermiere. Se la casa servisse a ricevere assistenza organizzata da te, diventerebbe una struttura da autorizzare (TAR Lazio 1286/2022).')}
            ${punto('persone', `Al massimo ${REGOLE.maxAbitanti} persone, chi ospita compreso`, 'Restare piccoli tiene la casa lontana dai limiti di legge per le strutture.')}
            ${punto('euro', 'Ricevi affitto e spese', 'Direttamente da chi entra, con bonifico. Nessuna commissione: il programma non incassa nulla.')}
            ${punto('infermiere', 'Non resti solo', `Se qualcuno peggiora, ${i.nome} valuta e accompagna il passaggio verso il servizio giusto.`)}
          </div></div></div>
        <div class="blocco"><h2>Chi vive qui</h2><p class="muto piccolo">Così vi vedono le persone che cercano casa: età, abitudini e hobby.</p><div class="profili">${c.abitanti.map(a => profilo(a)).join('')}</div></div>
      </section>`;
    }
    if (tab === 'incassi') {
      const paganti = c.abitanti.filter(a => a.ruolo === 'coinquilino'), mese = c.affitto + c.spese;
      return `<section class="vista">${testa}
        <div class="riepilogo" style="margin-top:24px">
          <div class="tessera"><span class="etichetta">Ricevi ogni mese, al netto</span><b class="grande">${euro(paganti.length * mese - quotaHost(c))}</b><span class="muto piccolo">affitto e spese meno la tua parte dell'infermiere</span></div>
          <div class="tessera"><span class="etichetta">Per ogni stanza</span><b class="grande">${euro(mese)}</b></div>
          <div class="tessera"><span class="etichetta">Con le stanze libere occupate</span><b class="grande">${euro((paganti.length + postiLiberi(c)) * mese)}</b></div>
          <div class="tessera"><span class="etichetta">Tua parte dell'infermiere</span><b class="grande">${quotaHost(c) ? '−' + euro(quotaHost(c)) : euro(0)}</b><span class="muto piccolo">${quotaHost(c) ? 'la paghi all\'infermiere con una parte dell\'affitto' : casaAttiva(c) ? 'nessuno di voi è seguito' : 'parte con il primo ospite'}</span></div>
        </div>
        <table class="tabella"><thead><tr><th>Chi</th><th class="num">Affitto</th><th class="num">Spese</th><th class="num">Totale</th></tr></thead><tbody>
          ${paganti.map(a => `<tr><td>${esc(descr(a))}, ${a.sesso === 'F' ? 'coinquilina' : 'coinquilino'}</td><td class="num">${euro(c.affitto)}</td><td class="num">${euro(c.spese)}</td><td class="num">${euro(mese)}</td></tr>`).join('') || '<tr><td colspan="4" class="muto">Nessun coinquilino per ora: la stanza è libera.</td></tr>'}
        </tbody></table>
        <h2 style="margin:32px 0 6px">Incassi mese per mese</h2>
        <p class="muto piccolo" style="margin-bottom:12px">Ti pagano direttamente, con bonifico: qui c'è il promemoria. Il programma non incassa nulla.</p>
        <table class="tabella"><thead><tr><th>Mese</th><th>Da chi</th><th class="num">Affitto e spese</th><th>Stato</th></tr></thead><tbody>
          ${(() => { const mesi = [...new Set(paganti.flatMap(a => pagamenti(c, a).map(p => p.mese)))].sort().reverse().slice(0, 12);
            return mesi.map(m => { const chi = paganti.filter(a => pagamenti(c, a).some(p => p.mese === m)), fut = daIso(m + '-01') > OGGI;
              return `<tr><td>${esc(meseNome(m))}</td><td>${chi.map(a => esc(a.nome || descr(a))).join(', ')}</td><td class="num">${euro(chi.length * mese)}</td><td>${fut ? `<span class="pill attesa">entro il ${REGOLE.giornoScadenza} ${esc(meseNome(m))}</span>` : '<span class="pill ok">Ricevuto</span>'}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muto">Nessun incasso ancora.</td></tr>'; })()}
        </tbody></table>
        <p class="muto piccolo" style="margin-top:16px">Valori di prova. Contratto di locazione della stanza (L. 431/1998, 4+4 a canone libero o 3+2 a canone concordato). Le regole fiscali dell'affitto di una stanza sono da verificare.</p>
      </section>`;
    }
    const rr = S.richieste.filter(r => r.casa === c.id);
    const azioni = r => ({
      nuova: `<p class="muto piccolo">${esc(i.nome)} programma il sopralluogo (preferenza: ${esc(r.fascia.toLowerCase())}). Ti arriva giorno e ora.</p>${S.parente ? '' : `<button class="btn secondario" data-azione="ospita-rifiuta" data-id="${esc(r.id)}">Non ora</button>`}`,
      sopralluogo: `<p class="muto piccolo">Sopralluogo il ${esc(dataLunga(r.sopralluogo) + oraDi(r))} con ${esc(i.nome)}. Dopo la valutazione potrai accettare.</p>`,
      valutata: S.parente ? '<p class="muto piccolo">Decide chi affitta.</p>' : `<button class="btn scuro" data-azione="ospita-accetta" data-id="${esc(r.id)}">Accetta</button><button class="btn secondario" data-azione="ospita-rifiuta" data-id="${esc(r.id)}">Non accetto</button>`,
      accettata: '<span class="pill ok">Accettata: ora condividete nome e contratto</span>',
      'non-adatta': '<span class="pill no">L\'infermiere ha indicato un altro servizio</span>',
      rifiutata: '<span class="pill no">Non accettata</span>'
    }[r.stato]);
    return `<section class="vista">${testa}
      <div class="avviso grigio" style="margin-top:16px">${ico('scudo')}<span>Vedi età, abitudini, hobby e due righe di presentazione. Le risposte sulla salute le vede solo l'infermiere: tu vedi, dopo il sopralluogo, il parere dell'infermiere.</span></div>
      <div style="margin-top:24px">${rr.map(r => `<div class="carta-richiesta"><span class="avatar grigio">${ico('persona')}</span>
        <div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><h3>Richiesta ${esc(r.id)}</h3>${pillStato(r)}</div>
          <p style="margin-top:4px">${esc(descr(r.persona))} · ricevuta il ${esc(dataLunga(r.ricevuta))}</p>
          <p class="piccolo" style="margin-top:6px">${esc(r.persona.presentazione)}</p>
          <div style="display:grid;gap:6px;margin-top:10px"><div><span class="muto micro">Abitudini</span>${etichette(r.persona.abitudini)}</div><div><span class="muto micro">Hobby</span>${etichette(r.persona.hobby)}</div></div>
          <p class="piccolo" style="margin-top:10px">${r.valutazione ? (r.valutazione.esito === 'adatta' ? '<b>Valutazione dell\'infermiere:</b> adatta alla casa.' : '<b>Valutazione dell\'infermiere:</b> serve un altro servizio.') : '<b>Questionario:</b> compatibile con una casa condivisa. L\'infermiere lo conferma al sopralluogo.'}</p></div>
        <div class="azioni-r">${azioni(r)}</div></div>`).join('') || '<div class="vuoto">Nessuna richiesta per ora.</div>'}</div>
    </section>`;
  }

  /* ---------- vista: infermiere di zona ---------- */
  function vistaInfermiere() {
    const i = inf(S.infermiere), mie = caseDi(i.id), tab = S.tabInf, nome = i.nome.split(' ')[0];
    const titolo = { case: `Le tue case, ${nome}`, sopralluoghi: 'Richieste, agenda e valutazioni', demenze: 'Percorsi: seguire da vicino, accompagnare l\'uscita', aiuto: 'Aiuto condiviso' }[tab];
    const testa = `<div class="saluto"><div><h1>${esc(titolo)}</h1><p>${esc(i.titolo)} · ${esc(i.zona)}</p></div>
      <label class="scelta-demo">Infermiere (solo per la prova)<select data-azione-cambio="infermiere">${Object.values(INFERMIERI).map(x => `<option value="${x.id}"${x.id === i.id ? ' selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label></div>`;
    const persone = mie.flatMap(c => seguiti(c).map(a => ({ a, c })));

    if (tab === 'sopralluoghi') {
      const daFare = S.richieste.filter(r => r.stato === 'sopralluogo' && mie.some(c => c.id === r.casa));
      const fatte = S.richieste.filter(r => r.valutazione && mie.some(c => c.id === r.casa));
      const nuove = S.richieste.filter(r => r.stato === 'nuova' && mie.some(c => c.id === r.casa));
      const ag = agendaDi(i.id, 14), giorni = [...new Set(ag.map(v => v.data))];
      return `<section class="vista">${testa}
        <h2 style="margin:28px 0 8px">Richieste di chi alloggia</h2>
        <p class="muto piccolo" style="margin-bottom:16px">Ogni persona ha ${REGOLE.interventiInclusi} interventi al mese già pagati nella sua quota (${euro(REGOLE.prezzoIntervento)} l'uno). Dalla ${REGOLE.interventiInclusi + 1}ª prestazione del mese, e nei festivi salvo una terapia iniziata in un giorno feriale, ${euro(REGOLE.tariffaIntervento)}: te li paga direttamente il mese dopo.</p>
        ${S.richiesteInf.filter(r => r.stato === 'nuova' && persone.some(x => x.a.id === r.chi)).map(r => { const { a, c } = persona(r.chi), k = interventiMese(a.id, meseOggi()); return `<div class="carta-richiesta"><span class="avatar grigio">${ico('persona')}</span>
          <div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><h3>${esc(r.motivo)} · ${esc(a.id)}, ${esc(c.quartiere)}</h3><span class="pill ${r.urgenza === 'Oggi' ? 'no' : 'attesa'}">${esc(r.urgenza)}</span></div>
            <p style="margin-top:4px">${esc(descr(a))} · ${esc(r.note)}</p>
            <p class="piccolo" style="margin-top:4px">Interventi a ${esc(meseNome(meseOggi()).split(' ')[0])}: <b>${k.n} di ${REGOLE.interventiInclusi}</b>${k.normali >= REGOLE.interventiInclusi ? ` · il prossimo costa ${euro(REGOLE.tariffaIntervento)}` : ''}</p>
            <div class="programma"><label>Giorno<input type="date" id="ri-data-${esc(r.id)}" value="${r.urgenza === 'Oggi' ? isoData(OGGI) : traGiorni(1)}"></label><label>Ora<input type="time" id="ri-ora-${esc(r.id)}" value="${r.urgenza === 'Oggi' ? '18:00' : '11:00'}" step="900"></label></div></div>
          <div class="azioni-r"><button class="btn scuro" data-azione="programma-ri" data-id="${esc(r.id)}">Programma la visita</button></div></div>`; }).join('') || '<div class="vuoto">Nessuna richiesta da chi alloggia.</div>'}
        <h2 style="margin:28px 0 8px">Richieste da programmare</h2>
        <p class="muto piccolo" style="margin-bottom:16px">Le richieste arrivano a te. Scegli giorno e ora nella fascia indicata: lo vedono subito chi cerca casa e chi affitta.</p>
        ${nuove.map(r => { const c = casa(r.casa); return `<div class="carta-richiesta"><span class="avatar grigio">${ico('persona')}</span>
          <div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><h3>${esc(r.id)} · casa di ${esc(c.ospita.nome)}, ${esc(c.quartiere)}</h3>${pillStato(r)}</div>
            <p style="margin-top:4px">${esc(descr(r.persona))} · ricevuta il ${esc(dataLunga(r.ricevuta))} · preferenza: <b>${esc(r.fascia.toLowerCase())}</b></p>
            <p class="piccolo" style="margin-top:6px">${esc(r.persona.presentazione)}</p>
            <div class="programma"><label>Giorno<input type="date" id="p-data-${esc(r.id)}" value="${traGiorni(r.fascia === 'Pomeriggio' ? 3 : 2)}"></label><label>Ora<input type="time" id="p-ora-${esc(r.id)}" value="${r.fascia === 'Pomeriggio' ? '16:00' : '10:00'}" step="900"></label></div></div>
          <div class="azioni-r"><button class="btn scuro" data-azione="programma" data-id="${esc(r.id)}">Programma il sopralluogo</button></div></div>`; }).join('') || '<div class="vuoto">Nessuna richiesta da programmare.</div>'}
        <div class="griglia-2" style="margin-top:32px"><div>
          <h2 style="margin-bottom:12px">Agenda dei prossimi 14 giorni</h2>
          ${giorni.map(g => `<h3 class="giorno-agenda">${esc(giornoNome(g))}${g === isoData(OGGI) ? ' · oggi' : ''}</h3><div class="da-seguire">${ag.filter(v => v.data === g).map(v => rigaAgenda(v)).join('')}</div>`).join('') || '<p class="muto">Agenda vuota.</p>'}
          <p class="muto micro" style="margin-top:10px">${Object.entries(COLORE_TIPO).map(([t, col]) => `<span class="puntino" style="background:${col}"></span> ${esc(t)}`).join(' &nbsp; ')}</p>
        </div><div>
          <h2 style="margin-bottom:12px">Programma una visita</h2>
          <div class="righe-campi">
            <label class="campo tutta">Persona<select id="nv-chi">${persone.map(({ a, c }) => `<option value="${esc(a.id)}">${esc(a.id)} · ${esc(descr(a))} · ${esc(c.quartiere)}</option>`).join('')}</select></label>
            <label class="campo">Giorno<input id="nv-data" type="date" value="${traGiorni(1)}"></label>
            <label class="campo">Ora<input id="nv-ora" type="time" value="11:00" step="900"></label>
            <label class="campo">Tipo<select id="nv-tipo"><option value="visita">Visita</option><option value="controllo">Controllo</option><option value="trattamento">Piccolo trattamento</option></select></label>
            <label class="campo tutta">Motivo<input id="nv-cosa" type="text" placeholder="Per esempio: medicazione, pressione, iniezione prescritta."></label>
          </div>
          <button class="btn pieno" style="margin-top:12px" data-azione="nuova-visita">Aggiungi all'agenda</button>
          <p class="muto piccolo" style="margin-top:8px">La visita compare nell'account di chi alloggia e, se ha dato il consenso per le visite, al suo parente.</p>
        </div></div>
        <h2 style="margin:40px 0 16px">Da valutare</h2>
        ${daFare.map(r => { const c = casa(r.casa), pt = classeBarthel(r.persona.barthel).punti || 3, dopo = caricoPct(c, pt), classe = classeCasa(c, pt); return `<div class="carta-richiesta"><span class="avatar grigio">${ico('persona')}</span>
          <div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><h3>${esc(r.id)} · casa di ${esc(c.ospita.nome)}</h3>${pillStato(r)}</div>
            <p style="margin-top:4px">${esc(descr(r.persona))} · compilata da: ${esc(r.persona.compila.toLowerCase())}</p>
            <p class="piccolo" style="margin-top:6px">Sopralluogo il <b>${esc(dataLunga(r.sopralluogo) + oraDi(r))}</b> · questionario: <b>Barthel ${Number(r.persona.barthel)}/100</b> dichiarato · ${r.persona.cognitivi.length ? `segnali di memoria: ${esc(r.persona.cognitivi.join(', ').toLowerCase())}` : 'nessun segnale di memoria'} · <span class="pill ${classe}">carico della casa dopo l'ingresso ${dopo}%</span></p>
            <p class="piccolo" style="margin-top:6px">${esc(r.persona.presentazione)}</p></div>
          <div class="azioni-r"><button class="btn scuro" data-azione="apri-valutazione" data-id="${esc(r.id)}">Fai la valutazione</button></div></div>`; }).join('') || '<div class="vuoto">Nessun sopralluogo da fare.</div>'}
        <h2 style="margin:40px 0 16px">Valutazioni fatte</h2>
        <table class="tabella"><thead><tr><th>Richiesta</th><th>Casa</th><th>Barthel dichiarato</th><th>Barthel misurato</th><th>Esito</th></tr></thead><tbody>
          ${fatte.map(r => `<tr><td>${esc(r.id)} · ${esc(descr(r.persona))}</td><td>${esc(casa(r.casa).quartiere)}</td><td>${Number(r.persona.barthel)}</td><td>${Number(r.valutazione.barthel)}${r.valutazione.barthel < r.persona.barthel ? ' <span class="pill attesa">più basso</span>' : ''}</td><td>${r.valutazione.esito === 'adatta' ? '<span class="pill ok">Adatta</span>' : `<span class="pill no">Altro servizio</span><br><span class="muto piccolo">${esc(r.valutazione.servizio || '')}</span>`}</td></tr>`).join('') || '<tr><td colspan="5" class="muto">Nessuna valutazione.</td></tr>'}
        </tbody></table>
        <p class="muto piccolo" style="margin-top:12px">Il sopralluogo è la seconda barriera: se il questionario era troppo ottimista, qui si vede.</p>
      </section>`;
    }

    if (tab === 'demenze') {
      const conSegnali = persone.filter(p => p.a.fase > 0 || p.a.cognitivi.length), senza = persone.length - conSegnali.length;
      return `<section class="vista">${testa}
        <p class="muto" style="margin-top:12px;max-width:820px">Dopo la diagnosi di demenza il tempo mediano fino all'ingresso in RSA è 3,3 anni, e il 57% ci entra entro 5 anni (Brück 2025, BMJ). La casa serve la fase iniziale e deve sapere quando passare la mano. Il ricovero ospedaliero non è la risposta a un peggioramento.</p>
        <div class="avviso grigio" style="margin-top:12px;max-width:820px">${ico('scudo')}<span>Le fasi le registra l'infermiere dopo la valutazione di persona e con il medico di famiglia: l'app non fa diagnosi, non stima rischi e non interpreta sintomi.</span></div>
        <div class="fasi">${FASI.map(f => `<div class="fase"><b>${f.n}. ${esc(f.nome)}</b>${esc(f.testo)}</div>`).join('')}</div>
        <table class="tabella demenze"><thead><tr><th>Persona</th><th>Casa</th><th>Segnali</th><th>Fase</th><th>Prossimo controllo</th><th>Pianificazione delle cure</th><th></th></tr></thead><tbody>
          ${conSegnali.map(({ a, c }) => { const ritardo = a.controllo <= isoData(OGGI); return `<tr>
            <td><b>${esc(a.id)}</b><br><span class="muto piccolo">${esc(descr(a))}, Barthel ${Number(a.barthel)}</span></td>
            <td>${esc(c.quartiere)}</td>
            <td>${esc(a.cognitivi.join(', ') || 'nessuno')}${a.nota ? `<br><span class="muto piccolo">${esc(a.nota)}</span>` : ''}</td>
            <td><select data-azione-cambio="fase" data-id="${c.id}|${esc(a.id)}" aria-label="Fase per ${esc(a.id)}">${FASI.map(f => `<option value="${f.n}"${a.fase === f.n ? ' selected' : ''}>${f.n}. ${esc(f.nome)}</option>`).join('')}</select></td>
            <td>${esc(dataLunga(a.controllo))}${ritardo ? ' <span class="pill no">da fare</span>' : ''}</td>
            <td>${a.pcc ? '<span class="pill ok">Fatta</span>' : `<button class="btn secondario piccolo" data-azione="pcc" data-id="${c.id}|${esc(a.id)}">Segna fatta</button>`}${a.ads ? '<br><span class="pill info">Amministratore di sostegno</span>' : ''}</td>
            <td><button class="btn secondario piccolo" data-azione="controllo" data-id="${c.id}|${esc(a.id)}">Controllo fatto</button>${a.fase < 5 ? ` <button class="btn terziario" data-azione="uscita" data-id="${c.id}|${esc(a.id)}">Uscita accompagnata</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muto">Nessuna persona con segnali.</td></tr>'}
        </tbody></table>
        <p class="muto piccolo" style="margin-top:12px">${plurale(senza, 'persona seguita senza segnali', 'persone seguite senza segnali')}: controllo ogni ${REGOLE.controlloMesi} mesi. Codici al posto dei nomi, dati inventati.</p>
        <div class="avviso ambra" style="margin-top:24px">${ico('scudo')}<span>Quando servono sorveglianza o assistenza continue, la casa non è più il posto giusto anche per legge: diventerebbe una struttura non autorizzata (TAR Lazio 1286/2022; L.R. Lazio 16/2026, art. 4 e 17). L'uscita si prepara prima, con la pianificazione condivisa delle cure (L. 219/2017, art. 5) e, se serve, un amministratore di sostegno (art. 404 c.c.; per il consenso alle cure, L. 219/2017, art. 3).</span></div>
      </section>`;
    }

    if (tab === 'aiuto') {
      const blocchi = mie.map(c => {
        const h = c.aiuto;
        if (!h) return `<div class="carta-viaggio"><div class="mini">${fotoEsterno(c)}</div><div><h3>Casa di ${esc(c.ospita.nome)}, ${esc(c.quartiere)}</h3><p class="muto piccolo" style="margin-top:4px">Nessun aiuto attivo · ${plurale(seguiti(c).length, 'persona seguita', 'persone seguite')}</p></div>
          <div class="azioni-v"><button class="btn secondario piccolo" data-azione="apri-aiuto" data-id="${c.id}">Attiva l'aiuto condiviso</button></div></div>`;
        const chi = h.persone.map(id => c.abitanti.find(a => a.id === id)).filter(Boolean), tot = chi.reduce((t, a) => t + punti(a), 0) || 1;
        const tariffa = REGOLE.tariffe[h.tipo] || REGOLE.tariffe.oss, mese = h.ore * tariffa * 30, g = giorniDa(h.inizio), oltre = g > REGOLE.aiutoGiorniMax || h.ore > REGOLE.aiutoOreMax;
        const colori = ['#1f63b8', '#ff385c', '#008a05', '#e8a33d'];
        return `<div class="blocco" style="border:1px solid var(--hairline);border-radius:var(--r-md);padding:20px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><h2>Casa di ${esc(c.ospita.nome)}, ${esc(c.quartiere)}</h2><span class="pill ${g > REGOLE.aiutoGiorniMax ? 'no' : g > REGOLE.aiutoGiorniMax - 15 ? 'attesa' : 'ok'}">giorno ${g} di ${REGOLE.aiutoGiorniMax}</span></div>
          <p style="margin-top:6px">${h.tipo === 'oss' ? 'OSS' : 'Collaboratrice domestica'}, ${Number(h.ore)} ore al giorno · ${tariffa.toLocaleString('it-IT', { minimumFractionDigits: 2 })} € all'ora · ${euro(mese)} al mese · dal ${esc(dataLunga(h.inizio))}</p>
          <p class="muto piccolo" style="margin-top:4px">${esc(h.motivo)}</p>
          <div class="ripartizione" aria-hidden="true">${chi.map((a, k) => `<i style="width:${punti(a) / tot * 100}%;background:${colori[k % 4]}"></i>`).join('')}</div>
          <table class="tabella"><thead><tr><th>Persona</th><th class="num">Punti di carico</th><th class="num">Quota</th><th class="num">Al mese</th></tr></thead><tbody>
            ${chi.map((a, k) => `<tr><td><span class="puntino" style="background:${colori[k % 4]}"></span> ${esc(a.id)} · ${esc(descr(a))} · Barthel ${Number(a.barthel)}</td><td class="num">${punti(a)}</td><td class="num">${Math.round(punti(a) / tot * 100)}%</td><td class="num">${euro(mese * punti(a) / tot)}</td></tr>`).join('')}
          </tbody></table>
          ${oltre ? `<div class="avviso rausch" style="margin-top:12px">${ico('scudo')}<span>Oltre i limiti (${REGOLE.aiutoOreMax} ore al giorno, ${REGOLE.aiutoGiorniMax} giorni): serve una nuova valutazione. Se il bisogno è continuo, si avvia l'uscita accompagnata.</span></div>` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn secondario piccolo" data-azione="rinnova-aiuto" data-id="${c.id}">Nuova valutazione e rinnovo</button><button class="btn terziario" data-azione="chiudi-aiuto" data-id="${c.id}">Chiudi l'aiuto</button></div>
        </div>`;
      }).join('');
      return `<section class="vista">${testa}
        <p class="muto" style="margin:12px 0 24px;max-width:820px">Quando qualcuno sta male, la casa può dividersi una collaboratrice o un OSS per alcune ore al giorno. Il prezzo si divide secondo i punti di carico che valuti tu: 1 per chi è autonomo, 2 per la dipendenza lieve, 3 per la moderata.</p>
        ${blocchi}
        <p class="muto piccolo">Ogni famiglia è datore di lavoro per le sue ore e fa la sua comunicazione all'INPS, oppure si compra il servizio da una cooperativa. Modello di riferimento: la «badante di condominio» (L.R. Lazio 16/2026, art. 14). Tariffa OSS: costo del lavoro C2 delle cooperative sociali 2026; tariffa della collaboratrice: valore di prova.</p>
      </section>`;
    }

    const nS = S.richieste.filter(r => r.stato === 'sopralluogo' && mie.some(c => c.id === r.casa)).length;
    return `<section class="vista">${testa}
      <div class="riepilogo" style="margin-top:24px">
        <div class="tessera"><span class="etichetta">Case che segui</span><b class="grande">${mie.length} <span class="muto" style="font-size:16px;font-weight:400">su ${REGOLE.maxCaseInfermiere} al massimo</span></b></div>
        <div class="tessera"><span class="etichetta">Persone seguite</span><b class="grande">${persone.length}</b></div>
        <div class="tessera"><span class="etichetta">Compenso dai canoni</span><b class="grande">${euro(mie.filter(casaAttiva).reduce((s, c) => s + quotaCasaMese() + seguiti(c).length * INTERV_MESE(), 0))} <span class="muto" style="font-size:16px;font-weight:400">al mese</span></b><span class="muto piccolo">${euro(REGOLE.euroGiornoCasa)} per ${feriali(meseOggi())} giorni feriali e ${plurale(mie.filter(casaAttiva).length, 'casa con ospiti', 'case con ospiti')}, ${euro(INTERV_MESE())} a persona per i ${REGOLE.interventiInclusi} interventi (${mie.length - mie.filter(casaAttiva).length} in attesa del primo), più ${euro(persone.reduce((t, { a }) => t + costoInterventi(a.id, meseOggi()), 0))} di prestazioni extra di questo mese (oltre i ${REGOLE.interventiInclusi} e festivi)</span></div>
        <div class="tessera"><span class="etichetta">Sopralluoghi da fare</span><b class="grande">${nS}</b></div>
      </div>
      <div class="griglia-2"><div>
        <h2 style="margin-bottom:12px">Reperibilità</h2>
        <div class="punti">
          ${punto('telefono', `Al telefono ${i.fasce}`, `Ti sostituisce ${inf(i.sostituto).nome}. Di notte: 112 e continuità assistenziale, e le case lo sanno.`)}
          ${i.autorizzazione ? punto('scudo', 'Dipendente pubblico', i.autorizzazione + '. Durante il turno in ospedale risponde il sostituto.') : punto('scudo', 'Libera professionista', `Partita IVA: ${euro(REGOLE.euroGiornoCasa)} per ogni giorno feriale e ogni casa che scegli di seguire (al massimo ${REGOLE.maxCaseInfermiere}), più ${euro(INTERV_MESE())} al mese a persona per i ${REGOLE.interventiInclusi} interventi già pagati; dalla ${REGOLE.interventiInclusi + 1}ª prestazione e nei festivi ${euro(REGOLE.tariffaIntervento)} l'una.`)}
        </div>
        <h2 style="margin:28px 0 12px">Oggi, ${esc(giornoNome(isoData(OGGI)))}</h2>
        <div class="da-seguire">${agendaDi(i.id, 0).map(v => rigaAgenda(v)).join('') || '<p class="muto piccolo">Niente in agenda oggi.</p>'}</div>
        <p class="piccolo" style="margin-top:8px"><button class="btn terziario" data-azione="tab-i" data-id="sopralluoghi">Agenda completa e richieste da programmare ${ico('destra')}</button></p>
        <h2 style="margin:28px 0 12px">Chiamate di oggi</h2>
        <div class="da-seguire">${i.chiamate.map(d => `<div><span class="puntino" style="background:var(--blu)"></span><span><b>${esc(d.ora)}</b> · ${esc(d.chi)}<br>${esc(d.cosa)}</span></div>`).join('') || '<p class="muto piccolo">Nessuna chiamata per ora.</p>'}</div>
      </div><div>${mappaInfermiere(i)}</div></div>
      <h2 style="margin:40px 0 16px">Le case</h2>
      <div class="gruppi">${mie.map(c => `<div class="gruppo" data-azione="scheda" data-id="${c.id}" role="link" tabindex="0" aria-label="Apri la casa di ${esc(c.ospita.nome)}"><div class="foto">${fotoEsterno(c)}</div><div class="corpo">
        <h3>${esc(c.quartiere)} · casa di ${esc(c.ospita.nome)}</h3>
        <p class="muto piccolo">${plurale(seguiti(c).length, 'persona seguita', 'persone seguite')} su ${c.abitanti.length} in casa · prossimo controllo ${esc(dataLunga(prossimoControllo(c)))}</p>
        ${barraCarico(c)}
        <p class="piccolo">${c.aiuto ? '<span class="pill info">Aiuto condiviso attivo</span> ' : ''}${seguiti(c).some(a => a.fase >= 2) ? '<span class="pill attesa">Segnali di memoria</span>' : ''}</p></div></div>`).join('')}</div>
      <h2 style="margin:40px 0 8px">Persone seguite e parenti autorizzati</h2>
      <p class="muto piccolo" style="margin-bottom:12px">Parli con un parente solo delle parti che la persona ha scelto. La spunta «salute» vale anche come indicazione della persona incaricata di ricevere le informazioni (L. 219/2017, art. 1, c. 3): annotala nella tua documentazione.</p>
      <table class="tabella"><thead><tr><th>Persona</th><th>Casa</th><th class="num">Barthel</th><th>Prossimo controllo</th><th class="num">Interventi a ${esc(meseNome(meseOggi()).split(' ')[0])}</th><th>Parente e consenso</th></tr></thead><tbody>
        ${persone.map(({ a, c }) => { const k = S.consensi[a.ruolo === 'coinquilino' ? a.id : 'ospita:' + c.id]; const suo = k && (a.ruolo === 'coinquilino' || (c.ospita.tipo === 'anziano' && c.abitanti[0].id === a.id));
          return `<tr><td><b>${esc(a.id)}</b> · ${esc(descr(a))}${a.nome ? ` · ${esc(a.nome)}` : ''}</td><td>${esc(c.quartiere)}</td><td class="num">${Number(a.barthel)}</td><td>${esc(dataLunga(a.controllo))}</td><td class="num">${a.ruolo === 'coinquilino' ? (n => `${n} di ${REGOLE.interventiInclusi}${n > REGOLE.interventiInclusi ? ' <span class="pill attesa">oltre</span>' : ''}`)(interventiMese(a.id, meseOggi()).n) : '—'}</td>
            <td>${suo ? (k.attivo ? `${esc(k.parente.nome)}, ${esc(k.parente.relazione)}<br><span class="muto piccolo">vede: ${esc(PARTI.filter(([p]) => k.permessi[p]).map(([, t]) => t.toLowerCase()).join(', '))}</span>` : '<span class="pill no">Consenso tolto</span>') : '<span class="muto piccolo">nessun parente indicato</span>'}</td></tr>`; }).join('')}
      </tbody></table>
      <h2 style="margin:40px 0 16px">Piccoli trattamenti recenti</h2>
      <table class="tabella"><thead><tr><th>Data</th><th>Casa</th><th>Persona</th><th>Trattamento</th></tr></thead><tbody>
        ${i.trattamenti.map(t => `<tr><td>${esc(dataLunga(t.data))}</td><td>${esc(casa(t.casa).quartiere)}</td><td>${esc(t.chi)}</td><td>${esc(t.cosa)}</td></tr>`).join('')}
      </tbody></table>
      <p class="muto micro" style="margin-top:10px">Persone indicate con un codice. Dati clinici inventati.</p>
    </section>`;
  }

  /* ---------- vista: chi alloggia ---------- */
  function vistaAlloggia() {
    const { a, c } = residente(), i = inf(c.infermiere), sost = inf(i.sostituto), tab = S.tabAll, x = canone(c, true);
    const titolo = { casa: S.parente ? `La casa di ${a.nome}` : `Ciao ${a.nome}`, costi: 'Costi del mese', visite: 'Visite e salute', famiglia: S.parente ? 'Che cosa vedo' : 'Famiglia e consenso', servizi: 'Richieste e servizi' }[tab];
    const testa = `<div class="saluto"><div><h1>${esc(titolo)}</h1><p>${esc(descr(a))} · casa di ${esc(c.ospita.nome)}, ${esc(c.quartiere)} · qui dal ${esc(dataLunga(a.ingresso))} ${esc(daIso(a.ingresso).getFullYear())}</p></div>
      ${S.parente ? '' : `<label class="scelta-demo">Chi alloggia (solo per la prova)<select data-azione-cambio="residente">${coinquilini().map(y => `<option value="${esc(y.a.id)}"${y.a.id === a.id ? ' selected' : ''}>${esc(y.a.nome)} · ${esc(y.c.quartiere)}</option>`).join('')}</select></label>`}</div>${bannerParente()}`;
    if (tab === 'famiglia') return `<section class="vista">${testa}${pannelloConsenso(a.id, a.nome)}</section>`;
    if (tab === 'servizi') return `<section class="vista">${testa}${vistaServizi(a, c, i)}</section>`;
    const prossime = S.visite.filter(v => v.chi === a.id && v.data >= isoData(OGGI)).concat(a.controllo >= isoData(OGGI) && !S.visite.some(v => v.chi === a.id && v.tipo === 'controllo') ? [{ data: a.controllo, ora: 'ora da fissare', casa: c.id, tipo: 'controllo', cosa: `Controllo dei ${REGOLE.controlloMesi} mesi con ${i.nome}` }] : []).sort((p, q) => p.data.localeCompare(q.data));
    if (tab === 'costi') {
      if (!vede('costi')) return `<section class="vista">${testa}${nascosto('costi')}</section>`;
      const pg = pagamenti(c, a), aiuto = quotaAiuto(c, a), mese = x.totale + aiuto, anno = pg.filter(p => p.stato === 'pagato' && p.mese.startsWith(String(OGGI.getFullYear()))).reduce((t, p) => t + p.totale, 0);
      return `<section class="vista">${testa}
        <div class="riepilogo" style="margin-top:24px">
          <div class="tessera"><span class="etichetta">Costi di ${esc(meseNome(meseOggi()).split(' ')[0])}</span><b class="grande">${euro((pg.find(p => p.mese === meseOggi()) || {}).totale || 0)}</b><span class="muto piccolo">con gli interventi extra del mese prima</span></div>
          <div class="tessera"><span class="etichetta">Da pagare entro il ${REGOLE.giornoScadenza} ${esc(meseNome(meseDopo(meseOggi())).split(' ')[0])}</span><b class="grande">${euro((pg.find(p => p.mese === meseDopo(meseOggi())) || {}).totale || 0)}</b><span class="muto piccolo">si aggiorna fino a fine mese</span></div>
          <div class="tessera"><span class="etichetta">Pagato nel ${OGGI.getFullYear()}</span><b class="grande">${euro(anno)}</b></div>
          <div class="tessera"><span class="etichetta">Deposito versato</span><b class="grande">${euro(c.affitto * REGOLE.depositoMesi)}</b></div>
        </div>
        <div class="griglia-2"><div>
          <h2 style="margin-bottom:12px">I costi del mese, voce per voce</h2>
          ${vociCanone(x, c)}
          ${aiuto ? `<div class="voci" style="margin-top:8px"><div><span>La tua parte dell'aiuto condiviso (${c.aiuto.tipo === 'oss' ? 'OSS' : 'collaboratrice'}, ${Number(c.aiuto.ore)} ore al giorno, ${punti(a)} punti di carico)</span><span>${euro(aiuto)}</span></div><div class="totale"><span>Totale con l'aiuto</span><span>${euro(mese)}</span></div></div>
            <p class="muto piccolo" style="margin-top:6px">L'aiuto dura al massimo ${REGOLE.aiutoGiorniMax} giorni (iniziato il ${esc(dataLunga(c.aiuto.inizio))}). La tua parte segue i punti di carico valutati da ${esc(i.nome)}.</p>` : ''}
        </div><div>
          <h2 style="margin-bottom:12px">Il contratto</h2>
          <div class="punti">
            ${punto('regola', `Locazione della stanza, ${a.contratto}`, `Dal ${dataLunga(a.ingresso)} ${daIso(a.ingresso).getFullYear()}, firmato con ${c.ospita.nome}. L'accordo con l'infermiere è a parte e lo firmi tu.`)}
            ${punto('euro', `Si paga entro il ${REGOLE.giornoScadenza} di ogni mese, direttamente`, `Bonifico: affitto e spese a ${c.ospita.nome}, la quota a ${i.nome}, che rilascia la fattura. Il programma non incassa nulla.`)}
            ${punto('scudo', 'Puoi uscire senza penale', 'Se un giorno serve un altro servizio, l\'uscita accompagnata non costa nulla oltre al preavviso del contratto.')}
          </div></div></div>
        <h2 style="margin:32px 0 12px">Pagamenti mese per mese</h2>
        <p class="muto piccolo" style="margin:-4px 0 12px">Promemoria: ogni voce si paga direttamente a chi la riceve.</p>
        <table class="tabella"><thead><tr><th>Mese</th><th class="num">Affitto e spese<br><span class="muto">a chi apre la casa</span></th><th class="num">Quota<br><span class="muto">all'infermiere</span></th><th class="num">Interventi extra del mese prima<br><span class="muto">all'infermiere</span></th><th class="num">Aiuto condiviso<br><span class="muto">alla cooperativa</span></th><th class="num">Totale</th><th>Stato</th></tr></thead><tbody>
          ${pg.map(p => `<tr><td>${esc(meseNome(p.mese))}</td><td class="num">${euro(p.base)}</td><td class="num">${euro(p.quota)}</td><td class="num">${p.oltre ? euro(p.oltre) : '—'}</td><td class="num">${p.aiuto ? euro(p.aiuto) : '—'}</td><td class="num"><b>${euro(p.totale)}</b></td><td>${p.stato === 'pagato' ? '<span class="pill ok">Pagato</span>' : `<span class="pill attesa">Entro il ${REGOLE.giornoScadenza}</span>`}</td></tr>`).join('')}
        </tbody></table>
        <p class="muto micro" style="margin-top:8px">Valori di prova. Nessuna commissione. Quota dell'infermiere: ${euro(REGOLE.euroGiornoCasa)} per ogni giorno feriale (${euro(x.quotaCasa)} questo mese), divisi fra le ${x.n} persone seguite; ${REGOLE.interventiInclusi} interventi al mese già pagati (${euro(x.interv)}); dalla ${REGOLE.interventiInclusi + 1}ª prestazione e nei festivi ${euro(REGOLE.tariffaIntervento)}.</p>
      </section>`;
    }
    if (tab === 'visite') {
      if (!vede('visite')) return `<section class="vista">${testa}${nascosto('visite')}</section>`;
      const tratt = i.trattamenti.filter(t => t.chi === a.id), chiam = i.chiamate.filter(t => t.chi === a.id);
      return `<section class="vista">${testa}
        <div class="griglia-2" style="margin-top:24px"><div>
          <h2 style="margin-bottom:12px">Prossime visite</h2>
          <div class="da-seguire">${prossime.map(v => rigaAgenda(v, true)).join('') || '<p class="muto piccolo">Nessuna visita in programma.</p>'}</div>
          <h2 style="margin:28px 0 12px">Piccoli trattamenti</h2>
          <div class="da-seguire">${tratt.map(t => `<div><span class="puntino" style="background:#008a05"></span><span><b>${esc(dataLunga(t.data))}</b><br>${esc(t.cosa)}</span></div>`).join('') || '<p class="muto piccolo">Nessun trattamento recente.</p>'}</div>
          <h2 style="margin:28px 0 12px">Chiamate di oggi</h2>
          <div class="da-seguire">${chiam.map(t => `<div><span class="puntino" style="background:var(--blu)"></span><span><b>${esc(t.ora)}</b><br>${esc(t.cosa)}</span></div>`).join('') || '<p class="muto piccolo">Nessuna chiamata oggi.</p>'}</div>
        </div><div>
          <div class="punti">
            ${punto('telefono', `${i.nome}, al telefono ${i.fasce}`, `Numero di reperibilità nell'app (in questa prova non c'è un numero vero). La sostituisce ${sost.nome}. Di notte: 112 e continuità assistenziale.`)}
            ${punto('infermiere', 'Che cosa fa per te', 'Controlli ogni 6 mesi, piccoli trattamenti prescritti dal medico, contatto con il medico di famiglia.')}
          </div>
          <h2 style="margin:28px 0 12px">Salute</h2>
          ${vede('salute') ? `<div class="tessera"><span class="etichetta">Autonomia (Barthel)</span><b class="grande">${Number(a.barthel)}</b><span class="muto piccolo">valutata di persona dall'infermiere</span></div>
            ${a.cognitivi.length ? `<div class="avviso ambra" style="margin-top:12px">${ico('persona')}<span>Segnali di memoria seguiti da ${esc(i.nome)}: ${esc(a.cognitivi.join(', ').toLowerCase())}. Fase ${a.fase} del piano: ${esc((FASI.find(f => f.n === a.fase) || FASI[0]).nome.toLowerCase())}. ${a.nota ? esc(a.nota) : ''}</span></div>` : '<p class="muto piccolo" style="margin-top:12px">Nessun segnale di memoria.</p>'}` : nascosto('salute')}
        </div></div>
      </section>`;
    }
    const altri = c.abitanti.filter(y => y.id !== a.id);
    return `<section class="vista">${testa}
      <div class="griglia-2" style="margin-top:24px"><div>
        <div class="mini-foto">${fotoCasa(c)}</div>
        <h2 style="margin:20px 0 8px">Con chi vivi</h2><p class="muto piccolo">Gli altri vedono di te età, abitudini e hobby, come tu vedi loro.</p>
        <div class="profili">${altri.map(y => profilo(y)).join('')}</div>
      </div><div>
        <div class="riepilogo uno">
          <div class="tessera"><span class="etichetta">Prossima visita</span><b class="grande">${prossime[0] ? esc(dataLunga(prossime[0].data)) : '—'}</b><span class="muto piccolo">${prossime[0] ? esc(prossime[0].cosa) : ''}</span></div>
          ${vede('costi') ? `<div class="tessera"><span class="etichetta">Da pagare entro il ${REGOLE.giornoScadenza} ${esc(meseNome(meseDopo(meseOggi())).split(' ')[0])}</span><b class="grande">${euro((pagamenti(c, a).find(p => p.mese === meseDopo(meseOggi())) || {}).totale || 0)}</b><span class="muto piccolo">costi con gli interventi extra di questo mese</span></div>` : ''}
        </div>
        <div class="punti" style="margin-top:20px">
          ${punto('telefono', `Il tuo infermiere: ${i.nome}`, `Al telefono ${i.fasce}. La sostituisce ${sost.nome}.`)}
          ${punto('regola', 'Regole della casa', c.regole.join(' · '))}
          ${c.aiuto && c.aiuto.persone.includes(a.id) ? punto('mano', 'Aiuto condiviso attivo', c.aiuto.motivo) : ''}
        </div></div></div>
      ${NOTA_FOTO}
    </section>`;
  }

  /* ---------- chi affitta: i vantaggi (F60) ---------- */
  function vistaVantaggi(c, i) {
    if (!vede('costi')) return nascosto('costi');
    const paganti = c.abitanti.filter(a => a.ruolo === 'coinquilino').length, lib = postiLiberi(c), hostS = seguiti(c).filter(a => a.ruolo === 'ospitante').length;
    const parte = quotaHost(c), netto = paganti * c.affitto - parte;
    const parteP = (paganti + lib) ? (quotaCasaMese() / Math.max(1, seguiti(c).length + lib) + INTERV_MESE()) * hostS : 0, nettoP = (paganti + lib) * c.affitto - parteP;
    const riga = (cosa, senza, con) => `<tr><td><b>${esc(cosa)}</b></td><td class="muto">${esc(senza)}</td><td>${esc(con)}</td></tr>`;
    return `<div class="riepilogo" style="margin-top:24px">
        <div class="tessera"><span class="etichetta">Guadagno netto al mese</span><b class="grande">${euro(netto)}</b><span class="muto piccolo">${paganti ? `affitto di ${plurale(paganti, 'ospite', 'ospiti')}${parte ? ', meno la tua parte dell\'infermiere' : ''}` : 'la stanza è ancora libera'}</span></div>
        <div class="tessera"><span class="etichetta">In un anno</span><b class="grande">${euro(netto * 12)}</b></div>
        <div class="tessera"><span class="etichetta">Con le stanze libere occupate</span><b class="grande">${euro(nettoP)}</b><span class="muto piccolo">al mese, ${euro(nettoP * 12)} all'anno</span></div>
        <div class="tessera"><span class="etichetta">Infermiere per la casa</span><b class="grande">compreso</b><span class="muto piccolo">${esc(i.nome)}, ${euro(REGOLE.euroGiornoCasa)} per ogni giorno feriale${hostS ? `; la tua parte (${euro(parte || parteP)}) la paghi all'infermiere` : ''}</span></div>
      </div>
      <h2 style="margin-bottom:12px">Da solo o con Casa in Rete</h2>
      <table class="tabella"><thead><tr><th></th><th>Da solo</th><th>Con Casa in Rete</th></tr></thead><tbody>
        ${riga('Entrate dalla stanza', 'nessuna', `${euro(c.affitto)} al mese per ogni ospite, più ${euro(c.spese)} di spese rimborsate`)}
        ${riga('Infermiere', 'da cercare e pagare a parte', `${i.nome} segue la casa e chi ci vive, ${hostS ? 'anche te, ' : ''}reperibile ${i.fasce}; controlli ogni ${REGOLE.controlloMesi} mesi`)}
        ${riga('Piccoli interventi in casa', 'a parte, quando si trova qualcuno', `${REGOLE.interventiInclusi} al mese già pagati nella tua quota; dalla ${REGOLE.interventiInclusi + 1}ª e nei festivi ${euro(REGOLE.tariffaIntervento)}`)}
        ${riga('Trasporti per visite ed esami', 'da organizzare da soli', 'l\'infermiere ti indica il trasporto sociale del Comune o il volontariato della zona')}
        ${riga('Compagnia in casa', 'nessuna', 'ospiti scelti da te, con abitudini e hobby simili, valutati dall\'infermiere')}
        ${riga('Pagamenti', 'da riscuotere a mano', 'diretti, con bonifico; nessuna commissione')}
      </tbody></table>
      <div class="griglia-2" style="margin-top:28px"><div class="punti">
        ${punto('persone', 'Decidi tu chi entra', 'Vedi età, abitudini e hobby; accetti solo dopo la valutazione dell\'infermiere.')}
        ${punto('infermiere', 'Infermiere compreso, trasporti a portata di mano', 'La tua parte dell\'infermiere la paghi con una parte dell\'affitto che ricevi: non metti soldi di tasca tua. Per i trasporti l\'infermiere ti indica il servizio del Comune o il volontariato.')}
      </div><div class="punti">
        ${punto('scudo', 'Resti una casa, non una struttura', 'Non organizzi l\'assistenza: ogni ospite firma da sé con l\'infermiere (TAR Lazio 1286/2022).')}
        ${punto('euro', 'Tasse dell\'affitto', 'Contratto di locazione della stanza; regime fiscale da verificare con un commercialista.')}
      </div></div>
      <p class="muto micro" style="margin-top:10px">Valori di prova, calcolati sui dati di questa casa.</p>`;
  }

  /* ---------- chi alloggia: richieste all'infermiere, trasporti, servizi ---------- */
  const STATO_O = { richiesto: ['attesa', 'Richiesto'], confermato: ['info', 'Confermato'], attivo: ['ok', 'Attivo'], fatto: ['ok', 'Fatto'], annullato: ['no', 'Annullato'] };
  function vistaServizi(a, c, i) {
    // Versione per la gara: Casa in Rete informa, orienta, ricorda e collega; non vende servizi e non incassa pagamenti.
    const m = meseOggi(), prossimo = meseDopo(m), solo = S.parente ? `<p class="muto piccolo">Solo ${esc(a.nome)} può chiedere o segnalare: tu puoi guardare.</p>` : '';
    const mieRi = S.richiesteInf.filter(r => r.chi === a.id);
    const oltre = costoInterventi(a.id, m), mieAss = S.assistenze.filter(x => x.chi === a.id);
    const statoRi = r => { const v = S.visite.find(x => x.id === r.visita); return r.stato === 'programmata' && v ? `<span class="pill info">Visita il ${esc(dataLunga(v.data))}${v.ora ? ' alle ' + esc(v.ora) : ''}</span>` : `<span class="pill attesa">Ricevuta: ${esc(i.nome)} la programma</span>`; };
    const infermiere = vede('visite') ? `<div>
        <h2>Chiedi l'infermiere</h2>
        <p class="muto piccolo" style="margin:4px 0 12px">${esc(i.nome)} viene in casa. La tua quota per l'infermiere comprende già ${REGOLE.interventiInclusi} interventi al mese (${euro(REGOLE.prezzoIntervento)} l'uno). Dalla ${REGOLE.interventiInclusi + 1}ª prestazione del mese, e per ogni intervento in un giorno festivo, ${euro(REGOLE.tariffaIntervento)} da pagare a ${esc(i.nome)} il mese dopo; nei festivi no, se continua una terapia iniziata in un giorno feriale. Il controllo dei ${REGOLE.controlloMesi} mesi e le telefonate non contano.</p>
        ${contatore(a.id, m)}
        <div class="avviso rausch" style="margin:12px 0">${ico('telefono')}<span>Per un'urgenza vera chiama il 112, non aspettare la visita. Per i dubbi sui farmaci: medico di famiglia o farmacista.</span></div>
        ${S.parente ? solo : `<div class="righe-campi">
          <label class="campo">Per che cosa<select id="ri-motivo">${opzTesto(MOTIVI_INF, MOTIVI_INF[0])}</select></label>
          <label class="campo">Quando<select id="ri-urgenza">${opzTesto(URGENZE, URGENZE[1])}</select></label>
          <label class="campo tutta">Due righe per l'infermiere<input id="ri-note" type="text" placeholder="Per esempio: la ferita al piede non si chiude."></label></div>
          <button class="btn pieno" style="margin-top:10px" data-azione="chiedi-infermiere">Manda la richiesta</button>`}
        <div class="da-seguire" style="margin-top:16px">${mieRi.map(r => `<div><span class="puntino" style="background:${r.stato === 'nuova' ? '#e8a33d' : '#1f63b8'}"></span><span><b>${esc(r.motivo)}</b> · ${esc(r.urgenza.toLowerCase())} · ${statoRi(r)}<br><span class="muto piccolo">${esc(r.note)}</span></span></div>`).join('') || '<p class="muto piccolo">Nessuna richiesta.</p>'}</div>
      </div>` : `<div>${nascosto('visite')}</div>`;
    const territorio = `<div>
        <h2>Servizi del territorio</h2>
        <p class="muto piccolo" style="margin:4px 0 12px">Casa in Rete non vende servizi: ti dice chi li offre e come chiederli. Se hai un dubbio, chiedi a ${esc(i.nome)}.</p>
        <div class="da-seguire">${SERVIZI_TERRITORIO.map(s => `<div>${ico(s.icona)}<span><b>${esc(s.nome)}</b> · ${esc(s.chi)}<br><span class="muto piccolo">${esc(s.come)}</span></span></div>`).join('')}</div>
      </div>`;
    if (!vede('costi')) return `<div class="griglia-2" style="margin-top:24px">${infermiere}${territorio}</div>`;
    return `<div class="griglia-2" style="margin-top:24px">${infermiere}${territorio}</div>
      ${oltre ? `<div class="avviso ambra" style="margin-top:28px;max-width:760px">${ico('euro')}<span>Prestazioni extra di ${esc(meseNome(m).split(' ')[0])}: ${interventiMese(a.id, m).oltre} oltre le ${REGOLE.interventiInclusi} e ${interventiMese(a.id, m).festExtra} festive, × ${euro(REGOLE.tariffaIntervento)} = <b>${euro(oltre)}</b>, da pagare a ${esc(i.nome)} a ${esc(meseNome(prossimo).split(' ')[0])}.</span></div>` : ''}
      <h2 style="margin:36px 0 6px">Badante o OSS a ore, solo per te</h2>
      <p class="muto piccolo" style="margin-bottom:12px;max-width:820px">Quando ti serve più aiuto per qualche ora, segnalalo a ${esc(i.nome)}: ti aiuta a capire che cosa serve e a chi chiederlo. Il contratto e il pagamento sono diretti, con il lavoratore o con una cooperativa. Costo indicativo: badante ${euro(REGOLE.tariffe.badante)} l'ora (valore di prova), OSS ${REGOLE.tariffe.oss.toLocaleString('it-IT', { minimumFractionDigits: 2 })} € l'ora (costo del lavoro nelle cooperative sociali). Oltre ${REGOLE.aiutoOreMax} ore al giorno l'infermiere ti rivaluta: la casa resta una casa.</p>
      ${S.parente ? solo : `<div class="righe-campi" style="max-width:760px">
        <label class="campo">Chi<select id="as-figura"><option value="badante">Badante</option><option value="oss">OSS</option></select></label>
        <label class="campo">Ore al giorno<select id="as-ore">${[1, 2, 3, 4, 5, 6].map(h => `<option${h === 2 ? ' selected' : ''}>${h}</option>`).join('')}</select></label>
        <label class="campo">Giorni a settimana<select id="as-giorni">${[1, 2, 3, 4, 5, 6, 7].map(h => `<option${h === 5 ? ' selected' : ''}>${h}</option>`).join('')}</select></label>
        <label class="campo">Da quando<input id="as-dal" type="date" value="${traGiorni(3)}"></label>
        <label class="campo tutta">Per che cosa<input id="as-nota" type="text" placeholder="Per esempio: compagnia la mattina, doccia, spesa."></label></div>
        <button class="btn pieno" style="margin-top:10px" data-azione="prenota-assistenza">Segnala all'infermiere</button>`}
      <table class="tabella" style="margin-top:16px"><thead><tr><th>Chi</th><th>Quando</th><th>Per che cosa</th><th class="num">Al mese, circa<br><span class="muto">pagato direttamente</span></th><th>Stato</th></tr></thead><tbody>
        ${mieAss.map(x => `<tr><td>${esc(FIGURE[x.figura])}</td><td>${Number(x.ore)} ore × ${Number(x.giorni)} giorni a settimana, dal ${esc(dataLunga(x.dal))}${x.al ? ` al ${esc(dataLunga(x.al))}` : ''}</td><td>${esc(x.nota)}</td><td class="num">${euro(x.ore * x.giorni * 52 / 12 * REGOLE.tariffe[x.figura])}</td><td><span class="pill ${x.stato === 'attiva' ? 'ok' : x.stato === 'annullata' || x.stato === 'finita' ? '' : 'attesa'}">${esc(x.stato)}</span>${!S.parente && ['attiva', 'segnalata', 'prenotata'].includes(x.stato) ? ` <button class="btn terziario" data-azione="interrompi-assistenza" data-id="${esc(x.id)}">Interrompi</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muto">Nessun aiuto a ore.</td></tr>'}
      </tbody></table>`;
  }

  /* ---------- vista: famiglia e consenso di Giulio (chi cerca casa) ---------- */
  const vistaFamiglia = () => `<section class="vista">${bannerParente()}<div class="pagina-titolo"><h1>${S.parente ? 'Che cosa vedo' : 'Famiglia e consenso'}</h1></div>${pannelloConsenso('cerca', 'Giulio')}</section>`;

  // Il consenso lo cambia solo la persona: il parente vede il riepilogo in sola lettura.
  function pannelloConsenso(chiave, nome) {
    const k = S.consensi[chiave];
    const cap = `<div class="avviso ambra" style="margin-top:20px">${ico('scudo')}<span><b>Se un giorno non potrai più decidere da solo.</b> Questo consenso non fa del parente un tuo rappresentante. Per quel momento servono un fiduciario indicato nelle DAT, le disposizioni anticipate di trattamento (L. 219/2017, art. 4), oppure un amministratore di sostegno nominato dal giudice (art. 3). L'infermiere te ne parla con calma, quando puoi ancora scegliere.</span></div>`;
    if (S.parente) {
      return `<div class="blocco" style="margin-top:16px"><h2>Le parti che ${esc(k.persona)} ti mostra</h2>
        <div class="lista-controllo" style="margin-top:12px">${PARTI.map(([p, t]) => `<div class="${k.permessi[p] ? '' : 'no'}">${ico(k.permessi[p] ? 'check' : 'chiudi')}<span>${esc(t)}${k.permessi[p] ? '' : ': non condivisa'}</span></div>`).join('')}</div>
        <p class="muto piccolo" style="margin-top:12px">Consenso dato il ${esc(dataLunga(k.dal))}${k.riconfermato ? `, riconfermato il ${esc(dataLunga(k.riconfermato))}` : ''}. Solo ${esc(k.persona)} può cambiarlo o toglierlo, dal suo account. Ogni volta che guardi una parte, ${esc(k.persona)} lo vede nel registro.</p></div>`;
    }
    if (!k || !k.attivo) {
      return `<div class="blocco" style="margin-top:16px"><h2>Nessun parente vede il tuo account</h2>
        <p class="muto" style="margin-top:6px;max-width:760px">Puoi invitare una persona di famiglia a guardare alcune parti del tuo account. Scegli tu quali, e puoi togliere il consenso quando vuoi.</p>
        <div class="righe-campi" style="margin-top:16px;max-width:760px">
          <label class="campo">Nome del parente<input id="inv-nome" type="text" placeholder="Per esempio: Anna"></label>
          <label class="campo">Chi è per te<select id="inv-rel">${opzTesto(['figlia', 'figlio', 'nipote', 'sorella', 'fratello', 'moglie o marito', 'altra persona di fiducia'], 'figlia')}</select></label>
          <div class="campo tutta">Che cosa può vedere<span class="muto piccolo" style="font-weight:400">La salute è a parte: se la scegli, è un consenso esplicito per i dati di salute.</span>${chips(PARTI.filter(([p]) => p !== 'salute').map(([, t]) => t), 'inv-parti')}</div>
        </div>
        <button class="btn pieno" style="margin-top:12px" data-azione="invita" data-id="${esc(chiave)}">Invita e dai il consenso</button>
        ${k && !k.attivo ? `<p class="muto piccolo" style="margin-top:10px">Avevi tolto il consenso ${esc(aChi(k.parente.nome))}.</p>` : ''}</div>${cap}`;
    }
    const riconf = k.riconfermato || k.dal, scade = traMesi(riconf, REGOLE.controlloMesi) <= isoData(OGGI);
    return `<div class="griglia-2" style="margin-top:20px"><div>
        <h2>${esc(k.parente.nome)}, ${esc(k.parente.relazione)}</h2>
        <p class="muto piccolo" style="margin-top:4px">Consenso dato il ${esc(dataLunga(k.dal))}${k.riconfermato ? `, riconfermato il ${esc(dataLunga(k.riconfermato))}` : ''} · ${scade ? '<b>da riconfermare</b> con l\'infermiere' : `si riconferma al prossimo controllo`}</p>
        <h3 style="margin:18px 0 8px">Che cosa può vedere</h3>
        <div class="lista-permessi">${PARTI.map(([p, t]) => `<button type="button" class="chip" data-azione="permesso" data-id="${esc(chiave)}|${p}" aria-pressed="${!!k.permessi[p]}">${esc(t)}</button>`).join('')}</div>
        <p class="muto piccolo" style="margin-top:8px">Tocca una voce per accenderla o spegnerla. La salute è un consenso esplicito a parte (GDPR, art. 9); l'infermiere lo annota anche come indicazione della persona che riceve le informazioni (L. 219/2017, art. 1, c. 3).</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
          ${scade ? `<button class="btn scuro" data-azione="riconferma" data-id="${esc(chiave)}">Riconfermo il consenso</button>` : ''}
          <button class="btn secondario" data-azione="revoca" data-id="${esc(chiave)}">Togli il consenso</button></div>
        <p class="muto micro" style="margin-top:8px">Si toglie con un clic, come si è dato (GDPR, art. 7). ${esc(k.parente.nome)} non può guardare né agire al tuo posto: richieste, accettazioni e pagamenti li confermi tu.</p>
      </div><div>
        <h2>Registro</h2><p class="muto piccolo" style="margin:4px 0 12px">Chi ha guardato che cosa, e quando.</p>
        <div class="da-seguire">${k.registro.slice(0, 8).map(r => `<div><span class="puntino" style="background:var(--blu)"></span><span><b>${esc(r.quando.slice(8, 10))}/${esc(r.quando.slice(5, 7))} alle ${esc(r.quando.slice(11))}</b><br>${esc(k.parente.nome)} ${esc(r.cosa)}</span></div>`).join('') || '<p class="muto piccolo">Ancora nessun accesso.</p>'}</div>
      </div></div>${cap}`;
  }

  /* ---------- finestre, avvisi, scelte: riprese dalla v3 ---------- */
  function apriFinestra(titolo, corpo, piede) {
    chiudiFinestra();
    const v = document.createElement('div'); v.className = 'velo'; v.id = 'velo';
    v.innerHTML = `<div class="finestra" role="dialog" aria-modal="true" aria-label="${esc(titolo)}"><div class="testa-f"><button class="chiudi-x" data-azione="chiudi" aria-label="Chiudi">${ico('chiudi')}</button><h3>${esc(titolo)}</h3><span></span></div>
      <div class="corpo-f">${corpo}</div><div class="piede-f">${piede}</div></div>`;
    v.addEventListener('click', e => { if (e.target === v) chiudiFinestra(); });
    document.body.appendChild(v);
    const primo = v.querySelector('.corpo-f input, .corpo-f select, .corpo-f textarea'); if (primo) primo.focus();
  }
  function chiudiFinestra() { const v = document.getElementById('velo'); if (v) v.remove(); }
  function avvisa(t) {
    document.querySelectorAll('.toast').forEach(n => n.remove());
    const n = document.createElement('div'); n.className = 'toast'; n.setAttribute('role', 'status'); n.textContent = t;
    document.body.appendChild(n); setTimeout(() => n.remove(), 4200);
  }
  const chips = (lista, gruppo, scelti) => `<div class="chips">${lista.map(b => `<button type="button" class="chip" data-azione="chip" data-gruppo="${gruppo}" aria-pressed="${(scelti || []).includes(b)}">${esc(b)}</button>`).join('')}</div>`;
  const scelti = gruppo => [...document.querySelectorAll(`[data-azione="chip"][data-gruppo="${gruppo}"][aria-pressed="true"]`)].map(b => b.textContent);
  const valore = id => (document.getElementById(id) || { value: '' }).value.trim();

  const moduloBarthel = pref => `<div class="campo tutta">Autovalutazione del bisogno di aiuto (indice di Barthel)
      <span class="muto piccolo" style="font-weight:400">Compilala con un familiare: sopra i 75 anni la scala non va compilata da soli. L'infermiere la conferma al sopralluogo.</span>
      <div class="barthel">${BARTHEL.map(([voce, opz], i) => `<label>${esc(voce)}<select data-barthel="${pref}" data-i="${i}"><option value="">Scegli</option>${opz.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></label>`).join('')}</div></div>
    <div class="campo tutta">C'è uno di questi bisogni?<span class="muto piccolo" style="font-weight:400">Se serve assistenza continua, una casa condivisa non basta: ne parli con il medico di famiglia o con il PUA, il punto unico di accesso della ASL.</span>${chips(SEGNALI_ESCLUSIONE, pref + '-segnali')}</div>`;
  function letturaBarthel(pref) {
    const sel = [...document.querySelectorAll(`[data-barthel="${pref}"]`)], fatte = sel.filter(x => x.value !== '');
    return { completa: fatte.length === sel.length, mancano: sel.length - fatte.length, punteggio: fatte.reduce((a, x) => a + Number(x.value), 0), segnali: scelti(pref + '-segnali') };
  }
  // Versione per la gara (regola «non diagnostiche»): l'app non interpreta le risposte e non dà esiti né punteggi a chi compila.
  // Le risposte le legge l'infermiere al sopralluogo; la decisione è sua, con la persona e, se serve, con il medico di famiglia.
  function giudizio(b) {
    if (!b.completa && !b.segnali.length) return null;
    return { ok: true, testo: 'Grazie. Le risposte le legge l\'infermiere al sopralluogo: è lui, con te e, se serve, con il medico di famiglia, a dire se questa casa va bene o quale servizio può aiutarti.' };
  }
  function aggiornaEsito(pref) {
    const box = document.getElementById(pref + '-esito'); if (!box) return;
    const b = letturaBarthel(pref), g = giudizio(b);
    box.className = 'avviso grigio tutta';
    box.textContent = g ? g.testo : `Mancano ${b.mancano} risposte su 10.`;
  }

  function finestraQuestionario() {
    const c = casa(S.scheda);
    apriFinestra(`Sopralluogo alla casa di ${c.ospita.nome}`, `
      <div class="avviso grigio">${ico('scudo')}<span>Niente nomi. Chi ospita vede età, abitudini e hobby. Le risposte sulla salute le vede solo l'infermiere, che le legge al sopralluogo.</span></div>
      <div class="righe-campi" style="margin-top:16px">
        <label class="campo">Chi compila<select id="q-rel">${opzTesto(COMPILA, COMPILA[1])}</select></label>
        <label class="campo">Quando preferisci il sopralluogo<select id="q-fascia">${opzTesto(FASCE, 'Mattina')}</select></label>
        <label class="campo">Donna o uomo<select id="q-sesso"><option value="F">Donna</option><option value="M" selected>Uomo</option></select></label>
        <label class="campo">Età<input id="q-eta" type="number" min="60" max="105" value="79"></label>
        ${moduloBarthel('q')}
        <div class="campo tutta">Memoria e orientamento: c'è uno di questi segnali?<span class="muto piccolo" style="font-weight:400">Non esclude: dice all'infermiere che cosa guardare al sopralluogo.</span>${chips(SEGNALI_COGNITIVI, 'q-cogn')}</div>
        <div class="avviso grigio tutta" id="q-esito">Rispondi alle 10 domande: le risposte le legge l'infermiere, non l'app.</div>
        <div class="campo tutta">Abitudini<span class="muto piccolo" style="font-weight:400">Le vedranno chi ospita e chi vive in casa.</span>${chips(ABITUDINI, 'q-abit')}</div>
        <div class="campo tutta">Hobby${chips(HOBBY, 'q-hobby')}</div>
        <label class="campo tutta">Due righe di presentazione, senza nomi<textarea id="q-pres" placeholder="Per esempio: vedovo da poco, vive solo in affitto, la sera si sente solo."></textarea></label>
      </div>`, '<button class="btn terziario" data-azione="chiudi">Annulla</button><button class="btn pieno" data-azione="invia-questionario">Manda la richiesta</button>');
  }
  function inviaQuestionario() {
    const c = casa(S.scheda), b = letturaBarthel('q');
    if (!b.completa && !b.segnali.length) { avvisa(`Mancano ${b.mancano} risposte su 10 nel questionario.`); return; }
    if (postiLiberi(c) < 1) { avvisa('La casa è al completo.'); return; }
    const id = 'R-' + (Math.max(...S.richieste.map(r => Number(r.id.slice(2)))) + 1);
    const fascia = FASCE.includes(valore('q-fascia')) ? valore('q-fascia') : 'Indifferente';
    S.richieste.unshift({ id, casa: c.id, mia: true, stato: 'nuova', ricevuta: isoData(OGGI), fascia, sopralluogo: null, ora: null,
      persona: { sesso: valore('q-sesso') === 'F' ? 'F' : 'M', eta: Number(valore('q-eta')) || 75, compila: COMPILA.includes(valore('q-rel')) ? valore('q-rel') : COMPILA[0], barthel: b.punteggio, segnali: b.segnali,
        cognitivi: scelti('q-cogn'), abitudini: scelti('q-abit'), hobby: scelti('q-hobby'), presentazione: valore('q-pres') || 'Nessuna presentazione.' } });
    chiudiFinestra(); salva(); vai('richieste');
    avvisa(`Richiesta ${id} mandata. ${inf(c.infermiere).nome} programma il sopralluogo (${fascia.toLowerCase()}) e ti dice giorno e ora.`);
  }

  function finestraValutazione(id) {
    const r = S.richieste.find(q => q.id === id), c = casa(r.casa);
    apriFinestra(`Valutazione d'ingresso, ${r.id}`, `
      <div class="avviso grigio">${ico('persona')}<span>${esc(descr(r.persona))} · questionario: Barthel ${Number(r.persona.barthel)} dichiarato (${esc(r.persona.compila.toLowerCase())}) · ${r.persona.cognitivi.length ? 'segnali: ' + esc(r.persona.cognitivi.join(', ').toLowerCase()) : 'nessun segnale di memoria'}. Casa di ${esc(c.ospita.nome)}, ${esc(c.quartiere)}.</span></div>
      <div class="righe-campi" style="margin-top:16px">
        <label class="campo">Barthel misurato al sopralluogo<input id="v-barthel" type="number" min="0" max="100" step="5" value="${Number(r.persona.barthel)}"></label>
        <label class="campo">Test cognitivo breve<select id="v-cogn"><option>Nella norma</option><option${r.persona.cognitivi.length ? ' selected' : ''}>Da approfondire</option><option>Non eseguito</option></select></label>
        <label class="campo">La casa va bene per questa persona?<select id="v-casa"><option>Sì</option><option>Sì, con piccoli adattamenti</option><option>No</option></select></label>
        <label class="campo">Se serve un altro servizio<select id="v-servizio">${opzTesto(SERVIZI, SERVIZI[0])}</select></label>
        <label class="campo tutta">Note per la persona (le vede anche il parente con il consenso per la salute; chi affitta vede solo l'esito)<textarea id="v-note" placeholder="Che cosa hai visto, che cosa serve, prossimo controllo."></textarea></label>
        <div class="avviso grigio tutta">${ico('scudo')}<span>Un test breve da solo non basta (Cochrane 2021): conta l'insieme della valutazione. Con un test da approfondire la persona entra in fase 2, con un controllo anticipato.</span></div>
      </div>`, `<button class="btn secondario" data-azione="salva-valutazione" data-id="${esc(r.id)}" data-esito="no">Serve un altro servizio</button><button class="btn pieno" data-azione="salva-valutazione" data-id="${esc(r.id)}" data-esito="si">Adatta alla casa</button>`);
  }
  function salvaValutazione(id, si) {
    const r = S.richieste.find(q => q.id === id), b = Math.max(0, Math.min(100, Number(valore('v-barthel')) || 0));
    const cogn = valore('v-cogn'), casaOk = valore('v-casa') !== 'No', note = valore('v-note');
    // la regola del programma (autonomia da 91) è un promemoria per l'infermiere, non un blocco: decide lui
    const sotto = si && b < REGOLE.barthelMin;
    if (si && !casaOk) { avvisa('Hai indicato che la casa non va bene: indica un altro servizio o un\'altra casa.'); return; }
    r.valutazione = si ? { esito: 'adatta', barthel: b, cognitivo: cogn, note: note || 'Adatta alla casa.' }
      : { esito: 'altro', barthel: b, cognitivo: cogn, servizio: valore('v-servizio'), note: note || 'I bisogni superano quello che una casa condivisa può dare.' };
    r.stato = si ? 'valutata' : 'non-adatta';
    chiudiFinestra(); salva(); disegna();
    avvisa(si ? `${r.id}: adatta. Ora ${casa(r.casa).ospita.nome} può accettare.${sotto ? ` Promemoria: la regola del programma chiede autonomia da ${REGOLE.barthelMin} in su; la decisione è tua.` : ''}` : `${r.id}: indicato un altro servizio alla famiglia.`);
  }

  function finestraAiuto(idCasa) {
    const c = casa(idCasa);
    apriFinestra(`Aiuto condiviso, casa di ${c.ospita.nome}`, `
      <div class="righe-campi">
        <label class="campo">Chi aiuta<select id="a-tipo"><option value="oss">OSS (${REGOLE.tariffe.oss.toLocaleString('it-IT')} € all'ora)</option><option value="collaboratrice">Collaboratrice domestica (${REGOLE.tariffe.collaboratrice.toLocaleString('it-IT')} € all'ora)</option></select></label>
        <label class="campo">Ore al giorno<select id="a-ore">${[1, 2, 3, 4].map(n => `<option value="${n}"${n === 2 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="campo tutta">Chi lo usa<span class="muto piccolo" style="font-weight:400">Il prezzo si divide secondo i punti di carico: 1 autonomo, 2 lieve, 3 moderata.</span>${chips(seguiti(c).map(a => `${a.id} · ${descr(a)} · ${punti(a)} punti`), 'a-persone')}</div>
        <label class="campo tutta">Perché<input id="a-motivo" type="text" placeholder="Per esempio: rientro dall'ospedale, influenza, frattura."></label>
        <div class="avviso grigio tutta">${ico('scudo')}<span>Al massimo ${REGOLE.aiutoOreMax} ore al giorno e ${REGOLE.aiutoGiorniMax} giorni, poi una nuova valutazione: un aiuto continuo farebbe della casa una struttura.</span></div>
      </div>`, `<button class="btn terziario" data-azione="chiudi">Annulla</button><button class="btn pieno" data-azione="attiva-aiuto" data-id="${c.id}">Attiva</button>`);
  }
  function attivaAiuto(idCasa) {
    const c = casa(idCasa), persone = scelti('a-persone').map(t => t.split(' · ')[0]);
    if (!persone.length) { avvisa('Scegli almeno una persona.'); return; }
    c.aiuto = { tipo: valore('a-tipo') === 'collaboratrice' ? 'collaboratrice' : 'oss', ore: Math.min(REGOLE.aiutoOreMax, Number(valore('a-ore')) || 2), persone, inizio: isoData(OGGI), motivo: valore('a-motivo') || 'Periodo di bisogno valutato dall\'infermiere.' };
    chiudiFinestra(); salva(); disegna(); avvisa(`Aiuto condiviso attivo nella casa di ${c.ospita.nome}.`);
  }

  /* ---------- motore ---------- */
  const VISTE = { accesso: vistaAccesso, cerca: vistaCerca, scheda: vistaScheda, richieste: vistaRichieste, ospita: vistaOspita, infermiere: vistaInfermiere, alloggia: vistaAlloggia, famiglia: vistaFamiglia };
  // Azioni che solo la persona può fare: il parente guarda e basta.
  const SOLO_PERSONA = ['prenota-assistenza', 'interrompi-assistenza', 'chiedi-infermiere', 'apri-questionario', 'invia-questionario', 'ritira', 'ospita-rifiuta', 'ospita-accetta', 'idoneita', 'agibilita', 'permesso', 'revoca', 'invita', 'riconferma'];
  const disegnaNav = () => { document.getElementById('nav').innerHTML = navHtml(); };
  function disegna() {
    nSvg = 0;
    if (!VISTE[S.vista] || (S.vista === 'scheda' && !casa(S.scheda)) || (S.vista === 'famiglia' && S.utenza !== 'cerca')) S.vista = 'accesso';
    disegnaNav();
    // L'HTML nasce solo dai modelli di questo file: ogni testo variabile è già passato da esc().
    document.getElementById('app').innerHTML = VISTE[S.vista]();
  }
  function vai(vista, extra) { Object.assign(S, extra || {}, { vista, menuAperto: false }); salva(); disegna(); window.scrollTo(0, 0); }
  const casaUtenza = () => ({ cerca: S.parente ? 'richieste' : 'cerca', ospita: 'ospita', infermiere: 'infermiere', alloggia: 'alloggia' }[S.utenza] || 'accesso');
  const abitante = chiave => { const [ic, ia] = String(chiave).split('|'), c = casa(ic); return { c, a: c && c.abitanti.find(x => x.id === ia) }; };

  document.addEventListener('click', e => {
    if (S.menuAperto && !e.target.closest('.conto')) { S.menuAperto = false; disegnaNav(); }
    const t = e.target.closest('[data-azione]'); if (!t) return;
    const a = t.dataset.azione, id = t.dataset.id;
    if (S.parente && SOLO_PERSONA.includes(a)) { avvisa(`Lo può fare solo ${S.consensi[S.parente].persona}, dal suo account: tu puoi guardare.`); return; }
    switch (a) {
      case 'logo': vai(casaUtenza()); break;
      case 'guida': guidaClic(id); break;
      case 'entra': S.utenza = id; S.parente = null; S.tabOspita = 'richieste'; S.tabInf = 'case'; S.tabAll = 'casa'; vai(casaUtenza()); break;
      case 'riempi-login': { const e1 = document.getElementById('login-email'), p1 = document.getElementById('login-pw'); if (e1 && p1) { e1.value = id; p1.value = 'prova'; p1.focus(); } break; }
      case 'login': {
        const em = valore('login-email').trim().toLowerCase(), acc = ACCOUNT_PROVA.find(x => x.email === em);
        if (!acc || valore('login-pw') !== 'prova') { avvisa('Email o password di prova non corrette. Scegli un account di prova: la password è «prova».'); break; }
        S.parente = null; S.tabOspita = 'richieste'; S.tabInf = 'case'; S.tabAll = 'casa';
        if (acc.ruolo === 'parente') {
          const k = S.consensi[acc.consenso]; if (!k || !k.attivo) { avvisa('Il consenso è stato tolto: questo account non vede più nulla.'); break; }
          S.parente = acc.consenso;
          if (acc.consenso === 'cerca') S.utenza = 'cerca'; else if (acc.consenso.startsWith('ospita:')) { S.utenza = 'ospita'; S.casaOspite = acc.consenso.slice(7); } else { S.utenza = 'alloggia'; S.residente = acc.consenso; }
          registra('ha aperto l\'account');
        } else { S.utenza = acc.ruolo; if (acc.casa) S.casaOspite = acc.casa; if (acc.inf) S.infermiere = acc.inf; if (acc.residente) S.residente = acc.residente; }
        vai(casaUtenza()); break;
      }
      case 'entra-parente': {
        const k = S.consensi[id]; if (!k || !k.attivo) break;
        S.parente = id;
        if (id === 'cerca') S.utenza = 'cerca';
        else if (id.startsWith('ospita:')) { S.utenza = 'ospita'; S.casaOspite = id.slice(7); S.tabOspita = 'richieste'; }
        else { S.utenza = 'alloggia'; S.residente = id; S.tabAll = 'casa'; }
        registra('ha aperto l\'account'); vai(casaUtenza()); break;
      }
      case 'esci': S.utenza = null; S.parente = null; vai('accesso'); break;
      case 'tab-a': registra('ha guardato: ' + ({ servizi: 'richieste e servizi', casa: 'la casa', costi: 'costi e pagamenti', visite: 'visite e salute', famiglia: 'il consenso' }[id] || id)); vai('alloggia', { tabAll: id }); break;
      case 'programma': {
        const r = S.richieste.find(q => q.id === id), d = valore('p-data-' + id), o = valore('p-ora-' + id);
        if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{1,2}:\d{2}$/.test(o)) { avvisa('Scegli giorno e ora.'); break; }
        if (d < isoData(OGGI)) { avvisa('Il giorno è già passato.'); break; }
        Object.assign(r, { stato: 'sopralluogo', sopralluogo: d, ora: o }); salva(); disegna();
        avvisa(`Sopralluogo ${r.id} programmato il ${dataLunga(d)} alle ${o}: lo vedono chi cerca casa e ${casa(r.casa).ospita.nome}.`); break;
      }
      case 'nuova-visita': {
        const p = persona(valore('nv-chi')), d = valore('nv-data'), o = valore('nv-ora');
        if (!p.a || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < isoData(OGGI)) { avvisa('Scegli una persona e un giorno da oggi in poi.'); break; }
        const tipo = ['visita', 'controllo', 'trattamento'].includes(valore('nv-tipo')) ? valore('nv-tipo') : 'visita';
        S.visite.push({ id: 'V-' + (S.visite.length + 1), inf: S.infermiere, data: d, ora: /^\d{1,2}:\d{2}$/.test(o) ? o : '', casa: p.c.id, chi: p.a.id, tipo, cosa: valore('nv-cosa') || (tipo === 'controllo' ? 'Controllo' : 'Visita programmata') });
        salva(); disegna(); avvisa(`Visita aggiunta: ${p.a.id}, ${dataLunga(d)}${o ? ' alle ' + o : ''}.`); break;
      }
      case 'chiedi-infermiere': {
        const { a } = residente(), id2 = 'RI-' + (S.richiesteInf.length + 1);
        S.richiesteInf.unshift({ id: id2, chi: a.id, motivo: MOTIVI_INF.includes(valore('ri-motivo')) ? valore('ri-motivo') : 'Altro', note: valore('ri-note') || 'Nessuna nota.',
          urgenza: URGENZE.includes(valore('ri-urgenza')) ? valore('ri-urgenza') : URGENZE[2], ricevuta: isoData(OGGI), stato: 'nuova' });
        salva(); disegna(); avvisa(`Richiesta mandata a ${inf(residente().c.infermiere).nome}: ti dice quando passa.`); break;
      }
      case 'prenota-assistenza': {
        const { a, c } = residente(), fig = valore('as-figura') === 'oss' ? 'oss' : 'badante', ore = Math.min(6, Math.max(1, Number(valore('as-ore')) || 2)), gg = Math.min(7, Math.max(1, Number(valore('as-giorni')) || 5)), d = valore('as-dal');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < isoData(OGGI)) { avvisa('Scegli un giorno da oggi in poi.'); break; }
        S.assistenze.push({ id: 'AS-' + (S.assistenze.length + 1), chi: a.id, figura: fig, ore, giorni: gg, dal: d, al: null, stato: 'segnalata', nota: (valore('as-nota') || 'Aiuto a ore').slice(0, 80) });
        salva(); disegna();
        avvisa(`Segnalato a ${inf(c.infermiere).nome}: ti richiama per capire che cosa serve. Contratto e pagamento sono diretti, con il lavoratore o con una cooperativa.${ore > REGOLE.aiutoOreMax ? ` Oltre ${REGOLE.aiutoOreMax} ore al giorno l'infermiere ti rivaluta.` : ''}`); break;
      }
      case 'interrompi-assistenza': { const x = S.assistenze.find(y => y.id === id); if (!x) break; if (x.dal > isoData(OGGI)) x.stato = 'annullata'; else { x.al = isoData(OGGI); x.stato = 'finita'; } salva(); disegna(); avvisa('Fatto: l\'aiuto finisce da oggi; avvisa tu chi lo fa. Non si paga più.'); break; }
      case 'programma-ri': {
        const r = S.richiesteInf.find(x => x.id === id), d = valore('ri-data-' + id), o = valore('ri-ora-' + id), p = r && persona(r.chi);
        if (!r || !p.a || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < isoData(OGGI)) { avvisa('Scegli un giorno da oggi in poi.'); break; }
        const v = { id: 'V-' + (S.visite.length + 1), inf: S.infermiere, data: d, ora: /^\d{1,2}:\d{2}$/.test(o) ? o : '', casa: p.c.id, chi: p.a.id,
          tipo: ['Medicazione', 'Iniezione prescritta dal medico'].includes(r.motivo) ? 'trattamento' : 'visita', cosa: `${r.motivo}: ${r.note}` };
        S.visite.push(v); Object.assign(r, { stato: 'programmata', visita: v.id });
        const k = interventiMese(p.a.id, d.slice(0, 7));
        salva(); disegna(); avvisa(`Visita programmata. Per ${p.a.nome || p.a.id} è l'intervento n. ${k.n} di ${meseNome(d.slice(0, 7)).split(' ')[0]}${festivo(d) ? `: è un giorno festivo, ${euro(REGOLE.tariffaIntervento)} da pagare all'infermiere il mese dopo (salvo una terapia già iniziata)` : k.normali > REGOLE.interventiInclusi ? `: oltre i ${REGOLE.interventiInclusi}, ${euro(REGOLE.tariffaIntervento)} da pagare all'infermiere il mese dopo` : ': già pagato nella quota'}.`); break;
      }
      case 'permesso': {
        const [kc, p] = String(id).split('|'), k = S.consensi[kc]; if (!k || !PARTI.some(x => x[0] === p)) break;
        k.permessi[p] = !k.permessi[p]; salva(); disegna();
        avvisa(p === 'salute' && k.permessi[p] ? `Consenso esplicito per i dati di salute dato ${aChi(k.parente.nome)}. L'infermiere lo annota.` : `${nomeParte(p)}: ${k.permessi[p] ? 'ora' : 'non più'} visibile a ${k.parente.nome}.`); break;
      }
      case 'revoca': { const k = S.consensi[id]; if (!k) break; k.attivo = false; salva(); disegna(); avvisa(`Consenso tolto: da adesso ${k.parente.nome} non vede più il tuo account.`); break; }
      case 'riconferma': { const k = S.consensi[id]; if (!k) break; k.riconfermato = isoData(OGGI); salva(); disegna(); avvisa('Consenso riconfermato. Il prossimo controllo lo ripropone.'); break; }
      case 'invita': {
        const nomeP = valore('inv-nome'); if (!nomeP) { avvisa('Scrivi il nome del parente.'); break; }
        const scelte = scelti('inv-parti'), chi = id === 'cerca' ? 'Giulio' : id.startsWith('ospita:') ? casa(id.slice(7)).ospita.nome : persona(id).a.nome;
        S.consensi[id] = { persona: chi, parente: { nome: nomeP.slice(0, 40), relazione: valore('inv-rel') || 'altra persona di fiducia' }, dal: isoData(OGGI), attivo: true,
          permessi: Object.fromEntries(PARTI.map(([p, t]) => [p, p !== 'salute' && scelte.includes(t)])), registro: [] };
        salva(); disegna(); avvisa(`Invito mandato ${aChi(nomeP)}. Vedrà solo le parti che hai scelto.`); break;
      }
      case 'menu-conto': S.menuAperto = !S.menuAperto; disegnaNav(); break;
      case 'ripristina': if (MEMORIA) { try { localStorage.removeItem(CHIAVE); } catch (er) { /* niente */ } } S = iniziale(); salva(); disegna(); window.scrollTo(0, 0); avvisa('Dati di prova ripristinati.'); break;
      case 'tab-c': registra('ha guardato: ' + ({ richieste: 'le richieste', famiglia: 'il consenso', cerca: 'le case' }[id] || id)); vai(['richieste', 'famiglia'].includes(id) ? id : 'cerca'); break;
      case 'tab-o': registra('ha guardato: ' + ({ richieste: 'le richieste per la stanza', casa: 'la casa', incassi: 'gli incassi', vantaggi: 'i vantaggi', famiglia: 'il consenso' }[id] || id)); vai('ospita', { tabOspita: id }); break;
      case 'tab-i': vai('infermiere', { tabInf: id }); break;
      case 'categoria': S.filtri.tag = S.filtri.tag === id ? null : id; salva(); disegna(); break;
      case 'cerca': { const r = document.getElementById('risultati'); if (r) r.scrollIntoView({ behavior: 'smooth' }); break; }
      case 'scheda': chiudiFinestra(); vai('scheda', { scheda: id, provenienza: S.vista }); break;
      case 'indietro': vai(S.provenienza && S.provenienza !== 'scheda' ? S.provenienza : casaUtenza()); break;
      case 'apri-questionario': finestraQuestionario(); break;
      case 'invia-questionario': inviaQuestionario(); break;
      case 'chip': t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') !== 'true'); if (['q-segnali', 'q-cogn'].includes(t.dataset.gruppo)) aggiornaEsito('q'); break;
      case 'chiudi': chiudiFinestra(); break;
      case 'ritira': S.richieste = S.richieste.filter(r => r.id !== id); salva(); disegna(); avvisa('Richiesta ritirata.'); break;
      case 'conferma-sopralluogo': { const r = S.richieste.find(q => q.id === id); r.stato = 'sopralluogo'; salva(); disegna(); avvisa(`Sopralluogo confermato per il ${dataLunga(r.sopralluogo)}: ${inf(casa(r.casa).infermiere).nome} fa la valutazione d'ingresso.`); break; }
      case 'ospita-rifiuta': { const r = S.richieste.find(q => q.id === id); r.stato = 'rifiutata'; salva(); disegna(); avvisa('Risposta mandata.'); break; }
      case 'ospita-accetta': {
        const r = S.richieste.find(q => q.id === id), c = casa(r.casa);
        if (r.stato !== 'valutata') { avvisa('Serve prima la valutazione dell\'infermiere.'); break; }
        if (postiLiberi(c) < 1) { avvisa(`La casa ha già ${REGOLE.maxAbitanti} persone o nessuna stanza libera.`); break; }
        const n = Math.max(...S.case.flatMap(x => x.abitanti.map(y => Number(y.id.slice(2))))) + 1, daVedere = r.valutazione.cognitivo === 'Da approfondire';
        c.abitanti.push({ id: 'A-' + n, ruolo: 'coinquilino', nome: r.mia ? 'Giulio' : `Nuova persona (${r.id})`, ingresso: traGiorni(7), contratto: '3+2 a canone concordato', sesso: r.persona.sesso, eta: r.persona.eta, seguito: true, barthel: r.valutazione.barthel, abitudini: r.persona.abitudini, hobby: r.persona.hobby,
          cognitivi: r.persona.cognitivi, fase: daVedere ? 2 : 0, controllo: traMesi(isoData(OGGI), daVedere ? 1 : REGOLE.controlloMesi), pcc: false, ads: false });
        c.stanzeLibere = Math.max(0, c.stanzeLibere - 1); r.stato = 'accettata';
        salva(); disegna(); avvisa(`Richiesta ${r.id} accettata. Ora condividete nome e contratto; la persona entra fra quelle seguite da ${inf(c.infermiere).nome}.`); break;
      }
      case 'idoneita': { const c = casa(S.casaOspite); c.idoneita[id] = !c.idoneita[id]; salva(); disegna(); break; }
      case 'agibilita': { const c = casa(S.casaOspite); c.agibilita.dichiarata = !c.agibilita.dichiarata; salva(); disegna(); break; }
      case 'apri-valutazione': finestraValutazione(id); break;
      case 'salva-valutazione': salvaValutazione(id, t.dataset.esito === 'si'); break;
      case 'controllo': { const x = abitante(id); if (!x.a) break; x.a.controllo = traMesi(isoData(OGGI), x.a.fase >= 2 ? 3 : REGOLE.controlloMesi); salva(); disegna(); avvisa(`Controllo registrato. Il prossimo: ${dataLunga(x.a.controllo)}.`); break; }
      case 'pcc': { const x = abitante(id); if (!x.a) break; x.a.pcc = true; if (x.a.fase < 4) x.a.fase = 4; salva(); disegna(); avvisa('Pianificazione condivisa delle cure registrata, con il medico di famiglia.'); break; }
      case 'uscita': { const x = abitante(id); if (!x.a) break; x.a.fase = 5; salva(); disegna(); avvisa(`Avviata l'uscita accompagnata per ${x.a.id}: si cerca con la famiglia il servizio adatto, senza penale.`); break; }
      case 'apri-aiuto': finestraAiuto(id); break;
      case 'attiva-aiuto': attivaAiuto(id); break;
      case 'rinnova-aiuto': { const c = casa(id); if (!c.aiuto) break; c.aiuto.inizio = isoData(OGGI); salva(); disegna(); avvisa(`Nuova valutazione registrata: l'aiuto riparte per altri ${REGOLE.aiutoGiorniMax} giorni al massimo.`); break; }
      case 'chiudi-aiuto': { const c = casa(id); c.aiuto = null; salva(); disegna(); avvisa('Aiuto condiviso chiuso.'); break; }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { chiudiFinestra(); if (S.menuAperto) { S.menuAperto = false; disegnaNav(); } }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.gruppo[data-azione]')) e.target.click();
    if (e.key === 'Enter' && ['login-email', 'login-pw'].includes(e.target.id)) { const b = document.querySelector('[data-azione=login]'); if (b) b.click(); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.filtro === 'quartiere') { S.filtri.quartiere = t.value; salva(); disegna(); }
    else if (t.dataset.filtro === 'maxCanone') { S.filtri.maxCanone = Number(t.value); salva(); disegna(); }
    else if (t.dataset.filtro === 'tipo') { S.filtri.tipo = t.value; salva(); disegna(); }
    else if (t.dataset.azioneCambio === 'casa') { S.casaOspite = t.value; salva(); disegna(); }
    else if (t.dataset.azioneCambio === 'infermiere') { S.infermiere = t.value; salva(); disegna(); }
    else if (t.dataset.azioneCambio === 'residente') { S.residente = t.value; salva(); disegna(); }
    else if (t.dataset.azioneCambio === 'fase') { const x = abitante(t.dataset.id); if (x.a) { x.a.fase = Number(t.value); salva(); disegna(); } }
    else if (t.dataset.guidaIn) { const k = t.dataset.guidaIn; G[k] = k === 'casaC' ? t.value : Number(t.value); ridisegnaGuida(`.guida [data-guida-in="${k}"]`); }
    else if (t.dataset.barthel) { aggiornaEsito(t.dataset.barthel); }
  });
  // guida sotto il login: cursori dal vivo, suggerimenti sui grafici, tabella aperta o chiusa
  document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.guidaIn; if (k && k !== 'casaC') guidaDalVivo(k, Number(e.target.value)); });
  document.addEventListener('pointermove', e => { const el = e.target.closest && e.target.closest('.guida [data-tip]'); if (el) mostraTip(el, e.clientX, e.clientY); else nascondiTip(); });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('.guida [data-tip]'); if (el) { const r = el.getBoundingClientRect(); mostraTip(el, r.left + r.width / 2, r.top); } else nascondiTip(); });
  document.addEventListener('scroll', nascondiTip, { passive: true });
  document.addEventListener('toggle', e => { if (e.target.id === 'g-det') G.tabella = e.target.open; }, true);

  disegna();
})();
