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
  const firstNumber = text.match(/\b(\d{1,6})\b/);
  return firstNumber ? Math.max(1, Number(firstNumber[1])) : 50;
};

const callGeminiJson = async ({ systemInstruction, userPrompt }) => {
  if (!process.env.GEMINI_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
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
    if (!response.ok) return null;
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const customField = (id, label, type = "short_text", required = true, placeholder = "") => ({
  id,
  label,
  type,
  required,
  placeholder,
  helpText: "",
  options: [],
  order: 0,
});

exports.draftCollectionFromPrompt = async (prompt) => {
  const raw = String(prompt || "").trim();
  const gemini = await callGeminiJson({
    systemInstruction:
      "Create a WePay collection draft JSON with title, description, type, mode, pricingRule, amount, targetAmount, stockLimit, passFeeToPayer, customFields, and auditTips. Valid types: POOL, OPEN, INVENTORY. Valid pricingRule: FIXED, MINIMUM, FLEXIBLE.",
    userPrompt: raw,
  });
  if (gemini && typeof gemini === "object") {
    const amount = Math.max(10, Number(gemini.amount) || 10);
    return { data: { ...gemini, amount, auditTips: Array.isArray(gemini.auditTips) ? gemini.auditTips : [] }, source: "gemini" };
  }

  const lower = raw.toLowerCase();
  const inventory = /(ticket|slot|merch|shirt|pass|limited|seat|t-shirt)/i.test(lower);
  const open = /(donate|donation|support|gift|contribute|open)/i.test(lower);
  const amount = extractNairaAmount(raw);
  const stockLimit = inventory ? extractStockLimit(raw) : null;
  const isPool = !inventory && !open;
  const title = raw.length > 60 ? `${raw.slice(0, 57)}...` : raw || "My WePay Collection";
  const fields = [];
  if (/matric|nacos|departmental|campus|student/i.test(lower)) fields.push(customField("field_1", "Matric Number", "short_text", true, "Enter your matric number"));
  if (/department/i.test(lower)) fields.push(customField(`field_${fields.length + 1}`, "Department", "short_text", true, "Enter your department"));
  if (/phone|whatsapp/i.test(lower)) fields.push(customField(`field_${fields.length + 1}`, "Phone Number", "phone", true, "0803 123 4567"));
  if (/shirt|size|merch/i.test(lower)) fields.push(customField(`field_${fields.length + 1}`, "T-Shirt Size", "select", true, "Choose a size"));
  if (/level/i.test(lower)) fields.push(customField(`field_${fields.length + 1}`, "Level", "short_text", true, "e.g. 300 Level"));
  if (/hostel|room/i.test(lower)) fields.push(customField(`field_${fields.length + 1}`, "Hostel", "short_text", true, "Enter hostel or room"));
  fields.forEach((field, index) => { field.order = index; });

  const auditTips = [];
  if (inventory) auditTips.push("Stock count is limited; the public link will close automatically when all slots sell.");
  if (fields.some((field) => field.label === "Matric Number")) auditTips.push("Matric Number is added for campus collection verification.");
  if (/ticket|pass/i.test(lower) && amount >= 500) auditTips.push("Check fee pass-through: a small ticket price can feel high after checkout fees.");
  if (isPool) auditTips.push("The collection is configured as a pooled target. Review the target before publishing.");

  return {
    data: {
      title,
      description: `Collection for ${raw || "your contributors"}.`,
      type: inventory ? "INVENTORY" : open ? "OPEN" : "POOL",
      mode: inventory || open ? "FLEXIBLE" : "SPLIT",
      pricingRule: inventory ? "FIXED" : open ? "FLEXIBLE" : "FIXED",
      amount,
      targetAmount: isPool ? amount : 0,
      stockLimit,
      passFeeToPayer: true,
      customFields: fields,
      auditTips,
    },
    source: "smart-fallback",
  };
};

exports.navigateAndGuide = async ({ message, currentPath, isAuthenticated, isFounder }) => {
  const gemini = await callGeminiJson({
    systemInstruction: "Answer as WePay's Nigerian-friendly guide. Return JSON reply and actions label/route/description. Only allow admin route for founders.",
    userPrompt: JSON.stringify({ message, currentPath, isAuthenticated, isFounder }),
  });
  if (gemini && gemini.reply) return { data: gemini, source: "gemini" };

  const text = String(message || "").toLowerCase();
  const actions = [];
  let reply = "I can help you find the right WePay page.";

  if (/bank|account|settlement|payout/.test(text)) {
    reply = isAuthenticated
      ? "You fit add or update your payout bank account from Profile."
      : "Sign in first, then go to Profile to add your bank account.";
    actions.push({ label: "Go to Profile", route: isAuthenticated ? "/dashboard/profile" : "/login", description: "Manage settlement bank details" });
  } else if (/create|ticket|new collection|link|collect/.test(text)) {
    reply = isAuthenticated
      ? "You fit create a pool, open collection, or ticket link from the Create Collection page."
      : "Sign in to create a collection or payment link.";
    actions.push({ label: "Create Collection", route: isAuthenticated ? "/dashboard/create" : "/login", description: "Build a new payment collection" });
  } else if (/who.*pay|who don pay|transaction|ledger|pending|failed|paid/.test(text)) {
    reply = isAuthenticated
      ? "Open Transactions to see who paid, pending payments, and failed attempts."
      : "Sign in to check your payment ledger.";
    actions.push({ label: "Open Transactions", route: isAuthenticated ? "/dashboard/transactions" : "/login", description: "Search payment records" });
  } else if (/receipt|payment safe|safe|secure|card/.test(text)) {
    reply = "WePay uses server-side Interswitch verification before showing a receipt. Never share OTP or card details with anyone.";
    actions.push({ label: "View Dashboard", route: isAuthenticated ? "/dashboard" : "/", description: "Return to WePay" });
  } else if (/admin|founder|risk|fraud/.test(text)) {
    if (isFounder) {
      reply = "Founder access is available. You can review platform telemetry and fraud alerts in the Admin console.";
      actions.push({ label: "Founder Console", route: "/admin", description: "Open platform operations" });
    } else {
      reply = "That area is only available to approved founder accounts.";
    }
  } else if (/dashboard|collection|organizer/.test(text)) {
    reply = isAuthenticated ? "Your dashboard shows collection performance and payments." : "Sign in to manage your organizer dashboard.";
    actions.push({ label: "Open Dashboard", route: isAuthenticated ? "/dashboard" : "/login", description: "Organizer control center" });
  } else if (/forgot|reset password/.test(text)) {
    reply = "Use Forgot Password on the sign-in page to request a reset link.";
    actions.push({ label: "Reset Password", route: "/forgot-password", description: "Request a password reset" });
  }

  return { data: { reply, actions }, source: "smart-fallback" };
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
