// Message handling utilities
class MessageHandler {
    constructor() {
        this.messages = [];
        this.currentChat = null;
    }
    
    addMessage(chatId, message) {
        if (!this.messages[chatId]) {
            this.messages[chatId] = [];
        }
        
        this.messages[chatId].push({
            id: Date.now(),
            text: message.text,
            sender: message.sender,
            timestamp: new Date().toISOString(),
            type: message.type || 'text'
        });
    }
    
    getMessages(chatId) {
        return this.messages[chatId] || [];
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('ru-RU', options);
    }
}

// Initialize message handler
const messageHandler = new MessageHandler();
