"""Reading a HubSpot export: the columns, the limits and the maps. No database here."""

import time
from datetime import date

import pytest
from accountable.crm import hubspot
from accountable.crm.hubspot import Refused
from hubspot_files import DEALS_DEFAULT_HEADER, companies, company, contact, contacts, csv_text, deal

TODAY = date(2026, 10, 31)


def refusal(kind: str, text: str) -> str:
    with pytest.raises(Refused) as caught:
        hubspot.read_table(kind, text)
    return caught.value.message


# The file


def test_a_companies_file_is_read_by_column_name_and_the_other_columns_are_ignored():
    table = hubspot.read_table("companies", companies(company("Marigold Kitchens", Industry="Catering")))
    [row] = table.rows
    assert row.number == 2
    assert row.cells == {
        "Company name": "Marigold Kitchens",
        "Phone Number": "",
        "City": "",
        "Country/Region": "",
        "Industry": "Catering",
    }
    assert table.ignored == ["Record ID", "Company owner", "Create Date", "Last Activity Date"]


def test_the_columns_can_come_in_any_order_and_in_any_case():
    text = csv_text(["industry", "COMPANY NAME"], [{"industry": "Catering", "COMPANY NAME": "Marigold Kitchens"}])
    [row] = hubspot.read_table("companies", text).rows
    assert row.cells == {"Company name": "Marigold Kitchens", "Industry": "Catering"}


def test_a_byte_order_mark_is_dropped():
    [row] = hubspot.read_table("companies", companies(company("Marigold Kitchens"), bom=True)).rows
    assert row.cells["Company name"] == "Marigold Kitchens"


def test_quoted_commas_and_line_breaks_inside_a_cell_stay_in_the_cell():
    text = companies(company("Reed, Willow & Co"), company("Two\nLines"), newline="\n")
    rows = hubspot.read_table("companies", text).rows
    assert [row.cells["Company name"] for row in rows] == ["Reed, Willow & Co", "Two\nLines"]
    assert [row.number for row in rows] == [2, 3]


def test_blank_rows_are_skipped_and_a_ragged_row_is_padded():
    text = "Company name,Industry\r\nMarigold Kitchens\r\n,\r\n\r\nReed Willow,Catering,extra\r\n"
    rows = hubspot.read_table("companies", text).rows
    assert [(row.number, row.cells) for row in rows] == [
        (2, {"Company name": "Marigold Kitchens", "Industry": ""}),
        (5, {"Company name": "Reed Willow", "Industry": "Catering"}),
    ]


def test_a_header_only_file_has_no_rows():
    assert hubspot.read_table("companies", companies()).rows == []


@pytest.mark.parametrize(
    "kind, text, message",
    [
        (
            "companies",
            "Name,Industry\r\nx,y\r\n",
            "This is not a HubSpot companies file. It has no Company name column.",
        ),
        (
            "contacts",
            "Email\r\nx@marigold.example\r\n",
            "This is not a HubSpot contacts file. It has no First Name, Last Name and Company Name columns.",
        ),
        (
            "contacts",
            "First Name,Email\r\nx,y\r\n",
            "This is not a HubSpot contacts file. It has no Last Name and Company Name columns.",
        ),
    ],
)
def test_a_file_without_a_needed_column_is_refused_with_the_names(kind, text, message):
    assert refusal(kind, text) == message


def test_a_contacts_file_chosen_as_companies_is_refused_whatever_columns_it_shares():
    text = contacts(contact("Asha", "Reed", "Marigold Kitchens"))
    assert refusal("companies", text) == hubspot.LOOKS_LIKE_CONTACTS


def test_a_deal_file_without_associations_is_refused_with_how_to_export_it():
    message = refusal("deals", csv_text(DEALS_DEFAULT_HEADER, [{"Deal Name": "Wedding"}]))
    assert message.startswith(
        "This is not a HubSpot deals file. It has no Associated Company (Primary), Associated Contact and "
        "Number of Associated Contacts columns."
    )
    assert "Customize" in message
    assert "All properties and all associations on records" in message


@pytest.mark.parametrize("text", ["", "\r\n", ",,,\r\n"])
def test_an_empty_file_is_refused(text):
    assert refusal("companies", text) == "This file is empty."


def test_text_with_a_nul_character_is_refused():
    assert refusal("companies", "Company name\r\nMari\x00gold\r\n") == hubspot.NOT_TEXT


