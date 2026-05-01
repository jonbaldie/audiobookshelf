# Upstream PR Conventions Research

## Research Date: 2026-05-01
## Repository: advplyr/audiobookshelf (https://github.com/advplyr/audiobookshelf)

---

## 1. PR Title Format

Based on analysis of ~20 recently merged PRs, the upstream uses a **descriptive sentence case** title format:

| PR # | Title | Type |
|------|-------|------|
| #5211 | "Add Japanese (ja) language and Japan podcast search region" | Feature |
| #5163 | "The timestamp in the share URL should override the saved position for the user." | Bugfix |
| #5160 | "Fix item_removed payload to include libraryId" | Bugfix |
| #5158 | "Emit proper author_updated/added events when updating book media" | Bugfix |
| #5063 | "IDOR fixes" | Bugfix |
| #5042 | "Fix OpenAPI spec description" | Bugfix |
| #5036 | "Improved subtitle parsing to account for bare colon in title" | Bugfix |
| #5073 | "Improve personalized/discover query performance and cache invalidation behavior" | Feature |
| #4960 | "feat: Add Audible series ASIN field to Series entity" | Feature |

**Patterns identified:**
- Use imperative/present tense ("Fix...", "Add...", "Improve...", "Emit...")
- No `feat:` or `fix:` prefixes required by convention (used sparingly, e.g. #4960 used `feat:`)
- Sentence case preferred over Title Case
- Action-based first word describing what changed
- No issue number in title (issue linked in description or via GitHub "closes" keyword)

---

## 2. PR Description Format

The project has a `.github/pull_request_template.md` that auto-populates new PRs with sections:

```
Brief summary

Which issue is fixed?

In-depth Description

How have you tested this?

Screenshots
```

**Key observations from merged PRs:**
- All well-formed PRs use this template format (#5211, #5163, #5160, #5158, #5063, #5042, #5036)
- "Brief summary" provides a 1-2 sentence overview
- "Which issue is fixed?" - Explicitly state issue number via "Fixes #XXXX" or "No issue"
- "In-depth Description" explains the technical approach and why
- "How have you tested this?" - Manual steps, test commands (`npm test`), or test scenarios
- "Screenshots" section included when UI changes are present (#5211 included language dropdown screenshots)

**Exception noted:** PR #5096 was an AI-generated PR that was closed without merge. It did not follow the template properly and was explicitly rejected by maintainers with: *"We are not reviewing AI generated PRs due to an increasing number of low-quality PRs being opened and limited reviewer time."*

---

## 3. Commit Message Style

Commit messages generally mirror PR titles, but with more detail:

| PR | Commit Message Pattern |
|----|----------------------|
| #5211 | "Add Japanese language and Japan podcast search region" |
| #5163 | "updates to allow share t argument to over-ride server stored position" (initial) + "ShareController check ?t param is less than duration, revert frontend..." (fixup) |
| #5160 | "Fix item_removed payload to include libraryId" |
| #5063 | "Fix IDOR bugs" + "Move file to correct folder..." + "Auto format" |
| #5073 | "Improve API cache invalidation for high-churn models" + "Speed up personalized shelves and reduce search payload size" + "Add database indexes for discover query performance" |
| #5042 | "Fix OpenAPI spec description" |
| #5036 | "Improved subtitle parsing to account for bare colon in title" |

**Patterns:**
- Imperative mood
- First line is a concise summary < 72 chars
- Subsequent commits often iteratively refine the PR (e.g., #5163 had a fixup commit after maintainer feedback)
- No strict enforcement of conventional commits (no `type(scope):` format required)
- Fixup commits acceptable during review; they are squashed on merge

---

## 4. Branch Naming

**Upstream convention:** Contributors typically create branches from their own forks (e.g., `pjkottke/audiobookshelf:master` or `mikiher/audiobookshelf:fix-item-removed-payload`).

From PR data, branch names in contributor forks follow these patterns:

| PR # | Branch Name | Pattern |
|------|------------|---------|
| #5211 | `add-i18n-japanese` | descriptive-hyphenated |
| #5160 | `fix-item-removed-payload` | fix-<description> |
| #5158 | `book-update-author-events` | descriptive-hyphenated |
| #5063 | `idor-fixes` | descriptive-hyphenated |
| #5073 | `perf/minimal-upstream-patchset` | topic/subtopic |
| #5042 | `open-api-spec-fixes` | descriptive-hyphenated |
| #4960 | `feat/series-audible-asin` | feat/<description> |

**Recommendation:** Use short, descriptive, hyphenated branch names. Prefix with `fix/` or `feat/` is optional but nice.

---

## 5. Test Requirements

**Critical finding:** The project does NOT appear to require test files for every PR. Tests are encouraged but not enforced by CI.

- PR #5211 (i18n): No code tests, only manual testing described
- PR #5163 (share URL fix): Author ran `npm test` and described manual testing steps
- PR #5160 (event payload fix): Manual testing only (multi-window verification)
- PR #5158 (author events): Extensive manual testing described (two browser windows)
- PR #5063 (security IDOR fix): Unit tests added as part of the PR
- PR #5073 (performance): Existing tests + manual load testing + migration verification
- PR #5042 (OpenAPI fix): No tests (tiny documentation change)
- PR #5036 (parsing): Expressed "All existing + new unit tests pass"

**Pattern:** If a PR touches core logic, adding relevant unit tests (in `test/server/`) is expected and well-received. Manual testing steps in the PR description are standard.

---

## 6. Feature vs Bug-fix Handling

**Bug fixes:**
- Often smaller, more focused PRs (1-3 commits, < 10 files changed)
- Target `master` branch directly
- Issue linking optional but "Which issue is fixed?" still answered (even if "No issue")
- Merge turnaround varies from same-day to weeks depending on maintainer availability

**Features:**
- Typically larger PRs with more discussion (#4960 had extensive back-and-forth with maintainer `nichwall`)
- Maintainers may request scope reduction (#5073 had a maintainer request to remove search payload changes to preserve API compatibility)
- Features require clearer justification ("Why would this be helpful?") but through issues rather than PR template
- Branch naming sometimes uses `feat/` prefix

**Key maintainer behavior:**
- Maintainers (advplyr, nichwall) prefer focused, single-concern PRs
- Large PRs may be asked to split (#5073 search payload changes were separated out after feedback)
- "Thanks!" is the typical maintainer merge comment - minimal ceremony
- No squash-merge indicator; merge commits appear in history

---

## 7. Changelog Process

**There is no `CHANGELOG.md` or `CONTRIBUTING.md` file in the repository.**

Changelog entries are compiled manually for GitHub Releases by the maintainer:
- Each release (e.g., v2.34.0, v2.33.0) has a structured GitHub release note
- Sections: "Added", "Fixed", "Changed", "Internal", "New Contributors"
- PR authors are credited by username with "by @username in #PR"
- Version bumping is done by the maintainer on release date (not in contributor PRs)

**Implication:** Contributors do NOT need to update any changelog file. The maintainer handles release notes.

---

## 8. Recommended Approach for Our 5 Upstream PRs

The 5 PRs we need to submit upstream are already committed in our repo (or represent planned work). Based on upstream conventions, here is the recommended approach for each:

### 1. JWT access token blacklist on logout
- **Nature:** Security feature
- **Suggested title:** "Add JWT access token blacklist on logout"
- **Branch name:** `fix/jwt-blacklist-logout` or `feat/jwt-blacklist`
- **Description:** Follow PR template. Reference any existing issue if one exists. Include test notes (manual logout flow verification). If unit tests exist, mention them.
- **Risk:** Security features get careful review. Ensure implementation is minimal, focused, and includes test coverage.

### 2. OpenID subfolder support for logout redirect URI
- **Nature:** Bug fix (subfolder users broken logout)
- **Suggested title:** "Fix OpenID logout redirect URI for subfolder deployments"
- **Branch name:** `fix/openid-subfolder-logout`
- **Description:** Brief summary + test steps (deploy with and without subfolder). This is a narrow fix - likely fast to review.
- **Risk:** Low. Narrow scope, affects only subfolder-authenticated users.

### 3. guard SlowBuffer access for Node.js v25+ compatibility (buffer-equal-constant-time)
- **Nature:** Compatibility fix
- **Suggested title:** "Fix buffer-equal-constant-time for Node.js v25+ compatibility"
- **Branch name:** `fix/node-25-buffer-compat`
- **Description:** Explain the Node.js deprecation/removal. Reference upstream `buffer-equal-constant-time` issue if any. Minimal change expected.
- **Risk:** Low. Pure compatibility fix.

### 4. getOldMediaProgress
- **Nature:** Feature or fix (needs context from epic)
- **Suggested title:** Depends on purpose; likely "Add getOldMediaProgress migration utility" or "Fix media progress handling for old data"
- **Branch name:** `fix/get-old-media-progress` or `feat/migrate-old-progress`
- **Description:** This PR needs to be scoped carefully. Check if there is an upstream issue already filed.

### 5. Smart Speed
- **Nature:** Feature (player enhancement)
- **Suggested title:** "Add Smart Speed playback feature" or "Add variable speed playback controls"
- **Branch name:** `feat/smart-speed-playback`
- **Description:** This is likely the largest of the 5. Based on upstream patterns, large features get more scrutiny. Prepare:
  - Clear use-case explanation
  - Manual testing notes across web and mobile clients
  - Screenshots of UI changes
  - Consider breaking into smaller PRs if it touches many files
- **Risk:** Medium-high. Player features affect UX significantly.

### General Strategy for All 5 PRs
1. **Open an issue before the PR** unless one obviously exists. The upstream community/maintainer seems to prefer issue-first for features and non-obvious bugs.
2. **Fork** from `advplyr/audiobookshelf:master`, create branch, push to your fork, open PR.
3. **Use the PR template** (Brief summary, Which issue is fixed?, In-depth Description, How have you tested this?, Screenshots).
4. **Keep PRs small and focused.** Do not bundle unrelated changes.
5. **Do NOT version bump.** The maintainer handles releases.
6. **Do NOT add to changelog.** The maintainer handles release notes.
7. **Run `npm test`** before submission and mention it.
8. **Be patient.** Merge times vary widely (same-day to multiple weeks). "Thanks!" is the standard maintainer ack.
9. **Do NOT use AI-generated PR language.** PR #5096 was explicitly closed for being AI-generated.
10. **Rebase on upstream master** before final submission to keep history clean.

---

## References

- PR #5211 - https://github.com/advplyr/audiobookshelf/pull/5211
- PR #5163 - https://github.com/advplyr/audiobookshelf/pull/5163
- PR #5160 - https://github.com/advplyr/audiobookshelf/pull/5160
- PR #5158 - https://github.com/advplyr/audiobookshelf/pull/5158
- PR #5063 - https://github.com/advplyr/audiobookshelf/pull/5063
- PR #5042 - https://github.com/advplyr/audiobookshelf/pull/5042
- PR #5036 - https://github.com/advplyr/audiobookshelf/pull/5036
- PR #5073 - https://github.com/advplyr/audiobookshelf/pull/5073
- PR #4960 - https://github.com/advplyr/audiobookshelf/pull/4960
- PR #5096 - https://github.com/advplyr/audiobookshelf/pull/5096 (rejected AI PR)
- PR Template - https://github.com/advplyr/audiobookshelf/blob/master/.github/pull_request_template.md
- Issue Templates - https://github.com/advplyr/audiobookshelf/tree/master/.github/ISSUE_TEMPLATE
- Release v2.34.0 - https://github.com/advplyr/audiobookshelf/releases/tag/v2.34.0
- Release v2.33.0 - https://github.com/advplyr/audiobookshelf/releases/tag/v2.33.0
