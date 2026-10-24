$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
    Copy-Item -LiteralPath (Join-Path $projectRoot '.env.example') -Destination $envPath
}
$content = [IO.File]::ReadAllText($envPath)
foreach ($setting in @('JWT_SECRET', 'WORKER_SECRET')) {
    $pattern = '(?m)^' + $setting + '=(.*)$'
    $match = [regex]::Match($content, $pattern)
    $value = $match.Groups[1].Value.Trim()
    if ($value.Length -lt 32 -or $value.StartsWith('CodeMind_Super_Secret')) {
        $bytes = New-Object byte[] 48
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $replacement = $setting + '=' + [Convert]::ToBase64String($bytes)
        if ($match.Success) { $content = [regex]::Replace($content, $pattern, $replacement) }
        else { $content += "`n" + $replacement + "`n" }
    }
}
[IO.File]::WriteAllText($envPath, $content, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Environment prepared. Secrets were not printed.'
