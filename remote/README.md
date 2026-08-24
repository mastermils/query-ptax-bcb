# query-ptax-bcb (remote)

Versão remota do servidor MCP [@mastermils/query-ptax-bcb](../README.md),
rodando em Cloudflare Workers, para uso como custom connector no Claude web
(`claude.ai → Settings → Connectors → Add custom connector`).

O Claude.ai sempre tenta autenticação OAuth 2.1 com qualquer servidor MCP
remoto (descoberta + registro dinâmico de client) — não há como usar um
bearer token simples via header ou query string com o formulário de
connectors dele. Por isso este servidor implementa um provedor OAuth mínimo
de usuário único, via [`@cloudflare/workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider):
qualquer client pode se registrar dinamicamente, mas completar a autorização
exige passar por uma tela de login com senha pessoal antes de um token de
acesso ser emitido.

## Usar no Claude.ai

1. **Settings → Connectors → Add custom connector**
2. **Remote MCP server URL**: `https://query-ptax-bcb.edmilson-santana.workers.dev/mcp`
3. Deixe OAuth Client ID/Secret em branco — o registro é feito dinamicamente
4. Ao clicar **Add**, o Claude.ai abre a tela de login do próprio servidor —
   digite a senha de acesso pessoal para autorizar

## Deploy

```bash
cd remote
npm install
npx wrangler kv namespace create OAUTH_KV   # uma vez; cole o id retornado em wrangler.jsonc
npx wrangler secret put AUTH_PASSCODE       # define a senha de login
npx wrangler deploy
```

## Desenvolvimento local

```bash
npm install
npm run typecheck
npx wrangler dev
```
