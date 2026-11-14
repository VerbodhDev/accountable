# Spec: Accountable

This file is the short summary of Accountable. The detail lives in one file per area under docs/specs/. Read this file first, then only the area files a change touches. A change updates this file and the area files it affects, so together they still describe the whole product. Each change keeps its intent and its plan in docs/changes/<branch name>/. Those files record that change. They do not replace this file.

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we deal with, who our contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

## What Accountable is

Accountable is a business management system. It is a sales CRM that will grow into a full Business OS, including ERP. A small team uses it to sell to other companies. The people sign in and work on the same organizations, contacts, and deals.

The backend runs on one computer. The built frontend is served from a temporary S3 bucket with public access blocked. CloudFront is the only reader. A browser on that computer loads the frontend and calls the local backend. A window narrower than 900px uses the phone layout. The app keeps every change. A restart shows the same records.

## Users and access

Everyone who is signed in can see and change every record. There are no roles. People sign in with an email and a password. There is no sign-up page. The detail is in docs/specs/sign-in.md.

The records are the sample set plus the records the team adds. Real customer data is not required.

## Index

| Area | File |
|---|---|
| Sign-in | docs/specs/sign-in.md |
| Organizations | docs/specs/organizations.md |
| Contacts | docs/specs/contacts.md |
| Deals | docs/specs/deals.md |
| Activities | docs/specs/activities.md |
| Lists and deletes | docs/specs/lists.md |
| Pipeline | docs/specs/pipeline.md |
| Dashboard | docs/specs/dashboard.md |
| Shell | docs/specs/shell.md |
| API | docs/specs/api.md |
| Data and running | docs/specs/data.md |
| Scope and requirement IDs | docs/specs/scope.md |
