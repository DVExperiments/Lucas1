# The Lucas Money Game V3.8

A Success Avenue Money pilot for intermediate-school learners. Learners complete real jobs, run a small business, and practise making money decisions over 12 weeks. Families can play with one learner and a caregiver. Teachers can try a class with multiple learners on the same browser.

## Try the pilot

1. Open the hosted site and choose **Play the demo** to open a sample learner dashboard. Use **Start at home** or **Start a class** for fresh progress. Choose an age band in learner setup. Ages 11–13 is the main pilot experience, with display adjustments for ages 8–10 and 14–17.
2. The dashboard quest trail shows the optional challenge, required missions and check-in. From the dashboard, use **I did a chore**, **Business mission**, or **Money habit** to record real activities. Open **Money lesson** for the weekly quiz or reflection. The lesson also shows the assigned video when one is provided.
3. Use **Facilitator view** to review submissions, tailor a learner's weekly module, and record a check-in. A check-in completes the current week. The progression setting controls when the next week opens. After the week 12 check-in, the learner can choose **Keep playing** to continue at their own pace.
4. In a class, open the facilitator dashboard to view progress and create a competition. Choose a metric and target. Learners see new challenges on their dashboard and score as they complete activities after the competition starts.

## Week progression

- **Learner-paced** (default). Week 1 opens as soon as the learner is created. After the required missions are complete and the week is closed, the learner chooses **Start next week** on the dashboard or Missions page. Solo learners close their own week. In a mentored game, the facilitator approves required missions and records the check-in.
- **Scheduled**. Choose a start date for Week 1. Week 2 is due seven days later, Week 3 is due fourteen days later, and so on. Dates use the device’s local calendar. Each later week opens automatically once its date has arrived and the previous week is closed. Learners who fall behind finish each week in order and can continue as soon as they catch up.
- In **Facilitator → Settings**, set the class progression and start date. In **Add learner** or **Edit learner profile**, use the class setting or give that learner a separate schedule. For home games, set it during setup or use **Parent / caregiver view → Edit learner profile**. Changing a schedule keeps weeks the learner has already started.

## Progress and rewards

- Learning XP drives levels and the class leaderboard. In each week it counts approved missions, up to one approved chore, the completed lesson clip and the submitted quiz. Savings balances are personal and do not affect learning XP or rankings.
- The Profile shop has free starter looks and point unlocks for icons, dashboard backgrounds, and titles. Points spent on the retired virtual shop are available again in the new shop. The progress chart shows cumulative XP and savings by week. Savings milestones and the big personal goal use the learner's own money log. The dashboard previews bucket balances and any active profile shop saving goal. On Money buckets, create up to 12 personal buckets using the artwork picker. Custom buckets work with the same transfers as the four standard accounts. On Missions, select any Season map week to read a preview. Use **Money in** on the dashboard or Money log to record an earning. Use **Money out** to log a personal purchase from Spend or a business cost from Main. Business costs and simulated tax reduce the amount available in Main. Choose **Move money** to transfer between Main and a bucket, and see the change immediately. Cash left in Main carries into the next week. Savings badges are confirmed at check-in. Earlier closed weeks retain their original bucket allocations. Each bucket has a playable practice decision, with extra reading on savings accounts, shares and funds, and KiwiSaver.

## School quizzes and results

- Weeks 1–6 use all 60 multiple-choice questions from the SAM 12-Week School Challenge facilitator PDF. Each quiz has ten questions worth one point each. Learners see their score, pass or fail result, and answer breakdown immediately after submitting. The pass mark is 60% (6 of 10). A first pass earns 20 Learning XP and 10 Shop points. A first fail earns 10 XP and 5 points. Further failed attempts earn no additional reward, and passing after a fail earns the remaining 10 XP and 5 points.
- Learners can review results and retake failed quizzes from **Money lesson** or from a previous week on **Missions → Season map**. Facilitators can find the same breakdown under **Open learner → Weekly record → Missions and submissions**. Use the week selector to review older results. In mentored games a facilitator can ask for a retake. A new submission replaces the displayed score and answers.
- The PDF gives preliminary video question outlines for Weeks 7–12. Learners can submit a short reflection for lesson credit in these weeks. If a facilitator assigns a matching external SAM video and quiz, learners can complete those on SAM and record a reflection in the game. External scores stay on SAM. For Weeks 1–6 the built-in school quiz takes priority.
- Set an optional video or external quiz in **Settings** or in a learner’s weekly module. Store both links together for an external pair. If a weekly override is entered, only the links from that override are used. The game’s original practice clips are available as supplemental examples when no video is assigned.
- Older completed weeks keep their prior progress. In-progress learners with legacy practice-quiz credit can still take the school quiz in Weeks 1–6.

## Weekly and teacher challenges

- Choose **Play this week’s challenge** from the dashboard. It opens the Challenges page, where learners can choose the weekly activity, a teacher challenge or practice. Each programme week has its own activity. Finish it for a printable certificate and 15 Shop points. Play again for practice or catch up on earlier weeks in **Challenges**. There is one reward per programme week, independent of weekly check-ins. Earn one, four and eight certificates to unlock profile rewards.
- **Market Day** is open to every learner. Plan a school fair stall, tap to select stock and prices, check your cash buffer and adapt after an unexpected cost. Watch the fair unfold over about seven seconds before seeing the result, or choose **Skip to results**. The scene respects reduced-motion settings. The standalone practice activity is available at any time. Only the weekly version counts towards its certificate.
- In the teacher or caregiver view, use **Challenges & rewards** to publish a task for the group or selected learner. Choose a certificate, avatar item, classroom reward or a combination. Learners submit their work, and adults approve it or request changes. For a shared reward such as a class lunch, set the number of learners who must be approved. Adults organise the reward and record when they have delivered it. Certificates and avatar rewards are issued individually on approval.

