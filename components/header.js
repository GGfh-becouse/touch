// Header functionality
document.addEventListener('DOMContentLoaded', function() {
    const profileBtn = document.querySelector('.profile-btn');
    const profilePanel = document.querySelector('.profile-panel');
    const closeProfileBtn = document.querySelector('.close-profile-btn');
    
    // Toggle profile panel
    profileBtn.addEventListener('click', function() {
        if (profilePanel.style.display === 'none') {
            profilePanel.style.display = 'flex';
        } else {
            profilePanel.style.display = 'none';
        }
    });
    
    // Close profile panel
    closeProfileBtn.addEventListener('click', function() {
        profilePanel.style.display = 'none';
    });
    
    // Copy TID functionality
    const copyTidBtn = document.querySelector('.copy-tid-btn');
    const tidValue = document.querySelector('.tid-value');
    
    copyTidBtn.addEventListener('click', function() {
        const tid = tidValue.textContent;
        navigator.clipboard.writeText(tid).then(() => {
            // Show copied feedback
            const originalHTML = copyTidBtn.innerHTML;
            copyTidBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L7 12L13 4" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"/></svg>';
            
            setTimeout(() => {
                copyTidBtn.innerHTML = originalHTML;
            }, 2000);
        });
    });
});
