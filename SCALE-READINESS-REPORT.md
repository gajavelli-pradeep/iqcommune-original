# Will the site cope with the marketing campaign?

**A plain-English review of what breaks when a lot of people arrive at once.**

Date: 15 August 2026
Scope: the public forms (apply to be a practitioner, request a session) and the admin console.
Context: digital marketing across 25 Indian tier-1 and tier-2 cities, expected to arrive in bursts.

---

## The short version

The good news first: **the main marketing page itself will not break.** The home page is pre-built and served from a global content network, so it never touches the database. You could send a hundred thousand people to it and it would not slow down. That is the single most important thing to get right, and it is right.

The problems are all *behind* that page — in the forms people fill in, and in the console your team uses to work through what arrives.

There are **three problems that will bite first**, and they will bite in this order:

| # | Problem | When it starts | Who notices | How bad |
|---|---|---|---|---|
| 1 | Most console sections only ever *show* the newest 500 records. Nothing is lost — every record stays stored — but older ones become invisible. | The 501st application | Your team | **Severe** — real applications get silently lost from view |
| 2 | Genuine applicants get blocked by the anti-spam limit because Indian mobile networks share IP addresses | Almost immediately, in bursts | Your applicants and clients | **Severe** — you pay for the click and then block the person |
| 3 | Every console page load makes about 24 separate trips to the database | As soon as 2-3 admins work at the same time | Your team | **Moderate now, severe later** — console gets slow, then times out |

Everything else in this report is real but less urgent.

---

# Problem 1 — The console hides your oldest applications

## What actually happens

**First, the thing to be clear about: nothing is ever lost.** No record is refused, overwritten or deleted because of any limit. Every application, practitioner, session and request you have ever received is stored, permanently and in full. This is entirely a problem with what the console *shows you*, not with what the system *keeps*.

With that said: most sections of the console (Practitioners, Requests, Sessions, Payouts, Confirmations, Photos, Agreements) ask the database for **the 500 most recent records and nothing else**. It then does all the filtering and searching *inside the browser*, on those 500 records only.

The 500 is **per section, not shared** — 500 practitioners and 500 sessions are both fetched in full; they do not compete for one budget. A few sections differ: the Gallery and the Team list stop at 200, and the Activity tab has no limit at all because it pages properly.

That sounds fine until you cross 500. Then:

- Application number 501 does not appear anywhere.
- Clicking the "Applied" filter does not go and look for older applications — it only filters the 500 already on screen.
- Typing a name into the search box only searches those 500.
- The little count badge in the sidebar says **500**, which your team will read as "there are 500 of these".
- Older practitioners lose *fields*, not just rows. Phone, state, address, T-shirt size and experience all come from the application record. Once a practitioner's application falls outside the newest 500 applications, those columns render as "—" — so the Master Data tab, whose whole purpose is offline contact details, shows practitioners with no phone number.

**The Practitioners tab lies worse than the others.** It merges two separate 500-limits — the newest 500 applications and the newest 500 practitioners — so its badge can read anything up to **1,000**. A round "500" at least looks like a limit; a number like 947 reads as a genuine total, and nobody thinks to question it. With 3,000 applications and 800 practitioners you would see roughly 1,000 rows and around 2,800 people would be invisible.

There is no "Page 2". There is no warning message. The records are all in the database, safe and complete — the console simply never asks for them.

## Why this is the number one risk

A 25-city campaign will produce more than 500 applications. That is the entire point of running it. So this is not a "someday" problem — it is the first thing that will happen, and it will happen quietly.

The realistic failure looks like this: a month into the campaign you have 3,000 applications. Your team works through the list, clears the ones they can see, and reports that the pipeline is empty. Meanwhile 2,500 people who applied are sitting there, never contacted, and nobody knows.

## Who is affected

Your admin team, and — indirectly — every applicant they never see. It is not a crash and it is not slow. It gives a **confident wrong answer**, which is worse, because nobody thinks to check.

## The fix

Move the filtering, searching and paging out of the browser and into the database, and add proper page navigation. The console already has a working page-navigation control — the Activity tab uses it correctly today — so the pattern exists and just needs applying to the other tabs.

