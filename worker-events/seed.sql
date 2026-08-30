-- ============================================================
-- Anvesha '26 events — seed data
--   wrangler d1 execute anvesha --remote --file=./seed.sql
--   wrangler d1 execute anvesha --local --persist-to ../worker/.wrangler/state --file=./seed.sql
--
-- Safe to re-run: every row is INSERT OR REPLACE on a fixed id, except the three
-- sweep-test rows at the bottom, which are deleted and recreated relative to the
-- clock so they are always about to end.
--
-- Times are naive IST, 'YYYY-MM-DD HH:MM'. See schema.sql.
-- Ids are Crockford base32 like newEventId() mints: no I, L, O or U. An id outside that
-- alphabet fails looksLikeEventId and the row becomes uneditable through the API.
-- Registration and gallery links are PLACEHOLDERS — real ones go in through the API.
-- ============================================================

-- ---------- upcoming: the three fest days ----------
INSERT OR REPLACE INTO events_scheduled
  (event_id, name, starts_at, ends_at, venue, description, registration_link, event_type)
VALUES
('EVT_S0000001','Frontiers Lecture','2026-09-11 10:00','2026-09-11 11:30','Main Auditorium',
 'The fest opens with a survey of the problems that will still be open in 2036 — and the handful that almost certainly will not be. Expect an argument rather than a summary: the speaker has spent twenty years being publicly wrong about timelines and is unusually candid about why. Doors open thirty minutes early; the first two rows are held for visiting school groups.',
 NULL,'Talk'),
('EVT_S0000002','Arduino from Scratch','2026-09-11 11:30','2026-09-11 14:30','Lab 204',
 'Three hours from an empty breadboard to a device that logs temperature and humidity to an SD card. Boards, sensors and jumpers are provided and stay with the lab, but the firmware you write is yours to take. No prior electronics experience assumed — the first forty minutes are spent on why a pull-up resistor exists at all. Bring a laptop with a USB-A port or an adapter.',
 'https://anvesha26.in/','Workshop'),
('EVT_S0000003','What the Telescope Saw','2026-09-11 14:30','2026-09-11 16:00','Main Auditorium',
 'A working tour of how a deep-field image is actually assembled: the stacking, the calibration frames, the artefacts that get mistaken for discoveries every few years. The second half looks at three images in detail and asks what each one is genuinely evidence of. Slides are shared afterwards; the raw frames are available on request.',
 NULL,'Talk'),
('EVT_S0000004','Robowars','2026-09-11 15:00','2026-09-11 19:00','Arena, Ground 2',
 'Single-elimination brackets in the 8kg class, three minutes a bout, judged on damage and control if no knockout. Standard safety rules apply: link removal within five seconds, no untethered projectiles, no fire. The pits open at 14:00 and a scrutineer signs off every machine before it enters the arena.',
 'https://anvesha26.in/','Competition'),
('EVT_S0000005','Astrophotography Basics','2026-09-11 18:00','2026-09-11 21:00','Rooftop, Block C',
 'Starts indoors with the theory of why a single long exposure loses to fifty short ones, then moves to the roof once it is properly dark. Two tracking mounts and a pair of DSLRs are shared between the group; bring your own body if you have one. Runs late and is entirely weather-dependent.',
 NULL,'Workshop'),

('EVT_S0000006','Code Sprint','2026-09-12 09:00','2026-09-12 15:00','Computer Centre',
 'Five problems, increasing in difficulty, scored on correctness first and runtime second. Machines are provided and locked down; language support covers C++, Python, Java and Rust. No internet, no phones, offline documentation on every desk. Teams of exactly three from any institution. The last problem has gone unsolved for two consecutive years and the setters seem pleased about it.',
 'https://anvesha26.in/','Competition'),
('EVT_S0000007','Reading a Genome','2026-09-12 10:00','2026-09-12 13:00','Bio Lab 1',
 'Work through a real annotated bacterial genome from raw reads to a called variant, using the same open tooling a research group would. The dataset is small enough to run on a laptop and large enough to be genuinely messy. Half the session is spent on the parts papers tend to skip: quality trimming, coverage gaps, and how to tell a sequencing artefact from a finding.',
 NULL,'Workshop'),
