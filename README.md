# Réemploi 74 — site

Site statique de Réemploi 74 (don ou rachat de matériel informatique en Savoie et Haute-Savoie).
En ligne : **https://reemploi74.fr** (GitHub Pages, HTTPS ; https://nathan020430-prog.github.io/reemploi74-site/ redirige).

## Organisation

```
src/index.html   la source : toutes les rubriques dans une seule page (mode aperçu, ancres #/rubrique)
src/app.js       navigation, formulaires, suivi, typographie
src/styles.css   feuille de style
src/config.js    configuration (formulaires, email) — copié tel quel à la racine
build.js         génère une page HTML par rubrique à la racine, avec titre, description,
                 URL canonique, Open Graph, données structurées (LocalBusiness, FAQPage), sitemap.xml
img/             les photos (licences Unsplash / Pexels, créditées sur credits.html)
*.html           les pages générées — ne pas les modifier à la main
```

**Pour modifier le site** : éditer `src/index.html` (ou `src/app.js`, `src/styles.css`), puis

```
node build.js
```

et pousser. GitHub Pages publie la branche `main` en une à deux minutes.

**Adresse du site** : `build.js` écrit les URL canoniques et le sitemap avec `SITE_URL`
(par défaut l'adresse GitHub Pages). Quand `reemploi74.fr` sera actif :

```
SITE_URL=https://reemploi74.fr node build.js
```

## Mise en production

1. **Formulaires et suivi** — `src/config.js` : renseigner `appUrl` avec l'adresse de l'application
   Réemploi 74 (dépôt `reemploi74-app`, une fois hébergée), sans barre finale. Les demandes partent alors
   vers `appUrl/api/demandes` (l'application génère le code de suivi, repris sur la page de confirmation
   et dans l'email), la page de suivi interroge `appUrl/api/suivi/<code>`, et répondre à une offre ou
   télécharger un certificat se fait sur `appUrl/suivi/<code>`. Côté application, mettre
   `https://reemploi74.fr` dans `ORIGINES_AUTORISEES`. Puis `SITE_URL=https://reemploi74.fr node build.js`
   et push. Tant qu'`appUrl` est vide, le site est en mode démonstration : les demandes restent dans le
   navigateur du visiteur. (`formEndpoint` accepte à la place un service générique, Formspree ou
   Web3Forms + `formKey`, sans suivi réel.)
2. **Domaine** — fait le 18/09/2026 : `reemploi74.fr` pointe sur GitHub Pages, HTTPS forcé
   (`switch-domain.sh`).
3. **Textes légaux** — identité de l'éditeur en place ; restent surlignés (classe `todo`) le n° de
   récépissé de la déclaration en préfecture, le service de réception des formulaires (= l'application et
   son hébergeur), l'assureur, le médiateur de la consommation et l'encadré D211-2. Relecture par un
   juriste des pages Confidentialité et Conditions.

### Tester le site avec l'application en local

```
node serve-local.mjs --port 8074 --app-url http://localhost:3074
```

sert les pages générées avec `appUrl` remplacé à la volée (le dépôt reste en mode démonstration) ; côté
application, `ORIGINES_AUTORISEES="http://localhost:8074"` dans son `.env` et `pnpm dev --port 3074`.

## Référencement

Déjà en place : une URL par rubrique, titres et descriptions distincts, canoniques, Open Graph, données
structurées LocalBusiness (toutes les pages) et FAQPage (faq.html), `sitemap.xml`, `robots.txt`,
clé IndexNow (`<clé>.txt`) pour Bing / Yandex / Seznam.

À faire avec un compte Google (impossible sans vous) :

- **Google Search Console** : https://search.google.com/search-console → *Ajouter une propriété* →
  *Préfixe d'URL* `https://nathan020430-prog.github.io/reemploi74-site/` → vérification par balise HTML
  (donner la balise `google-site-verification` : elle sera ajoutée dans `build.js`) → *Sitemaps* → `sitemap.xml`.
- **Google Business Profile** : https://business.google.com → « Réemploi 74 », catégorie *Service de
  recyclage informatique* ou *Magasin d'informatique d'occasion*, zone desservie Savoie + Haute-Savoie,
  site, horaires, photos. C'est le levier local n° 1 pour « reprise ordinateur Annecy / Chambéry ».
- **Bing Webmaster Tools** (facultatif, import possible depuis Search Console).

## Photos

Unsplash License et Pexels License (usage commercial autorisé, sans obligation d'attribution) ; les
photographes sont crédités sur `credits.html`. À remplacer par des photos de l'atelier dès que possible.
