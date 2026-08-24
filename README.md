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
(`claude.ai → Settings → Connectors → Add custom connector`), protegida por
autenticação Bearer token pessoal:

- **Remote MCP server URL**: `https://query-ptax-bcb.edmilson-santana.workers.dev/mcp`
- Autenticação via token pessoal (não está neste repositório), aceito de duas formas:
  - Header `Authorization: Bearer <token>` (clientes que suportam headers
    customizados, como Claude Desktop/Code)
  - Query param `?token=<token>` na própria URL — necessário para o formulário
    "Add custom connector" do Claude.ai, que só aceita uma URL (sem campo de
    header) e não usa OAuth aqui

No Claude.ai, em **Settings → Connectors → Add custom connector**, cole a URL
já com o token embutido: `https://query-ptax-bcb.edmilson-santana.workers.dev/mcp?token=<seu-token>`,
e deixe OAuth Client ID/Secret em branco.

Código-fonte em [remote/](remote/). Deploy:

```bash
cd remote
npm install
npx wrangler secret put AUTH_TOKEN   # define o token de acesso
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