- **Effort:** medium. A few days of development.
- **Needs:** code changes, plus a small database change (see Problem 5).
- **Cheap stopgap if you need one today:** make the badge say "showing newest 500 of 3,000". That does not fix it, but it stops the console lying to your team. Half a day.

---

# Problem 2 — Real applicants are being blocked as spammers

## What actually happens

To stop bots, each form allows **5 submissions per 10 minutes from one internet address**. That is a sensible rule on a quiet site. It is the wrong rule for Indian mobile traffic.

Here is why. Jio, Airtel and the other Indian mobile networks do not give each phone its own public internet address — there are not enough addresses in the world. Instead, thousands of phones in a city share a small pool of addresses. This is called Carrier-Grade NAT, and it is completely normal here.

The result: to your website, **1,000 different people on Jio in Mumbai can look like one single visitor.** The 6th genuine person to submit a form in a 10-minute window gets told:

> "Too many requests. Please try again shortly."

They have done nothing wrong. They will not come back.

## Why this is expensive

This sits directly on the path you are paying for. You buy an ad, someone clicks it, reads the page, fills in the form — and then gets refused at the last step. You have paid for the whole journey and thrown away the result. During a burst (an ad slot going live, a WhatsApp forward doing the rounds) this will happen constantly.

## There is a second, separate issue in the same place

The anti-spam system depends on an outside service (Upstash). What happens if that service has a bad day is **inconsistent**, and both outcomes are bad:

- **If it responds slowly** — the system gives up waiting after 5 seconds and lets everything through. Your forms are unprotected, every submission is 5 seconds slower, and *nothing in your logs says so.* The code has a warning line for exactly this situation, but it does not fire.
- **If it fails fast** (wrong password, service unreachable) — the error escapes and **every single form submission returns an error** saying something went wrong on our side.

So the same outage either silently removes your spam protection, or silently takes down both your forms. Which one you get depends on how the outage happens.

## What is *not* a problem here

Worth saying, because it is a common weakness and this code got it right:

- The address the system reads **cannot be faked** by an attacker.
- Each form has its **own separate budget** — someone hammering the session-request form cannot exhaust the practitioner-application form's allowance.

## The fix

Three small changes, none of them large:

1. **Stop keying purely on the internet address.** Combine it with the email address on the form. Someone submitting the same form 5 times with the same email is still blocked; 500 different people on the same Jio connection are not. This is the change that recovers your conversions.
2. **Raise the limit on the two campaign forms.** 5-per-10-minutes was tuned for a form nobody was advertising.
3. **Make the outage behaviour consistent** — catch the error, let submissions through, and record clearly that protection is currently off. Also shorten the 5-second wait to 1 second so a struggling service does not make every visitor wait.

- **Effort:** small. Under a day.
- **Needs:** code changes only. No database change.
- **Priority:** do this before the campaign starts, not after.

---

# Problem 3 — The console does far more work than it needs to

## What actually happens

Every time anyone opens the console, the system makes **about 24 separate trips to the database** — before your admin has clicked on anything.

It does this regardless of which tab is open. Open the Practitioners tab and it still loads Payouts, Sessions, Photos, the Gallery, the team list and the activity log. It also loads the entire practitioner list **twice**, because two different parts of the page ask for it independently and nothing notices they are the same request.

Worst of all, one particular query — the one that works out each practitioner's average rating — asks for **every rating ever recorded, with no limit at all**, and adds them up afterwards. That query runs **three times per page load.**

## Why it gets worse, not just stays bad

Two of these grow forever:

- The ratings query grows with every session you deliver. Today it is fast. At 2,000 delivered sessions it is downloading 2,000 records three times over, on every single page view, and throwing away almost all of them.
- There is a hidden ceiling. Databases of this type refuse to send more than a set number of records in one go (1,000 by default). Once your ratings pass that number, the query quietly returns *part* of the data — and **the average ratings shown in your console become wrong**, with no error message. That is a data-accuracy problem, not just a speed problem.

## What happens under load

Databases handle a fixed number of simultaneous requests. If ten admins have the console open and are refreshing, that is roughly 240 requests fighting for a queue built for far fewer. They start queuing, then timing out. And because the public forms use the same database, **a busy console can slow down or break the public forms too.**

## The fix

Three changes, in order of value:

