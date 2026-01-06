# District Insights & Predictive Analytics Plan

## 1. Product requirements: Predictive insights + district dashboards

### Goals
- Provide district leaders with proactive, explainable insights on student outcomes, educator workload, intervention efficacy, and program ROI.
- Deliver actionable, role-based dashboards that surface risks early and recommend evidence-based interventions.
- Support equity monitoring with disaggregated views and fairness guardrails.

### Target users
- **District leaders**: Superintendents, assistant superintendents, curriculum directors.
- **School leaders**: Principals, instructional coaches.
- **Analysts**: Data/assessment coordinators.

### Core dashboard capabilities
- **District overview**
  - At-a-glance KPIs: attendance, course completion, benchmark growth, intervention participation, chronic absenteeism risk.
  - Cohort filters: grade band, school, subgroup (ELL, SPED, FRL), program enrollment.
  - Trend lines with seasonality and benchmark comparisons.
- **Predictive insights panel**
  - Risk scoring (e.g., attendance risk, course failure risk).
  - Explainability factors (top drivers by cohort and student).
  - Recommended actions tied to district playbooks.
- **Intervention tracking**
  - Participation, dosage, and outcomes; highlight high-ROI programs.
  - Compare expected vs. observed impact.
- **Equity & compliance view**
  - Disproportionality indicators.
  - Bias checks and model drift signals.
- **Operational health**
  - Data freshness, missingness, and ingestion status.

### Data sources (initial)
- **Student information system (SIS)**: enrollment, demographics, attendance, grades, behavior incidents.
- **Assessment platforms**: benchmark and diagnostic results (e.g., MAP, i-Ready, state tests).
- **Learning management system (LMS)**: assignments, completion, login activity.
- **Intervention systems**: program participation, dosage, staffing, service minutes.
- **Special programs**: IEP/504 flags (aggregated and permissioned).
- **Scheduling/rosters**: course/teacher relationships.
- **Survey systems**: climate/SEL surveys (aggregated).

### Data sources (later phases)
- **HR systems**: staffing, vacancies, teacher turnover.
- **Finance/ERP**: program spend for ROI analysis.
- **Transportation**: attendance leading indicators.
- **Community data**: census, local economic indicators (aggregated).

### Non-functional requirements
- **Privacy & compliance**: FERPA-aligned access controls; PII minimization; data retention policies.
- **Explainability**: per-score drivers and population-level attribution.
- **Latency**: 24-hour batch for initial version; near real-time for attendance and LMS events later.
- **Performance**: dashboards load under 2 seconds for standard cohorts.
- **Scalability**: multi-tenant isolation and cost controls.

---

## 2. Personalization loop architecture

### Event tracking
- **Product events**
  - Dashboard views, filter selections, insight clicks, recommended action follow-through.
  - Explanations expanded/collapsed, exports, share actions.
- **Instructional events**
  - Intervention assignment, progress updates, program completion.
  - Feedback on recommendations (accept, dismiss, defer).

### Feedback signals
- **Explicit**: user ratings on insight usefulness; reason for dismissal; action taken.
- **Implicit**: repeated use, time-to-action, follow-up outcomes, escalation to higher tiers.
- **Outcome labels**: success metrics (e.g., attendance improvement, course recovery).

### Model updates
- **Daily batch**: feature refresh, data quality checks, drift detection.
- **Weekly cadence**: re-training with incremental updates; A/B validation.
- **Rollback plan**: versioned models and feature stores; canary releases.

### Architecture overview
- **Event pipeline**: client SDK → event gateway → streaming storage → feature store.
- **Feedback store**: annotated signals and outcomes.
- **Model registry**: versioning, lineage, approval status.
- **Monitoring**: bias metrics, drift, and alerting.

---

## 3. Tenant-specific fine-tuning pipeline (governance + cost controls)

### Pipeline stages
1. **Tenant eligibility review**
   - Data volume thresholds, consent and data-sharing agreements.
   - Governance approval (privacy + district admin).
2. **Data preparation**
   - De-identification and aggregation where possible.
   - Schema validation; missingness profiling; fairness checks.
3. **Fine-tuning / calibration**
   - Tenant-specific model head or calibration layer (preferred).
   - Opt-in full fine-tuning only if justified.
4. **Evaluation & sign-off**
   - Pre-registered metrics: AUROC, calibration, subgroup parity.
   - Human review of top insight outputs.
5. **Deployment**
   - Versioned tenant model; controlled rollout; monitoring.

### Governance controls
- **Access**: least-privilege data access, scoped to tenant.
- **Review**: approval workflow and model cards.
- **Explainability**: tenant-specific explanations and bias checks.
- **Audit logs**: full lineage for data and model artifacts.

### Cost controls
- **Quota-based training budget** per tenant.
- **Shared base model** with lightweight calibration by default.
- **Automatic downshift** to global model if usage thresholds drop.
- **Compute caps** per training job (time/memory).
- **Chargeback reporting** for district usage.

---

## 4. SOC-2 Type II control mappings

### Policy mappings
- **Security & access**
  - Logical access: MFA, least privilege, role-based access.
  - Data encryption: at-rest and in-transit.
- **Change management**
  - Code review requirements; CI checks; deployment approvals.
- **Incident response**
  - Runbooks, escalation paths, post-incident review.
- **Vendor management**
  - Third-party risk reviews; DPA tracking.

### Evidence collection
- **Access controls**: user provisioning logs, access reviews, MFA enforcement reports.
- **Change management**: PR approvals, CI logs, deployment records.
- **Monitoring & logging**: SIEM alerts, retention policies, audit trails.
- **Availability**: uptime reports, backup verification, DR tests.

### Audit readiness artifacts
- **Policies**: security, privacy, data retention, and acceptable use.
- **Control test plans**: test frequency, owner, evidence source.
- **Exception tracking**: risk acceptance records and remediation timelines.

---

## 5. Phased rollout plan with milestones & dependencies

### Phase 0: Discovery (Weeks 0–4)
- Stakeholder interviews, data source inventory.
- Security/privacy review, DPA templates.
- **Dependencies**: district data-sharing agreements, SIS/LMS access.

### Phase 1: MVP dashboards (Weeks 5–12)
- District overview dashboard with core KPIs.
- Batch predictive insights (attendance + course failure risk).
- **Dependencies**: data pipeline MVP, data quality checks, role-based access.

### Phase 2: Personalization loop (Weeks 13–20)
- Event tracking + feedback collection.
- Weekly model updates + monitoring.
- **Dependencies**: product instrumentation, feedback storage, model registry.

### Phase 3: Tenant tuning + governance (Weeks 21–28)
- Tenant calibration layer and approval workflow.
- Cost controls and chargeback reporting.
- **Dependencies**: training infrastructure, governance sign-off.

### Phase 4: SOC-2 readiness & scale (Weeks 29–36)
- Control mappings, evidence automation, audit dry run.
- Expanded data sources (finance/HR if approved).
- **Dependencies**: security program maturity, vendor risk tracking.

### Cross-team dependencies
- **Data engineering**: ingestion, feature store, data quality.
- **Security/Compliance**: SOC-2 policies, privacy reviews.
- **Product**: UX flows, feedback loops, dashboards.
- **ML/Analytics**: model development, monitoring, bias checks.
- **Customer success**: training, rollout communication, playbooks.
