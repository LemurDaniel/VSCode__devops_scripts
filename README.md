> 🤖 **AI Notice:** Originally written by hand, with love, sweat and an unreasonable amount of `console.log`. Resurrected in 2026 with the help of an AI, which fixed the bugs, deleted the dead code and politely refused to judge the original variable names.

# Azure DevOps Overview

VSCode integrated overview for managing projects, pipelines and repositories in Azure DevOps:

![project-selection](.img/select-projects.png)

![treeview-sample-1](.img/treeview-sample-1.png)

## Features

- **Projects:** browse all projects of an organization and choose which ones are shown.
- **Pipelines:** start a pipeline on one or more branches, cancel running builds, enable, disable or pause a pipeline and open it in the browser.
- **Builds:** see the recent builds of every pipeline with their status, also when they were not started from VSCode.
- **Repositories:** download (clone) and open repositories, create new ones, and browse the files and branches of a downloaded repository. Repositories with a common name prefix are grouped.
- **Pull requests:** see the active pull requests per repository, rename them and open them in the browser. Creating and merging is done in Azure DevOps.

## Getting started

1. Open the **DevOps Scripts** view in the activity bar.
2. Sign in with your Microsoft account when asked, or use the sign-in button in the view title.
3. Select an organization and the projects you want to see.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `devops.custom_project_path` | `{{HOME_DIR}}/git/repos/` | Folder where repositories are downloaded, as `<path>/<ORGANIZATION>/<project>/<repository>`. |
| `devops.set_local_git_user` | `false` | Set the local git user of downloaded repositories to the signed-in DevOps user. |
| `devops.recent_builds_count` | `5` | Number of recent builds shown per pipeline. |

## Development

```
npm install
npm run lint
npm run test:unit
```

Press `F5` to start the extension in a new window. The extension runs from the bundle in `dist/`, the launch configuration builds it first. `npm run package` creates the production bundle, `npx @vscode/vsce package` a `.vsix`.

Releases are published by the manually triggered *Node.js CI* workflow, which needs the secret `PUBLISH_PAT` (a Marketplace token).
