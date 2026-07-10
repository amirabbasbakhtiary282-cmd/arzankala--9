Write-Host "=== Arzankala Backend Starter ===" -ForegroundColor Green
Write-Host "Killing stale node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Running seed..." -ForegroundColor Yellow
node seed.js
Write-Host "Starting server with nodemon..." -ForegroundColor Green
npx nodemon server.js