def test_a_file_that_is_not_csv_at_all_is_refused_for_its_columns():
    assert refusal("companies", '{"company": "Marigold"}').startswith("This is not a HubSpot companies file.")


def test_2000_rows_are_read_and_2001_are_refused():
    many = companies(*(company(f"Company {n}") for n in range(2000)))
    assert len(hubspot.read_table("companies", many).rows) == 2000
    assert refusal("companies", companies(*(company(f"Company {n}") for n in range(2001)))) == hubspot.TOO_LARGE


def test_a_file_over_2_mb_is_refused_before_it_is_read():
    assert refusal("companies", "Company name\r\n" + "x" * (2 * 1024 * 1024)) == hubspot.TOO_LARGE


def test_more_than_400_columns_are_refused():
    header = ["Company name", *(f"Extra {n}" for n in range(400))]
    assert refusal("companies", csv_text(header, [])) == hubspot.TOO_MANY_COLUMNS


# Companies


def test_a_company_has_its_name_and_industry():
    parsed = hubspot.company_fields({"Company name": " Marigold Kitchens ", "Industry": "Catering"})
    assert parsed.fields == {"name": "Marigold Kitchens", "industry": "Catering", "notes": None}


def test_a_company_without_a_name_is_rejected():
    assert hubspot.company_fields({"Company name": ""}).reason == "Enter a name"


def test_the_phone_city_and_country_go_into_the_notes_one_line_each_and_a_blank_adds_none():
    parsed = hubspot.company_fields(
        {"Company name": "Marigold Kitchens", "Phone Number": "+65 5550 0100", "Country/Region": "Singapore"}
    )
    assert parsed.fields["notes"] == "Phone: +65 5550 0100\nCountry/Region: Singapore"
    full = hubspot.company_fields(
        {"Company name": "M", "Phone Number": "1", "City": "Singapore", "Country/Region": "Singapore"}
    )
    assert full.fields["notes"] == "Phone: 1\nCity: Singapore\nCountry/Region: Singapore"


# Contacts


def test_a_contact_has_a_name_made_of_first_and_last_a_company_an_email_and_a_phone():
    parsed = hubspot.contact_fields(
        {
            "First Name": "Asha",
            "Last Name": "Reed",
            "Company Name": "Marigold Kitchens",
            "Email": "asha@marigold.example",
            "Phone Number": "+65 5550 0101",
        }
    )
    assert parsed.fields == {
        "name": "Asha Reed",
        "company": "Marigold Kitchens",
        "email": "asha@marigold.example",
        "phone": "+65 5550 0101",
        "status": "lead",
    }


@pytest.mark.parametrize("first, last, name", [("Asha", "", "Asha"), ("", "Reed", "Reed")])
def test_a_contact_may_have_only_one_of_its_names(first, last, name):
    cells = {"First Name": first, "Last Name": last, "Company Name": "Marigold Kitchens"}
    assert hubspot.contact_fields(cells).fields["name"] == name


def test_a_contact_without_a_name_or_a_company_is_rejected():
    assert hubspot.contact_fields({"First Name": "", "Last Name": "", "Company Name": "M"}).reason == "Enter a name"
    assert (
        hubspot.contact_fields({"First Name": "Asha", "Last Name": "", "Company Name": ""}).reason
        == "Choose an organization"
    )


@pytest.mark.parametrize(
    "stage, status",
    [
        ("Customer", "customer"),
        ("customer", "customer"),
        ("Opportunity", "qualified"),
        ("Marketing Qualified Lead", "qualified"),
        ("Sales Qualified Lead", "qualified"),
        ("Subscriber", "lead"),
        ("Lead", "lead"),
        ("Evangelist", "lead"),
        ("Other", "lead"),
        ("", "lead"),
        ("Something New", "lead"),
    ],
)
def test_the_lifecycle_stage_becomes_a_status(stage, status):
    cells = {"First Name": "A", "Last Name": "B", "Company Name": "M", "Lifecycle Stage": stage}
    assert hubspot.contact_fields(cells).fields["status"] == status


# Deals


def a_deal(**more: str) -> dict[str, str]:
    return deal(
        "Spring wedding",
        "Contract Sent",
        "12000.0",
        "2026-12-01 09:30",
        "Marigold Kitchens",
        "Asha Reed (asha@marigold.example)",
        **more,
    )


