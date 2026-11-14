from sqlalchemy import Boolean, Column, ForeignKey, Integer, MetaData, String, Table

metadata = MetaData()

people = Table(
    "people",
    metadata,
    Column("id", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("email", String, nullable=False),
)

organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("website", String),
    Column("industry", String),
    Column("notes", String),
    Column("added_by", String, ForeignKey("people.id")),
    Column("updated_by", String, ForeignKey("people.id")),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("email", String),
    Column("phone", String),
    Column("job_title", String),
    Column("organization_id", Integer, ForeignKey("organizations.id")),
    Column("status", String, nullable=False),
    Column("added_by", String, ForeignKey("people.id")),
    Column("updated_by", String, ForeignKey("people.id")),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("organization_id", Integer, ForeignKey("organizations.id"), nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id")),
    Column("stage", String, nullable=False),
    Column("value_cents", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("probability_hand_set", Boolean, nullable=False),
    Column("close_date", String),
    Column("position", Integer, nullable=False),
    Column("added_by", String, ForeignKey("people.id")),
    Column("updated_by", String, ForeignKey("people.id")),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", String, nullable=False),
    Column("description", String, nullable=False),
    Column("happened_at", String, nullable=False),
    Column("follow_up_date", String),
    Column("done", Boolean, nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id")),
    Column("deal_id", Integer, ForeignKey("deals.id")),
    Column("added_by", String, ForeignKey("people.id")),
    Column("updated_by", String, ForeignKey("people.id")),
)

stage_entries = Table(
    "stage_entries",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("deal_id", Integer, ForeignKey("deals.id"), nullable=False),
    Column("text", String, nullable=False),
    Column("happened_at", String, nullable=False),
)
