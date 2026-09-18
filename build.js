// Réemploi 74 — génère le site publiable : une page HTML par rubrique, sitemap, données structurées.
// Usage : node build.js            (source : src/index.html + src/{styles.css,app.js,config.js} ; photos dans img/)
//         SITE_URL=https://reemploi74.fr node build.js   pour changer l'adresse canonique
const fs = require('fs');
const path = require('path');

const SITE_URL = (process.env.SITE_URL || 'https://nathan020430-prog.github.io/reemploi74-site').replace(/\/$/, '');
const src = path.join(__dirname, 'src');
const out = __dirname;
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');

/* ---------- découpage de la source ---------- */
const headEnd = html.indexOf('<a class="skip"');
const headSrc = html.slice(0, headEnd);                       // <title>, meta description, polices, css
const mainStart = html.indexOf('<main id="app"');
const mainOpenEnd = html.indexOf('>', mainStart) + 1;
const mainClose = html.lastIndexOf('</main>');
const before = html.slice(headEnd, mainOpenEnd);              // skip link + header + <main …>
const inner = html.slice(mainOpenEnd, mainClose);             // sections + template
const after = html.slice(mainClose);                          // </main> + footer + scripts

const tplStart = inner.indexOf('<!-- Gabarit d\'un équipement');
const tplEnd = inner.indexOf('</template>') + '</template>'.length;
const template = inner.slice(tplStart, tplEnd);
const innerNoTpl = inner.slice(0, tplStart) + inner.slice(tplEnd);

