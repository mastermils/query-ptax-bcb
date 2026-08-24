#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchPtaxDay, fetchPtaxPeriod, fetchPtaxLatest } from "./bcbClient.js";
import type { PtaxQuote } from "./types.js";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

function quoteText(quote: PtaxQuote): string {
  return (
    `PTAX ${quote.date}: compra R$ ${quote.buyRate.toFixed(4)}, ` +
    `venda R$ ${quote.sellRate.toFixed(4)} (boletim de fechamento, ${quote.quotedAt} BRT)`
  );
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

const server = new McpServer({
  name: "query-ptax-bcb",
  version: "1.0.0",
});

server.tool(
  "get_ptax_by_date",
  "Get the official closing USD/BRL PTAX exchange rate (Banco Central do Brasil) for a specific date.",
  { date: isoDateSchema.describe("Date in YYYY-MM-DD format") },
  async ({ date }) => {
    try {
      const quote = await fetchPtaxDay(date);
      if (!quote) {
        return {
          content: [
            {
              type: "text",
              text: `No PTAX quote available for ${date}. This is likely a weekend, a holiday, or the bulletin has not been published yet (PTAX is published around 13:00 BRT).`,
            },
          ],
        };
      }
      return {
        content: [
          { type: "text", text: quoteText(quote) },
          { type: "text", text: JSON.stringify(quote) },
        ],
      };
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_ptax_by_period",
  "Get the official closing USD/BRL PTAX exchange rate series (Banco Central do Brasil) for each business day in a date range.",
  {
    startDate: isoDateSchema.describe("Start date in YYYY-MM-DD format"),
    endDate: isoDateSchema.describe("End date in YYYY-MM-DD format"),
  },
  async ({ startDate, endDate }) => {
    if (startDate > endDate) {
      return errorResult(new Error(`startDate (${startDate}) must not be after endDate (${endDate})`));
    }
    try {
      const quotes = await fetchPtaxPeriod(startDate, endDate);
      if (quotes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No PTAX quotes available between ${startDate} and ${endDate} (no business days with a published bulletin in this range).`,
            },
          ],
        };
      }
      return {
        content: [
          { type: "text", text: quotes.map(quoteText).join("\n") },
          { type: "text", text: JSON.stringify(quotes) },
        ],
      };
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "get_ptax_latest",
  "Get the most recent official closing USD/BRL PTAX exchange rate (Banco Central do Brasil).",
  {
    lookbackDays: z
      .number()
      .int()
      .positive()
      .max(60)
      .optional()
      .describe("How many days back to search for the latest published quote (default 7)"),
  },
  async ({ lookbackDays }) => {
    try {
      const quote = await fetchPtaxLatest(lookbackDays ?? 7);
      if (!quote) {
        return {
          content: [
            {
              type: "text",
              text: `No PTAX quote found in the last ${lookbackDays ?? 7} day(s). Try increasing lookbackDays.`,
            },
          ],
        };
      }
      return {
        content: [
          { type: "text", text: quoteText(quote) },
          { type: "text", text: JSON.stringify(quote) },
        ],
      };
    } catch (err) {
      return errorResult(err);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting query-ptax-bcb MCP server:", err);
  process.exit(1);
});
