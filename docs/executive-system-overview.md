# Record Management System
## Executive System Overview

## Purpose

The Record Management System is a workshop operations platform for managing customer records, service requests, workshop work, collections, daily transaction batches, and revenue visibility.

It replaces fragmented paper or spreadsheet processes with one shared operational record for each customer and job.

## What the system does

- Maintains a searchable customer and company directory.
- Creates and tracks job cards for workshop work.
- Assigns work through a status-based job lifecycle.
- Groups job cards into daily transaction batches.
- Supports end-of-day batch closure and controlled reopening.
- Captures collection information, including EFD receipt numbers.
- Provides administrators with operational, batch, and revenue reporting.
- Gives technicians a focused work view without exposing unnecessary customer details.

## How work flows through the business

1. A receptionist registers or selects a customer.
2. The receptionist opens the current daily transaction batch when required.
3. The receptionist creates a job card and selects a service.
4. The job enters the workshop queue as `Received`.
5. A technician progresses the work through inspection and repair stages.
6. The receptionist records collection and the EFD receipt number.
7. The daily batch is closed after operations are complete.
8. Administrators review batches, job volumes, revenue, and historical activity.

The system blocks new job creation when today's batch does not exist or is closed. This gives the business a daily operational boundary and makes revenue reporting easier to reconcile.

## User responsibilities

### Administrator

The administrator has oversight and control responsibilities. The current system provides access to customer management, job monitoring, financial views, batch administration, service management, job assignment, and job-card deletion. Administrators are not intended to create new job cards.

### Receptionist

The receptionist owns front-desk intake. This includes customer registration, job-card creation, service selection, receipt processing, and daily batch closure.

### Technician

The technician focuses on workshop execution. The technician sees assigned operational information and updates work-related status and notes. The technician does not manage customers, create job cards, or manage financial batches.

## Management value

The platform gives leadership:

- A single view of customer and workshop activity.
- Better visibility into work in progress and completed jobs.
- Daily accountability through transaction batches.
- Faster access to revenue and operational summaries.
- Clearer separation of front-desk, workshop, and oversight responsibilities.
- A foundation for future reporting, audit, and performance management.

## Current operating model

The application is delivered as a web frontend. Users authenticate through Supabase, and the application reads and writes operational data in the Supabase database. The frontend is deployed as a Vite application through Vercel.

The main business records are customers, job cards, services, job-service lines, and transaction batches.

## Important management considerations

The current role restrictions are primarily implemented in the application interface. This means the visible buttons and screens reflect each role, but database-level controls must also be verified and strengthened before the system should be treated as a complete security boundary.

The most important next investment is to move authorization and business-rule enforcement into database policies or a trusted backend service. This will protect the system even if someone bypasses the user interface or calls the data API directly.

## Recommended leadership priorities

1. Approve database-enforced role permissions and an audit trail.
2. Establish an operational owner for daily batch reconciliation.
3. Define retention, backup, and data recovery requirements.
4. Require production monitoring for failed writes, authentication events, and unusual data changes.
5. Add formal reporting for turnaround time, technician workload, revenue reconciliation, and repeat customers.
6. Introduce release and change-management procedures before broad operational rollout.

## Success measures

Useful measures for leadership include:

- Average time from customer intake to job completion.
- Number and value of jobs created per day and per month.
- Jobs waiting at each lifecycle stage.
- Batch close and revenue reconciliation accuracy.
- Collection completion rate and receipt capture rate.
- Repeat visits by customer.
- Failed or reversed transactions.
- User activity and exception events by role.
