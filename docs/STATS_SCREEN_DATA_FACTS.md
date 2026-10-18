# Survey statistics facts

Pulled 18 Oct 2026 from production database `surveys_prod`. All 101 surveys.

Lifetime impressions, responses, and dismissals come from `survey_stats`. Calendar days are America/New_York, because 94.4% of answers are in the US. The database stores timestamps in UTC.

A typical survey is one choice question, live for about 5 days, and answered by about 13% of the people who see it.

## Definitions

- **Live:** `surveys.active = true`.
- **Draft:** active flag off, and both impressions and responses are 0.
- **Inactive:** active flag off, and the survey was shown or answered.
- **Days live:** America/New_York date of `survey_stats.first_impression_at` through the date of the last `responses.timestamp`, counting both ends.
- **Response rate:** `survey_stats.total_responses / survey_stats.total_impressions`.
- **Dismissal rate:** `survey_stats.total_dismissals / survey_stats.total_impressions`.
- **No action:** impressions minus responses minus dismissals.
- **One response:** one submit. `survey_stats.total_responses` matches a distinct `(session_id, timestamp)` in `responses`.

The product does not store paused, ended, or draft. Those labels above are derived.

## Per-survey table

Sorted by impressions, highest first. Survey names that contain a pipe are escaped so the table stays intact. Two different surveys share the name "FC LP Italy | Age Bracket Single Choice Question | 08/24/2026". Two share "SHG LP | Competitors Single Choice Question | 25/05/2026".

