const assert = require('assert')
const Folder = require('../../lib/utils/Folder')

suite('Folder', () => {

    test('groups elements by path', () => {
        const pipelines = [
            { name: 'root-pipeline', folder: '\\' },
            { name: 'build', folder: '\\Team\\Build' },
            { name: 'deploy', folder: '/Team/Deploy' },
            { name: 'team-wide', folder: '\\Team' }
        ]

        const root = Folder.group(pipelines, pipeline => pipeline.folder)

        assert.deepStrictEqual(root.content.map(p => p.name), ['root-pipeline'])
        assert.deepStrictEqual(root.folders.map(folder => folder.name), ['Team'])

        const team = root.folders[0]
        assert.deepStrictEqual(team.content.map(p => p.name), ['team-wide'])
        assert.deepStrictEqual(team.folders.map(folder => folder.name), ['Build', 'Deploy'])
        assert.deepStrictEqual(team.folders[0].content.map(p => p.name), ['build'])
        assert.deepStrictEqual(team.folders[1].content.map(p => p.name), ['deploy'])
    })

    test('lists folders before content', () => {
        const root = Folder.group([{ id: 1, folder: '/A' }, { id: 2, folder: '/' }], element => element.folder)

        assert.strictEqual(root.all.length, 2)
        assert.ok(root.all[0] instanceof Folder)
        assert.deepStrictEqual(root.all[1], { id: 2, folder: '/' })
    })

    test('keeps properties and content passed to the constructor', () => {
        const folder = new Folder('Pipelines', ['a', 'b'], { contextValue: 'PipelinesFolderContext' })

        assert.strictEqual(folder.name, 'Pipelines')
        assert.deepStrictEqual(folder.content, ['a', 'b'])
        assert.strictEqual(folder.properties.contextValue, 'PipelinesFolderContext')
    })

})
