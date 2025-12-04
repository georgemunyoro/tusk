import importlib.util
import os
import subprocess
import tempfile
import re
from dataclasses import dataclass, field
from typing import List
import sys
import string
import secrets
from antlr4 import InputStream

from antlr4 import CommonTokenStream, InputStream
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)

CORS(app)

ANTLR_JAR = "/home/george/workspace/tusk/api/vendor/antlr-4.13.2-complete.jar"


def load_module(path):
    name = gensym()
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise ValueError("failed to load spec: " + path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    sys.modules[name] = module
    return name, module


def extract_grammar_name(grammar: str) -> str:
    regex = r"^\s*(?:lexer|parser)?\s*grammar\s+([A-Za-z_][A-Za-z0-9_]*)"
    match = re.search(regex, grammar, re.MULTILINE)
    if not match:
        raise ValueError("count not determine grammar name")
    return match.group(1)


def gensym(length=32, prefix="gensym_"):
    """
    generates a fairly unique symbol, used to make a module name,
    used as a helper function for load_module

    :return: generated symbol
    """
    alphabet = string.ascii_uppercase + string.ascii_lowercase + string.digits
    symbol = "".join([secrets.choice(alphabet) for i in range(length)])

    return prefix + symbol


@dataclass
class ParseResponse:
    grammar_name: str = ""
    errors: List[str] = field(default_factory=list)
    rules: List[str] = field(default_factory=list)
    string_tree: str = ""

    def to_json(self):
        return jsonify(
            {
                "grammar_name": self.grammar_name,
                "errors": self.errors,
                "rules": self.rules,
                "string_tree": self.string_tree,
            }
        )


@app.post("/parse")
def run():
    grammar: str = request.json["grammar"]
    source: str = request.json["source"]
    rule: str = request.json["rule"]

    try:
        grammar_name = extract_grammar_name(grammar)
    except:
        return ParseResponse(errors=["failed to get grammar name"]).to_json()

    session = tempfile.mkdtemp(prefix="tusk_")
    grammar_path = os.path.join(session, f"{grammar_name}.g4")
    open(grammar_path, "w").write(grammar)

    cmd = ["java", "-jar", ANTLR_JAR, "-Dlanguage=Python3", f"{grammar_name}.g4"]
    p = subprocess.Popen(
        cmd, cwd=session, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    out, err = p.communicate()

    errors = err.decode().splitlines()

    if len(errors) > 0:
        return ParseResponse(
            grammar_name=grammar_name,
            errors=errors,
        ).to_json()

    parser_module_path = os.path.join(session, f"{grammar_name}Parser.py")
    lexer_module_path = os.path.join(session, f"{grammar_name}Lexer.py")

    try:
        parser_module_name, parser_module = load_module(parser_module_path)
        lexer_module_name, lexer_module = load_module(lexer_module_path)

        Parser = getattr(parser_module, f"{grammar_name}Parser")
        Lexer = getattr(lexer_module, f"{grammar_name}Lexer")
    except:
        return ParseResponse(
            errors=["failed to load generated modules"] + errors,
        ).to_json()

    response = ParseResponse(
        grammar_name=grammar_name,
        errors=errors,
    )

    try:
        lexer = Lexer(InputStream(source))
        stream = CommonTokenStream(lexer)
        parser = Parser(stream)
        response.rules = parser.ruleNames

    except Exception as e:
        response.errors = [str(e)] + response.errors
        return response.to_json()

    try:
        tree = getattr(parser, rule)()
        response.string_tree = tree.toStringTree(recog=parser)
        print(response.string_tree)

    except Exception as e:
        response.errors = [str(e)] + response.errors
        return response.to_json()

    return response.to_json()
