(function() { // IIFE (Immediately Invoked Function Expression) to prevent global scope pollution

    // --- Configuration (Client-specific, read from script tag data attributes) ---
    const currentScript = document.currentScript;

    // Core configurations
    const N8N_WEBHOOK_URL = currentScript.dataset.webhookUrl || 'YOUR_N8N_WEBHOOK_URL_HERE'; 
    const CHATBOT_BRAND_NAME = currentScript.dataset.brandName || 'AI Assistant'; 
    const CHATBOT_LOGO_URL = currentScript.dataset.logoUrl || 'https://www.vectorlogo.co/assets/logos/a/adobe-stock-logo-B114389BA1-seeklogo.com.png'; 
    const AUTO_OPEN_CHAT = currentScript.dataset.autoOpen === 'true'; 
    const SHOW_SUGGESTIONS_ONCE = currentScript.dataset.showSuggestionsOnce === 'true'; 

    // Customizable colors
    const PRIMARY_COLOR = currentScript.dataset.primaryColor || '#6C5CE7'; // Default purple
    const SECONDARY_COLOR = currentScript.dataset.secondaryColor || '#5a4acb'; // Default darker purple

    // Customizable Font Awesome icon classes (new data attributes)
    const CHAT_ICON_CLASS = currentScript.dataset.chatIconClass || 'fa-solid fa-comment';
    const CLOSE_ICON_CLASS = currentScript.dataset.closeIconClass || 'fa-solid fa-xmark';
    const SEND_ICON_CLASS = currentScript.dataset.sendIconClass || 'fa-solid fa-paper-plane';


    const initialBotWelcomeMessage = currentScript.dataset.welcomeMessage || "Hello 👋 How can I help you today?";

    let predefinedSuggestions = [];
    const suggestionsJson = currentScript.dataset.suggestions;
    if (suggestionsJson) {
        try {
            const parsedSuggestions = JSON.parse(suggestionsJson);
            if (Array.isArray(parsedSuggestions) && parsedSuggestions.every(s => typeof s === 'string')) {
                predefinedSuggestions = parsedSuggestions;
            } else {
                console.warn("Chatbot: 'data-suggestions' attribute is not a valid JSON array of strings. Using default suggestions.");
            }
        } catch (e) {
            console.error("Chatbot: Error parsing 'data-suggestions' JSON:", e);
            console.warn("Using default suggestions.");
        }
    }
    
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
    // Each rule is prefixed with '#chatbot-root-container' and uses '!important' to ensure high specificity
    // and prevent conflicts with the client's website's CSS.
    const chatbotStyles = `
        :root {
            --primary-color: ${PRIMARY_COLOR} !important;
            --primary-dark: ${SECONDARY_COLOR} !important;
            --background-dark: #1A1A2E !important;
            --card-background: #202035 !important;
            --text-color-light: #E0E0E0 !important;
            --text-color-dark: #C0C0C0 !important;
            --message-bot-bg: #303045 !important;
            --message-user-bg: var(--primary-color) !important;
            --border-color: #444 !important;
        }

        /* --- Global Reset & Base Styles for the chatbot root container --- */
        #chatbot-root-container *, #chatbot-root-container *::before, #chatbot-root-container *::after {
            box-sizing: border-box !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            outline: none !important;
            border: none !important;
            text-decoration: none !important;
            line-height: 1.5 !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            color: inherit !important;
            background-color: transparent !important; 
        }
        #chatbot-root-container {
            position: relative !important; 
            z-index: 2147483647 !important;
            font-size: 16px !important;
            display: block !important;
            width: 0 !important;
            height: 0 !important;
        }

        /* --- Chat Toggle Icon and Bubble --- */
        #chatbot-root-container .chat-toggle-container {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 1000 !important;
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

        /* Font Awesome icons within buttons - ensure they are visible and correctly sized */
        #chatbot-root-container .chat-icon i,
        #chatbot-root-container .close-button i,
        #chatbot-root-container #send-button i {
            font-size: 1.6em !important; /* Increased size for better visibility */
            line-height: 1 !important; /* Helps with vertical centering */
            color: inherit !important; /* Ensure icon color matches button text color */
            -webkit-text-stroke: 0 !important; /* Prevent outline issues from client CSS */
            text-shadow: none !important; /* Prevent text shadows from client CSS */
        }

        /* --- Chat Window --- */
        #chatbot-root-container .chat-window {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            width: 400px !important; /* Increased width */
            height: 600px !important; /* Increased height */
            background-color: var(--card-background) !important;
            border-radius: 15px !important;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5) !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            transform: scale(0.8) !important;
            opacity: 0 !important;
            pointer-events: none !important;
            transition: transform 0.3s ease-out, opacity 0.3s ease-out !important;
            z-index: 1001 !important;
        }

        #chatbot-root-container .chat-window.visible {
            transform: scale(1) !important;
            opacity: 1 !important;
            pointer-events: auto !important;
        }

        #chatbot-root-container .chat-window.hidden-display {
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
            flex-wrap: nowrap !important;
        }

        #chatbot-root-container .chat-header .header-info {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            flex-grow: 1 !important;
            min-width: 0 !important; 
            position: relative !important;
        }

        #chatbot-root-container .brand-logo {
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            margin-right: 8px !important;
            object-fit: cover !important;
            flex-shrink: 0 !important;
        }
        /* Online indicator on logo */
        #chatbot-root-container .brand-logo-wrapper {
            position: relative !important;
            flex-shrink: 0 !important;
        }
        #chatbot-root-container .online-indicator {
            position: absolute !important;
            bottom: 0 !important;
            right: 5px !important; 
            width: 8px !important;
            height: 8px !important;
            background-color: #28a745 !important; /* Green color */
            border-radius: 50% !important;
            border: 1.5px solid var(--primary-color) !important; 
            z-index: 1 !important;
        }


        #chatbot-root-container .chat-header .title-status {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            flex-grow: 1 !important;
            min-width: 0 !important;
            padding-right: 10px !important;
        }

        #chatbot-root-container .chat-header h2 {
            margin: 0 !important;
            font-size: 1.1em !important;
            font-weight: 600 !important;
            white-space: nowrap !important; 
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            flex-shrink: 1 !important;
            min-width: 0 !important; 
        }
        
        #chatbot-root-container .chat-header .online-status {
            margin: 0 !important;
            font-size: 0.8em !important;
            color: rgba(255, 255, 255, 0.8) !important;
            flex-shrink: 0 !important;
        }

        #chatbot-root-container .close-button {
            background: none !important;
            border: none !important;
            color: white !important;
            cursor: pointer !important;
            padding: 5px !important;
            border-radius: 5px !important;
            transition: background-color 0.2s ease !important;
            flex-shrink: 0 !important;
            margin-left: auto !important;
        }

        #chatbot-root-container .close-button:hover {
            background-color: var(--primary-dark) !important;
        }

        #chatbot-root-container .close-button i {
            font-size: 1.2em !important; /* Adjusted to match other icons for consistency */
            line-height: 1 !important;
            color: inherit !important;
            -webkit-text-stroke: 0 !important;
            text-shadow: none !important;
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
            text-align: left !important;
            padding: 10px 15px !important;
        }

        /* Styling for Markdown rendering */
        #chatbot-root-container .bot-message * {
            margin: 0 !important;
            padding: 0 !important;
            text-align: inherit !important;
            background-color: transparent !important; /* Ensure background is transparent */
            font-size: inherit !important; /* Inherit base font size */
            font-weight: inherit !important; /* Inherit base font weight */
            color: inherit !important; /* Inherit base color */
            line-height: inherit !important; /* Inherit base line height */
        }
        
        #chatbot-root-container .bot-message h1,
        #chatbot-root-container .bot-message h2,
        #chatbot-root-container .bot-message h3,
        #chatbot-root-container .bot-message h4 {
            color: var(--primary-color) !important;
            margin-top: 10px !important;
            margin-bottom: 5px !important;
            font-size: 1.1em !important;
            font-weight: 600 !important; /* Ensure headers are bold */
        }
        #chatbot-root-container .bot-message p {
            margin-bottom: 8px !important;
            word-break: break-word !important;
        }
        #chatbot-root-container .bot-message ul,
        #chatbot-root-container .bot-message ol {
            list-style-type: none !important;
            padding-left: 0 !important;
            margin-left: 20px !important;
            margin-bottom: 8px !important;
        }
        #chatbot-root-container .bot-message ul li,
        #chatbot-root-container .bot-message ol li {
            display: flex !important; 
            align-items: flex-start !important;
            margin-bottom: 5px !important;
            line-height: 1.4 !important;
        }
        #chatbot-root-container .bot-message ul li::before,
        #chatbot-root-container .bot-message ol li::before {
            content: "✅" !important;
            margin-right: 8px !important;
            flex-shrink: 0 !important;
            line-height: inherit !important;
            font-size: 1em !important;
        }
        #chatbot-root-container .bot-message code {
            background-color: rgba(255, 255, 255, 0.1) !important;
            padding: 2px 4px !important;
            border-radius: 3px !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 0.85em !important;
            white-space: pre-wrap !important;
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
            white-space: pre-wrap !important;
        }
        #chatbot-root-container .bot-message strong {
            color: #fff !important;
            font-weight: bold !important;
            display: inline !important;
            white-space: normal !important;
            word-break: break-word !important;
        }
        #chatbot-root-container .bot-message em {
            font-style: italic !important;
            color: var(--text-color-light) !important;
        }
        
        #chatbot-root-container .bot-message img {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 10px 0 !important;
        }

        #chatbot-root-container .bot-message a {
            color: var(--primary-color) !important;
            text-decoration: underline !important;
        }
        #chatbot-root-container .bot-message a:hover {
            text-decoration: none !important;
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
            opacity: 1 !important;
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

        #chatbot-root-container #send-button i {
            font-size: 1.2em !important;
            line-height: 1 !important;
            color: inherit !important;
            -webkit-text-stroke: 0 !important;
            text-shadow: none !important;
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
            max-height: 150px !important;
            overflow-y: auto !important;
            opacity: 1 !important;
            transition: max-height 0.3s ease-out, opacity 0.3s ease-out, padding 0.3s ease-out, border-top 0.3s ease-out !important;
        }

        /* Helper class to completely hide elements (with smooth transition for suggestions) */
        #chatbot-root-container .hidden-element { 
            display: none !important; 
            max-height: 0 !important; 
            opacity: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            border-top: none !important;
            overflow: hidden !important;
            pointer-events: none !important;
            margin: 0 !important;
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
            flex-shrink: 0 !important;
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
    `;

    // --- HTML Structure (as a single string) ---
    const chatbotHTML = `
        <!-- Floating Chat Icon and Welcome Bubble -->
        <div class="chat-toggle-container">
            <div id="initial-bubble" class="initial-bubble hidden-element">
                Hello 👋 Need help?
            </div>
            <button id="chat-icon" class="chat-icon">
                <i class="${CHAT_ICON_CLASS}"></i>
            </button>
        </div>

        <!-- Chat Window (initially hidden) -->
        <div id="chat-window" class="chat-window hidden-display">
            <div class="chat-header">
                <div class="header-info">
                    <div class="brand-logo-wrapper"> <!-- Wrapper for logo and online indicator -->
                        <img src="${CHATBOT_LOGO_URL}" alt="${CHATBOT_BRAND_NAME} Logo" class="brand-logo"> 
                        <span class="online-indicator"></span> <!-- Online indicator -->
                    </div>
                    <div class="title-status">
                        <h2 id="chatbot-brand-name">${CHATBOT_BRAND_NAME}</h2> 
                        <p class="online-status">Online</p>
                    </div>
                </div>
                <button id="close-chat" class="close-button">
                    <i class="${CLOSE_ICON_CLASS}"></i>
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
                    <i class="${SEND_ICON_CLASS}"></i>
                </button>
            </div>
        </div>
    `;

    // --- Core Chatbot JavaScript Logic ---
    function initializeChatbot() {
        // Dynamically load Font Awesome CSS FIRST
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'; // Using Font Awesome 6 CDN
        document.head.appendChild(fontAwesomeLink);

        // Dynamically load marked.js after Font Awesome (or if FA is already loaded)
        let markedLoaded = false;
        let fontAwesomeLoaded = false;

        const checkDependenciesAndInit = () => {
            if (markedLoaded && fontAwesomeLoaded) {
                _initChatbotElements();
            }
        };

        // marked.js loading
        if (typeof marked === 'undefined') {
            const markedScript = document.createElement('script');
            markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            markedScript.onload = () => { markedLoaded = true; checkDependenciesAndInit(); };
            document.head.appendChild(markedScript);
        } else {
            markedLoaded = true; // marked.js is already present
        }

        // Font Awesome loading (ensures it's loaded before init, even if marked.js was present)
        fontAwesomeLink.onload = () => { fontAwesomeLoaded = true; checkDependenciesAndInit(); };
        // In case Font Awesome loads very quickly or from cache and onload doesn't fire immediately
        if (fontAwesomeLink.sheet) { // Check if stylesheet is already loaded (for cached cases)
            fontAwesomeLoaded = true;
        }
        checkDependenciesAndInit(); // Check initially in case both are already loaded

    } // End of initializeChatbot function

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
        // Check if a new conversation should start (e.g., if page reloaded and not auto-opening)
        // A new conversation starts if no 'chatbotHasConversation' flag exists OR if auto-open is active AND no session ID exists
        const hasConversationStartedPreviously = localStorage.getItem('chatbotHasConversation') === 'true';
        const isNewBrowserSession = !localStorage.getItem('chatbotSessionId'); 

        if (isNewBrowserSession || (AUTO_OPEN_CHAT && !hasConversationStartedPreviously)) { // Reset session if new browser session or auto-open is enabled for a fresh convo
            sessionId = crypto.randomUUID(); // Generate a new UUID
            localStorage.setItem('chatbotSessionId', sessionId);
            localStorage.setItem('chatbotHasConversation', 'false'); // Reset conversation state
            console.log('Chatbot: New Session ID created or session reset for auto-open:', sessionId);
        } else {
            console.log('Chatbot: Reusing Session ID:', sessionId);
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
            // Only populate if SHOW_SUGGESTIONS_ONCE is false OR it's a new conversation
            const hasSentMessageInCurrentSession = localStorage.getItem('chatbotHasConversation') === 'true';

            if (predefinedSuggestions.length === 0 || (SHOW_SUGGESTIONS_ONCE && hasSentMessageInCurrentSession)) {
                suggestionsArea.classList.add('hidden-element'); // Hide if no suggestions or already shown once
                return;
            }
            
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
            // Ensure suggestions are visible when populated
            suggestionsArea.classList.remove('hidden-element');
        }

        // Function to send user messages to the N8n webhook
        async function sendMessage() {
            const userMessage = userInput.value.trim();

            if (userMessage === '') {
                return; // Do nothing if the message is empty
            }

            // Record that a message has been sent in this session
            localStorage.setItem('chatbotHasConversation', 'true');

            // Hide suggestions area smoothly when a message is sent
            suggestionsArea.classList.add('hidden-element'); 

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
                        sessionId: sessionId 
                    }), 
                });

                if (!response.ok) {
                    // Throw an error if HTTP status is not 2xx
                    throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText || 'Unknown error'}`);
                }

                const data = await response.json();

                typingIndicator.remove(); // Remove the typing indicator

                // --- IMPORTANT: Expecting 'output' key from N8n webhook ---
                const botReply = data.output || "Sorry, I'm having trouble responding right now. Please check my backend configuration.";
                
                appendMessage('bot', botReply, true); // Display bot's reply (assuming Markdown)

                // Only re-populate and show suggestions if SHOW_SUGGESTIONS_ONCE is false
                if (!SHOW_SUGGESTIONS_ONCE && predefinedSuggestions.length > 0) {
                   populateSuggestions(); 
                }

            } catch (error) {
                console.error('Chatbot: Error communicating with N8n webhook:', error);
                if (typingIndicator.parentNode) {
                    typingIndicator.remove(); // Remove typing indicator even on error
                }
                appendMessage('bot', 'Sorry, there was an issue processing your request. Please try again later. (Error: ' + error.message + ')', false, 'error-message');
                // If an error occurs, show suggestions again regardless of SHOW_SUGGESTIONS_ONCE, so user can try again
                if (predefinedSuggestions.length > 0) {
                    suggestionsArea.classList.remove('hidden-element'); 
                }
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

            // Check if it's the very first time opening in this browser session (or auto-open on reload)
            const hasSentMessageInCurrentSession = localStorage.getItem('chatbotHasConversation') === 'true';

            // Only display initial bot message and populate suggestions if chat history is empty
            const isChatBoxEmpty = chatBox.children.length === 0 || (chatBox.children.length === 1 && chatBox.children[0].classList.contains('bot-message') && !chatBox.children[0].classList.contains('error-message'));
            
            if (isChatBoxEmpty) { 
                if (chatBox.children.length === 0) {
                    appendMessage('bot', initialBotWelcomeMessage, false);
                }
                if (predefinedSuggestions.length > 0 && !(SHOW_SUGGESTIONS_ONCE && hasSentMessageInCurrentSession)) {
                    populateSuggestions(); // Populate and show if not hidden by SHOW_SUGGESTIONS_ONCE
                }
            } else {
                // If there's existing conversation, only show suggestions if SHOW_SUGGESTIONS_ONCE is false
                if (!SHOW_SUGGESTIONS_ONCE && predefinedSuggestions.length > 0) {
                    suggestionsArea.classList.remove('hidden-element');
                } else if (SHOW_SUGGESTIONS_ONCE && !hasSentMessageInCurrentSession && predefinedSuggestions.length > 0) {
                    // If SHOW_SUGGESTIONS_ONCE is true, but no message sent yet, show them
                     populateSuggestions();
                } else {
                    suggestionsArea.classList.add('hidden-element'); // Hide if already sent message and SHOW_SUGGESTIONS_ONCE is true
                }
            }

            userInput.focus(); // Focus on the input field
            chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
        }

        // Function to close the chat window
        function closeChat() {
            chatWindow.classList.remove('visible');
            chatWindow.classList.add('hidden-display'); // Completely hide chat window
            chatIcon.classList.remove('hidden-element'); // Show chat icon again
            // Ensure suggestions are hidden when chat closes
            suggestionsArea.classList.add('hidden-element'); 
            setTimeout(() => {
                initialBubble.classList.remove('hidden-element');
                initialBubble.classList.add('visible');
            }, 500); 
        }

        // Hide/Show suggestions when user starts typing
        userInput.addEventListener('input', () => {
            const hasSentMessageInCurrentSession = localStorage.getItem('chatbotHasConversation') === 'true';

            if (userInput.value.trim().length > 0) {
                suggestionsArea.classList.add('hidden-element');
            } else {
                // Show suggestions again if user clears the input field, provided they should be shown
                if (predefinedSuggestions.length > 0 && !(SHOW_SUGGESTIONS_ONCE && hasSentMessageInCurrentSession)) {
                    populateSuggestions(); 
                } else {
                    suggestionsArea.classList.add('hidden-element'); // Ensure hidden if SHOW_SUGGESTIONS_ONCE active
                }
            }
        });


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

        // Initial setup on script load
        if (AUTO_OPEN_CHAT) {
            // Delay slightly to ensure all elements are rendered before opening
            // This also provides time for Font Awesome to load its fonts
            setTimeout(openChat, 1500); // Increased delay slightly
        } else {
            // Show the initial bubble after a delay if auto-open is not enabled
            setTimeout(() => {
                initialBubble.classList.remove('hidden-element');
                initialBubble.classList.add('visible');
            }, 1000);
        }
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
