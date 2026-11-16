"""One-click Windows launcher for the local BDAR chat. No account or API key."""
from pathlib import Path
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser

ROOT=Path(__file__).resolve().parent
HIDDEN=getattr(subprocess,'CREATE_NO_WINDOW',0)

def read_status(url):
    try:
        with urllib.request.urlopen(url,timeout=0.25) as r:return json.load(r)
    except Exception:return None

def main():
    local=Path(os.environ.get('LOCALAPPDATA',''))/'Programs/Ollama/ollama.exe'
    if read_status('http://127.0.0.1:11434/api/version') is None and local.exists():
        subprocess.Popen([str(local),'serve'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=HIDDEN)
    for port in range(8765,8776):
        url=f'http://127.0.0.1:{port}'
        status=read_status(url+'/api/status')
        if status and status.get('app')=='bdar-rag-local-ui':
            webbrowser.open(url)
            return
    port=None
    for candidate in range(8765,8776):
        with socket.socket() as probe:
            try:probe.bind(('127.0.0.1',candidate));port=candidate;break
            except OSError:continue
    if port is None:raise RuntimeError('Nerastas laisvas programos prievadas 8765–8775.')
    folder=ROOT/'ui_data';folder.mkdir(exist_ok=True)
    python=Path(sys.executable)
    pythonw=python.with_name('pythonw.exe')
    executable=str(pythonw if pythonw.exists() else python)
    with (folder/'server.log').open('ab') as log:
        subprocess.Popen([executable,str(ROOT/'ui_server.py'),'--no-browser','--port',str(port)],
            cwd=str(ROOT),stdout=log,stderr=log,creationflags=HIDDEN)
    url=f'http://127.0.0.1:{port}'
    for _ in range(60):
        status=read_status(url+'/api/status')
        if status and status.get('app')=='bdar-rag-local-ui':
            webbrowser.open(url)
            return
        time.sleep(0.3)
    raise RuntimeError('Nepavyko paleisti programos. Daugiau informacijos: '+str(folder/'server.log'))

if __name__=='__main__':
    try:main()
    except Exception as exc:
        try:
            import tkinter
            from tkinter import messagebox
            app=tkinter.Tk();app.withdraw()
            messagebox.showerror('BDAR RAG laboratorija',str(exc))
            app.destroy()
        except Exception:
            print(str(exc),file=sys.stderr)
        raise SystemExit(1)
