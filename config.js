/* Réemploi 74 — configuration du site
 *
 * Tant que formEndpoint est vide, le site fonctionne en mode démonstration :
 * les demandes sont conservées dans le navigateur du visiteur, rien n'est transmis.
 *
 * Pour passer en production, indiquez l'URL de réception des formulaires :
 *   - Formspree  : https://formspree.io/f/VOTRE_ID          (formKey inutile)
 *   - Web3Forms  : https://api.web3forms.com/submit         (formKey = votre access key)
 *   - Votre API  : https://api.reemploi74.fr/demandes        (POST multipart/form-data)
 * Les champs envoyés : code, type (don | vente | lot), remise, nom, email, tel, adresse, cp, ville,
 * organisation, fonction, echeance, entreprise, equipements (JSON), disque, dpa, description,
 * souhait, _subject, et les photos (photo_i_j).
 */
window.R74_CONFIG = {
  formEndpoint: '',
  formKey: '',
  email: 'nathan@reemploi74.fr',
};
