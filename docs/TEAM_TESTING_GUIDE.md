# NIMI KINGS LTD - Backend Testing & API Contract Guide

> **Target Audience:** Frontend Engineers (Next.js / React / Mobile), QA Engineers, Product Managers.  
> **Backend Version:** `1.0.0` (Modular Monolith - NestJS 12, PostgreSQL + PostGIS, Prisma 7, Socket.IO)  
> **Total Active Endpoints:** 124 Documented Endpoints Across 7 Operational Domains  

---

## 1. Quick Start & Server Launch

### 1.1 Local Environment Setup
Clone the repository and install dependencies:
```bash
git checkout Dev
git pull origin Dev
npm install
```

### 1.2 Start the Backend
```bash
# Development mode with hot-reload (recommended for testing):
npm run start:dev

# Or production build & start:
npm run build
npm run start:prod
```

Once started, the backend prints:
```text
🚀 NIMI KINGS Backend running on: http://localhost:3000/api/v1
📚 Swagger Documentation available at: http://localhost:3000/api/docs
```

### 1.3 Helpful NPM Utility Commands
| Command | Description |
| :--- | :--- |
| `npm run start:dev` | Start NestJS development server on port 3000 with file watcher. |
| `npm run seed` | Seeds fresh standard demo accounts and realistic domain records. |
| `npm run export:openapi` | Re-exports the complete OpenAPI 3.0 JSON specification to `docs/openapi.json`. |
| `npm run build` | Compiles TypeScript into `/dist`. |

---

## 2. API Contract & Swagger UI

