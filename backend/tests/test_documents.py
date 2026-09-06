from app import documents


def test_extract_terms_dedupes_and_groups_by_class():
    text = (
        '<span class="coverpage_link">Customer</span> and '
        '<span class="coverpage_link">Customer</span> again, plus '
        '<span class="orderform_link">Fees</span>.'
    )
    terms = documents.extract_terms(text)
    assert terms["coverpage_link"] == ["Customer"]
    assert terms["orderform_link"] == ["Fees"]
    assert terms["keyterms_link"] == []


def test_extract_terms_normalizes_possessives_and_punctuation():
    text = (
        '<span class="keyterms_link">Provider’s</span> and '
        '<span class="keyterms_link">Provider.</span>'
    )
    terms = documents.extract_terms(text)
    assert terms["keyterms_link"] == ["Provider"]


def test_strip_spans_keeps_inner_text():
    text = '<span class="header_2" id="1">Service</span> and <span id="5.3.a">if</span>'
    assert documents.strip_spans(text) == "Service and if"


def test_slugify_term_produces_stable_identifiers():
    assert documents.slugify_term("Effective Date") == "effective_date"
    assert documents.slugify_term("Customer's Notice Address") == "customer_s_notice_address"


def test_field_key_map_dedupes_collisions():
    key_map = documents.field_key_map(["Notice Address", "Notice-Address"])
    assert len(key_map) == 2
    assert list(key_map.values()) == ["Notice Address", "Notice-Address"]


def test_load_document_specs_collapses_nda_entries_and_covers_full_catalog():
    specs = documents.load_document_specs()
    slugs = [spec.slug for spec in specs]

    assert slugs.count(documents.NDA_SLUG) == 1
    assert len(specs) == len(documents.load_catalog()) - 1  # two NDA entries -> one spec
    assert "cloud-service-agreement" in slugs
    assert "ai-addendum" in slugs


def test_generic_specs_have_at_least_one_term_and_no_leftover_markup():
    for spec in documents.load_document_specs():
        if spec.slug == documents.NDA_SLUG:
            continue
        assert spec.terms, f"{spec.slug} has no fields"
        assert "<span" not in documents.render_document_markdown(spec, {})


def test_get_document_spec_returns_none_for_unknown_slug():
    assert documents.get_document_spec("not-a-real-document") is None


def test_render_document_markdown_uses_placeholder_for_missing_values():
    spec = documents.get_document_spec("cloud-service-agreement")
    markdown = documents.render_document_markdown(spec, {})
    assert "[Customer]" in markdown
    assert "## Cover Page" in markdown
    assert "## Standard Terms" in markdown


def test_render_document_markdown_uses_the_same_keys_as_field_key_map_of_all_terms():
    """generic_chat.py keys chat fields off field_key_map(spec.terms) (all classes
    combined); render_document_markdown must resolve values with those same keys,
    even for a document with terms in more than one link class."""
    spec = documents.get_document_spec("software-license-agreement")
    combined_key_map = documents.field_key_map(spec.terms)

    values = {key: f"value-for-{term}" for key, term in combined_key_map.items()}
    markdown = documents.render_document_markdown(spec, values)

    for term in spec.terms:
        assert f"value-for-{term}" in markdown
        assert f"[{term}]" not in markdown


def test_render_document_markdown_escapes_markdown_significant_characters():
    spec = documents.get_document_spec("cloud-service-agreement")
    key_map = documents.field_key_map(spec.terms_by_class["coverpage_link"])
    customer_key = next(key for key, term in key_map.items() if term == "Customer")

    markdown = documents.render_document_markdown(spec, {customer_key: "Smith_Jones *Inc*"})

    assert "Smith\\_Jones \\*Inc\\*" in markdown


def test_render_document_markdown_fills_in_known_values():
    spec = documents.get_document_spec("cloud-service-agreement")
    key_map = documents.field_key_map(spec.terms_by_class["coverpage_link"])
    customer_key = next(key for key, term in key_map.items() if term == "Customer")

    markdown = documents.render_document_markdown(spec, {customer_key: "Acme, Inc."})

    assert "| Customer | Acme, Inc. |" in markdown
    assert "[Customer]" not in markdown
