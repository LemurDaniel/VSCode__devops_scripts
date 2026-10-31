const Module = require('module')

// Minimal stand-in for the 'vscode' module, which only exists inside the extension host.
// Require this before any module from lib/ that depends on vscode.
const vscode = {
    settings: {},
    workspace: {
        getConfiguration: () => ({
            get: key => vscode.settings[key],
            update: async (key, value) => { vscode.settings[key] = value }
        })
    },
    window: {
        createOutputChannel: () => ({ appendLine: () => { } })
    },
    authentication: {
        getSession: async () => ({ accessToken: 'test-token' })
    }
}

const load = Module._load
Module._load = function (request, ...args) {
    return request === 'vscode' ? vscode : load.call(this, request, ...args)
}

module.exports = vscode