- **Interactive Swagger UI:** [`http://localhost:3000/api/docs`](http://localhost:3000/api/docs)
- **OpenAPI JSON Spec:** [`http://localhost:3000/api/docs-json`](http://localhost:3000/api/docs-json) or offline at `docs/openapi.json`.
- **Postman / Insomnia Import:** You can import `http://localhost:3000/api/docs-json` or `docs/openapi.json` directly into Postman as an OpenAPI collection.
- **CORS:** Enabled for all local and deployed frontend origins (`origin: true, credentials: true`).

---

## 3. Pre-Seeded Testing Accounts

All test accounts share the common password: **`Password123!`**

| Actor / Role | Email | Password | Pre-seeded Capabilities & Linked Data |
| :--- | :--- | :--- | :--- |
| **Super Admin / Admin** | `admin@nimikingsltd.com` | `Password123!` | Universal platform control, KYC verification, project management, financial ledger oversight, audit log access. |
| **Agent** | `agent@nimikingsltd.com` | `Password123!` | Code: `NK-AGT-001`, assigned to *Lekki Royal Crest Villa*, client inspection pipeline, lead enquiry responses, agent showcase card. |
| **Customer** | `customer@nimikingsltd.com` | `Password123!` | Verified KYC (`NIN`), saved wishlist items, saved search alerts, booked inspection, off-plan unit investment, sponsored agro estate. |

---

## 4. How to Authenticate in Swagger UI & REST Clients

1. Navigate to [`http://localhost:3000/api/docs`](http://localhost:3000/api/docs).
2. Expand the **Auth** section and execute `POST /api/v1/auth/login`:
   ```json
   {
     "email": "customer@nimikingsltd.com",
     "password": "Password123!"
   }
   ```
3. Copy the returned `accessToken` string from the JSON response.
4. Click the green **Authorize** button (top right of Swagger UI).
5. Paste the token into the `Value:` box and click **Authorize**.
6. Swagger will now automatically include `Authorization: Bearer <token>` on all secured endpoints!

---

## 5. Domain-by-Domain Testing Walkthrough

---

### Domain 1: Authentication & Profile (`/auth`, `/users`)

#### 1. Login & Token Refresh
- `POST /api/v1/auth/login`: Authenticate with email/password to receive `accessToken` and `refreshToken`.
- `POST /api/v1/auth/refresh`: Send `refreshToken` in request body to get a renewed `accessToken`.
- `POST /api/v1/auth/logout`: Revoke active refresh token.

#### 2. User Profiles & KYC Verification
- `GET /api/v1/auth/me`: Returns the authenticated user's profile, roles, and linked agent/customer profile.
- `PATCH /api/v1/users/profile`: Update first name, last name, phone, avatar.
- `POST /api/v1/users/kyc`: Customer submits KYC details (ID type `NIN` / `PASSPORT`, ID number, document upload URLs).
- `GET /api/v1/users/kyc/pending` *(Admin only)*: View pending KYC submissions queue.
- `PATCH /api/v1/users/:id/kyc-status` *(Admin only)*: Review and approve (`VERIFIED`) or reject (`REJECTED`) customer KYC.

---

### Domain 2: Property Catalog & PostGIS Search (`/properties`)

#### 1. Public Browsing & Geospatial Queries
- `GET /api/v1/properties`: Public listing of properties with pagination, sorting, and filters:
  - Query parameters: `?city=Lekki&propertyType=HOUSE&minPrice=100000000&maxPrice=300000000`
- `GET /api/v1/properties/:id`: Detailed view including media gallery, amenities/features, assigned agents, and legal verification status.
- `GET /api/v1/properties/search/nearby`: PostGIS radius search:
  - Query parameters: `?latitude=6.4474&longitude=3.4723&radiusKm=15`

#### 2. Agent / Admin Property Management
- `POST /api/v1/properties`: Create a new property draft.
- `PATCH /api/v1/properties/:id`: Update property specifications, title, pricing, coordinates.
- `POST /api/v1/properties/:id/media`: Attach images and video tours.

---

### Domain 3: Customer Engagement (Favorites, Alerts & Lead CRM)

#### 1. Saved Properties (Wishlist)
- `GET /api/v1/properties/saved`: Returns all properties bookmarked by the customer.
- `POST /api/v1/properties/:id/save`: Add property to customer wishlist.
- `DELETE /api/v1/properties/:id/save`: Remove property from customer wishlist.

#### 2. Saved Searches & Property Alerts
- `POST /api/v1/properties/saved-searches`: Save search criteria (e.g. "Lekki 4-Bed Duplexes under 250M", notifyEmail: true, notifyPush: true).
- `GET /api/v1/properties/saved-searches`: List active search filters.
- `DELETE /api/v1/properties/saved-searches/:id`: Delete saved search.

#### 3. Property Enquiries & Leads
- `POST /api/v1/enquiries`: Customer submits inquiry on a property.
- `GET /api/v1/enquiries/my-enquiries`: Customer views enquiry history.
- `GET /api/v1/enquiries/agent` *(Agent)*: Agent views incoming leads for their assigned listings.
- `PATCH /api/v1/enquiries/:id/status` *(Agent / Admin)*: Update lead status (`NEW`, `CONTACTED`, `QUALIFIED`, `CLOSED`).

#### 4. Site Inspection Bookings
- `POST /api/v1/inspections`: Customer books a site inspection visit.
- `GET /api/v1/inspections/my-inspections`: Customer tracks upcoming and past inspections.
- `GET /api/v1/inspections/agent` *(Agent)*: Agent views scheduled site visits.
- `PATCH /api/v1/inspections/:id/status` *(Agent / Admin)*: Confirm (`SCHEDULED`), complete (`COMPLETED`), or cancel (`CANCELLED`) inspection.
- `POST /api/v1/inspections/:id/feedback`: Customer rates inspection (1-5 stars) and submits feedback.

---

### Domain 4: Property Document Verification & Legal Due Diligence

- `GET /api/v1/property-verification/:propertyId`: View legal verification status (`VERIFIED`, `PENDING`, `FLAGGED`) and risk level (`LOW`, `MEDIUM`, `HIGH`).
- `POST /api/v1/property-verification/:propertyId/documents`: Upload title deeds (C of O, Governor's Consent, Registered Survey Plan).
- `PATCH /api/v1/property-verification/:propertyId/review` *(Admin / Legal Officer)*: Update verification status, record land registry title search remarks, and sign off due diligence.

---

### Domain 5: Real-Time Chat & Alerts (`/messaging`, `/notifications`, WebSockets)

#### 1. REST Endpoints
- `GET /api/v1/messaging/conversations`: List active chat threads.
- `GET /api/v1/messaging/conversations/:id/messages`: Paginated chat history.
- `POST /api/v1/messaging/conversations/:id/messages`: Send text or media attachment message.
- `GET /api/v1/notifications`: List user notifications (site inspection alerts, KYC updates, etc.).
- `PATCH /api/v1/notifications/:id/read`: Mark notification as read.

#### 2. WebSocket Gateway (Socket.IO)
- **Gateway URL:** `ws://localhost:3000/chat`
- **Authentication:** Pass JWT token in `auth.token` or `headers.authorization`.
- **Key Events:**
  - `join_conversation` / `leave_conversation`
  - `send_message` -> Broadcasts `new_message` to participants
  - `typing_start` / `typing_stop`

---

### Domain 6: Construction Project Tracking (`/construction`)

#### 1. Admin & Engineering Project Control
- `GET /api/v1/construction/projects`: Project portfolio with overall completion %, budget, and timeline.
- `POST /api/v1/construction/projects`: Initialize construction project linked to property.
- `GET /api/v1/construction/projects/:projectId/milestones`: WBS milestones with % weight (e.g. Foundation 20%, Framing 35%, Roofing 25%, Finishes 20%).
- `POST /api/v1/construction/projects/:projectId/updates`: Post site field report with % progress increase and drone/site photo attachments.
- `POST /api/v1/construction/projects/:projectId/expenses`: Log construction material/labor expense.
- `GET /api/v1/construction/projects/:projectId/financial-summary`: Budget vs Actual spend ledger with remaining balance.

#### 2. Customer Off-Plan Portal (Investor View)
- `GET /api/v1/construction/my-projects`: Customer views construction tracking for off-plan properties they have purchased/invested in.
- `GET /api/v1/construction/my-projects/:projectId`: Customer views milestones, verified engineer progress updates, and site photos.

---

### Domain 7: Agriculture Asset Management (`/agriculture`)

#### 1. Commercial Farm Management (Admin / Farm Manager)
- `GET /api/v1/agriculture/farms`: List all agro-estate farms with total hectares and operational status.
- `POST /api/v1/agriculture/farms`: Create a farm asset.
- `POST /api/v1/agriculture/farms/:farmId/crop-cycles`: Allocate hectares to a crop cycle (e.g. Hybrid Maize, Cassava) with automated capacity validation.
- `POST /api/v1/agriculture/crop-cycles/:cycleId/logs`: Field agronomist logs soil moisture, crop stage, health, and pest scouting photos.
- `POST /api/v1/agriculture/crop-cycles/:cycleId/harvests`: Log harvested metric tons, quality grade (`GRADE_A`), unit price, and total revenue.
- `POST /api/v1/agriculture/farms/:farmId/expenses`: Record fertilizer/seed/tractor machinery operational expenses.
- `POST /api/v1/agriculture/farms/:farmId/revenues`: Record off-take produce sales wholesale revenue.
- `GET /api/v1/agriculture/farms/:farmId/financial-summary`: Farm financial health, P&L, Total Revenue, Total Expenses, and Net Profit Margin.

#### 2. Public & Investor Portal
- `GET /api/v1/agriculture/public/farms`: Public showcase of operational farms for potential investors.
- `GET /api/v1/agriculture/my-farms`: Customer portal for agro-investors tracking farm yields and cultivation progress.

---

## 6. Pre-Seeded Test Data Reference

Use these IDs and Codes when making test requests in Swagger or Postman:

| Entity | Code / ID | Details |
| :--- | :--- | :--- |
| **Property 1** | `NK-PROP-001` | *Lekki Royal Crest Smart Villa* (₦220,000,000, House, 5 Beds, Verified) |
| **Property 2** | `NK-PROP-002` | *Maitama Diplomatic Residences* (₦450,000,000, House, 6 Beds, Abuja) |
| **Property 3** | `NK-PROP-003` | *Epe Greenfields Agro-Commercial Park* (₦85,000,000, Farm, 100 Ha) |
| **Construction Project** | `NK-PRJ-001` | *Royal Palm Residences - Phase 2* (₦350M Budget, 4 Milestones, Field Updates) |
| **Agro Farm Estate** | `NK-FRM-001` | *Emerald Valley Agro Estate* (100 Hectares, Active, Maize & Cassava cycles) |
| **Crop Cycle 1** | `CC-2026-MAIZE-01` | *Hybrid Yellow Maize* (40 Ha, Vegetative Growth, 160 Tons Target) |
| **Crop Cycle 2** | `CC-2026-CASSAVA-01` | *Vitamin-A Sweet Cassava* (35 Ha, Planting, 350 Tons Target) |
| **Customer Transaction 1**| `NK-TX-2026-001` | Linked to Property 1 (Enables Customer Construction Portal) |
| **Customer Transaction 2**| `NK-TX-2026-002` | Linked to Property 3 (Enables Customer Agriculture Portal) |

---

## 7. Troubleshooting & FAQ

**Q: Where can I see database logs or test against a local DB?**  
The backend is currently configured to connect directly to the shared Supabase PostgreSQL Cloud instance. All changes made during testing persist across sessions.

**Q: If I get a 401 Unauthorized or 403 Forbidden error:**  
1. Make sure you called `POST /api/v1/auth/login` and copied the token.
2. In Swagger UI, ensure you clicked **Authorize** and pasted the token.
3. Check the role required: e.g. Creating construction projects or approving KYC requires `ADMIN` or `SUPER_ADMIN` (`admin@nimikingsltd.com`), whereas saving wishlist items requires `CUSTOMER` (`customer@nimikingsltd.com`).

**Q: Can I reset the test data at any time?**  
Yes! Run `npm run seed` in your terminal to re-seed and refresh all standard demo users, properties, construction projects, and farms.
