# WeWrites — five storyboards

Stills are 1920×1080, rendered from the Remotion compositions in `video/src`.
Every screen in them is a real capture of wewrites.ai; nothing is mocked up.

`contact-sheet.png` shows all five variants, one still per scene.

| # | File | Frame | Scene |
|---|------|-------|-------|
| 01 | `a/01-open.png` | 45 | Statement: a team publishing without a developer |
| 02 | `a/02-home.png` | 140 | Home, push-in on the claim |
| 03 | `a/03-courses.png` | 245 | Teacher grid, labelled `wewrites.ai/courses` |
| 04 | `a/04-milestones.png` | 350 | Milestone timeline, labelled `wewrites.ai/milestones` |
| 05 | `a/05-claim.png` | 440 | Statement: the team publishes without engineering |
| 06 | `a/06-end.png` | 510 | End card: domain, role, stack |
| 11 | `b/01-open.png` | 36 | Statement: content and components as a graph |
| 12 | `b/02-spec.png` | 145 | Teacher grid + numbered spec column |
| 13 | `b/03-milestones.png` | 280 | Milestone timeline |
| 14 | `b/04-claim.png` | 380 | Statement: consistency is the payoff |
| 15 | `b/05-product.png` | 470 | EdTech products page |
| 16 | `b/06-end.png` | 560 | End card |
| 21 | `c/01-open.png` | 42 | Statement: listening papers from analysed papers |
| 22 | `c/02-product.png` | 140 | EdTech products page |
| 23 | `c/03-milestones.png` | 260 | Milestone timeline |
| 24 | `c/04-claim.png` | 370 | Statement: nobody waits for a deploy |
| 25 | `c/05-home.png` | 465 | Home, framed as the outcome |
| 26 | `c/06-end.png` | 555 | End card |

| # | File | Frame | Scene |
|---|------|-------|-------|
| 31 | `d/01-proof.png` | 30 | Cold open: milestone entry with its source |
| 32 | `d/02-claim.png` | 105 | Statement: generated from a source, then checked |
| 33 | `d/03-home.png` | 200 | Home |
| 34 | `d/04-courses.png` | 295 | Teacher grid |
| 35 | `d/05-claim.png` | 380 | Statement: the team edits it |
| 36 | `d/06-end.png` | 450 | End card |
| 41 | `e/01-open.png` | 37 | Statement: a public site and the system that feeds it |
| 42 | `e/02-split.png` | 135 | Two panels: courses and milestones, side by side |
| 43 | `e/03-claim.png` | 240 | Statement: one design system across both |
| 44 | `e/04-product.png` | 330 | EdTech products page |
| 45 | `e/05-end.png` | 427 | End card |

```sh
gh workflow run promo-render.yml -f project=we-writes -f variant=all -f stage=stills
```

Re-render one still — locally with the installed Chrome (`node_modules` is
~190 MB; Remotion does not download its own browser when `--browser-executable`
is passed), or in CI:

```sh
gh workflow run promo-render.yml -f project=we-writes -f variant=b -f stage=stills
gh run download --name storyboard-we-writes-b

# locally
cd video && npm install
npx remotion still src/index.ts WeWritesB storyboards/we-writes/b/02-spec.png \
  --frame=145 \
  --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```