def test_a_deal_is_read_into_its_fields():
    parsed = hubspot.deal_fields(a_deal(), TODAY)
    assert parsed.reason is None
    assert parsed.fields == {
        "name": "Spring wedding",
        "stage": "negotiation",
        "value": 12000,
        "amount": "12000.0",
        "rounded": False,
        "close_date": date(2026, 12, 1),
        "company": "Marigold Kitchens",
        "contact_name": "Asha Reed",
        "contact_email": "asha@marigold.example",
    }


@pytest.mark.parametrize(
    "label, stage",
    [
        ("Appointment Scheduled", "new"),
        ("Qualified To Buy", "qualified"),
        ("Presentation Scheduled", "proposal"),
        ("Decision Maker Bought-In", "negotiation"),
        ("Contract Sent", "negotiation"),
        ("Closed Won", "won"),
        ("Closed Lost", "lost"),
        ("appointment scheduled", "new"),
        ("CLOSED WON", "won"),
        (" Closed Lost ", "lost"),
    ],
)
def test_the_seven_hubspot_stages_become_the_six(label, stage):
    parsed = hubspot.deal_fields(a_deal(**{"Deal Stage": label, "Close Date": "2026-10-01"}), TODAY)
    assert parsed.fields["stage"] == stage


def test_a_stage_that_is_not_one_of_the_seven_is_rejected_with_its_name():
    parsed = hubspot.deal_fields(a_deal(**{"Deal Stage": "Waiting for tasting"}), TODAY)
    assert parsed.reason == 'Stage "Waiting for tasting" is not one of the seven HubSpot deal stages'


@pytest.mark.parametrize(
    "amount, value",
    [("1000.0", 1000), ("1000.5", 1001), ("1000.49", 1000), ("0", 0), ("2500", 2500), (" 75.00 ", 75), ("1e3", 1000)],
)
def test_an_amount_is_rounded_to_the_nearest_dollar(amount, value):
    assert hubspot.deal_fields(a_deal(Amount=amount), TODAY).fields["value"] == value


@pytest.mark.parametrize(
    "amount, reason",
    [
        ("", "No amount"),
        ("lots", "Amount is not a number"),
        ("NaN", "Amount is not a number"),
        ("Infinity", "Amount is not a number"),
    ],
)
def test_a_missing_or_unreadable_amount_is_rejected(amount, reason):
    assert hubspot.deal_fields(a_deal(Amount=amount), TODAY).reason == reason


@pytest.mark.parametrize(
    "close, expected",
    [
        ("2026-12-01 09:30", date(2026, 12, 1)),
        ("2026-12-01", date(2026, 12, 1)),
        (" 2026-12-01 23:59 ", date(2026, 12, 1)),
    ],
)
def test_the_close_date_is_the_date_as_written(close, expected):
    assert hubspot.deal_fields(a_deal(**{"Close Date": close}), TODAY).fields["close_date"] == expected


@pytest.mark.parametrize(
    "close, reason",
    [("", "No close date"), ("soon", "Close Date is not a date"), ("2026-13-45", "Close Date is not a date")],
)
def test_a_missing_or_unreadable_close_date_is_rejected(close, reason):
    assert hubspot.deal_fields(a_deal(**{"Close Date": close}), TODAY).reason == reason


def test_a_won_or_lost_deal_cannot_close_in_the_future_and_an_open_one_can():
    future = "2026-12-01 09:30"
    for stage in ("Closed Won", "Closed Lost"):
        parsed = hubspot.deal_fields(a_deal(**{"Deal Stage": stage, "Close Date": future}), TODAY)
        assert parsed.reason == "A won or lost deal can't close in the future"
    assert hubspot.deal_fields(a_deal(**{"Deal Stage": "Contract Sent", "Close Date": future}), TODAY).reason is None


def test_a_deal_without_a_name_or_a_company_is_rejected():
    assert hubspot.deal_fields(a_deal(**{"Deal Name": ""}), TODAY).reason == "Enter a name"
    assert hubspot.deal_fields(a_deal(**{"Associated Company (Primary)": ""}), TODAY).reason == "No company"


@pytest.mark.parametrize(
    "count, reason",
    [
        ("0.0", "No contact"),
        ("0", "No contact"),
        ("", "No contact"),
        ("2.0", "More than one contact. Accountable keeps one main contact."),
        ("many", "Number of Associated Contacts is not a number"),
    ],
)
def test_a_deal_needs_exactly_one_contact(count, reason):
    assert hubspot.deal_fields(a_deal(**{"Number of Associated Contacts": count}), TODAY).reason == reason


