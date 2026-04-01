# Follow-up Reminder Bot

This bot scans your Gmail sent items each morning and emails you a digest of any threads where your message was the last one sent and at least one recipient is external (outside `@duettoresearch.com`). It focuses on conversations from the last 14 days, sorts them oldest-first so the most overdue items are at the top, and links each subject line directly to the Gmail thread so you can act immediately. Internal-only threads (all recipients within `@duettoresearch.com`) are ignored.

---

## Setup with clasp

### 1. Install clasp

```bash
npm install -g @google/clasp
```

### 2. Log in to your Google account

```bash
clasp login
```

This opens a browser window to authorise clasp. Complete the OAuth flow and return to the terminal.

### 3. Create a new standalone Apps Script project

```bash
clasp create --type standalone --title "Follow-up Reminder Bot"
```

This creates a `.clasp.json` file in the current directory containing the new script ID.

### 4. Push the code to Apps Script

```bash
clasp push
```

Clasp uploads `Code.gs` and `appsscript.json`. If prompted about `appsscript.json` being a manifest file, type `y` to allow it.

---

## Set up a daily 8 am trigger (Apps Script UI)

Triggers must be created from the Apps Script editor — the free tier does not support creating them via the API.

1. Open the script in the browser:
   ```bash
   clasp open
   ```
2. In the Apps Script editor, click **Triggers** (the alarm-clock icon in the left sidebar).
3. Click **+ Add Trigger** (bottom right).
4. Configure the trigger:
   - **Function to run**: `checkUnrepliedThreads`
   - **Deployment**: `Head`
   - **Event source**: `Time-driven`
   - **Type of time-based trigger**: `Day timer`
   - **Time of day**: `8am to 9am`
5. Click **Save**. Google will ask you to authorise the Gmail scopes — follow the prompts.

The bot will now run automatically every morning between 8 and 9 am London time.

---

## Test manually

1. Open the script in the editor (`clasp open`).
2. In the function selector dropdown at the top of the editor, choose `checkUnrepliedThreads`.
3. Click **Run**.
4. Check the **Execution log** panel at the bottom for output.
5. If unreplied threads exist, a digest email will arrive in your inbox within a few seconds.

If you see a permissions error on first run, click **Review Permissions** in the prompt and grant access to Gmail.
