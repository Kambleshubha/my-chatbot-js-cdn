(function() { // IIFE (Immediately Invoked Function Expression) to prevent global scope pollution

    // --- Configuration (Client-specific, read from script tag data attributes) ---
    const currentScript = document.currentScript;

    // N8n Webhook URL is crucial. Client must provide this.
    const N8N_WEBHOOK_URL = currentScript.dataset.webhookUrl || 'YOUR_N8N_WEBHOOK_URL_HERE'; 
    // Brand Name for the chatbot header
    const CHATBOT_BRAND_NAME = currentScript.dataset.brandName || 'AI Assistant'; 
    // URL for the brand logo in the chatbot header
    const CHATBOT_LOGO_URL = currentScript.dataset.logoUrl || 'https://www.vectorlogo.co/assets/logos/a/adobe-stock-logo-B114389BA1-seeklogo.com.png'; 

    // New: Initial welcome message, configurable by client
    const initialBotWelcomeMessage = currentScript.dataset.welcomeMessage || "Hello 👋 How can I help you today?";

    // New: Predefined suggestions, configurable by client as a JSON string
    let predefinedSuggestions = [];
    const suggestionsJson = currentScript.dataset.suggestions;
    if (suggestionsJson) {
        try {
            const parsedSuggestions = JSON.parse(suggestionsJson);
            // Ensure the parsed value is an array
            if (Array.isArray(parsedSuggestions)) {
                predefinedSuggestions = parsedSuggestions;
            } else {
                console.warn("Chatbot: 'data-suggestions' attribute is not a valid JSON array. Using default suggestions.");
            }
        } catch (e) {
            console.error("Chatbot: Error parsing 'data-suggestions' JSON:", e);
            console.warn("Using default suggestions.");
        }
    }
    
    // Fallback to default suggestions if client didn't provide any or parsing failed
    if (predefinedSuggestions.length === 0) {
        predefinedSuggestions = [
            "What can you do?",
            "Tell me about your services",
            "How does this work?",
            "What's my session ID?",
            "Contact support",
            "Pricing plans"
        ];
    }


    // --- CSS Styles (as a single string) ---
    // This CSS will be injected into the client's page's <head> section.
    // Each rule is now prefixed with '#chatbot-root-container' for higher specificity.
    const chatbotStyles = `
        :root {
            --primary-color: #6C5CE7; /* Purple */
            --primary-dark: #5a4acb;
            --background-dark: #1A1A2E; /* Dark background */
            --card-background: #202035; /* Card background */
            --text-color-light: #E0E0E0;
            --text-color-dark: #C0C0C0;
            --message-bot-bg: #303045;
            --message-user-bg: var(--primary-color);
            --border-color: #444;
        }

        /* --- Global Reset & Base Styles for the chatbot root container --- */
        #chatbot-root-container * {
            box-sizing: border-box !important; /* Force border-box model */
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            outline: none !important;
            border: none !important;
            text-decoration: none !important;
            line-height: 1.5 !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        #chatbot-root-container {
            /* Position relative to avoid interfering with client's absolute/fixed elements */
            position: relative !important; 
            z-index: 2147483647 !important; /* Max z-index to ensure chatbot is always on top */
            font-size: 16px !important; /* Base font size */
        }

        /* --- Chat Toggle Icon and Welcome Bubble --- */
        #chatbot-root-container .chat-toggle-container {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 1000 !important; /* Z-index within the chatbot context */
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
        }

        #chatbot-root-container .initial-bubble {
            background-color: var(--card-background) !important;
            color: var(--text-color-light) !important;
            padding: 10px 15px !important;
            border-radius: 20px !important;
            margin-bottom: 10px !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
            cursor: pointer !important;
            opacity: 0 !important;
            transform: translateY(10px) !important;
            transition: opacity 0.3s ease-out, transform 0.3s ease-out !important;
            white-space: nowrap !important;
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            font-size: 0.9em !important;
        }

        #chatbot-root-container .initial-bubble.visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }

        #chatbot-root-container .chat-icon {
            background-color: var(--primary-color) !important;
            color: white !important;
            border: none !important;
            border-radius: 50% !important;
            width: 60px !important;
            height: 60px !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            cursor: pointer !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
            transition: background-color 0.3s ease, transform 0.3s ease !important;
        }

        #chatbot-root-container .chat-icon:hover {
            background-color: var(--primary-dark) !important;
            transform: scale(1.05) !important;
        }

        #chatbot-root-container .chat-icon svg {
            width: 30px !important;
            height: 30px !important;
        }

        /* --- Chat Window --- */
        #chatbot-root-container .chat-window {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            width: 350px !important;
            height: 500px !important;
            background-color: var(--card-background) !important;
            border-radius: 15px !important;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5) !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            transform: scale(0.8) !important;
            opacity: 0 !important;
            pointer-events: none !important; /* Do not accept clicks when hidden */
            transition: transform 0.3s ease-out, opacity 0.3s ease-out !important;
            z-index: 1001 !important; /* Higher z-index than the icon within chatbot context */
        }

        #chatbot-root-container .chat-window.visible {
            transform: scale(1) !important;
            opacity: 1 !important;
            pointer-events: auto !important;
        }

        #chatbot-root-container .chat-window.hidden-display { /* Use display: none for complete hiding */
            display: none !important;
        }


        #chatbot-root-container .chat-header {
            background-color: var(--primary-color) !important;
            color: white !important;
            padding: 15px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-top-left-radius: 15px !important;
            border-top-right-radius: 15px !important;
        }

        #chatbot-root-container .chat-header .header-info {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            flex-grow: 1 !important; /* Allow info to take space */
            min-width: 0 !important; /* Allow flex item to shrink if content is long */
        }

        #chatbot-root-container .brand-logo { /* Brand Logo Styling */
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            margin-right: 8px !important;
            object-fit: cover !important;
            flex-shrink: 0 !important; /* Prevent logo from shrinking */
        }

        #chatbot-root-container .chat-header h2 {
            margin: 0 !important;
            font-size: 1.1em !important;
            font-weight: 600 !important;
            white-space: nowrap !important; /* Prevent brand name from wrapping */
            overflow: hidden !important; /* Hide overflowing text */
            text-overflow: ellipsis !important; /* Add ellipsis for overflow */
            flex-shrink: 1 !important; /* Allow title to shrink if needed */
            min-width: 0 !important; /* Allow flex item to shrink */
        }

        #chatbot-root-container .chat-header .online-status {
            margin: 0 !important;
            font-size: 0.8em !important;
            color: rgba(255, 255, 255, 0.8) !important;
            flex-shrink: 0 !important; /* Prevent status from shrinking */
            margin-left: 8px !important; /* Small space after title */
        }

        #chatbot-root-container .close-button {
            background: none !important;
            border: none !important;
            color: white !important;
            cursor: pointer !important;
            padding: 5px !important;
            border-radius: 5px !important;
            transition: background-color 0.2s ease !important;
            flex-shrink: 0 !important; /* Prevent close button from shrinking */
        }

        #chatbot-root-container .close-button:hover {
            background-color: var(--primary-dark) !important;
        }

        #chatbot-root-container .close-button svg {
            width: 24px !important;
            height: 24px !important;
        }

        #chatbot-root-container .chat-box {
            flex-grow: 1 !important;
            padding: 20px !important;
            overflow-y: auto !important;
            background-color: var(--background-dark) !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
        }

        #chatbot-root-container .message {
            max-width: 80% !important;
            padding: 10px 15px !important;
            border-radius: 15px !important;
            word-wrap: break-word !important;
            font-size: 0.9em !important;
            line-height: 1.4 !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
        }

        #chatbot-root-container .user-message {
            background-color: var(--message-user-bg) !important;
            color: white !important;
            align-self: flex-end !important;
            border-bottom-right-radius: 5px !important;
        }

        #chatbot-root-container .bot-message {
            background-color: var(--message-bot-bg) !important;
            color: var(--text-color-light) !important;
            align-self: flex-start !important;
            border-bottom-left-radius: 5px !important;
        }

        /* Styling for Markdown rendering */
        #chatbot-root-container .bot-message h1,
        #chatbot-root-container .bot-message h2,
        #chatbot-root-container .bot-message h3,
        #chatbot-root-container .bot-message h4 {
            color: var(--primary-color) !important;
            margin-top: 10px !important;
            margin-bottom: 5px !important;
        }
        #chatbot-root-container .bot-message p {
            margin-bottom: 5px !important;
        }
        #chatbot-root-container .bot-message ul,
        #chatbot-root-container .bot-message ol {
            list-style-type: none !important;
            padding-left: 0 !important;
            margin-left: 20px !important;
            margin-bottom: 0 !important;
        }
        #chatbot-root-container .bot-message ul li,
        #chatbot-root-container .bot-message ol li {
            display: flex !important;
            align-items: flex-start !important;
            margin-bottom: 8px !important;
        }
        #chatbot-root-container .bot-message ul li::before,
        #chatbot-root-container .bot-message ol li::before {
            content: "✅" !important;
            margin-right: 8px !important;
            flex-shrink: 0 !important;
        }
        #chatbot-root-container .bot-message code {
            background-color: rgba(255, 255, 255, 0.1) !important;
            padding: 2px 4px !important;
            border-radius: 3px !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 0.85em !important;
        }
        #chatbot-root-container .bot-message pre {
            background-color: rgba(255, 255, 255, 0.15) !important;
            padding: 8px !important;
            border-radius: 5px !important;
            overflow-x: auto !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 0.85em !important;
            margin-top: 5px !important;
            margin-bottom: 5px !important;
        }
        #chatbot-root-container .bot-message strong {
            color: var(--primary-color) !important;
        }

        #chatbot-root-container .typing-indicator {
            background-color: var(--message-bot-bg) !important;
            color: var(--primary-color) !important;
            font-style: italic !important;
            opacity: 0.8 !important;
            animation: pulse 1.5s infinite ease-in-out !important;
        }

        @keyframes pulse {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
        }

        #chatbot-root-container .error-message {
            background-color: #721c24 !important;
            color: #f8d7da !important;
        }

        #chatbot-root-container .input-area {
            display: flex !important;
            padding: 15px !important;
            border-top: 1px solid var(--border-color) !important;
            background-color: var(--card-background) !important;
        }

        #chatbot-root-container #user-input {
            flex-grow: 1 !important;
            padding: 10px 15px !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 20px !important;
            font-size: 1em !important;
            margin-right: 10px !important;
            background-color: var(--background-dark) !important;
            color: var(--text-color-light) !important;
            transition: border-color 0.3s !important;
        }

        #chatbot-root-container #user-input::placeholder {
            color: var(--text-color-dark) !important;
        }

        #chatbot-root-container #user-input:focus {
            border-color: var(--primary-color) !important;
        }

        #chatbot-root-container #send-button {
            background-color: var(--primary-color) !important;
            color: white !important;
            border: none !important;
            border-radius: 50% !important;
            width: 40px !important;
            height: 40px !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            cursor: pointer !important;
            font-size: 1.2em !important;
            transition: background-color 0.3s ease, transform 0.2s ease !important;
        }

        #chatbot-root-container #send-button:hover {
            background-color: var(--primary-dark) !important;
        }
        #chatbot-root-container #send-button:active {
            transform: scale(0.95) !important;
        }

        #chatbot-root-container #send-button svg {
            width: 20px !important;
            height: 20px !important;
        }
        
        /* Suggestions Area */
        #chatbot-root-container .suggestions-area {
            padding: 10px 15px !important;
            background-color: var(--card-background) !important;
            border-top: 1px solid var(--border-color) !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            justify-content: flex-start !important;
        }

        #chatbot-root-container .suggestion-button {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: var(--text-color-light) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 20px !important;
            padding: 8px 12px !important;
            cursor: pointer !important;
            font-size: 0.85em !important;
            transition: background-color 0.2s ease, border-color 0.2s ease !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important; /* Prevent shrinking on small screens */
        }

        #chatbot-root-container .suggestion-button:hover {
            background-color: rgba(255, 255, 255, 0.2) !important;
            border-color: var(--primary-color) !important;
        }

        /* Mobile Responsiveness */
        @media (max-width: 600px) {
            #chatbot-root-container .chat-window {
                bottom: 0 !important;
                right: 0 !important;
                width: 100% !important;
                height: 100% !important;
                border-radius: 0 !important;
            }
            #chatbot-root-container .chat-header {
                border-radius: 0 !important;
            }
            #chatbot-root-container .chat-toggle-container {
                bottom: 10px !important;
                right: 10px !important;
            }
        }

        /* Helper class to completely hide elements */
        .hidden-element { 
            display: none !important;
        }
    `;

    // (Remaining chatbotHTML and JavaScript logic remains the same as previous version)
    // --- HTML Structure (as a single string) ---
    // This HTML will be injected into the client's page's <body> section.
    // Dynamic values (logo, brand name) are embedded using template literals.
    const chatbotHTML = `
        <!-- Floating Chat Icon and Welcome Bubble -->
        <div class="chat-toggle-container">
            <div id="initial-bubble" class="initial-bubble hidden-element">
                Hello 👋 Need help?
            </div>
            <button id="chat-icon" class="chat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path fill-rule="evenodd" d="M4.848 2.771A9.005 9.005 0 0 1 12 1.5c4.981 0 9.005 4.024 9.005 9.005 0 1.956-.624 3.756-1.684 5.232L19.5 21l-3.573-1.072a9.006 9.006 0 0 1-5.92-.716L4.848 2.771ZM12 4.5a7.505 7.505 0 0 0-7.504 7.505c0 1.134.195 2.228.567 3.253l-.97 2.91 2.91-.97A7.505 7.505 0 0 0 12 19.5a7.505 7.505 0 0 0 7.505-7.504 7.505 7.505 0 0 0-7.505-7.504Z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>

        <!-- Chat Window (initially hidden) -->
        <div id="chat-window" class="chat-window hidden-display">
            <div class="chat-header">
                <div class="header-info">
                    <img src="${CHATBOT_LOGO_URL}" alt="${CHATBOT_BRAND_NAME} Logo" class="brand-logo"> 
                    <div class="title-status">
                        <h2 id="chatbot-brand-name">${CHATBOT_BRAND_NAME}</h2> 
                        <p class="online-status">Online</p>
                    </div>
                </div>
                <button id="close-chat" class="close-button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                        <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
            <div id="chat-box" class="chat-box"></div>
            
            <!-- Suggestions Area -->
            <div id="suggestions-area" class="suggestions-area hidden-element"> 
                <!-- Pre-written messages will be added here by JavaScript -->
            </div>

            <div class="input-area">
                <input type="text" id="user-input" placeholder="Type your message...">
                <button id="send-button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                        <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                    </svg>
                </button>
            </div>
        </div>
    `;

    // --- Core Chatbot JavaScript Logic ---
    // This function orchestrates the entire chatbot initialization and functionality.
    function initializeChatbot() {
        // Dynamically load marked.js if it's not already available on the client's page.
        if (typeof marked === 'undefined') {
            const markedScript = document.createElement('script');
            markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            markedScript.onload = _initChatbotElements; // Initialize elements after marked.js loads
            document.head.appendChild(markedScript);
        } else {
            _initChatbotElements(); // marked.js is already loaded, proceed directly
        }
    }

    // Function to get DOM elements and set up event listeners
    function _initChatbotElements() {
        // Get references to all necessary DOM elements
        const chatIcon = document.getElementById('chat-icon');
        const initialBubble = document.getElementById('initial-bubble');
        const chatWindow = document.getElementById('chat-window');
        const closeChatButton = document.getElementById('close-chat');
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const suggestionsArea = document.getElementById('suggestions-area');

        // Retrieve or generate a unique session ID for the user
        let sessionId = localStorage.getItem('chatbotSessionId');
        if (!sessionId) {
            sessionId = crypto.randomUUID(); // Generate a new UUID
            localStorage.setItem('chatbotSessionId', sessionId);
            console.log('New Chatbot Session ID created:', sessionId);
        } else {
            console.log('Reusing Chatbot Session ID:', sessionId);
        }

        // Function to append messages to the chat box UI
        function appendMessage(sender, message, isMarkdown = false, extraClass = '') {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', `${sender}-message`);
            if (extraClass) {
                messageElement.classList.add(extraClass);
            }

            // If it's a bot message and markdown parsing is requested, use marked.js
            if (isMarkdown && sender === 'bot' && typeof marked !== 'undefined') {
                messageElement.innerHTML = marked.parse(message);
            } else {
                messageElement.textContent = message; // Otherwise, use plain text
            }
            
            chatBox.appendChild(messageElement);
            chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom of the chat
            return messageElement; // Return element for potential future manipulation (e.g., removing typing indicator)
        }

        // Function to create and display suggestion buttons
        function populateSuggestions() {
            suggestionsArea.innerHTML = ''; // Clear any existing suggestions
            predefinedSuggestions.forEach(suggestionText => {
                const button = document.createElement('button');
                button.classList.add('suggestion-button');
                button.textContent = suggestionText;
                button.addEventListener('click', () => {
                    userInput.value = suggestionText; // Set input value to suggestion
                    sendMessage(); // Send the suggestion as a message
                });
                suggestionsArea.appendChild(button);
            });
        }

        // Function to send user messages to the N8n webhook
        async function sendMessage() {
            const userMessage = userInput.value.trim();

            if (userMessage === '') {
                return; // Do nothing if the message is empty
            }

            suggestionsArea.classList.add('hidden-element'); // Hide suggestions after a message is sent

            appendMessage('user', userMessage); // Display user's message in the chat
            userInput.value = ''; // Clear the input field

            const typingIndicator = appendMessage('bot', 'Typing...', false, 'typing-indicator'); // Show typing indicator

            try {
                const response = await fetch(N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        message: userMessage, 
                        sessionId: sessionId // Send the session ID with each message
                    }), 
                });

                if (!response.ok) {
                    // Throw an error if HTTP status is not 2xx
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json(); // Parse the JSON response from N8n

                typingIndicator.remove(); // Remove the typing indicator

                const botReply = data.reply || "Sorry, I'm having trouble responding right now.";
                appendMessage('bot', botReply, true); // Display bot's reply (assuming Markdown)

            } catch (error) {
                console.error('Error communicating with N8n webhook:', error);
                if (typingIndicator.parentNode) {
                    typingIndicator.remove(); // Remove typing indicator even on error
                }
                appendMessage('bot', 'Sorry, there was an issue processing your request. Please try again later.', false, 'error-message');
                suggestionsArea.classList.remove('hidden-element'); // Show suggestions again for retry
            }
        }

        // --- UI Interactions ---
        // Function to open the chat window
        function openChat() {
            chatWindow.classList.remove('hidden-display'); // Make chat window visible
            chatWindow.classList.add('visible');
            initialBubble.classList.remove('visible');
            initialBubble.classList.add('hidden-element'); // Hide initial bubble
            chatIcon.classList.add('hidden-element'); // Hide chat icon

            // Only display initial bot message and populate suggestions if chat history is empty
            // Check if chatBox has no children OR if it only contains the very first bot message
            if (chatBox.children.length === 0 || (chatBox.children.length === 1 && chatBox.children[0].classList.contains('bot-message'))) { 
                if (chatBox.children.length === 0) { // Only append if truly empty
                    appendMessage('bot', initialBotWelcomeMessage, false);
                }
                populateSuggestions();
                suggestionsArea.classList.remove('hidden-element'); // Ensure suggestions are visible
            } else {
                // If there's existing conversation, just make sure suggestions are visible
                suggestionsArea.classList.remove('hidden-element'); 
            }

            userInput.focus(); // Focus on the input field
            chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
        }

        // Function to close the chat window
        function closeChat() {
            chatWindow.classList.remove('visible');
            chatWindow.classList.add('hidden-display'); // Completely hide chat window
            chatIcon.classList.remove('hidden-element'); // Show chat icon again
            suggestionsArea.classList.add('hidden-element'); // Hide suggestions when chat is closed
            // Show the initial bubble after a short delay
            setTimeout(() => {
                initialBubble.classList.remove('hidden-element');
                initialBubble.classList.add('visible');
            }, 500); 
        }

        // Attach event listeners to UI elements
        chatIcon.addEventListener('click', openChat);
        initialBubble.addEventListener('click', openChat);
        closeChatButton.addEventListener('click', closeChat);
        sendButton.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });

        // Show the initial bubble after a delay on initial script load
        setTimeout(() => {
            initialBubble.classList.remove('hidden-element');
            initialBubble.classList.add('visible');
        }, 1000);
    } // End of _initChatbotElements

    // --- Inject styles and HTML into the client's page ---

    // Create a <style> tag and inject all chatbot CSS
    const styleTag = document.createElement('style');
    styleTag.textContent = chatbotStyles;
    document.head.appendChild(styleTag);

    // Create a root <div> for the chatbot and inject all HTML
    const chatbotRootContainer = document.createElement('div');
    chatbotRootContainer.id = 'chatbot-root-container'; // Unique ID for encapsulation
    chatbotRootContainer.innerHTML = chatbotHTML;
    document.body.appendChild(chatbotRootContainer);

    // Finally, initialize the chatbot logic after DOM elements are available
    initializeChatbot();

})(); // End of IIFE