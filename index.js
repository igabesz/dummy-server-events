const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Global setup
const app = express();
app.use(cors());
app.use(bodyParser.text({ type: 'text/plain'}));

const activeListeners = new Map();
const globalCache = new Map();

// Update endpoint
app.post('/update/:id', (req, res) => {
    // Validate request
    const id = Number.parseInt(req.params.id, 10);
    const value = Number.parseInt(req.body);
    if (isNaN(id) || isNaN(value)) {
        console.warn(`Invalid update, id=${req.params.id}, value=${req.body}`);
        res.status(400);
        res.end();
        return;
    }

    // Update value
    console.log(`Updating id=${id}, value=${value}`);
    globalCache.set(id, value);

    // Call listeners
    const listeners = activeListeners.get(id) || [];
    for (const listener of listeners) {
        try {
            listener(value)
        } catch (err) {
            console.error('Error during listener invocation', err);
        }
    }

    // Terminate request
    res.status(200);
    res.end();
});

// Follow endpoint
app.get('/follow/:id', (req, res) => {
    // Get ID
    const id = Number.parseInt(req.params.id);
    if (isNaN(id)) {
        console.warn(`Invalid listner, id=${req.params.id}`);
        res.sendStatus(400);
        res.end('Invalid or missing id');
        return;
    }

    // Send headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // Register callback
    console.log(`Registering listener on id=${id}`);
    const myListener = value => res.write(`data: ${value}\n\n`);
    activeListeners.set(id, [
        ...(activeListeners.get(id) || []),
        myListener,
    ]);

    // Handle close
    req.on('end', () => {
        console.log(`Closing listener on id=${id}`);
        const remainingListeners = (activeListeners.get(id) || [])
            .filter(l => l !== myListener);
        activeListeners.set(id, remainingListeners)
    });

    // First update
    const value = globalCache.get(id) || 0;
    myListener(value);
});

// Starting the app
const port = 3000;
app.listen(port, () => {
    console.log(`App started on port ${port}`);
});
