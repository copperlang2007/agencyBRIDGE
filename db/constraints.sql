-- Domain value constraints.
--
-- Kept separate from schema.sql so there is exactly one definition of each set,
-- applied the same way to a fresh database and an existing one. The apply
-- script treats "constraint already exists" as success, so this is idempotent.
--
-- These are not decoration. The API types and the UI narrow these columns to
-- union types (ClientStatus, PlanType, …); without a constraint the narrowing
-- would be an assertion about data the database was free to contradict, and a
-- single stray row would put a value into a `switch` that has no arm for it.

alter table clients add constraint clients_status_check
  check (status in ('Active','Pending','Lapsed','Prospect'));

alter table clients add constraint clients_plan_type_check
  check (plan_type in ('MA','MAPD','CSNP','DSNP','MED SUPP','PART D','HOSPITAL INDEMNITY','FINAL EXPENSE','OTHER'));

alter table clients add constraint clients_lead_source_check
  check (lead_source in ('Referral','Online','Walk-in','Phone','Event'));

alter table policies add constraint policies_status_check
  check (status in ('Active','Pending','Lapsed','Cancelled'));

alter table policies add constraint policies_plan_type_check
  check (plan_type in ('MA','MAPD','CSNP','DSNP','MED SUPP','PART D','HOSPITAL INDEMNITY','FINAL EXPENSE','OTHER'));

alter table appointments add constraint appointments_type_check
  check (type in ('Enrollment','Review','Renewal','Consultation'));

alter table appointments add constraint appointments_status_check
  check (status in ('Confirmed','Pending','Completed','Cancelled'));

alter table agents add constraint agents_role_check
  check (role in ('Agent','Admin','Retention'));

alter table agents add constraint agents_status_check
  check (status in ('Active','On Leave','Terminated'));

alter table agents add constraint agents_ahip_check
  check (ahip in ('Compliant','Expiring','Overdue','Missing'));

alter table audit_events add constraint audit_events_severity_check
  check (severity in ('info','warning','critical','success'));
