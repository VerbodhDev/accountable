"""Importing a HubSpot export: the preview, the save, and what each kind of file adds."""

import pytest
from accountable import db, users
from accountable.crm.tables import contacts as contacts_table
from accountable.crm.tables import deals as deals_table
from accountable.crm.tables import organizations
from conftest import LOCAL, THIS_COMPUTER, bearer, local_token
from fastapi.testclient import TestClient
from hubspot_files import DEALS_DEFAULT_HEADER, companies, company, contact, contacts, csv_text, deal, deals
from sqlalchemy import func, select

ALEX = users.TEAMMATES[0]


def post(api, kind: str, text: str, *, save: bool = False):
    return api.post(f"/api/imports/{kind}", json={"csv": text, "save": save})


def names(api) -> list[str]:
    return sorted(row["name"] for row in api.get("/api/organizations").json())


def count(table) -> int:
    with db.reading() as conn:
        return conn.scalar(select(func.count()).select_from(table)) or 0


# Companies


def test_a_companies_preview_counts_what_it_would_add_and_adds_nothing(api, make):
    make.organization("Reed Willow Events")
    text = companies(company("Marigold Kitchens"), company("Reed Willow Events"), company(""))
    reply = post(api, "companies", text)
    assert reply.status_code == 200, reply.text
    body = reply.json()
    assert body["counts"] == {"new": 1, "existing": 1, "rejected": 1, "companies_to_add": 0, "contacts_to_add": 0}
    assert body["rejected"] == [{"row": 4, "reason": "Enter a name"}]
    assert body["rejected_more"] == 0
    assert body["saved"] is False
    assert names(api) == ["Reed Willow Events"]


def test_the_preview_names_the_columns_it_ignored(api):
    body = post(api, "companies", companies(company("Marigold Kitchens"))).json()
    assert body["ignored_columns"] == ["Record ID", "Company owner", "Create Date", "Last Activity Date"]


def test_saving_adds_the_new_companies_with_their_industry_and_notes_and_who_added_them(api):
    text = companies(
        company("Marigold Kitchens", Industry="Catering", **{"Phone Number": "+65 5550 0100", "City": "Singapore"}),
        company("Reed Willow Events"),
    )
    body = post(api, "companies", text, save=True).json()
    assert body["saved"] is True
    assert body["counts"]["new"] == 2
    assert names(api) == ["Marigold Kitchens", "Reed Willow Events"]
    [marigold] = [row for row in api.get("/api/organizations").json() if row["name"] == "Marigold Kitchens"]
    assert marigold["industry"] == "Catering"
    assert marigold["notes"] == "Phone: +65 5550 0100\nCity: Singapore"
    detail = api.get(f"/api/organizations/{marigold['id']}").json()
    assert detail["created_by"]["name"] == "Alex Rivera"
    assert detail["updated_by"]["name"] == "Alex Rivera"


def test_the_same_file_a_second_time_adds_nothing(api):
    text = companies(company("Marigold Kitchens"), company("Reed Willow Events"))
    post(api, "companies", text, save=True)
    again = post(api, "companies", text).json()
    assert again["counts"]["new"] == 0
    assert again["counts"]["existing"] == 2
    assert post(api, "companies", text, save=True).json()["counts"]["new"] == 0
    assert count(organizations) == 2


def test_a_name_repeated_in_the_file_or_already_there_in_other_case_counts_as_there(api, make):
    make.organization("Reed Willow Events")
    text = companies(company("Marigold Kitchens"), company("  MARIGOLD kitchens "), company("reed willow EVENTS"))
    body = post(api, "companies", text, save=True).json()
    assert body["counts"] == {"new": 1, "existing": 2, "rejected": 0, "companies_to_add": 0, "contacts_to_add": 0}
    assert names(api) == ["Marigold Kitchens", "Reed Willow Events"]


def test_a_company_that_is_already_there_is_left_as_it_is(api, make):
    make.organization("Marigold Kitchens", notes="Hand-written note")
    post(api, "companies", companies(company("Marigold Kitchens", City="Singapore", Industry="Catering")), save=True)
    [row] = api.get("/api/organizations").json()
    assert (row["notes"], row["industry"]) == ("Hand-written note", None)


