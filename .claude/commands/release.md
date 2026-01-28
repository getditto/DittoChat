---
argument-hint: [tag|revision-range|latest]
description: Generate DittoChat SDK release notes from git commits or tags, and create changeset for NPM packages
---

# DittoChat Release Notes & Changeset Command

Generate comprehensive release notes for DittoChat SDK releases by analyzing git history, then create the changeset file for NPM publishing.

## Context

This repository has two NPM packages (JavaScript/TypeScript only):

- `@dittolive/ditto-chat-core` (located at `sdks/js/ditto-chat-core/`)
- `@dittolive/ditto-chat-ui` (located at `sdks/js/ditto-chat-ui/`)

This command uses Changesets for automated NPM package versioning and publishing.

---

## Parsing the Argument: $1

The command accepts three input formats:

### 1. Specific Package Tag (e.g., `@dittolive/ditto-chat-ui@0.1.2`)

- Use `git show <tag>` to get the commit SHA
- Find the previous tag for the same package using:
  ```bash
  git tag -l "@dittolive/ditto-chat-ui@*" --sort=-version:refname | head -n 2
  ```
- Build revision range: `<previous-tag>...<current-tag>`

### 2. Git Revision Range (e.g., `abc123...def456`)

- Validate that both commits exist with `git rev-parse`
- Use the range directly
- Build GitHub compare URL: `https://github.com/getditto/DittoChat/compare/<range>`

### 3. "latest" or No Argument

- Find the most recent merged "Version Packages" PR or check recent commits on main
- Use `git log` to find commits since last release tags
- For each package with changes, determine the affected range

---

## Step 1: Reading Commits and Gathering Context

### Extract Commits in Reverse Order (Oldest First)

```bash
git log --oneline --reverse --format="%h|||%s|||%an|||%ae" <revision-range>
```

### Gather Author Information

- Collect unique authors (full name, email)
- Create a list for acknowledgments (alphabetically sorted)

### Check for Changesets (if applicable)

```bash
git log <revision-range> --name-only --format="commit: %H" | grep ".changeset"
```

- If changesets exist in the range, read them for context
- Use changeset descriptions as additional source material

### Extract PR References

```bash
git log <revision-range> --format="%h %s" | grep -oE "#[0-9]+"
```

- Note PR numbers for reference
- Can use `gh pr view <number>` for additional context if needed

### Determine Which Packages Are Affected

- Check if commits modified files in `sdks/js/ditto-chat-core/`
- Check if commits modified files in `sdks/js/ditto-chat-ui/`
- Determine if this is a single-package or dual-package release

---

## Step 2: Change Categories

Classify each commit into EXACTLY ONE category. Categories are package-specific:

### For `@dittolive/ditto-chat-core` changes:

- **Core Functionality** - Chat operations, message handling, room management
- **State Management** - Store updates, data synchronization
- **Presence & Typing** - User status, typing indicators
- **Reactions & Mentions** - Emoji reactions, @mentions
- **Attachments** - File handling, image uploads
- **RBAC & Permissions** - Access control, authorization
- **API Changes** - Hook signatures, export changes (note if breaking)
- **Performance** - Optimization, efficiency improvements
- **Bug Fixes** - Defect resolutions
- **Types & Interfaces** - TypeScript type updates
- **Tests** - Test additions or modifications
- **Documentation** - README, comments, JSDoc updates
- **Dependencies** - Dependency updates
- **Internal/Refactoring** - Non-user-facing changes

### For `@dittolive/ditto-chat-ui` changes:

- **UI Components** - New or updated React components
- **Styling & Theming** - CSS, Tailwind, theme customization
- **Layout & Responsive** - Layout changes, mobile optimization
- **Accessibility** - A11y improvements, ARIA labels
- **User Interactions** - Click handlers, keyboard nav, gestures
- **Visual Feedback** - Loading states, animations, transitions
- **Dark Mode** - Dark mode specific changes
- **API Changes** - Component props, exports (note if breaking)
- **Bug Fixes** - UI defect resolutions
- **Dependencies** - UI dependency updates (Radix, React, etc.)
- **Tests** - Component tests
- **Documentation** - Storybook, component docs
- **Internal/Refactoring** - Non-user-facing changes

**CRITICAL RULES**:

- Each commit goes to EXACTLY ONE category
- Breaking changes MUST be marked with "BREAKING:" prefix
- If a commit affects both packages, mention both contexts but categorize based on primary impact

---

## Step 3: Writing Change Entries

For each commit, generate a change entry following these rules:

1. **Strip Conventional Commit Prefixes** - Remove `feat:`, `fix:`, `chore:`, `docs:`, etc.
2. **Use Consistent Tense** - Past tense ("Added", "Fixed", "Updated", "Refactored")
3. **Be Specific** - Mention the component/hook/feature affected
4. **Keep It Concise** - One sentence per change
5. **Include PR Reference** - Add `(#123)` if PR number is available
6. **Highlight Breaking Changes** - Prefix with "BREAKING:" if applicable
7. **Edit for Clarity** - If commit message is unclear, check commit contents or PR for context
8. **Never Hallucinate** - If you can't determine what a commit does, ask the user for clarification