## Week 12 Family Money Showdown

- In Week 12, open the Showdown from **Challenges** or **Missions**. The learner and adult take turns and reveal their scores together. Both turns must be completed to earn the Week 12 certificate. The score does not affect certificate eligibility.
- The learner’s score and answer breakdown are available from their Week 12 challenge and from the facilitator’s **Weekly record**. A preview in Challenges is available from any week. It leaves progress, certificates and rewards unchanged.
- Earlier submitted or approved family activities remain viewable. Existing closed weeks keep their historical records.

## Publish on GitHub Pages

1. Extract the ZIP. Put `index.html`, the `assets/` folder and `.nojekyll` in the root of your GitHub repository. The README can sit alongside them.
2. In the repository, open **Settings → Pages**. Under **Build and deployment** select **Deploy from a branch**, choose the branch holding those files and select **/(root)**. Save and open the published URL once Pages shows it.
3. For a local preview, run `python -m http.server 8000` in the extracted folder and open `http://localhost:8000/`. No package installation or build step is needed.

## Pilot data and SAM integration

Progress is saved in this browser profile for the site's origin and path. Existing Lucas Money Game saves at the same URL can carry over. Earlier age categories are assigned a starting display band. Check the age band in the facilitator’s learner profile after upgrading. Use the same browser profile and the same hosted URL to resume. The sample group is available independently of your own games.

In a class, use **Open teacher dashboard** from Home and enter the class PIN. Use **Create another class** or the **Current class** menu from any teacher page to manage multiple classes on this browser. Each class opens with its own PIN once per teacher session. Returning Home or handing the device to a learner ends the teacher session. Open a learner record and choose **Hand device to learner** to activate that learner. The learner sees their assigned profile. The teacher roster and leaderboards show equipped icons and titles. Older classes set a PIN when first opened after upgrading. The demo teacher dashboard uses sample data and opens directly.

The PIN controls the interface on this browser. Use sample names for classroom demonstrations. A classroom rollout across student devices requires authenticated SAM accounts, server-side class and role permissions, and shared persistence. The SAM embed and credit for SAM-hosted video and quiz completions will need the owner's integration details and approved content URLs.

## Profile customisation

Home setup includes a gallery of free starter avatars and backgrounds. A new class learner can choose their own free starter look when a facilitator first hands over the dashboard. In the Profile Shop, use the categories to browse avatars, dashboard backgrounds, avatar frames and titles. The Avatars category includes people, animals and icons. Titles have distinct badge designs, and the Frames category includes neon options. Free items can be equipped at any time. Earn game points to buy upgrades, or set a saving goal for the item you want.

## Total wealth

Select **Total wealth** in the learner dashboard profile to see all-time income, costs, simulated tax and personal purchases. The total includes Main and every bucket, including custom buckets. Money transfers change where funds are held without changing total wealth. Earlier saved records may include a labelled adjustment when a previous version did not carry a loss forward.

## Group leaderboard

The Facilitator dashboard has a **Show leaderboard on learner dashboards** toggle for each group. Sharing is off for real groups until the facilitator enables it and on in the sample group by default. In a group with at least two learners, the board appears at the end of the learner dashboard with the current learner’s row marked **You**. Standings use Learning XP and learners with the same score share the same rank. Home games have no group board.

## Vimeo for the school demo

In facilitator **Settings** or an individual weekly module, paste the Vimeo share link, player URL or Vimeo embed code into **SAM or Vimeo video**. The app extracts the player address and keeps the unlisted hash when present. Vimeo streams the video, so the game ZIP does not need to contain the large video file. The assigned video appears in the weekly lesson alongside the built-in quiz, an external quiz link, or the reflection.

Vimeo’s **Private** setting limits playback to the owner and permitted Vimeo team members. For a school-facing demo use a video approved for the demo, configure **Embed only** if your plan supports it and choose **Specific domains** with the exact host serving the game. Test with a signed-out browser and on a school device. An unlisted URL can be shared by people who have it. Domain restrictions control where a video can be embedded. SAM login and school entitlement control who can open the game itself. Only put approved demo material into this prototype.

## What SAM needs to supply for launch

- **Accounts and progress:** Identify the SAM membership system and hosting platform, provide a staging environment and approved test accounts, and confirm the learner, facilitator, parent and school entitlement rules. A deployment for student use needs server-side SAM session and entitlement checks and a progress store scoped to the signed-in learner and authorised school staff. The GitHub Pages build remains a staff-demo prototype with browser storage.
- **Official lesson content:** Supply approved video links and the final multiple-choice questions with answer keys for Weeks 7–12.
- **Languages:** The prototype includes draft te reo Māori and Spanish translations for the main learner screens, controls, bucket practice, and the Week 1 practice transcript. Some copy, later lessons and challenges, captions and videos still need localized replacements. Review the draft translations with fluent speakers before school rollout.
