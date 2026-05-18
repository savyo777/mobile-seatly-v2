#!/usr/bin/env bash
# Pre-flight safety check for any Maestro flow that drives the
# Stripe PaymentSheet end-to-end. Fails fast if .env contains a live
# publishable key so we never accidentally charge a real card.
#
# Usage: scripts/maestro-stripe-preflight.sh
set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "FATAL: .env not found at $ENV_FILE" >&2
  exit 1
fi

KEY="$(grep '^EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")"

if [[ -z "$KEY" ]]; then
  echo "FATAL: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not set in .env" >&2
  exit 1
fi

if [[ "$KEY" != pk_test_* ]]; then
  echo "FATAL: Stripe key does not start with pk_test_." >&2
  echo "       Refusing to run a Maestro flow that submits real card data" >&2
  echo "       against a non-test Stripe key. Switch to a test key first." >&2
  exit 1
fi

echo "OK: Stripe is in TEST mode (pk_test_*). Safe to proceed."
