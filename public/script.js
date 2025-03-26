// User state management
let currentUser = null;
let notifications = [];
let allTweets = [];
let searchTimeout = null;

// API base URL - use environment variable or fallback to localhost
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : 'https://twtb.onrender.com';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in (you'd typically check localStorage or cookies)
    checkAuthState();
    
    // Setup event listeners
    setupAuthListeners();
    setupTweetListeners();
    setupTabListeners();
    setupSearchListeners();
    if (currentUser) {
        loadTweets();
    }
});

function checkAuthState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
        updateProfileUI();
    } else {
        showAuth();
    }
}

function setupAuthListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
}

function setupTweetListeners() {
    // Existing tweet button listener
    document.getElementById('tweetButton').addEventListener('click', handleTweet);
    
    // Character count
    document.getElementById('tweetInput').addEventListener('input', function() {
        const remainingChars = 280 - this.value.length;
        updateCharacterCount(remainingChars);
    });
}

function setupTabListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.dataset.tab;
            if (tabName === 'feed') {
                document.getElementById('tweetList').style.display = 'block';
                document.getElementById('notificationsList').style.display = 'none';
            } else {
                document.getElementById('tweetList').style.display = 'none';
                document.getElementById('notificationsList').style.display = 'block';
                displayNotifications();
            }
        });
    });
}

function setupSearchListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    searchInput.addEventListener('input', (e) => {
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Set new timeout for search
        searchTimeout = setTimeout(() => {
            searchTweets(e.target.value);
        }, 300);
    });

    searchButton.addEventListener('click', () => {
        searchTweets(searchInput.value);
    });
}

// Auth functions
async function handleLogin(e) {
    e.preventDefault();
    const email = e.target.elements[0].value;
    const password = e.target.elements[1].value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const user = await response.json();
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showApp();
        updateProfileUI();
        loadTweets();
    } catch (error) {
        alert(error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = e.target.elements[0].value;
    const email = e.target.elements[1].value;
    const password = e.target.elements[2].value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        // Auto login after successful registration
        handleLogin({ 
            preventDefault: () => {},
            target: { elements: [
                { value: email },
                { value: password }
            ]}
        });
    } catch (error) {
        alert(error.message);
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showAuth();
}

// UI functions
function showAuth() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appSection').style.display = 'none';
}

function showApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'flex';
}

function updateProfileUI() {
    if (currentUser) {
        document.getElementById('username').textContent = `@${currentUser.username}`;
        document.getElementById('followersCount').textContent = `${currentUser.followers} Followers`;
        document.getElementById('followingCount').textContent = `${currentUser.following} Following`;
    }
}

// Existing tweet functions with modifications
async function handleTweet() {
    const tweetInput = document.getElementById('tweetInput');
    const tweetText = tweetInput.value.trim();

    if (tweetText && currentUser) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tweets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    content: tweetText
                })
            });

            if (!response.ok) {
                throw new Error('Error creating tweet');
            }

            tweetInput.value = '';
            updateCharacterCount(280);
            loadTweets();
            addNotification(`Tweet posted successfully!`);
        } catch (error) {
            alert(error.message);
        }
    }
}

// Add character count display
const tweetInput = document.getElementById('tweetInput');
const tweetButton = document.getElementById('tweetButton');

tweetInput.addEventListener('input', function() {
    const remainingChars = 280 - this.value.length;
    updateCharacterCount(remainingChars);
});

function updateCharacterCount(remaining) {
    let existingCounter = document.getElementById('charCount');
    if (!existingCounter) {
        existingCounter = document.createElement('div');
        existingCounter.id = 'charCount';
        tweetButton.parentNode.insertBefore(existingCounter, tweetButton);
    }
    existingCounter.textContent = `${remaining} characters remaining`;
    existingCounter.style.color = remaining < 20 ? '#ff4136' : '#8899a6';
    existingCounter.style.fontSize = '14px';
    existingCounter.style.marginBottom = '10px';
}

// Add function to load tweets
async function loadTweets() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tweets`);
        const tweets = await response.json();
        
        allTweets = tweets; // Store all tweets
        displayTweets(tweets); // New function to display tweets
    } catch (error) {
        console.error('Error loading tweets:', error);
    }
}

// Add function to create tweet elements
function createTweetElement(tweet) {
    const tweetDiv = document.createElement('div');
    tweetDiv.className = 'tweet';
    
    const tweetHeader = document.createElement('div');
    tweetHeader.className = 'tweet-header';
    tweetHeader.innerHTML = `
        <strong>@${tweet.username}</strong>
        <span>${new Date(tweet.created_at).toLocaleString()}</span>
    `;
    
    const tweetContent = document.createElement('p');
    tweetContent.textContent = tweet.content;

    const likeButton = document.createElement('button');
    likeButton.className = 'like-button';
    likeButton.textContent = '♥ Like';
    
    likeButton.onclick = async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tweets/${tweet.id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: currentUser.id })
            });

            if (!response.ok) {
                throw new Error('Error liking tweet');
            }

            likeButton.classList.add('liked');
            likeButton.textContent = '♥ Liked';
        } catch (error) {
            alert(error.message);
        }
    };

    tweetDiv.appendChild(tweetHeader);
    tweetDiv.appendChild(tweetContent);
    tweetDiv.appendChild(likeButton);
    
    return tweetDiv;
}

// Notification system
function addNotification(message) {
    const notification = {
        id: Date.now(),
        message,
        timestamp: new Date()
    };
    notifications.unshift(notification);
    displayNotifications();
}

function displayNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (notificationsList.style.display === 'none') return;

    notificationsList.innerHTML = notifications.map(notification => `
        <div class="notification">
            <p>${notification.message}</p>
            <small>${notification.timestamp.toLocaleString()}</small>
        </div>
    `).join('');
}

// Add new function to handle search
function searchTweets(query) {
    if (!query.trim()) {
        displayTweets(allTweets);
        return;
    }

    const searchQuery = query.toLowerCase();
    const filteredTweets = allTweets.filter(tweet => {
        return tweet.content.toLowerCase().includes(searchQuery) ||
               tweet.username.toLowerCase().includes(searchQuery);
    });

    displayTweets(filteredTweets);
}

// New function to display tweets
function displayTweets(tweets) {
    const tweetList = document.getElementById('tweetList');
    tweetList.innerHTML = '';
    
    if (tweets.length === 0) {
        tweetList.innerHTML = `
            <div class="no-results">
                <h3>No tweets found</h3>
                <p>Try different search terms</p>
            </div>
        `;
        return;
    }
    
    tweets.forEach(tweet => {
        const tweetDiv = createTweetElement(tweet);
        tweetList.appendChild(tweetDiv);
    });
}