def test_more_than_100_rejected_rows_are_listed_up_to_100_and_counted(api):
    text = companies(*(company("") for _ in range(150)))
    body = post(api, "companies", text).json()
    assert body["counts"]["rejected"] == 150
    assert len(body["rejected"]) == 100
    assert body["rejected_more"] == 50


def test_a_file_that_is_not_a_companies_file_is_refused_under_csv_and_adds_nothing(api):
    reply = post(api, "companies", "Name,Industry\r\nMarigold Kitchens,Catering\r\n", save=True)
    assert reply.status_code == 422
    assert reply.json()["fields"] == {"csv": "This is not a HubSpot companies file. It has no Company name column."}
    assert count(organizations) == 0


def test_a_save_that_fails_partway_keeps_none_of_the_rows(local_app, monkeypatch):
    from accountable.crm import importer

    real = importer.add_organization
    calls = []

    def fail_second(conn, model, **kwargs):
        calls.append(model.name)
        if len(calls) == 2:
            raise RuntimeError("the database went away")
        return real(conn, model, **kwargs)

    monkeypatch.setattr(importer, "add_organization", fail_second)
    client = TestClient(
        local_app,
        base_url=LOCAL,
        headers=bearer(local_token(local_app, ALEX.id)),
        client=THIS_COMPUTER,
        raise_server_exceptions=False,
    )
    reply = post(client, "companies", companies(company("Marigold Kitchens"), company("Reed Willow Events")), save=True)
    assert reply.status_code == 500
    assert count(organizations) == 0


@pytest.mark.parametrize("save", [False, True])
def test_a_signed_out_request_gets_401_and_adds_nothing(local_app, save):
    client = TestClient(local_app, base_url=LOCAL, client=THIS_COMPUTER)
    reply = post(client, "companies", companies(company("Marigold Kitchens")), save=save)
    assert reply.status_code == 401
    assert count(organizations) == 0


def test_the_log_names_the_counts_and_never_a_cell(api, caplog):
    caplog.set_level("INFO")
    post(api, "companies", companies(company("Zanzibar Secret Kitchen")), save=True)
    assert "Zanzibar" not in caplog.text
    assert "companies" in caplog.text


# Contacts


def people(api) -> list[dict]:
    return sorted(api.get("/api/contacts").json(), key=lambda row: row["name"])


def test_a_contacts_preview_counts_new_existing_and_rejected_rows_and_the_companies_it_would_add(api, make):
    marigold = make.organization("Marigold Kitchens")
    make.contact("Asha Reed", email="asha@marigold.example", organization_id=marigold)
    text = contacts(
        contact("Asha", "Reed", "Marigold Kitchens", Email="ASHA@marigold.example"),
        contact("Ben", "Okoro", "Marigold Kitchens", Email="ben@marigold.example"),
        contact("Cara", "Lim", "Reed Willow Events", Email="cara@reedwillow.example"),
        contact("Dev", "Rao", ""),
        contact("Eli", "Tan", "Reed Willow Events", Email="not an email"),
    )
    body = post(api, "contacts", text).json()
    assert body["counts"] == {"new": 2, "existing": 1, "rejected": 2, "companies_to_add": 1, "contacts_to_add": 0}
    assert [(row["row"], row["reason"]) for row in body["rejected"]] == [
        (5, "Choose an organization"),
        (6, "Enter a valid email address"),
    ]
    assert [row["name"] for row in people(api)] == ["Asha Reed"]
    assert names(api) == ["Marigold Kitchens"]


def test_saving_adds_the_contacts_at_their_companies_with_their_status_and_who_added_them(api, make):
    make.organization("Marigold Kitchens")
    text = contacts(
        contact("Ben", "Okoro", "Marigold Kitchens", Email="ben@marigold.example", **{"Phone Number": "+65 5550 0102"}),
        contact("Cara", "Lim", "Reed Willow Events", **{"Lifecycle Stage": "Customer"}),
        contact("Dev", "Rao", "Reed Willow Events", **{"Lifecycle Stage": "Opportunity"}),
    )
    body = post(api, "contacts", text, save=True).json()
    assert body["counts"]["new"] == 3
    assert body["counts"]["companies_to_add"] == 1
    assert names(api) == ["Marigold Kitchens", "Reed Willow Events"]
    by_name = {row["name"]: row for row in people(api)}
    assert by_name["Ben Okoro"]["organization_name"] == "Marigold Kitchens"
    assert by_name["Ben Okoro"]["email"] == "ben@marigold.example"
    assert by_name["Ben Okoro"]["phone"] == "+65 5550 0102"
    assert by_name["Ben Okoro"]["status"] == "lead"
    assert by_name["Cara Lim"]["organization_name"] == "Reed Willow Events"
    assert by_name["Cara Lim"]["status"] == "customer"
    assert by_name["Dev Rao"]["status"] == "qualified"
    detail = api.get(f"/api/contacts/{by_name['Ben Okoro']['id']}").json()
    assert (detail["created_by"]["name"], detail["updated_by"]["name"]) == ("Alex Rivera", "Alex Rivera")


