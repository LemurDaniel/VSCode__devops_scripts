require('./helpers/vscode')
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Project = require('../../lib/data/project')

suite('Project', () => {

    const originalHomedir = os.homedir
    let directory

    setup(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-project-'))
        os.homedir = () => directory
    })

    teardown(() => {
        os.homedir = originalHomedir
        Project.customPath = null
        fs.rmSync(directory, { recursive: true, force: true })
    })

    test('defaults to git/repos in the home directory', () => {
        assert.strictEqual(Project.defaultPath, path.join(directory, 'git', 'repos'))
    })

    test('replaces {{HOME_DIR}} and creates the custom path', () => {
        Project.customPath = '{{HOME_DIR}}/projects'

        assert.strictEqual(Project.customPath, `${directory}/projects`)
        assert.ok(fs.existsSync(Project.customPath))
    })

    test('an empty custom path is not created', () => {
        Project.customPath = ''
        assert.strictEqual(Project.customPath, '')
    })

    test('places the project below the organization in upper case', () => {
        const project = new Project({ id: '1', name: 'Proj' }, 'myorg')
        assert.strictEqual(project.path, path.join(directory, 'git', 'repos', 'MYORG', 'Proj'))
    })

    test('uses the custom path when set', () => {
        Project.customPath = path.join(directory, 'custom')
        const project = new Project({ id: '1', name: 'Proj' }, 'myorg')
        assert.strictEqual(project.path, path.join(directory, 'custom', 'MYORG', 'Proj'))
    })

    test('rejects an empty repository name', async () => {
        const project = new Project({ id: '1', name: 'Proj' }, 'myorg')
        await assert.rejects(project.createRepository(''), /Not a valid Repository Name/)
    })

})

suite('Project.getResources', () => {

    let project
    let calls

    class Resource {
        static async from(context, refresh, ttl) {
            calls.push({ context, refresh, ttl })
            return [`loaded ${calls.length}`]
        }
    }

    setup(() => {
        calls = []
        project = new Project({ id: '1', name: 'Proj' }, 'myorg')
    })

    test('loads once and serves later calls from memory', async () => {
        assert.deepStrictEqual(await project.getResources(Resource), ['loaded 1'])
        assert.deepStrictEqual(await project.getResources(Resource), ['loaded 1'])
        assert.strictEqual(calls.length, 1)
        assert.strictEqual(calls[0].context, project)
    })

    test('refresh reloads and passes the flag on', async () => {
        await project.getResources(Resource)
        assert.deepStrictEqual(await project.getResources(Resource, true), ['loaded 2'])
        assert.strictEqual(calls[1].refresh, true)
    })

    test('reloads after the ttl expired', async () => {
        await project.getResources(Resource, false, -1)
        await project.getResources(Resource, false, -1)
        assert.strictEqual(calls.length, 2)
    })

    test('keeps resources of different contexts apart', async () => {
        const repository = { id: 'repo' }
        await project.getResources(Resource)
        await project.getResources(Resource, false, 30, repository)
        await project.getResources(Resource, false, 30, repository)

        assert.strictEqual(calls.length, 2)
        assert.strictEqual(calls[1].context, repository)
    })

})
