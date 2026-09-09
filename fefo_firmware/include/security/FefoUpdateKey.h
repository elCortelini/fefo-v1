#pragma once

namespace fefo {

// Chave pública da cadeia de atualização FEFO. A chave privada permanece
// fora do repositório e é usada somente pelo processo de release.
inline constexpr char kFefoUpdatePublicKeyPem[] = R"KEY(-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwjEBYsAzRNBSzaaXmjbm
Cy+nMbkEDa13BVIH7T9EgYTBK6onDEmutxzbHSnd9+O35r1nxJZkcGYpHLrb5fBU
gc44Txe3HUYdhy4OzezOn0PbdTILNVNEc9nXtRwSaHaGgZucfy1VI4luF39xmX9F
Y9zYhYeJSXB537dQ1PkfPikUT+k8YZOYG6/x3bwBywgivfq2eMFpHkpDjoneHaRp
iz9sjC4xA4mxqyxmOSkTbWWAPkd2xF1E+vAduGo6q8VSZImuvBezf1QNvXSUT9us
W/avA55BICkDIc+lfJY/ohvsoLKdhxnYlVVs81NIdxSL2TYvoEKbYxd6k7bGIbp+
CQIDAQAB
-----END PUBLIC KEY-----
)KEY";

}  // namespace fefo