def test_two_contacts_at_one_new_company_add_the_company_once(api):
    text = contacts(
        contact("Cara", "Lim", "Reed Willow Events", Email="cara@reedwillow.example"),
        contact("Dev", "Rao", "  reed willow EVENTS ", Email="dev@reedwillow.example"),
    )
    post(api, "contacts", text, save=True)
    assert names(api) == ["Reed Willow Events"]
    assert len(people(api)) == 2


def test_the_same_contacts_file_a_second_time_adds_nothing(api):
    text = contacts(
        contact("Cara", "Lim", "Reed Willow Events", Email="cara@reedwillow.example"),
        contact("Dev", "Rao", "Reed Willow Events"),
    )
    post(api, "contacts", text, save=True)
    again = post(api, "contacts", text, save=True).json()
    assert again["counts"] == {"new": 0, "existing": 2, "rejected": 0, "companies_to_add": 0, "contacts_to_add": 0}
    assert count(contacts_table) == 2
    assert count(organizations) == 1


def test_a_contact_with_no_email_matches_by_name_within_its_company_only(api, make):
    marigold = make.organization("Marigold Kitchens")
    make.contact("Dev Rao", organization_id=marigold)
    text = contacts(
        contact("Dev", "Rao", "Marigold Kitchens"),
        contact("Dev", "Rao", "Reed Willow Events"),
        contact("Dev", "Rao", "Reed Willow Events"),
    )
    body = post(api, "contacts", text).json()
    assert (body["counts"]["new"], body["counts"]["existing"]) == (1, 2)


def test_an_email_repeated_in_the_file_is_one_contact_whatever_its_case(api):
    text = contacts(
        contact("Cara", "Lim", "Reed Willow Events", Email="cara@reedwillow.example"),
        contact("Cara", "L.", "Reed Willow Events", Email=" CARA@reedwillow.example "),
    )
    body = post(api, "contacts", text, save=True).json()
    assert (body["counts"]["new"], body["counts"]["existing"]) == (1, 1)


def test_a_rejected_contact_adds_no_company(api):
    text = contacts(contact("Eli", "Tan", "Reed Willow Events", Email="not an email"))
    body = post(api, "contacts", text, save=True).json()
    assert body["counts"]["companies_to_add"] == 0
    assert body["counts"]["rejected"] == 1
    assert names(api) == []


def test_a_contacts_save_that_fails_partway_keeps_nothing(local_app, monkeypatch):
    from accountable.crm import importer

    real = importer.add_contact
    seen = []

    def fail_second(conn, model, organization_id, **kwargs):
        seen.append(model.name)
        if len(seen) == 2:
            raise RuntimeError("the database went away")
        return real(conn, model, organization_id, **kwargs)

    monkeypatch.setattr(importer, "add_contact", fail_second)
    client = TestClient(
        local_app,
        base_url=LOCAL,
        headers=bearer(local_token(local_app, ALEX.id)),
        client=THIS_COMPUTER,
        raise_server_exceptions=False,
    )
    text = contacts(contact("Cara", "Lim", "Reed Willow Events"), contact("Dev", "Rao", "Reed Willow Events"))
    assert post(client, "contacts", text, save=True).status_code == 500
    assert (count(contacts_table), count(organizations)) == (0, 0)


def test_a_file_that_is_not_a_contacts_file_is_refused(api):
    reply = post(api, "contacts", companies(company("Marigold Kitchens")))
    assert reply.status_code == 422
    assert reply.json()["fields"]["csv"].startswith("This is not a HubSpot contacts file.")


# Deals

ASHA = "Asha Reed (asha@marigold.example)"
BEN = "Ben Okoro (ben@marigold.example)"


