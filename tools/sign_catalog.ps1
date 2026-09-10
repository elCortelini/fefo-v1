param([Parameter(Mandatory=$true)][string]$Catalog,[Parameter(Mandatory=$true)][string]$PrivateKey)
$ErrorActionPreference='Stop'
$raw=[IO.File]::ReadAllText($Catalog,[Text.Encoding]::UTF8);$obj=$raw|ConvertFrom-Json
$obj.PSObject.Properties.Remove('assinaturaCatalogo');$obj.PSObject.Properties.Remove('assinaturaCatalogoCanonica')
$canonical=$obj|ConvertTo-Json -Compress -Depth 100;$bytes=[Text.Encoding]::UTF8.GetBytes($canonical)
$rsa=[Security.Cryptography.RSA]::Create();$rsa.ImportFromPem([IO.File]::ReadAllText($PrivateKey));$sig=[Convert]::ToBase64String($rsa.SignData($bytes,[Security.Cryptography.HashAlgorithmName]::SHA256,[Security.Cryptography.RSASignaturePadding]::Pkcs1))
$obj|Add-Member NoteProperty assinaturaCatalogoCanonica $sig;$obj|Add-Member NoteProperty assinaturaCatalogo $sig
$out=$obj|ConvertTo-Json -Depth 100;[IO.File]::WriteAllText($Catalog,$out+"`n",[Text.UTF8Encoding]::new($false));[IO.File]::WriteAllText("$Catalog.sig",$sig,[Text.UTF8Encoding]::new($false));Write-Output 'Catálogo assinado.'