('EVT_S0000008','Panel: Climate Futures','2026-09-12 11:00','2026-09-12 12:30','Seminar Hall B',
 'An atmospheric physicist, an agricultural economist, a materials chemist and a policy researcher, none of whom fully agree with the others. The format is deliberately adversarial: each opens with the strongest version of a position the other three doubt. Audience questions take the second half and are taken unfiltered.',
 NULL,'Panel'),
('EVT_S0000009','Fabrication Clinic','2026-09-12 13:00','2026-09-12 16:00','Makerspace',
 'A clinic rather than a class: bring a part you want made, or use one of the sample briefs. Covers kerf compensation, tolerance stacking, when a printed part should have been cut instead, and the specific ways a first design fails on each machine. Closed-toe shoes required, no exceptions.',
 NULL,'Workshop'),
('EVT_S0000010','Minds and Machines','2026-09-12 16:00','2026-09-12 17:30','Main Auditorium',
 'A careful look at the places where human cognition remains stubbornly better understood than its artificial analogues — and at the borrowed vocabulary that causes most of the confusion between the two fields. Includes a live demonstration involving the audience that reliably fails in an instructive way.',
 NULL,'Talk'),
('EVT_S0000011','Quiz Bowl','2026-09-12 17:30','2026-09-12 20:00','Seminar Hall A',
 'Four themed rounds, buzzer format, escalating point values, with a written tiebreak held in reserve. Teams of four. The history-of-science round is the one that decides it most years, and the one teams prepare for least. School and university brackets run simultaneously.',
 'https://anvesha26.in/','Quiz'),

('EVT_S0000012','Water Rocketry','2026-09-13 10:30','2026-09-13 13:00','Ground 1',
 'Everything is built on the day from an identical kit — two-litre bottles, fixed nozzle, a fin sheet and tape. Two categories: maximum distance, and maximum payload returned intact. Pressure is capped and checked at the launcher. Weather rarely stops this one; it has run in light rain twice and the results were better, which nobody has satisfactorily explained.',
 'https://anvesha26.in/','Competition'),
('EVT_S0000013','Closing & Prizes','2026-09-13 16:00','2026-09-13 17:30','Main Auditorium',
 'Results read out for all four competitions, followed by the expo jury awards across the six halls. Runs about ninety minutes. Teams should send at least one member; unclaimed prizes are held at the fest desk for a week and then quietly absorbed into next year''s budget.',
 NULL,'Ceremony');

-- ---------- already happened: nine dates across three editions ----------
INSERT OR REPLACE INTO events_done
  (event_id, name, starts_at, ends_at, venue, description, gallery_link, summary, event_type)
VALUES
('EVT_P0000001','Fusion, Honestly','2025-02-09 11:00','2025-02-09 12:30','Main Auditorium',
 'A deliberately unhyped account of where magnetic confinement actually stands, delivered by someone who has spent a career inside the field and is visibly tired of the press cycle around it.',
 'https://drive.google.com/','Ran forty minutes over because the audience would not stop asking questions, and nobody left. The recording became the most-watched thing the fest has ever published.','Talk'),
('EVT_P0000002','Fermentation Lab','2025-02-09 13:30','2025-02-09 16:00','Bio Lab 1',
 'A hands-on look at controlled fermentation, from pH curves to why a batch goes wrong, ending with everyone taking a starter culture home in a jar.',
 NULL,'Eleven of thirty starter cultures were reported alive and in use a month later, which the lab now treats as an actual success metric.','Workshop'),
('EVT_P0000003','Closing Panel: What Held Up','2025-02-09 17:00','2025-02-09 18:30','Seminar Hall A',
 'Three researchers who spoke at earlier editions returned to grade their own five-year-old predictions in public, on stage, without having seen the questions in advance.',
 'https://drive.google.com/','Every speaker scored themselves lower than the audience did. The transcript is now assigned reading for the outreach mentorship programme.','Panel'),

('EVT_P0000004','Water You Drinking','2025-02-08 11:00','2025-02-08 13:00','Bio Lab 2',
 'A campus-wide water quality survey run entirely by attendees, testing every public fountain for hardness, residual chlorine and pH with a shared field kit.',
 NULL,'One fountain outside the old gym tested well outside normal hardness range and was flagged to facilities, which traced it to a corroded section of pipe.','Workshop'),
