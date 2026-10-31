// Writes the dependency updates between two package-lock.json files
// into the [Unreleased] section of CHANGELOG.md.
// Usage: node changelog-dependencies.js <old-lock> <new-lock> <changelog>

const fs = require('fs')

const [oldLockPath, newLockPath, changelogPath] = process.argv.slice(2)
const UNRELEASED = '## [Unreleased]'
const TRANSITIVE = '- Transitive dependencies updated (`package-lock.json`).'

const oldLock = JSON.parse(fs.readFileSync(oldLockPath, 'utf8'))
const newLock = JSON.parse(fs.readFileSync(newLockPath, 'utf8'))
const direct = Object.keys({
    ...newLock.packages[''].dependencies,
    ...newLock.packages[''].devDependencies
})

const versionOf = (lock, name) => lock.packages[`node_modules/${name}`]?.version
const updates = direct
    .map(name => ({ name, from: versionOf(oldLock, name), to: versionOf(newLock, name) }))
    .filter(update => update.from !== update.to)

const transitiveChanged = Object.keys(newLock.packages)
    .filter(path => !direct.some(name => path === `node_modules/${name}`))
    .some(path => oldLock.packages[path]?.version !== newLock.packages[path].version)

if (updates.length === 0 && !transitiveChanged) {
    console.log('No dependency changes.')
    process.exit(0)
}

const lines = fs.readFileSync(changelogPath, 'utf8').split('\n')

// Create [Unreleased] above the latest release if it does not exist yet.
let start = lines.indexOf(UNRELEASED)
if (start === -1) {
    start = lines.findIndex(line => line.startsWith('## ['))
    if (start === -1)
        start = lines.length
    lines.splice(start, 0, UNRELEASED, '', '### Changed', '')
}

let end = lines.findIndex((line, index) => index > start && line.startsWith('## ['))
if (end === -1)
    end = lines.length

// Find or create '### Changed' inside [Unreleased].
let changed = lines.findIndex((line, index) => index > start && index < end && line === '### Changed')
if (changed === -1) {
    lines.splice(start + 1, 0, '', '### Changed')
    changed = start + 2
    end += 2
}

let sectionEnd = lines.findIndex((line, index) => index > changed && (index >= end || line.startsWith('### ')))
if (sectionEnd === -1 || sectionEnd > end)
    sectionEnd = end

const section = lines.slice(changed + 1, sectionEnd).filter(line => line.trim() !== '' && line !== TRANSITIVE)
const hadTransitive = lines.slice(changed + 1, sectionEnd).includes(TRANSITIVE)

for (const { name, from, to } of updates) {
    const prefix = `- Dependency \`${name}\` updated from `
    const existing = section.findIndex(line => line.startsWith(prefix))
    if (existing === -1) {
        section.push(`${prefix}${from ?? 'none'} to ${to}.`)
        continue
    }
    // Keep the version of the last release, only move the target version.
    const previousFrom = section[existing].slice(prefix.length).split(' to ')[0]
    section[existing] = `${prefix}${previousFrom} to ${to}.`
}

if (transitiveChanged || hadTransitive)
    section.push(TRANSITIVE)

lines.splice(changed + 1, sectionEnd - changed - 1, '', ...section, '')
fs.writeFileSync(changelogPath, lines.join('\n'))

updates.forEach(({ name, from, to }) => console.log(`${name}: ${from} -> ${to}`))
