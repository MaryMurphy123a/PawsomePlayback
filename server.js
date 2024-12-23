const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/callback`;

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
    res.redirect(githubAuthUrl);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code
            })
        });

        const data = await response.json();
        
        // Redirect to upload page with token
        res.redirect(`/upload.html#token=${data.access_token}`);
    } catch (error) {
        console.error('Error during GitHub authentication:', error);
        res.redirect('/?error=authentication_failed');
    }
});

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Static files served from:', path.join(__dirname, 'public'));
    console.log('Environment:', process.env.NODE_ENV);
});