| Survey | Start | End | Status | Days live | Impressions | Responses | Dismissals | Response rate | Questions | Question types |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| FC LP \| (Re-run) FC HSA/FSA #1 Single Choice Question \| 09/22/2026 | 2026-09-22 | 2026-10-04 | inactive | 13 | 13,214 | 598 | 2,250 | 4.5% | 1 | radio |
| FC YNG LP \| Young Audience - Main Skin Concern Single Choice Question \| 09/01/2026 | 2026-09-01 | 2026-09-19 | inactive | 19 | 9,621 | 109 | 1,038 | 1.1% | 1 | radio |
| FC LP \| #1 Benefit Single-Choice Question \| 07/05/2026 | 2026-05-07 | 2026-05-12 | inactive | 6 | 8,631 | 1,133 | 4,970 | 13.1% | 1 | radio |
| FC LP \| Supplements Category Multiple Choice Question \| 06/18/2026 | 2026-06-18 | 2026-06-22 | inactive | 5 | 6,607 | 878 | 2,887 | 13.3% | 1 | checkbox |
| Pre Purchase- HC- If you've never purchased hand cream before, why? | 2026-03-11 | 2026-04-26 | inactive | 47 | 5,445 | 587 | 2,267 | 10.8% | 1 | radio |
| FC LP \| Cable Entertainment Single Choice Question \| 08/03/2026 | 2026-08-05 | 2026-08-09 | inactive | 5 | 5,318 | 463 | 2,996 | 8.7% | 1 | radio |
| FC LP \| Dream Comment (Single Choice) \| 07/23/2026 | 2026-07-23 | 2026-07-26 | inactive | 4 | 4,379 | 437 | 2,642 | 10.0% | 1 | radio |
| FC LP \| FC HSA/FSA #1 Single Choice Question \| 09/14/2026 | 2026-09-14 | 2026-09-15 | inactive | 2 | 4,336 | 403 | 676 | 9.3% | 1 | radio |
| FC LP \| Supplements Category Multiple Choice Question \| 06/16/2026 | 2026-06-16 | 2026-06-18 | inactive | 3 | 4,267 | 654 | 1,824 | 15.3% | 1 | checkbox |
| Pre Purchase- SHG- What’s your biggest frustration when shaving? | 2026-03-11 | 2026-04-25 | inactive | 46 | 4,224 | 883 | 2,105 | 20.9% | 1 | radio |
| FC LP \| #1 Benefit Single-Choice Question with Dark Circles \| 27/06/2026 | 2026-06-28 | 2026-06-30 | inactive | 3 | 3,881 | 498 | 2,148 | 12.8% | 1 | radio |
| FC LP \| Dark Spots Concern Single Choice Question \| 06/25/2026 | 2026-06-25 | 2026-06-27 | inactive | 3 | 3,651 | 562 | 2,092 | 15.4% | 1 | radio |
| FC LP \| FC HSA/FSA #2 Single Choice Question \| 09/15/2026 | 2026-09-15 | 2026-09-16 | inactive | 2 | 3,458 | 343 | 692 | 9.9% | 1 | radio |
| FC LP \| Multivitamin Competitors Single Choice Question \| 28/06/2026 | 2026-06-30 | 2026-07-01 | inactive | 2 | 3,153 | 311 | 1,871 | 9.9% | 1 | radio |
| FC PDP - Exit Intent - Objections | 2026-08-18 | 2026-08-24 | inactive | 7 | 2,917 | 131 | 718 | 4.5% | 1 | text |
| FC PDP - Time on Page - Objections | 2026-08-18 | 2026-08-19 | inactive | 2 | 2,862 | 234 | 1,083 | 8.2% | 1 | text |
| FC LP \| Never Purchased Reason Single Choice Question \| 06/09/2026 | 2026-06-09 | 2026-06-10 | inactive | 2 | 2,723 | 349 | 1,332 | 12.8% | 1 | radio |
| NeoRoot LP \| Thinning Timeline Single Choice Question \| 04/10/2026 | 2026-10-04 | 2026-10-17 | inactive | 14 | 2,713 | 110 | 296 | 4.0% | 1 | radio |
| DEO LP \| Top Frustration Single Choice Question \| 10/05/2026 | 2026-05-10 | 2026-05-24 | inactive | 15 | 2,695 | 119 | 435 | 4.4% | 1 | radio |
| FC LP \| Sports Networks Single Choice Question \| 08/03/2026 | 2026-08-03 | 2026-08-05 | inactive | 3 | 2,594 | 276 | 1,462 | 10.6% | 1 | radio |
| IEFC LP \| Concerns Single Choice Question \| 13/05/2026 | 2026-05-13 | 2026-05-17 | inactive | 5 | 2,538 | 402 | 1,480 | 15.8% | 1 | radio |
| FC LP \| FC HSA/FSA #3 Single Choice Question \| 09/16/2026 | 2026-09-16 | 2026-09-17 | inactive | 2 | 2,524 | 206 | 486 | 8.2% | 1 | radio |
| FC LP \| Skincare Start Single Choice Question \| 25/05/2026 | 2026-05-25 | 2026-05-26 | inactive | 2 | 2,466 | 407 | 1,357 | 16.5% | 1 | radio |
| FC LP \| News Beyond the Big Three Single Choice Question \| 08/09/2026 | 2026-08-09 | 2026-08-11 | inactive | 3 | 2,379 | 214 | 1,320 | 9.0% | 1 | radio |
| FC LP \| Groin Wash #1 Single-Choice Question \| 09/07/2026 | 2026-07-09 | 2026-07-11 | inactive | 3 | 2,343 | 205 | 1,560 | 8.8% | 1 | radio |
| IEFC LP \| Consideration Set Single Choice Question \| 09/09/2026 | 2026-09-09 | 2026-09-14 | inactive | 6 | 2,287 | 189 | 1,469 | 8.3% | 1 | radio |
| HC LP \| Competitors Single Choice Question \| 21/06/2026 | 2026-06-21 | 2026-07-05 | inactive | 15 | 2,185 | 316 | 1,106 | 14.5% | 1 | radio |
| FC LP \| Groin Wash #3 Multiple-Choice Question \| 09/07/2026 | 2026-07-13 | 2026-07-14 | inactive | 2 | 1,953 | 212 | 1,232 | 10.9% | 1 | checkbox |
| FC LP \| Groin Wash #2 Single-Choice Question \| 09/07/2026 | 2026-07-11 | 2026-07-13 | inactive | 3 | 1,864 | 292 | 1,069 | 15.7% | 1 | radio |
| Shampoo \| Hair Loss Belief Single Choice Question \| 18/05/2026 | 2026-05-18 | 2026-05-29 | inactive | 12 | 1,828 | 270 | 939 | 14.8% | 1 | radio |
| FC LP \| Purchase Decider Single Choice Question \| 08/25/2026 | 2026-08-25 | 2026-08-27 | inactive | 3 | 1,806 | 230 | 1,035 | 12.7% | 1 | radio |
| AGS LP \| Wife Pressure Single Choice Question \| 09/09/2026 | 2026-09-09 | 2026-10-17 | live | 39 | 1,730 | 63 | 528 | 3.6% | 1 | radio |
| IEFC LP \| Missing Information Single Choice Question \| 10/05/2026 | 2026-05-10 | 2026-05-13 | inactive | 4 | 1,626 | 111 | 1,100 | 6.8% | 1 | radio |
| HC LP \| Prior Stop Single Choice Question \| 25/05/2026 | 2026-05-25 | 2026-06-16 | inactive | 23 | 1,599 | 104 | 813 | 6.5% | 1 | radio |
| FC LP \| Regularly Purchase Products Multiple Choice Question \| 06/14/2026 | 2026-06-14 | 2026-06-20 | inactive | 7 | 1,488 | 221 | 921 | 14.8% | 1 | checkbox |
| FC LP \| Brand Familiarity Single Choice Question \| 08/02/2026 (Revised) | 2026-08-02 | 2026-08-03 | inactive | 2 | 1,450 | 280 | 763 | 19.3% | 1 | radio |
| IEFC LP \| Worst Moments Single Choice Question \| 08/06/2026 | 2026-08-06 | 2026-08-09 | inactive | 4 | 1,409 | 323 | 738 | 22.9% | 1 | radio |
| AGS LP \| Dye Avoidance Single Choice Question \| 04/30/2026 | 2026-04-30 | 2026-05-10 | inactive | 11 | 1,404 | 156 | 871 | 11.1% | 1 | radio |
| IEFC LP \| Event-Specific Single Choice Question \| 25/05/2026 | 2026-05-25 | 2026-05-27 | inactive | 3 | 1,392 | 146 | 873 | 10.5% | 1 | radio |
| Shampoo LP \| Wife Pressure Single Choice Question \| 08/27/2026 | 2026-08-27 | 2026-09-02 | inactive | 7 | 1,328 | 128 | 797 | 9.6% | 1 | checkbox |
| FC LP \| Decision Timeline Single Choice Question \| 07/21/2026 | 2026-07-21 | 2026-07-22 | inactive | 2 | 1,304 | 285 | 675 | 21.9% | 1 | radio |
| IEFC LP \| Trigger Event Single Choice Question \| 06/05/2026 | 2026-05-06 | 2026-05-09 | inactive | 4 | 1,304 | 140 | 817 | 10.7% | 1 | radio |
| IEFC LP \| Wife Pressure Single Choice Question \| 09/06/2026 | 2026-09-06 | 2026-09-09 | inactive | 4 | 1,279 | 149 | 698 | 11.7% | 1 | radio |
| FC LP \| Eye Area Fix Single-Choice Question \| 30/06/2026 | 2026-07-01 | 2026-07-02 | inactive | 2 | 1,255 | 247 | 686 | 19.7% | 1 | radio |
| AGS LP \| Prior Plan Single Choice Question \| 08/02/2026 | 2026-08-02 | 2026-08-09 | inactive | 8 | 1,244 | 167 | 695 | 13.4% | 1 | radio |
| Shampoo LP \| Thinning Timeline Single Choice Question \| 07/21/2026 | 2026-07-21 | 2026-07-26 | inactive | 6 | 1,223 | 220 | 597 | 18.0% | 1 | radio |
| AGS LP \| Product Name Single Choice Question \| 07/26/2026 | 2026-07-26 | 2026-08-02 | inactive | 8 | 1,156 | 155 | 583 | 13.4% | 1 | radio |
| FC LP \| Wife Pressure Single Choice Question \| 08/19/2026 | 2026-08-19 | 2026-08-20 | inactive | 2 | 1,148 | 118 | 702 | 10.3% | 1 | radio |
| Eyebag Killer Set LP \| Intent Reason Single-Choice Question \| 05/07/2026 | 2026-07-05 | 2026-07-26 | inactive | 22 | 1,145 | 203 | 533 | 17.7% | 1 | radio |
| AGS LP \| Perception Single Choice Question \| 08/09/2026 | 2026-08-09 | 2026-08-16 | inactive | 8 | 1,084 | 131 | 604 | 12.1% | 1 | radio |
| AGS LP \| Going Gray Frustration Single Choice Question \| 25/05/2026 | 2026-05-25 | 2026-06-01 | inactive | 8 | 1,072 | 103 | 596 | 9.6% | 1 | radio |
| Shampoo \| Current Self-Image Single Choice Question \| 25/05/2026 | 2026-05-25 | 2026-05-31 | inactive | 7 | 1,065 | 108 | 486 | 10.1% | 1 | radio |
| AGS LP \| Worth It Multiple Choice Question \| 08/17/2026 | 2026-08-17 | 2026-08-23 | inactive | 7 | 1,051 | 119 | 511 | 11.3% | 1 | checkbox |
| FC LP \| Purchased Last 12 Months Multiple Choice Question \| 06/15/2026 | 2026-06-15 | 2026-06-16 | inactive | 2 | 1,045 | 160 | 556 | 15.3% | 1 | checkbox |
| Shampoo \| Hair Loss Area Single Choice Question \| 06/04/2026 | 2026-06-04 | 2026-06-10 | inactive | 7 | 1,032 | 253 | 406 | 24.5% | 1 | radio |
| FC LP \| Comparison Point (Single Choice) \| 07/22/2026 | 2026-07-22 | 2026-07-23 | inactive | 2 | 1,023 | 143 | 567 | 14.0% | 1 | radio |
| FC Post-Purchase - Objections | 2026-08-16 | 2026-08-24 | inactive | 9 | 1,015 | 101 | 524 | 9.9% | 2 | text+text |
| Shampoo LP \| Scent Preference Single Choice Question \| 07/29/2026 | 2026-07-29 | 2026-08-02 | inactive | 5 | 993 | 237 | 392 | 23.9% | 1 | radio |
| AFC LP \| Body Context Single Choice Question \| 09/07/2026 | 2026-09-07 | 2026-10-17 | live | 41 | 909 | 54 | 151 | 5.9% | 1 | radio |
| IM LP \| Gap Single Choice Question \| 07/28/2026 | 2026-07-28 | 2026-08-25 | inactive | 29 | 900 | 175 | 244 | 19.4% | 1 | radio |
| Face Shield LP #1 \| Main Reason Particle Face Shield Single Choice Question \| 07/20/2026 | 2026-07-20 | 2026-08-09 | inactive | 21 | 863 | 116 | 424 | 13.4% | 1 | radio |
| IEFC LP \| Current Fix Single Choice Question \| 08/04/2026 | 2026-08-04 | 2026-08-06 | inactive | 3 | 827 | 116 | 474 | 14.0% | 1 | radio |
| Eyebag Killer Set LP \| Last Cost Single Choice Question \| 08/04/2026 | 2026-08-04 | 2026-08-09 | inactive | 6 | 814 | 101 | 473 | 12.4% | 1 | checkbox |
| IEFC LP \| What Bother's You Single Choice Question \| 06/04/2026 | 2026-06-04 | 2026-06-10 | inactive | 7 | 810 | 109 | 488 | 13.5% | 1 | radio |
| IEFC LP \| Prior Use Yes/No Question \| 04/26/2026 | 2026-04-26 | 2026-05-05 | inactive | 10 | 807 | 121 | 455 | 15.0% | 1 | radio |
| Eyebag Killer Set LP \| Prior Spend Multiple Choice Question \| 08/10/2026 | 2026-08-10 | 2026-08-16 | inactive | 7 | 799 | 101 | 447 | 12.6% | 1 | checkbox |
| Shampoo \| Hair Loss Frequency Single Choice Question \| 13/05/2026 | 2026-05-13 | 2026-05-17 | inactive | 5 | 775 | 101 | 407 | 13.0% | 1 | radio |
| FC LP Italy \| Age Bracket Single Choice Question \| 08/24/2026 | 2026-08-23 | 2026-08-24 | inactive | 2 | 757 | 299 | 242 | 39.5% | 1 | radio |
| Shampoo LP \| Effort Ladder Multiple Choice Question \| 08/09/2026 | 2026-08-09 | 2026-08-11 | inactive | 3 | 719 | 143 | 349 | 19.9% | 1 | checkbox |
| IEFC LP \| Use Case - Single Choice Question \| 04/21/2026 | 2026-04-21 | 2026-04-25 | inactive | 5 | 654 | 112 | 424 | 17.1% | 1 | radio |
| Shampoo LP \| Hair Loss Products Previous Use Multiple Choice Question \| 07/07/2026 | 2026-07-07 | 2026-07-11 | inactive | 5 | 645 | 103 | 319 | 16.0% | 1 | checkbox |
| Shampoo LP \| Current Shampoo Single Choice Question \| 07/21/2026 | 2026-07-26 | 2026-07-28 | inactive | 3 | 642 | 104 | 310 | 16.2% | 1 | radio |
| SHG LP \| Competitors Single Choice Question \| 25/05/2026 | 2026-04-26 | 2026-05-24 | inactive | 29 | 631 | 105 | 310 | 16.6% | 1 | radio |
| HC LP \| Prior Use Yes/No Question \| 04/26/2026 | 2026-04-26 | 2026-05-17 | inactive | 22 | 624 | 117 | 214 | 18.8% | 1 | radio |
| AGS LP \| Reverse vs Prevent Single Choice Question \| 09/07/2026 | 2026-09-07 | 2026-09-09 | inactive | 3 | 610 | 133 | 267 | 21.8% | 1 | checkbox |
| FC LP \| Prior Use Yes/No Question \| 05/05/2026 | 2026-05-05 | 2026-05-06 | inactive | 2 | 609 | 102 | 273 | 16.8% | 1 | radio |
| Eyebag Killer Set LP \| Brand Familiarity Single Choice Question \| 07/28/2026 | 2026-07-28 | 2026-08-02 | inactive | 6 | 579 | 112 | 250 | 19.3% | 1 | radio |
| IM LP \| Decline Cause Single Choice Question \| 08/27/2026 | 2026-08-27 | 2026-09-02 | inactive | 7 | 560 | 122 | 170 | 21.8% | 1 | radio |
| FC YNG LP \| Young Audience - Main Benefit Single Choice Question \| 09/20/2026 | 2026-09-20 | 2026-09-20 | inactive | 1 | 555 | 1 | 63 | 0.2% | 1 | radio |
| AGS LP \| Patience Single Choice Question \| 10/05/2026 | 2026-05-10 | 2026-05-14 | inactive | 5 | 553 | 121 | 274 | 21.9% | 1 | radio |
| Shampoo LP \| Scent Importance Single Choice Question \| 07/29/2026 | 2026-08-02 | 2026-08-04 | inactive | 3 | 510 | 107 | 242 | 21.0% | 1 | radio |
| FC LP Italy \| Age Bracket Single Choice Question \| 08/24/2026 | 2026-08-24 | 2026-08-31 | inactive | 8 | 479 | 176 | 159 | 36.7% | 1 | radio |
| Groin Wash Older LP \| Main Problem Single Choice Question \| 08/10/2026 | 2026-10-08 | 2026-10-13 | inactive | 6 | 456 | 20 | 53 | 4.4% | 1 | radio |
| IEFC LP \| Age Bracket Single Choice Question \| 08/19/2026 | 2026-08-19 | 2026-08-20 | inactive | 2 | 415 | 189 | 125 | 45.5% | 1 | radio |
| FC LP \| #1 Benefit Single-Choice Question Arabic \| 05/07/2026 | 2026-07-05 | 2026-07-11 | inactive | 7 | 402 | 41 | 238 | 10.2% | 1 | radio |
| SHG LP \| Competitors Single Choice Question \| 25/05/2026 | 2026-05-25 | 2026-06-10 | inactive | 17 | 399 | 127 | 135 | 31.8% | 1 | radio |
| AGS LP \| Hair Color Single Choice Question \| 04/27/2026 | 2026-04-27 | 2026-04-29 | inactive | 3 | 333 | 118 | 139 | 35.4% | 1 | radio |
| Face Shield LP \| Activity Single Choice Question \| 08/16/2026 | 2026-08-16 | 2026-08-31 | live | 16 | 305 | 48 | 112 | 15.7% | 1 | radio |
| Groin Wash Younger LP \| Main Problem Single Choice Question \| 08/10/2026 | 2026-10-08 | 2026-10-13 | inactive | 6 | 292 | 3 | 13 | 1.0% | 1 | radio |
| FC LP \| Brand Familiarity Single Choice Question \| 08/02/2026 | 2026-08-02 | 2026-08-02 | inactive | 1 | 262 | 66 | 143 | 25.2% | 1 | radio |
| Face Shield LP \| Activity Single Choice Question \| 08/09/2026 | 2026-08-09 | 2026-08-15 | inactive | 7 | 227 | 84 | 97 | 37.0% | 1 | radio |
| What almost stopped you from completing your purchase today? | 2026-02-10 | 2026-02-11 | inactive | 2 | 56 | 9 | 17 | 16.1% | 1 | radio |
| Denis Test | 2026-09-23 | 2026-09-24 | live | 2 | 50 | 8 | 30 | 16.0% | 1 | radio |
| Age | 2026-02-10 | 2026-02-11 | live | 2 | 9 | 4 | 1 | 44.4% | 1 | radio |
| Test QA | 2026-05-05 | 2026-05-07 | inactive | 3 | 6 | 3 | 1 | 50.0% | 1 | radio |
| Denis Test 2 | 2026-09-23 |  | live |  | 1 | 0 | 1 | 0.0% | 1 | radio |
| Denis Test 3 | 2026-09-23 |  | live |  | 1 | 0 | 1 | 0.0% | 1 | radio |
| Face Shield LP #2 \| Activity Single Choice Question \| 07/20/2026 |  |  | draft |  | 0 | 0 | 0 |  | 1 | radio |
| Face Shield LP #3 \| Sunscreen Failure Multiple Choice Question \| 07/20/2026 |  |  | draft |  | 0 | 0 | 0 |  | 1 | checkbox |
| NeoRoot LP \| Hair Loss Area Single Choice Question \| 04/10/2026 |  |  | draft |  | 0 | 0 | 0 |  | 1 | radio |
| Shampoo LP \| Effort Ladder Multiple Choice Question \| 07/21/2026 |  |  | draft |  | 0 | 0 | 0 |  | 1 | checkbox |

