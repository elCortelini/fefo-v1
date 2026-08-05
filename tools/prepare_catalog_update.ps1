param(
    [Parameter(Mandatory = $true)] [string]$Source,
    [Parameter(Mandatory = $true)] [int]$StartNumber,
    [Parameter(Mandatory = $true)] [string]$Menu
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$destination = Join-Path $root 'sdcard\usr\a'
$manifestPath = Join-Path $root 'sdcard\fefo.json'
$extensions = @('.wav', '.mp3', '.mpeg', '.mpg', '.flac', '.ogg', '.m4a')
$files = @(Get-ChildItem -LiteralPath $Source -File | Where-Object {
    $_.Extension.ToLowerInvariant() -in $extensions
} | Sort-Object Name)
if ($files.Count -eq 0) { throw 'Nenhum arquivo de audio encontrado.' }

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 |
    ConvertFrom-Json
$newItems = @()
for ($index = 0; $index -lt $files.Count; $index++) {
    $number = $StartNumber + $index
    $name = 'a{0:D4}.wav' -f $number
    $output = Join-Path $destination $name
    & ffmpeg -hide_banner -loglevel error -y -i $files[$index].FullName `
        -vn -ac 1 -ar 22050 -c:a pcm_s16le $output
    if ($LASTEXITCODE -ne 0) { throw "Falha: $($files[$index].Name)" }
    $generated = Get-Item -LiteralPath $output
    $newItems += [pscustomobject][ordered]@{
        id = 'au{0:D3}' -f $number
        titulo = $files[$index].BaseName
        menu = $Menu
        arquivo = "/usr/a/$name"
        tamanho = $generated.Length
        checksum = (Get-FileHash $output -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}
$manifest.audio = @($manifest.audio) + $newItems
$manifest.catalogVersion = [int]$manifest.catalogVersion + 1
$manifest | ConvertTo-Json -Depth 10 |
    Set-Content -LiteralPath $manifestPath -Encoding UTF8
$newItems | ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath (Join-Path $root 'repository\pending-update.json') -Encoding UTF8
$newItems | Format-Table id,titulo,menu,arquivo,tamanho -AutoSize
