const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getAppBaseUrl = () =>
  (process.env.APP_BASE_URL || 'https://wepay-peach.vercel.app').replace(/\/+$/, '');

const sendEmail = async ({ email, subject, htmlContent }) => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Brevo] Email skipped: BREVO_API_KEY is not configured.');
    return { skipped: true };
  }
  if (!EMAIL_REGEX.test(String(email || '').trim())) {
    console.warn('[Brevo] Email skipped: recipient address is invalid.');
    return { skipped: true };
  }
  if (!process.env.BREVO_SENDER_EMAIL) {
    console.warn('[Brevo] Email skipped: BREVO_SENDER_EMAIL is not configured.');
    return { skipped: true };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME || 'WePay',
        },
        to: [{ email: String(email).trim() }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.warn(`[Brevo] Email delivery failed with HTTP ${response.status}.`);
      return { skipped: true };
    }

    return { skipped: false };
  } catch (error) {
    console.warn('[Brevo] Email delivery failed:', error.message);
    return { skipped: true };
  }
};

exports.sendWelcomeEmail = ({ name, email }) => {
  const dashboardUrl = `${getAppBaseUrl()}/dashboard`;
  const safeName = escapeHtml(name || 'there');
  const safeDashboardUrl = escapeHtml(dashboardUrl);

  return sendEmail({
    email,
    subject: 'Welcome to WePay',
    htmlContent: `
      <!doctype html>
      <html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
        <main style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;padding:36px">
          <h1 style="margin:0 0 16px;color:#312e81">Welcome to WePay, ${safeName}!</h1>
          <p style="font-size:16px;line-height:1.6">Your organizer account is ready. Create a collection and make group payments simpler.</p>
          <a href="${safeDashboardUrl}" style="display:inline-block;margin-top:12px;padding:14px 22px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Open your dashboard</a>
        </main>
      </body></html>`,
  });
};

exports.sendPaymentReceiptEmail = ({
  payerName,
  payerEmail,
  collectionTitle,
  amountPaid,
  receiptCode,
  txnRef,
  quantity,
  paidAt,
}) => {
  const receiptUrl = `${getAppBaseUrl()}/receipt/${encodeURIComponent(String(receiptCode || ''))}`;
  const safeReceiptUrl = escapeHtml(receiptUrl);
  const safePayerName = escapeHtml(payerName || 'there');
  const safeCollectionTitle = escapeHtml(collectionTitle || 'WePay collection');
  const safeTxnRef = escapeHtml(txnRef || '');
  const safeReceiptCode = escapeHtml(receiptCode || '');
  const safeQuantity = escapeHtml(quantity ?? 1);
  const paidAtDate = paidAt ? new Date(paidAt) : null;
  const paidDate =
    paidAtDate && !Number.isNaN(paidAtDate.getTime())
      ? new Intl.DateTimeFormat('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(paidAtDate)
      : 'Just now';
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amountPaid) || 0);

  return sendEmail({
    email: payerEmail,
    subject: `Your WePay receipt ${receiptCode || ''}`.trim(),
    htmlContent: `
      <!doctype html>
      <html><body style="margin:0;background:#0f172a;font-family:Arial,sans-serif;color:#0f172a">
        <main style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden">
          <header style="padding:28px 32px;background:#312e81;color:#fff">
            <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px">Payment confirmed</p>
            <h1 style="margin:0;font-size:26px">Digital payment receipt</h1>
          </header>
          <section style="padding:28px 32px">
            <p style="font-size:16px">Hello ${safePayerName}, thank you for your payment.</p>
            <p style="margin:22px 0 6px;color:#475569;font-size:13px">AMOUNT PAID</p>
            <p style="margin:0 0 24px;color:#111827;font-size:32px;font-weight:bold">${escapeHtml(formattedAmount)}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:10px 0;color:#64748b">Collection</td><td style="padding:10px 0;text-align:right;font-weight:bold">${safeCollectionTitle}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b">Quantity</td><td style="padding:10px 0;text-align:right">${safeQuantity}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b">Transaction reference</td><td style="padding:10px 0;text-align:right;font-family:monospace">${safeTxnRef}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b">Receipt code</td><td style="padding:10px 0;text-align:right;font-family:monospace">${safeReceiptCode}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b">Paid at</td><td style="padding:10px 0;text-align:right">${escapeHtml(paidDate)}</td></tr>
            </table>
            <a href="${safeReceiptUrl}" style="display:block;margin-top:24px;padding:15px 20px;background:#4f46e5;color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-weight:bold">View digital receipt</a>
          </section>
        </main>
      </body></html>`,
  });
};

