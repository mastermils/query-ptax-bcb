# @mastermils/query-ptax-bcb

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

## Uso

Adicione ao arquivo de configuração MCP (`claude_desktop_config.json` ou
equivalente) do Claude Desktop, Claude Code, ou qualquer outro cliente MCP
compatível com servidores stdio:

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

`npx` sempre executa a versão publicada mais recente, sem necessidade de
instalar ou buildar nada manualmente.

### Testar com o MCP Inspector

```bash
npx -y @modelcontextprotocol/inspector npx -y @mastermils/query-ptax-bcb
```

## Também disponível como servidor remoto

Existe uma instância hospedada (Cloudflare Workers, com autenticação OAuth)
para uso como custom connector no Claude web. Detalhes de deploy e uso em
[github.com/mastermils/query-ptax-bcb](https://github.com/mastermils/query-ptax-bcb/tree/main/remote).

## Código-fonte e contribuições

Repositório: https://github.com/mastermils/query-ptax-bcb

```bash
git clone https://github.com/mastermils/query-ptax-bcb.git
cd query-ptax-bcb
npm install
npm run build
```

## Licença

MIT
