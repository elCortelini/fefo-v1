param(
    [string]$Source = (Join-Path $PSScriptRoot '..\audiosFEFO'),

    [string]$Destination = (Join-Path $PSScriptRoot '..\sdcard\usr\a'),

    [switch]$Recurse
)

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Pasta de origem nao encontrada: $Source"
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

$sourceFiles = if ($Recurse) {
    Get-ChildItem -LiteralPath $Source -File -Recurse
} else {
    Get-ChildItem -LiteralPath $Source -File
}

$sourceFiles | Where-Object {
    $_.Extension -in '.wav', '.mp3', '.flac', '.ogg', '.m4a'
} | ForEach-Object {
    $output = Join-Path $Destination ($_.BaseName + '.wav')
    Write-Output "Convertendo: $($_.Name) -> $output"
    & ffmpeg -y -i $_.FullName -ac 1 -ar 22050 -c:a pcm_s16le $output
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao converter $($_.FullName)"
    }
}

Write-Output 'Conversao WAV 22,05 kHz/mono/16-bit concluida.'
