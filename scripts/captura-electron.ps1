# Compila la biblioteca para Electron, la abre en la ventana nativa y guarda una captura real del
# contenido de la ventana en evidencias/capturas/e07-electron-ventana.png (modo --captura de main.cjs).
# Uso: pwsh scripts/captura-electron.ps1
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
Set-Location $raiz
$salida = Join-Path $raiz 'evidencias\capturas\e07-electron-ventana.png'
npm run build:electron | Out-Null
npx electron . "--captura=$salida"
if (Test-Path $salida) { "Captura guardada: $salida" } else { throw 'No se generó la captura.' }