**Good Examples**:

- "Fixed attachment rendering error on initial load (#95)"
- "BREAKING: Updated `useDittoChat` hook signature to accept config object"
- "Added Radix UI components for dialogs and dropdowns"
- "Refactored theme provider for better reusability (#105)"

**Bad Examples**:

- "chore: update stuff" (too vague, has prefix)
- "Fixed bug" (not specific enough)
- "Changes" (meaningless)

---

## Step 4: Generate Release Notes

### For Single Package Release:

```markdown
# Release Notes: <package-name> v<version>

**Release Date**: <date>
**Compare**: https://github.com/getditto/DittoChat/compare/<range>

## Summary

<1-2 sentence overview of the release - what's the main theme or goal?>

## Changes

### <Category 1>

- Change entry 1 (#PR)
- Change entry 2

### <Category 2>

- Change entry 1 (#PR)

## Contributors

Thank you to the following contributors:

- @username (Full Name)
- @username2 (Full Name)

## Installation

\`\`\`bash
npm install <package-name>@<version>
\`\`\`

---

📦 Generated with Claude Code
```

### For Multi-Package Release:

```markdown
# Release Notes: DittoChat SDK

**Release Date**: <date>

## @dittolive/ditto-chat-core v<version>

**Compare**: https://github.com/getditto/DittoChat/compare/<range>

### Summary

<1-2 sentence overview>

### Changes

#### <Category>

- Change 1
- Change 2

---

## @dittolive/ditto-chat-ui v<version>

**Compare**: https://github.com/getditto/DittoChat/compare/<range>

### Summary

<1-2 sentence overview>

### Changes

#### <Category>

- Change 1
- Change 2

---

## Contributors

Thank you to all contributors:

- @username (Full Name)
- @username2 (Full Name)

## Installation

\`\`\`bash
npm install @dittolive/ditto-chat-core@<version>
npm install @dittolive/ditto-chat-ui@<version>
\`\`\`

---

📦 Generated with Claude Code
```

Present the release notes in a code block for easy copying.

---

## Step 5: Create the Changeset File

After generating and presenting the release notes, create the changeset:

1. **Ask for confirmation on the version bump type**:
   - Based on the analysis, suggest the bump type (patch/minor/major)
   - "patch" (0.1.2 → 0.1.3) - Bug fixes, small changes
   - "minor" (0.1.2 → 0.2.0) - New features, non-breaking changes
   - "major" (0.1.2 → 1.0.0) - Breaking changes
   - If there are ANY breaking changes, it MUST be major

2. **Generate the changeset filename**:
   - Use random two-word format (adjective-noun-verb pattern)
   - Example: `fluffy-sites-remain.md`, `modern-dragons-sink.md`

3. **Create the changeset file** in `.changeset/` directory:

For single package:

```markdown
---
'@dittolive/ditto-chat-core': minor
---

<Use the summary from release notes, or a concise version>
```

For both packages:

```markdown
---
'@dittolive/ditto-chat-core': minor
'@dittolive/ditto-chat-ui': minor
---

<Use the summary from release notes, or a concise version>
```

4. **Confirm creation**:

```
✅ Changeset created at .changeset/<filename>.md
```

---

## Step 6: Next Steps

After creating the changeset, provide these instructions:

```
Next steps:
1. Review the release notes above and edit if needed
2. Commit the changeset file with your code changes
3. Create/update your PR with both code changes and the changeset
4. After PR merges to main, GitHub Actions will auto-create a "Version Packages" PR
5. Review and merge the "Version Packages" PR to publish to NPM
6. Create a GitHub Release with the release notes above
```

**Optional Actions**:

- Offer to save release notes to a file (e.g., `RELEASE_NOTES_v<version>.md`)
- Suggest posting to relevant Slack channels (if applicable)

---

## Error Handling

- **If tag doesn't exist**: List recent tags with `git tag -l --sort=-version:refname | head -20` and ask for clarification
- **If range is invalid**: Suggest using `git log --oneline -20` to find commits
- **If no commits in range**: Inform user and exit gracefully
- **If unable to categorize a commit**: Ask user for guidance on that specific commit
- **If both packages affected but unclear which**: Ask user to clarify

---

## Important Notes

- **JavaScript/NPM Only** - This command only affects the two JavaScript packages, not other parts of the repo
- **No Hallucination** - If something is unclear, ASK rather than guessing
- **Breaking Changes Critical** - Always highlight and clearly mark breaking changes
- **One Commit = One Category** - Never duplicate entries across categories
- **Consistent Voice** - Maintain past tense throughout all entries
- **Leverage Changesets** - If changesets already exist in the range, use them as primary source

---

Now proceed with analyzing the git history and generating release notes for the user.
