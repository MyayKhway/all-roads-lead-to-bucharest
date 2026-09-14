# Contributing

Thanks for working on this. This document covers how we branch, commit and
review. For getting the project installed and running, see the
[README](README.md).

---

## Before you start

Make sure the project runs on your machine first:

```bash
npm install
npm run dev
```

If that doesn't work, fix that before writing code — don't work around it.

### Editor setup

The repo ships its VS Code configuration, so most of this document is enforced
for you rather than remembered.

Open the folder in VS Code and accept the recommended extensions when prompted —
**Biome** is the one that matters. From then on, saving a file formats it and
organises its imports. Prettier and ESLint are explicitly disabled in the
workspace, so an extension you installed globally won't fight the project.

Every npm script is in the command palette under **Tasks: Run Task**, including
a **pre-push check** that runs lint and build together.

Set up the commit message template once, so the conventions below are in front
of you while you write:

```bash
git config commit.template .gitmessage
```

Not on VS Code? `.editorconfig` covers the basics, and `npm run format` does the
rest — just run it before you commit.

---

## Branch names describe the work, not the person

Name a branch after what it changes, so anyone can tell from `git branch -r`
what is in flight. Lowercase, hyphen-separated, optionally with a type prefix.

**Good:**

```
add-dijkstra-baseline
fix/camera-jump-on-reset
perf-metrics-panel
refactor/extract-heap-into-module
docs/explain-heuristic-units
```

**Not:**

```
linn          — says nothing about the work
kent-2        — same, with a number
my-branch     — same
test2         — same
fix           — fix what?
```

If several people are on one feature, the branch is still named after the
feature. Use `feature-name/sub-task` if you need to split it further.

---

## Keep commits small

One commit should do one thing, and its subject line should be able to say what
that thing is without an "and". A reviewer should be able to read the diff in a
sitting, and a bad commit should be revertable without taking unrelated work
down with it.

- **Split refactors from behaviour changes.** Renaming things in the same commit
  as changing what they do hides the real change inside the noise.
- **Commit as you finish each piece**, not all at once at the end.
- **If the subject needs "and"**, or the body becomes a list of unrelated
  points, it should have been more than one commit.

### Message format

Subject in the imperative mood, under ~72 characters, no trailing period:

```
Add Dijkstra as a baseline algorithm
Fix camera jump when resetting mid-animation
Extract node-expansion counter from astar
```

Not `added dijkstra`, `fixes`, `wip`, `update files`, or `asdf`.

If the change needs explaining, leave a blank line and write a body saying
**why**, not what — the diff already shows what:

```
Count node expansions separately from pops

The open set can hold the same city more than once, so counting pops
overstates the work done. Expansions only count cities actually closed,
which is what the textbook figures compare against.
```

### Splitting work you've already done

If you've built up a large uncommitted change, stage it in pieces rather than
committing it all together:

```bash
git add -p          # choose hunks interactively
git commit
```

---

## Code style

Formatting and linting are automated — don't argue with them, run them.

```bash
npm run format      # rewrite files to the project format
npm run lint        # check formatting and lint rules
```

