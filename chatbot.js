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
    // Unique class names (e.g., hidden-element, hidden-display) are used to avoid conflicts with client's CSS.
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
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            outline: none;
            border: none;
            text-decoration: none;
            line-height: 1.5;
        }
        #chatbot-root-container {
            /* Position relative to avoid interfering with client's absolute/fixed elements */
            position: relative; 
            z-index: 2147483647; /* Max z-index to ensure chatbot is always on top */
            font-size: 16px; /* Base font size */
        }

        /* --- Chat Toggle Icon and Welcome Bubble --- */
        .chat-toggle-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000; /* Z-index within the chatbot context */
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        .initial-bubble {
            background-color: var(--card-background);
            color: var(--text-color-light);
            padding: 10px 15px;
            border-radius: 20px;
            margin-bottom: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.9em;
        }

        .initial-bubble.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .chat-icon {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            transition: background-color 0.3s ease, transform 0.3s ease;
        }

        .chat-icon:hover {
            background-color: var(--primary-dark);
            transform: scale(1.05);
        }

        .chat-icon svg {
            width: 30px;
            height: 30px;
        }

        /* --- Chat Window --- */
        .chat-window {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            height: 500px;
            background-color: var(--card-background);
            border-radius: 15px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transform: scale(0.8);
            opacity: 0;
            pointer-events: none; /* Do not accept clicks when hidden */
            transition: transform 0.3s ease-out, opacity 0.3s ease-out;
            z-index: 1001; /* Higher z-index than the icon within chatbot context */
        }

        .chat-window.visible {
            transform: scale(1);
            opacity: 1;
            pointer-events: auto;
        }

        .chat-window.hidden-display { /* Use display: none for complete hiding */
            display: none !important;
        }


        .chat-header {
            background-color: var(--primary-color);
            color: white;
            padding: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top-left-radius: 15px;
            border-top-right-radius: 15px;
        }

        .chat-header .header-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .brand-logo { /* Brand Logo Styling */
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 8px;
            object-fit: cover;
        }

        .chat-header h2 {
            margin: 0;
            font-size: 1.1em;
            font-weight: 600;
            white-space: nowrap; /* Prevent brand name from wrapping */
        }

        .chat-header .online-status {
            margin: 0;
            font-size: 0.8em;
            color: rgba(255, 255, 255, 0.8);
        }

        .close-button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 5px;
            border-radius: 5px;
            transition: background-color 0.2s ease;
        }

        .close-button:hover {
            background-color: var(--primary-dark);
        }

        .close-button svg {
            width: 24px;
            height: 24px;
        }

        .chat-box {
            flex-grow: 1;
            padding: 20px;
            overflow-y: auto;
            background-color: var(--background-dark);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .message {
            max-width: 80%;
            padding: 10px 15px;
            border-radius: 15px;
            word-wrap: break-word;
            font-size: 0.9em;
            line-height: 1.4;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .user-message {
            background-color: var(--message-user-bg);
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 5px;
        }

        .bot-message {
            background-color: var(--message-bot-bg);
            color: var(--text-color-light);
            align-self: flex-start;
            border-bottom-left-radius: 5px;
        }

        /* Styling for Markdown rendering */
        .bot-message h1, .bot-message h2, .bot-message h3, .bot-message h4 {
            color: var(--primary-color);
            margin-top: 10px;
            margin-bottom: 5px;
        }
        .bot-message p {
            margin-bottom: 5px;
        }
        .bot-message ul, .bot-message ol {
            list-style-type: none; /* Remove default bullets/numbers */
            padding-left: 0;     /* Remove default padding from ul/ol */
            margin-left: 20px;   /* Keep this for overall list indentation */
            margin-bottom: 0;    /* Remove default bottom margin for ul/ol */
        }
        .bot-message ul li, .bot-message ol li {
            display: flex;         /* Use flexbox for easy alignment of icon and text */
            align-items: flex-start; /* Align the emoji and text at the top */
            margin-bottom: 8px;    /* Spacing between individual list items */
        }
        .bot-message ul li::before,
        .bot-message ol li::before {
            content: "✅";        /* The checkmark emoji for list markers */
            margin-right: 8px;     /* Space between emoji and list item text */
            flex-shrink: 0;        /* Prevent the emoji from shrinking if text is long */
        }
        .bot-message code {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.85em;
        }
        .bot-message pre {
            background-color: rgba(255, 255, 255, 0.15);
            padding: 8px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.85em;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        .bot-message strong {
            color: var(--primary-color);
        }

        .typing-indicator {
            background-color: var(--message-bot-bg);
            color: var(--primary-color);
            font-style: italic;
            opacity: 0.8;
            animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
        }

        .error-message {
            background-color: #721c24;
            color: #f8d7da;
        }

        .input-area {
            display: flex;
            padding: 15px;
            border-top: 1px solid var(--border-color);
            background-color: var(--card-background);
        }

        #user-input {
            flex-grow: 1;
            padding: 10px 15px;
            border: 1px solid var(--border-color);
            border-radius: 20px;
            font-size: 1em;
            margin-right: 10px;
            background-color: var(--background-dark);
            color: var(--text-color-light);
            transition: border-color 0.3s;
        }

        #user-input::placeholder {
            color: var(--text-color-dark);
        }

        #user-input:focus {
            border-color: var(--primary-color);
        }

        #send-button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            font-size: 1.2em;
            transition: background-color 0.3s ease, transform 0.2s ease;
        }

        #send-button:hover {
            background-color: var(--primary-dark);
        }
        #send-button:active {
            transform: scale(0.95);
        }

        #send-button svg {
            width: 20px;
            height: 20px;
        }
        
        /* Suggestions Area */
        .suggestions-area {
            padding: 10px 15px;
            background-color: var(--card-background);
            border-top: 1px solid var(--border-color);
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: flex-start;
        }

        .suggestion-button {
            background-color: rgba(255, 255, 255, 0.1);
            color: var(--text-color-light);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 0.85em;
            transition: background-color 0.2s ease, border-color 0.2s ease;
            white-space: nowrap;
        }

        .suggestion-button:hover {
            background-color: rgba(255, 255, 255, 0.2);
            border-color: var(--primary-color);
        }

        /* Mobile Responsiveness */
        @media (max-width: 600px) {
            .chat-window {
                bottom: 0;
                right: 0;
                width: 100%;
                height: 100%;
                border-radius: 0;
            }
            .chat-header {
                border-radius: 0;
            }
            .chat-toggle-container {
                bottom: 10px;
                right: 10px;
            }
        }

        /* Helper class to completely hide elements */
        .hidden-element { 
            display: none !important;
        }
    `;

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