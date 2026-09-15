/* Réemploi 74 — navigation, formulaires, suivi (prototype côté navigateur) */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const smooth = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';

  /* ---------- Configuration (config.js) ---------- */
  const CFG = window.R74_CONFIG || {};
  const ENDPOINT = (CFG.formEndpoint || '').trim();   // URL de réception des demandes (Formspree, Web3Forms, Brevo, votre API…)
  const PROD = !!ENDPOINT;                             // sans endpoint : mode démonstration (stockage dans le navigateur)
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

  /* ---------- Routage par ancre ---------- */
  const pages = $$('section.page');
  const navLinks = $$('nav.main a[href^="#/"]');
  let lastRoute = null;
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, query] = h.split('?');
    const params = new URLSearchParams(query || '');
    return { route: path || '', params };
  }
  function render() {
    // Une ancre interne (ex. #app du lien d'évitement) n'est pas une route : on ne change rien après le premier rendu
    if (lastRoute !== null && location.hash && !/^#\//.test(location.hash)) return;
    const { route, params } = parseHash();
    let found = false;
    pages.forEach(p => {
      const on = p.dataset.route === route;
      p.hidden = !on;
      if (on) found = true;
    });
    if (!found) { pages.forEach(p => { p.hidden = p.dataset.route !== ''; }); }
    const active = pages.find(p => !p.hidden);
    const effective = active ? active.dataset.route : '';
    document.title = (active && active.dataset.title ? active.dataset.title + ' — ' : '') + 'Réemploi 74';
    navLinks.forEach(a => {
      const r = a.getAttribute('href').replace(/^#\/?/, '').split('?')[0];
      if (r === effective && effective !== '') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const nav = $('nav.main'); if (nav) nav.classList.remove('open');
    const toggle = $('.nav-toggle'); if (toggle) toggle.setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'auto' });
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
    if (!target) return;
    ev.preventDefault();
    const wanted = (a.getAttribute('href') || '').replace(/^#\/?/, '');
    if (parseHash().route !== wanted) { location.hash = a.getAttribute('href'); }
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
      if (dossier.description) fd.append('description', dossier.description);
      if (dossier.souhait) fd.append('souhait', dossier.souhait);
      fd.append('_subject', 'Réemploi 74 — ' + (TYPE_LABEL[dossier.type] || dossier.type) + ' ' + dossier.code);
      if (CFG.formKey) fd.append('access_key', CFG.formKey);
      $$('input[type="file"]', form).forEach((inp, i) => { Array.from(inp.files || []).slice(0, 5).forEach((file, j) => { if (file.size <= MAX_PHOTO) fd.append('photo_' + i + '_' + j, file, file.name); }); });
      const ctrl = window.AbortController ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 20000);
      fetch(ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
        .then(r => { clearTimeout(timer); if (!r.ok) throw new Error('HTTP ' + r.status); finish(); })
        .catch(() => {
          clearTimeout(timer);
          const st = $('.form-status', form);
          if (st) st.textContent = "L'envoi a échoué. Réessayez dans un instant, ou écrivez-nous à " + (CFG.email || 'contact@reemploi74.fr') + ' en joignant la description de votre matériel.';
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
    $('#conf-suivi-link').setAttribute('href', '#/suivi?code=' + encodeURIComponent(d.code));
    const next = $('#conf-next');
    if (next) {
      if (d.type === 'vente') next.textContent = 'Vous recevrez une offre chiffrée sous 48 h ouvrées, valable 15 jours. Rien n\'est ' + (d.remise === 'depot' ? 'engagé' : 'enlevé') + ' avant votre accord.' + (d.remise === 'depot' ? ' Vous avez choisi le dépôt à l\'atelier : nous vous proposerons un rendez-vous avec l\'offre.' : '');
      else if (d.type === 'lot') next.textContent = 'Vous recevrez un devis d\'enlèvement sous 48 h ouvrées, avec la liste des documents fournis (bordereau, certificats, attestation).';
      else next.textContent = d.remise === 'depot' ? 'Nous vous proposons sous 48 h ouvrées un rendez-vous pour déposer votre matériel à l\'atelier.' : 'Nous vous proposons sous 48 h ouvrées un créneau d\'enlèvement dans les 10 jours.';
    }
    try { typo(box); } catch (e) {}
  }

  /* ---------- Suivi ---------- */
  function showSuivi(code, opts) {
    const out = $('#suivi-result');
    if (!out) return;
    const d = loadAll()[code];
    let html;
    if (!d) {
      html = '<div class="callout warn"><p><strong>Aucun dossier ne correspond à ce code.</strong> Vérifiez le code reçu par email (format R74-XXXXXX).' + (PROD ? ' Si le code est exact, écrivez-nous à ' + (CFG.email || 'contact@reemploi74.fr') + ' en le citant : nous vous répondons sous 48 h ouvrées.' : ' Sur ce site de démonstration, seuls les dossiers créés depuis ce navigateur sont retrouvés.') + '</p></div>';
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
    const target = '#/suivi?code=' + encodeURIComponent(code);
    try { history.replaceState(null, '', target); } catch (e) { location.hash = target; }
    showSuivi(code, { focus: true });
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  try { typo(document.body); } catch (e) { /* purement cosmétique */ }
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  render();
})();