[Biome](https://biomejs.dev) does both, and with the editor setup above it runs
on save. There is no ESLint or Prettier in this project — don't add one.

A few conventions the tooling can't enforce:

- **TypeScript is strict**, including `noUncheckedIndexedAccess`. Indexing an
  array or `Record` gives you `T | undefined`, so handle the missing case rather
  than reaching for `!`. `positionOf()` in `src/data/cities.ts` shows the
  pattern for city lookups.
- **Import from `src/` with the `@/` alias**, e.g. `import { cn } from '@/lib/cn'`.
- **Suppressing a lint rule needs a reason.** If a rule genuinely misfires, say
  why on the ignore comment so the next person doesn't have to re-derive it:
  ```tsx
  // biome-ignore lint/a11y/noStaticElementInteractions: <group> is a three.js object, not DOM
  ```
- **Positions are scene units, distances are kilometres.** `src/data/cities.ts`
  holds `[x, y, z]` layout coordinates spanning ~17 units; `src/data/graph.ts`
  holds real road distances of 70–211 km. Don't mix the two in one calculation
  without converting.

---

## Before you push

Both of these must pass clean:

```bash
npm run lint
npm run build
```

`build` runs the typechecker first, so a type error will stop it.

---

## Pull requests

```bash
git checkout main && git pull
git checkout -b descriptive-branch-name
# ... work, committing in small steps ...
npm run lint && npm run build
git push -u origin descriptive-branch-name
```

Then open a PR into `main`. GitHub will fill in a template with the checklist
below — work through it rather than deleting it.

- **Say what changed and why** in the description. Link an issue if there is one.
- **Include a screenshot or short clip** for anything that changes the UI.
- **Keep the PR focused.** If you noticed something unrelated along the way,
  open a separate branch for it.
- **Delete the branch once it's merged.**

---

## Merging

We rebase. On GitHub, **Rebase and merge** is the only button you'll see — squash
and merge commits are turned off on the repo, so there is nothing to choose.

The reason is the section above: commits here are meant to be small and to each
do one thing. Squashing a branch throws that away the moment it lands, and takes
per-commit `git revert` with it. Merge commits keep the commits but braid the
graph and add a `Merge pull request #12` for every branch. Rebasing keeps your
commits exactly as you wrote them and keeps `git log --oneline` readable as a
single sequence.

In the normal case this changes nothing about how you work: push the branch,
open the PR, click the button.

### When GitHub can't rebase for you

If `main` has moved underneath you in a way that conflicts, GitHub greys the
button out and you rebase locally:

```bash
git checkout main && git pull
git checkout your-branch
git rebase main
# ... resolve conflicts, then `git rebase --continue` for each one ...
npm run lint && npm run build
git push --force-with-lease
```

Use `--force-with-lease`, not `--force`. It refuses to push if someone else has
pushed to your branch in the meantime, which is the one case where a force-push
actually destroys someone's work.

### Tidying a branch before it lands

Because nothing gets squashed for you, a messy branch stays messy in the
history. If yours has a `fix typo` or a `wip` in it, clean it up before merging:

```bash
git rebase -i main     # squash, reword and reorder your own commits
```

Do this only on your own un-reviewed branch — rewriting commits someone has
already reviewed makes their approval hard to trust.

### After your PR merges

GitHub deletes the remote branch for you once the PR lands. Delete your local
copy too, and start anything new from a fresh `main`:

```bash
git checkout main
git pull
git branch -D add-dijkstra-baseline
```

That's `-D`, not `-d`, and it is not a warning you should worry about. Rebasing
replays your commits onto `main` as *new* commits with different hashes, so the
one sitting in your local branch is genuinely not an ancestor of `main` even
though its changes are now in there. `git branch -d` only knows how to compare
hashes, so it refuses. Check `git log origin/main` for your commit message
first if you want the reassurance, then use `-D`.

**Don't keep working on a branch that has already merged.** Your local copy
still has the pre-rebase commits, and pushing it recreates the deleted remote
branch without complaining — `git push` reports `* [new branch]`, not an error.
The PR you open from it will replay the already-merged commits on top of the new
work, and your reviewer gets to read them a second time. If the follow-up work
belongs on the same branch name, delete the branch as above and cut a new one
from `main`.

It's also worth telling Git to drop remote-tracking refs for branches that no
longer exist, so `git branch -r` reflects what's actually on GitHub:

```bash
git config fetch.prune true     # once, per clone
```

### Branches built on other branches

If your branch starts from another branch that hasn't merged yet, let the base
merge first, then move yours onto the updated `main`:

```bash
git checkout your-branch
git rebase --onto main old-base-branch
```

Without `--onto`, the base branch's commits get replayed a second time and you
end up reviewing them twice.

---

## Reviewing

- Anything that isn't a blocker, say so — mark it as a nit or a suggestion.
- Approving means you'd be comfortable owning the code. Ask if you're unsure.
- Pull the branch and run it before approving anything that touches the 3D scene
  or the pathfinding; those are hard to review from the diff alone.
