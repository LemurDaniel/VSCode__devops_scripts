require('./helpers/vscode')
const assert = require('assert')
const https = require('https')
const { EventEmitter } = require('events')
const devops = require('../../lib/data/api')

suite('DevOps.rest', () => {

    const originalRequest = https.request
    let requests
    let responses

    // Each call to https.request answers with the next queued response.
    function respond(statusCode, body) {
        responses.push({ statusCode, body: typeof body === 'string' ? body : JSON.stringify(body) })
    }

    setup(() => {
        requests = []
        responses = []
        https.request = (options, callback) => {
            const request = new EventEmitter()
            request.write = data => options.written = data
            request.end = () => {
                requests.push(options)
                const { statusCode, body } = responses.shift() ?? { statusCode: 200, body: '{}' }
                const response = new EventEmitter()
                response.statusCode = statusCode
                response.headers = {}
                callback(response)
                response.emit('data', Buffer.from(body))
                response.emit('end')
            }
            return request
        }
    })

    teardown(() => {
        https.request = originalRequest
    })

    test('scope None calls the domain without an organization', async () => {
        respond(200, { value: 1 })
        const result = await devops.get({ scope: 'None', domain: 'app.vssps.visualstudio.com', api: '_apis/profile?api-version=6.0' })

        assert.deepStrictEqual(result, { value: 1 })
        assert.strictEqual(requests[0].hostname, 'app.vssps.visualstudio.com')
        assert.strictEqual(requests[0].method, 'GET')
        assert.strictEqual(requests[0].path, '/_apis/profile?api-version=6.0')
        assert.strictEqual(requests[0].headers.Authorization, 'Bearer test-token')
    })

    test('merges the query object with the query of the api string', async () => {
        await devops.get({ scope: 'None', domain: 'd', api: '/_apis/x?api-version=7.0', query: { mine: true } })
        assert.strictEqual(requests[0].path, '/_apis/x?mine=true&api-version=7.0')
    })

    test('builds organization, project and team paths', async () => {
        await devops.get({ domain: 'd', api: '_apis/x', organization: 'org' })
        await devops.get({ domain: 'd', api: '_apis/x', organization: 'org', project: 'proj' })
        await devops.get({ domain: 'd', api: '_apis/x', organization: 'org', project: 'proj', team: 'team' })

        assert.deepStrictEqual(requests.map(r => r.path), [
            '/org/_apis/x?',
            '/org/proj/_apis/x?',
            '/org/proj/team/_apis/x?'
        ])
    })

    test('encodes spaces in the path', async () => {
        await devops.get({ domain: 'd', api: '_apis/x', organization: 'org', project: 'My Project' })
        assert.strictEqual(requests[0].path, '/org/My%20Project/_apis/x?')
    })

    test('sends the body as json on post', async () => {
        await devops.post({ domain: 'd', api: '_apis/x', organization: 'org', body: { name: 'repo' } })

        assert.strictEqual(requests[0].method, 'POST')
        assert.strictEqual(requests[0].headers['Content-Type'], 'application/json; charset=utf-8')
        assert.strictEqual(requests[0].written.toString(), '{"name":"repo"}')
    })

    test('get never sends a body', async () => {
        await devops.get({ domain: 'd', api: '_apis/x', organization: 'org', body: { ignored: true } })

        assert.strictEqual(requests[0].written, undefined)
        assert.strictEqual(requests[0].headers['Content-Type'], 'application/x-www-form-urlencoded; charset=utf-8')
    })

    test('strips a byte order mark from the response', async () => {
        respond(200, '﻿{"ok":true}')
        assert.deepStrictEqual(await devops.get({ scope: 'None', domain: 'd', api: 'x' }), { ok: true })
    })

    test('rejects with the message Azure DevOps returns on errors', async () => {
        respond(404, { message: 'Project not found' })
        await assert.rejects(devops.get({ scope: 'None', domain: 'd', api: 'x' }), /Project not found/)
    })

    test('rejects with the status code when the error has no message', async () => {
        respond(500, {})
        await assert.rejects(devops.get({ scope: 'None', domain: 'd', api: 'x' }), /HTTP 500/)
    })

    test('rejects on a response that is not json', async () => {
        respond(200, '<html>login</html>')
        await assert.rejects(devops.get({ scope: 'None', domain: 'd', api: 'x' }), /Unexpected response \(HTTP 200\)/)
    })

    test('uses the organization of the current user when none is given', async () => {
        respond(200, { id: 'id', displayName: 'User', publicAlias: 'alias', emailAddress: 'User@Example.com' })
        respond(200, { value: [{ accountName: 'first' }, { accountName: 'second' }] })
        respond(200, {})

        await devops.get({ domain: 'dev.azure.com', api: '_apis/projects', scope: 'organization' })

        assert.strictEqual(requests[1].path, '/_apis/accounts?memberId=alias&api-version=6.0')
        assert.strictEqual(requests[2].path, '/first/_apis/projects?')
    })

})
