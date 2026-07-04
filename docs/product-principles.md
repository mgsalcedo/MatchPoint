# Product Principles — MatchPoint

Living document. Defines the product principles that must guide every design and implementation decision. When building features, check each implementation against these principles — if a feature violates multiple principles, it should not be built without explicit approval. Complements `docs/vision.md` (why) and `docs/base-standards.md` (engineering conventions).

## 1. The user receives value before login

Users should not be asked to create an account before understanding the value of MatchPoint. Login appears only when the user decides to contact a community.

Correct: user completes Sport Match™, sees recommendations, and opens profiles without login; logs in only before contacting.
Incorrect: asking for email on the first screen, blocking Sport Match™ behind signup, asking for a password, requiring a full profile before value.

## 2. Start with the goal, not the sport

People rarely start with a sport — they start with a desired change ("I want to run my first 10K", "I want to lose weight", "I want to meet people"). The Sport Match™ flow must start by asking "What do you want to achieve?" The sport comes after the goal.

## 3. MatchPoint recommends

MatchPoint should not feel like a database the user has to manually search — it should feel like a sports advisor ("I found communities that fit your goal and schedule" rather than "Here are 200 results, use filters"). Manual exploration can exist later, but PMV must prioritize recommendation.

## 4. Every recommendation must explain why

A recommendation without explanation is just a list. Every Match result must show the reason behind the recommendation (e.g. "Excellent Match because it trains in Surco, has night schedules, accepts beginners, and has a social atmosphere"). This builds trust.

## 5. Community is more important than venue

Users do not only need a place — they need a context where they can belong. The product should capture and display atmosphere, culture, level, social energy, coach style, training intensity, beginner friendliness. A gym with equipment is not enough; a team with belonging is more valuable.

## 6. Less searching, more training

The product must reduce the time between intention and action. PMV standard: a user should reach a relevant contact in under five minutes. Every new screen must justify its existence — if it doesn't bring the user closer to contact or improve match quality, remove it from PMV.

## 7. Do not build a social network in V1

Avoid feeds, likes, comments, followers, user-generated photo posts, activity timelines in V1. The job of PMV is discovery and contact, not competing with Instagram/TikTok/Strava on content.

## 8. The North Star is contact, not engagement

Do not optimize for time spent — optimize for useful action. Primary metric: contacts generated between users and sports organizations. Profile views and completed matches are secondary signals, not success by themselves.

## 9. Friction must earn its place

Allowed friction: Sport Match™ questions, login before contact, providing district/schedule to improve results. Bad friction: long signup, required bio, password creation, mandatory app install, too many filters, unnecessary onboarding slides.

## 10. The PMV is a learning machine

The PMV exists to learn, not to be perfect. It must answer: do users want this, do they complete Sport Match™, do they trust the recommendations, do they contact organizations, do organizations see value. Build the smallest version that answers these questions.

## 11. Data quality creates defensibility

The long-term competitive advantage is not the interface — it is the structured dataset of sports communities (schedules, locations, levels, sports, coaches, atmosphere, culture, services, events, beginner friendliness, contact performance). Better data creates better matches; better matches create more contacts; more contacts create more value.

## 12. Organizations should be helped, not burdened

Profiles have two layers. Required: name, sport, district, schedule, WhatsApp, Instagram. Enhanced: photos, coach, ADN Deportivo™, services, events, pricing, beginner friendliness, trial class, certifications. More completeness should improve visibility.

## 13. Preload first, claim later

Do not launch with an empty marketplace. MatchPoint should preload relevant organizations and allow them to claim profiles later — this helps users immediately discover value and lets organizations see the benefit before onboarding.

## 14. Match™ is a guide, not a chatbot

Match™ should welcome, guide, explain, encourage, and reduce uncertainty. It should not answer open-ended complex questions in V1, replace customer support, hallucinate recommendations, or pretend to know things not in the database.

## 15. Sport Match™ must be fast

Completed in under 60 seconds: one question per screen, large buttons, minimal typing, clear progress, no unnecessary fields, taps over text input whenever possible.

## 16. The product should feel alive, not empty

Even a simple PMV should feel curated: preloaded communities, clear recommendation reasons, Match™ microcopy, good profile photos, "Excellent Match" labels, simple animations, human language.

## 17. Do not overbuild admin before demand

Initial data can be managed manually or through a lightweight internal interface. Do not overbuild complex permissions, advanced organization dashboards, billing, CRM features, multi-role workflows before there's demand for them.

## 18. Every feature must map to a job

Before building a feature, ask: "What job is the user hiring this feature to do?" If the job is unclear, do not build it.

## 19. Trust is a product feature

Sports happen in the real world — users need to feel safe and informed. Trust signals: claimed profile, verified organization, verified coach, clear schedules, real photos, transparent pricing, beginner-friendly label, contact information, recent updates. Design trust from day one.

## 20. Build for Peru first

Optimize the PMV for Lima Metropolitana, Callao, Peruvian districts, local sports behavior, WhatsApp-first contact, Instagram-first discovery habits, amateur sports communities. Expansion comes later.

## 21. Avoid generic marketplace language

User-facing language: community, match, discover, train, belong, start, improve, connect. Avoid overusing vendor, listing, provider, inventory, transaction, lead marketplace in user-facing copy (these terms may still be useful internally/technically).

## 22. Good enough matching beats perfect search

The PMV does not need a perfect algorithm — it needs recommendations that feel clearly better than manual search. A good rule-based match with strong explanations is enough for V1.

## 23. Recommendations should be ordered by fit

Do not rank only by popularity or payment — PMV ranks by compatibility. Future monetization can include promoted placements, but they must be clearly labeled and must not destroy user trust.

## 24. The best interface may be no interface

If the product can make a decision for the user, avoid asking for extra work. Instead of showing all filters first, Sport Match™ asks a few key questions and generates results.

## 25. Every contact should be tracked

Since contacts are the North Star, every contact event must be recorded with: user ID, organization ID, contact type, timestamp, source, match session ID, sport, goal, district, result rank.

## 26. No dark patterns

Do not trick users into login, contact, payment, or sharing data. All friction and data collection must be clearly tied to user value.

## 27. Design for repeat discovery

A user may use MatchPoint more than once (new sport, moved districts, changed schedule, new race, more advanced group, weekend event). The product should eventually support repeat matching.

## 28. Keep the PMV sharp

PMV scope is exactly: Sport Match™, Results, Community profile, Contact. Any additional feature must prove it directly improves these.

## 29. Make the data model flexible

Do not hardcode only "teams" — use a broader concept: Organization, with types Team, Club, Gym, Training center, Coach, Federation, Event organizer, Academy, Community. This is fully implemented as of the Fase 2 reconciliation — see `docs/data-model.md`'s Organization entity and `docs/database-schema.md`'s `organization_type` enum.

## 30. MatchPoint helps people belong

The emotional promise matters. The user should not feel like they are browsing a database — they should feel "This app understood what I need and helped me take the first step." That is the feeling the product must create.
