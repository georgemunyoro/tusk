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

export function useParse({ grammar, source, rule }: UseParseParams) {
  return useQuery<ParseResponse>({
    queryKey: ["parseinfo", grammar, source, rule],
    queryFn: async () =>
      fetch(`${import.meta.env.VITE_API_URL}/parse`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grammar, source, rule }),
      }).then((res) => res.json()),
  });
}