## 1. Survey inventory

**101 surveys.**

| Status | Count | Rule |
| --- | ---: | --- |
| Live | 7 | `surveys.active = true` |
| Inactive | 90 | Active flag off, and the survey was shown or answered |
| Draft | 4 | Active flag off, zero impressions and zero responses |

Two of the seven live surveys were still collecting answers through 17 Oct: AGS "Wife Pressure" and AFC "Body Context." Face Shield "Activity" (started 16 Aug) and "Age" (February) are still flagged active and have been quiet for weeks. The other three live rows are Denis test widgets.

Surveys created, from `surveys.created_at`. Nothing exists before February 2026. October is partial, through the 8th.

| Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 2 | 6 | 16 | 12 | 19 | 26 | 14 | 4 |

### Questions

Source: `questions`.

A survey has 1 question. P25, median, and P75 are all 1. Minimum 1, maximum 2. 100 surveys have one question. The only multi-question survey is "FC Post-Purchase - Objections," with two text questions.

| Type | Questions | Share |
| --- | ---: | ---: |
| Radio | 84 | 82.4% |
| Checkbox | 14 | 13.7% |
| Text | 4 | 3.9% |

No rating question has been saved, even though the widget can send one.

### Answer options

Source: `answer_options`, choice questions only.

| Type | Questions | P25 | Median | P75 | Min | Max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Radio | 84 | 5 | 6 | 6 | 2 | 8 |
| Checkbox | 14 | 6 | 6 | 7 | 3 | 7 |

