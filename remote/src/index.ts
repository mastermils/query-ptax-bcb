import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { fetchPtaxDay, fetchPtaxPeriod, fetchPtaxLatest } from "./bcbClient.js";
import type { PtaxQuote } from "./types.js";

type Env = {
  MCP_OBJECT: DurableObjectNamespace;
  AUTH_TOKEN: string;
};

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

export class PtaxMcp extends McpAgent<Env, {}, {}> {
  server = new McpServer({
    name: "query-ptax-bcb",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
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

    this.server.tool(
      "get_ptax_by_period",
      "Get the official closing USD/BRL PTAX exchange rate series (Banco Central do Brasil) for each business day in a date range.",
      {
        startDate: isoDateSchema.describe("Start date in YYYY-MM-DD format"),
        endDate: isoDateSchema.describe("End date in YYYY-MM-DD format"),
      },
      async ({ startDate, endDate }) => {
        if (startDate > endDate) {
          return errorResult(
            new Error(`startDate (${startDate}) must not be after endDate (${endDate})`),
          );
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

    this.server.tool(
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
  }
}

function isAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get("Authorization") ?? "";
  const [scheme, headerToken] = header.split(" ");
  if (scheme === "Bearer" && headerToken === env.AUTH_TOKEN) {
    return true;
  }
  // Fallback for clients that can't send custom headers (e.g. the Claude.ai
  // "Add custom connector" form only accepts a URL, no header field).
  const queryToken = new URL(request.url).searchParams.get("token");
  return queryToken === env.AUTH_TOKEN;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!env.AUTH_TOKEN) {
      return new Response("Server misconfigured: AUTH_TOKEN not set", { status: 500 });
    }
    if (!isAuthorized(request, env)) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" },
      });
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith("/mcp")) {
      return PtaxMcp.serve("/mcp", { binding: "MCP_OBJECT" }).fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
