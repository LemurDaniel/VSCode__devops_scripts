const vscode = require('vscode')
const output = require('../output')

const ProjectView = require('../projectView')
const Pipeline = require('../data/pipeline')


const commandName = 'resource.remove'
async function command(context) {

    output.appendLine(`Invoked command '${commandName}' with '${context?.constructor?.name}'`)
    if (null == context) return


    try {

        if (context instanceof Pipeline.Build) {

            // Note: Removes build only from view, not from DevOps.
            context.showInTreeView = false
            ProjectView.instance.refresh()

        }

    } catch (exception) {
        vscode.window.showErrorMessage(exception.message)
    }

}


module.exports = vscode.commands.registerCommand(`devopsscripts.${commandName}`, command)