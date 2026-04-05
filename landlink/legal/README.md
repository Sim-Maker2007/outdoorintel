# LandLink — Legal Framework

This folder contains the draft legal and compliance documents for the LandLink marketplace.

---

## ⚠️ MANDATORY DISCLAIMER — READ FIRST

**These documents are DRAFTS produced by an AI assistant, not by a licensed attorney.** They are written in the style of Canadian marketplace counsel and reflect general knowledge of relevant federal and provincial law as of the date of drafting, but:

1. **Nothing in this folder constitutes legal advice.**
2. **Every document must be reviewed and signed off by qualified Canadian counsel before LandLink relies on it or publishes it.** Specifically:
   - A Canadian marketplace / technology lawyer (platform liability, consumer-contract enforcement, choice-of-law).
   - A firearms-law specialist (Firearms Act, PAL verification, zone-specific trespass and hunting-regulation risk).
   - Quebec counsel (Me Maxime Robert was mentioned): Civil Code of Québec applies independently, Bill 64 / Law 25 privacy compliance, mandatory French translation, Quebec Consumer Protection Act overrides.
3. **Laws and regulations change.** Provincial wildlife acts, hunting regulations, privacy statutes, and firearms rules are amended regularly. These documents must be reviewed at least annually and before every material product change.
4. **Province-specific localization is required.** Canada is 13 separate jurisdictions for most of what LandLink does. A single Canada-wide agreement cannot be truly iron-clad; province riders and French-language versions are required.
5. **Insurance cannot be replaced by paperwork.** No contract language makes the platform or its users whole after a serious incident without active, in-force liability insurance. See `07-INSURANCE-REQUIREMENTS.md`.

Do not publish any of these documents to a production site, attach them to emails, or send them to users before counsel has reviewed them end-to-end.

---

## Document Index

| # | File | Audience | Status |
|---|---|---|---|
| 00 | [`00-REGULATORY-MEMO.md`](./00-REGULATORY-MEMO.md) | Internal (founders + counsel) | Draft |
| 01 | [`01-TERMS-OF-SERVICE.md`](./01-TERMS-OF-SERVICE.md) | All users (public) | Draft |
| 02 | [`02-PRIVACY-POLICY.md`](./02-PRIVACY-POLICY.md) | All users (public) | Draft |
| 03 | [`03-ACCEPTABLE-USE-POLICY.md`](./03-ACCEPTABLE-USE-POLICY.md) | All users (public) | Draft |
| 04 | [`04-LANDOWNER-TERMS.md`](./04-LANDOWNER-TERMS.md) | Landowners (gate to listing) | Draft |
| 05 | [`05-HUNTER-TERMS-AND-CONDUCT.md`](./05-HUNTER-TERMS-AND-CONDUCT.md) | Hunters (gate to applying) | Draft |
| 06 | [`06-ACCESS-AGREEMENT-TEMPLATE.md`](./06-ACCESS-AGREEMENT-TEMPLATE.md) | Bilateral (landowner↔hunter) | Draft |
| 07 | [`07-INSURANCE-REQUIREMENTS.md`](./07-INSURANCE-REQUIREMENTS.md) | Hunters (gate) + landowners | Draft |
| 08 | [`08-CANCELLATION-AND-REFUND-POLICY.md`](./08-CANCELLATION-AND-REFUND-POLICY.md) | All users (public) | Draft |
| 09 | [`09-DISPUTE-RESOLUTION-POLICY.md`](./09-DISPUTE-RESOLUTION-POLICY.md) | All users (public) | Draft |

---

## Counsel Review Checklist

Provide this checklist and these drafts to reviewing counsel.

