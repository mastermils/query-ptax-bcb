# query-ptax-bcb

Servidor MCP (Model Context Protocol) que expõe a cotação oficial do Dólar
PTAX consultando diretamente a API de dados abertos do Banco Central do
Brasil (BCB): https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/

## Tools

- **`get_ptax_by_date(date)`** — cotação de fechamento PTAX para uma data
  específica (`YYYY-MM-DD`).
- **`get_ptax_by_period(startDate, endDate)`** — série de cotações de
  fechamento entre duas datas.
- **`get_ptax_latest(lookbackDays?)`** — cotação de fechamento mais recente
  disponível (busca nos últimos `lookbackDays` dias, padrão 7).

Todas as cotações retornadas são o boletim de **fechamento** (PTAX oficial),
com compra, venda e horário da cotação (horário de Brasília).

## Build

```bash
npm install
npm run build
```

## Testar com o MCP Inspector

```bash
npm run inspector
```

## Configurar no Claude Desktop / Claude Code

Adicione ao arquivo de configuração MCP (`claude_desktop_config.json` ou
equivalente):

```json
{
  "mcpServers": {
    "query-ptax-bcb": {
      "command": "node",
      "args": ["D:/GitHub/master-mils/query-ptax-bcb/dist/index.js"]
    }
  }
}
```