1. **Stop loading the practitioner list twice.** One part of the page should reuse what the other already fetched. This alone removes 3 of the 24 trips and one of the three ratings scans.
2. **Let the database calculate the averages** instead of downloading every rating and adding them up in code. Databases are extremely good at this; it turns a growing download into a tiny fixed-size answer. This also removes the wrong-averages risk described above.
3. **Only load the tabs the person can actually open.** The code already works out which tabs each role is allowed to see — it just does not use that information to skip the loading.

- **Effort:** small to medium. One to two days.
- **Needs:** code changes, plus one small database addition for the averages.

---

# Problem 4 — Duplicate consent emails to practitioners

## What actually happens

The Confirmations tab shows, for each session, when the consent request was last emailed to the practitioner. To work that out, it takes the identifiers of every row on screen (up to 500 of them) and sends them to the database **inside the web address of the request**.

Web addresses have a length limit. 500 identifiers is roughly 22,000 characters — well over every common limit. The request gets rejected.

And the code **does not check whether the request succeeded.** So it treats "rejected" as "no emails have ever been sent", and every row on that tab shows a blank where the sent date should be.

## Why this one costs you goodwill

Your admin sees a blank, concludes the consent request was never sent, and sends it. The practitioner gets a second identical email. There is a safety net against duplicate emails, but it only covers a 5-minute window — a resend an hour or a day later goes straight through.

So this does not just show wrong information. It causes **real emails to go to real practitioners**, repeatedly, making the platform look disorganised to exactly the people you are trying to recruit.

## When it starts

Estimated at around **180 to 360 generated confirmations**, depending on the exact server configuration. Well within reach of a 25-city campaign.

## The fix

Ask the database for recent sends by *date range* instead of by a list of 500 identifiers — a much shorter request that cannot outgrow its limit. And check for errors instead of silently treating a failure as "nothing found".

- **Effort:** small. Half a day.
- **Needs:** code changes only.

---

# Problem 5 — The database is missing five signposts

## What actually happens

A database index is like the index at the back of a book. Without it, finding something means reading every page. With it, you jump straight there.

Five of the busiest queries in the console have **no usable index**. There *are* indexes on those tables, but they are built for a different question than the one being asked, so the database ignores them and reads the whole table every time.

The affected lists are:

- Practitioner applications
- Practitioners
- Session requests
- Agreements
- Payouts

That is five of the biggest and busiest tables, read on every console page load.

## Why it matters more than it sounds

Right now, with hundreds of records, "read the whole table" takes a few milliseconds. Nobody notices. At 10,000 applications it becomes a real cost — and remember from Problem 3 that some of these run twice per page load, and every admin refreshing triggers the whole set again.

This is the classic scaling trap: it is invisible until it is suddenly not, and by then you are in the middle of the campaign.

## The fix

Add five indexes. This is a routine, low-risk database change — five lines. It can be applied to a live system without downtime.

To be clear about what *is* fine: several other queries in the system **do** have correct indexes and need no attention — sessions, photos, confirmations, the activity log, and the email duplicate check are all properly served.

- **Effort:** very small. An hour, including testing.
- **Needs:** one database migration.
- **Priority:** do this at the same time as Problem 1, since paging depends on it.

---

# Problem 6 — Emails can be cut off halfway, with no record

## What actually happens

When someone submits a form, the reply email is sent **after** the visitor already has their confirmation. That is the right design — a slow email provider must never make a successful submission look like a failure. This part is well built.

The issue is what happens when the email provider is struggling.

Each email is allowed up to three attempts, and each attempt waits up to 8 seconds. With the pauses between attempts, one email can take up to **26 seconds**. Two emails are sent per submission (one to the person, one to your team), so a single submission can generate almost a minute of background work.

The server has a maximum time it will keep that background work alive, and **no such limit has been set anywhere in this project** — so it falls back to the platform default, which may well be shorter than 26 seconds.

If the work gets cut off, two things happen:
1. The email is never sent.
2. **The record of the attempt is never written either** — because that record is only written at the very end, after all the retries.

So the one system designed to answer "did that email actually go out?" has a blind spot exactly where you most need it: when things are going wrong.

## The second issue — retries make a burst worse

Email providers have their own limits. Send 400 emails in a minute and Brevo will start refusing them. When that happens, this system correctly recognises it as temporary and retries — but **every single message retries after exactly the same 400 milliseconds**, then exactly 1,200 milliseconds.

