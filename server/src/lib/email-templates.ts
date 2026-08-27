interface EmailContent {
  subject: string;
  html: string;
}

// Plain template-literal HTML — no templating engine needed for three short,
// mostly-static emails.
function wrap(clinicName: string, bodyHtml: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #12201c;">
      <p style="font-size: 13px; color: #55645d; margin: 0 0 16px;">${clinicName}</p>
      ${bodyHtml}
    </div>
  `.trim();
}

export function appointmentReminderEmail(params: {
  clinicName: string;
  ownerFirstName: string;
  petName: string;
  startAt: Date;
  hoursAhead: 48 | 2;
}): EmailContent {
  const { clinicName, ownerFirstName, petName, startAt, hoursAhead } = params;
  const when = hoursAhead === 48 ? 'in 2 days' : 'in 2 hours';
  const formatted = startAt.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return {
    subject: `Reminder: ${petName}'s appointment ${when}`,
    html: wrap(clinicName, `
      <p>Hi ${ownerFirstName},</p>
      <p>This is a reminder that <b>${petName}</b> has an appointment ${when}, on <b>${formatted}</b>.</p>
      <p>If you need to reschedule, please contact us as soon as possible.</p>
    `),
  };
}

export function vaccineDueReminderEmail(params: {
  clinicName: string;
  ownerFirstName: string;
  petName: string;
  vaccineName: string;
  dueAt: Date;
  daysAhead: 30 | 7;
}): EmailContent {
  const { clinicName, ownerFirstName, petName, vaccineName, dueAt, daysAhead } = params;
  const formatted = dueAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return {
    subject: `${petName}'s ${vaccineName} vaccination is due soon`,
    html: wrap(clinicName, `
      <p>Hi ${ownerFirstName},</p>
      <p><b>${petName}</b>'s <b>${vaccineName}</b> vaccination is due on <b>${formatted}</b>
      (${daysAhead} days from now).</p>
      <p>Please book a visit to keep ${petName} protected.</p>
    `),
  };
}

export function invoiceOverdueEmail(params: {
  clinicName: string;
  ownerFirstName: string;
  balance: number;
  currency: string;
  daysOverdue: number;
}): EmailContent {
  const { clinicName, ownerFirstName, balance, currency, daysOverdue } = params;
  const amount = `${currency} ${balance.toFixed(2)}`;

  return {
    subject: `Overdue invoice — ${amount}`,
    html: wrap(clinicName, `
      <p>Hi ${ownerFirstName},</p>
      <p>You have an outstanding balance of <b>${amount}</b>, now ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.</p>
      <p>Please contact us to settle this invoice at your earliest convenience.</p>
    `),
  };
}