const sections = {};
const re = /<section class="page" data-route="([^"]*)" data-title="([^"]*)"( hidden)?>([\s\S]*?)<\/section>\s*(?=<!-- =+|<section class="page"|$)/g;
let m;
while ((m = re.exec(innerNoTpl))) sections[m[1]] = { route: m[1], title: m[2], body: m[4] };
const routes = Object.keys(sections);
if (routes.length < 15) throw new Error('sections trouvées : ' + routes.join(', '));

/* ---------- métadonnées par page ---------- */
const META = {
  '': { file: 'index.html', title: 'Réemploi 74 — Don ou rachat de matériel informatique en Savoie et Haute-Savoie', desc: 'Donnez ou vendez vos ordinateurs, écrans et téléphones en Savoie et Haute-Savoie. Enlèvement gratuit dès 3 équipements, effacement certifié des données, matériel remis en service localement.', priority: '1.0' },
  donner: { desc: 'Donnez votre matériel informatique en Savoie et Haute-Savoie : enlèvement gratuit dès 3 équipements ou dépôt à l\'atelier, effacement certifié, remise en service locale vers écoles, associations et foyers.', priority: '0.9' },
  vendre: { desc: 'Vendez votre ordinateur, écran ou smartphone en Savoie et Haute-Savoie : grille de rachat indicative, offre sous 48 h ouvrées, enlèvement gratuit, virement sous 7 jours après diagnostic.', priority: '0.9' },
  entreprises: { desc: 'Renouvellement de parc informatique en Savoie et Haute-Savoie : enlèvement gratuit, inventaire par numéro de série, certificat d\'effacement par disque, bordereau signé, devis pour les lots, réemploi comptabilisable (loi AGEC).', priority: '0.9' },
  sauvegarde: { desc: 'Serveur de sauvegarde local pour TPE, artisans et cabinets en Savoie et Haute-Savoie : tour reconditionnée, disques neufs en miroir, copie hors ligne, installation sur site ou abonnement managé.', priority: '0.8' },
  effacement: { desc: 'Comment Réemploi 74 efface vos données : inventaire par numéro de série, effacement conforme NIST 800-88 (Purge ou Clear), vérification, certificat par disque, destruction des supports défaillants.', priority: '0.7' },
  'ce-que-nous-prenons': { desc: 'Ordinateurs portables, tours, écrans, serveurs, périphériques et téléphones : ce que Réemploi 74 collecte en Savoie et Haute-Savoie, et ce qui relève de la déchèterie.', priority: '0.7' },
  faq: { desc: 'Questions fréquentes sur le don et le rachat de matériel informatique en Savoie et Haute-Savoie : délais, enlèvement, disques, verrouillage, licence Windows, documents pour les entreprises.', priority: '0.7' },
  'a-propos': { desc: 'Réemploi 74 : faire durer le matériel informatique plutôt que le recycler, en Savoie et Haute-Savoie. Notre mission, nos engagements mesurables, notre atelier.', priority: '0.6' },
  contact: { desc: 'Contacter Réemploi 74, réemploi informatique en Savoie et Haute-Savoie : email, téléphone, dépôt à l\'atelier sur rendez-vous.', priority: '0.6' },
  suivi: { desc: 'Suivez votre dossier Réemploi 74 avec votre code de suivi : offre, enlèvement, effacement des données, remise en service.', priority: '0.4' },
  'mentions-legales': { desc: 'Mentions légales du site Réemploi 74.', priority: '0.2' },
  confidentialite: { desc: 'Politique de confidentialité de Réemploi 74 : données collectées, finalités, durées de conservation, vos droits, données présentes sur les équipements confiés.', priority: '0.2' },
  conditions: { desc: 'Conditions du service Réemploi 74 : don, offre de rachat, enlèvement et dépôt, effacement des données, matériel hors service, garanties.', priority: '0.2' },
  credits: { desc: 'Crédits des photographies du site Réemploi 74.', priority: '0.1' },
  confirmation: null, // pas une page indexable : incluse dans les pages de formulaire
};
const pageFile = r => (r === '' ? 'index.html' : r + '.html');
const pageUrl = r => SITE_URL + '/' + (r === '' ? '' : r + '.html');
const WITH_CONFIRMATION = ['donner', 'vendre', 'entreprises'];

/* ---------- transformation des liens #/rubrique → rubrique.html ---------- */
function linkify(s) {
  return s.replace(/href="#\/([a-z0-9-]*)(\?[^"]*)?"/g, (all, r, q) => {
    if (r === 'confirmation') return all;                     // reste une ancre interne (section présente sur les pages de formulaire)
    return 'href="' + pageFile(r) + (q || '') + '"';
  }).replace(/href="entreprises\.html" data-scroll="lot"/g, 'href="entreprises.html#lot" data-scroll="lot"');
}
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const strip = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/* ---------- données structurées ---------- */
const LOCAL_BUSINESS = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Réemploi 74', description: 'Collecte, effacement certifié et remise en service de matériel informatique d\'occasion en Savoie et Haute-Savoie.', url: SITE_URL + '/', email: 'nathan@reemploi74.fr', image: SITE_URL + '/img/atelier.jpg', areaServed: [{ '@type': 'AdministrativeArea', name: 'Savoie' }, { '@type': 'AdministrativeArea', name: 'Haute-Savoie' }], priceRange: 'Enlèvement gratuit' };
function faqSchema(body) {
  const items = [];
  const rx = /<details><summary>([\s\S]*?)<\/summary><div class="a">([\s\S]*?)<\/div><\/details>/g;
  let q; while ((q = rx.exec(body))) items.push({ '@type': 'Question', name: strip(q[1]), acceptedAnswer: { '@type': 'Answer', text: strip(q[2]) } });
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items };
}
const jsonld = o => '<script type="application/ld+json">' + JSON.stringify(o) + '</script>\n';

