// Chat functionality
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.querySelector('.message-input');
    const sendBtn = document.querySelector('.send-btn');
    const messagesContainer = document.querySelector('.messages-container');
    
    // Send message function
    function sendMessage() {
        const messageText = messageInput.value.trim();
        
        if (messageText) {
            // Create new message element
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message outgoing';
            
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    <p>${escapeHtml(messageText)}</p>
                    <span class="message-time">${timeString}</span>
                </div>
            `;
            
            // Add to messages container
            messagesContainer.appendChild(messageDiv);
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Clear input
            messageInput.value = '';
            
            // Simulate incoming message (for demo)
            setTimeout(() => {
                simulateIncomingMessage();
            }, 2000);
        }
    }
    
    // Simulate incoming message
    function simulateIncomingMessage() {
        const responses = [
            'Это отличная идея!',
            'Я подумаю над этим',
            'Договорились!',
            'Спасибо за сообщение',
            'Давай обсудим это позже'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message incoming';
        
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(randomResponse)}</p>
                <span class="message-time">${timeString}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Helper function to escape HTML
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    // Send button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Enter key to send
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Action buttons (placeholders)
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const title = this.getAttribute('title');
            alert(`Функция "${title}" будет доступна в следующих версиях`);
        });
    });
    
    // Scroll messages to bottom on load
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});
