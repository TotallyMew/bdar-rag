@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Reikia paleisto Ollama ir modeliu qwen2.5:3b bei nomic-embed-text.
python rag_experiment.py run --backend ollama --methods no_rag,bm25,dense,hybrid,hybrid_rerank --split test --demo
pause
