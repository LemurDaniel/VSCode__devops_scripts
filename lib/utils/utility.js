const childProcess = require('child_process')


/**
 * Executes a program in a working directory without a shell, so arguments are never interpreted.
 * Many tools (like git) write progress to stderr on success, so only the exit code decides about failure.
 *
 * @param command - a program like git (needs to be on path)
 * @param args - (optional) array of arguments
 * @param directory - (optional) working directory for executing the command
 */
function execute(command, args = [], directory = null) {

    return new Promise((resolve, reject) => {
        childProcess.execFile(command, args, { cwd: directory, windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err)
                reject(new Error(stderr?.toString().trim() || err.message))
            else
                resolve(stdout)
        })
    })

}

/**
 * Trims character from the start and end of a string
 * 
 * @param str - a string to trim
 * @param character - a character to trim
 */
function trimEnd(str, character) {

    const array = str.split('')
    while (array.length > 0 && array.at(-1) == character) array.pop()
    return array.join('')

}

/**
 * Groups elements with a similar prefix
 * 
 * @param values - values to group by prefix
 * @param minGroupCount - minimum of elements to appear in a prefix, to be grouped
 * @param minGroupCount - minimum length of a prefix to use as a group
 * @param minGroupCount - if values not an array of string, callback function to resolve to string, like name of element. 
 * @param delimiters - delimiters to split and group values by
 */
function groupSimilar(values, minGroupCount, minPrefixLength, property = value => value, delimiters = ['-', '_', ' ', '/', '.']) {

    const processed = {}
    const groupings = {
        ungrouped: [],
        groupCount: 0,
        grouped: {}
    }

    while (values.length > 0) {

        const initial = property(values[0])

        for (let i = initial.length - 1; i >= 0; i--) {

            const nextIndex = delimiters
                .map(del => initial.substring(i).indexOf(del))
                .filter(index => index > 0)
                .reduce((acc, v) => Math.min(acc, v + i + 1), Number.MAX_SAFE_INTEGER)

            if (nextIndex == Number.MAX_SAFE_INTEGER && i > 0)
                continue
            else if (i == 0) {
                processed[initial] = values[0]
                groupings.ungrouped.push(values[0])
                break
            }


            const prefix = initial.substring(0, nextIndex)
        
            // Filter all values that match the current prefix
            const remaining = values.filter(
                value => property(value).substring(0, nextIndex).toLowerCase() == prefix.toLowerCase()
            )

            if (remaining.length >= minGroupCount && prefix.length >= minPrefixLength) {

                // Remove all delimiters from prefix to use as group Name
                const groupName = delimiters.reduce((prefix, delimiter) => trimEnd(prefix, delimiter), prefix)
                groupings.grouped[groupName] = remaining
                groupings.groupCount++

                // Remove processed values from map.
                remaining.forEach(value => processed[property(value)] = value)
                break
            }
        }

        // Remove processed values from values array
        values = values.filter(value => !(property(value) in processed))
    }

    return groupings
}

module.exports = {
    execute,
    groupSimilar
}