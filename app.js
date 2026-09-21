/* Réemploi 74 — navigation, formulaires, suivi (prototype côté navigateur) */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const smooth = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';

  /* ---------- Configuration (config.js) ---------- */
  const CFG = window.R74_CONFIG || {};
  const APP_URL = (CFG.appUrl || '').trim().replace(/\/+$/, '');                        // application Réemploi 74 (API, suivi, certificats)
  const ENDPOINT = (CFG.formEndpoint || '').trim() || (APP_URL ? APP_URL + '/api/demandes' : ''); // réception des demandes
  const PROD = !!ENDPOINT;                             // sans endpoint : mode démonstration (stockage dans le navigateur)
  const SUIVI_API = APP_URL ? APP_URL + '/api/suivi/' : ''; // suivi réel ; sans application : suivi limité à ce navigateur
  if (PROD) document.documentElement.classList.add('prod');

  /* ---------- Statuts d'un dossier ---------- */
  const STATUTS = {
    don: ['Demande reçue', 'Don confirmé', 'Enlèvement planifié', 'Matériel enlevé', 'Données effacées', 'Diagnostic terminé', 'Matériel remis en service'],
    vente: ['Demande reçue', 'Offre envoyée', 'Offre acceptée', 'Enlèvement planifié', 'Matériel enlevé', 'Données effacées', 'Diagnostic terminé', 'Virement effectué'],
    lot: ['Demande reçue', 'Devis envoyé', 'Devis accepté', 'Enlèvement planifié', 'Matériel enlevé', 'Données effacées', 'Diagnostic terminé', 'Certificats et bordereau envoyés'],
  };
  const STATUT_DETAIL = {
    'Demande reçue': 'Nous la lisons et vous répondons sous 48 h ouvrées.',
    'Don confirmé': 'Merci. Nous vous proposons une date d\'enlèvement dans les 10 jours, ou un rendez-vous à l\'atelier.',
    'Offre envoyée': 'Notre offre est dans votre boîte email. Vous avez 15 jours pour l\'accepter ou préférer le don.',
    'Devis envoyé': 'Le devis d\'enlèvement est dans votre boîte email, avec la répartition don / rachat proposée.',
    'Offre acceptée': 'C\'est noté. Nous vous proposons une date d\'enlèvement dans les 10 jours suivant votre acceptation.',
    'Devis accepté': 'C\'est noté. Nous vous proposons une date d\'enlèvement dans les 10 jours suivant votre acceptation.',
    'Enlèvement planifié': 'Rendez-vous fixé. Pensez à retirer cartes SIM, cartes mémoire et objets personnels ; les câbles sont les bienvenus.',
    'Matériel enlevé': 'Votre matériel est à l\'atelier. Chaque équipement porte une étiquette avec votre code.',
    'Données effacées': 'Tous les disques sont effacés (NIST 800-88). Vos certificats, un par disque, vous sont envoyés.',
    'Diagnostic terminé': 'Toutes les fonctions ont été testées. Si l\'état constaté diffère de votre déclaration, nous vous prévenons avant tout virement.',
    'Matériel remis en service': 'Le matériel est reparti vers un bénéficiaire du territoire. Votre attestation de cession et le bordereau sont disponibles.',
    'Virement effectué': 'Le virement est émis, sous 7 jours après le diagnostic.',
    'Certificats et bordereau envoyés': 'L\'ensemble des certificats et le bordereau de traçabilité vous ont été envoyés.',
  };
  const TYPE_LABEL = { don: 'Don', vente: 'Demande de rachat', lot: 'Lot entreprise / collectivité' };

  /* ---------- Stockage local (prototype) ---------- */
  const KEY = 'r74_dossiers';
  function loadAll() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function saveAll(obj) { try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* stockage indisponible : le suivi ne fonctionnera pas */ } }
  function genCode() {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    const arr = new Uint32Array(6);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr); else for (let i = 0; i < 6; i++) arr[i] = Math.floor(Math.random() * 1e9);
    for (let i = 0; i < 6; i++) s += alphabet[arr[i] % alphabet.length];
    return 'R74-' + s;
  }
  function normCode(v) { return (v || '').toUpperCase().replace(/\s+/g, '').replace(/^R74-?/, 'R74-'); }

  /* ---------- Typographie française (espaces insécables, apostrophes) ---------- */
  function typo(root) {
    const NBSP = ' ', NNBSP = ' ';
    const skip = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, INPUT: 1, KBD: 1 };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        let p = n.parentNode;
        while (p && p !== root) { if (skip[p.nodeName] || (p.classList && p.classList.contains('no-typo'))) return NodeFilter.FILTER_REJECT; p = p.parentNode; }
        return /[:;?!«»'\d]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      let s = n.nodeValue;
      s = s.replace(/(\S)'/g, '$1’');
      s = s.replace(/ ([;?!])/g, NNBSP + '$1');
      s = s.replace(/ :/g, NBSP + ':');
      s = s.replace(/« /g, '«' + NBSP).replace(/ »/g, NBSP + '»');
      s = s.replace(/(\d) (\d{3})(?!\d)/g, '$1' + NNBSP + '$2');
      s = s.replace(/(\d) (€|%|h\b|j\b|W\b|kg\b|To\b|Go\b|Mo\b|kWh\b|km\b|ans\b|mois\b|jours\b|pouces\b|min\b)/g, '$1' + NBSP + '$2');
      s = s.replace(/(\d) × (\d)/g, '$1' + NBSP + '×' + NBSP + '$2');
      if (s !== n.nodeValue) n.nodeValue = s;
    });
  }

  /* ---------- Routage ----------
   * Deux modes : aperçu mono-page (toutes les rubriques dans une page, ancres #/rubrique)
   * ou site publié (une page HTML par rubrique, <body data-page="rubrique">, liens rubrique.html). */
  const MULTI = !!(document.body && document.body.dataset && document.body.dataset.page !== undefined);
  const DEFAULT_ROUTE = MULTI ? (document.body.dataset.page || '') : '';
  const pageFor = route => (route === '' ? 'index.html' : route + '.html');
  const routeUrl = (route, query) => (MULTI ? pageFor(route) + (query ? '?' + query : '') : '#/' + route + (query ? '?' + query : ''));
  const hrefRoute = href => { const h = href || ''; if (/^#\//.test(h)) return h.replace(/^#\//, '').split('?')[0]; const m = h.match(/([a-z0-9-]+)\.html/i); return m ? (m[1] === 'index' ? '' : m[1]) : null; };
  const pages = $$('section.page');
  const navLinks = $$('nav.main a[href]').filter(a => hrefRoute(a.getAttribute('href')) !== null);
  let lastRoute = null;
  function parseHash() {
    const raw = location.hash;
    if (!raw || !/^#\//.test(raw)) return { route: DEFAULT_ROUTE, params: new URLSearchParams(MULTI ? location.search : '') };
    const [path, query] = raw.replace(/^#\//, '').split('?');
    return { route: path || DEFAULT_ROUTE, params: new URLSearchParams(query || '') };
  }
  function render() {
    // Une ancre interne (ex. #app du lien d'évitement, #lot) n'est pas une route : on ne change rien après le premier rendu
    if (lastRoute !== null && location.hash && !/^#\//.test(location.hash)) return;
    const { route, params } = parseHash();
    let found = false;
    pages.forEach(p => {
      const on = p.dataset.route === route;
      p.hidden = !on;
      if (on) found = true;
    });
    if (!found) {
      // Site publié : la rubrique est une autre page
      if (MULTI && route !== DEFAULT_ROUTE) { location.replace(routeUrl(route === 'confirmation' ? '' : route, params.toString())); return; }
      pages.forEach(p => { p.hidden = p.dataset.route !== DEFAULT_ROUTE; });
    }
    const active = pages.find(p => !p.hidden);
    const effective = active ? active.dataset.route : DEFAULT_ROUTE;
    document.title = (active && active.dataset.title ? active.dataset.title + ' — ' : '') + 'Réemploi 74';
    navLinks.forEach(a => {
      const r = hrefRoute(a.getAttribute('href'));
      if (r === effective && effective !== '') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const nav = $('nav.main'); if (nav) nav.classList.remove('open');
    const toggle = $('.nav-toggle'); if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (lastRoute !== null) window.scrollTo({ top: 0, behavior: 'auto' }); // au chargement, laisser le navigateur gérer une éventuelle ancre (#lot)
    if (lastRoute !== null && lastRoute !== effective) {
      const h1 = active && $('h1', active);
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    }
    lastRoute = effective;
    if (effective === 'suivi') {
      const code = params.get('code');
      const input = $('#suivi-code');
      if (code && input) { input.value = normCode(code); showSuivi(normCode(code), { focus: false }); }
    }
    if (effective === 'confirmation') renderConfirmation();
  }
  window.addEventListener('hashchange', render);

  /* ---------- Lien d'évitement ---------- */
  const skip = $('.skip');
  if (skip) skip.addEventListener('click', ev => {
    ev.preventDefault();
    const m = $('#app');
    if (m) { m.focus({ preventScroll: true }); m.scrollIntoView({ block: 'start' }); }
  });

  /* ---------- Menu mobile ---------- */
  const toggle = $('.nav-toggle');
  if (toggle) toggle.addEventListener('click', () => {
    const nav = $('nav.main');
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { const nav = $('nav.main'); if (nav && nav.classList.contains('open')) { nav.classList.remove('open'); if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); } } }
  });

  /* ---------- Ancres internes à une page (ex. « Déclarer un lot ») ---------- */
  document.addEventListener('click', ev => {
    const a = ev.target.closest('[data-scroll]');
    if (!a) return;
    const target = document.getElementById(a.dataset.scroll);
    if (!target) return; // la cible est sur une autre page : navigation normale
    ev.preventDefault();
    const wanted = hrefRoute(a.getAttribute('href'));
    if (!MULTI && wanted !== null && parseHash().route !== wanted) { location.hash = a.getAttribute('href'); }
    setTimeout(() => { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); target.scrollIntoView({ behavior: smooth(), block: 'start' }); }, 60);
  });

  /* ---------- Formulaires ---------- */
  const MAX_PHOTO = 10 * 1024 * 1024;
  let uid = 0;

  // Rattache aides et messages d'erreur à leur champ (aria-describedby)
  function describe(root) {
    $$('.field, .check', root).forEach(f => {
      const ctl = $('input, select, textarea', f); if (!ctl) return;
      const ids = [];
      $$(':scope > .hint, :scope > .err', f).forEach(el => { if (!el.id) el.id = 'd' + (++uid); ids.push(el.id); });
      if (ids.length) ctl.setAttribute('aria-describedby', ids.join(' '));
    });
  }

  function addEquip(form, focusNew) {
    const list = $('.equip-list', form);
    const tpl = $('#equip-tpl');
    if (!list || !tpl) return;
    const node = tpl.content.firstElementChild.cloneNode(true);
    $$('[data-name]', node).forEach(el => {
      const id = form.dataset.type + '-' + el.dataset.name + '-' + (++uid);
      el.id = id;
      const lab = el.closest('.field') && $('label', el.closest('.field'));
      if (lab) lab.setAttribute('for', id);
    });
    const rm = $('.remove', node);
    if (rm) rm.addEventListener('click', () => { const add = $('.add-equip', form); node.remove(); renumber(form); updateRemise(form); if (add) add.focus(); });
    const file = $('input[type="file"]', node);
    if (file) file.addEventListener('change', () => previewPhotos(file));
    const qty = $('[data-name="quantite"]', node);
    if (qty) qty.addEventListener('input', () => updateRemise(form));
    list.appendChild(node);
    describe(node);
    try { typo(node); } catch (e) {}
    renumber(form);
    updateRemise(form);
    if (focusNew) { const first = $('select, input', node); if (first) first.focus(); }
  }
  function renumber(form) {
    $$('.equip', form).forEach((e, i) => {
      $('.equip-num', e).textContent = 'Équipement ' + (i + 1);
      const rm = $('.remove', e); if (rm) { rm.hidden = i === 0; rm.setAttribute('aria-label', 'Retirer l\'équipement ' + (i + 1)); }
    });
  }
  function previewPhotos(input) {
    const box = input.closest('.photos');
    const thumbs = $('.thumbs', box);
    const field = box.closest('.field');
    const err = field && $('.err', field);
    thumbs.innerHTML = '';
    let tooBig = false;
    Array.from(input.files || []).slice(0, 5).forEach(f => {
      if (f.size > MAX_PHOTO) { tooBig = true; return; }
      if (!/^image\//.test(f.type)) return;
      const img = document.createElement('img');
      img.alt = '';
      const reader = new FileReader();
      reader.onload = e => { img.src = e.target.result; };
      reader.readAsDataURL(f);
      thumbs.appendChild(img);
    });
    if (field) field.classList.toggle('invalid', tooBig);
    if (err) err.textContent = tooBig ? 'Une photo dépasse 10 Mo. Réduisez-la ou choisissez-en une autre.' : '';
    if (tooBig) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  // Mode de remise : enlèvement à partir de 3 équipements, sinon dépôt à l'atelier
  function totalQty(form) { return $$('.equip [data-name="quantite"]', form).reduce((n, i) => n + (parseInt(i.value, 10) || 0), 0); }
  function updateRemise(form) {
    const box = $('.remise', form); if (!box) return;
    const total = totalQty(form);
    const enl = $('input[value="enlevement"]', box), dep = $('input[value="depot"]', box);
    const why = $('.why', box);
    if (total < 3) {
      if (enl) { enl.disabled = true; enl.checked = false; }
      if (dep) dep.checked = true;
      if (why) why.textContent = 'Pour ' + (total || 'moins de 3') + ' équipement' + (total > 1 ? 's' : '') + ', nous vous proposons un dépôt à l\'atelier sur rendez-vous ; l\'enlèvement à domicile commence à 3 équipements.';
    } else {
      if (enl) { enl.disabled = false; if (!dep.checked && !enl.checked) enl.checked = true; }
      if (why) why.textContent = '';
    }
    applyRemise(form);
  }
  function applyRemise(form) {
    const dep = $('.remise input[value="depot"]', form);
    const depot = !!(dep && dep.checked);
    const addr = $('.adresse-bloc', form);
    if (addr) addr.hidden = depot;
    ['adresse', 'cp', 'ville'].forEach(n => { const el = $('[name="' + n + '"]', form); if (el) el.required = !depot; });
  }

  function setInvalid(el, msg) {
    const box = el.closest('.field') || el.closest('.check');
    if (!box) return;
    box.classList.add('invalid');
    el.setAttribute('aria-invalid', 'true');
    const err = $('.err', box);
    if (err && msg) err.textContent = msg;
  }
  function clearInvalid(form) {
    $$('.invalid', form).forEach(f => f.classList.remove('invalid'));
    $$('[aria-invalid]', form).forEach(el => el.removeAttribute('aria-invalid'));
    const st = $('.form-status', form); if (st) st.textContent = '';
  }

  function validate(form) {
    clearInvalid(form);
    let first = null, count = 0;
    const mark = (el, msg) => { if (!el) return; setInvalid(el, msg); count++; if (!first) first = el; };
    $$('[required]', form).forEach(el => {
      if (el.closest('[hidden]')) return;
      if (el.type === 'checkbox') { if (!el.checked) mark(el, 'Cette case est obligatoire.'); return; }
      if (!String(el.value || '').trim()) mark(el, 'Ce champ est nécessaire pour traiter votre demande.');
    });
    const email = $('input[type="email"]', form);
    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value)) mark(email, 'Cette adresse email ne semble pas valide. Vérifiez l\'orthographe, par exemple prenom@exemple.fr.');
    const cp = $('input[name="cp"]', form);
    if (cp && cp.required && cp.value && !/^7[34]\d{3}$/.test(cp.value.trim())) mark(cp, 'Ce code postal est en dehors de notre zone d\'enlèvement (Savoie et Haute-Savoie). Pour un lot important ou un dépôt à l\'atelier, écrivez-nous.');
    const tel = $('input[type="tel"]', form);
    if (tel && tel.value && tel.value.replace(/\D/g, '').length < 9) mark(tel, 'Ce numéro semble incomplet.');
    if (form.dataset.type === 'lot') {
      const total = $$('input[name^="lot_qty_"]', form).reduce((n, i) => n + (parseInt(i.value, 10) || 0), 0);
      if (total < 1) mark($('input[name^="lot_qty_"]', form), 'Indiquez au moins un équipement.');
    } else {
      const equips = $$('.equip', form);
      const etatDe = e => ($('[data-name="etat"]', e) || {}).value || '';
      const fonctionnels = equips.filter(e => etatDe(e) !== 'Ne s\'allume plus');
      if (equips.length && !fonctionnels.length) mark($('[data-name="etat"]', equips[0]), 'Nous ne collectons pas de matériel hors service seul : il relève de la déchèterie ou d\'un éco-organisme. Ajoutez au moins un équipement qui fonctionne.');
      equips.forEach(e => { if (etatDe(e) === 'Fonctionne avec un défaut' && !($('[data-name="description"]', e) || { value: '' }).value.trim()) mark($('[data-name="description"]', e), 'Décrivez le défaut en quelques mots.'); });
    }
    if (first) {
      const st = $('.form-status', form);
      if (st) st.textContent = 'Le formulaire contient ' + count + (count > 1 ? ' erreurs' : ' erreur') + '. Corrigez les champs signalés.';
      first.focus({ preventScroll: true }); first.scrollIntoView({ block: 'center', behavior: smooth() });
      return false;
    }
    return true;
  }

  function collect(form) {
    const type = form.dataset.type;
    const data = { type, date: new Date().toISOString(), equipements: [], contact: {} };
    ['nom', 'email', 'tel', 'adresse', 'cp', 'ville', 'organisation', 'fonction', 'echeance'].forEach(n => { const el = $('[name="' + n + '"]', form); if (el) data.contact[n] = el.value; });
    const ent = $('[name="entreprise"]', form); data.contact.entreprise = !!(ent && ent.checked);
    ['disque', 'dpa'].forEach(n => { const el = $('[name="' + n + '"]', form); if (el) data[n] = !!el.checked; });
    const rem = $('.remise input:checked', form); data.remise = rem ? rem.value : 'enlevement';
    if (type === 'lot') {
      $$('input[name^="lot_qty_"]', form).forEach(i => { const q = parseInt(i.value, 10) || 0; if (q > 0) data.equipements.push({ categorie: i.dataset.cat, quantite: q }); });
      const etat = $('[name="lot_etat"]', form); data.etat_global = etat ? etat.value : '';
      const souhait = $('[name="lot_souhait"]', form); data.souhait = souhait ? souhait.value : '';
      const desc = $('[name="description"]', form); data.description = desc ? desc.value : '';
      const inv = $('#lot-inv', form); data.inventaire = !!(inv && inv.files && inv.files.length);
      const ph = $('.photos input[type="file"]', form); data.photos = ph && ph.files ? ph.files.length : 0;
      data.remise = 'enlevement';
    } else {
      $$('.equip', form).forEach(e => {
        const g = n => { const el = $('[data-name="' + n + '"]', e); return el ? el.value : ''; };
        data.equipements.push({ categorie: g('categorie'), quantite: parseInt(g('quantite'), 10) || 1, etat: g('etat'), marque: g('marque'), modele: g('modele'), annee: g('annee'), config: g('config'), serie: g('serie'), description: g('description'), photos: ($('input[type="file"]', e) || { files: [] }).files.length });
      });
    }
    data.count = data.equipements.reduce((n, e) => n + (e.quantite || 1), 0);
    return data;
  }

  $$('form.demande').forEach(form => {
    describe(form);
    if (form.dataset.type !== 'lot') addEquip(form, false);
    const add = $('.add-equip', form);
    if (add) add.addEventListener('click', () => addEquip(form, true));
    $$('.remise input', form).forEach(r => r.addEventListener('change', () => applyRemise(form)));
    $$('.photos input[type="file"]', form).forEach(f => { if (!f.closest('.equip')) f.addEventListener('change', () => previewPhotos(f)); });
    // le champ redevient neutre dès que l'utilisateur le corrige
    form.addEventListener('input', ev => { const box = ev.target.closest('.field, .check'); if (box) { box.classList.remove('invalid'); ev.target.removeAttribute('aria-invalid'); } });
    form.addEventListener('change', ev => { const box = ev.target.closest('.field, .check'); if (box && (ev.target.type !== 'checkbox' || ev.target.checked)) { box.classList.remove('invalid'); ev.target.removeAttribute('aria-invalid'); } });
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      if (!validate(form)) return;
      const dossier = collect(form);
      dossier.code = genCode();
      dossier.statut = 0;
      const finish = () => {
        const all = loadAll(); all[dossier.code] = dossier; saveAll(all);
        try { sessionStorage.setItem('r74_last', dossier.code); } catch (e) {}
        form.reset();
        $$('.thumbs', form).forEach(t => { t.innerHTML = ''; });
        if (form.dataset.type !== 'lot') { const list = $('.equip-list', form); list.innerHTML = ''; addEquip(form, false); }
        location.hash = '#/confirmation';
      };
      if (!PROD) { finish(); return; }
      const btn = $('button[type="submit"]', form); const label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Envoi en cours…'; }
      const fd = new FormData();
      fd.append('code', dossier.code); fd.append('type', dossier.type); fd.append('remise', dossier.remise || '');
      Object.keys(dossier.contact).forEach(k => fd.append(k, dossier.contact[k] == null ? '' : String(dossier.contact[k])));
      fd.append('equipements', JSON.stringify(dossier.equipements));
      fd.append('disque', dossier.disque ? 'oui' : 'non'); fd.append('dpa', dossier.dpa ? 'oui' : 'non');
      fd.append('consentement', 'oui'); // la case est obligatoire (validate) : l'envoi vaut consentement explicite
      if (dossier.description) fd.append('description', dossier.description);
      if (dossier.type === 'lot') { fd.append('etat_global', dossier.etat_global || ''); fd.append('souhait', dossier.souhait || ''); }
      fd.append('_subject', 'Réemploi 74 — ' + (TYPE_LABEL[dossier.type] || dossier.type) + ' ' + dossier.code);
      if (CFG.formKey) fd.append('access_key', CFG.formKey);
      $$('input[type="file"]', form).forEach((inp, i) => { Array.from(inp.files || []).slice(0, 5).forEach((file, j) => { if (file.size <= MAX_PHOTO) fd.append('photo_' + i + '_' + j, file, file.name); }); });
      const ctrl = window.AbortController ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 60000); // les photos peuvent peser plusieurs dizaines de Mo
      const st = $('.form-status', form);
      if (st) st.textContent = '';
      fetch(ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
        .then(r => r.json().catch(() => ({})).then(body => ({ ok: r.ok, status: r.status, body: body || {} })))
        .then(rep => {
          clearTimeout(timer);
          if (!rep.ok) throw Object.assign(new Error('HTTP ' + rep.status), { status: rep.status, body: rep.body });
          // L'application génère le code de suivi (celui du navigateur n'est qu'un brouillon) : c'est
          // ce code, repris dans l'email de confirmation, qu'il faut afficher.
          if (typeof rep.body.code === 'string' && /^R74-[A-Z0-9]{6}$/.test(rep.body.code)) dossier.code = rep.body.code;
          finish();
        })
        .catch(err => {
          clearTimeout(timer);
          if (!st) return;
          const body = (err && err.body) || {};
          const erreurs = body.erreurs && typeof body.erreurs === 'object' ? Object.keys(body.erreurs).map(k => body.erreurs[k]).filter(m => typeof m === 'string' && m) : [];
          if (erreurs.length) st.textContent = 'La demande n\'a pas pu être enregistrée : ' + erreurs.join(' ') + ' Corrigez puis renvoyez le formulaire.';
          else if (err && err.status === 429) st.textContent = body.message || 'Trop de demandes envoyées depuis votre connexion. Patientez quelques minutes avant de réessayer.';
          else if (err && err.status === 413) st.textContent = 'Les photos jointes sont trop volumineuses pour un seul envoi. Retirez-en quelques-unes, ou envoyez-les ensuite par email en citant votre code.';
          else st.textContent = "L'envoi a échoué. Réessayez dans un instant, ou écrivez-nous à " + (CFG.email || 'nathan@reemploi74.fr') + ' en joignant la description de votre matériel.';
        })
        .finally(() => { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  });

  /* ---------- Confirmation ---------- */
  function renderConfirmation() {
    let code = '';
    try { code = sessionStorage.getItem('r74_last') || ''; } catch (e) {}
    const d = loadAll()[code];
    const box = $('#conf-box');
    if (!box) return;
    if (!d) { box.hidden = true; $('#conf-empty').hidden = false; return; }
    box.hidden = false; $('#conf-empty').hidden = true;
    $('#conf-code').textContent = d.code;
    $('#conf-type').textContent = TYPE_LABEL[d.type] || d.type;
    $('#conf-count').textContent = d.count + (d.count > 1 ? ' équipements' : ' équipement');
    $('#conf-suivi-link').setAttribute('href', routeUrl('suivi', 'code=' + encodeURIComponent(d.code)));
    const next = $('#conf-next');
    if (next) {
      if (d.type === 'vente') next.textContent = 'Vous recevrez une offre chiffrée sous 48 h ouvrées, valable 15 jours. Rien n\'est ' + (d.remise === 'depot' ? 'engagé' : 'enlevé') + ' avant votre accord.' + (d.remise === 'depot' ? ' Vous avez choisi le dépôt à l\'atelier : nous vous proposerons un rendez-vous avec l\'offre.' : '');
      else if (d.type === 'lot') next.textContent = 'Vous recevrez un devis d\'enlèvement sous 48 h ouvrées, avec la liste des documents fournis (bordereau, certificats, attestation).';
      else next.textContent = d.remise === 'depot' ? 'Nous vous proposons sous 48 h ouvrées un rendez-vous pour déposer votre matériel à l\'atelier.' : 'Nous vous proposons sous 48 h ouvrées un créneau d\'enlèvement dans les 10 jours.';
    }
    try { typo(box); } catch (e) {}
  }

  /* ---------- Suivi (production : vue publique renvoyée par l'application) ---------- */
  const ETAPE_CLASSE = { faite: 'done', en_cours: 'current', terminale: 'terminal', a_venir: '' };
  function pluriel(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }
  function focusSuivi(out, opts) {
    if (opts && opts.focus === false) return;
    const target = $('h3', out) || $('.callout', out);
    if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }
  function lienApp(chemin) { return APP_URL + chemin; }
  function renderOffreApi(v) {
    const o = v.offre;
    if (!o) return '';
    const titre = v.estLot ? 'Devis' : (o.revisee ? 'Offre révisée après diagnostic' : 'Offre de rachat');
    const statut = (o.expiree && o.statut === 'ENVOYEE') ? 'Délai de réponse dépassé' : (o.reputeeRefusee ? 'Réputée refusée' : o.statutLibelle);
    let h = '<div class="card offre-suivi"><p class="eyebrow copper">' + escapeHtml(titre) + '</p><p class="montant"><strong>' + escapeHtml(o.montant) + '</strong> <span class="chip">' + escapeHtml(statut) + '</span></p>';
    if (o.revisee && o.motifRevision) h += '<p class="small"><span class="muted">Ce que le diagnostic a révélé : </span>' + escapeHtml(o.motifRevision) + '</p>';
    if (o.statut === 'ENVOYEE' && o.valideJusquAuLibelle) h += '<p class="small muted">' + (o.expiree ? 'Délai de réponse dépassé le ' : 'Vous avez jusqu\'au ') + escapeHtml(o.valideJusquAuLibelle) + (o.expiree ? '.' : ' pour répondre.') + '</p>';
    if (o.statut === 'EXPIREE') h += '<div class="callout warn"><p>Cette offre a atteint sa date limite sans réponse : elle n\'est plus valable et rien n\'a été enlevé. Pour une nouvelle proposition, écrivez-nous en citant votre code de suivi.</p></div>';
    if (o.restitutionJusquAuLibelle) h += '<div class="callout warn"><p><strong>Votre matériel vous attend à l\'atelier.</strong> ' + (o.reputeeRefusee ? 'L\'offre révisée est restée sans réponse dans le délai : elle est réputée refusée. ' : 'Vous avez refusé l\'offre révisée : c\'est noté. ') + 'Votre matériel, données effacées, reste votre propriété. Il est tenu à votre disposition à l\'atelier de Cluses jusqu\'au ' + escapeHtml(o.restitutionJusquAuLibelle) + ' : écrivez-nous ou appelez-nous pour convenir d\'un rendez-vous de restitution, sans frais.</p></div>';
    if (o.peutAccepter || o.peutRefuser || o.peutConvertirEnDon) {
      h += '<p class="small muted">' + (o.revisee ? 'Vous pouvez accepter l\'offre révisée, la refuser (nous vous restituons alors le matériel, données effacées, sans frais) ou choisir le don.' : 'Vous restez libre de l\'accepter, de la refuser ou de choisir le don. Rien n\'est enlevé avant votre accord.') + '</p>';
      h += '<div class="btn-row"><a class="btn primary" href="' + escapeHtml(lienApp('/suivi/' + encodeURIComponent(v.code))) + '">Répondre à l\'offre</a></div>';
    }
    return h + '</div>';
  }
  function renderEquipementsApi(v) {
    const groupes = {};
    const ordre = [];
    (v.equipements || []).forEach(e => {
      const k = [e.type, e.marque || '', e.modele || '', e.statut].join('|');
      if (!groupes[k]) { groupes[k] = { type: e.typeLibelle, marque: e.marque, modele: e.modele, statut: e.statutLibelle, n: 0, certificats: [] }; ordre.push(k); }
      groupes[k].n += 1;
      (e.certificats || []).forEach(c => groupes[k].certificats.push(c));
    });
    if (!ordre.length) return '';
    let h = '<div class="card"><p class="eyebrow">Équipements</p><div class="table-wrap"><table class="no-typo"><thead><tr><th class="n">Qté</th><th>Type</th><th>Marque et modèle</th><th>Statut</th><th>Certificat d\'effacement</th></tr></thead><tbody>';
    ordre.forEach(k => {
      const g = groupes[k];
      const certs = g.certificats.length ? g.certificats.map(c => c.pdf ? '<a href="' + escapeHtml(lienApp(c.pdf)) + '" title="Télécharger le certificat (PDF)">' + escapeHtml(c.numero) + '</a>' : escapeHtml(c.numero)).join(', ') : '—';
      h += '<tr><td class="n">' + g.n + '</td><td>' + escapeHtml(g.type) + '</td><td class="muted">' + escapeHtml([g.marque, g.modele].filter(Boolean).join(' ') || '—') + '</td><td>' + escapeHtml(g.statut) + '</td><td class="mono small">' + certs + '</td></tr>';
    });
    return h + '</tbody></table></div></div>';
  }
  function renderDossierApi(v) {
    let h = '<div class="card"><p class="eyebrow">Dossier <span class="no-typo mono">' + escapeHtml(v.code) + '</span></p><h3>' + escapeHtml(v.voieLibelle) + ' · ' + pluriel(v.nombreEquipements || 0, 'équipement') + '</h3>';
    h += '<p class="muted small">Déclaré le ' + escapeHtml(v.deposeLeLibelle || '') + (v.modeRemiseLibelle ? ' · ' + escapeHtml(v.modeRemiseLibelle) : '') + (v.convertiEnDonLe ? ' · demande de rachat convertie en don' : '') + '</p>';
    h += '<ol class="timeline">';
    (v.frise || []).forEach(s => {
      const cls = ETAPE_CLASSE[s.etat] || '';
      h += '<li class="' + cls + '"' + (s.etat === 'en_cours' ? ' aria-current="step"' : '') + '><div class="t">' + escapeHtml(s.libelle) + '</div>' + (s.detail ? '<div class="d">' + escapeHtml(s.detail) + '</div>' : (s.etat === 'faite' ? '<div class="d">Terminé</div>' : '')) + '</li>';
    });
    h += '</ol></div>';
    return h + renderOffreApi(v) + renderEquipementsApi(v);
  }
  function showSuiviApi(code, opts) {
    const out = $('#suivi-result');
    out.innerHTML = '<p class="muted" role="status">Recherche du dossier…</p>';
    const ctrl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 15000);
    const contact = ' Si le code est exact, écrivez-nous à ' + (CFG.email || 'nathan@reemploi74.fr') + ' en le citant : nous vous répondons sous 48 h ouvrées.';
    fetch(SUIVI_API + encodeURIComponent(code), { headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
      .then(r => r.json().catch(() => ({})).then(body => ({ ok: r.ok, status: r.status, body: body || {} })))
      .then(rep => {
        clearTimeout(timer);
        if (rep.ok && rep.body && rep.body.code) { out.innerHTML = renderDossierApi(rep.body); return; }
        if (rep.status === 404) out.innerHTML = '<div class="callout warn"><p><strong>Aucun dossier ne correspond à ce code.</strong> Vérifiez le code reçu par email (format R74-XXXXXX).' + contact + '</p></div>';
        else if (rep.status === 429) out.innerHTML = '<div class="callout warn"><p>' + escapeHtml(rep.body.message || 'Trop de tentatives. Patientez quelques minutes avant de réessayer.') + '</p></div>';
        else throw new Error('HTTP ' + rep.status);
      })
      .catch(() => {
        clearTimeout(timer);
        out.innerHTML = '<div class="callout warn"><p><strong>Le suivi est momentanément indisponible.</strong> Réessayez dans un instant.' + contact + '</p></div>';
      })
      .finally(() => { try { typo(out); } catch (e) {} focusSuivi(out, opts); });
  }

  /* ---------- Suivi ---------- */
  function showSuivi(code, opts) {
    const out = $('#suivi-result');
    if (!out) return;
    if (SUIVI_API) { showSuiviApi(code, opts); return; }
    const d = loadAll()[code];
    let html;
    if (!d) {
      html = '<div class="callout warn"><p><strong>Aucun dossier ne correspond à ce code.</strong> Vérifiez le code reçu par email (format R74-XXXXXX).' + (PROD ? ' Si le code est exact, écrivez-nous à ' + (CFG.email || 'nathan@reemploi74.fr') + ' en le citant : nous vous répondons sous 48 h ouvrées.' : ' Sur ce site de démonstration, seuls les dossiers créés depuis ce navigateur sont retrouvés.') + '</p></div>';
    } else {
      const steps = STATUTS[d.type] || STATUTS.don;
      const fmt = new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      html = '<div class="card"><p class="eyebrow">Dossier ' + d.code + '</p><h3>' + (TYPE_LABEL[d.type] || d.type) + ' · ' + d.count + (d.count > 1 ? ' équipements' : ' équipement') + '</h3><p class="muted small">Déclaré le ' + fmt + (d.contact && d.contact.ville ? ' · ' + escapeHtml(d.contact.ville) : '') + (d.remise === 'depot' ? ' · dépôt à l\'atelier' : '') + '</p><ol class="timeline">';
      steps.forEach((s, i) => {
        const cls = i < d.statut ? 'done' : i === d.statut ? 'current' : '';
        html += '<li class="' + cls + '"><div class="t">' + s + '</div>' + (i === d.statut ? '<div class="d">' + (STATUT_DETAIL[s] || 'Étape en cours') + '</div>' : i < d.statut ? '<div class="d">Terminé</div>' : '') + '</li>';
      });
      html += '</ol>' + (PROD ? '' : '<p class="small"><button type="button" class="btn ghost small" id="suivi-demo-next">Simuler l\'étape suivante (démonstration)</button></p>') + '</div>';
    }
    out.innerHTML = html;
    try { typo(out); } catch (e) {}
    const b = $('#suivi-demo-next');
    if (b) b.addEventListener('click', () => {
      const all = loadAll();
      const steps = STATUTS[all[code] ? all[code].type : 'don'] || STATUTS.don;
      if (all[code] && all[code].statut < steps.length - 1) { all[code].statut += 1; saveAll(all); showSuivi(code, { focus: false }); const nb = $('#suivi-demo-next'); if (nb) nb.focus(); }
    });
    if (!opts || opts.focus !== false) {
      const target = $('h3', out) || $('.callout', out);
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  }
  const sf = $('#suivi-form');
  if (sf) sf.addEventListener('submit', ev => {
    ev.preventDefault();
    const code = normCode($('#suivi-code').value);
    const target = MULTI ? '?code=' + encodeURIComponent(code) : '#/suivi?code=' + encodeURIComponent(code);
    try { history.replaceState(null, '', target); } catch (e) { if (!MULTI) location.hash = target; }
    showSuivi(code, { focus: true });
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  try { typo(document.body); } catch (e) { /* purement cosmétique */ }
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  render();
  // Site publié : une ancre de page (#lot) doit rester atteignable après le rendu
  if (MULTI && location.hash && !/^#\//.test(location.hash)) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 80);
  }
})();
