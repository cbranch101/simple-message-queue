import Chance from 'chance'

const chance = new Chance('test')

const getDeferred = () => {
    let resolve = null
    let reject = null
    const promise = new Promise((innerResolve, innerReject) => {
        resolve = innerResolve
        reject = innerReject
    })
    return {
        resolve,
        reject,
        promise,
    }
}

const getMessageQueue = ({ send, registerReceive, commands = {} }) => {
    const pending = {}

    const handleMessage = (message) => {
        const { id, response, error, command, params } = message
        if (error !== undefined) {
            const deferred = pending[id]
            deferred.reject(error)
            delete pending[id]
            return
        }
        if (response !== undefined) {
            const deferred = pending[id]
            deferred.resolve(response)
            delete pending[id]
            return
        }

        const resolve = (response) =>
            send({
                id,
                response,
            })
        const reject = (error) =>
            send({
                id,
                error,
            })
        const handler = commands[command]
        if (handler === undefined) {
            throw new Error(`${command} is not a valid command`)
        }
        const returnValue = handler(params)
        if (returnValue.then !== undefined) {
            returnValue
                .then((value) => resolve(value))
                .catch((error) => reject(error))
            return
        }
        resolve(true)
    }

    registerReceive({ handleMessage })

    return {
        sendMessage: (command, params) => {
            const uuid = chance.guid()
            const message = {
                command,
                params,
                id: uuid,
            }
            const deferred = getDeferred()
            pending[uuid] = deferred
            send(message)
            return deferred.promise
        },
    }
}

export default getMessageQueue
