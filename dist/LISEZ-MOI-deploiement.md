# Réemploi 74 — mise en ligne du site

Ce dossier contient le site complet, statique : aucun serveur d'application n'est nécessaire.
Il se dépose tel quel sur n'importe quel hébergement web.

```
index.html      la page (toutes les rubriques, navigation par ancres #/donner, #/vendre, …)
styles.css      la feuille de style
app.js          navigation, formulaires, suivi
config.js       ← le seul fichier à modifier pour passer en production
img/            les 8 photos (licences Unsplash / Pexels, créditées dans le site)
favicon.svg, robots.txt, sitemap.xml
_headers        en-têtes de sécurité pour Netlify / Cloudflare Pages
.htaccess       équivalent pour un hébergement Apache (OVH, o2switch…)
```

## En 5 étapes

### 1. Réserver le nom de domaine (10 minutes, ~10 €/an)
`reemploi74.fr` était libre le 15/09/2026 (vérifié sur le registre AFNIC), ainsi que `reemploi74.com` et `reemploi-savoie.fr`.
Registrar conseillé : OVHcloud, Gandi ou Infomaniak. Activer le renouvellement automatique et le verrouillage de transfert.

### 2. Choisir l'hébergement et déposer le dossier

| Option | Coût | Comment |
|---|---|---|
| **Cloudflare Pages** (recommandé) | 0 € | Créer un compte → Workers & Pages → Create → Upload assets → glisser ce dossier. Puis Custom domains → ajouter `reemploi74.fr` (Cloudflare gère le DNS et le HTTPS). |
| **Netlify** | 0 € (usage non commercial) / 19 $/mois | Sites → Add new site → Deploy manually → glisser le dossier. Domain settings → ajouter le domaine. |
| **OVH / o2switch** (hébergement mutualisé français) | 3 à 7 €/mois | Envoyer le contenu du dossier dans `www/` par FTP ou le gestionnaire de fichiers. Le `.htaccess` est fourni. |
| **L'application Emergent existante** | plan Standard | Remplacer les pages de l'app par ce site et brancher ses formulaires sur l'API existante (voir étape 3). |

Le HTTPS est fourni automatiquement par Cloudflare Pages, Netlify et les hébergeurs français (Let's Encrypt).

### 3. Brancher les formulaires (sinon le site reste en mode démonstration)
Ouvrir `config.js` et renseigner `formEndpoint` :

- **Formspree** (le plus simple) : créer un formulaire sur formspree.io, copier son URL `https://formspree.io/f/xxxx`. Gratuit jusqu'à 50 envois/mois, puis ~10 $/mois. Les photos sont transmises en pièces jointes sur les plans payants.
- **Web3Forms** : gratuit 250 envois/mois, `formEndpoint: 'https://api.web3forms.com/submit'` et `formKey: 'votre access key'`.
- **Votre propre API** (Emergent, ou un script) : l'URL reçoit un `POST multipart/form-data` avec les champs listés en tête de `config.js`.

Dès que `formEndpoint` est renseigné : les notes « site de démonstration » disparaissent, le bouton de simulation du suivi aussi, les demandes partent vers l'endpoint, et le visiteur garde son code de suivi.
Le suivi en ligne détaillé (statuts mis à jour par l'atelier) demande une petite API : en attendant, la page Suivi invite à écrire avec le code.

### 4. Créer l'adresse email
`contact@reemploi74.fr` est affichée sur le site. Ouvrir la messagerie chez le registrar (Infomaniak Service Mail ~1,50 €/mois, OVH Zimbra Starter 0,30 €/mois/compte, ou Google Workspace 6,80 €/mois) et poser les enregistrements MX, SPF, DKIM et DMARC fournis par le prestataire.
Pour que les demandes des formulaires arrivent, indiquer cette adresse dans Formspree / Web3Forms.

### 5. Compléter les textes légaux avant l'ouverture
Dans `index.html`, tous les champs `[Raison sociale]`, `[SIRET]`, `[Adresse du siège]`, `[Hébergeur]`, `[Téléphone]`, `[Horaires]`, `[Adresse de l'atelier]`, `[Assureur]`, `[Médiateur de la consommation]` … sont surlignés (classe `todo`). Les remplacer par les informations réelles, puis retirer les encadrés « À compléter » et la classe `todo`. Faire relire les pages Confidentialité et Conditions par un juriste ; désigner un médiateur de la consommation si du matériel est revendu à des particuliers.

## Après la mise en ligne
- Google Search Console : déclarer le site et envoyer `sitemap.xml`.
- Fiche Google Business Profile « Réemploi 74 », zone Savoie / Haute-Savoie, photos, horaires.
- Test complet depuis un téléphone : un don, une vente, un lot, jusqu'à la réception de l'email.
- Remplacer les photos de banque par des photos de l'atelier dès que possible (mettre à jour la page Crédits).
- Statistiques de fréquentation : Cloudflare Web Analytics ou Plausible (sans bandeau cookies si configuré selon la CNIL).
