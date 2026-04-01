cat > ~/projects/followup-reminder-bot/BUILD_SPEC.md << 'EOF'
# Follow-up Reminder Bot — Build Spec

## What This Does
A Google Apps Script bot that runs every morning at 8am, scans Gmail for sent 
threads with no reply from external contacts in the last 14 days, and sends 
André a digest email listing threads that need following up.

## Files To Create

### Code.gs — main logic
- Function checkUnrepliedThreads() — main entry point
- Search Gmail sent items using GmailApp.search() with query:
  "in:sent newer_than:14d"
- For each thread found:
  - Get the last message in the thread
  - Check if the last message was sent BY André (from: andre.santos@duettoresearch.com)
  - If yes, it means no reply has come in since his last message
  - Skip threads where all participants are @duettoresearch.com (internal threads)
  - Skip threads where the last message is older than 14 days
  - Collect: subject, last recipient name and email, number of days since sent
- Sort results by days since sent (oldest first)
- If no threads found, do nothing (no email sent)
- If threads found, call sendDigestEmail(threads)

### sendDigestEmail(threads)
- Send an HTML email to andre.santos@duettoresearch.com
- Subject: "☎️ Follow-up Reminder — X threads need a reply"
- Body: clean HTML table with columns:
  - Contact name and email
  - Subject line (linked to the Gmail thread using thread.getPermalink())
  - Days since last sent
- Sort by days since sent, oldest first
- Use MailApp.sendEmail() with htmlBody parameter

### appsscript.json — manifest
- timeZone: Europe/London
- oauthScopes:
  - https://www.googleapis.com/auth/gmail.readonly
  - https://www.googleapis.com/auth/gmail.send

### README.md
- How to set up the daily trigger (8am time-driven)
- How to deploy with clasp

## Important Rules
- ES5 JavaScript only — no arrow functions, no const/let
- No external APIs, no API keys needed
- All functions top-level
- Skip threads with only @duettoresearch.com recipients
- Skip threads where André was NOT the last sender
EOF