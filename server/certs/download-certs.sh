#!/bin/sh
# Download Apple PKI root certificates for SignedDataVerifier
set -e

cd "$(dirname "$0")"

echo "Downloading Apple root certificates..."

curl -O https://www.apple.com/certificateauthority/AppleIncRootCertificate.cer
curl -O https://www.apple.com/certificateauthority/AppleRootCA-G2.cer
curl -O https://www.apple.com/certificateauthority/AppleRootCA-G3.cer

echo "Done. Place these .cer files in this directory."
