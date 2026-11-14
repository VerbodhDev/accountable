# Spec: Accountable

This file is the short summary of Accountable. The detail lives in one file per area under docs/specs/. Read this file first, then only the area files a change touches. A change updates this file and the area files it affects, so together they still describe the whole product. Each change keeps its intent and its plan in docs/changes/<branch name>/. Those files record that change. They do not replace this file.

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we deal with, who our contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

## What Accountable is

Accountable is a business management system. It is a sales CRM that will grow into a full Business OS, including ERP. Today it is a complete sales CRM for the owner of one small business. The owner sells to other companies. It runs on that one computer.

The owner can see companies, people, deals, the pipeline, and what to do next. The app keeps every change. A restart shows the same records.

## Users and access

One person uses the app. That person is the owner. The owner is non-technical. A sales team, sign-in, and a password come later.

The app listens only on this computer. Another device cannot open it. There is no password. Anyone at the keyboard can see and change every record.

The records are sample data plus practice records the owner adds. Real customer data is not required.

## Index

| Area | File |
|---|---|
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