('EVT_P0000005','Swarm Robotics Trials','2025-02-08 14:00','2025-02-08 18:00','Arena',
 'Teams fielded fleets of six identical units that had to map and clear an arena with no shared coordinator and no human input after the start signal.',
 'https://drive.google.com/','Won by a team whose units simply refused to move for the first ninety seconds, which turned out to be a deliberate and extremely effective strategy.','Competition'),
('EVT_P0000006','Night Sky Walk','2025-02-08 19:30','2025-02-08 21:30','Ground 1',
 'A guided tour of everything visible without equipment, built around the argument that learning the sky by eye first makes every telescope afterwards more useful.',
 NULL,'Cloud cover rolled in at the halfway mark and the session continued anyway, as a talk about navigation. Attendance did not drop.','Observation'),

('EVT_P0000007','Opening: Ten Years On','2025-02-07 10:00','2025-02-07 11:00','Main Auditorium',
 'The tenth Anvesha opened by projecting the 2015 programme — six events, one room, forty attendees — and walking through what each of those six became.',
 'https://drive.google.com/','Four of the six original organisers attended. The programme sheet is now framed in the fest office.','Talk'),
('EVT_P0000008','Radio Astronomy for Beginners','2025-02-07 14:00','2025-02-07 17:00','Rooftop, Block C',
 'Building the simplest possible radio telescope from a coffee can and a USB dongle, aimed at the sun to pick up the loudest thing in the sky before attempting anything fainter.',
 NULL,'Detected the sun on the first attempt in nine of ten builds. The tenth was traced to a cable fault and fixed live to enthusiastic applause.','Workshop'),

('EVT_P0000009','Adversarial Inputs','2024-02-11 16:30','2024-02-11 18:00','Seminar Hall A',
 'A demonstration-heavy session on why image classifiers fail in ways that look absurd to humans, ending with a live attack on a model the audience chose.',
 NULL,'The live attack failed twice before working on the third attempt, which the speaker described afterwards as the most honest possible outcome.','Talk'),
('EVT_P0000010','Closing Ceremony','2024-02-11 18:30','2024-02-11 20:00','Main Auditorium',
 'Prizes read out across all four competitions and the expo jury awards, followed by an open floor where next year''s theme is debated more loudly than strictly necessary.',
 'https://drive.google.com/','The theme vote ended in an exact tie and was settled by a coin toss on stage, which is now apparently a tradition too.','Ceremony'),

('EVT_P0000011','Materials Teardown','2024-02-10 11:00','2024-02-10 13:00','Makerspace',
 'A lithium cell, a running shoe, a smartphone screen, a food pouch, a helmet liner and a bank card, sectioned on a bandsaw and read as engineering documents.',
 NULL,'The food pouch turned out to be the most complex object on the table at seven distinct layers, which surprised everyone including the presenter.','Workshop'),
('EVT_P0000012','CubeSat Ground Station','2024-02-10 15:30','2024-02-10 18:30','Rooftop, Block C',
 'A turnstile antenna assembled from hardware-store parts, wired to a software-defined radio, aimed at a published pass schedule.',
 'https://drive.google.com/','Decoded weather imagery from three consecutive passes. The antenna is still on the roof and still works, which was not the original plan.','Workshop'),

('EVT_P0000013','The Soil Project','2024-02-09 10:00','2024-02-09 16:00','Bio Lab 2',
 'Participants sampled eleven sites across campus and ran a full nutrient and contamination panel over a single day, then mapped the results.',
 NULL,'Found lead above threshold at two sites near the old workshop. The findings were passed to the estates office and both areas were remediated over that summer.','Workshop'),
('EVT_P0000014','Opening: Wind and Weather','2024-02-09 10:00','2024-02-09 11:00','Main Auditorium',
 'An unusually literal opening talk: the visiting meteorologist walked through exactly how the week''s forecast was produced, using the fest itself as the worked example.',
 NULL,'The forecast for the outdoor water rocketry session was wrong by six hours, which the speaker admitted on stage the following day.','Talk'),

