/* Réemploi 74 — configuration du site
 *
 * Tant qu'appUrl et formEndpoint sont vides, le site fonctionne en mode démonstration :
 * les demandes sont conservées dans le navigateur du visiteur, rien n'est transmis, et le suivi
 * ne connaît que les dossiers créés depuis ce navigateur.
 *
 * Production : indiquez l'adresse de l'application Réemploi 74 (dépôt reemploi74-app), sans barre finale.
 *   - les demandes partent vers  appUrl + /api/demandes  (POST multipart/form-data, réponse 201 { code }) ;
 *   - le suivi interroge          appUrl + /api/suivi/<code>  (aucune coordonnée renvoyée) ;
 *   - répondre à une offre et télécharger les certificats se font sur  appUrl + /suivi/<code>.
 * Côté application, l'origine du site (https://reemploi74.fr) doit figurer dans ORIGINES_AUTORISEES.
 *
 * Sans l'application, formEndpoint accepte un service de formulaires générique :
 *   - Formspree  : https://formspree.io/f/VOTRE_ID          (formKey inutile)
 *   - Web3Forms  : https://api.web3forms.com/submit         (formKey = votre access key)
 * Le suivi reste alors limité à ce navigateur.
 * Les champs envoyés : code, type (don | vente | lot), remise, nom, email, tel, adresse, cp, ville,
 * organisation, fonction, echeance, entreprise, equipements (JSON), etat_global et souhait (lot),
 * disque, dpa, consentement, description, _subject, et les photos (photo_i_j).
 */
window.R74_CONFIG = {
  appUrl: '',
  formEndpoint: '',
  formKey: '',
  email: 'nathan@reemploi74.fr',
};
