const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Utilscache = require('../../lib/utils/utilscache')

suite('Utilscache', () => {

    let directory
    let cache

    setup(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-cache-'))
        cache = new Utilscache(directory)
    })

    teardown(() => {
        fs.rmSync(directory, { recursive: true, force: true })
    })

    test('returns null for unknown entries', async () => {
        assert.strictEqual(await cache.get(['org', 'projects', 'all']), null)
    })

    test('stores and returns data', async () => {
        await cache.set({ value: [1, 2] }, null, ['org', 'projects', 'all'])
        assert.deepStrictEqual(await cache.get(['org', 'projects', 'all']), { value: [1, 2] })
    })

    test('ignores empty identifiers when building the filename', () => {
        assert.strictEqual(path.basename(cache.path(['org', 'teams', 'A', null, null])), 'org.teams.A.json')
    })

    test('expired entries count as a miss', async () => {
        await cache.set('old', -1, ['org', 'old'])
        assert.strictEqual(await cache.get(['org', 'old']), null)
    })

    test('entries without ttl never expire', async () => {
        await cache.set('forever', null, ['org', 'forever'])
        assert.strictEqual(await cache.get(['org', 'forever']), 'forever')
    })

    test('replaces characters that are invalid in filenames', async () => {
        const identifiers = ['org', 'repositories', 'My: Proj/ect?']
        await cache.set('ok', null, identifiers)

        assert.deepStrictEqual(fs.readdirSync(directory), ['org.repositories.My_ Proj_ect_.json'])
        assert.strictEqual(await cache.get(identifiers), 'ok')
    })

    test('a corrupt cache file counts as a miss', async () => {
        fs.writeFileSync(cache.path(['org', 'broken']), '{not json')
        assert.strictEqual(await cache.get(['org', 'broken']), null)
    })

    test('deleting is idempotent', async () => {
        await cache.set('x', null, ['org', 'x'])
        await cache.del(['org', 'x'])
        await cache.del(['org', 'x'])
        assert.strictEqual(await cache.get(['org', 'x']), null)
    })

})
