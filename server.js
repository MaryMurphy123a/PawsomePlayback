const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || `https://pawsomeplayback.azurewebsites.net/callback`;

// Debug route to test server
app.get('/test', (req, res) => {
    res.send({
        message: 'Server is running!',
        env: {
            clientId: GITHUB_CLIENT_ID ? 'Set' : 'Not set',
            secret: GITHUB_CLIENT_SECRET ? 'Set' : 'Not set',
            redirect: REDIRECT_URI
        }
    });
});

// Routes first
app.get('/', (req, res) => {
    console.log('Serving index page');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    console.log('Login route hit, redirecting to GitHub');
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
    console.log('Auth URL:', githubAuthUrl);
    res.redirect(githubAuthUrl);
});

app.get('/callback', async (req, res) => {
    console.log('Callback route hit');
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
        console.log('OAuth response received');
        
        // Redirect to upload page with token
        res.redirect(`/upload.html#token=${data.access_token}`);
    } catch (error) {
        console.error('Error during GitHub authentication:', error);
        res.redirect('/?error=authentication_failed');
    }
});

app.get('/upload', (req, res) => {
    console.log('Serving upload page');
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Static files after routes
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Static files served from:', path.join(__dirname, 'public'));
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Redirect URI:', REDIRECT_URI);
});