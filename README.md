# @mastermils/query-ptax-bcb

Servidor MCP (Model Context Protocol) que expõe a cotação oficial do Dólar
PTAX consultando diretamente a API de dados abertos do Banco Central do
Brasil (BCB): https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/

Pacote publicado no npm: https://www.npmjs.com/package/@mastermils/query-ptax-bcb

## Tools

- **`get_ptax_by_date(date)`** — cotação de fechamento PTAX para uma data
  específica (`YYYY-MM-DD`).
- **`get_ptax_by_period(startDate, endDate)`** — série de cotações de
  fechamento entre duas datas.
- **`get_ptax_latest(lookbackDays?)`** — cotação de fechamento mais recente
  disponível (busca nos últimos `lookbackDays` dias, padrão 7).

Todas as cotações retornadas são o boletim de **fechamento** (PTAX oficial),
com compra, venda e horário da cotação (horário de Brasília).

## Configurar no Claude Desktop / Claude Code

Adicione ao arquivo de configuração MCP (`claude_desktop_config.json` ou
equivalente), usando `npx` para sempre executar a versão publicada mais
recente sem precisar instalar/buildar localmente:

```json
{
  "mcpServers": {
    "query-ptax-bcb": {
      "command": "npx",
      "args": ["-y", "@mastermils/query-ptax-bcb"]
    }
  }
}
```

## Versão remota (Claude web / connectors)

Além do servidor local (stdio), existe uma instância remota rodando em
Cloudflare Workers, para uso como custom connector no Claude web
(`claude.ai → Settings → Connectors → Add custom connector`). O Claude.ai
sempre tenta autenticação OAuth 2.1 com qualquer servidor MCP remoto (com
descoberta + registro dinâmico de client), então o servidor implementa um
provedor OAuth mínimo de usuário único: qualquer client pode se registrar,
mas a autorização exige uma senha pessoal em uma tela de login antes de
emitir um token de acesso.

- **Remote MCP server URL**: `https://query-ptax-bcb.edmilson-santana.workers.dev/mcp`
- Ao adicionar o connector, o Claude.ai abre a tela de login do servidor —
  digite a senha de acesso (não está neste repositório) para autorizar.
- Não é necessário preencher OAuth Client ID/Secret — o registro é feito
  dinamicamente pelo próprio Claude.ai.

Código-fonte em [remote/](remote/). Deploy:

```bash
cd remote
npm install
npx wrangler kv namespace create OAUTH_KV   # uma vez, e cole o id no wrangler.jsonc
npx wrangler secret put AUTH_PASSCODE       # define a senha de login
npx wrangler deploy
```

## Testar com o MCP Inspector

```bash
npx -y @modelcontextprotocol/inspector npx -y @mastermils/query-ptax-bcb
```

## Desenvolvimento local

```bash
npm install
npm run build
npm run inspector
```

## Publicação

Publicado automaticamente via GitHub Actions ([.github/workflows/publish.yml](.github/workflows/publish.yml))
usando npm Trusted Publisher (OIDC), disparado ao criar uma GitHub Release ou
manualmente pela aba Actions.
