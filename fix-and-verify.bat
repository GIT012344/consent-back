@echo off
echo Fixing content display issue...
node final-fix-content.js
echo.
echo Restarting backend...
echo Please press Ctrl+C to stop current server, then run: node server.js
echo.
pause