/* ---------- génération ---------- */
// (les pages générées sont écrasées en place)
fs.mkdirSync(path.join(out, 'img'), { recursive: true });
const headBase = headSrc.replace(/^<title>[^<]*<\/title>\n/, '').replace(/^<meta name="description"[^>]*>\n/, '');
const generated = [];
for (const r of routes) {
  const meta = META[r]; if (meta === null) continue;
  if (!meta) throw new Error('Pas de métadonnées pour la rubrique ' + r);
  const sec = sections[r];
  const title = r === '' ? META[''].title : sec.title + ' — Réemploi 74';
  const url = pageUrl(r);
  let bodyMain = '<section class="page" data-route="' + r + '" data-title="' + sec.title + '">' + sec.body + '</section>\n';
  if (WITH_CONFIRMATION.includes(r)) bodyMain += '<section class="page" data-route="confirmation" data-title="Demande enregistrée" hidden>' + sections.confirmation.body + '</section>\n';
  if (r === 'donner' || r === 'vendre') bodyMain += template + '\n';
  const schemas = jsonld(LOCAL_BUSINESS) + (r === 'faq' ? jsonld(faqSchema(sec.body)) : '');
  const doc = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(title) + '</title>\n'
    + '<meta name="description" content="' + esc(meta.desc) + '">\n'
    + '<link rel="canonical" href="' + url + '">\n'
    + '<meta name="theme-color" content="#2F7D5B">\n<link rel="icon" href="favicon.svg" type="image/svg+xml">\n'
    + '<meta property="og:type" content="website">\n<meta property="og:locale" content="fr_FR">\n<meta property="og:site_name" content="Réemploi 74">\n'
    + '<meta property="og:title" content="' + esc(title) + '">\n<meta property="og:description" content="' + esc(meta.desc) + '">\n'
    + '<meta property="og:url" content="' + url + '">\n<meta property="og:image" content="' + SITE_URL + '/img/atelier.jpg">\n<meta name="twitter:card" content="summary_large_image">\n'
    + (r === '' ? '<link rel="preload" as="image" href="img/atelier.jpg">\n' : '')
    + schemas + headBase
    + '</head>\n<body data-page="' + r + '">\n' + linkify(before) + '\n' + linkify(bodyMain) + linkify(after) + '\n</body>\n</html>\n';
  fs.writeFileSync(path.join(out, pageFile(r)), doc);
  generated.push({ r, url, priority: meta.priority });
}

/* ---------- fichiers partagés ---------- */
['styles.css', 'app.js', 'config.js'].forEach(f => fs.copyFileSync(path.join(src, f), path.join(out, f)));
if (fs.existsSync(path.join(src, 'img'))) fs.readdirSync(path.join(src, 'img')).forEach(f => fs.copyFileSync(path.join(src, 'img', f), path.join(out, 'img', f)));
fs.writeFileSync(path.join(out, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#2F7D5B"/><path d="M27.5 13.5a10 10 0 1 0 2.4 9.6" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M28.6 8.5v6.2h-6.2" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>\n');
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + SITE_URL + '/sitemap.xml\n');
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + generated.map(g => '  <url><loc>' + g.url + '</loc><lastmod>' + today + '</lastmod><priority>' + g.priority + '</priority></url>').join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(out, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n');
fs.writeFileSync(path.join(out, '.htaccess'), '# Apache (OVH, o2switch…)\nAddDefaultCharset UTF-8\nDirectoryIndex index.html\n<IfModule mod_headers.c>\n  Header set X-Content-Type-Options "nosniff"\n  Header set X-Frame-Options "DENY"\n  Header set Referrer-Policy "strict-origin-when-cross-origin"\n</IfModule>\n<IfModule mod_expires.c>\n  ExpiresActive On\n  ExpiresByType image/jpeg "access plus 30 days"\n  ExpiresByType text/css "access plus 7 days"\n  ExpiresByType application/javascript "access plus 7 days"\n</IfModule>\n');
fs.writeFileSync(path.join(out, '.nojekyll'), '');
// clé IndexNow (Bing, Yandex, Seznam, Naver) : fichier <clé>.txt à la racine
const keyFile = path.join(__dirname, 'indexnow.key');
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, require('crypto').randomBytes(16).toString('hex'));
const key = fs.readFileSync(keyFile, 'utf8').trim();
fs.writeFileSync(path.join(out, key + '.txt'), key);
fs.writeFileSync(path.join(out, 'urls.json'), JSON.stringify(generated.map(g => g.url), null, 1));
console.log('pages générées :', generated.length, 'pages —', generated.map(g => pageFile(g.r)).join(', '), '\nSITE_URL =', SITE_URL, '\nIndexNow key =', key);
