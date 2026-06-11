#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/check_endpoints.sh [BASE_URL]
BASE_URL=${1:-http://localhost:8000}

echo "Checking API at $BASE_URL"

check() {
  local url="$1"
  echo "\n> GET $url"
  resp=$(curl -sS -w "\n%{http_code}" "$url")
  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  echo "Status: $http_code"
  echo "Body: $body"
  if [ "$http_code" != "200" ]; then
    echo "ERROR: non-200 response from $url"
    return 1
  fi
}

post_json() {
  local url="$1"
  local data="$2"
  echo "\n> POST $url -> $data"
  resp=$(curl -sS -X POST -H "Content-Type: application/json" -d "$data" -w "\n%{http_code}" "$url")
  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  echo "Status: $http_code"
  echo "Body: $body"
  if [ "$http_code" != "200" ]; then
    echo "ERROR: non-200 response from $url"
    return 1
  fi
  echo "$body"
}

# 1) Diagnostics
check "$BASE_URL/api/v1/debug/diagnostics"

# 2) Login with mock token
login_resp=$(post_json "$BASE_URL/api/v1/auth/login/line" '{"id_token":"mock_token"}')
access_token=$(echo "$login_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
if [ -z "$access_token" ]; then
  echo "ERROR: could not extract access_token from login response"
  exit 1
fi
echo "Got access_token: ${access_token:0:8}..."

# 3) Get my bookings
echo "\n> GET /api/v1/bookings/me"
resp=$(curl -sS -H "Authorization: Bearer $access_token" -w "\n%{http_code}" "$BASE_URL/api/v1/bookings/me")
http_code=$(echo "$resp" | tail -n1)
body=$(echo "$resp" | sed '$d')
echo "Status: $http_code"
echo "Body: $body"
if [ "$http_code" != "200" ]; then
  echo "ERROR: bookings/me failed"
  exit 1
fi

# 4) If a booking exists, check its location endpoint
booking_id=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and len(d)>0 else '')")
if [ -n "$booking_id" ]; then
  echo "\n> GET /api/v1/bookings/$booking_id/location"
  resp=$(curl -sS -H "Authorization: Bearer $access_token" -w "\n%{http_code}" "$BASE_URL/api/v1/bookings/$booking_id/location")
  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  echo "Status: $http_code"
  echo "Body: $body"
  if [ "$http_code" != "200" ]; then
    echo "ERROR: booking location endpoint failed"
    exit 1
  fi
else
  echo "No bookings present for the user; skipping location check."
fi

echo "\nAll checks passed."
