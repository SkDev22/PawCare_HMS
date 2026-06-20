# CLAUDE.md — Pet Hospital & Clinic Management System

This file is the authoritative guide for Claude Code when developing this project. Read it fully before writing any code, creating any files, or making architectural decisions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Core Modules](#6-core-modules)
7. [API Design Conventions](#7-api-design-conventions)
8. [Environment & Configuration](#8-environment--configuration)
9. [Development Workflow](#9-development-workflow)
10. [Testing Strategy](#10-testing-strategy)
11. [Coding Standards](#11-coding-standards)
12. [Claude Code Agent Instructions](#12-claude-code-agent-instructions)

---

## 1. Project Overview

**Product name:** PawCare HMS (Hospital Management System)
**Purpose:** A full-stack web application for managing pet hospital/clinic operations including patient records, appointments, billing, inventory, staff, and client communication.

**Key stakeholders:**
- Veterinarians — access patient records, write SOAP notes, review diagnostics
- Nurses / Technicians — manage wards, update vitals, administer medications
- Receptionists — manage appointments, check-in clients, generate invoices
- Admins — full system access, reporting, configuration
- Pet Owners (via Client Portal) — view records, book appointments, pay bills

**Design principles:**
- Mobile-friendly (responsive web + React Native companion app)
- Role-based access enforced at both API and UI layer
- Audit trail on all medical record mutations
- HIPAA-equivalent data hygiene (even for animals — clinic data is sensitive)
- Offline-resilient: critical lookup data cached locally for unreliable clinic networks

---

## 2. Tech Stack

### Frontend
| Tool | Version | Purpose |
|------|---------|---------|
| React | 18.x | Web SPA |
| React Native | 0.73.x | Mobile app (staff + owner portal) |
| TypeScript | 5.x | Type safety across all code |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | latest | Accessible component library |
| React Query (TanStack) | 5.x | Server state, caching, optimistic updates |
| React Hook Form | 7.x | Form state and validation |
| Zod | 3.x | Schema validation (shared with backend) |
| React Router | 6.x | Client-side routing |
| Zustand | 4.x | Lightweight global UI state |
| Recharts | 2.x | Dashboard charts and analytics |
| date-fns | 3.x | Date manipulation |

### Backend
| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Runtime |
| Express | 4.x | HTTP server and routing |
| TypeScript | 5.x | Type safety |
| Prisma | 5.x | ORM, schema management, migrations |
| GraphQL (Apollo Server) | 4.x | Flexible querying for complex data |
| REST API | — | Standard CRUD operations |
| JWT (jsonwebtoken) | 9.x | Stateless authentication |
| bcrypt | 5.x | Password hashing |
| Zod | 3.x | Input validation |
| Multer | 1.x | File upload handling |
| Sharp | 0.33.x | Image processing |
| Bull / BullMQ | 5.x | Background job queues |
| Winston | 3.x | Structured logging |
| Helmet | 7.x | HTTP security headers |
| express-rate-limit | 7.x | Rate limiting |

### Database & Storage
| Tool | Version | Purpose |
|------|---------|---------|
| PostgreSQL | 16.x | Primary relational database |
| Redis | 7.x | Session cache, job queues, rate limiting |
| AWS S3 (or Cloudflare R2) | — | File storage (X-rays, documents, photos) |
| Prisma | 5.x | Schema migrations and query builder |

### Infrastructure & DevOps
| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | Local dev and containerized deployment |
| Kubernetes (K8s) | Production orchestration (multi-branch scale) |
| AWS (EC2, RDS, S3, SES) | Cloud hosting |
| GitHub Actions | CI/CD pipeline |
| Nginx | Reverse proxy |
| Certbot | TLS/SSL certificates |
| Sentry | Error tracking |
| Grafana + Prometheus | Metrics and monitoring |
| pgBackup / pg_dump | Database backup strategy |

### Third-Party Integrations
| Service | Purpose |
|---------|---------|
| Stripe | Payment processing and invoicing |
| Twilio | SMS notifications and reminders |
| SendGrid | Transactional email |
| IDEXX / Heska APIs | External diagnostic lab integration |
| Google Calendar API | Appointment sync for clients |
| Firebase Cloud Messaging | Push notifications for mobile app |

---

## 3. Project Structure

```
pawcare-hms/
├── apps/
│   ├── web/                        # React web application
│   │   ├── src/
│   │   │   ├── components/         # Shared UI components
│   │   │   ├── pages/              # Route-level page components
│   │   │   ├── modules/            # Feature modules (appointments, billing, etc.)
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── stores/             # Zustand stores
│   │   │   ├── lib/                # Utility functions
│   │   │   └── types/              # Frontend-specific types
│   │   └── public/
│   └── mobile/                     # React Native app
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   └── navigation/
├── packages/
│   ├── shared/                     # Shared types, schemas, constants
│   │   ├── src/
│   │   │   ├── schemas/            # Zod schemas (used on both frontend and backend)
│   │   │   ├── types/              # Shared TypeScript interfaces
│   │   │   └── constants/          # Enums, config constants
│   └── ui/                         # Shared design system components
├── server/                         # Backend API
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/             # Express REST routes
│   │   │   └── graphql/            # GraphQL schema and resolvers
│   │   ├── modules/                # Business logic modules
│   │   │   ├── auth/
│   │   │   ├── patients/
│   │   │   ├── appointments/
│   │   │   ├── emr/
│   │   │   ├── billing/
│   │   │   ├── inventory/
│   │   │   ├── staff/
│   │   │   ├── laboratory/
│   │   │   ├── ward/
│   │   │   └── notifications/
│   │   ├── middleware/             # Auth, validation, error handling
│   │   ├── services/               # External service integrations
│   │   │   ├── stripe.ts
│   │   │   ├── twilio.ts
│   │   │   ├── sendgrid.ts
│   │   │   └── s3.ts
│   │   ├── jobs/                   # Background job handlers
│   │   ├── lib/                    # Shared server utilities
│   │   └── prisma/
│   │       ├── schema.prisma       # Database schema
│   │       └── migrations/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── CLAUDE.md                       # This file
└── package.json                    # Monorepo root (using pnpm workspaces)
```

**Monorepo tooling:** Use `pnpm workspaces`. All packages share TypeScript config from the root `tsconfig.base.json`.

---

## 4. Database Schema

All tables follow these conventions:
- Primary keys: `id` — UUID v4, generated by the database (`gen_random_uuid()`)
- Timestamps: `created_at` and `updated_at` on all tables (auto-managed via Prisma)
- Soft deletes: `deleted_at` nullable timestamp (never hard-delete medical records)
- Audit fields: `created_by` and `updated_by` referencing `staff_users.id`

### 4.1 Core Schema (Prisma)

```prisma
// ─────────────────────────────────────────
// CLINIC & CONFIGURATION
// ─────────────────────────────────────────

model Clinic {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String
  address       String?
  phone         String?
  email         String?
  logo_url      String?
  timezone      String    @default("UTC")
  currency      String    @default("USD")
  is_active     Boolean   @default(true)
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  staff         StaffUser[]
  services      Service[]
  rooms         Room[]
}

// ─────────────────────────────────────────
// STAFF & AUTHENTICATION
// ─────────────────────────────────────────

enum StaffRole {
  ADMIN
  VETERINARIAN
  NURSE
  RECEPTIONIST
  LAB_TECHNICIAN
}

model StaffUser {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clinic_id       String      @db.Uuid
  email           String      @unique
  password_hash   String
  first_name      String
  last_name       String
  role            StaffRole
  specialization  String?     // e.g. "Small animals", "Surgery"
  license_number  String?
  phone           String?
  avatar_url      String?
  is_active       Boolean     @default(true)
  last_login_at   DateTime?
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt
  deleted_at      DateTime?

  clinic          Clinic      @relation(fields: [clinic_id], references: [id])
  refresh_tokens  RefreshToken[]
  appointments    Appointment[]
  soap_notes      SoapNote[]
  schedules       StaffSchedule[]
}

model RefreshToken {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  staff_id    String    @db.Uuid
  token_hash  String    @unique
  expires_at  DateTime
  revoked_at  DateTime?
  created_at  DateTime  @default(now())

  staff       StaffUser @relation(fields: [staff_id], references: [id])
}

model StaffSchedule {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  staff_id    String    @db.Uuid
  day_of_week Int       // 0=Sun, 1=Mon, ... 6=Sat
  start_time  String    // "09:00"
  end_time    String    // "17:00"
  is_active   Boolean   @default(true)
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  staff       StaffUser @relation(fields: [staff_id], references: [id])
}

// ─────────────────────────────────────────
// OWNERS (CLIENTS) & PETS (PATIENTS)
// ─────────────────────────────────────────

model Owner {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clinic_id       String    @db.Uuid
  email           String?   @unique
  password_hash   String?   // Optional — for client portal access
  first_name      String
  last_name       String
  phone           String
  address         String?
  emergency_contact String?
  preferred_contact String  @default("email") // "email" | "sms" | "phone"
  portal_enabled  Boolean   @default(false)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  deleted_at      DateTime?

  pets            Pet[]
  invoices        Invoice[]
}

enum Species {
  DOG
  CAT
  BIRD
  RABBIT
  REPTILE
  SMALL_MAMMAL
  OTHER
}

enum PetStatus {
  ACTIVE
  DECEASED
  TRANSFERRED
  INACTIVE
}

model Pet {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  owner_id        String      @db.Uuid
  name            String
  species         Species
  breed           String?
  date_of_birth   DateTime?
  weight_kg       Decimal?    @db.Decimal(6, 2)
  sex             String?     // "M" | "F" | "M_NEUTERED" | "F_SPAYED"
  color           String?
  microchip_id    String?     @unique
  photo_url       String?
  insurance_id    String?
  status          PetStatus   @default(ACTIVE)
  notes           String?     // General notes
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt
  deleted_at      DateTime?

  owner           Owner       @relation(fields: [owner_id], references: [id])
  appointments    Appointment[]
  medical_records MedicalRecord[]
  vaccinations    Vaccination[]
  allergies       Allergy[]
  prescriptions   Prescription[]
  hospitalizations Hospitalization[]
}

model Allergy {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  pet_id      String    @db.Uuid
  allergen    String
  reaction    String?
  severity    String?   // "mild" | "moderate" | "severe"
  noted_at    DateTime  @default(now())

  pet         Pet       @relation(fields: [pet_id], references: [id])
}

// ─────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum AppointmentType {
  WELLNESS_EXAM
  VACCINATION
  SICK_VISIT
  SURGERY
  DENTAL
  FOLLOW_UP
  EMERGENCY
  GROOMING
  LAB_ONLY
}

model Appointment {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clinic_id       String              @db.Uuid
  pet_id          String              @db.Uuid
  vet_id          String              @db.Uuid
  room_id         String?             @db.Uuid
  type            AppointmentType
  status          AppointmentStatus   @default(SCHEDULED)
  start_at        DateTime
  end_at          DateTime
  reason          String?
  notes           String?
  is_walk_in      Boolean             @default(false)
  cancelled_at    DateTime?
  cancel_reason   String?
  created_at      DateTime            @default(now())
  updated_at      DateTime            @updatedAt

  pet             Pet                 @relation(fields: [pet_id], references: [id])
  vet             StaffUser           @relation(fields: [vet_id], references: [id])
  room            Room?               @relation(fields: [room_id], references: [id])
  medical_record  MedicalRecord?
  invoice         Invoice?
}

model Room {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clinic_id   String    @db.Uuid
  name        String    // e.g. "Exam Room 1"
  type        String    // "exam" | "surgery" | "dental" | "lab" | "ward"
  is_active   Boolean   @default(true)
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  clinic        Clinic        @relation(fields: [clinic_id], references: [id])
  appointments  Appointment[]
  kennel_units  KennelUnit[]
}

// ─────────────────────────────────────────
// ELECTRONIC MEDICAL RECORDS (EMR)
// ─────────────────────────────────────────

model MedicalRecord {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  pet_id          String    @db.Uuid
  appointment_id  String?   @unique @db.Uuid
  vet_id          String    @db.Uuid
  visit_date      DateTime  @default(now())
  chief_complaint String?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  pet             Pet         @relation(fields: [pet_id], references: [id])
  appointment     Appointment? @relation(fields: [appointment_id], references: [id])
  soap_note       SoapNote?
  vitals          Vitals?
  lab_results     LabResult[]
  prescriptions   Prescription[]
  attachments     Attachment[]
  diagnoses       Diagnosis[]
}

model SoapNote {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  medical_record_id String        @unique @db.Uuid
  vet_id            String        @db.Uuid
  subjective        String?       // Owner's report
  objective         String?       // Vet's physical exam findings
  assessment        String?       // Diagnosis/assessment
  plan              String?       // Treatment plan
  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt

  medical_record    MedicalRecord @relation(fields: [medical_record_id], references: [id])
  vet               StaffUser     @relation(fields: [vet_id], references: [id])
}

model Vitals {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  medical_record_id String        @unique @db.Uuid
  weight_kg         Decimal?      @db.Decimal(6, 2)
  temperature_c     Decimal?      @db.Decimal(4, 1)
  heart_rate_bpm    Int?
  respiratory_rate  Int?
  blood_pressure    String?       // "120/80"
  body_condition_score Int?       // 1–9 BCS scale
  recorded_at       DateTime      @default(now())

  medical_record    MedicalRecord @relation(fields: [medical_record_id], references: [id])
}

model Diagnosis {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  medical_record_id String        @db.Uuid
  code              String?       // ICD-10 or VeNom code
  name              String
  is_primary        Boolean       @default(false)
  notes             String?
  created_at        DateTime      @default(now())

  medical_record    MedicalRecord @relation(fields: [medical_record_id], references: [id])
}

model Attachment {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  medical_record_id String        @db.Uuid
  file_name         String
  file_type         String        // "xray" | "ultrasound" | "document" | "photo"
  mime_type         String
  s3_key            String
  size_bytes        Int
  uploaded_at       DateTime      @default(now())

  medical_record    MedicalRecord @relation(fields: [medical_record_id], references: [id])
}

// ─────────────────────────────────────────
// VACCINATIONS
// ─────────────────────────────────────────

model Vaccination {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  pet_id          String    @db.Uuid
  vaccine_name    String
  manufacturer    String?
  lot_number      String?
  administered_at DateTime
  next_due_at     DateTime?
  administered_by String    @db.Uuid // StaffUser.id
  notes           String?
  created_at      DateTime  @default(now())

  pet             Pet       @relation(fields: [pet_id], references: [id])
}

// ─────────────────────────────────────────
// PRESCRIPTIONS & MEDICATIONS
// ─────────────────────────────────────────

model Prescription {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  pet_id            String        @db.Uuid
  medical_record_id String?       @db.Uuid
  prescribed_by     String        @db.Uuid
  drug_name         String
  dosage            String
  frequency         String
  duration_days     Int?
  quantity          Int?
  refills_remaining Int           @default(0)
  instructions      String?
  dispensed_at      DateTime?
  expires_at        DateTime?
  is_active         Boolean       @default(true)
  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt

  pet               Pet           @relation(fields: [pet_id], references: [id])
  medical_record    MedicalRecord? @relation(fields: [medical_record_id], references: [id])
}

// ─────────────────────────────────────────
// LABORATORY
// ─────────────────────────────────────────

enum LabStatus {
  PENDING
  SAMPLE_COLLECTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model LabOrder {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  pet_id            String        @db.Uuid
  ordered_by        String        @db.Uuid
  panel_name        String
  status            LabStatus     @default(PENDING)
  is_external       Boolean       @default(false)
  external_lab_name String?
  ordered_at        DateTime      @default(now())
  completed_at      DateTime?
  notes             String?

  results           LabResult[]
}

model LabResult {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  lab_order_id      String        @db.Uuid
  medical_record_id String?       @db.Uuid
  test_name         String
  value             String
  unit              String?
  reference_min     String?
  reference_max     String?
  is_abnormal       Boolean       @default(false)
  recorded_at       DateTime      @default(now())

  lab_order         LabOrder      @relation(fields: [lab_order_id], references: [id])
  medical_record    MedicalRecord? @relation(fields: [medical_record_id], references: [id])
}

// ─────────────────────────────────────────
// WARD & HOSPITALIZATION
// ─────────────────────────────────────────

model KennelUnit {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  room_id     String    @db.Uuid
  label       String    // e.g. "K-01", "Cat Suite 3"
  size        String    // "small" | "medium" | "large"
  is_occupied Boolean   @default(false)
  notes       String?

  room              Room            @relation(fields: [room_id], references: [id])
  hospitalizations  Hospitalization[]
}

model Hospitalization {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  pet_id          String        @db.Uuid
  kennel_id       String        @db.Uuid
  admitted_by     String        @db.Uuid
  reason          String
  admitted_at     DateTime      @default(now())
  discharged_at   DateTime?
  discharge_notes String?
  estimated_stay_days Int?
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  pet             Pet           @relation(fields: [pet_id], references: [id])
  kennel          KennelUnit    @relation(fields: [kennel_id], references: [id])
  care_logs       CareLog[]
}

model CareLog {
  id                  String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hospitalization_id  String          @db.Uuid
  performed_by        String          @db.Uuid
  type                String          // "feeding" | "medication" | "vitals" | "observation"
  notes               String
  logged_at           DateTime        @default(now())

  hospitalization     Hospitalization @relation(fields: [hospitalization_id], references: [id])
}

// ─────────────────────────────────────────
// INVENTORY & PHARMACY
// ─────────────────────────────────────────

enum ItemCategory {
  MEDICATION
  VACCINE
  SURGICAL_SUPPLY
  DIAGNOSTIC_SUPPLY
  FOOD
  EQUIPMENT
  OTHER
}

model InventoryItem {
  id                  String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clinic_id           String        @db.Uuid
  name                String
  sku                 String?       @unique
  category            ItemCategory
  unit                String        // "tablet" | "ml" | "box" | "each"
  quantity_on_hand    Int           @default(0)
  reorder_threshold   Int           @default(10)
  unit_cost           Decimal       @db.Decimal(10, 2)
  selling_price       Decimal?      @db.Decimal(10, 2)
  supplier_name       String?
  supplier_sku        String?
  expiry_date         DateTime?
  location            String?       // shelf/cabinet reference
  is_controlled       Boolean       @default(false) // controlled substance flag
  is_active           Boolean       @default(true)
  created_at          DateTime      @default(now())
  updated_at          DateTime      @updatedAt

  transactions        InventoryTransaction[]
  invoice_line_items  InvoiceLineItem[]
}

model InventoryTransaction {
  id            String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  item_id       String          @db.Uuid
  performed_by  String          @db.Uuid
  type          String          // "purchase" | "dispensed" | "adjustment" | "expired"
  quantity      Int             // positive = in, negative = out
  reference_id  String?         // e.g. PO number, prescription ID
  notes         String?
  created_at    DateTime        @default(now())

  item          InventoryItem   @relation(fields: [item_id], references: [id])
}

// ─────────────────────────────────────────
// SERVICES & BILLING
// ─────────────────────────────────────────

model Service {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clinic_id   String    @db.Uuid
  name        String
  category    String    // "exam" | "procedure" | "lab" | "medication" | "grooming"
  price       Decimal   @db.Decimal(10, 2)
  duration_minutes Int? 
  is_taxable  Boolean   @default(true)
  is_active   Boolean   @default(true)
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  clinic      Clinic    @relation(fields: [clinic_id], references: [id])
  invoice_line_items InvoiceLineItem[]
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  PARTIALLY_PAID
  OVERDUE
  CANCELLED
  REFUNDED
}

model Invoice {
  id              String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  clinic_id       String          @db.Uuid
  owner_id        String          @db.Uuid
  appointment_id  String?         @unique @db.Uuid
  status          InvoiceStatus   @default(DRAFT)
  subtotal        Decimal         @db.Decimal(10, 2)
  tax_amount      Decimal         @default(0) @db.Decimal(10, 2)
  discount_amount Decimal         @default(0) @db.Decimal(10, 2)
  total           Decimal         @db.Decimal(10, 2)
  paid_amount     Decimal         @default(0) @db.Decimal(10, 2)
  due_date        DateTime?
  notes           String?
  stripe_payment_intent_id String?
  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt

  owner           Owner           @relation(fields: [owner_id], references: [id])
  appointment     Appointment?    @relation(fields: [appointment_id], references: [id])
  line_items      InvoiceLineItem[]
  payments        Payment[]
}

model InvoiceLineItem {
  id            String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invoice_id    String          @db.Uuid
  service_id    String?         @db.Uuid
  item_id       String?         @db.Uuid
  description   String
  quantity      Int             @default(1)
  unit_price    Decimal         @db.Decimal(10, 2)
  total         Decimal         @db.Decimal(10, 2)
  created_at    DateTime        @default(now())

  invoice       Invoice         @relation(fields: [invoice_id], references: [id])
  service       Service?        @relation(fields: [service_id], references: [id])
  item          InventoryItem?  @relation(fields: [item_id], references: [id])
}

model Payment {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invoice_id      String    @db.Uuid
  amount          Decimal   @db.Decimal(10, 2)
  method          String    // "cash" | "card" | "insurance" | "bank_transfer"
  stripe_charge_id String?
  received_at     DateTime  @default(now())
  notes           String?

  invoice         Invoice   @relation(fields: [invoice_id], references: [id])
}

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  SKIPPED
}

model Notification {
  id          String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  owner_id    String?             @db.Uuid
  staff_id    String?             @db.Uuid
  type        String              // "appointment_reminder" | "vaccine_due" | "invoice" | "system"
  channel     String              // "email" | "sms" | "push" | "in_app"
  subject     String?
  body        String
  status      NotificationStatus  @default(PENDING)
  scheduled_at DateTime?
  sent_at     DateTime?
  error_msg   String?
  created_at  DateTime            @default(now())
}
```

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

**Staff login (JWT-based, stateless)**

```
1. POST /api/auth/login  { email, password }
2. Server verifies password hash (bcrypt, cost factor 12)
3. Issues:
   - Access Token  — JWT, signed with RS256, expires in 15 minutes
   - Refresh Token — opaque random string (64 bytes), stored as SHA-256 hash in DB, expires in 30 days
4. Access Token delivered in JSON response body
5. Refresh Token set as HttpOnly Secure SameSite=Strict cookie
6. Client stores access token in memory only (never localStorage)
7. On 401, client auto-calls POST /api/auth/refresh to get new access token
```

**Token payload (Access Token)**
```json
{
  "sub": "<staff_user_id>",
  "clinic_id": "<clinic_id>",
  "role": "VETERINARIAN",
  "iat": 1700000000,
  "exp": 1700000900
}
```

**Client Portal (Owner) login** — same flow, separate endpoint `/api/portal/auth/login`, role embedded as `"OWNER"`.

### 5.2 Role-Based Access Control (RBAC)

```typescript
// packages/shared/src/constants/permissions.ts

export const PERMISSIONS = {
  // Patient records
  PATIENT_READ:         ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'],
  PATIENT_WRITE:        ['ADMIN', 'VETERINARIAN'],
  MEDICAL_RECORD_READ:  ['ADMIN', 'VETERINARIAN', 'NURSE'],
  MEDICAL_RECORD_WRITE: ['ADMIN', 'VETERINARIAN'],
  SOAP_NOTE_WRITE:      ['ADMIN', 'VETERINARIAN'],

  // Appointments
  APPOINTMENT_READ:     ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'],
  APPOINTMENT_WRITE:    ['ADMIN', 'RECEPTIONIST', 'VETERINARIAN'],
  APPOINTMENT_CANCEL:   ['ADMIN', 'RECEPTIONIST'],

  // Billing
  INVOICE_READ:         ['ADMIN', 'RECEPTIONIST', 'VETERINARIAN'],
  INVOICE_WRITE:        ['ADMIN', 'RECEPTIONIST'],
  PAYMENT_PROCESS:      ['ADMIN', 'RECEPTIONIST'],

  // Inventory
  INVENTORY_READ:       ['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST'],
  INVENTORY_WRITE:      ['ADMIN', 'NURSE', 'LAB_TECHNICIAN'],

  // Staff management
  STAFF_READ:           ['ADMIN'],
  STAFF_WRITE:          ['ADMIN'],

  // Reports
  REPORT_READ:          ['ADMIN', 'VETERINARIAN'],

  // Lab
  LAB_ORDER_WRITE:      ['ADMIN', 'VETERINARIAN', 'LAB_TECHNICIAN'],
  LAB_RESULT_WRITE:     ['ADMIN', 'LAB_TECHNICIAN'],

  // Ward
  WARD_READ:            ['ADMIN', 'VETERINARIAN', 'NURSE'],
  WARD_WRITE:           ['ADMIN', 'NURSE', 'VETERINARIAN'],
} as const;
```

**Middleware implementation**
```typescript
// server/src/middleware/authorize.ts

export const authorize = (...requiredPermission: PermissionKey[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { role } = req.user;
    const allowed = requiredPermission.every(perm =>
      PERMISSIONS[perm].includes(role)
    );
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

// Usage:
router.get('/patients/:id', authenticate, authorize('PATIENT_READ'), getPatient);
router.put('/patients/:id', authenticate, authorize('PATIENT_WRITE'), updatePatient);
```

### 5.3 Security Requirements

- All passwords hashed with bcrypt, minimum cost factor 12
- Access tokens signed with RS256 (asymmetric), private key stored in env/secrets manager
- Refresh tokens stored as SHA-256 hash in DB — never the raw token
- Rate limit login endpoint: 5 attempts per 15 minutes per IP
- Lock account after 10 failed attempts within 1 hour; auto-unlock after 24 hours
- All endpoints require HTTPS in production
- CORS: whitelist specific origins only
- Helmet.js: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- Session invalidation on password change (revoke all refresh tokens for user)
- Audit log every authentication event (success, failure, logout, token refresh)

---

## 6. Core Modules

### Module 6.1 — Patient Management

**Responsibilities:** Create/update pet profiles and owner profiles. Link owners to pets. Manage pet status lifecycle.

**Key endpoints:**
```
GET    /api/owners              — list owners (search by name/email/phone)
POST   /api/owners              — create owner
GET    /api/owners/:id          — owner detail with pets
PUT    /api/owners/:id          — update owner

GET    /api/pets                — list pets (filter by species, status, vet)
POST   /api/pets                — create pet linked to owner
GET    /api/pets/:id            — pet profile with full summary
PUT    /api/pets/:id            — update pet profile
GET    /api/pets/:id/history    — full medical history timeline
POST   /api/pets/:id/allergies  — add allergy
```

**Business rules:**
- A pet must always have an owner before creation
- Deceased pets are soft-deleted (`status = DECEASED`, never hard deleted)
- Microchip IDs are globally unique — check on save
- Weight history is tracked across all vitals records; surface trend in pet summary

---

### Module 6.2 — Appointment & Scheduling

**Responsibilities:** Book, confirm, check-in, complete, or cancel appointments. Manage room assignment and vet availability.

**Key endpoints:**
```
GET    /api/appointments                     — list (filter by date, vet, status)
POST   /api/appointments                     — create appointment
GET    /api/appointments/:id                 — detail
PUT    /api/appointments/:id                 — update (reschedule, change room/vet)
PATCH  /api/appointments/:id/status          — transition status
GET    /api/staff/:id/availability           — available slots for a vet
GET    /api/rooms/availability               — available rooms for time range
```

**Business rules:**
- Validate no double-booking: vet and room must both be free for the time slot
- Walk-ins bypass the scheduling flow — status jumps directly to `CHECKED_IN`
- Cancellation within 24 hours triggers a notification to the owner
- On `COMPLETED`, automatically create a draft invoice
- Appointment reminders queued 48h and 2h before start time via Bull job

---

### Module 6.3 — Electronic Medical Records (EMR)

**Responsibilities:** Create and manage SOAP notes, vitals, diagnoses, prescriptions, lab orders, and attachments per visit.

**Key endpoints:**
```
POST   /api/appointments/:id/medical-record  — open a record for an appointment
GET    /api/medical-records/:id              — full record
PUT    /api/medical-records/:id/soap         — write/update SOAP note
POST   /api/medical-records/:id/vitals       — record vitals
POST   /api/medical-records/:id/diagnoses    — add diagnosis
POST   /api/medical-records/:id/attachments  — upload file (X-ray, doc, photo)
DELETE /api/medical-records/:id/attachments/:attachId — soft remove
```

**Business rules:**
- Only the authoring vet (or ADMIN) may edit a SOAP note after 24 hours of creation
- Attachments uploaded to S3; metadata stored in DB; serve via pre-signed URLs (expire in 1 hour)
- All EMR mutations logged in an `audit_log` table with before/after JSON snapshots
- A medical record is automatically linked to the appointment that created it

---

### Module 6.4 — Inventory & Pharmacy

**Responsibilities:** Track drugs, supplies, and equipment. Alert on low stock and expiry. Log all dispensing.

**Key endpoints:**
```
GET    /api/inventory                        — list items (filter by category, low stock)
POST   /api/inventory                        — create item
PUT    /api/inventory/:id                    — update item details
POST   /api/inventory/:id/transactions       — log transaction (receive, dispense, adjust)
GET    /api/inventory/alerts                 — items below reorder threshold or expiring in 30d
GET    /api/inventory/:id/transactions       — transaction history for item
```

**Business rules:**
- `quantity_on_hand` is never manually edited — always derived from transactions
- Controlled substances require a dual-confirmation (two staff approvals) for dispensing
- Low-stock alert sent to ADMIN and NURSE roles when quantity drops below `reorder_threshold`
- Expiry alerts sent 30 days in advance via daily cron job

---

### Module 6.5 — Billing & Invoicing

**Responsibilities:** Generate itemized invoices per visit. Process payments. Track outstanding balances.

**Key endpoints:**
```
GET    /api/invoices                         — list invoices (filter by status, owner, date)
POST   /api/invoices                         — create invoice
GET    /api/invoices/:id                     — full invoice with line items
PUT    /api/invoices/:id                     — update draft
POST   /api/invoices/:id/line-items          — add service or item
DELETE /api/invoices/:id/line-items/:lineId  — remove line item
POST   /api/invoices/:id/send               — send to owner (email/SMS)
POST   /api/invoices/:id/payments           — record payment
POST   /api/invoices/:id/stripe-intent      — create Stripe PaymentIntent
```

**Business rules:**
- Invoice total = subtotal − discount + tax
- Tax rate is clinic-configurable in settings
- Invoices in `PAID` or `REFUNDED` state cannot be edited (create credit note instead)
- Stripe webhook handler must verify signature before processing payment events
- Monthly statement summary emailed to owners with outstanding balances

---

### Module 6.6 — Staff Management

**Responsibilities:** Manage staff profiles, roles, schedules, and access.

**Key endpoints:**
```
GET    /api/staff                            — list staff
POST   /api/staff                            — create staff member
GET    /api/staff/:id                        — profile detail
PUT    /api/staff/:id                        — update profile / role
DELETE /api/staff/:id                        — soft delete (deactivate)
GET    /api/staff/:id/schedule               — get weekly schedule
PUT    /api/staff/:id/schedule               — update schedule
```

**Business rules:**
- There must always be at least one ADMIN user in the clinic (cannot delete last admin)
- Role downgrade requires ADMIN privileges
- Deactivated staff cannot log in; their historical records remain intact

---

### Module 6.7 — Laboratory

**Responsibilities:** Order, track, and record lab tests. Integrate with external labs.

**Key endpoints:**
```
POST   /api/lab-orders                       — create lab order
GET    /api/lab-orders/:id                   — order + results
PATCH  /api/lab-orders/:id/status            — update status
POST   /api/lab-orders/:id/results           — add/update results
```

**Business rules:**
- Abnormal results (`is_abnormal = true`) trigger an in-app notification to the ordering vet
- External lab results may be uploaded as PDF attachments linked to the medical record
- Lab results are read-only once the order is `COMPLETED`

---

### Module 6.8 — Ward & Hospitalization

**Responsibilities:** Manage kennel availability, admissions, daily care logs, and discharges.

**Key endpoints:**
```
GET    /api/ward/kennels                     — list kennels with occupancy
POST   /api/hospitalizations                 — admit pet
GET    /api/hospitalizations/:id             — detail with care logs
POST   /api/hospitalizations/:id/care-logs  — add care log entry
PATCH  /api/hospitalizations/:id/discharge  — discharge pet
```

**Business rules:**
- A pet cannot be admitted to an already-occupied kennel
- Care logs are required at least once per 12-hour shift for hospitalized patients
- Discharge generates a discharge summary document and a final invoice

---

### Module 6.9 — Notifications

**Responsibilities:** Queue and dispatch appointment reminders, vaccine due dates, invoice alerts, and system messages.

**Implementation:** Use BullMQ queues backed by Redis.

**Queue jobs:**
```
appointment_reminder    — 48h and 2h before appointment
vaccine_due_reminder    — 30d and 7d before due date
invoice_overdue_alert   — daily check for overdue invoices
low_stock_alert         — triggered on inventory transaction
lab_result_abnormal     — triggered on lab result save
daily_digest            — morning summary to ADMIN
```

**Business rules:**
- Respect owner's `preferred_contact` field (email/SMS/phone)
- Never send notifications between 10pm and 8am clinic local time
- All notifications logged in the `notifications` table with status tracking
- Failed jobs retry 3 times with exponential backoff, then mark as `FAILED` and alert admin

---

### Module 6.10 — Client Portal

**Responsibilities:** Let pet owners view records, book appointments, download invoices, and receive updates.

**Key endpoints (portal-scoped, owner-auth required):**
```
GET    /api/portal/pets                      — owner's pets
GET    /api/portal/pets/:id/history          — medical history (read-only)
GET    /api/portal/appointments              — upcoming appointments
POST   /api/portal/appointments              — self-book (limited slots)
GET    /api/portal/invoices                  — invoice list
GET    /api/portal/invoices/:id/pay          — pay via Stripe
```

**Business rules:**
- Owners can only see data for their own pets
- Self-booking limited to `WELLNESS_EXAM` and `VACCINATION` types; other types require staff booking
- Owners can cancel appointments up to 24h in advance only
- Sensitive medical notes (SOAP `assessment`, `plan`) can be hidden from portal per clinic setting

---

### Module 6.11 — Reporting & Analytics

**Responsibilities:** Generate financial, clinical, and operational reports.

**Key reports:**
```
GET    /api/reports/revenue                  — by day/week/month, by vet, by service
GET    /api/reports/appointments             — volume, no-show rate, cancellation rate
GET    /api/reports/inventory-usage          — consumption by item/category
GET    /api/reports/patients                 — new vs returning, by species
GET    /api/reports/outstanding-balances     — aging report (30/60/90+ days)
```

All report endpoints accept `start_date` and `end_date` query params. Heavy reports run as background jobs and results stored temporarily in Redis with a 5-minute TTL.

---

## 7. API Design Conventions

### REST Conventions
- Base path: `/api/v1/`
- Resources are plural nouns: `/pets`, `/appointments`, `/invoices`
- Status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Server Error
- Pagination: cursor-based for large lists; `?cursor=<id>&limit=<n>` (default limit 20, max 100)
- Filtering: `?status=ACTIVE&species=DOG&vet_id=<uuid>`
- Sorting: `?sort=created_at:desc`

### Error response format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      { "field": "email", "message": "Invalid email address" }
    ]
  }
}
```

### Input Validation
- All request bodies validated with Zod schemas from `packages/shared/src/schemas/`
- Schemas shared between frontend (form validation) and backend (API validation)
- Never trust client-supplied IDs for ownership — always verify in DB against authenticated user's clinic

---

## 8. Environment & Configuration

```bash
# .env.example

# App
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://pawcare:password@localhost:5432/pawcare_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT — RS256 keys (generate with: openssl genrsa -out private.pem 2048)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=pawcare-files-dev

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@pawcare.vet

# Sentry
SENTRY_DSN=

# Encryption (for sensitive fields in DB)
ENCRYPTION_KEY=  # 32-byte hex string
```

---

## 9. Development Workflow

### Local setup
```bash
# Clone and install
git clone <repo>
cd pawcare-hms
pnpm install

# Start dependencies (Postgres + Redis)
docker-compose up -d postgres redis

# Run migrations
pnpm --filter server prisma migrate dev

# Seed development data
pnpm --filter server db:seed

# Start development servers
pnpm dev   # starts all apps via turbo
```

### Database migrations
```bash
# Create a new migration
pnpm --filter server prisma migrate dev --name <migration_name>

# Apply migrations in production
pnpm --filter server prisma migrate deploy
```

### Git branch strategy
```
main          — production-ready, protected branch
staging       — pre-production testing
develop       — integration branch
feature/*     — individual feature branches
fix/*         — bug fix branches
```

**Commit format:** Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

---

## 10. Testing Strategy

### Test pyramid
- **Unit tests** — pure business logic functions, validation schemas, utility helpers (Jest)
- **Integration tests** — API endpoints with real DB (Supertest + test Postgres DB)
- **E2E tests** — critical user flows: login, book appointment, create record, pay invoice (Playwright)

### Running tests
```bash
pnpm test              # all unit tests
pnpm test:integration  # integration tests (requires test DB)
pnpm test:e2e          # E2E tests (requires full stack running)
pnpm test:coverage     # with coverage report
```

### Coverage targets
- Unit: 80% minimum
- Integration: all endpoints must have at least one happy-path + one error-case test
- E2E: cover all 6 critical user journeys

---

## 11. Coding Standards

- **TypeScript strict mode** on everywhere — `noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`
- **No `any` types** — use `unknown` and narrow with guards
- **Zod for all external data** — API inputs, env vars, third-party webhook payloads
- **No direct DB queries in route handlers** — always go through a service layer
- **Async/await** over promise chains; always handle rejections
- **Dependency injection** — services accept their dependencies as constructor args (testability)
- **Error handling** — never swallow errors silently; always log with context via Winston
- **Naming:** camelCase for variables/functions, PascalCase for types/classes, UPPER_SNAKE for constants
- **File naming:** `kebab-case.ts` for all files
- **Exports:** prefer named exports; avoid default exports in library code
- **Comments:** explain *why*, not *what*; code explains what

---

## 12. Claude Code Agent Instructions

> These instructions govern how Claude Code should behave when working on this codebase.

### Behaviour rules

1. **Always read this file before starting any task.** Treat it as the single source of truth.
2. **Never deviate from the defined tech stack** without asking first. Do not introduce new libraries without flagging the reason and getting confirmation.
3. **Follow the project structure exactly.** New modules go into `server/src/modules/<name>/`. New shared types go into `packages/shared/`.
4. **Every new route must have middleware applied** — `authenticate` first, then `authorize(...)` with the appropriate permission key.
5. **Never hard-delete medical data.** Use `deleted_at` soft deletes on all patient-facing models.
6. **Validate all inputs with Zod.** Import schemas from `packages/shared/src/schemas/` or create new ones there.
7. **Write the service layer, not just the route.** Route handlers should be thin — call a service function that does the real work.
8. **Any file upload must go through S3.** Do not store binary files on disk in production.
9. **All background work goes into BullMQ jobs.** Do not do slow work inline in a request handler.
10. **Write tests alongside the feature.** Minimum: one integration test for each new endpoint.

### When creating a new module, follow this checklist:
- [ ] Prisma model added or confirmed in `schema.prisma`
- [ ] Migration created and applied
- [ ] Zod schemas created in `packages/shared/src/schemas/<module>.schema.ts`
- [ ] Service file at `server/src/modules/<module>/<module>.service.ts`
- [ ] Router file at `server/src/modules/<module>/<module>.routes.ts`
- [ ] Routes registered in `server/src/api/routes/index.ts`
- [ ] Permissions mapped in `packages/shared/src/constants/permissions.ts`
- [ ] Integration tests in `server/src/modules/<module>/<module>.test.ts`

### Asking for clarification
Before implementing any feature that requires:
- Adding a new third-party service
- Changing the database schema in a breaking way
- Introducing a new architectural pattern not described here
- Modifying authentication or authorization logic

…stop and ask the developer for confirmation. Summarize what you plan to do and why, and wait for approval.

### What Claude Code should NOT do
- Do not generate placeholder or stubbed implementations — write real working code
- Do not skip input validation, even in internal-only endpoints
- Do not expose stack traces or internal error details in API responses
- Do not commit secrets or hardcode credentials — always use environment variables
- Do not skip the authorization middleware on any endpoint that accesses user or patient data
- Do not write raw SQL strings — use Prisma's query builder

---

*Last updated: June 2026 — PawCare HMS v1.0*
