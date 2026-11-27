# WePay — Collective Commerce & Group Payments Frontend

WePay is a Nigerian fintech web application built with **React**, **Vite**, **Tailwind CSS**, and **TypeScript** for group bill splitting (`POOL`), open collections & student dues (`OPEN`), and limited-stock merchant pre-orders (`INVENTORY`) using Nigerian Naira (`NGN`) and Interswitch Web/Inline Checkout.

---

## 1. Required Software

Before running the project locally on Windows, macOS, or Linux, install:

1. **Node.js (v18 LTS or v20+)** — Download from [https://nodejs.org](https://nodejs.org) (includes `npm`).
2. **Visual Studio Code (VS Code)** — Download from [https://code.visualstudio.com](https://code.visualstudio.com).

To confirm Node.js and npm are installed, open a terminal and run:

```bash
node -v
npm -v
```

---

## 2. Extracting the ZIP Archive & Opening in VS Code

1. Download **`WePay-Frontend.zip`** to your computer.
2. Right-click `WePay-Frontend.zip` and choose **Extract All...** (Windows) or double-click to unzip (macOS).
3. Open **VS Code**.
4. Click **File → Open Folder...** and select the extracted **`WePay-Frontend`** folder.
5. Open the integrated terminal in VS Code via **Terminal → New Terminal** (or press `` Ctrl + ` ``).

---

## 3. Install Dependencies

Run the following command inside the project root folder:

```bash
npm install
```

---

## 4. Configure Environment Variables

Copy `.env.example` into a new `.env` file in the root directory:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Default `.env` values for **Prototype Sandbox Mode**:

```env
VITE_API_BASE_URL=""
VITE_USE_MOCK="true"
```

---

## 5. Start the Development Server

Start the Vite dev server on port `3000`:

```bash
npm run dev
```

Open your browser and visit:

```
http://localhost:3000
```

---

## 6. Key Routes to Explore

- `/` — Landing page with direct links to all 3 collection modes and receipt inspector.
- `/login` & `/register` — Organizer authentication (includes one-click demo fill on `/login`).
- `/dashboard` — Organizer overview, sample metrics, active collections, and status management.
- `/dashboard/create` — Create `POOL`, `OPEN`, or `INVENTORY` collections with custom fields.
- `/dashboard/collections/:id` & `/dashboard/collections/:id/ledger` — Collection details, search/filter ledger, and CSV export.
- `/c/november-starlink-split` — **Scenario A (POOL)**: ₦75,000 Starlink bill split.
- `/c/campus-snack-box` — **Scenario B (INVENTORY)**: ₦2,500 Snack Box pre-order with stock limit & hostel fulfillment fields.
- `/c/csc-400-dues` — **Scenario C (OPEN)**: NACOS 400L Departmental Dues.
- `/receipt/RCP-SLK-8841` — QR-enabled digital receipt with print & download support.

---

## 7. Prototype Mock Data vs. Live Backend Integration

### Currently Mocked in Prototype Sandbox Mode (`src/services/mockData.ts` & `src/services/wepayService.ts`)

When `VITE_API_BASE_URL` is blank or `VITE_USE_MOCK="true"`, the app persists state locally in browser `localStorage` (`wepay_sandbox_store_v1`):

- Organizer registration, login, and settlement bank updates.
- Sample collections (`November Starlink Subscription`, `Snack Box`, `NACOS 400L Departmental Dues`) and creation of new collections.
- Payment initialization (`POST /api/payments/initialize`) and simulated Interswitch Sandbox Checkout + backend requery verification.
- Digital receipt lookup (`GET /api/payments/receipt/:receiptCode`).

> **Important:** Simulated Interswitch sandbox payments are clearly labelled in the UI as **Sandbox Simulation Mode** and never claim to be live verified bank transactions.

### Connecting to Your Live Backend API

1. Set your backend base URL in `.env`:

   ```env
   VITE_API_BASE_URL="https://your-backend-api.example.com"
   VITE_USE_MOCK="false"
   ```

2. Restart the dev server (`npm run dev`).
3. The REST client (`src/services/apiClient.ts`) automatically routes requests with `Authorization: Bearer <token>` to:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `POST /api/profile/bank`
   - `POST /api/collections`
   - `GET /api/collections`
   - `GET /api/collections/:id/ledger`
   - `PATCH /api/collections/:id/status`
   - `GET /api/public/c/:slug`
   - `GET /api/public/u/:handle`
   - `POST /api/payments/initialize`
   - `GET /api/payments/receipt/:receiptCode`
4. Review contract assumptions noted at the top of `src/services/apiClient.ts` and adjust response field mappings in `src/services/wepayService.ts` if your backend wraps payloads inside `{ data: ... }`.
5. Never call `POST /api/payments/webhook` from the browser; it is a server-to-server Interswitch endpoint.

---

## 8. Production Build

To build static production assets into `dist/`:

```bash
npm run build
```