def board(api) -> list[dict]:
    return sorted(api.get("/api/deals").json(), key=lambda row: row["name"])


def spring(**more: str) -> dict[str, str]:
    return deal("Spring wedding", "Contract Sent", "12000.0", "2026-12-01 09:30", "Marigold Kitchens", ASHA, **more)


def test_a_deals_preview_counts_new_existing_and_rejected_rows_and_what_it_would_add(api, make):
    marigold = make.organization("Marigold Kitchens")
    asha = make.contact("Asha Reed", email="asha@marigold.example", organization_id=marigold)
    make.deal("Garden party", organization_id=marigold, main_contact_id=asha)
    text = deals(
        spring(),
        deal("Garden party", "Qualified To Buy", "900", "2026-11-20", "marigold kitchens", ASHA),
        deal("Office lunch", "Appointment Scheduled", "450", "2026-11-05", "Reed Willow Events", BEN),
        deal("Tasting", "Waiting for tasting", "100", "2026-11-05", "Marigold Kitchens", ASHA),
    )
    body = post(api, "deals", text).json()
    assert body["counts"] == {"new": 2, "existing": 1, "rejected": 1, "companies_to_add": 1, "contacts_to_add": 1}
    assert body["rejected"] == [
        {"row": 5, "reason": 'Stage "Waiting for tasting" is not one of the seven HubSpot deal stages'}
    ]
    assert [row["name"] for row in board(api)] == ["Garden party"]
    assert (names(api), len(people(api))) == (["Marigold Kitchens"], 1)


def test_saving_adds_the_deals_in_their_stages_with_the_organization_and_main_contact(api, make):
    marigold = make.organization("Marigold Kitchens")
    asha = make.contact("Asha Reed", email="asha@marigold.example", organization_id=marigold)
    text = deals(
        spring(),
        deal("Office lunch", "Appointment Scheduled", "450.5", "2026-11-05 08:00", "Reed Willow Events", BEN),
        deal("Corporate dinner", "Closed Won", "3000", "2026-10-10 18:00", "Marigold Kitchens", ASHA),
    )
    body = post(api, "deals", text, save=True).json()
    assert body["counts"] == {"new": 3, "existing": 0, "rejected": 0, "companies_to_add": 1, "contacts_to_add": 1}
    by_name = {row["name"]: row for row in board(api)}
    wedding = by_name["Spring wedding"]
    assert (wedding["stage"], wedding["value"], wedding["close_date"]) == ("negotiation", 12000, "2026-12-01")
    assert (wedding["organization_name"], wedding["main_contact_id"]) == ("Marigold Kitchens", asha)
    assert wedding["probability"] == 70
    lunch = by_name["Office lunch"]
    assert (lunch["stage"], lunch["value"]) == ("new", 451)
    assert (lunch["organization_name"], lunch["main_contact_name"]) == ("Reed Willow Events", "Ben Okoro")
    assert by_name["Corporate dinner"]["stage"] == "won"
    detail = api.get(f"/api/deals/{wedding['id']}").json()
    assert (detail["created_by"]["name"], detail["updated_by"]["name"]) == ("Alex Rivera", "Alex Rivera")
    ben = next(row for row in people(api) if row["name"] == "Ben Okoro")
    assert (ben["email"], ben["status"], ben["organization_name"]) == (
        "ben@marigold.example",
        "lead",
        "Reed Willow Events",
    )


def test_a_won_deal_makes_its_main_contact_a_customer_like_one_added_by_hand(api, make):
    marigold = make.organization("Marigold Kitchens")
    make.contact("Asha Reed", email="asha@marigold.example", organization_id=marigold, status="lead")
    text = deals(deal("Corporate dinner", "Closed Won", "3000", "2026-10-10", "Marigold Kitchens", ASHA))
    post(api, "deals", text, save=True)
    asha = next(row for row in people(api) if row["name"] == "Asha Reed")
    assert asha["status"] == "customer"


def test_the_same_deals_file_a_second_time_adds_nothing(api):
    text = deals(spring(), deal("Office lunch", "Closed Lost", "450", "2026-10-05", "Reed Willow Events", BEN))
    post(api, "deals", text, save=True)
    again = post(api, "deals", text, save=True).json()
    assert again["counts"] == {"new": 0, "existing": 2, "rejected": 0, "companies_to_add": 0, "contacts_to_add": 0}
    assert (count(deals_table), count(organizations), count(contacts_table)) == (2, 2, 2)


