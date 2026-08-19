param(
    [string]$Source = (Join-Path $PSScriptRoot '..\audiosFEFO\musicas'),
    [string]$SdCardRoot = (Join-Path $PSScriptRoot '..\fefo_firmware\sdcard'),
    [string]$Menu = 'Jukebox do Fefo',
    [switch]$RemoveLegacyAudio
)

$ErrorActionPreference = 'Stop'
$audioDestination = Join-Path $SdCardRoot 'usr\a'
$jsonPath = Join-Path $SdCardRoot 'fefo.json'
$extensions = @('.wav', '.mp3', '.flac', '.ogg', '.m4a')

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Pasta de musicas nao encontrada: $Source"
}
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    throw 'ffmpeg nao foi encontrado no PATH.'
}

New-Item -ItemType Directory -Force -Path $audioDestination | Out-Null
$musicFiles = @(Get-ChildItem -LiteralPath $Source -File | Where-Object {
    $_.Extension.ToLowerInvariant() -in $extensions
} | Sort-Object Name)

if ($musicFiles.Count -eq 0) {
    throw "Nenhuma musica encontrada em: $Source"
}

# Remove somente arquivos gerados por este fluxo. Outros conteúdos são preservados,
# a menos que a limpeza explícita dos nomes legados tenha sido solicitada.
Get-ChildItem -LiteralPath $audioDestination -File -Filter 'a????.wav' |
    Remove-Item -Force
if ($RemoveLegacyAudio) {
    Get-ChildItem -LiteralPath $audioDestination -File -Filter 'inf*.wav' |
        Remove-Item -Force
}

$audioItems = @()
for ($index = 0; $index -lt $musicFiles.Count; $index++) {
    $sequence = $index + 1
    $destinationName = 'a{0:D4}.wav' -f $sequence
    $destinationPath = Join-Path $audioDestination $destinationName
    $sourceFile = $musicFiles[$index]

    Write-Output "Convertendo $($sourceFile.Name) -> $destinationName"
    & ffmpeg -hide_banner -loglevel error -y -i $sourceFile.FullName `
        -vn -ac 1 -ar 22050 -c:a pcm_s16le $destinationPath
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao converter: $($sourceFile.FullName)"
    }

    $generatedFile = Get-Item -LiteralPath $destinationPath
    $checksum = (Get-FileHash -LiteralPath $destinationPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $audioItems += [ordered]@{
        id = 'au{0:D3}' -f $sequence
        titulo = $sourceFile.BaseName
        menu = $Menu
        arquivo = "/usr/a/$destinationName"
        tamanho = $generatedFile.Length
        checksum = $checksum
    }
}

$catalog = if (Test-Path -LiteralPath $jsonPath) {
    Get-Content -LiteralPath $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
    [pscustomobject]@{}
}

$catalog | Add-Member -NotePropertyName schema -NotePropertyValue 1 -Force
$catalog | Add-Member -NotePropertyName catalogVersion -NotePropertyValue 2 -Force
$catalog | Add-Member -NotePropertyName menus -NotePropertyValue @(
    [ordered]@{ id = 'jukebox_fefo'; titulo = $Menu }
) -Force
$catalog | Add-Member -NotePropertyName audio -NotePropertyValue $audioItems -Force

$catalog | ConvertTo-Json -Depth 10 |
    Set-Content -LiteralPath $jsonPath -Encoding UTF8

Write-Output "Concluido: $($audioItems.Count) musicas e catalogo $jsonPath"
