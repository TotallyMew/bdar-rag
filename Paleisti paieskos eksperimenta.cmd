@echo off
chcp 65001 >nul
cd /d "%~dp0"
python rag_experiment.py run --demo
pause