def test_two_deals_naming_the_same_new_company_and_contact_add_them_once(api):
    text = deals(
        spring(), deal("Garden party", "Presentation Scheduled", "800", "2026-11-30", "Marigold Kitchens", ASHA)
    )
    body = post(api, "deals", text, save=True).json()
    assert (body["counts"]["companies_to_add"], body["counts"]["contacts_to_add"]) == (1, 1)
    assert (count(organizations), count(contacts_table), count(deals_table)) == (1, 1, 2)


def test_a_rejected_deal_adds_no_company_and_no_contact(api):
    text = deals(deal("Tasting", "Waiting for tasting", "100", "2026-11-05", "Marigold Kitchens", ASHA))
    body = post(api, "deals", text, save=True).json()
    assert (body["counts"]["rejected"], body["counts"]["companies_to_add"], body["counts"]["contacts_to_add"]) == (
        1,
        0,
        0,
    )
    assert (count(organizations), count(contacts_table), count(deals_table)) == (0, 0, 0)


@pytest.mark.parametrize(
    "more, reason",
    [
        ({"Amount": ""}, "No amount"),
        ({"Amount": "-5"}, "Enter a whole number of dollars, zero or more"),
        ({"Amount": "99999999999999"}, "Enter a whole number of dollars, zero or more"),
        ({"Close Date": ""}, "No close date"),
        ({"Deal Stage": "Closed Won"}, "A won or lost deal can't close in the future"),
        ({"Associated Company (Primary)": ""}, "No company"),
        ({"Number of Associated Contacts": "2.0"}, "More than one contact. Accountable keeps one main contact."),
        ({"Number of Associated Contacts": "0.0"}, "No contact"),
        ({"Associated Contact": "Asha Reed"}, "The contact has no email, so it cannot be matched"),
        ({"Associated Contact": "Asha Reed (not an email)"}, "The contact has no email, so it cannot be matched"),
        ({"Associated Contact": "Asha Reed (asha@marigold)"}, "Enter a valid email address"),
        ({"Deal Name": ""}, "Enter a name"),
    ],
)
def test_each_check_rejects_the_row_with_its_reason_and_adds_nothing(api, more, reason):
    body = post(api, "deals", deals(spring(**more)), save=True).json()
    assert body["rejected"] == [{"row": 2, "reason": reason}]
    assert (count(organizations), count(contacts_table), count(deals_table)) == (0, 0, 0)


def test_a_deals_save_that_fails_partway_keeps_nothing(local_app, monkeypatch):
    from accountable.crm import importer

    real = importer.add_deal
    seen = []

    def fail_second(conn, values, **kwargs):
        seen.append(values["name"])
        if len(seen) == 2:
            raise RuntimeError("the database went away")
        return real(conn, values, **kwargs)

    monkeypatch.setattr(importer, "add_deal", fail_second)
    client = TestClient(
        local_app,
        base_url=LOCAL,
        headers=bearer(local_token(local_app, ALEX.id)),
        client=THIS_COMPUTER,
        raise_server_exceptions=False,
    )
    text = deals(spring(), deal("Garden party", "Qualified To Buy", "900", "2026-11-20", "Marigold Kitchens", ASHA))
    assert post(client, "deals", text, save=True).status_code == 500
    assert (count(deals_table), count(organizations), count(contacts_table)) == (0, 0, 0)


def test_the_default_deal_export_is_refused_with_how_to_export_it(api):
    text = csv_text(DEALS_DEFAULT_HEADER, [{"Deal Name": "Spring wedding"}])
    reply = post(api, "deals", text)
    assert reply.status_code == 422
    message = reply.json()["fields"]["csv"]
    assert message.startswith("This is not a HubSpot deals file.")
    assert "All properties and all associations on records" in message


def test_a_contacts_file_sent_as_companies_is_refused_and_adds_nothing(api):
    text = contacts(contact("Asha", "Reed", "Marigold Kitchens", Email="asha@marigold.example"))
    reply = post(api, "companies", text, save=True)
    assert reply.status_code == 422
    assert (
        reply.json()["fields"]["csv"] == "This looks like a contacts file, not a companies file. Choose Contacts above."
    )
    assert count(organizations) == 0
