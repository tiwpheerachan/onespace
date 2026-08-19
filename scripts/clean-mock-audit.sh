#!/usr/bin/env bash
# Remove mock/seed audit rows from production, keeping only real users' activity.
# Real actors kept: Tiw Pheerachan, Safe - Sun. Everything else (Rice Suwan,
# Nichada P., Kittipong R., Wei Chen, Ploy Kanya, Somchai T., Anan W., Mei Lin)
# is seed data and gets deleted. Safe to re-run (idempotent).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a

URL="$NEXT_PUBLIC_SUPABASE_URL/rest/v1/portal_audit"
AUTH=(-H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
KEEP='actor=not.in.(%22Tiw%20Pheerachan%22,%22Safe%20-%20Sun%22)'

echo "Before — total rows:"
curl -s "$URL?select=id" "${AUTH[@]}" -H "Prefer: count=exact" -I | grep -i content-range

echo "Deleting mock rows…"
curl -s -X DELETE "$URL?$KEEP" "${AUTH[@]}" -H "Prefer: count=exact" -D - -o /dev/null | grep -i content-range

echo "After — total rows (should be 25, real only):"
curl -s "$URL?select=id" "${AUTH[@]}" -H "Prefer: count=exact" -I | grep -i content-range