## 2. How long surveys run

95 launched surveys have both a first impression and a last response. Two test widgets were shown and never answered, so they have no end date.

| | P25 | Median | P75 | Min | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Days from first impression to last response | 3 | 5 | 8 | 1 | 47 |

| Under 7 days | 7–14 | 15–30 | 31–90 | Over 90 |
| ---: | ---: | ---: | ---: | ---: |
| 58 (61%) | 22 (23%) | 11 (12%) | 4 (4%) | 0 |

### Stopped versus faded

90 of the 97 surveys that were shown are now inactive, so somebody turned the active flag off.

The daily impression shape comes from `event_dedup` and only exists from 15 May 2026. Of 58 inactive surveys with at least 4 days of impressions:

- 24 faded. The last 3 days averaged under a quarter of the earlier pace, and the last day was under 40% of that survey's typical day.
- 4 stopped while still busy. The last day was still at least half the typical daily impressions.
- 30 sit between those two patterns.

On 49 of 89 inactive surveys that are not named as tests, `surveys.updated_at` is within a day of `survey_stats.last_activity_at`. Any edit updates that timestamp, so it only suggests the campaign was switched off as it ended.

### Gaps

On 76 surveys whose daily impressions cover at least 80% of the lifetime total:

| | P25 | Median | P75 | Max |
| --- | ---: | ---: | ---: | ---: |
| Days with at least 1 impression | 4 | 7 | 9 | 52 |
| Calendar span of those days | | 8 | | |
| Gap days inside the span | | 0 | 2 | 46 |

