#!/bin/bash

# Script de test pour le système de rate limiting
# Ce script teste les limites sur différents endpoints

echo "========================================="
echo "  TEST DU SYSTÈME DE RATE LIMITING"
echo "========================================="
echo ""

# Configuration
BASE_URL="http://localhost:5000"
AUTH_TOKEN="" # Sera récupéré après login

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher le résultat
print_result() {
  local status=$1
  local expected=$2
  local endpoint=$3
  local attempt=$4
  
  if [ "$status" = "$expected" ]; then
    echo -e "${GREEN}✓${NC} Attempt $attempt on $endpoint: Status $status (Expected: $expected)"
  else
    echo -e "${RED}✗${NC} Attempt $attempt on $endpoint: Status $status (Expected: $expected)"
  fi
}

# Fonction pour extraire les headers de rate limiting
extract_headers() {
  local response=$1
  echo "$response" | grep -E "x-ratelimit|retry-after" -i
}

echo -e "${BLUE}1. Test de connexion (Basic Auth pour dev)${NC}"
echo "================================================"
echo ""

# Login pour obtenir un token de session
echo "Tentative de connexion..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/login/basic" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n 1)
if [ "$LOGIN_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Connexion réussie${NC}"
else
  echo -e "${YELLOW}⚠ Connexion échouée (status: $LOGIN_STATUS). Mode sans authentification.${NC}"
fi

echo ""
echo -e "${BLUE}2. Test Rate Limiting - Endpoint Chatbot (/api/chatbot/query)${NC}"
echo "================================================"
echo "Limite: 10 requêtes par minute"
echo ""

for i in {1..15}; do
  RESPONSE=$(curl -s -b cookies.txt -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$BASE_URL/api/chatbot/query" \
    -H "Content-Type: application/json" \
    -d '{"query":"Test query '${i}'","context":"test"}' \
    -D -)
  
  STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
  
  # Extraire les headers de rate limiting
  HEADERS=$(echo "$RESPONSE" | grep -E "x-ratelimit|retry-after" -i)
  
  if [ $i -le 10 ]; then
    print_result "$STATUS" "200" "/api/chatbot/query" "$i"
  else
    print_result "$STATUS" "429" "/api/chatbot/query" "$i"
    if [ "$STATUS" = "429" ] && [ ! -z "$HEADERS" ]; then
      echo -e "  ${YELLOW}Headers: $HEADERS${NC}"
    fi
  fi
  
  # Petite pause entre les requêtes
  sleep 0.5
done

echo ""
echo -e "${BLUE}3. Test Rate Limiting - Auth Login (5 tentatives/15min)${NC}"
echo "================================================"
echo "Test avec mauvais mot de passe (échecs uniquement comptés)"
echo ""

for i in {1..7}; do
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$BASE_URL/api/login/basic" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrongpassword'${i}'"}' \
    -D -)
  
  STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
  
  if [ $i -le 5 ]; then
    print_result "$STATUS" "401" "/api/login/basic" "$i"
  else
    print_result "$STATUS" "429" "/api/login/basic" "$i"
    if [ "$STATUS" = "429" ]; then
      HEADERS=$(echo "$RESPONSE" | grep -E "x-ratelimit|retry-after" -i)
      echo -e "  ${YELLOW}Headers: $HEADERS${NC}"
    fi
  fi
  
  sleep 0.3
done

echo ""
echo -e "${BLUE}4. Test Rate Limiting - OCR Processing (5 req/5min)${NC}"
echo "================================================"
echo ""

# Créer un fichier PDF de test
echo "Test PDF Content" > test.txt
# Note: En production, utiliser un vrai PDF

for i in {1..7}; do
  RESPONSE=$(curl -s -b cookies.txt -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$BASE_URL/api/ocr/process-pdf" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -F "pdf=@test.txt" \
    -D -)
  
  STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
  
  if [ $i -le 5 ]; then
    # Les 5 premières devraient passer (ou erreur si pas de PDF valide)
    echo -e "Attempt $i on /api/ocr/process-pdf: Status $STATUS"
  else
    print_result "$STATUS" "429" "/api/ocr/process-pdf" "$i"
    if [ "$STATUS" = "429" ]; then
      HEADERS=$(echo "$RESPONSE" | grep -E "x-ratelimit|retry-after" -i)
      echo -e "  ${YELLOW}Headers: $HEADERS${NC}"
    fi
  fi
  
  sleep 0.5
done

echo ""
echo -e "${BLUE}5. Test Headers de Rate Limiting${NC}"
echo "================================================"
echo ""

# Faire une seule requête et afficher tous les headers
echo "Requête unique pour vérifier les headers:"
RESPONSE=$(curl -s -b cookies.txt -i \
  -X POST "$BASE_URL/api/chatbot/query" \
  -H "Content-Type: application/json" \
  -d '{"query":"Header test","context":"test"}')

echo "$RESPONSE" | grep -E "x-ratelimit|retry-after|ratelimit" -i

echo ""
echo -e "${BLUE}6. Test IP vs User Rate Limiting${NC}"
echo "================================================"
echo ""

# Test sans authentification (rate limit par IP)
echo "Test sans authentification (limite par IP):"
for i in {1..3}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X GET "$BASE_URL/api/projects")
  echo "  Attempt $i (no auth): Status $STATUS"
  sleep 0.2
done

# Test avec authentification (limite par user)
echo ""
echo "Test avec authentification (limite par utilisateur):"
for i in {1..3}; do
  STATUS=$(curl -s -b cookies.txt -o /dev/null -w "%{http_code}" \
    -X GET "$BASE_URL/api/projects")
  echo "  Attempt $i (with auth): Status $STATUS"
  sleep 0.2
done

# Nettoyer
rm -f test.txt cookies.txt

echo ""
echo "========================================="
echo -e "${GREEN}  TESTS TERMINÉS${NC}"
echo "========================================="
echo ""
echo "Résumé:"
echo "- Les endpoints avec rate limiting devraient retourner 429 après dépassement"
echo "- Les headers X-RateLimit-* doivent être présents"
echo "- Le header Retry-After doit indiquer quand réessayer"
echo ""