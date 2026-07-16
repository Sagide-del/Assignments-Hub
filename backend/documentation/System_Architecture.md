# System Architecture

Assignments Hub uses a multi-tenant SaaS model.

Users:
- Platform Administrator
- School Administrator
- Teacher
- Student

Every school is isolated using school_id tenancy rules.

Major modules:
- Authentication
- Schools
- Students
- Teachers
- Assignments
- Assessments
- STEM Labs
- Reports
- Subscriptions