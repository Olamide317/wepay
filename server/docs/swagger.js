// server/docs/swagger.js
const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "WePay Collective Commerce & Group Payment API",
    version: "1.0.0",
    description:
      "REST API for WePay — collective commerce, AI-drafted group payment links, atomic inventory locking, SHA-256 QR digital receipts, and Interswitch IPG Web Checkout verification.",
    contact: {
      name: "WePay Engineering (Interswitch Hackathon — LAUTECH)",
      url: "https://wepay-peach.vercel.app",
    },
  },
  servers: [
    {
      url: "https://wepay-slkv.onrender.com/api",
      description: "Production API (Render)",
    },
    {
      url: "http://localhost:5000/api",
      description: "Local Development Server",
    },
  ],
  tags: [
    { name: "System", description: "Health & deployment status" },
    { name: "Auth", description: "Organizer registration, login & JWT session" },
    { name: "Profile", description: "Organizer settlement bank configuration" },
    { name: "Collections", description: "POOL, OPEN & INVENTORY collection engine + AI Builder" },
    { name: "Payments", description: "Interswitch IPG checkout initiation, server requery & ledger" },
    { name: "Receipts", description: "SHA-256 QR-verified digital receipts" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste your organizer JWT token from /api/auth/login",
      },
    },
    schemas: {
      CustomField: {
        type: "object",
        required: ["label", "type"],
        properties: {
          id: { type: "string", example: "field_1" },
          label: { type: "string", example: "Matric Number" },
          type: { type: "string", enum: ["short_text", "number", "select", "email"], example: "short_text" },
          required: { type: "boolean", default: true },
          placeholder: { type: "string", example: "Enter your matric number" },
          helpText: { type: "string", example: "Your school matriculation number" },
          options: {
            type: "array",
            items: { type: "string" },
            example: ["S", "M", "L", "XL"],
          },
          order: { type: "integer", example: 0 },
        },
      },
      CollectionInput: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "Hostel Starlink Monthly Split" },
          description: { type: "string", example: "Splitting ₦75,000 Starlink subscription across 5 roommates." },
          type: { type: "string", enum: ["POOL", "OPEN", "INVENTORY"], example: "POOL" },
          mode: { type: "string", enum: ["SPLIT", "FLEXIBLE"], example: "SPLIT" },
          pricingRule: { type: "string", enum: ["FIXED", "MINIMUM", "FLEXIBLE"], example: "FIXED" },
          amount: { type: "number", example: 15000, description: "Fixed or minimum amount in NGN" },
          perPersonAmount: { type: "number", example: 15000 },
          targetAmount: { type: "number", example: 75000, description: "Used for POOL target auto-completion" },
          totalTarget: { type: "number", example: 75000 },
          stockLimit: { type: "integer", example: 40, description: "Used for INVENTORY atomic stock cap" },
          maxQuantityPerOrder: { type: "integer", default: 5 },
          passFeeToPayer: { type: "boolean", default: true },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          expectedPayers: {
            type: "array",
            items: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", example: "John Doe" },
                contact: { type: "string", example: "john@example.com" },
              },
            },
          },
          customFields: {
            type: "array",
            items: { $ref: "#/components/schemas/CustomField" },
          },
        },
      },
      Collection: {
        allOf: [
          { $ref: "#/components/schemas/CollectionInput" },
          {
            type: "object",
            properties: {
              _id: { type: "string", example: "6746e8b9c1a2b3d4e5f60718" },
              slug: { type: "string", example: "hostel-starlink-split-x9k2" },
              amountRaised: { type: "number", example: 45000 },
              totalCollected: { type: "number", example: 45000 },
              stockSold: { type: "integer", example: 3 },
              contributorCount: { type: "integer", example: 3 },
              status: { type: "string", enum: ["ACTIVE", "COMPLETED", "PAUSED", "CLOSED"], example: "ACTIVE" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      Organizer: {
        type: "object",
        properties: {
          _id: { type: "string" },
          id: { type: "string" },
          fullName: { type: "string", example: "Olamide Adeyemi" },
          email: { type: "string", format: "email", example: "organizer@example.com" },
          phone: { type: "string", example: "08012345678" },
          handle: { type: "string", example: "nacos-treasury" },
          avatarUrl: { type: "string", format: "uri" },
          settlementBank: { type: "object", nullable: true },
          verified: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PaymentInitializeRequest: {
        type: "object",
        required: ["slug", "contributorName"],
        properties: {
          slug: { type: "string", example: "hostel-starlink-split-x9k2" },
          contributorName: { type: "string", example: "Olamide Adeyemi" },
          contributorEmail: { type: "string", format: "email", example: "olamide@student.lautech.edu.ng" },
          contributorPhone: { type: "string", example: "08012345678" },
          amount: { type: "number", example: 15000, description: "Base contribution amount in NGN" },
          quantity: { type: "integer", default: 1, example: 1 },
          customResponses: {
            type: "object",
            additionalProperties: { type: "string" },
            example: { "Matric Number": "190452", "Room": "Block B - 12" },
          },
          customFieldAnswers: { type: "array", items: { type: "object" } },
        },
      },
      PaymentVerifyRequest: {
        type: "object",
        description: "Supply txnRef, txnref, or transactionreference.",
        required: ["txnRef"],
        properties: {
          txnRef: { type: "string", example: "WP-1732704812940-8821" },
          txnref: { type: "string" },
          transactionreference: { type: "string" },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          _id: { type: "string" },
          collectionId: { type: "string" },
          collectionTitle: { type: "string" },
          collectionSlug: { type: "string" },
          collectionType: { type: "string", enum: ["POOL", "OPEN", "INVENTORY"] },
          txnRef: { type: "string" },
          contributorName: { type: "string" },
          contributorEmail: { type: "string", format: "email" },
          contributorPhone: { type: "string" },
          quantity: { type: "integer" },
          baseAmount: { type: "number" },
          feeAmount: { type: "number" },
          totalPaid: { type: "number" },
          customResponses: { type: "object", additionalProperties: true },
          customFieldAnswers: { type: "array", items: { type: "object" } },
          receiptCode: { type: "string" },
          interswitchRef: { type: "string" },
          receiptHash: { type: "string" },
          status: { type: "string", enum: ["PENDING", "SUCCESS", "FAILED"] },
          createdAt: { type: "string", format: "date-time" },
          paidAt: { type: "string", format: "date-time" },
        },
      },
      Receipt: {
        type: "object",
        properties: {
          receiptCode: { type: "string", example: "RCP-9F3A2C8E1B" },
          receiptHash: {
            type: "string",
            description: "A 24-character SHA-256-derived receipt hash",
            example: "e3b0c44298fc1c149afbf4c",
          },
          txnRef: { type: "string", example: "WEPAY-1732704812940-8821" },
          collectionTitle: { type: "string", example: "Hostel Starlink Monthly Split" },
          payerName: { type: "string", example: "Olamide Adeyemi" },
          amountPaid: { type: "number", example: 15000 },
          status: { type: "string", example: "VERIFIED" },
          verifiedAt: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Collection not found" },
          error: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["System"],
        summary: "API landing endpoint",
        servers: [
          { url: "https://wepay-slkv.onrender.com" },
          { url: "http://localhost:5000" },
        ],
        responses: {
          200: {
            description: "API status and links to the API documentation and health check",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "WePay API is running" },
                    docs: { type: "string", example: "/api-docs" },
                    health: { type: "string", example: "/api/health" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Backend health check",
        responses: {
          200: {
            description: "API health and current database connection state",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "WePay API" },
                    database: { type: "string", enum: ["connected", "disconnected"], example: "connected" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/public/c/{slug}": {
      get: {
        tags: ["Collections"],
        summary: "Fetch public collection details by slug",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string", example: "hostel-starlink-split-x9k2" },
          },
        ],
        responses: {
          200: {
            description: "Collection metadata and recent successful transactions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    collection: { $ref: "#/components/schemas/Collection" },
                    recentTransactions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Transaction" },
                    },
                  },
                },
              },
            },
          },
          404: { description: "Collection not found" },
        },
      },
    },
    "/public/u/{handle}": {
      get: {
        tags: ["Profile"],
        summary: "Fetch an organizer's public hub and active collections",
        parameters: [
          {
            name: "handle",
            in: "path",
            required: true,
            schema: { type: "string", example: "nacos-treasury" },
          },
        ],
        responses: {
          200: {
            description: "Organizer profile and active collections",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    organizer: { $ref: "#/components/schemas/Organizer" },
                    collections: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Collection" },
                    },
                  },
                },
              },
            },
          },
          404: { description: "Organizer handle not found" },
        },
      },
    },
    "/public/receipts/{receiptCode}": {
      get: {
        tags: ["Receipts"],
        summary: "Retrieve a public receipt by receipt code or transaction reference",
        parameters: [
          {
            name: "receiptCode",
            in: "path",
            required: true,
            schema: { type: "string", example: "RCP-9F3A2C8E1B" },
          },
        ],
        responses: {
          200: {
            description: "Receipt transaction and related collection details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    transaction: { $ref: "#/components/schemas/Transaction" },
                    collection: { type: "object" },
                    isSimulated: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
          404: { description: "Receipt code not found or invalid" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new organizer account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "email", "password"],
                properties: {
                  fullName: { type: "string", example: "LAUTECH NACOS Treasury" },
                  email: { type: "string", format: "email", example: "treasurer@nacoslautech.org" },
                  phone: { type: "string", example: "08012345678" },
                  handle: { type: "string", example: "nacos-treasury" },
                  password: { type: "string", format: "password", example: "StrongPass123!" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Organizer registered and JWT issued",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/Organizer" },
                    organizer: { $ref: "#/components/schemas/Organizer" },
                  },
                },
              },
            },
          },
          400: { description: "Full name, email, and password are required" },
          409: { description: "An account with this email already exists" },
          500: { description: "Registration failed" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate organizer and retrieve JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "treasurer@nacoslautech.org" },
                  password: { type: "string", format: "password", example: "StrongPass123!" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    user: { $ref: "#/components/schemas/Organizer" },
                    organizer: { $ref: "#/components/schemas/Organizer" },
                  },
                },
              },
            },
          },
          400: { description: "Email and password are required" },
          401: { description: "Invalid credentials" },
          500: { description: "Login failed" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the authenticated organizer",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current organizer profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/Organizer" },
                    organizer: { $ref: "#/components/schemas/Organizer" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/profile/bank": {
      post: {
        tags: ["Profile"],
        summary: "Configure or update organizer settlement bank details",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bankName", "accountNumber"],
                properties: {
                  bankName: { type: "string", example: "GTBank" },
                  bankCode: { type: "string", example: "058" },
                  accountNumber: { type: "string", example: "0123456789" },
                  accountName: { type: "string", example: "NACOS LAUTECH CHAPTER" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Settlement bank saved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    organizer: { $ref: "#/components/schemas/Organizer" },
                    user: { $ref: "#/components/schemas/Organizer" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid or incomplete settlement bank details" },
          404: { description: "Organizer not found" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/collections/ai-draft": {
      post: {
        tags: ["Collections"],
        summary: "Generate a structured collection configuration from a plain-English prompt",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt"],
                properties: {
                  prompt: {
                    type: "string",
                    example: "Split ₦75,000 Starlink bill among 5 roommates and collect room number",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "AI-generated collection draft ready for review/creation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    draft: { $ref: "#/components/schemas/CollectionInput" },
                  },
                },
              },
            },
          },
          400: { description: "Prompt is missing or too short" },
        },
      },
    },
    "/collections": {
      get: {
        tags: ["Collections"],
        summary: "List all collections created by the authenticated organizer",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Array of organizer collections",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    collections: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Collection" },
                    },
                    stats: {
                      type: "object",
                      properties: {
                        totalRaised: { type: "number", example: 45000 },
                        activeCount: { type: "integer", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Collections"],
        summary: "Create and publish a new POOL, OPEN, or INVENTORY collection link",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CollectionInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Collection created with shareable /c/:slug",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    collection: { $ref: "#/components/schemas/Collection" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/collections/{slug}": {
      get: {
        tags: ["Collections"],
        summary: "Fetch public collection details for the /c/:slug checkout page",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string", example: "hostel-starlink-split-x9k2" },
          },
        ],
        responses: {
          200: {
            description: "Public collection metadata, remaining stock, and fee configuration",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    collection: { $ref: "#/components/schemas/Collection" },
                    recentTransactions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Transaction" },
                    },
                  },
                },
              },
            },
          },
          404: { description: "Collection not found" },
        },
      },
    },
    "/collections/{id}/ledger": {
      get: {
        tags: ["Collections"],
        summary: "Fetch a collection's organizer-only transaction ledger",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Collection MongoDB ID or slug",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Collection and all transaction records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    collection: { $ref: "#/components/schemas/Collection" },
                    transactions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Transaction" },
                    },
                  },
                },
              },
            },
          },
          403: { description: "Only the organizer can view this ledger" },
          404: { description: "Collection not found" },
        },
      },
    },
    "/collections/{slug}/status": {
      patch: {
        tags: ["Collections"],
        summary: "Activate, pause, complete, or close a collection",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            description: "Collection MongoDB ID or slug",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["ACTIVE", "COMPLETED", "PAUSED", "CLOSED"],
                    example: "PAUSED",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated collection",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    collection: { $ref: "#/components/schemas/Collection" },
                  },
                },
              },
            },
          },
          403: { description: "Only the organizer can update this collection" },
          404: { description: "Collection not found" },
        },
      },
    },
    "/payments/initialize": {
      post: {
        tags: ["Payments"],
        summary: "Initialize an Interswitch checkout for a collection",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaymentInitializeRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Checkout parameters and pending transaction returned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    checkoutParams: {
                      type: "object",
                      properties: {
                        txnRef: { type: "string" },
                        amount: { type: "integer", description: "Total amount in kobo" },
                        amountNaira: { type: "number" },
                        baseAmountNaira: { type: "number" },
                        feeAmountNaira: { type: "number" },
                        merchantCode: { type: "string" },
                        payItemId: { type: "string" },
                        mode: { type: "string", enum: ["TEST", "LIVE"], example: "TEST" },
                        currency: { type: "string", example: "566" },
                        receiptCode: { type: "string" },
                        isSandboxSimulation: { type: "boolean", example: false },
                      },
                    },
                    transaction: { $ref: "#/components/schemas/Transaction" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid payment details or collection cannot accept payments" },
          404: { description: "Collection not found" },
        },
      },
    },
    "/payments/verify": {
      post: {
        tags: ["Payments"],
        summary: "Server-side Interswitch IPG transaction requery and receipt settlement",
        description:
          "Queries Interswitch using the transaction reference and stored kobo amount. Settlement requires ResponseCode '00' and a returned Amount exactly matching the transaction amount in kobo. Transaction and collection updates are committed idempotently per transaction reference.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaymentVerifyRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Verification result and transaction state",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    transaction: { $ref: "#/components/schemas/Transaction" },
                    collection: { $ref: "#/components/schemas/Collection" },
                    interswitchResponse: { type: "object", nullable: true },
                    verificationError: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Transaction reference is missing" },
          404: { description: "Transaction not found" },
        },
      },
    },
    "/payments/redirect-return": {
      get: {
        tags: ["Payments"],
        summary: "Handle a GET return from Interswitch and redirect back to checkout",
        parameters: [
          { name: "txnref", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          303: {
            description: "Redirect to the public collection page with txnref for server-side verification",
            headers: { Location: { schema: { type: "string" } } },
          },
          404: { description: "Transaction or collection not found" },
        },
      },
      post: {
        tags: ["Payments"],
        summary: "Handle Interswitch's form POST return and redirect back to checkout",
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["txnref"],
                properties: {
                  txnref: { type: "string" },
                  amount: { type: "integer", description: "Returned amount in kobo; not trusted for settlement" },
                  apprAmt: { type: "integer", description: "Approved amount in kobo" },
                  resp: { type: "string", description: "Gateway response code; not trusted for settlement" },
                  desc: { type: "string" },
                  retRef: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          303: {
            description: "Redirect to the public collection page with txnref for server-side verification",
            headers: { Location: { schema: { type: "string" } } },
          },
          400: { description: "Transaction reference missing" },
          404: { description: "Transaction or collection not found" },
        },
      },
    },
    "/payments/webhook": {
      post: {
        tags: ["Payments"],
        summary: "Receive an Interswitch payment webhook",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  txnRef: { type: "string" },
                  transactionReference: { type: "string" },
                  merchantTransactionReference: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      merchantTransactionReference: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Webhook acknowledged",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    received: { type: "boolean", example: true },
                    status: { type: "string", enum: ["PENDING", "SUCCESS", "FAILED"] },
                  },
                },
              },
            },
          },
          400: { description: "Transaction reference is missing" },
          404: { description: "Transaction not found" },
        },
      },
    },
    "/payments/receipt/{receiptCode}": {
      get: {
        tags: ["Receipts"],
        summary: "Retrieve a digital receipt by receipt code or transaction reference",
        parameters: [
          {
            name: "receiptCode",
            in: "path",
            required: true,
            schema: { type: "string", example: "RCP-9F3A2C8E1B" },
          },
        ],
        responses: {
          200: {
            description: "Cryptographically verified receipt payload",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    transaction: { $ref: "#/components/schemas/Transaction" },
                    collection: { type: "object" },
                    isSimulated: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
          404: { description: "Invalid or unknown receipt code" },
        },
      },
    },
  },
};

module.exports = swaggerSpec;