That means all 400 rejected emails come back at the identical moment, get rejected again, and come back together a second time. It turns one traffic spike into three. The standard fix is to add a small random delay so retries spread out instead of arriving in a wave.

## The fix

1. **Set an explicit time limit** on the affected pages — literally one line per file, and the single highest-value item in this section.
2. **Write the log entry before attempting the send**, then update it, so a cut-off attempt still leaves a trace.
3. **Add a random spread to the retry delays** so bursts smooth out instead of piling up.

- **Effort:** small. Under a day.
- **Needs:** code and configuration. No database change.

---

# Problem 7 — Smaller items, worth knowing about

None of these will hurt you during the campaign. They are listed so nothing is hidden and so they can be picked up during ordinary maintenance.

| Item | What it means | How bad |
|---|---|---|
| **Every console page sends all data for all 8 tabs to the browser** — including sections the admin never opens, and a search index that duplicates much of it. | The console is slower to load than it needs to be, especially on mobile data. Largely fixed automatically once Problem 1 is done. | Low |
| **The audit log runs a clean-up delete after every single admin action.** | One extra database operation per action. Almost always deletes nothing. Should run on a schedule instead — the project already has a scheduled task set up that it could join. | Low |
| **The team list and audit log each cap user accounts at 200.** | Fine for an admin console. The 201st account would silently disappear from the team table. | Low |
| **The Confirmations picker fetches 500 rows in no particular order.** | Once there are more than 500 unconfirmed sessions, which 500 you see could change between refreshes. One-line fix. | Low |
| **The email log has no clean-up policy.** | It grows forever — about 2 entries per form submission. The audit log is cleaned up after 90 days; this one is not. Storage cost only. | Low |
| **Photo/gallery reordering saves each photo one at a time.** | Capped at 20 photos, so it will never be a problem. Noted only for completeness. | None |

---

# What is already right

It is worth being explicit about this, because it is where most of the risk *would* normally sit, and it has been handled:

- **The public marketing pages do not touch the database at all.** They are pre-built and served from a global network. This is the difference between a campaign that works and a campaign that takes the site down, and it is correct.
- **The forms cannot be attacked by faking your internet address.** A common and easily-missed weakness; this code avoids it deliberately.
- **Each form has its own separate spam budget** — one form cannot exhaust another's.
- **Database connections are handled correctly.** The system reuses connections properly and cannot exhaust the database's connection limit directly.
- **Emails never block the visitor.** A slow email provider cannot turn a successful submission into an error message.
- **Several of the busiest queries already have exactly the right indexes** — sessions, photos, confirmations and the email duplicate check need no work.
- **The public pages that people reach through emailed links** (rating, consent, photo upload, onboarding) all use direct single-record lookups. These are as fast as a database gets and will not degrade at any volume.

---

# Recommended order of work

| Priority | Item | Effort | Do it |
|---|---|---|---|
| 1 | **Fix the spam limit for Indian mobile networks** (Problem 2) | Under a day | **Before the campaign launches** |
| 2 | **Set the email time limit** (Problem 6, item 1) | One hour | **Before the campaign launches** |
| 3 | **Add the five database indexes** (Problem 5) | One hour | Before the campaign launches |
| 4 | **Reduce the console's 24 database trips** (Problem 3) | 1-2 days | First two weeks |
| 5 | **Fix the duplicate consent emails** (Problem 4) | Half a day | First two weeks |
| 6 | **Proper paging and searching in the console** (Problem 1) | A few days | Before you cross 500 applications |
| 7 | Remaining email hardening (Problem 6, items 2-3) | Half a day | First month |
| 8 | The smaller items (Problem 7) | As convenient | Ongoing maintenance |

Items 1-3 together are **roughly one day of work** and remove the two risks that directly cost you money during the campaign. Item 6 is the largest piece and is the one with a hard deadline attached to a number you can watch: your application count.

---

# A note on how confident we are

Everything in this report was found by reading the actual code, not by guessing at what it probably does. Where a number depends on a setting we cannot see from the code — such as the exact server time limit in Problem 6, or the precise point at which Problem 4 starts failing — it is described as an estimate and the reason is given. Nothing here is speculation about code that was not read.
