# Réemploi 74 — site (contexte pour Claude Code)

Site statique publié par GitHub Pages depuis la branche `main` (https://reemploi74.fr ; repli
https://nathan020430-prog.github.io/reemploi74-site/). Le contexte complet du projet (décisions, comptes,
DNS, reste à faire) est dans le dépôt privé `nathan020430-prog/reemploi74-dossier` → `JOURNAL.md`.

## Comment modifier le site
1. Éditer **`src/index.html`** (toutes les rubriques dans une seule page, sections `<section class="page" data-route="…">`),
   `src/app.js`, `src/styles.css` ou `src/config.js`. **Ne jamais éditer les `*.html` de la racine** : ils sont générés.
2. `node build.js` (ou `SITE_URL=https://reemploi74.fr node build.js` pour l'adresse canonique de production).
3. `git add -A && git commit && git push` — GitHub Pages publie en 1 à 2 minutes.
4. Après une modification de contenu : resoumettre les URL aux moteurs (IndexNow, clé `indexnow.key`) —
   voir la fin de `switch-domain.sh` pour la commande.

## Ce que fait chaque fichier
- `build.js` : découpe `src/index.html` en une page par rubrique, ajoute titre / description / canonique /
  Open Graph / données structurées (LocalBusiness, FAQPage sur faq.html), `sitemap.xml`, `robots.txt`,
  fichier clé IndexNow. Les liens `#/rubrique` de la source deviennent `rubrique.html`.
- `src/app.js` : routage (mono-page en aperçu, pages réelles quand `<body data-page>` est présent), formulaires
  (validation, mode de remise enlèvement/dépôt, photos), confirmation avec code de suivi `R74-XXXXXX`, page de
  suivi, typographie française automatique. Mode production si `R74_CONFIG.appUrl` (ou `formEndpoint`) est
  renseigné : envoi vers `appUrl/api/demandes` (code de suivi renvoyé par l'application), suivi par
  `appUrl/api/suivi/<code>` (rendu de la vue publique : frise, offre, équipements, certificats), lien vers
  `appUrl/suivi/<code>` pour répondre à une offre. Messages d'erreur de l'API (400 `erreurs`, 429, 413) affichés.
- `src/config.js` : `appUrl` (application reemploi74-app), ou `formEndpoint` (Formspree/Web3Forms) + `formKey`, `email`.
  Tout vide = mode démonstration.
- `serve-local.mjs` : sert le site généré en local avec `appUrl` remplacé (`--app-url http://localhost:3074`)
  pour tester avec l'application sans modifier le dépôt.
- `switch-domain.sh` : bascule vers le domaine personnalisé (GitHub Pages, HTTPS, régénération, IndexNow).

## Règles de contenu (audit juridique — à respecter dans tout texte)
Voir `CLAUDE.md` du dépôt dossier. En bref : pas de « reçu fiscal » (attestation de cession + bordereau ; reçu
fiscal possible via une association partenaire d'intérêt général, nous consulter) ; effacement « conforme
NIST 800-88 (Purge quand le matériel le permet, Clear sinon) » ; délais 48 h ouvrées / 15 jours / 10 jours /
7 jours ; séquence réception → effacement → diagnostic ; enlèvement dès 3 équipements sinon dépôt ; zone
73/74 ; seuil 30 € par appareil ; hors service seulement en complément d'un lot ; aucun chiffre non sourcé ;
vouvoiement ; pas de newsletter ; jamais « NAS reconditionné ».

## Identité affichée
Nathan Thivillier, entrepreneur individuel (NTHstructure), SIREN 980 094 064, siège 89 route du Cruet Nord
74150 Sales ; atelier 49 avenue du Docteur Jacques Arnaud 74300 Cluses ; nathan@reemploi74.fr ; 06 98 35 44 40.
Champs encore surlignés (classe `todo`) : n° de récépissé préfecture, service de formulaires, assureur,
médiateur de la consommation, encadré D211-2.
