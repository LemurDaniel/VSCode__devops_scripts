const vscode = require('vscode')
const output = require('../output')

const Project = require('../data/project')
const ProjectView = require('../projectView')

const commandName = 'organization.refresh'
async function command(context) {

    output.appendLine(`Invoked command '${commandName}' with '${context?.constructor?.name}'`)


    try {

        await Project.all(true)
        ProjectView.instance.refresh()

    } catch (exception) {
        vscode.window.showErrorMessage(exception.message)
    }

}


module.exports = vscode.commands.registerCommand(`devopsscripts.${commandName}`, command)