const cache = require('./cache.js')
const vscode = require('vscode')
const output = require('../output')

class Pipeline {

    static #instances = {}

    static QUEUE_STATUS = {
        enabled: 'enabled',
        disabled: 'disabled',
        paused: 'paused'
    }

    static get IconDefault() {
        return new vscode.ThemeIcon('rocket', new vscode.ThemeColor('devopsscripts.pipeline'))
    }

    static async from(project, refresh = false) {

        // The full build definitions already contain queueStatus, repository and links,
        // so one request is enough instead of one additional request per pipeline.
        let pipelineCache = await cache.get('pipeline-definitions-full', project.name)

        if (null == pipelineCache || refresh) {
            pipelineCache = await project.get(`/_apis/build/definitions?includeAllProperties=true&api-version=7.0`)

            pipelineCache = pipelineCache.value
                .sort((a, b) => {
                    if (a.name < b.name) return -1
                    else if (a.name > b.name) return 1
                    else return 0
                })

            await cache.set(pipelineCache, 300, 'pipeline-definitions-full', project.name)
        }

        return pipelineCache.map(data => {
            if (data.id in Pipeline.#instances) {
                Pipeline.#instances[data.id].#refresh(data)
            } else {
                Pipeline.#instances[data.id] = new Pipeline(data, project)
            }
            return Pipeline.#instances[data.id]
        })

    }

