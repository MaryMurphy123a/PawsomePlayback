const express = require('express');
const session = require('express-session');

const app = express();

// Configure session middleware
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Route to handle login
app.get('/login', (req, res) => {
  res.redirect('/.auth/login/github');
});

// Route to handle logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Route to handle callback from Azure
app.get('/.auth/login/github/callback', (req, res) => {
  // Azure App Service will handle the authentication and redirect back to your app
  // You can access the authenticated user info from the request headers
  req.session.user = req.headers['x-ms-client-principal'];
  res.redirect('/');
});

// Protected route example
app.get('/profile', isAuthenticated, (req, res) => {
  res.send(`Hello, ${req.session.user.userDetails}`);
});

// Home route
app.get('/', (req, res) => {
  res.send(req.session.user ? `Hello, ${req.session.user.userDetails}` : 'Hello, Guest');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