exports.sendPasswordResetEmail = ({ name, email, resetUrl }) => {
  const safeName = escapeHtml(name || 'there');
  const safeResetUrl = escapeHtml(resetUrl);

  return sendEmail({
    email,
    subject: 'Reset your WePay password',
    htmlContent: `
      <!doctype html>
      <html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
        <main style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;padding:36px">
          <h1 style="margin:0 0 16px;color:#312e81">Password reset request</h1>
          <p style="font-size:16px;line-height:1.6">Hello ${safeName}, use the button below to choose a new password. This link expires in 30 minutes.</p>
          <a href="${safeResetUrl}" style="display:inline-block;margin-top:12px;padding:14px 22px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Reset password</a>
          <p style="margin-top:24px;color:#64748b;font-size:13px">If you did not request this change, you can ignore this email.</p>
        </main>
      </body></html>`,
  });
};

const formatNaira = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

exports.sendTargetReachedEmail = ({
  organizerName,
  organizerEmail,
  collectionTitle,
  collectionSlug,
  totalCollected,
  targetAmount,
}) => {
  const dashboardUrl = `${getAppBaseUrl()}/dashboard`;
  const collectionUrl = `${getAppBaseUrl()}/c/${encodeURIComponent(String(collectionSlug || ''))}`;
  const safeName = escapeHtml(organizerName || 'Organizer');
  const safeTitle = escapeHtml(collectionTitle || 'your collection');
  const safeDashboardUrl = escapeHtml(dashboardUrl);
  const safeCollectionUrl = escapeHtml(collectionUrl);
  const safeCollected = escapeHtml(formatNaira(totalCollected));
  const safeTarget = escapeHtml(formatNaira(targetAmount));

  return sendEmail({
    email: organizerEmail,
    subject: `Goal reached: ${collectionTitle || 'your WePay collection'}`,
    htmlContent: `
      <!doctype html>
      <html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
        <main style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;padding:36px">
          <p style="margin:0 0 8px;color:#047857;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">Collection goal reached</p>
          <h1 style="margin:0 0 16px;color:#312e81">Congratulations, ${safeName}!</h1>
          <p style="font-size:16px;line-height:1.6"><strong>${safeTitle}</strong> has reached 100% of its target.</p>
          <p style="font-size:16px;line-height:1.6">Collected: <strong>${safeCollected}</strong> of <strong>${safeTarget}</strong>.</p>
          <a href="${safeDashboardUrl}" style="display:inline-block;margin-top:12px;padding:14px 22px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Open your dashboard</a>
          <a href="${safeCollectionUrl}" style="display:inline-block;margin:12px 0 0 8px;padding:14px 22px;background:#e2e8f0;color:#0f172a;text-decoration:none;border-radius:8px;font-weight:bold">View collection</a>
        </main>
      </body></html>`,
  });
};

exports.sendSoldOutEmail = ({
  organizerName,
  organizerEmail,
  collectionTitle,
  collectionSlug,
  totalCollected,
  stockLimit,
}) => {
  const dashboardUrl = `${getAppBaseUrl()}/dashboard`;
  const collectionUrl = `${getAppBaseUrl()}/c/${encodeURIComponent(String(collectionSlug || ''))}`;
  const safeName = escapeHtml(organizerName || 'Organizer');
  const safeTitle = escapeHtml(collectionTitle || 'your collection');
  const safeDashboardUrl = escapeHtml(dashboardUrl);
  const safeCollectionUrl = escapeHtml(collectionUrl);
  const safeCollected = escapeHtml(formatNaira(totalCollected));
  const safeStockLimit = escapeHtml(stockLimit ?? 0);

  return sendEmail({
    email: organizerEmail,
    subject: `Sold out: ${collectionTitle || 'your WePay collection'}`,
    htmlContent: `
      <!doctype html>
      <html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
        <main style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;padding:36px">
          <p style="margin:0 0 8px;color:#b45309;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">Inventory sold out</p>
          <h1 style="margin:0 0 16px;color:#312e81">All slots are claimed, ${safeName}.</h1>
          <p style="font-size:16px;line-height:1.6"><strong>${safeTitle}</strong> has sold all ${safeStockLimit} available units. Its public link is now closed to new payments.</p>
          <p style="font-size:16px;line-height:1.6">Total collected: <strong>${safeCollected}</strong>.</p>
          <a href="${safeCollectionUrl}" style="display:inline-block;margin-top:12px;padding:14px 22px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">View public collection</a>
          <a href="${safeDashboardUrl}" style="display:inline-block;margin:12px 0 0 8px;padding:14px 22px;background:#e2e8f0;color:#0f172a;text-decoration:none;border-radius:8px;font-weight:bold">Open dashboard</a>
        </main>
      </body></html>`,
  });
};
