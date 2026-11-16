"""The import's limits and hostile files: each is refused or kept as plain text, never a 500."""

import json
import time

import pytest
from accountable.crm.tables import contacts as contacts_table
from accountable.crm.tables import deals as deals_table
from accountable.crm.tables import organizations
from hubspot_files import companies, company, contact, contacts, csv_text, deal, deals
from test_import import ASHA, count, names, post


def refused(reply, message: str | None = None) -> str:
    assert reply.status_code == 422, reply.text
    text = reply.json()["fields"]["csv"]
    if message is not None:
        assert text == message
    return text


def test_a_file_with_a_nul_character_is_refused_and_adds_nothing(api):
    reply = post(api, "companies", "Company name\r\nMari\x00gold\r\n", save=True)
    refused(reply)
    assert count(organizations) == 0


def test_half_of_a_two_part_character_is_refused(api):
    body = json.dumps({"csv": "Company name\r\n" + chr(0xD800), "save": False})
    reply = api.post("/api/imports/companies", content=body, headers={"content-type": "application/json"})
    assert reply.status_code == 422
    assert "csv" in reply.json()["fields"]


def test_a_binary_looking_file_is_refused_for_its_columns(api):
    refused(post(api, "contacts", "\x89PNG\r\n\x1a\n IHDR 12345"))


@pytest.mark.parametrize("formula", ['=HYPERLINK("http://example.invalid","x")', "+1+1", "-2+3", "@SUM(A1)"])
def test_a_cell_that_starts_like_a_formula_is_stored_as_the_text_it_is(api, formula):
    post(api, "companies", companies(company(formula)), save=True)
    assert names(api) == [formula]


def test_a_cell_of_100000_characters_is_kept_as_text_and_one_over_the_readers_limit_is_refused(api):
    long = "x" * 100_000
    assert post(api, "companies", companies(company(long)), save=True).status_code == 200
    assert names(api) == [long]
    refused(post(api, "companies", companies(company("y" * 200_000))), "This file could not be read as CSV.")


def test_10000_rows_are_refused_whole(api):
    text = companies(*(company(f"Company {n}") for n in range(10_000)))
    refused(
        post(api, "companies", text, save=True), "This file is too large. Split it into files of 2,000 rows or fewer."
    )
    assert count(organizations) == 0


def test_1000_columns_are_refused(api):
    header = ["Company name", *(f"Extra {n}" for n in range(999))]
    refused(post(api, "companies", csv_text(header, [{"Company name": "Marigold Kitchens"}])))


def test_a_body_over_2_mb_gets_the_apps_413_before_the_import_reads_it(api):
    big = "Company name\r\n" + "x" * (2 * 1024 * 1024)
    reply = api.post("/api/imports/companies", json={"csv": big, "save": False})
    assert reply.status_code == 413
    assert reply.json() == {"detail": "That's too big to send."}


def test_a_file_just_under_the_limit_still_previews(api):
    row = 'Marigold Kitchens,"' + "x" * 900 + '"\r\n'
    text = "Company name,Industry\r\n" + row * 1500
    assert len(text.encode()) < 2 * 1024 * 1024
    reply = post(api, "companies", text)
    assert reply.status_code == 200
    assert reply.json()["counts"]["new"] == 1
    assert reply.json()["counts"]["existing"] == 1499


@pytest.mark.parametrize("body", [{}, {"save": True}, {"csv": 5}, {"csv": None}, {"csv": ["a"]}])
def test_a_body_without_the_file_text_is_refused_in_the_forms_words(api, body):
    reply = api.post("/api/imports/companies", json=body)
    assert reply.status_code == 422
    assert reply.json()["fields"]["csv"] == "Choose a file"


@pytest.mark.parametrize("save", ["yes", 1, None, "true"])
def test_save_must_be_true_or_false(api, save):
    reply = api.post("/api/imports/companies", json={"csv": companies(company("Marigold Kitchens")), "save": save})
    assert reply.status_code == 422
    assert count(organizations) == 0


def test_a_ragged_file_does_not_crash_the_import(api):
    text = "Company name,Industry,City\r\nMarigold Kitchens\r\nReed Willow,Catering,Singapore,extra,more\r\n,,\r\n"
    assert post(api, "companies", text, save=True).json()["counts"]["new"] == 2


def test_the_reply_never_holds_a_record_that_the_file_did_not_name(api, make):
    make.organization("Secret Existing Client", notes="private note")
    reply = post(api, "companies", companies(company("Marigold Kitchens")))
    assert "Secret Existing Client" not in reply.text
    assert "private note" not in reply.text


def timed(api, kind: str, text: str) -> float:
    started = time.perf_counter()
    reply = post(api, kind, text, save=True)
    assert reply.status_code == 200, reply.text[:300]
    return time.perf_counter() - started


def test_2000_rows_of_each_kind_save_within_a_few_seconds(api):
    companies_file = companies(*(company(f"Company {n}") for n in range(2000)))
    assert timed(api, "companies", companies_file) < 5
    contacts_file = contacts(
        *(contact(f"First{n}", f"Last{n}", f"Company {n % 200}", Email=f"person{n}@example.test") for n in range(2000))
    )
    assert timed(api, "contacts", contacts_file) < 5
    deals_file = deals(
        *(
            deal(
                f"Deal {n}",
                "Contract Sent",
                "1000",
                "2026-12-01",
                f"Company {n % 200}",
                f"First{n} Last{n} (person{n}@example.test)",
            )
            for n in range(2000)
        )
    )
    assert timed(api, "deals", deals_file) < 5
    assert (count(organizations), count(contacts_table), count(deals_table)) == (2000, 2000, 2000)
    assert timed(api, "deals", deals_file) < 5
    assert count(deals_table) == 2000


def test_a_deal_file_naming_a_contact_that_exists_does_not_duplicate_it(api, make):
    marigold = make.organization("Marigold Kitchens")
    make.contact("Asha Reed", email="asha@marigold.example", organization_id=marigold)
    text = deals(deal("Spring wedding", "Contract Sent", "100", "2026-12-01", "Marigold Kitchens", ASHA))
    post(api, "deals", text, save=True)
    assert count(contacts_table) == 1
    assert api.get("/api/deals").json()[0]["main_contact_name"] == "Asha Reed"
