# FAQ for judges

## Does Solli submit forms to government portals?

No. [CONFIRM AFTER PHASE 14] The prototype is planned to prepare one form for review and a printable PDF; it will not submit anything to a portal.

## Where is data stored?

Nowhere. The planned prototype has no database or persistent personal-data storage and uses fake data for the demo.

## What if speech recognition is wrong?

The planned flow shows the captured field, reads answers back, and allows an applicant or operator to correct a detail before printing. Accuracy will be reported only after testing.

## Which Gnani models are used and why?

Prisma v2.5 is for speech to text, Timbre v3.0 is for text to speech, and Evon v3.3 may help reason about ambiguous field extraction.

## What happens if Evon is unavailable?

The planned core flow will use a rule-based `extractField(field, transcript)` fallback. Evon is not required for the prototype demo.

## Who is the customer and who is the end user?

The intended customer is an organisation such as a CSC or panchayat helpdesk. The end user is an applicant, supported by an operator when needed.

## Why only one form?

One old-age pension form keeps the build, testing, and 60-second demonstration focused. The exact official fields are TBD in Phase 4.

## Is this a government or eligibility system?

No. Solli does not verify Aadhaar, decide eligibility, calculate benefits, or claim a government partnership.
