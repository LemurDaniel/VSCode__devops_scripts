const fs = require('fs')
const pathUtils = require('path')

class Utilscache {

    static #instance = null
    static get instance() {
        if (null == Utilscache.#instance)
            throw new Error('Not initialized')

        return Utilscache.#instance
    }

    static init(globalStorageFsPath) {
        Utilscache.#instance = new Utilscache(globalStorageFsPath)
        return Utilscache.#instance
    }

    constructor(globalStorageFsPath) {
        this.globalStorageFsPath = globalStorageFsPath
        fs.mkdirSync(globalStorageFsPath, {
            recursive: true
        })
    }


    path(identifiers) {
        // Names of projects and repositories may contain characters that are not allowed in filenames.
        const filename = `${identifiers.filter(v => v != null).join('.')}.json`.replace(/[\/:*?"<>|]/g, '_')
        return pathUtils.join(this.globalStorageFsPath, filename)
    }

    async del(identifiers) {
        await fs.promises.rm(this.path(identifiers), { force: true })
    }

    async get(identifiers) {

        try {
            const cache = JSON.parse(await fs.promises.readFile(this.path(identifiers), 'utf-8'))
            if (cache.expires == null || cache.expires > Date.now()) {
                return cache.content
            }
        } catch (exception) {
            // Missing or corrupt cache files are treated as a cache miss.
        }

        return null
    }

    // ttl in seconds, null for an entry that never expires.
    async set(data, ttl, identifiers) {

        const cache = {
            content: data,
            expires: ttl == null ? null : (Date.now() + 1000 * ttl)
        }

        await fs.promises.writeFile(this.path(identifiers), JSON.stringify(cache))

        return data

    }
}


module.exports = Utilscache
