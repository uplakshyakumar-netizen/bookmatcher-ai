#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo " Starting BookMatcher AI (Next.js & Node.js fullstack)..."
echo " Open: http://localhost:3000 in your browser"
echo "=========================================================="

exec npm run dev -- -p 3000
