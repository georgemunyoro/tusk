import sys
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

import index  # noqa: E402


def _setup_parser(monkeypatch, tmp_path, parser_cls, lexer_cls):
    jar_path = tmp_path / "antlr.jar"
    jar_path.write_text("stub jar")
    monkeypatch.setattr(index, "ANTLR_JAR", jar_path)
    monkeypatch.setattr(index, "_run_antlr", lambda session, name: [])
    monkeypatch.setattr(index, "_load_generated_classes", lambda session, parser, lexer: (parser_cls, lexer_cls))
    monkeypatch.setattr(index, "CommonTokenStream", lambda lexer: lexer)


def _make_dummy_parser(rule_names=None, with_rule_impl=False):
    if rule_names is None:
        rule_names = ["expr"]

    class DummyLexer:
        def __init__(self, stream):
            self.stream = stream

    class DummyTree:
        def toStringTree(self, recog=None):
            return ""

    class DummyParser:
        ruleNames = rule_names

        def __init__(self, stream):
            self.stream = stream

        if with_rule_impl:
            def expr(self):
                return DummyTree()

    return DummyParser, DummyLexer


def test_extract_grammar_name_valid_and_invalid():
    assert index.extract_grammar_name("grammar Expr;") == "Expr"
    assert index.extract_grammar_name(" parser grammar MyParser;") == "MyParser"
    with pytest.raises(ValueError):
        index.extract_grammar_name("no grammar here")


def test_clean_text():
    assert index._clean_text("  hello ") == "hello"
    assert index._clean_text("   ") is None
    assert index._clean_text(123) is None


def test_cors_allowed_origins_default_and_list(monkeypatch):
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    assert index._cors_allowed_origins() == "*"

    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://one, http://two")
    assert index._cors_allowed_origins() == ["http://one", "http://two"]


def test_parse_missing_fields(monkeypatch, tmp_path):
    parser_cls, lexer_cls = _make_dummy_parser()
    _setup_parser(monkeypatch, tmp_path, parser_cls, lexer_cls)
    client = index.app.test_client()
    response = client.post("/parse", json={"grammar": "grammar Expr;"})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["errors"][0] == "No rule specified"
    assert payload["rules"] == ["expr"]
    assert payload["grammar_name"] == "Expr"
    assert payload["string_tree"] == ""


def test_parse_missing_rule_returns_parse_response(monkeypatch, tmp_path):
    parser_cls, lexer_cls = _make_dummy_parser()
    _setup_parser(monkeypatch, tmp_path, parser_cls, lexer_cls)
    client = index.app.test_client()
    response = client.post(
        "/parse",
        json={"grammar": "grammar Expr;", "source": "1 + 2"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["errors"][0] == "No rule specified"
    assert payload["rules"] == ["expr"]
    assert payload["string_tree"] == ""


def test_parse_missing_source_returns_parse_response(monkeypatch, tmp_path):
    parser_cls, lexer_cls = _make_dummy_parser(with_rule_impl=True)
    _setup_parser(monkeypatch, tmp_path, parser_cls, lexer_cls)
    client = index.app.test_client()
    response = client.post(
        "/parse",
        json={"grammar": "grammar Expr;", "rule": "expr"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["errors"] == []
    assert payload["rules"] == ["expr"]
    assert payload["string_tree"] == ""


def test_parse_conflicting_inputs():
    client = index.app.test_client()
    response = client.post(
        "/parse",
        json={
            "grammar": "grammar Expr;",
            "lexer": "lexer grammar ExprLexer;",
            "parser": "parser grammar ExprParser;",
            "source": "1 + 2",
            "rule": "expr",
        },
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["errors"][0] == "Provide either grammar or lexer+parser inputs, not both"


def test_parse_missing_antlr_jar(monkeypatch, tmp_path):
    missing = tmp_path / "missing.jar"
    monkeypatch.setattr(index, "ANTLR_JAR", missing)
    client = index.app.test_client()
    response = client.post(
        "/parse",
        json={"grammar": "grammar Expr;", "source": "1 + 2", "rule": "expr"},
    )
    assert response.status_code == 500
    payload = response.get_json()
    assert payload["errors"][0] == "ANTLR jar not found on server"


def test_parse_unknown_rule(monkeypatch, tmp_path):
    class DummyLexer:
        def __init__(self, stream):
            self.stream = stream

    class DummyParser:
        ruleNames = ["expr"]

        def __init__(self, stream):
            self.stream = stream

    _setup_parser(monkeypatch, tmp_path, DummyParser, DummyLexer)
    client = index.app.test_client()
    response = client.post(
        "/parse",
        json={"grammar": "grammar Expr;", "source": "1 + 2", "rule": "missing"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["errors"] == ["Unknown rule 'missing'"]


def test_parse_success(monkeypatch, tmp_path):
    class DummyLexer:
        def __init__(self, stream):
            self.stream = stream

    class DummyTree:
        def toStringTree(self, recog=None):
            return "(expr 1 + 2)"

    class DummyParser:
        ruleNames = ["expr"]

        def __init__(self, stream):
            self.stream = stream

        def expr(self):
            return DummyTree()

    _setup_parser(monkeypatch, tmp_path, DummyParser, DummyLexer)
    client = index.app.test_client()
    response = client.post(
        "/parse",
        json={"grammar": "grammar Expr;", "source": "1 + 2", "rule": "expr"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["errors"] == []
    assert payload["rules"] == ["expr"]
    assert payload["grammar_name"] == "Expr"
    assert payload["string_tree"] == "(expr 1 + 2)"