44 of the 76 have no gap days. On average, 85% of the days in the span have an impression.

## 3. Volume

Launched surveys only: 97 with at least one impression. The minimums are test widgets.

| | P25 | Median | P75 | Min | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Impressions | 631 | 1,145 | 2,343 | 1 | 13,214 |
| Responses | 105 | 140 | 253 | 0 | 1,133 |
| Dismissals | 267 | 533 | 1,035 | 1 | 4,970 |

Responses per calendar day of the run (`responses / days live`, 95 surveys): P25 12.3, median 27.8, P75 80.2, min 0.5, max 218. That average is pulled up by launch days. On days that actually had an impression, the typical survey's median day is 13 responses (P25 5, P75 34).

Days from the first response until the count is reached. 0 means the same day. Percentiles are only among surveys that got there. Source: distinct `(session_id, timestamp)` in `responses`.

| Threshold | Never reached | P25 | Median | P75 | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| 30 responses | 9 of 97 (9%) | 0 | 0 | 2 | 25 |
| 100 responses | 15 of 97 (15%) | 0 | 2 | 5 | 28 |
| 300 responses | 79 of 97 (81%) | 1 | 1 | 2 | 23 |

45 of the 88 surveys that reached 30 responses did it on day one. Four of the nine that never reached 30 are test widgets. The real surveys with meaningful traffic that stalled are:

