import jwt from 'jsonwebtoken';

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEAsQ9hmcCTuAd9j1tTZfgvFEyNfN66UUy86m7Rzcc15YTqx0gm
L127+7Kf2GQsAEonVi6QFCueT+QSqdplbJ5OuQxJzlM083eNgdiqzRigVtIrfTeY
kwzkUC/Q4dGPoKNSBT9pr95cVFqu038qH0l9ruJgbOYW/gUJjPHCyNiYMCSLmlz/
nPHo2tliBRGAyqXuAlcNa9KKrm3aSmEmeytNaTMoi4F3v3MlDPS1F1QO1lOeKtPQ
Xddim4D9ohd/iTtnRktSfaxxPPR9U7rzl50IO/tSIYXirYNCaNHDoT7tLYaL2CMa
C+VGgaHBLtLm/ye3Ro2ZXMDFthgeF4c2lfglVwIDAQABAoIBAA6IR6d58eXh34Fb
qo2tABg3bEl6cmpn1P2c2OV920OaVDbFCjVLCTnQYGQ/XIktjOr66WJubhD6lDmS
rk5q8+UmSAyCMc9l2Zx1rxckVUyq9VzSqlgvb7HRKuDN9W7m2L2Lhd4kbwmRY9YC
Eu/8dS9cbzOg8vQob688zJL1jBAvXL6bd0FEQ0aWxwMhLVnRticaay7EngE69O3E
M9Z+bM9tvZ80qDL3/8Ga17QpHxeKBRHoXPA9QdCqcZexDvrb76m99+6O2JCRaZAL
AhhQ1IiIKoUF+nwvKQuefO3O8uxhYHgDtjTWkaTKfwF/s2sWX2Yb1Xv7b30B3thm
c1RigykCgYEA1whCqI8N1023wODDoiR6fwhlkELyga6ZhjL/j0rVh20jQiuQTdV8
Lh9R+MW2GVOjvTLaZHnjQgpSikh0BUWiwK46XvyTDwLKwq4OMbS5K67h9/BDTABA
Gb5WEIF+Ocx+02GGmJws4wYQVD2IF9n6EHubvZYh9jI4nt+YKLGNuUMCgYEA0ssb
0m092Yq/zFw3YhmH6DQGy/bFD5837pb4bhVWbNnRH30B/gD9c0I6BHgIUPOqkSjU
yFV//7tiOAsgqVZBrKdQN5WG41+ej/uNVvpngnD8dhKWO2L8wjW2pAXqc7txDMdR
0o4wrfKjSEvsGqMSBlXnXCQ9FLGLdKPcB7aLSF0CgYAWCf2zAv57K7cCqMbETpLT
hEvMjmAGlJudmoqA6D2cZL4xYP+oSpIws/sV0UXJsL3efWDO3YNCWIZ/L8/cXnfA
4dqPs7lq13FqpKZFx+0WohT88X4kQv5O5SgzBuKmD+SLy7oc2Bzto8h2qdvR/gBY
QiMDOmj+r8UH24jf2trYuwKBgBFSARo8Qa3DWdkn5qEX6fPpenl98FlFQupG22jo
Ne7Bww4sTmKZoDm9Qlklp8FHFEfTLBC9/cN8mShzuZ5QaRsPsGaw0aGTNMst50Iz
Vxf/wq7M/i0pCA3JLhWyKr6Rs0tSgWWkq1lPq50AKAlURuHgYx9OFvrBT+0onabA
mBc9AoGAPyEghp9G40/IXEI7uUfJoPxCXuxIA7ABuAztKQI1hPTNo6djIUSEXcnU
GC97zHKnqF++PKdboEHATIgZBhBv33bK61CVvPp9+SF1fPXECNut3r0rZ5xiUtTk
i3vP8HHaJqBthAKLAGJFdjHaZLMa+2Gbfy9H9Y7B3cuLHlH0rLE=
-----END RSA PRIVATE KEY-----`;

const generateJwt = (address: string) => {
    const token = jwt.sign(
        {
            iss: 'CyberConnect',
            exp: Math.floor(new Date(Date.now() + 1000 * 3600 * 24 * 365).getTime() / 1000),
            iat: Math.floor(Date.now() / 1000),
            api_id: '87fffd6e-3b60-45ea-8562-2c05151d3404',
            sender: address,
        },
        privateKey,
        { algorithm: 'RS256' }
    );
    return token;
};

export default generateJwt;
