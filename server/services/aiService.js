const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const formatNaira = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const extractNairaAmount = (text) => {
  const explicitNaira = text.match(/₦\s*([\d][\d,]*(?:\.\d+)?)|NGN\s*([\d][\d,]*(?:\.\d+)?)|\b([\d][\d,]*(?:\.\d+)?)\s*(?:naira|ngn)\b/i);
  if (explicitNaira) return Math.max(10, Math.round(Number((explicitNaira[1] || explicitNaira[2] || explicitNaira[3]).replace(/,/g, ""))));
  const numbers = [...text.matchAll(/\b(\d{2,})\b/g)].map((match) => Number(match[1]));
  return numbers.length ? Math.max(10, Math.max(...numbers)) : 10;
};

const extractStockLimit = (text) => {
  const match = text.match(/(\d{1,6})\s*(tickets?|slots?|units?|seats?|shirts?|passes?|merch|stock)/i);
  if (match) return Math.max(1, Number(match[1]));
  const nearby = text.match(/(\d{1,6})\s+(?:NACOS\s+)?[\w\s-]*(?:ticket|slot|unit|seat|pass|merch)/i);
  if (nearby) return Math.max(1, Number(nearby[1]));
  return null;
};

const callGeminiJson = async ({ systemInstruction, userPrompt }) => {
  let timeout;
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Gemini HTTP ${response.status}${details ? `: ${details}` : ""}`);
    }
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    if (!text) throw new Error("Gemini returned an empty response");
    return JSON.parse(text);
  } catch (error) {
    console.warn("[WePay AI] Gemini fallback:", error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const customField = (label, type = "text", required = true, options) => ({
  label,
  type,
  required,
  ...(options ? { options } : {}),
});

const draftCollectionFallback = (raw) => {
  const lower = raw.toLowerCase();
  const inventory = /(ticket|slot|merch|shirt|pass|limited|seat|t-shirt)/i.test(lower);
  const open = /(donate|donation|support|gift|contribute|open contribution)/i.test(lower);
  const mode = inventory ? "INVENTORY" : open ? "OPEN" : "POOL";
  const parsedAmount = extractNairaAmount(raw);
  const splitCount = lower.match(/(?:among|between|split(?:ting)?\s+(?:it\s+)?among)\s+(\d{1,4})/i);
  const count = splitCount ? Number(splitCount[1]) : null;
  const targetAmount = mode === "POOL" ? parsedAmount : null;
  const amount = mode === "POOL" && count
    ? Math.max(10, Math.ceil(targetAmount / count))
    : parsedAmount;
  const stockLimit = inventory ? extractStockLimit(raw) || 50 : null;
  const title = raw
    .replace(/^(please\s+)?(create|make|set up|build)\s+(me\s+)?(a|an)?\s*/i, "")
    .replace(/\s*(?:among|between)\s+\d{1,4}\s+.+$/i, "")
    .trim();
  const fields = [];
  if (/matric|nacos|departmental|campus|student|dues/i.test(lower)) fields.push(customField("Matric Number"));
  if (/department/i.test(lower)) fields.push(customField("Department"));
  if (/phone|whatsapp/i.test(lower)) fields.push(customField("Phone Number"));
  if (/shirt|size|merch/i.test(lower)) fields.push(customField("T-Shirt Size", "select", true, ["S", "M", "L", "XL", "XXL"]));
  if (/level/i.test(lower)) fields.push(customField("Level"));
  if (/hostel|room/i.test(lower)) fields.push(customField("Hostel / Room"));

  const auditTips = [];
  if (inventory) auditTips.push("Confirm the stock limit before sharing the pre-order link.");
  if (mode === "POOL") auditTips.push("Check the total target and per-person contribution before publishing.");
  if (/\b(absorb|organizer absorbs|no fee)\b/i.test(lower)) auditTips.push("The organizer absorbs the 1.5% payment fee.");
  if (auditTips.length === 0) auditTips.push("Review the collection details and fee handling before sharing the link.");

  return {
    title: title.length > 60 ? `${title.slice(0, 57)}...` : title || "WePay Collection",
    description: `Payment collection for ${title || "your contributors"}.`,
    mode,
    pricingRule: mode === "INVENTORY" ? "UNIT" : mode === "OPEN" ? "OPEN" : "FIXED",
    amount: Math.max(10, amount),
    targetAmount,
    stockLimit,
    feeHandling: /\b(absorb|organizer absorbs|no fee)\b/i.test(lower) ? "ABSORB" : "PASS_TO_PAYER",
    customFields: fields,
    auditTips: auditTips.slice(0, 2),
  };
};

const normalizeCollectionDraft = (draft, fallback) => {
  const mode = ["INVENTORY", "POOL", "OPEN"].includes(draft.mode) ? draft.mode : fallback.mode;
  const pricingRule = mode === "INVENTORY"
    ? "UNIT"
    : mode === "OPEN"
    ? "OPEN"
    : draft.pricingRule === "FIXED"
    ? "FIXED"
    : fallback.pricingRule;
  const seenFieldLabels = new Set();
  const customFields = Array.isArray(draft.customFields)
    ? draft.customFields
      .filter((field) => {
        if (!field || typeof field.label !== "string" || !field.label.trim()) return false;
        const label = field.label.trim().toLowerCase();
        if (seenFieldLabels.has(label)) return false;
        seenFieldLabels.add(label);
        return true;
      })
      .map((field) => {
        const type = ["text", "number", "select"].includes(field.type) ? field.type : "text";
        const options = type === "select" && Array.isArray(field.options)
          ? [...new Set(field.options.filter((option) => typeof option === "string" && option.trim()).map((option) => option.trim()))].slice(0, 20)
          : undefined;
        return {
          label: field.label.trim().slice(0, 80),
          type,
          required: field.required !== false,
          ...(type === "select" ? { options: options?.length ? options : ["Option 1", "Option 2"] } : {}),
        };
      })
      .slice(0, 8)
    : fallback.customFields;
  const amount = Number(draft.amount);
  const target = Number(draft.targetAmount);
  const stock = Number(draft.stockLimit);
  const feeHandling = ["ABSORB", "PASS_TO_PAYER"].includes(draft.feeHandling)
    ? draft.feeHandling
    : fallback.feeHandling;
  const auditTips = Array.isArray(draft.auditTips)
    ? draft.auditTips.filter((tip) => typeof tip === "string" && tip.trim()).map((tip) => tip.trim().slice(0, 140)).slice(0, 2)
    : [];

  return {
    title: typeof draft.title === "string" && draft.title.trim() ? draft.title.trim().slice(0, 70) : fallback.title,
    description: typeof draft.description === "string" && draft.description.trim() ? draft.description.trim().slice(0, 500) : fallback.description,
    mode,
    pricingRule,
    amount: draft.amount !== null && draft.amount !== undefined && Number.isFinite(amount)
      ? Math.max(10, amount)
      : fallback.amount,
    targetAmount: mode === "POOL"
      ? Number.isFinite(target) && target >= 10 ? target : fallback.targetAmount
      : null,
    stockLimit: mode === "INVENTORY"
      ? Number.isInteger(stock) && stock > 0 ? stock : fallback.stockLimit
      : null,
    feeHandling,
    customFields,
    auditTips: auditTips.length ? auditTips : fallback.auditTips,
  };
};

exports.draftCollectionFromPrompt = async (prompt) => {
  const raw = String(prompt || "").trim();
  const fallback = draftCollectionFallback(raw);
  const gemini = await callGeminiJson({
    systemInstruction:
      'Create a useful WePay collection draft as JSON with exactly these fields: title (string), description (string), mode ("INVENTORY"|"POOL"|"OPEN"), pricingRule ("UNIT" for INVENTORY, "FIXED" for fixed dues/splits, "OPEN" for open contributions), amount (number >= 10), targetAmount (number or null), stockLimit (number or null), feeHandling ("ABSORB"|"PASS_TO_PAYER"), customFields (array of {label, type: "text"|"number"|"select", required, options?: string[]}), auditTips (array of 1-2 short practical organizer tips). For a pool split among N people, use the per-person amount and overall target. Infer inventory stock and appropriate contributor fields from the prompt. Return JSON only.',
    userPrompt: raw,
  });
  if (gemini && typeof gemini === "object") {
    return { data: normalizeCollectionDraft(gemini, fallback), source: "gemini" };
  }
  return { data: fallback, source: "smart-fallback" };
};

exports.navigateAndGuide = async ({ message, currentPath, isAuthenticated, isFounder }) => {
  const gemini = await callGeminiJson({
    systemInstruction: `You are WePay's concise, accurate Nigerian-friendly product guide. WePay supports Bill Pooling, Inventory Pre-Orders, and Open Dues; secure live Interswitch IPG checkout with Card, Transfer, and USSD; automatic Brevo email receipts after successful payments; T+1 settlements through Interswitch to the bank account saved in Profile; a 1.5% payment fee with organizer-absorbed or payer-paid handling; collection sharing by public link and QR code; transaction/payer checking and CSV exports. Answer in 2-3 clear sentences in the user's language (English or Nigerian Pidgin). Return JSON with "reply" and up to 2 relevant "actions" ({label, route, description}). Use only these routes: /dashboard/create, /dashboard/profile, /dashboard/transactions, /dashboard/collections, /dashboard, /login, /forgot-password, /. Use /admin only when isFounder is true. Do not suggest actions requiring authentication to an unauthenticated user; point them to /login instead. Do not claim a payment succeeded without verified status.`,
    userPrompt: JSON.stringify({ message, currentPath, isAuthenticated, isFounder }),
  });
  const allowedRoutes = new Set(["/dashboard/create", "/dashboard/profile", "/dashboard/transactions", "/dashboard/collections", "/dashboard", "/login", "/forgot-password", "/"]);
  if (isFounder) allowedRoutes.add("/admin");
  if (gemini && typeof gemini.reply === "string" && gemini.reply.trim()) {
    const actions = Array.isArray(gemini.actions)
      ? gemini.actions
        .filter((action) => action && typeof action.label === "string" && typeof action.route === "string" && allowedRoutes.has(action.route))
        .filter((action) => isAuthenticated || ["/login", "/forgot-password", "/"].includes(action.route))
        .slice(0, 2)
        .map((action) => ({
          label: action.label.slice(0, 50),
          route: action.route,
          description: typeof action.description === "string" ? action.description.slice(0, 100) : "",
        }))
      : [];
    return { data: { reply: gemini.reply.trim(), actions }, source: "gemini" };
  }

  const text = String(message || "").toLowerCase();
  const actions = [];
  const pidgin = /\b(abi|abeg|wetin|how i go|how e|dey|don pay|na so|fit)\b/i.test(text);
  const guide = (english, pidginText) => pidgin ? pidginText : english;
  let reply = guide("I can help with collections, payments, settlements, receipts, and reports.", "I fit help with collections, payments, settlement, receipts, and reports.");

  if (/fee|charge|percent|1\.5/.test(text)) {
    reply = guide(
      "WePay charges a 1.5% payment fee, which can be passed to the payer or absorbed by the organizer when creating a collection. You can review that setting before publishing.",
      "WePay charges 1.5% per payment; the payer fit cover am or the organizer fit absorb am when creating the collection. Check the fee setting before you publish."
    );
    if (isAuthenticated) actions.push({ label: "Create Collection", route: "/dashboard/create", description: "Choose who covers the payment fee" });
  } else if (/withdraw|bank|account|settlement|payout/.test(text)) {
    reply = guide(
      "Settlements are processed T+1 through Interswitch to the bank account saved in your Profile. Add or update that account before collecting payments.",
      "Settlement dey process T+1 through Interswitch go the bank account wey you save for Profile. Add or update the account before you collect payments."
    );
    actions.push({ label: "Go to Profile", route: isAuthenticated ? "/dashboard/profile" : "/login", description: "Manage settlement bank details" });
  } else if (/receipt|email receipt|proof of payment/.test(text)) {
    reply = guide(
      "After Interswitch confirms a successful payment, WePay automatically emails the payer a receipt through Brevo. Organizers can verify the transaction in the ledger.",
      "Once Interswitch confirm say payment succeed, WePay go email receipt to the payer through Brevo. Organizer fit verify the payment for the ledger."
    );
    actions.push({ label: isAuthenticated ? "View Transactions" : "Sign in", route: isAuthenticated ? "/dashboard/transactions" : "/login", description: "Check confirmed payments" });
  } else if (/share|sharing|qr|barcode|collection link/.test(text)) {
    reply = guide(
      "Open a collection and use Share to copy its public payment link or show its QR code. Payers can then complete checkout through Interswitch.",
      "Open the collection and tap Share to copy the payment link or show the QR code. Payers fit use am to pay through Interswitch."
    );
    actions.push({ label: isAuthenticated ? "My Collections" : "Sign in", route: isAuthenticated ? "/dashboard/collections" : "/login", description: "Open a collection to share its link or QR" });
  } else if (/create|ticket|new collection|collect|pre.?order|pool|dues/.test(text)) {
    reply = guide(
      "Create a Bill Pool for shared costs, an Inventory Pre-Order for limited items, or Open Dues for flexible contributions. Add your pricing, target or stock, and contributor fields before sharing.",
      "Create Bill Pool for shared costs, Inventory Pre-Order for limited items, or Open Dues for flexible contributions. Set the price, target or stock, then share your link."
    );
    actions.push({ label: "Create Collection", route: isAuthenticated ? "/dashboard/create" : "/login", description: "Build a new payment collection" });
  } else if (/who.*pay|who don pay|payer|transaction|ledger|pending|failed|paid|csv|export/.test(text)) {
    reply = guide(
      "Open Transactions to search payers and check successful, pending, or failed payments; you can also export the records as CSV. Use the verified status in the ledger to confirm payment.",
      "Open Transactions to search payers and check successful, pending, or failed payments; you fit also export CSV. Use the verified ledger status to confirm payment."
    );
    actions.push({ label: isAuthenticated ? "Open Transactions" : "Sign in", route: isAuthenticated ? "/dashboard/transactions" : "/login", description: "Search payers and export transaction records" });
  } else if (/payment safe|safe|secure|card|transfer|ussd|interswitch/.test(text)) {
    reply = guide(
      "Live checkout runs through Interswitch and supports Card, Transfer, and USSD. WePay verifies payments before marking them successful or issuing receipts; never share your OTP.",
      "Live checkout dey use Interswitch with Card, Transfer, and USSD. WePay verify payment before marking am successful or sending receipt; no share your OTP."
    );
    actions.push({ label: isAuthenticated ? "View Transactions" : "Sign in", route: isAuthenticated ? "/dashboard/transactions" : "/login", description: "Review verified payments" });
  } else if (/admin|founder|risk|fraud/.test(text)) {
    if (isFounder) {
      reply = "Founder access is available. You can review platform telemetry and fraud alerts in the Admin console.";
      actions.push({ label: "Founder Console", route: "/admin", description: "Open platform operations" });
    } else {
      reply = guide("The admin console is only available to approved founder accounts.", "Admin console na only approved founder accounts fit access.");
    }
  } else if (/dashboard|collection|organizer/.test(text)) {
    reply = guide(
      "Your dashboard summarizes collection performance, while Transactions provides searchable payment records and CSV exports.",
      "Your dashboard show collection performance, while Transactions get searchable payment records and CSV export."
    );
    actions.push({ label: "Open Dashboard", route: isAuthenticated ? "/dashboard" : "/login", description: "Organizer control center" });
  } else if (/forgot|reset password/.test(text)) {
    reply = "Use Forgot Password on the sign-in page to request a reset link.";
    actions.push({ label: "Reset Password", route: "/forgot-password", description: "Request a password reset" });
  }

  return { data: { reply, actions: actions.slice(0, 2) }, source: "smart-fallback" };
};

exports.queryOrganizerLedger = async ({ question, collections, transactions }) => {
  const gemini = await callGeminiJson({
    systemInstruction: "For organizer ledger questions, answer conservatively and return JSON answer, summaryMetric, matchedTransactionIds.",
    userPrompt: JSON.stringify({ question, collections, transactions }),
  });
  if (gemini?.answer) return { data: gemini, source: "gemini" };

  const lower = String(question || "").toLowerCase();
  const success = transactions.filter((tx) => tx.status === "SUCCESS");
  const pending = transactions.filter((tx) => tx.status === "PENDING");
  const failed = transactions.filter((tx) => tx.status === "FAILED");
  const totalRaised = success.reduce((sum, tx) => sum + Number(tx.baseAmount || tx.amount || tx.totalPaid || 0), 0);

  if (/how much|raised|total|volume/.test(lower)) {
    return {
      data: {
        answer: `${success.length} successful payments raised ${formatNaira(totalRaised)}.`,
        summaryMetric: formatNaira(totalRaised),
        matchedTransactionIds: success.map((tx) => String(tx._id)),
      },
      source: "smart-fallback",
    };
  }
  if (/pending|failed|not paid|show/.test(lower)) {
    const matches = lower.includes("failed") ? failed : lower.includes("pending") ? pending : [...pending, ...failed];
    return {
      data: {
        answer: `${pending.length} pending and ${failed.length} failed payments were found.`,
        summaryMetric: `${pending.length + failed.length} needs review`,
        matchedTransactionIds: matches.map((tx) => String(tx._id)),
      },
      source: "smart-fallback",
    };
  }
  if (/recent|latest|who paid most/.test(lower)) {
    const newest = [...success].sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))[0];
    if (newest) {
      return {
        data: {
          answer: `${newest.payerName || newest.contributorName || "A payer"} paid ${formatNaira(newest.totalPaid)} recently.`,
          summaryMetric: formatNaira(newest.totalPaid),
          matchedTransactionIds: [String(newest._id)],
        },
        source: "smart-fallback",
      };
    }
  }
  const nameMatch = lower.match(/[a-z][a-z'-]+/g) || [];
  const matches = success.filter((tx) => {
    const haystack = `${tx.payerName || ""} ${tx.contributorName || ""} ${tx.contributorEmail || ""}`.toLowerCase();
    return nameMatch.some((word) => word.length > 2 && haystack.includes(word));
  });
  if (matches.length) {
    return {
      data: {
        answer: `Found ${matches.length} matching successful payment${matches.length === 1 ? "" : "s"}.`,
        summaryMetric: `${matches.length} match${matches.length === 1 ? "" : "es"}`,
        matchedTransactionIds: matches.map((tx) => String(tx._id)),
      },
      source: "smart-fallback",
    };
  }
  return {
    data: {
      answer: `There are ${success.length} successful, ${pending.length} pending, and ${failed.length} failed payments.`,
      summaryMetric: `${success.length} successful`,
      matchedTransactionIds: [],
    },
    source: "smart-fallback",
  };
};

exports.analyzeCollectionTelemetry = async ({ collection, transactions }) => {
  const gemini = await callGeminiJson({
    systemInstruction: "Analyze WePay collection metrics and return headline, insights, whatsappBroadcast, urgencyLevel.",
    userPrompt: JSON.stringify({ collection, transactions }),
  });
  if (gemini?.headline) return { data: gemini, source: "gemini" };

  const success = transactions.filter((tx) => tx.status === "SUCCESS");
  const pending = transactions.filter((tx) => tx.status === "PENDING");
  const totalCollected = success.reduce((sum, tx) => sum + Number(tx.baseAmount || tx.amount || 0), 0);
  const target = Number(collection.targetAmount || collection.totalTarget || 0);
  const remainingAmount = target > 0 ? Math.max(0, target - totalCollected) : 0;
  const remainingStock = collection.type === "INVENTORY" ? Math.max(0, Number(collection.stockLimit || 0) - Number(collection.stockSold || 0)) : 0;
  const percentComplete = collection.type === "INVENTORY" && collection.stockLimit
    ? Math.min(100, Math.round((Number(collection.stockSold || 0) / Number(collection.stockLimit)) * 100))
    : target > 0 ? Math.min(100, Math.round((totalCollected / target) * 100)) : 0;
  const publicUrl = `${process.env.APP_BASE_URL || "https://wepay-peach.vercel.app"}/c/${collection.slug}`;

  let urgency = "LOW";
  if (percentComplete >= 80 || pending.length > 3) urgency = "HIGH";
  else if (percentComplete >= 50) urgency = "MEDIUM";

  return {
    data: {
      headline: `${percentComplete}% complete — ${formatNaira(totalCollected)} collected`,
      insights: [
        `${success.length} successful payments contributed ${formatNaira(totalCollected)}.`,
        target > 0 ? `${formatNaira(remainingAmount)} remains to reach the target.` : collection.type === "INVENTORY" ? `${remainingStock} inventory slots remain.` : "This is an open flexible contribution collection.",
        pending.length ? `${pending.length} payment${pending.length === 1 ? "" : "s"} are still pending review.` : "There are no pending payments waiting for review.",
      ],
      whatsappBroadcast: `Hello! Please support ${collection.title}. ${formatNaira(totalCollected)} has been raised so far. ${publicUrl}`,
      urgencyLevel: urgency,
    },
    source: "smart-fallback",
  };
};

exports.scanPlatformAnomalies = async ({ collections, transactions }) => {
  const gemini = await callGeminiJson({
    systemInstruction: "Analyze platform transaction anomalies and return riskLevel, headline, findings, recommendations.",
    userPrompt: JSON.stringify({ collections, transactions }),
  });
  if (gemini?.riskLevel) return { data: gemini, source: "gemini" };

  const recent = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 500);
  const failed = recent.filter((tx) => tx.status === "FAILED");
  const failureRate = recent.length ? failed.length / recent.length : 0;
  const failuresByEmail = {};
  const disposablePattern = /(tempmail|mailinator|trashmail|10minutemail|yopmail)/i;
  const suspiciousEmails = new Set();
  failed.forEach((tx) => {
    const email = String(tx.contributorEmail || "").trim().toLowerCase();
    const key = email || "(missing)";
    failuresByEmail[key] = (failuresByEmail[key] || 0) + 1;
    if (email && disposablePattern.test(email)) suspiciousEmails.add(email);
  });
  const repeated = Object.entries(failuresByEmail).filter(([, count]) => count >= 3);

  const findings = [];
  if (failureRate >= 0.25) findings.push({ title: "High failure rate", detail: `${Math.round(failureRate * 100)}% of recent payments failed.`, severity: "ALERT" });
  else findings.push({ title: "Failure rate normal", detail: `${Math.round(failureRate * 100)}% of recent payments failed.`, severity: "INFO" });
  if (repeated.length) findings.push({ title: "Repeated failed attempts", detail: `${repeated.length} payer email${repeated.length === 1 ? "" : "s"} failed at least 3 times.`, severity: "WARN" });
  if (suspiciousEmails.size) findings.push({ title: "Suspicious email patterns", detail: `${suspiciousEmails.size} disposable-looking payer email${suspiciousEmails.size === 1 ? "" : "s"} found.`, severity: "ALERT" });
  if (!findings.some((finding) => finding.severity !== "INFO")) findings.push({ title: "No obvious anomalies", detail: "No repeated failures or disposable email patterns were detected.", severity: "INFO" });

  const riskLevel = findings.some((finding) => finding.severity === "ALERT")
    ? "HIGH"
    : findings.some((finding) => finding.severity === "WARN")
    ? "MEDIUM"
    : "LOW";

  return {
    data: {
      riskLevel,
      headline: riskLevel === "LOW" ? "No urgent platform risk detected" : `${riskLevel} platform risk detected`,
      findings,
      recommendations: [
        "Review the transaction ledger for repeated failed references.",
        "Verify any disposable payer email manually before escalating.",
        "Monitor Interswitch requery and webhook failures during peak activity.",
      ],
    },
    source: "smart-fallback",
  };
};