- Young Audience "Main Benefit": 1 response from 555 impressions.
- Groin Wash Younger "Main Problem": 3 from 292.
- Groin Wash Older "Main Problem": 20 from 456.

## 4. Rates

Across all 174,571 impressions: 20,163 responses, 75,404 dismissals, and 79,004 with neither (45.3%). No survey has responses plus dismissals above its impressions. 75,387 of the dismissals are closes (`total_closes`). Minimize was used 17 times. `total_interacts` is 0.

Per launched survey (n = 97):

| | P25 | Median | P75 | Min | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Response rate | 9.9% | 13.4% | 18.0% | 0% | 50% |
| Dismissal rate | 37.8% | 50.4% | 57.3% | 4.5% | 100% |
| No action | | 33.2% | | | |

The per-survey no-action median (33%) is lower than the pooled 45% because a few large surveys were mostly ignored.

Restricted to 200 or more impressions (91 surveys), the response rate is P25 9.9%, median 13.4%, P75 17.9%, min 0.2%, max 45.5%. P10 is 5.9% and P90 is 22.9%.

### Highest response rates (200 or more impressions)

| Survey | Impressions | Responses | Response rate |
| --- | ---: | ---: | ---: |
| IEFC LP \| Age Bracket Single Choice Question \| 08/19/2026 | 415 | 189 | 45.5% |
| FC LP Italy \| Age Bracket Single Choice Question \| 08/24/2026 | 757 | 299 | 39.5% |
| Face Shield LP \| Activity Single Choice Question \| 08/09/2026 | 227 | 84 | 37.0% |
| FC LP Italy \| Age Bracket Single Choice Question \| 08/24/2026 | 479 | 176 | 36.7% |
| AGS LP \| Hair Color Single Choice Question \| 04/27/2026 | 333 | 118 | 35.4% |

The two Italy age-bracket rows are different surveys with the same name.

### Lowest response rates (200 or more impressions)

| Survey | Impressions | Responses | Response rate |
| --- | ---: | ---: | ---: |
| FC YNG LP \| Young Audience - Main Benefit Single Choice Question \| 09/20/2026 | 555 | 1 | 0.2% |
| Groin Wash Younger LP \| Main Problem Single Choice Question \| 08/10/2026 | 292 | 3 | 1.0% |
| FC YNG LP \| Young Audience - Main Skin Concern Single Choice Question \| 09/01/2026 | 9,621 | 109 | 1.1% |
| AGS LP \| Wife Pressure Single Choice Question \| 09/09/2026 (still live) | 1,730 | 63 | 3.6% |
| NeoRoot LP \| Thinning Timeline Single Choice Question \| 04/10/2026 | 2,713 | 110 | 4.1% |

