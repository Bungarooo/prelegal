"""Generic engine for the catalog document types that don't have a hand-built schema.

The Mutual NDA has a dedicated Cover Page template with real fill-in fields (see
`app/chat.py`). Every other catalog template is pure Common Paper Standard Terms
boilerplate: it references defined terms via `coverpage_link` / `orderform_link` /
`keyterms_link` spans (e.g. "Customer", "Subscription Period") but ships with no
accompanying Cover Page / Order Form / Key Terms template that defines them.

This module extracts those defined terms directly from each template, collects a
value for each one through chat, and renders a generated document as a set of
term/value tables followed by the (span-stripped) boilerplate.
"""

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "catalog.json"
TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"

NDA_SLUG = "mutual-nda"
NDA_FILENAMES = {"mutual-nda.md", "mutual-nda-coverpage.md"}

LINK_CLASSES = ["coverpage_link", "orderform_link", "keyterms_link"]
SECTION_TITLES = {
    "coverpage_link": "Cover Page",
    "orderform_link": "Order Form",
    "keyterms_link": "Key Terms",
}

_LINK_SPAN_RE = re.compile(
    r'<span class="(coverpage_link|orderform_link|keyterms_link)"[^>]*>(.*?)</span>',
    re.DOTALL,
)
_ANY_SPAN_OPEN_RE = re.compile(r"<span[^>]*>")
_ANY_SPAN_CLOSE_RE = re.compile(r"</span>")


@dataclass(frozen=True)
class DocumentSpec:
    slug: str
    name: str
    description: str
    terms_by_class: dict[str, list[str]]

    @property
    def terms(self) -> list[str]:
        return [term for cls in LINK_CLASSES for term in self.terms_by_class.get(cls, [])]


def _slugify(filename: str) -> str:
    return filename.removesuffix(".md")


def _normalize_term(raw: str) -> str:
    text = _ANY_SPAN_OPEN_RE.sub("", raw)
    text = _ANY_SPAN_CLOSE_RE.sub("", text)
    text = text.replace("’s", "").replace("'s", "")
    text = text.replace("’", "'").strip()
    return text.rstrip(".,;:")


def extract_terms(markdown_text: str) -> dict[str, list[str]]:
    """Returns the unique defined terms in a template, grouped by link class,
    in first-seen order."""
    by_class: dict[str, list[str]] = {cls: [] for cls in LINK_CLASSES}
    seen: dict[str, set[str]] = {cls: set() for cls in LINK_CLASSES}
    for cls, raw in _LINK_SPAN_RE.findall(markdown_text):
        term = _normalize_term(raw)
        if term and term not in seen[cls]:
            seen[cls].add(term)
            by_class[cls].append(term)
    return by_class


def strip_spans(markdown_text: str) -> str:
    """Removes all HTML span tags, keeping their inner text."""
    text = _ANY_SPAN_OPEN_RE.sub("", markdown_text)
    return _ANY_SPAN_CLOSE_RE.sub("", text)


def slugify_term(term: str) -> str:
    """Turns a defined term into a valid, stable Python identifier / dict key."""
    slug = re.sub(r"[^a-z0-9]+", "_", term.lower()).strip("_")
    return slug or "field"


def field_key_map(terms: list[str]) -> dict[str, str]:
    """Maps each term's field key to its display text, deduping any key collisions."""
    keys: dict[str, str] = {}
    used: set[str] = set()
    for term in terms:
        base = slugify_term(term)
        key = base
        suffix = 2
        while key in used:
            key = f"{base}_{suffix}"
            suffix += 1
        used.add(key)
        keys[key] = term
    return keys


def load_catalog() -> list[dict]:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


@lru_cache
def load_document_specs() -> list[DocumentSpec]:
    """Loads every catalog document as a DocumentSpec, collapsing the Mutual NDA's
    Standard Terms and Cover Page catalog entries into a single spec."""
    specs: list[DocumentSpec] = []
    for entry in load_catalog():
        filename = entry["filename"]
        if filename in NDA_FILENAMES:
            if any(spec.slug == NDA_SLUG for spec in specs):
                continue
            specs.append(DocumentSpec(slug=NDA_SLUG, name="Mutual Non-Disclosure Agreement", description=entry["description"], terms_by_class={}))
            continue
        text = (TEMPLATES_DIR / filename).read_text(encoding="utf-8")
        specs.append(
            DocumentSpec(
                slug=_slugify(filename),
                name=entry["name"],
                description=entry["description"],
                terms_by_class=extract_terms(text),
            )
        )
    return specs


def get_document_spec(slug: str) -> DocumentSpec | None:
    for spec in load_document_specs():
        if spec.slug == slug:
            return spec
    return None


def _escape_table_cell(value: str) -> str:
    """Escapes a value for safe, literal use inside a Markdown table cell."""
    value = value.replace("\\", "\\\\")
    for ch in ("|", "*", "_", "`"):
        value = value.replace(ch, "\\" + ch)
    return value.replace("\n", " ").replace("\r", "")


def _render_term_table(
    class_name: str, key_term_pairs: list[tuple[str, str]], values: dict[str, str]
) -> list[str]:
    lines = [f"## {SECTION_TITLES[class_name]}", "", "| Term | Value |", "|---|---|"]
    for key, term in key_term_pairs:
        value = (values.get(key) or "").strip() or f"[{term}]"
        lines.append(f"| {term} | {_escape_table_cell(value)} |")
    lines.append("")
    return lines


def render_document_markdown(spec: DocumentSpec, values: dict[str, str]) -> str:
    """Renders a generic document as term/value tables followed by the boilerplate."""
    filename = f"{spec.slug}.md"
    raw = (TEMPLATES_DIR / filename).read_text(encoding="utf-8")
    title, _, rest = raw.partition("\n")
    boilerplate = strip_spans(rest.lstrip("\n"))

    # One key map spanning every class, matching the keys generic_chat.py hands out
    # (spec.terms is the same coverpage+orderform+keyterms concatenation both use), so
    # a term that collides with one from another class still resolves to the same key
    # here as it did when its value was collected. Sliced back out positionally rather
    # than by term text, since two different classes could in principle share a term.
    key_map_items = list(field_key_map(spec.terms).items())

    lines = [
        title if title.startswith("# ") else f"# {spec.name}",
        "",
        "This document consists of the terms below (Cover Page / Order Form / Key Terms, "
        "as applicable) and the Standard Terms that follow.",
        "",
    ]
    offset = 0
    for class_name in LINK_CLASSES:
        terms = spec.terms_by_class.get(class_name, [])
        if terms:
            lines.extend(
                _render_term_table(class_name, key_map_items[offset : offset + len(terms)], values)
            )
        offset += len(terms)
    lines.append("## Standard Terms")
    lines.append("")
    lines.append(boilerplate)
    lines.append("")
    lines.append(
        "This is a generated draft based on Common Paper's standard terms. It is not "
        "signed — execute it through your usual signature process, and consider having "
        "a lawyer review it before signing."
    )
    return "\n".join(lines)
