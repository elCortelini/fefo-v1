param([Parameter(Mandatory=$true)][string]$Catalog,[Parameter(Mandatory=$true)][string]$PrivateKey)
$ErrorActionPreference='Stop'
$raw=[IO.File]::ReadAllText($Catalog,[Text.Encoding]::UTF8);$obj=$raw|ConvertFrom-Json
$obj.PSObject.Properties.Remove('assinaturaCatalogo');$obj.PSObject.Properties.Remove('assinaturaCatalogoCanonica')
$canonical=$obj|ConvertTo-Json -Compress -Depth 100;$bytes=[Text.Encoding]::UTF8.GetBytes($canonical)
$openssl=(Get-Command openssl -ErrorAction SilentlyContinue).Source;if(-not $openssl){$openssl='C:\Program Files\Git\usr\bin\openssl.exe'}
$tmp=[IO.Path]::GetTempFileName();[IO.File]::WriteAllBytes($tmp,$bytes);$sigFile=[IO.Path]::GetTempFileName();& $openssl dgst -sha256 -sign $PrivateKey -out $sigFile $tmp;if($LASTEXITCODE -ne 0){throw 'OpenSSL não conseguiu assinar o catálogo.'};$sig=[Convert]::ToBase64String([IO.File]::ReadAllBytes($sigFile));Remove-Item -LiteralPath $tmp,$sigFile -Force
$obj|Add-Member NoteProperty assinaturaCatalogoCanonica $sig;$obj|Add-Member NoteProperty assinaturaCatalogo $sig
$out=$obj|ConvertTo-Json -Depth 100;[IO.File]::WriteAllText($Catalog,$out+"`n",[Text.UTF8Encoding]::new($false));[IO.File]::WriteAllText("$Catalog.sig",$sig,[Text.UTF8Encoding]::new($false));Write-Output 'Catálogo assinado.'
