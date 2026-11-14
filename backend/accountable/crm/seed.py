"""Sample rows. Dates are offsets from the day the database is filled.

A fixed calendar would stop being "late" or "this month" after that day.
The names and the amounts stay the same on every fresh start.
"""

from datetime import date, timedelta

from accountable.crm.rules import USUAL_PROBABILITY, month_windows
from accountable.crm.tables import activities, contacts, deals, organizations, stage_entries


def _day(today: date, months_ago: int) -> date:
    window = month_windows(today)[5 - months_ago]
    if months_ago == 0:
        return today
    return window["start"].replace(day=min(15, window["end"].day))


def insert_sample(conn, today: date | None = None) -> None:
    today = today or date.today()
    org_ids = {}
    for name, website, industry in (
        ("Brightpath Software", "https://brightpath.example", "Software"),
        ("Lumen Clinic", "https://lumen.example", "Health"),
        ("Hart Freight", "https://hart.example", "Logistics"),
        ("Northwind Bakery", "https://northwind.example", "Food"),
        ("Fieldnote Studio", "https://fieldnote.example", "Design"),
        ("Mesa Solar", "https://mesa.example", "Energy"),
        ("Oak & Iron", "https://oak.example", "Furniture"),
        ("Harbor Dental", "https://harbor.example", "Dental"),
    ):
        result = conn.execute(
            organizations.insert().values(name=name, website=website, industry=industry, notes=None)
        )
        org_ids[name] = int(result.inserted_primary_key[0])

    contact_rows = (
        ("Sam Hill", None, None, None, None, "Lead"),
        ("Ada West", "ada@brightpath.example", "555-0100", "Buyer", "Brightpath Software", "Lead"),
        ("Nico Pell", None, None, None, "Mesa Solar", "Lead"),
        ("Ruth Kane", None, None, None, "Harbor Dental", "Lead"),
        ("Leo Marsh", None, None, "Dispatcher", "Hart Freight", "Lead"),
        ("Bea Quinn", None, None, None, "Northwind Bakery", "Lead"),
        ("Priya Shah", "priya@lumen.example", "555-0101", "Director", "Lumen Clinic", "Qualified"),
        ("Owen Blake", None, None, None, "Fieldnote Studio", "Qualified"),
        ("Mia Chen", None, None, None, "Oak & Iron", "Qualified"),
        ("Carl Diaz", None, None, None, "Hart Freight", "Qualified"),
        ("Nina Foss", None, None, None, "Brightpath Software", "Qualified"),
        ("Gus Hale", None, None, None, "Mesa Solar", "Qualified"),
        ("Ida Ross", None, None, None, "Harbor Dental", "Customer"),
        ("Paul Kim", None, None, None, "Northwind Bakery", "Customer"),
        ("Tess Nguyen", None, None, None, "Lumen Clinic", "Customer"),
        ("Omar Said", None, None, None, "Fieldnote Studio", "Customer"),
        ("Jane Ortiz", None, None, None, "Oak & Iron", "Customer"),
        ("Evan Brooks", None, None, None, "Mesa Solar", "Customer"),
    )
    contact_ids = {}
    for name, email, phone, title, org_name, status in contact_rows:
        result = conn.execute(
            contacts.insert().values(
                name=name,
                email=email,
                phone=phone,
                job_title=title,
                organization_id=org_ids[org_name] if org_name else None,
                status=status,
            )
        )
        contact_ids[name] = int(result.inserted_primary_key[0])

    deal_rows = (
        (
            "Website refresh",
            "Brightpath Software",
            "Ada West",
            "New",
            1_800_000,
            (today + timedelta(days=29)).isoformat(),
            0,
        ),
        (
            "Staff training",
            "Lumen Clinic",
            "Tess Nguyen",
            "New",
            2_200_000,
            (today + timedelta(days=56)).isoformat(),
            1,
        ),
        ("Intake forms", "Harbor Dental", "Ruth Kane", "New", 500_000, None, 2),
        (
            "Fleet service",
            "Hart Freight",
            "Leo Marsh",
            "Qualified",
            3_000_000,
            (today + timedelta(days=19)).isoformat(),
            0,
        ),
        (
            "Yard signs",
            "Mesa Solar",
            "Gus Hale",
            "Qualified",
            800_000,
            (today + timedelta(days=40)).isoformat(),
            1,
        ),
        (
            "Menu reprint",
            "Northwind Bakery",
            "Paul Kim",
            "Qualified",
            400_000,
            (today + timedelta(days=15)).isoformat(),
            2,
        ),
        (
            "Kitchen rollout",
            "Northwind Bakery",
            "Bea Quinn",
            "Proposal",
            2_400_000,
            (today - timedelta(days=1)).isoformat(),
            0,
        ),
        (
            "Clinic portal",
            "Lumen Clinic",
            "Priya Shah",
            "Proposal",
            3_600_000,
            (today + timedelta(days=35)).isoformat(),
            1,
        ),
        (
            "Packaging line",
            "Harbor Dental",
            "Ida Ross",
            "Proposal",
            1_000_000,
            (today - timedelta(days=10)).isoformat(),
            2,
        ),
        (
            "Annual retainer",
            "Fieldnote Studio",
            "Owen Blake",
            "Negotiation",
            4_000_000,
            (today + timedelta(days=7)).isoformat(),
            0,
        ),
        (
            "Warehouse lease",
            "Hart Freight",
            "Carl Diaz",
            "Negotiation",
            1_500_000,
            (today + timedelta(days=25)).isoformat(),
            1,
        ),
        (
            "Spring campaign",
            "Mesa Solar",
            "Evan Brooks",
            "Won",
            1_250_000,
            _day(today, 0).isoformat(),
            0,
        ),
        ("Logo system", "Oak & Iron", "Jane Ortiz", "Won", 800_000, _day(today, 0).isoformat(), 1),
        (
            "Records audit",
            "Harbor Dental",
            "Ida Ross",
            "Won",
            400_000,
            _day(today, 0).isoformat(),
            2,
        ),
        (
            "Roof study",
            "Brightpath Software",
            "Nina Foss",
            "Won",
            900_000,
            _day(today, 2).isoformat(),
            3,
        ),
        (
            "Lobby mural",
            "Fieldnote Studio",
            "Omar Said",
            "Won",
            600_000,
            _day(today, 3).isoformat(),
            4,
        ),
        ("Van wrap", "Hart Freight", "Carl Diaz", "Won", 700_000, _day(today, 5).isoformat(), 5),
        (
            "Yard lighting",
            "Hart Freight",
            "Leo Marsh",
            "Lost",
            1_500_000,
            (today - timedelta(days=40)).isoformat(),
            0,
        ),
        (
            "Old brochure",
            "Oak & Iron",
            "Mia Chen",
            "Lost",
            300_000,
            (today - timedelta(days=20)).isoformat(),
            1,
        ),
        (
            "Pop-up shop",
            "Fieldnote Studio",
            "Owen Blake",
            "Lost",
            200_000,
            (today - timedelta(days=15)).isoformat(),
            2,
        ),
    )
    deal_ids = {}
    for name, org_name, contact_name, stage, cents, close_date, position in deal_rows:
        result = conn.execute(
            deals.insert().values(
                name=name,
                organization_id=org_ids[org_name],
                contact_id=contact_ids[contact_name],
                stage=stage,
                value_cents=cents,
                probability=USUAL_PROBABILITY[stage],
                probability_hand_set=False,
                close_date=close_date,
                position=position,
            )
        )
        deal_ids[name] = int(result.inserted_primary_key[0])

    noon = "T12:00:00"
    activity_rows = (
        (
            "Call",
            "Call Priya about the portal",
            None,
            "Clinic portal",
            today - timedelta(days=4),
            today - timedelta(days=4),
            False,
        ),
        (
            "Note",
            "Send the fit-out notes",
            None,
            "Kitchen rollout",
            today - timedelta(days=2),
            today - timedelta(days=1),
            False,
        ),
        (
            "Note",
            "Review the retainer",
            None,
            "Annual retainer",
            today - timedelta(days=1),
            today + timedelta(days=5),
            False,
        ),
        (
            "Email",
            "Confirm the fleet start",
            None,
            "Fleet service",
            today - timedelta(days=1),
            today + timedelta(days=6),
            False,
        ),
        (
            "Note",
            "Website refresh is scoped",
            None,
            "Website refresh",
            today - timedelta(days=6),
            None,
            False,
        ),
        (
            "Email",
            "Logo files sent to Oak & Iron",
            None,
            "Logo system",
            today - timedelta(days=3),
            None,
            False,
        ),
        (
            "Call",
            "Ask about the van wrap",
            None,
            "Van wrap",
            today - timedelta(days=8),
            today + timedelta(days=12),
            False,
        ),
        (
            "Note",
            "Priya confirmed the hours",
            "Priya Shah",
            None,
            today - timedelta(days=9),
            today - timedelta(days=10),
            True,
        ),
        (
            "Email",
            "Send the dental packet",
            "Ida Ross",
            None,
            today - timedelta(days=5),
            None,
            False,
        ),
        (
            "Call",
            "Check the lobby paint",
            None,
            "Lobby mural",
            today - timedelta(days=2),
            today + timedelta(days=3),
            False,
        ),
        (
            "Note",
            "Sam asked for a call back",
            "Sam Hill",
            None,
            today - timedelta(days=7),
            None,
            False,
        ),
        (
            "Email",
            "Freight rates look high",
            None,
            "Warehouse lease",
            today - timedelta(days=1),
            today + timedelta(days=2),
            False,
        ),
    )
    for kind, description, contact_name, deal_name, happened, follow_up, done in activity_rows:
        conn.execute(
            activities.insert().values(
                type=kind,
                description=description,
                happened_at=happened.isoformat() + noon,
                follow_up_date=follow_up.isoformat() if follow_up else None,
                done=done,
                contact_id=contact_ids[contact_name] if contact_name else None,
                deal_id=deal_ids[deal_name] if deal_name else None,
            )
        )
    conn.execute(
        stage_entries.insert().values(
            deal_id=deal_ids["Records audit"],
            text="Moved from Negotiation to Won",
            happened_at=today.isoformat() + "T15:00:00",
        )
    )
    conn.execute(
        stage_entries.insert().values(
            deal_id=deal_ids["Annual retainer"],
            text="Moved from Proposal to Negotiation",
            happened_at=today.isoformat() + "T18:00:00",
        )
    )


def main() -> None:
    from accountable.db import reset_database, resolve_path

    reset_database(resolve_path())


if __name__ == "__main__":
    main()
