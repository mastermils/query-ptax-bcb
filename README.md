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
