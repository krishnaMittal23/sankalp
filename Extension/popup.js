document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded. Initializing extension...');
    initializeExtension();
});

function initializeExtension() {
    console.log('Attempting to initialize extension functions.');
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            console.log('Tab clicked:', tab.dataset.tab);
            const tabName = tab.dataset.tab;

            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            if (tabName === 'saved') {
                console.log('Switching to saved texts tab. Calling loadSavedTexts().');
                loadSavedTexts();
            }
        });
    });
    const messagesDiv = document.getElementById('messages');
    const queryInput = document.getElementById('queryInput');
    const sendBtn = document.getElementById('sendBtn');

    if (!messagesDiv || !queryInput || !sendBtn) {
        console.error('❌ Critical error: One or more chat UI elements not found. Aborting initialization.');
        return;
    }

    sendBtn.addEventListener('click', sendQuery);
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter key pressed, sending query.');
            sendQuery();
        }
    });

    function sendQuery() {
        console.log('sendQuery function called.');
        const query = queryInput.value.trim();
        if (!query) {
            console.warn('Query is empty, ignoring request.');
            return;
        }
        
        console.log('User query:', query);
                if (messagesDiv.querySelector('.empty-state')) {
            messagesDiv.innerHTML = '';
        }
        addMessage(query, 'user');
        queryInput.value = '';
        const loadingId = addMessage('🤔 Thinking...', 'bot');
        console.log('Added loading message with ID:', loadingId);
        const messageTimeout = setTimeout(() => {
            console.error('Request timed out after 10 seconds.');
            removeMessage(loadingId);
            addMessage('⚠️ Request timeout. Please check if the backend server is running on localhost:3000', 'bot');
        }, 10000);

        try {
            console.log('Attempting to send message to background script...');
            chrome.runtime.sendMessage({
                action: 'queryChat',
                query: query
            }, (response) => {
                clearTimeout(messageTimeout);
                console.log('Received response from background script.');
                removeMessage(loadingId);

                if (chrome.runtime.lastError) {
                    console.error(' Chrome runtime error during message:', chrome.runtime.lastError.message);
                    addMessage(' Extension error. Please try reloading the extension.', 'bot');
                    return;
                }

                if (!response) {
                    console.error(' No response object received from background script.');
                    addMessage(' No response received. Please ensure the backend server is running.', 'bot');
                    return;
                }

                if (response.success) {
                    console.log('Chat query successful. Displaying response.');
                    const result = response.data;
                    let messageText = result.answer || 'No answer received';

                    if (result.sources && result.sources.length > 0) {
                        messageText += '<div class="source">📚 Sources: ';
                        result.sources.forEach((source, idx) => {
                            const sourceTitle = source.title || 'Untitled';
                            messageText += `<a href="${source.url}" target="_blank">${sourceTitle}</a>`;
                            if (idx < result.sources.length - 1) messageText += ', ';
                        });
                        messageText += '</div>';
                    }

                    addMessage(messageText, 'bot');
                } else {
                    console.error(' Chat query failed. Error:', response.error);
                    const errorMsg = response.error || 'Unknown error occurred';
                    addMessage(` Error: ${errorMsg}. Please make sure the backend server is running on localhost:3000`, 'bot');
                }
            });
        } catch (error) {
            console.error(' Caught an exception while trying to send message:', error);
            clearTimeout(messageTimeout);
            removeMessage(loadingId);
            addMessage(' Failed to send message. Please reload the extension.', 'bot');
        }
    }

    let messageIdCounter = 0;

    function addMessage(text, type) {
        const messageId = `msg-${messageIdCounter++}`;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.id = messageId;
        messageDiv.innerHTML = text;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        console.log(`Message added. Type: ${type}, ID: ${messageId}`);
        return messageId;
    }

    function removeMessage(messageId) {
        const msg = document.getElementById(messageId);
        if (msg) {
            msg.remove();
            console.log('Removed message with ID:', messageId);
        } else {
            console.warn('Attempted to remove a message that does not exist:', messageId);
        }
    }

    function loadSavedTexts() {
        console.log('loadSavedTexts function called.');
        const savedTextsDiv = document.getElementById('savedTexts');
        if (!savedTextsDiv) {
            console.error('Saved texts UI element not found. Aborting load.');
            return;
        }
        savedTextsDiv.innerHTML = '<div class="loading">📚 Loading saved texts...</div>';
        
        const loadTimeout = setTimeout(() => {
            console.error('Loading of saved texts timed out after 8 seconds.');
            savedTextsDiv.innerHTML = `
                <div class="empty-state">
                    <p> Connection timeout</p>
                    <p style="margin-top: 10px; font-size: 14px;">Make sure the backend server is running:</p>
                    <p style="margin-top: 5px; font-size: 12px; color: #667eea; font-family: monospace;">cd backend && npm start</p>
                </div>
            `;
        }, 8000);
        
        try {
            console.log('Attempting to send "getSavedTexts" message to background script.');
            chrome.runtime.sendMessage({
                action: 'getSavedTexts'
            }, (response) => {
                clearTimeout(loadTimeout);
                console.log('Received response for saved texts.');
                
                if (chrome.runtime.lastError) {
                    console.error(' Chrome runtime error on loading texts:', chrome.runtime.lastError.message);
                    savedTextsDiv.innerHTML = `
                        <div class="empty-state">
                            <p>Extension error</p>
                            <p style="margin-top: 10px; font-size: 14px;">Please reload the extension</p>
                        </div>
                    `;
                    return;
                }

                if (!response) {
                    console.error(' No response object received for saved texts.');
                    savedTextsDiv.innerHTML = `
                        <div class="empty-state">
                            <p> No response from backend</p>
                            <p style="margin-top: 10px; font-size: 14px;">Make sure the server is running on localhost:3000</p>
                        </div>
                    `;
                    return;
                }
                
                if (response.success && response.data && Array.isArray(response.data.texts)) {
                    console.log('Saved texts loaded successfully. Count:', response.data.texts.length);
                    if (response.data.texts.length === 0) {
                        savedTextsDiv.innerHTML = `
                            <div class="empty-state">
                                <p>📝 No saved texts yet</p>
                                <p style="margin-top: 10px; font-size: 14px;">Select text on any webpage and click the 💾 Save button!</p>
                            </div>
                        `;
                    } else {
                        savedTextsDiv.innerHTML = '';
                        response.data.texts.forEach(item => {
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'saved-item';

                            const textPreview = item.text.substring(0, 200);
                            const needsEllipsis = item.text.length > 200;

                            itemDiv.innerHTML = `
                                <div class="text">${escapeHtml(textPreview)}${needsEllipsis ? '...' : ''}</div>
                                <div class="meta">
                                    <a href="${item.url}" target="_blank" class="url" title="${escapeHtml(item.url)}">${escapeHtml(item.title || item.url)}</a>
                                    <span>${formatDate(item.timestamp)}</span>
                                </div>
                            `;
                            savedTextsDiv.appendChild(itemDiv);
                        });
                        console.log('Rendered all saved texts.');
                    }
                } else {
                    console.error(' Response indicates failure or invalid data format for saved texts.');
                    const errorMsg = response.error || 'Unknown error';
                    savedTextsDiv.innerHTML = `
                        <div class="empty-state">
                            <p> Unable to load saved texts</p>
                            <p style="margin-top: 10px; font-size: 14px;">${escapeHtml(errorMsg)}</p>
                            <p style="margin-top: 5px; font-size: 12px; color: #999;">Check that backend server is running</p>
                        </div>
                    `;
                }
            });
        } catch (error) {
            console.error(' Caught an exception while trying to load saved texts:', error);
            clearTimeout(loadTimeout);
            savedTextsDiv.innerHTML = `
                <div class="empty-state">
                    <p> Failed to load texts</p>
                    <p style="margin-top: 10px; font-size: 14px;">Please reload the extension</p>
                </div>
            `;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return 'Unknown date';
        }
    }

    if (document.getElementById('saved')?.classList.contains('active')) {
        console.log('Saved tab is active on load. Initializing saved texts.');
        loadSavedTexts();
    } else {
        console.log('Saved tab is not active on load. Not loading saved texts yet.');
    }
}

console.log('Smart Text Saver popup script started.');