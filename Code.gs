// Follow-up Reminder Bot
// Scans Gmail sent items for threads where the last message was sent by André
// and no external recipient has replied, then sends a digest email.

var SENDER_EMAIL = 'andre.santos@duettoresearch.com';
var INTERNAL_DOMAIN = '@duettoresearch.com';

/**
 * Extracts email address from a "Name <email>" or plain "email" string.
 * Returns the email in lowercase.
 */
function extractEmail(str) {
  if (!str) return '';
  var match = str.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase().trim();
  }
  return str.toLowerCase().trim();
}

/**
 * Extracts display name from a "Name <email>" string.
 * Falls back to the email address if no name is present.
 */
function extractName(str) {
  if (!str) return '';
  var match = str.match(/^([^<]+)<[^>]+>/);
  if (match) {
    return match[1].trim();
  }
  // No angle brackets — the whole string is just an email
  return extractEmail(str);
}

/**
 * Parses a comma-separated recipient string into an array of
 * { name, email } objects, filtering out empty entries.
 */
function parseRecipients(recipientStr) {
  if (!recipientStr) return [];
  var results = [];
  var parts = recipientStr.split(',');
  for (var i = 0; i < parts.length; i++) {
    var raw = parts[i].trim();
    if (!raw) continue;
    var email = extractEmail(raw);
    if (!email) continue;
    results.push({
      name: extractName(raw),
      email: email
    });
  }
  return results;
}

/**
 * Returns true if the given email belongs to the internal domain.
 */
function isInternal(email) {
  return email.indexOf(INTERNAL_DOMAIN) !== -1;
}

/**
 * Returns the first external (non-duettoresearch.com) recipient
 * found across all messages in a thread, or null if none found.
 */
function findFirstExternalRecipient(messages) {
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    var toList = parseRecipients(msg.getTo());
    var ccList = parseRecipients(msg.getCc());
    var allRecipients = toList.concat(ccList);
    for (var j = 0; j < allRecipients.length; j++) {
      if (!isInternal(allRecipients[j].email)) {
        return allRecipients[j];
      }
    }
  }
  return null;
}

/**
 * Returns true if ALL recipients across all messages in the thread
 * are internal (@duettoresearch.com).
 */
function isAllInternalThread(messages) {
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    var toList = parseRecipients(msg.getTo());
    var ccList = parseRecipients(msg.getCc());
    var allRecipients = toList.concat(ccList);
    for (var j = 0; j < allRecipients.length; j++) {
      if (!isInternal(allRecipients[j].email)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Main function — checks Gmail sent items for unreplied external threads
 * and triggers a digest email if any are found.
 * Set up a daily time-driven trigger pointing at this function.
 */
function checkUnrepliedThreads() {
  var threads = GmailApp.search('in:sent newer_than:14d');
  var unreplied = [];
  var now = new Date();

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();

    if (!messages || messages.length === 0) continue;

    // The last message in the thread determines whether it awaits a reply.
    var lastMessage = messages[messages.length - 1];
    var lastFromEmail = extractEmail(lastMessage.getFrom());

    // Only care about threads where André sent the last message
    // (meaning no one replied yet).
    if (lastFromEmail !== SENDER_EMAIL) continue;

    // Skip purely internal threads.
    if (isAllInternalThread(messages)) continue;

    // Find the primary external contact for display.
    var contact = findFirstExternalRecipient(messages);
    if (!contact) continue;

    // Calculate days since the last message was sent.
    var lastDate = lastMessage.getDate();
    var diffMs = now - lastDate;
    var daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    unreplied.push({
      subject: thread.getFirstMessageSubject(),
      contact: contact,
      daysSince: daysSince,
      permalink: thread.getPermalink()
    });
  }

  if (unreplied.length === 0) {
    Logger.log('No unreplied external threads found. No email sent.');
    return;
  }

  // Sort oldest first (highest daysSince first).
  unreplied.sort(function(a, b) {
    return b.daysSince - a.daysSince;
  });

  sendDigestEmail(unreplied);
}

/**
 * Sends an HTML digest email listing all threads that need a follow-up.
 * @param {Array} threads - Array of thread info objects (already sorted).
 */
function sendDigestEmail(threads) {
  var subject = '\u260e\ufe0f Follow-up Reminder \u2014 ' + threads.length + ' thread' + (threads.length === 1 ? '' : 's') + ' need' + (threads.length === 1 ? 's' : '') + ' a reply';

  var rows = '';
  for (var i = 0; i < threads.length; i++) {
    var t = threads[i];
    var contactDisplay = t.contact.name && t.contact.name !== t.contact.email
      ? t.contact.name + '<br><span style="color:#666;font-size:12px;">' + t.contact.email + '</span>'
      : t.contact.email;

    var daysLabel = t.daysSince === 1 ? '1 day' : t.daysSince + ' days';

    var rowBg = i % 2 === 0 ? '#ffffff' : '#f9f9f9';

    rows = rows +
      '<tr style="background:' + rowBg + ';">' +
        '<td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;">' + contactDisplay + '</td>' +
        '<td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;">' +
          '<a href="' + t.permalink + '" style="color:#1a73e8;text-decoration:none;">' + escapeHtml(t.subject) + '</a>' +
        '</td>' +
        '<td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;text-align:center;color:' + (t.daysSince >= 7 ? '#c62828' : '#555') + ';font-weight:' + (t.daysSince >= 7 ? 'bold' : 'normal') + ';">' + daysLabel + '</td>' +
      '</tr>';
  }

  var htmlBody =
    '<!DOCTYPE html>' +
    '<html>' +
    '<head><meta charset="UTF-8"></head>' +
    '<body style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:800px;margin:0 auto;padding:20px;">' +
      '<h2 style="color:#1a73e8;margin-bottom:4px;">\u260e\ufe0f Follow-up Reminder</h2>' +
      '<p style="color:#666;margin-top:0;">You have <strong>' + threads.length + '</strong> thread' + (threads.length === 1 ? '' : 's') + ' awaiting a reply (oldest first).</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-top:16px;">' +
        '<thead>' +
          '<tr style="background:#1a73e8;color:#fff;">' +
            '<th style="padding:10px 14px;text-align:left;font-weight:600;">Contact</th>' +
            '<th style="padding:10px 14px;text-align:left;font-weight:600;">Subject</th>' +
            '<th style="padding:10px 14px;text-align:center;font-weight:600;">Days Waiting</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          rows +
        '</tbody>' +
      '</table>' +
      '<p style="color:#999;font-size:12px;margin-top:20px;">Generated by Follow-up Reminder Bot &mdash; threads from the last 14 days where your message was last.</p>' +
    '</body>' +
    '</html>';

  MailApp.sendEmail({
    to: SENDER_EMAIL,
    subject: subject,
    htmlBody: htmlBody
  });

  Logger.log('Digest email sent for ' + threads.length + ' thread(s).');
}

/**
 * Simple HTML escaping for subject lines inserted into HTML.
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
