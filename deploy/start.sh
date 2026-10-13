#!/bin/sh
# Liga o Ollama, baixa os modelos da lista MODELS_TO_PULL (se faltarem) e liga o ORVEX.
ollama serve > /tmp/ollama.log 2>&1 &
for i in $(seq 1 60); do curl -sf http://127.0.0.1:11434/api/tags >/dev/null && break; sleep 1; done
( for m in $MODELS_TO_PULL; do ollama pull "$m"; done ) &
exec node --disable-warning=ExperimentalWarning server/index.js
