#!/usr/bin/env bash
# Bascule du site sur reemploi74.fr (GitHub Pages) — à lancer quand la zone DNS OVH pointe vers GitHub.
# Étapes : domaine personnalisé → attente du certificat → HTTPS forcé → régénération (canoniques, sitemap)
#          → push → soumission IndexNow sous le nouveau nom → vérification.
set -euo pipefail
REPO="nathan020430-prog/reemploi74-site"
DOMAIN="reemploi74.fr"
KEY="$(cat indexnow.key)"

echo "== 1. DNS"
ips=$(nslookup -type=A "$DOMAIN" 8.8.8.8 2>/dev/null | grep -i "^Address" | grep -v "#53\|8.8.8.8" | awk '{print $NF}' | tr '\n' ' ')
echo "A $DOMAIN -> $ips"
case "$ips" in *185.199.*) ;; *) echo "Le DNS ne pointe pas encore vers GitHub Pages (185.199.108-111.153). Abandon."; exit 1;; esac

echo "== 2. Domaine personnalisé sur GitHub Pages"
gh api -X PUT "repos/$REPO/pages" -f cname="$DOMAIN" >/dev/null && echo "cname=$DOMAIN"
for i in $(seq 1 40); do
  st=$(gh api "repos/$REPO/pages" --jq '.protected_domain_state + " / cert:" + (.https_certificate.state // "none")')
  echo "   état: $st"
  case "$st" in *"cert:approved"*) break;; esac
  sleep 30
done
gh api -X PUT "repos/$REPO/pages" -F https_enforced=true >/dev/null 2>&1 && echo "HTTPS forcé" || echo "HTTPS à forcer plus tard (certificat encore en cours)"

echo "== 3. Régénération avec SITE_URL=https://$DOMAIN"
git pull -q --rebase origin main || true   # GitHub a ajouté le fichier CNAME
SITE_URL="https://$DOMAIN" node build.js | head -1
git add -A
git commit -q -m "Bascule sur https://$DOMAIN : canoniques, sitemap, Open Graph

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" || echo "rien à committer"
git push -q origin main && echo "poussé"

echo "== 4. Attente de la publication"
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "https://$DOMAIN/faq.html" || echo 000)
  can=$(curl -s --max-time 20 "https://$DOMAIN/faq.html" | grep -o 'rel="canonical" href="[^"]*' | sed 's/.*href="//' || true)
  echo "   https://$DOMAIN/faq.html -> $code $can"
  [ "$code" = "200" ] && [ "$can" = "https://$DOMAIN/faq.html" ] && break
  sleep 30
done

echo "== 5. IndexNow sous $DOMAIN"
node -e '
const urls = require("./urls.json");
const body = JSON.stringify({ host: process.argv[1], key: process.argv[2], keyLocation: "https://" + process.argv[1] + "/" + process.argv[2] + ".txt", urlList: urls });
require("fs").writeFileSync("indexnow-domain.json", body); console.log(urls.length, "URL");
' "$DOMAIN" "$KEY"
for host in api.indexnow.org www.bing.com yandex.com; do
  printf "   %-18s " "$host"; curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 30 -X POST "https://$host/indexnow" -H "Content-Type: application/json; charset=utf-8" --data-binary @indexnow-domain.json || true
done
rm -f indexnow-domain.json

echo "== 6. Vérification finale"
for p in "" donner.html vendre.html entreprises.html; do printf "   https://%s/%-18s " "$DOMAIN" "$p"; curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 20 "https://$DOMAIN/$p"; done
printf "   redirection github.io -> "; curl -s -o /dev/null -w "HTTP %{http_code} -> %{redirect_url}\n" --max-time 20 "https://nathan020430-prog.github.io/reemploi74-site/"
echo "Terminé."
