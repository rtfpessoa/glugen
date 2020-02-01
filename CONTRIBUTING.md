# How to contribute to glugen

## Guidelines

- Before you open a ticket or send a pull request, [search](https://github.com/rtfpessoa/glugen/issues) for previous
  discussions about the same feature or issue. Add to the earlier ticket if you find one.

- If you're proposing a new feature, make sure you create an issue to let other contributors know what you are working
  on.

- Before sending a pull request for a feature, be sure to check code against static analysis with `yarn lint:check`.

- Before sending a pull request make sure your code is tested.

- Before sending a pull request for a feature, be sure to test code with `yarn test`.

- Use the same coding style as the rest of the codebase with `yarn run format:check`.

- Use `git rebase` (not `git merge`) to sync your work from time to time with the master branch.

- After creating your pull request make sure the build is passing on
  [CircleCI](https://circleci.com/gh/rtfpessoa/glugen) and that [Codacy](https://www.codacy.com/app/Codacy/glugen) is
  also confident in the code quality.

## Commit Style

### Goals

- Provide relevant information when browsing the history
- Allow filtering relevant commits
- Provide a common specification for all developers
- Allow automatic changelog generation

### Rules

1. Use the imperative mood in the subject line
2. Separate subject from body with a blank line
3. Limit the subject line to 50 characters
4. Capitalize the subject line
5. Do not end the subject line with a period
6. Use the body to explain what and why vs. how

### Format

**Parts**

- `<Type>`
  - fix (fixing bugs)
  - hotfix (fixing bugs directly on production code)
  - doc (adding or maintaining documentation)
  - style (formatting, missing semi colons, ...)
  - clean (refactoring current code)
  - test (adding missing tests)
  - feature (new feature)
  - bump (update library version)
- `<VersionScope> (Optional)`
  - :breaking:
  - :feature:
- `<Body> (Optional)`

**Structure**

```txt
<Type> <Subject> [VersionScope]
[Blank Line]
[Body]
```

**Example**

```txt
feature: Add connection pool to database :breaking:

Use HikaryCP to create a connection pool for accessing the database
* Increase minimum connections to 10 to allow more concurrency
```

## Developer's Certificate of Origin 1.0

By making a contribution to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source
  license indicated in the file; or
- (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate
  open source license and I have the right under that license to submit that work with modifications, whether created in
  whole or in part by me, under the same open source license (unless I am permitted to submit under a different
  license), as indicated in the file; or
- (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not
  modified it.