### High-priority review items
- [ ] **Platform-intermediary positioning.** LandLink is structured as a neutral facilitator, not a principal in the access agreement. Verify this characterization holds under Quebec law (CCQ arts. 2132 on intermediaries) and common-law precedent (Airbnb Ireland v. various Canadian regulators).
- [ ] **Class-action waiver enforceability.** Waiver is included but flagged as unenforceable in Quebec (CPA art. 11.1) and questionable in Ontario (see *TELUS v. Wellman*, 2019 SCC 19). Confirm severability drafting is adequate.
- [ ] **Arbitration clause.** Mandatory-arbitration carve-outs for provincial consumer-protection statutes and small-claims jurisdiction are drafted. Verify for BC *Business Practices and Consumer Protection Act* and Quebec CPA.
- [ ] **Recreational-user occupiers' liability.** Free-access parcels are drafted to engage provincial recreational-user statutes that reduce the landowner's duty of care. Confirm statutory language for each target province (ON *Occupiers' Liability Act* s. 4; AB *Occupiers' Liability Act* s. 12; BC *Occupiers Liability Act* s. 3.3; QC — no statutory equivalent, CCQ art. 1457 default applies).
- [ ] **Paid-access liability.** Paid bookings do NOT engage recreational-user reductions. Verify drafted waiver/indemnity + insurance requirements are sufficient for paid access.
- [ ] **Firearms Act compliance.** The platform does not transfer, store, or handle firearms. Confirm PAL verification language does not create regulated activity under ss. 22–35 *Firearms Act*.
- [ ] **Trespass and MFFP/MNRF compliance.** Provincial trespass statutes (e.g., ON *Trespass to Property Act*) and wildlife acts create criminal liability for unauthorized entry and hunting violations. Access Agreement should shift all such risk to the hunter.
- [ ] **Quebec specifics:**
  - [ ] French-language version of every user-facing document (mandatory under Charter of the French Language art. 55).
  - [ ] Law 25 / Bill 64 privacy compliance: privacy officer designation, DPIA, consent granularity, data-portability rights, breach notification.
  - [ ] Quebec CPA: art. 2 (mandatory application), art. 11.1 (class-action waiver void), art. 11.2 (choice-of-law clause ineffective to reduce Quebec consumer rights).
- [ ] **PIPEDA breach notification** (s. 10.1) — documented process required.
- [ ] **Accessibility.** AODA (Ontario) applies to digital platforms serving Ontario residents with ≥50 employees; drafted for future compliance.
- [ ] **Anti-spam (CASL).** Email/SMS consent flows reviewed.
- [ ] **Reviews / defamation.** Review-moderation policy drafted with notice-and-takedown but should be stress-tested against *Grant v. Torstar* (responsible communication) and provincial defamation statutes.

### Drafting conventions to preserve
- Defined Terms appear in **Title Case** and are listed alphabetically in §1 of each document.
- Cross-references use the form "§[number]" within a document and "[FILE#] §[number]" across documents.
- Each document has a Last Updated date, Version, and effective date placeholder.
- Every user-facing document has a plain-language summary box at the top (Quebec plain-language rule anticipated).
- Severability clauses are included in every document.

---

## Governing Law Strategy

Primary governing law clause: **Province of Quebec, Canada** (reflecting LandLink's operating base and Me Maxime Robert's expertise). Choice-of-law clause is drafted with carve-outs for:
- Mandatory consumer-protection statutes of the user's province of residence.
- Mandatory language requirements (Quebec Charter of French Language).
- Provincial trespass, wildlife, and firearms statutes (which apply at the parcel's location, not the user's residence).

Each parcel's physical location determines the law governing the Access Agreement's property-related terms (lex situs for the real-property elements), while the hunter-landowner contractual relationship is governed by the Access Agreement's chosen law (default: province where the parcel is located).

---

## Maintenance Protocol

1. **Annual review** by outside counsel before each hunting season (August).
2. **Triggered review** on: (a) material product change, (b) new province launched, (c) regulatory amendment in any target province, (d) material incident.
3. **Version control**: every change requires a new semver bump and a CHANGELOG entry.
4. **User notification**: material changes to user-facing policies require 30-day advance notice by email and in-app banner per Quebec CPA standards.

---

## Files That Do NOT Yet Exist But Should

For a production launch, also draft:
- Cookie Policy (required if using analytics/advertising cookies)
- DMCA / Notice-and-Takedown procedure
- Law-Enforcement Request Policy
- Subprocessor List (for Law 25 DPIA)
- Accessibility Statement (AODA)
- Anti-Discrimination Policy (provincial human-rights codes)
- Trust & Safety Enforcement Guidelines (internal)
