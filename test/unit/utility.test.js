const assert = require('assert')
const utility = require('../../lib/utils/utility')

suite('utility.execute', () => {

    test('resolves with stdout', async () => {
        const result = await utility.execute(process.execPath, ['-e', 'console.log("hello")'])
        assert.strictEqual(result.trim(), 'hello')
    })

    test('writing to stderr alone is not a failure', async () => {
        const result = await utility.execute(process.execPath, ['-e', 'console.error("progress"); console.log("done")'])
        assert.strictEqual(result.trim(), 'done')
    })

    test('rejects on a non-zero exit code with the stderr text', async () => {
        await assert.rejects(
            utility.execute(process.execPath, ['-e', 'console.error("fatal: broken"); process.exit(2)']),
            error => error instanceof Error && error.message === 'fatal: broken'
        )
    })

    test('uses the given working directory', async () => {
        const result = await utility.execute(process.execPath, ['-e', 'console.log(process.cwd())'], __dirname)
        assert.strictEqual(result.trim(), __dirname)
    })

    test('does not interpret arguments as shell code', async () => {
        const malicious = 'x" & echo injected & "'
        const result = await utility.execute(process.execPath, ['-e', 'console.log(process.argv[1])', malicious])
        assert.strictEqual(result.trim(), malicious)
    })

})

suite('utility.groupSimilar', () => {

    test('groups values sharing a prefix', () => {
        const values = ['api-users', 'api-orders', 'api-auth', 'api-billing', 'web-app']
        const groupings = utility.groupSimilar(values, 4, 4)

        assert.deepStrictEqual(Object.keys(groupings.grouped), ['api'])
        assert.deepStrictEqual(groupings.grouped.api, ['api-users', 'api-orders', 'api-auth', 'api-billing'])
        assert.deepStrictEqual(groupings.ungrouped, ['web-app'])
        assert.strictEqual(groupings.groupCount, 1)
    })

    test('does not group below the minimum group size', () => {
        const values = ['api-users', 'api-orders', 'web-app']
        const groupings = utility.groupSimilar(values, 4, 4)

        assert.strictEqual(groupings.groupCount, 0)
        assert.deepStrictEqual(groupings.ungrouped, values)
    })

    test('resolves the name of objects with a property function', () => {
        const values = ['a', 'b', 'c', 'd'].map(suffix => ({ name: `infra-${suffix}` })).concat({ name: 'x' })
        const groupings = utility.groupSimilar(values, 4, 4, value => value.name)

        assert.strictEqual(groupings.grouped.infra.length, 4)
        assert.deepStrictEqual(groupings.ungrouped, [{ name: 'x' }])
    })

    test('handles an empty list', () => {
        const groupings = utility.groupSimilar([], 4, 4)

        assert.strictEqual(groupings.groupCount, 0)
        assert.deepStrictEqual(groupings.ungrouped, [])
    })

})
