import { useQuery } from "@tanstack/react-query";

type ParseResponse = {
  errors: string[];
  grammar_name: string;
  rules: string[];
  string_tree: string;
};

type UseParseParams = {
  grammar: string;
  source: string;
  rule: string;
};

export class ParseError extends Error {
  details: string[];
  status?: number;

  constructor(message: string, details: string[] = [], status?: number) {
    super(message);
    this.name = "ParseError";
    this.details = details;
    this.status = status;
  }
}

async function readResponseBody(response: Response) {
  try {
    return (await response.json()) as ParseResponse;
  } catch {
    return null;
  }
}

export function useParse({ grammar, source, rule }: UseParseParams) {
  return useQuery<ParseResponse>({
    queryKey: ["parseinfo", grammar, source, rule],
    queryFn: async () => {
      let response: Response;
      try {
        response = await fetch(`${import.meta.env.VITE_API_URL}/parse`, {
          method: "post",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grammar, source, rule }),
        });
      } catch (error) {
        throw new ParseError("Network error while contacting API");
      }

      const payload = await readResponseBody(response);
      const details = payload?.errors ?? [];

      if (!response.ok) {
        const message =
          payload?.grammar_name || details.length > 0
            ? "Request failed"
            : `Request failed with status ${response.status}`;
        throw new ParseError(message, details, response.status);
      }

      if (!payload) {
        throw new ParseError("Invalid JSON response from API", [], response.status);
      }

      if (payload.errors.length > 0) {
        throw new ParseError("Parse failed", payload.errors, response.status);
      }

      return payload;
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[parse]", message, error);
    },
  });
}
