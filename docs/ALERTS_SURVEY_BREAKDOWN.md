# Survey alert breakdown

Local copy of Particle for Men, 2026-10-19. Test surveys are excluded. Benchmarks are every non-test survey in the tenant with 200 or more impressions (91 surveys): response P10 5.9%, P25 10%, median 13.4%, P75 17.9%, P90 22.9%. Close median 50.4%. No-action median 33.2%.

The survey page keeps at most one card per group, then the top 3. Two facts in the same group never both show. The row file is `docs/ALERTS_SURVEY_BREAKDOWN.csv`.

## How many cards show

Non-test surveys: 95. With 200 or more impressions: 91.

Among those 91: none 24, one card 37, two cards 24, three cards 6.

4 surveys are under 200 impressions. The engine skips every rule except "still on, no answers" for those.

## Rules

| Rule | Group | Data needed | Fires when | Clear the data bar | Fire | Shown in the 3 |
| --- | --- | --- | --- | ---: | ---: | ---: |
| low_response_rate | rate | 200+ impressions | Response rate under P10 (5.9%) | 91 | 9 | 7 |
| high_response_rate | rate | 200+ impressions | Response rate over P90 (22.9%) | 91 | 9 | 9 |
| stalled | rate | 300+ impressions | Fewer than 30 answers | 88 | 2 | 2 |
| ignored | engagement | 500+ impressions | More than 70% neither answered nor closed | 81 | 10 | 10 |
| closed_a_lot | engagement | 200+ impressions | More than 60% closed it | 91 | 12 | 12 |
| answers_shifted | answers | 100+ answers on a single-choice question | An answer's share moved 10+ points between the first and second half | 67 | 30 | 22 |
| headline_result | answers | 100+ answers and 2 options | Top answer is at least 1.5× the second | 67 | 32 | 28 |
| device_answers_differ | segments | 30+ mobile and 30+ desktop answers | One answer differs by 10+ points between mobile and desktop | 27 | 12 | 12 |
| segment_rate_gap | segments | Device or page tags cover 50% of impressions, and two slices have 200+ each | One slice answers at least 1.5× as often as another. Tags start 2026-10-18 | 0 | 0 | 0 |
| silent_live | live | Survey is on | No answer for 14+ days | 3 | 1 | 1 |
| rate_dropped | live | On, 200+ impressions, 50+ impressions in the last 3 active days | Recent rate is more than 5 points under the lifetime rate | 2 | 0 | 0 |
| question_skipped | coverage | 2+ questions | A question was answered on under 40% of submits | 1 | 0 | 0 |

Counts are among the surveys with 200 or more impressions. "Still on, no answers" can also fire under 200; that extra set is not in this table.

Same-group rules replace each other. Rate holds low response, strong response, and stalled. Engagement holds ignored and closed a lot. Answers holds the shift and the headline. Segments holds the device split and the page or device rate gap. Live holds silent and the recent drop.

- **low_response_rate:** Groin Wash Younger LP | Main Problem; Groin Wash Older LP | Main Problem; NeoRoot LP | Thinning Timeline; FC LP | (Re-run) FC HSA/FSA #1; FC YNG LP | Young Audience - Main Benefit; AGS LP | Wife Pressure; FC YNG LP | Young Audience - Main Skin Concern; FC PDP - Exit Intent - Objections
- **high_response_rate:** FC LP Italy | Age Bracket; FC LP Italy | Age Bracket; IEFC LP | Age Bracket; Face Shield LP | Activity; FC LP | Brand Familiarity; Shampoo LP | Scent Preference; Shampoo | Hair Loss Area; SHG LP | Competitors
- **stalled:** Groin Wash Older LP | Main Problem; FC YNG LP | Young Audience - Main Benefit
- **ignored:** NeoRoot LP | Thinning Timeline; FC LP | (Re-run) FC HSA/FSA #1; FC YNG LP | Young Audience - Main Benefit; FC LP | FC HSA/FSA #3; FC LP | FC HSA/FSA #2; FC LP | FC HSA/FSA #1; AFC LP | Body Context; FC YNG LP | Young Audience - Main Skin Concern
- **closed_a_lot:** IEFC LP | Consideration Set; FC LP | Wife Pressure; FC LP | Dream Comment (Single Choice); FC LP | Groin Wash #3 Multiple-Choice Question; FC LP | Groin Wash #1; FC LP | Regularly Purchase Products; IEFC LP | What Bother's You; IEFC LP | Event-Specific
- **answers_shifted:** NeoRoot LP | Thinning Timeline; FC LP | FC HSA/FSA #1; IEFC LP | Consideration Set; IEFC LP | Wife Pressure; FC YNG LP | Young Audience - Main Skin Concern; IM LP | Decline Cause; FC LP Italy | Age Bracket; FC LP | Wife Pressure
- **headline_result:** NeoRoot LP | Thinning Timeline; FC LP | (Re-run) FC HSA/FSA #1; FC LP | FC HSA/FSA #3; FC LP | FC HSA/FSA #1; IEFC LP | Consideration Set; IM LP | Decline Cause; FC LP | Purchase Decider; FC LP | Wife Pressure
- **device_answers_differ:** FC LP | FC HSA/FSA #2; FC LP Italy | Age Bracket; FC LP | Cable Entertainment; FC LP | Groin Wash #1; FC LP | Eye Area Fix; FC LP | Dark Spots Concern; FC LP | Never Purchased Reason; Shampoo | Hair Loss Area
- **silent_live:** Face Shield LP | Activity

