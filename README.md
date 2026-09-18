# Réemploi 74 — site

Site statique de Réemploi 74 (don ou rachat de matériel informatique en Savoie et Haute-Savoie).
En ligne : **https://nathan020430-prog.github.io/reemploi74-site/** (GitHub Pages, HTTPS).

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

## Mise en production (les trois choses qui manquent)

1. **Formulaires** — `src/config.js` : renseigner `formEndpoint` (Formspree `https://formspree.io/f/xxxx`,
   ou Web3Forms + `formKey`). Tant qu'il est vide, le site est en mode démonstration : les demandes
   restent dans le navigateur du visiteur. Dès qu'il est renseigné, les notes « démonstration »
   disparaissent et les demandes (avec photos) sont envoyées.
2. **Domaine** — réserver `reemploi74.fr` (libre au 15/09/2026), puis *Settings → Pages → Custom domain*
   dans ce dépôt, et chez le registrar : 4 enregistrements `A` vers `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153` et un `CNAME www → nathan020430-prog.github.io`.
   Cocher *Enforce HTTPS* une fois le certificat émis, puis relancer `SITE_URL=https://reemploi74.fr node build.js`.
3. **Textes légaux** — dans `src/index.html`, remplacer les champs surlignés `[Raison sociale]`, `[SIREN]`,
   `[Adresse du siège]`, `[Hébergeur]`, `[Téléphone]`, `[Horaires]`, `[Adresse de l'atelier]`, `[Assureur]`,
   `[Médiateur de la consommation]`… puis retirer les encadrés « À compléter » et la classe `todo`.
   Relecture par un juriste des pages Confidentialité et Conditions.

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
