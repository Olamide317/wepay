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

The example configuration points to the WePay backend:

```env
VITE_API_BASE_URL="https://wepay-slkv.onrender.com"
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
- `/login` & `/register` — Organizer authentication.
- `/dashboard` — Organizer overview, collections, and status management.
- `/dashboard/create` — Create `POOL`, `OPEN`, or `INVENTORY` collections with custom fields.
- `/dashboard/collections/:id` & `/dashboard/collections/:id/ledger` — Collection details, search/filter ledger, and CSV export.
- `/c/:slug` — Public collection and payment page.
- `/receipt/:receiptCode` — Digital receipt verification and download.

## 7. Backend Integration

The client uses `https://wepay-slkv.onrender.com` by default. To point a local environment at a different backend, set `VITE_API_BASE_URL` in `.env` and restart the dev server.

The REST client (`src/services/apiClient.ts`) sends organizer-authenticated requests with `Authorization: Bearer <token>` to the configured backend. It uses the backend for authentication, collection management, payment initialization and verification, and receipt lookup. Collection and payment data is not seeded or simulated in the client.

Never call `POST /api/payments/webhook` from the browser; it is a server-to-server Interswitch endpoint.

---

## 8. Production Build

To build static production assets into `dist/`:

```bash
npm run build
```
