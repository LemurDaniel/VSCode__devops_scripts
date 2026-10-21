const vscode = require('vscode')
const output = require('../output')
const interaction = require('../utils/interaction')

const Pipeline = require('../data/pipeline')
const ProjectView = require('../projectView')

const commandName = __filename.split(/[/\\]+/).at(-1).replace('.js', '')
async function command(context) {

    output.appendLine(`Invoked command '${commandName}' with '${context?.constructor?.name}'`)
    if (null == context) return


    try {

        if (context instanceof Pipeline) {

            const repository = await context.project.getRepositoryById(context.repository?.id)
            if (null == repository)
                throw new Error(`Pipeline '${context.name}' is not linked to an Azure Repos repository of this project.`)

            const selected = await interaction.selectFromOptions(await repository.branchesRemote)
            if (null == selected) return

            for (const branch of selected) {
                await context.start(branch)
            }
            ProjectView.instance.refresh()

        } else {
            // TODO

        }

    } catch (exception) {
        vscode.window.showErrorMessage(exception.message)
    }

}


module.exports = vscode.commands.registerCommand(`devopsscripts.${commandName}`, command)