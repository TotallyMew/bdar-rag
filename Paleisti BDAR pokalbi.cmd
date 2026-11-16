@echo off
chcp 65001 >nul
cd /d "%~dp0"
where pythonw >nul 2>nul
if errorlevel 1 goto console
start "" pythonw "%~dp0launch_ui.py"
exit /b
:console
python "%~dp0launch_ui.py"
if errorlevel 1 pause
