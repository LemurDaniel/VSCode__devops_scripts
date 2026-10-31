# Change Log

All notable changes to the "devopsscripts" extension will be documented in this file.

The format follows [Keep a Changelog](http://keepachangelog.com/), versions follow [Semantic Versioning](https://semver.org/) (while below 1.0.0, minor/patch bumps may include breaking changes).

## [1.0.4]

### Security

- All `npm audit` findings resolved (0 vulnerabilities).
- Dev dependencies upgraded: `eslint` 8 → 10, `mocha` 10 → 12, `glob` 8 → 14.
- `overrides` pin transitive `minimatch` to ^11.0.3 and mocha's `glob` to the root version.
- ESLint config migrated from `.eslintrc.json` to flat config (`eslint.config.js`).
- Test runner uses the promise API of `glob`; `@types/glob` removed (glob ships its own types).

### Changed

- Dependency `@types/vscode` updated from 1.140.0 to 1.144.0.
- Dependency `webpack` updated from 5.112.0 to 5.112.2.
- Transitive dependencies updated (`package-lock.json`).

## [1.0.3]

### Changed

- The banner in the README is now marked as AI-generated artwork.

## [1.0.2]

### Added

- Own extension icon and a monochrome activity bar icon that follows the VSCode theme.
- README with banner, badges and a feedback section.
- Releases are now also created on GitHub (with the `.vsix` attached) by the publish pipeline.

### Changed

- The Microsoft Azure DevOps logo was replaced by an own icon.

## [1.0.1]

### Fixed

- Re-release of 1.0.0: the Marketplace CDN answered CORS preflight requests for the 1.0.0 assets with HTTP 500, so the extension details page failed to load in VSCode.

## [1.0.0]

### Added

- Recent builds of a pipeline are shown, also when they were not started from VSCode (setting `devops.recent_builds_count`).
- Build entries show who requested the build and further details in a tooltip.

### Changed

- Creating and merging Pull Requests was removed from the extension, use Azure DevOps for that.
- Far fewer API requests: the signed-in user is loaded once instead of on every request, pipelines are loaded with one request and pull requests with one request per project.
- Failed requests show the error message of Azure DevOps instead of hanging or failing silently.
- The extension is shipped as a bundle, the package is about ten times smaller.
- Commands that need a tree item are hidden from the command palette.

### Fixed

- Login: the interactive sign-in was not triggered, and requests could hang on unparsable responses.
- Missing default for the selected organization.
- Running builds had no cancel button and cancelling builds were not updated.
- Opening a repository that is not downloaded yet failed.
- Cancelling a selection no longer shows error messages.
- Git commands no longer run through a shell, names with special characters can not inject commands anymore, and git output on stderr is no longer treated as an error.
- Avatars that can not be loaded no longer remove the project from the tree.
- Cache files for projects or repositories with special characters in their name, and corrupt cache files.

### Internal

- Unit tests (`npm run test:unit`), lint is clean, the publish workflow lints and tests before publishing.
- Removed dead code and updated the development tooling.

## [0.0.6]

- Fixed errors on login button.

## [0.0.5]

- Added login button, to force new login prompt.
- Fixed ui-buttons on pipeline builds not appearing correctly for each state.

## [0.0.4]

- Fix errors on switching branches in repository view
- Abillity to remove finished builds from tree view

## [0.0.3]

- Only create Projectfolders when downloading repositories
  
## [0.0.2]

- Setting not showing up

## [0.0.1]

- Initial release