@pytest.mark.parametrize(
    "cell, name, email",
    [
        ("Asha Reed (asha@marigold.example)", "Asha Reed", "asha@marigold.example"),
        ("Asha Reed (Events) (asha@marigold.example)", "Asha Reed (Events)", "asha@marigold.example"),
        ("  Asha Reed  ( asha@marigold.example ) ", "Asha Reed", "asha@marigold.example"),
    ],
)
def test_the_main_contact_is_the_name_and_the_email_ending_the_cell(cell, name, email):
    fields = hubspot.deal_fields(a_deal(**{"Associated Contact": cell}), TODAY).fields
    assert (fields["contact_name"], fields["contact_email"]) == (name, email)


@pytest.mark.parametrize(
    "cell, reason",
    [
        ("Asha Reed", "The contact has no email, so it cannot be matched"),
        ("", "The contact has no email, so it cannot be matched"),
        ("Asha Reed (Events)", "The contact has no email, so it cannot be matched"),
        ("(asha@marigold.example)", "The contact has no name"),
    ],
)
def test_a_contact_cell_without_an_email_or_a_name_is_rejected(cell, reason):
    assert hubspot.deal_fields(a_deal(**{"Associated Contact": cell}), TODAY).reason == reason


@pytest.mark.parametrize(
    "cell",
    [
        "a" + " " * 100_000 + "x",
        "(" * 100_000,
        "a (" + "b@" * 50_000,
        "a" + "( " * 50_000 + "b@c)",
        "x" * 100_000 + " (a@b.example)",
    ],
)
def test_a_hostile_contact_cell_is_answered_at_once_and_rejected(cell):
    started = time.perf_counter()
    parsed = hubspot.deal_fields(a_deal(**{"Associated Contact": cell}), TODAY)
    assert time.perf_counter() - started < 0.5
    assert parsed.reason == "The contact cell is too long"


def test_a_contact_cell_of_500_characters_is_read_and_one_of_501_is_too_long():
    name = "n" * 476
    cell = f"{name} (asha@marigold.example)"
    assert len(cell) == 500
    assert hubspot.deal_fields(a_deal(**{"Associated Contact": cell}), TODAY).reason is None
    assert (
        hubspot.deal_fields(a_deal(**{"Associated Contact": "n" + cell}), TODAY).reason
        == "The contact cell is too long"
    )


@pytest.mark.parametrize(
    "amount, original, rounded",
    [("1000.5", "1000.5", True), ("1000.0", "1000.0", False), ("2500", "2500", False), ("1000.49", "1000.49", True)],
)
def test_a_deal_keeps_its_amount_as_written_and_says_whether_it_was_rounded(amount, original, rounded):
    fields = hubspot.deal_fields(a_deal(Amount=amount), TODAY).fields
    assert (fields["amount"], fields["rounded"]) == (original, rounded)


@pytest.mark.parametrize(
    "close", ["2026-11-16junk", "20261116", "2026-W46-1", "2026-11-16 later", "2026-11-1", "x2026-11-16"]
)
def test_a_close_date_must_be_a_date_with_at_most_a_time_after_it(close):
    assert hubspot.deal_fields(a_deal(**{"Close Date": close}), TODAY).reason == "Close Date is not a date"


@pytest.mark.parametrize("close", ["2026-12-01T09:30:15Z", "2026-12-01 09:30", "2026-12-01 09:30:15", "2026-12-01"])
def test_a_close_date_with_a_time_in_any_usual_shape_is_read(close):
    assert hubspot.deal_fields(a_deal(**{"Close Date": close}), TODAY).fields["close_date"] == date(2026, 12, 1)


def test_the_first_check_that_fails_is_the_reason_shown():
    cells = a_deal(**{"Deal Name": "", "Deal Stage": "Nonsense", "Amount": ""})
    assert hubspot.deal_fields(cells, TODAY).reason == "Enter a name"
    cells = a_deal(**{"Deal Stage": "Nonsense", "Amount": ""})
    assert (hubspot.deal_fields(cells, TODAY).reason or "").startswith("Stage ")
    cells = a_deal(Amount="", **{"Close Date": ""})
    assert hubspot.deal_fields(cells, TODAY).reason == "No amount"