    get Icon() {
        if (this.queueStatus == Pipeline.QUEUE_STATUS.enabled)
            return Pipeline.IconDefault
        else if (this.queueStatus == Pipeline.QUEUE_STATUS.disabled)
            return new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('devopsscripts.disabled'))
        else if (this.queueStatus == Pipeline.QUEUE_STATUS.paused)
            return new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('devopsscripts.disabled'))
    }

    // Builds seen so far by id, so state like hidden builds and running polls survives reloading the list.
    #builds = new Map()
    #recentBuilds = []
    #recentBuildsLoadedAt = 0

    get builds() {
        return this.#recentBuilds
    }

    constructor(data, project) {

        this.project = project
        this.#refresh(data)

    }

    // Latest builds of this pipeline, including builds that were not started by the extension.
    async loadBuilds(refresh = false, maxAgeSeconds = 10) {

        if (!refresh && Date.now() - this.#recentBuildsLoadedAt < maxAgeSeconds * 1000)
            return this.#recentBuilds

        const count = vscode.workspace.getConfiguration('devops').get('recent_builds_count', 5)
        const response = await this.project.get({
            api: '/_apis/build/builds?api-version=7.0',
            query: {
                definitions: this.id,
                queryOrder: 'queueTimeDescending',
                '$top': count
            }
        })

        this.#recentBuilds = response.value.map(data => {
            if (this.#builds.has(data.id)) {
                return this.#builds.get(data.id).update(data)
            }
            const build = new Pipeline.Build(data, this)
            this.#builds.set(data.id, build)
            return build
        })
        this.#recentBuildsLoadedAt = Date.now()

        return this.#recentBuilds
    }

    #refresh(data) {
        this.id = data.id
        this.url = data.url
        this.name = data.name
        this.folder = data.path
        this.revision = data.revision
        this._links = data._links
        this.repository = data.repository
        this.queueStatus = data.queueStatus
    }

    async refresh() {

        const response = await this.project.get(`/_apis/build/definitions/${this.id}?api-version=7.0`)
        this.#refresh(response)

        return this

    }

    async updateSettings(settings) {

        const pipeline = await this.project.get(`/_apis/build/definitions/${this.id}?api-version=6.0`)

        await this.project.put({
            api: `/_apis/build/definitions/${this.id}?api-version=6.0`,
            body: {
                ...pipeline,
                ...settings
            }
        })

        await this.refresh()

    }

    async #startOnBranch(branch) {

        const build = await this.project.post({
            api: '/_apis/build/builds?api-version=6.0',
            body: {
                definition: {
                    id: this.id
                },
                sourceBranch: branch.name
            }
        }).then(data => new Pipeline.Build(data, this))

        this.#builds.set(build.id, build)
        // Reload the list on next access, so the new build shows up.
        this.#recentBuildsLoadedAt = 0

        return build
    }

    async start(branch) {

        await this.refresh()

        if (this.queueStatus != Pipeline.QUEUE_STATUS.enabled) return

        return await this.#startOnBranch(branch)

    }






    /*
        #######################################################
        #### Pipeline Builds
        #######################################################
    */

    static Build = class Build {

        static STATUSES = {
            cancelling: 'cancelling',
            completed: 'completed',
            inProgress: 'inProgress',
            none: 'none',
            notStarted: 'notStarted',
            postponed: 'postponed'
        }

        static RESULTS = {
            canceled: 'canceled',
            failed: 'failed',
            inProgress: 'inProgress',
            none: 'none',
            partiallySucceeded: 'partiallySucceeded',
            succeeded: 'succeeded'
        }

        get Icon() {

            if (this.status == Pipeline.Build.STATUSES.notStarted)
                return new vscode.ThemeIcon('sync', new vscode.ThemeColor('testing.iconQueued'))

            if (this.status == Pipeline.Build.STATUSES.inProgress)
                return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.runAction'))


            if (this.result == Pipeline.Build.RESULTS.canceled || this.status == Pipeline.Build.STATUSES.cancelling)
                return new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('testing.iconSkipped'))

            if (this.result == Pipeline.Build.RESULTS.failed)
                return new vscode.ThemeIcon('close', new vscode.ThemeColor('testing.iconFailed'))

            if (this.result == Pipeline.Build.RESULTS.succeeded)
                return new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'))


            return new vscode.ThemeIcon('circle-outline')
        }

        #onChange
        set onChange(value) {
            this.#onChange = value
        }

        constructor(data, pipeline) {

            this.id = data.id
            this.url = data.url
            this.uri = data.uri
            this._links = data._links
            this.reason = data.reason
            this.priority = data.priority
            this.pipeline = pipeline

            this.pollRateQueued = 5
            this.pollRateAfterStart = 10

            this.showInTreeView = true

            this.#update(data)
            this.#schedulePoll()
        }

        #update(data) {
            this.buildNumber = data.buildNumber
            this.sourceBranch = data.sourceBranch
            this.status = data.status
            this.result = data.result
            this.queueTime = data.queueTime
            this.requestedFor = data.requestedFor?.displayName
        }

        // Update with fresh data from a build list, returns the build itself.
        update(data) {
            const hasChanged = this.status != data.status || this.result != data.result
            this.#update(data)
            if (hasChanged) this.#onChange?.call(this)
            this.#schedulePoll()
            return this
        }

        #pollTimer = null
        // Poll until the build is completed, this includes builds that are being cancelled.
        #schedulePoll() {

            let rate
            if (this.status == Pipeline.Build.STATUSES.notStarted)
                rate = this.pollRateQueued
            else if (this.status == Pipeline.Build.STATUSES.inProgress || this.status == Pipeline.Build.STATUSES.cancelling)
                rate = this.pollRateAfterStart

            if (null == rate) {
                // Build is done, a pending poll is not needed anymore.
                clearTimeout(this.#pollTimer)
                this.#pollTimer = null
                return
            }

            if (null != this.#pollTimer) return

            this.#pollTimer = setTimeout(() => {
                this.#pollTimer = null
                this.pollState()
            }, rate * 1000)
        }

        async pollState() {

            try {
                const build = await this.pipeline.project.get(`/_apis/build/builds/${this.id}?api-version=7.0`)
                this.update(build)
            } catch (exception) {
                output.appendLine(`Could not update build ${this.id}: ${exception.message}`)
            }

        }


        async cancelBuild() {

            await this.pipeline.project.patch({
                api: `/_apis/build/builds/${this.id}?api-version=7.0`,
                body: {
                    status: Pipeline.Build.STATUSES.cancelling
                }
            })

            this.status = Pipeline.Build.STATUSES.cancelling
            this.#onChange?.call(this)
            this.#schedulePoll()

        }
    }


}

module.exports = Pipeline