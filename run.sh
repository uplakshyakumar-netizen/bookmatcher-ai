#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

VENV_PATH="$DIR/venv"

if [ ! -d "$VENV_PATH" ]; then
    echo "Creating virtual environment..."
    /Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12 -m venv "$VENV_PATH"
    "$VENV_PATH/bin/pip" install -r requirements.txt
fi

echo "=========================================================="
echo " Starting BookMatcher AI MVP Server..."
echo " Open: http://localhost:8000 in your browser"
echo "=========================================================="

export PYTHONPATH="$DIR/backend:$PYTHONPATH"
exec "$VENV_PATH/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir "$DIR/backend"