### Highest dismissal rates (200 or more impressions)

| Survey | Dismissal rate | Response rate |
| --- | ---: | ---: |
| IEFC LP \| Missing Information Single Choice Question \| 10/05/2026 | 67.7% | 6.8% |
| FC LP \| Groin Wash #1 Single-Choice Question \| 09/07/2026 | 66.6% | 8.8% |
| IEFC LP \| Use Case - Single Choice Question \| 04/21/2026 | 64.8% | 17.1% |
| IEFC LP \| Consideration Set Single Choice Question \| 09/09/2026 | 64.2% | 8.3% |
| FC LP \| Groin Wash #3 Multiple-Choice Question \| 09/07/2026 | 63.1% | 10.9% |

The lowest dismissal rates belong to the same ignored surveys as the low response rates. People neither answered nor closed.

### Completion

Only one survey has more than one question, and both questions are text. Of 102 submits, 101 included both answers and 1 included only the second. The widget sends every filled answer in one event, so there is no step-by-step drop-off to measure.

## 5. Change over time

Daily impressions and answers in this section come from `event_dedup.processed_at`, and only for surveys where that table holds at least 80% of the lifetime impressions. Impression time is when the worker saved the event, not the visitor's clock.

### First 3 days versus the rest

41 surveys had at least 50 impressions in each window. The first 3 days run a median of 1.3 percentage points higher than the rest (P25 −1.1, P75 +2.8). 17 surveys were more than 2 points higher early, 8 were more than 2 points higher later, and 16 stayed within 2 points.

### First week versus second week

Only 13 surveys had 50 impressions in both weeks. The median gap is −0.2 percentage points. 4 were higher in week one, 4 in week two, and 5 stayed within 2 points.

### Day-to-day noise

329 pairs of consecutive days, 73 surveys, both days with at least 30 impressions.

| | P25 | Median | P75 | P90 |
| --- | ---: | ---: | ---: | ---: |
| Change in response count | 19% | 45% | 90% | 100% |
| Change in response rate | 1.1 pp | 2.4 pp | 5.4 pp | 8.3 pp |

A rate move under about 5 percentage points is ordinary. The median absolute change in the response count is 5 answers. A count swing of 45% is normal for these campaigns, so it is a poor alert.

### When the answer mix settles

For radio questions, this is the largest option's share in the first N answers versus that option's final share.

| First N answers | Questions | Median error | Within 5 points | Leading option matches the final leader |
| ---: | ---: | ---: | ---: | ---: |
| 30 | 73 | 8.4 pp | 13 of 73 | 72% (48 of 67 with 100+ answers) |
| 50 | 71 | 7.0 pp | 21 of 71 | 76% |
| 100 | 67 | 3.6 pp | 43 of 67 | 93% |
| 200 | 31 | 2.4 pp | 25 of 31 | |
| 300 | 16 | 1.5 pp | 16 of 16 | |

The early answers are inside the final tally, so this view looks calmer than the mix actually is. Splitting each question with 100+ answers into halves, the largest option still moves by a median of 8.4 points (P75 13). 28 of 67 questions moved 10 points or more. On NeoRoot Thinning Timeline, "more than 10 years" rose 22 points in the second half, and "5–10 years" fell 24.

### Day and hour

Response rate by weekday, from `event_dedup`, stays between 10.5% and 13.0%. Sunday is the high end (13.0%). Tuesday is the low end (10.7%) and also the busiest day (3,875 submits). Weekend rate is 11.9% versus 10.9% on weekdays.

Volume follows when surveys are launched:

| Sun | Mon | Tue | Wed | Thu | Fri | Sat |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 27 | 18 | 21 | 17 | 13 | 0 | 1 |

By hour in New York, the rate sits around 10.5–12.2% from 5am through 11pm. Answer volume peaks at 7–11am and again at 5pm. The sharp dip is 3am, at 4.7% on 3,763 impressions, spread across many surveys.

## 6. Segments

Device, browser, OS, country, state, and page are columns on `responses` only. `event_dedup` has no device and no URL, so impressions and response rate cannot be split by any of these.

Answer rows: 22,158.

| Device | Share | Browser | Share | OS | Share |
| --- | ---: | --- | ---: | --- | ---: |
| Mobile | 79.3% | Safari | 55.0% | iOS | 51.9% |
| Desktop | 15.8% | Chrome | 39.0% | Android | 32.2% |
| Tablet | 4.9% | Edge | 3.7% | Windows | 10.0% |
| Blank (9 rows) | | Firefox | 1.4% | macOS | 5.1% |

Country: US 20,919 (94.4%), then Canada 259, UK 254, Italy 205, Australia 75. Top US states are Florida 2,195, California 2,147, Texas 1,752, New York 1,398, Pennsylvania 953.

### Do answers differ by device?