('EVT_P0000015','Closing: Prize Giving','2023-02-12 15:00','2023-02-12 16:30','Main Auditorium',
 'The full results of the weekend, deliberately read from last place to first in every category, on the theory that it keeps the room listening longer.',
 NULL,'It worked — attendance for the closing session was higher than any single competition final that year.','Ceremony'),
('EVT_P0000016','First Light','2023-02-12 18:00','2023-02-12 20:00','Rooftop, Block C',
 'An informal evening talk on why access to a telescope changes what a child believes is possible, given standing on a roof to whoever turned up.',
 'https://drive.google.com/','Two attendees volunteered on the spot to take equipment into schools. That became the Mobile Lab, which has now reached 148 schools.','Talk'),

('EVT_P0000017','Under the Microscope','2023-02-11 10:30','2023-02-11 12:30','Bio Lab 1',
 'An open microscopy session where attendees were encouraged to bring their own samples — pond water, garden soil, tap water left standing — and see what turned up.',
 NULL,'Someone brought in aquarium water that turned out to host a rotifer nobody in the room could immediately identify, which became the most-photographed slide of the day.','Workshop'),
('EVT_P0000018','Bridge Collapse Trials','2023-02-11 13:00','2023-02-11 17:00','Ground 2',
 'Fixed span, fixed material budget, loaded to destruction on a hydraulic rig with the load-to-mass ratio decided on the spot.',
 'https://drive.google.com/','The winning bridge held 214 times its own mass. Second place held more but weighed enough to lose on ratio, and the protest that followed lasted longer than the event.','Competition'),

('EVT_P0000019','Zero to Telescope','2023-02-10 09:30','2023-02-10 17:30','Makerspace',
 'A full day of hand-grinding and figuring a six-inch primary mirror, then testing it with a Foucault rig built in the same session.',
 NULL,'Nine of fifteen mirrors reached a usable figure by close. The other six were taken home unfinished and at least three were eventually completed.','Workshop'),
('EVT_P0000020','Ink, Paper, Circuit','2023-02-10 14:00','2023-02-10 17:00','Makerspace',
 'A crossover session between printmaking and electronics: attendees drew working circuits with conductive ink pens on plain paper, ending with a playable paper piano.',
 NULL,'The paper piano survived exactly one day before conductive ink cracked along a fold, which sparked an entirely unplanned discussion on material fatigue.','Workshop');

-- ---------- sweep test ----------
-- Three events that end roughly ten minutes from whenever this file is run, so the
-- next cron tick has something to move. Times are computed by SQLite rather than typed
-- in: '+330 minutes' is the IST offset the Worker uses, and re-running this file always
-- gives three fresh rows about to expire.
--
-- They disappear from GET /api/events the moment their end time passes (the list
-- filters on it) and appear in GET /api/events/past within 15 minutes, when the cron
-- runs. DELETE first so a re-run does not leave stale copies behind.
DELETE FROM events_scheduled WHERE event_id LIKE 'EVT_W%';

INSERT INTO events_scheduled
  (event_id, name, starts_at, ends_at, venue, description, registration_link, event_type)
VALUES
('EVT_W0000001','Sweep Test A — ends in ~10 min',
 strftime('%Y-%m-%d %H:%M','now','+330 minutes','-30 minutes'),
 strftime('%Y-%m-%d %H:%M','now','+330 minutes','+10 minutes'),
 'Test Bench','Seeded to prove the cron works. Should vanish from Upcoming at its end time and appear under History within fifteen minutes.',
 NULL,'Talk'),
('EVT_W0000002','Sweep Test B — ends in ~11 min',
 strftime('%Y-%m-%d %H:%M','now','+330 minutes','-20 minutes'),
 strftime('%Y-%m-%d %H:%M','now','+330 minutes','+11 minutes'),
 'Test Bench','Second of three. Same date as A, so both land on one History dial position.',
 'https://anvesha26.in/','Workshop'),
('EVT_W0000003','Sweep Test C — ends in ~12 min',
 strftime('%Y-%m-%d %H:%M','now','+330 minutes','-10 minutes'),
 strftime('%Y-%m-%d %H:%M','now','+330 minutes','+12 minutes'),
 'Test Bench','Third of three. Its gallery link and summary are empty, which is what a freshly archived event looks like before anyone writes it up.',
 NULL,'Competition');
