import getMessageQueue from './getMessageQueue'

const getMockWindow = () => {
    let onMessage = null
    return {
        addEventListener: (f) => {
            onMessage = f
        },
        triggerEvent: (message) => onMessage(message),
    }
}

const getPanel = (mockWindow) => {
    let onMessage = null
    return {
        addEventListener: (f) => {
            onMessage = f
        },
        triggerEvent: (message) => onMessage(message),
        postMessage: (message) => mockWindow.triggerEvent(message),
    }
}

const getWebview = (panel) => ({
    postMessage: (message) => panel.triggerEvent(message),
})

describe('getMessageQueue', () => {
    const mockWindow = getMockWindow()
    const panel = getPanel(mockWindow)
    const webview = getWebview(panel)
    const client = getMessageQueue({
        send: (message) => webview.postMessage(message),
        registerReceive: ({ handleMessage }) => {
            mockWindow.addEventListener((message) => handleMessage(message))
        },
        commands: {
            open: () => true,
            errorExample: () => Promise.reject(Error('an error')),
        },
    })

    const server = getMessageQueue({
        send: (message) => panel.postMessage(message),
        registerReceive: ({ handleMessage }) =>
            panel.addEventListener((message) => handleMessage(message)),
        commands: {
            getState: () => Promise.resolve({ foo: 'bar' }),
        },
    })
    test('should allow message communication', async () => {
        const openValue = await server.sendMessage('open')
        expect(openValue).toEqual(true)
        const getStateValue = await client.sendMessage('getState')
        expect(getStateValue).toEqual({ foo: 'bar' })
        expect(server.sendMessage('errorExample')).rejects.toEqual(
            new Error('an error'),
        )
    })
})
