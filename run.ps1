$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$python = if ($env:PYTHON) { $env:PYTHON } else { "python" }
& $python -m backend.server
