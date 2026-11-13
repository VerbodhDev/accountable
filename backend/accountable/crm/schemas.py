from pydantic import BaseModel


class OrganizationIn(BaseModel):
    name: str | None = None
    website: str | None = None
    industry: str | None = None
    notes: str | None = None


class ContactIn(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    job_title: str | None = None
    organization_id: int | None = None
    status: str | None = None


class DealIn(BaseModel):
    name: str | None = None
    organization_id: int | None = None
    contact_id: int | None = None
    stage: str | None = None
    value: str | int | float | None = None
    probability: int | None = None
    close_date: str | None = None
    position: int | None = None


class ActivityIn(BaseModel):
    type: str | None = None
    description: str | None = None
    happened_at: str | None = None
    follow_up_date: str | None = None
    done: bool | None = None
    contact_id: int | None = None
    deal_id: int | None = None
