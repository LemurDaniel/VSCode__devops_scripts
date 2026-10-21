const vscode = require('vscode')
const output = require('../output')

const ProjectView = require('../projectView')
const Repository = require('../data/repository')


const commandName = 'resource.rename'
async function command(context) {

    output.appendLine(`Invoked command '${commandName}' with '${context?.constructor?.name}'`)
    if (null == context) return


    try {

        if (context instanceof Repository.PullRequest) {

            const newTitle = await vscode.window.showInputBox({
                title: "Enter a PullRequest Title",
                placeHolder: "...Title"
            })

            if (null == newTitle || newTitle.length == 0) return

            output.appendLine(`'${context.title}' to '${newTitle}'`)
            await context.update({
                title: newTitle
            })

            ProjectView.instance.refresh()

        }

    } catch (exception) {
        vscode.window.showErrorMessage(exception.message)
    }

}


module.exports = vscode.commands.registerCommand(`devopsscripts.${commandName}`, command)