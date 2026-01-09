import importlib.util
import logging
import os
import re
import secrets
import string
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from typing import Iterable, List, Tuple
from pathlib import Path

from antlr4 import CommonTokenStream, InputStream
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("tusk.api")


def _cors_allowed_origins():
    raw = os.getenv("CORS_ALLOWED_ORIGINS", "")
    if not raw:
        return "*"
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or "*"


app.config["CORS_HEADERS"] = "Content-Type"
CORS(app, resources={r"/*": {"origins": _cors_allowed_origins()}})

ANTLR_JAR = Path.cwd() / "vendor" / "antlr-4.13.2-complete.jar"
ANTLR_LANGUAGE = "Python3"


def load_module(path: str) -> Tuple[str, object]:
    name = gensym()
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise ValueError(f"Failed to load spec: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    sys.modules[name] = module
    return name, module


def extract_grammar_name(grammar: str) -> str:
    regex = r"^\s*(?:lexer|parser)?\s*grammar\s+([A-Za-z_][A-Za-z0-9_]*)"
    match = re.search(regex, grammar, re.MULTILINE)
    if not match:
        raise ValueError("Could not determine grammar name")
    return match.group(1)


def gensym(length: int = 32, prefix: str = "gensym_") -> str:
    alphabet = string.ascii_uppercase + string.ascii_lowercase + string.digits
    symbol = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}{symbol}"


def _build_parse_response(
    *,
    grammar_name: str = "",
    errors: Iterable[str] | None = None,
    rules: Iterable[str] | None = None,
    string_tree: str = "",
) -> "ParseResponse":
    return ParseResponse(
        grammar_name=grammar_name,
        errors=list(errors or []),
        rules=list(rules or []),
        string_tree=string_tree,
    )


def _json_error(
    message: str,
    *,
    grammar_name: str = "",
    extra: Iterable[str] | None = None,
    status_code: int = 400,
):
    errors = [message] + list(extra or [])
    return _build_parse_response(
        grammar_name=grammar_name,
        errors=errors,
    ).to_json(status_code)


@dataclass
class ParseResponse:
    grammar_name: str = ""
    errors: List[str] = field(default_factory=list)
    rules: List[str] = field(default_factory=list)
    string_tree: str = ""

    def to_json(self, status_code: int = 200):
        return (
            jsonify(
                {
                    "grammar_name": self.grammar_name,
                    "errors": self.errors,
                    "rules": self.rules,
                    "string_tree": self.string_tree,
                }
            ),
            status_code,
        )


def _write_grammar_file(grammar: str, grammar_name: str, session: str) -> str:
    grammar_path = os.path.join(session, f"{grammar_name}.g4")
    with open(grammar_path, "w", encoding="utf-8") as handle:
        handle.write(grammar)
    return grammar_path


def _run_antlr(session: str, grammar_name: str) -> List[str]:
    cmd = [
        "java",
        "-jar",
        str(ANTLR_JAR),
        f"-Dlanguage={ANTLR_LANGUAGE}",
        f"{grammar_name}.g4",
    ]
    process = subprocess.Popen(
        cmd, cwd=session, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    _, err = process.communicate()
    return err.decode().splitlines()


def _load_generated_classes(session: str, parser_name: str, lexer_name: str):
    parser_module_path = os.path.join(session, f"{parser_name}.py")
    lexer_module_path = os.path.join(session, f"{lexer_name}.py")

    logger.debug("Loading parser module from %s", parser_module_path)
    logger.debug("Loading lexer module from %s", lexer_module_path)

    parser_module_name, parser_module = load_module(parser_module_path)
    lexer_module_name, lexer_module = load_module(lexer_module_path)
    del parser_module_name, lexer_module_name

    parser_cls = getattr(parser_module, f"{parser_name}")
    lexer_cls = getattr(lexer_module, f"{lexer_name}")
    return parser_cls, lexer_cls


def _parse_request_json():
    return request.get_json(silent=True) or {}


def _clean_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed if trimmed else None


@app.post("/parse")
def parse():
    payload = _parse_request_json()
    grammar = _clean_text(payload.get("grammar"))
    lexer_grammar = _clean_text(payload.get("lexer"))
    parser_grammar = _clean_text(payload.get("parser"))
    source = _clean_text(payload.get("source")) or ""
    rule = _clean_text(payload.get("rule")) or ""

    if grammar and (lexer_grammar or parser_grammar):
        return _json_error("Provide either grammar or lexer+parser inputs, not both")

    use_split = lexer_grammar is not None or parser_grammar is not None
    if grammar is None and not use_split:
        return _json_error("Missing required fields: grammar or lexer+parser")

    if use_split and (lexer_grammar is None or parser_grammar is None):
        return _json_error("Missing required fields: lexer, parser")

    try:
        if grammar:
            grammar_name = extract_grammar_name(grammar)
            lexer_name = grammar_name
            parser_name = grammar_name
        else:
            lexer_name = extract_grammar_name(lexer_grammar or "")
            parser_name = extract_grammar_name(parser_grammar or "")
            grammar_name = parser_name
    except ValueError as exc:
        return _json_error(str(exc))

    if not ANTLR_JAR.exists():
        logger.error("ANTLR jar not found at %s", ANTLR_JAR)
        return _json_error("ANTLR jar not found on server", status_code=500)

    session = tempfile.mkdtemp(prefix="tusk_")
    if grammar:
        _write_grammar_file(grammar, grammar_name, session)
    else:
        _write_grammar_file(lexer_grammar or "", lexer_name, session)
        _write_grammar_file(parser_grammar or "", parser_name, session)

    if grammar:
        errors = _run_antlr(session, grammar_name)
        if len(errors) > 0:
            return _build_parse_response(
                grammar_name=grammar_name,
                errors=errors,
            ).to_json(400)
    else:
        lexer_errors = _run_antlr(session, lexer_name)
        if len(lexer_errors) > 0:
            return _build_parse_response(
                grammar_name=lexer_name,
                errors=lexer_errors,
            ).to_json(400)

        parser_errors = _run_antlr(session, parser_name)
        if len(parser_errors) > 0:
            return _build_parse_response(
                grammar_name=parser_name,
                errors=parser_errors,
            ).to_json(400)

    try:
        Parser, Lexer = _load_generated_classes(session, parser_name, lexer_name)
    except (OSError, ValueError, AttributeError) as exc:
        logger.exception("Failed to load generated modules")
        return _json_error(
            "Failed to load generated modules",
            status_code=500,
        )

    response = _build_parse_response(grammar_name=grammar_name, errors=[])

    try:
        lexer = Lexer(InputStream(source))
        stream = CommonTokenStream(lexer)
        parser = Parser(stream)
        response.rules = parser.ruleNames
    except Exception as exc:
        logger.warning("Failed to build parser: %s", exc)
        response.errors = [str(exc)] + response.errors
        return response.to_json(400)

    if rule not in response.rules:
        response.errors = [f"Unknown rule '{rule}'"] if rule else ["No rule specified"]
        return response.to_json(200)

    try:
        tree = getattr(parser, rule)()
        response.string_tree = tree.toStringTree(recog=parser)
    except Exception as exc:
        logger.warning("Failed to parse rule '%s': %s", rule, exc)
        response.errors = [str(exc)] + response.errors
        return response.to_json(400)

    return response.to_json()
