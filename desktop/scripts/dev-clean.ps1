# Kill stale Marketing IDE dev processes and free common ports.
# Usage: powershell -ExecutionPolicy Bypass -File desktop/scripts/dev-clean.ps1

$ports = @(5173, 5174, 8799, 8787)
foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    if ($c.OwningProcess) {
      Write-Host "Stopping PID $($c.OwningProcess) on port $port"
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}

Get-Process -Name "electron","Marketing IDE" -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "Stopping $($_.ProcessName) PID $($_.Id)"
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "Done. Start server: cd server; npm run dev"
Write-Host "Then desktop: cd desktop; npm run dev"
