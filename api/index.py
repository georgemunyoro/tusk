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
        raise ValueError(f"failed to load spec: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    sys.modules[name] = module
    return name, module


def extract_grammar_name(grammar: str) -> str:
    regex = r"^\s*(?:lexer|parser)?\s*grammar\s+([A-Za-z_][A-Za-z0-9_]*)"
    match = re.search(regex, grammar, re.MULTILINE)
    if not match:
        raise ValueError("could not determine grammar name")
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


def _load_generated_classes(session: str, grammar_name: str):
    parser_module_path = os.path.join(session, f"{grammar_name}Parser.py")
    lexer_module_path = os.path.join(session, f"{grammar_name}Lexer.py")

    parser_module_name, parser_module = load_module(parser_module_path)
    lexer_module_name, lexer_module = load_module(lexer_module_path)
    del parser_module_name, lexer_module_name

    parser_cls = getattr(parser_module, f"{grammar_name}Parser")
    lexer_cls = getattr(lexer_module, f"{grammar_name}Lexer")
    return parser_cls, lexer_cls


def _parse_request_json():
    payload = request.get_json(silent=True) or {}
    return payload.get("grammar"), payload.get("source"), payload.get("rule")


@app.post("/parse")
def run():
    grammar, source, rule = _parse_request_json()
    if grammar is None or source is None or rule is None:
        return _json_error("missing required fields: grammar, source, rule")

    try:
        grammar_name = extract_grammar_name(grammar)
    except ValueError as exc:
        return _json_error(str(exc))

    if not ANTLR_JAR.exists():
        logger.error("ANTLR jar not found at %s", ANTLR_JAR)
        return _json_error("antlr jar not found on server", status_code=500)

    session = tempfile.mkdtemp(prefix="tusk_")
    _write_grammar_file(grammar, grammar_name, session)

    errors = _run_antlr(session, grammar_name)

    if len(errors) > 0:
        return _build_parse_response(
            grammar_name=grammar_name,
            errors=errors,
        ).to_json(400)

    try:
        Parser, Lexer = _load_generated_classes(session, grammar_name)
    except (OSError, ValueError, AttributeError) as exc:
        logger.exception("Failed to load generated modules")
        return _json_error(
            "failed to load generated modules",
            extra=[str(exc)],
            status_code=500,
        )

    response = _build_parse_response(grammar_name=grammar_name, errors=errors)

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
        return _build_parse_response(
            grammar_name=grammar_name,
            errors=[f"unknown rule '{rule}'"],
            rules=response.rules,
        ).to_json(400)

    try:
        tree = getattr(parser, rule)()
        response.string_tree = tree.toStringTree(recog=parser)
    except Exception as exc:
        logger.warning("Failed to parse rule '%s': %s", rule, exc)
        response.errors = [str(exc)] + response.errors
        return response.to_json(400)

    return response.to_json()