On 27 radio questions with at least 30 mobile and 30 desktop answers, the largest option gap has a median of 9.3 points (P75 13.6, max 24.3). 12 of the 27 exceed 10 points, and 4 exceed 15. On the Italy age-bracket survey, "75+" is 23% of mobile answers (54/239) and 47% of desktop answers (23/49). There is no single direction such as mobile always picking the first option.

### Region

Only 7 radio questions have 30 or more US answers and 30 or more non-US answers. The median largest gap there is 11.7 points, and 4 of the 7 exceed 10 points. Most surveys do not have a non-US segment large enough to compare.

### Pages

`responses.page_url`, with the query string removed. Across 95 surveys with answers: P25 1 distinct URL, median 4, P75 10, max 20. 24 surveys appear on one URL. Among 88 surveys with 30 or more answers, the single busiest URL accounts for a median of 75% of answers (P25 46%, P75 98%). 39 of those 88 put 80% or more of their answers on one URL. Response rate by page cannot be computed.

## 7. How the stats screen is used

It is not logged. There is no admin audit table. `worker_activity_logs` has 509,100 rows and every one is `ingest_events`. Opens of the stats screen, who opened them, export, export options, and the pie-chart toggle have no rows to count.

## 8. What to default on the stats screen

**Trend window: the last 3 days the survey actually received impressions, compared with that survey's own lifetime rate.** Three days matches the short end of a real run (P25 is 3 days), and a gap larger than 5 percentage points is past normal day-to-day noise. A previous-7-days window is longer than 61% of surveys. Week versus week exists for 13 surveys and was flat. The all-survey band is worth showing beside that delta: a response rate outside roughly 6–23%, or a dismissal rate far from 50%, is the unusual survey.

**Percentages: show them from the first answers, and treat them as reliable at 100 responses.** Counts can show immediately. At 30 responses the leading option is still wrong 28% of the time, and the biggest slice is a median of 8 points off the final mix. At 100 responses the leader matches 93% of the time and the median error is 3.6 points. Waiting for 300 would hide the chart on 81% of surveys.

**Five alerts that would have fired on real surveys:**

1. **Ignored.** No-action share over 70% after 500 impressions. Ten surveys, including both young-audience questions (about 88% of impressions got neither an answer nor a close) and the HSA/FSA rerun (13,214 impressions, 78% no action).
2. **Low response rate.** Under 6% after 200 impressions. That is below the P10, and it flags the young-audience widgets, NeoRoot Thinning Timeline, Wife Pressure while it is still live, and the exit-intent PDP survey.
3. **Closed.** Dismissal rate over 60% after 200 impressions. Thirteen surveys. Groin Wash #1 was 67% dismissed and 9% answered.
4. **The mix moved.** An option gained or lost 10 points between the first and second half of answers, once each half has at least 50. That happened on 28 of 67 radio questions.
5. **Still marked live.** Active, with no response for 14 days. Face Shield Activity and Age are in that state as of 18 Oct 2026.

A device or region callout is worth showing on the question card once both sides have 30 answers, because gaps of 10 points are common when the sample exists. It cannot be a response-rate callout until impressions store a device.

## Sources

| Question | Tables and fields |
| --- | --- |
| Inventory and status | `surveys` (`name`, `active`, `created_at`, `updated_at`) |
| Questions and types | `questions` (`question_type`, `order_index`) |
| Option counts | `answer_options` |
| Lifetime volume and rates | `survey_stats` (`total_impressions`, `total_responses`, `total_dismissals`, `total_closes`, `total_minimizes`, `total_interacts`, `first_impression_at`, `last_activity_at`) |
| Daily impressions, dismissals, answers | `event_dedup` (`event_type`, `processed_at`, `survey_id`), from 15 May 2026 |
| Submits, answer mix, device, geo, page | `responses` (`timestamp`, `session_id`, `question_id`, `answer_option_id`, `answer_text`, `device`, `browser`, `os`, `country`, `state`, `page_url`) |
| Stats-screen usage | `worker_activity_logs.job_name` only. No admin UI log exists |

## Data quality

- Status is only `surveys.active`. Drafts in this note are inferred.
- `survey_stats` is the complete lifetime counter: 174,571 impressions, 20,163 responses, 75,404 dismissals. `event_dedup` starts 15 May 2026 and holds 145,687 impressions, 16,141 answers, and 60,442 dismissals. Ten launched surveys have no daily impression rows. 3,996 answer rows predate `event_dedup`.
- `responses.timestamp` is the visitor time, stored as a timestamp without a timezone, in UTC. `event_dedup.processed_at` is the worker save time. A response near midnight can fall on a different calendar day than its impression.
- `responses` has 22,158 rows because a checkbox submit writes one row per selected option. Nine rows are missing session, device, browser, and OS. Eleven are missing country. `page_url` is present on every row.
- Two survey names are duplicated, listed above. A few names have a trailing space, trimmed in the table.
- Names embed the launch date as DD/MM/YYYY. Read that way, the name date matches `first_impression_at`.
