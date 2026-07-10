// Sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    const chatItems = document.querySelectorAll('.chat-item');
    const chatHeaderName = document.querySelector('.chat-header-name');
    const chatHeaderStatus = document.querySelector('.status-text');
    const chatHeaderAvatar = document.querySelector('.avatar-large');
    
    // Chat selection
    chatItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            chatItems.forEach(chat => chat.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Update chat header
            const name = this.querySelector('.chat-name').textContent;
            const avatarLetter = this.querySelector('.avatar').textContent;
            
            chatHeaderName.textContent = name;
            chatHeaderAvatar.textContent = avatarLetter;
            
            // Simulate online/offline status
            if (Math.random() > 0.5) {
                chatHeaderStatus.textContent = 'В сети';
                chatHeaderStatus.parentElement.querySelector('.status-indicator').style.background = '#4CAF50';
            } else {
                chatHeaderStatus.textContent = 'Был(а) недавно';
                chatHeaderStatus.parentElement.querySelector('.status-indicator').style.background = '#FFA726';
            }
        });
    });
    
    // Search functionality (placeholder)
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        chatItems.forEach(item => {
            const name = item.querySelector('.chat-name').textContent.toLowerCase();
            const message = item.querySelector('.chat-message').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || message.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    // New chat button (placeholder)
    const newChatBtn = document.querySelector('.new-chat-btn');
    newChatBtn.addEventListener('click', function() {
        alert('Функция создания нового чата будет доступна в следующих версиях');
    });
});