## Which facts exist on most surveys

A new stat only helps if the survey has the data. Shares are of the surveys with 200 or more impressions.

| Fact | Surveys with the data | Share |
| --- | ---: | ---: |
| Response, close, and no-action rate | 91 | 100% |
| A single-choice question with 100 or more answers | 67 | 73.6% |
| Top answer vs second answer | 67 | 73.6% |
| First-half vs second-half shift | 67 | 73.6% |
| 30 or more answers on both mobile and desktop | 27 | 29.7% |
| Two or more questions | 1 | 1.1% |
| Currently live | 3 | 3.3% |
| 50 or more impressions in the last 3 active days | 58 | 63.7% |
| Device or page tags cover half of impressions | 0 | 0% |

Device and page tags on impressions began 2026-10-18, so almost no finished survey can show a page or device rate gap yet.

## Spread of the numbers that exist widely

Response rate. n=91, P10 5.9, P25 10, median 13.4, P75 17.9, P90 22.9

Close rate. n=91, P10 19.3, P25 39.4, median 50.4, P75 56.4, P90 61.1

No-action rate. n=91, P10 25.7, P25 28.6, median 33.2, P75 41, P90 72.6

Top answer ÷ second answer, surveys with 100 or more answers. n=67, P10 1.1, P25 1.2, median 1.48, P75 2, P90 2.9

Top answer share of answers, same surveys. n=67, P10 27.7, P25 33.7, median 39.2, P75 45, P90 58.6

Largest answer-share move between halves, in points. n=67, P10 4, P25 5, median 8, P75 13, P90 15

Largest mobile vs desktop answer gap, in points. n=27, P10 4.4, P25 7.1, median 9.3, P75 13.6, P90 15.3

## Buckets

Response rate: under 6: 10 (11%); 6 to 10: 13 (14.3%); 10 to 14: 26 (28.6%); 14 to 23: 33 (36.3%); 23 or more: 9 (9.9%)

No-action rate: under 40: 67 (73.6%); 40 to 55: 11 (12.1%); 55 to 70: 1 (1.1%); 70 to 85: 8 (8.8%); 85 or more: 4 (4.4%)

Close rate: under 10: 1 (1.1%); 10 to 25: 11 (12.1%); 25 to 40: 12 (13.2%); 40 to 60: 54 (59.3%); 60 or more: 13 (14.3%)

Top ÷ second, 100+ answers: under 1.2: 10 (14.9%); 1.2 to 1.5: 21 (31.3%); 1.5 to 2: 18 (26.9%); 2 to 3: 11 (16.4%); 3 or more: 7 (10.4%)

Largest half-to-half move, points: under 5: 11 (16.4%); 5 to 10: 26 (38.8%); 10 to 15: 22 (32.8%); 15 to 25: 8 (11.9%); 25 or more: 0 (0%)

Largest mobile vs desktop gap, points: under 5: 5 (18.5%); 5 to 10: 10 (37%); 10 to 15: 8 (29.6%); 15 to 25: 4 (14.8%); 25 or more: 0 (0%)

## Near the current lines

These surveys have the data and sit just short of a rule. They are the first place a lower line would add cards.

- Response rate is under P10+2 and at or above P10: 3. AFC LP | Body Context; HC LP | Prior Stop; IEFC LP | Missing Information
- No-action is over 60% and at or under 70%, with 500+ impressions: 1. AGS LP | Wife Pressure
- Close rate is over 45% and at or under 60%: 47. IEFC LP | Wife Pressure; Shampoo LP | Wife Pressure; FC LP | Purchase Decider; AGS LP | Worth It; FC Post-Purchase - Objections; Eyebag Killer Set LP | Prior Spend
- Top answer is 1.2× to 1.5× the second: 20. FC LP | FC HSA/FSA #2; IEFC LP | Wife Pressure; FC LP Italy | Age Bracket; IEFC LP | Age Bracket; IEFC LP | Worst Moments; IEFC LP | Current Fix
- Largest answer shift is 5 to 10 points: 26. FC LP | Purchase Decider; FC LP Italy | Age Bracket; AGS LP | Perception; FC LP | News Beyond the Big Three; IEFC LP | Worst Moments; FC LP | Cable Entertainment
- Largest device gap is 5 to 10 points: 10. FC LP | (Re-run) FC HSA/FSA #1; FC LP | FC HSA/FSA #3; FC LP | Purchase Decider; FC LP | Sports Networks; FC LP | Brand Familiarity; FC LP | Dream Comment (Single Choice)
- Recent rate is 2 to 5 points under lifetime, with 50+ recent impressions: 9. AGS LP | Wife Pressure; AFC LP | Body Context; FC LP | Brand Familiarity; Shampoo LP | Scent Preference; FC LP | Groin Wash #2; Eyebag Killer Set LP | Intent Reason

## Row file

`docs/ALERTS_SURVEY_BREAKDOWN.csv` has one row per non-test survey on this site. `fired_*` is the rule before the one-per-group cut. `shown_*` is what the survey page displays. Rates are percents. Shares and gaps are points.
