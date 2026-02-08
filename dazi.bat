@echo off
chcp 65001 >nul
start "HTTP Server" python -m http.server 8000
timeout /t 3 /nobreak >nul
start "" http://localhost:8000