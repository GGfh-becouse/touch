// ============ CALL SYSTEM ============
let callMgr = null, callMsgs = [], callChannel = null, msgChannel = null, currentCallId = null, callChatId = null;

function initCalls(uid) {
    callMgr = new CallManager(uid);
    callMgr.listenIncoming(c => showIncomingCall(c));
}

class CallManager {
    constructor(uid) { this.uid = uid }
    
    async startCall(receiverId) {
        const { data: c } = await db.from('calls')
            .insert({ caller_id: this.uid, receiver_id: receiverId, status: 'pending' })
            .select('*').single();
        if (c) { currentCallId = c.id; this.listenCall(c.id); return c }
        return null;
    }
    
    async acceptCall(cid) {
        await db.from('calls').update({ status: 'active' }).eq('id', cid);
        currentCallId = cid;
        this.listenMessages(cid);
    }
    
    async rejectCall(cid) {
        await db.from('calls').update({ status: 'rejected', ended_at: new Date() }).eq('id', cid);
    }
    
    async endCall() {
        const ms = [...callMsgs];
        callMsgs = [];
        if (currentCallId) {
            await db.from('calls').update({ status: 'ended', ended_at: new Date() }).eq('id', currentCallId);
            this.destroy();
        }
        return ms;
    }
    
    async sendMsg(txt) {
        if (!currentCallId) return;
        await db.from('call_messages').insert({ call_id: currentCallId, sender_id: this.uid, content: txt });
    }
    
    async saveToChat(cid, ms) {
        if (!ms.length) return;
        await db.from('messages').insert(ms.map(m => ({
            chat_id: cid,
            sender_id: m.sender_id,
            content: '📞 Звонок: ' + m.content,
            created_at: m.created_at
        })));
    }
    
    listenCall(cid) {
        callChannel = db.channel('call:' + cid)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: 'id=eq.' + cid }, p => {
                const c = p.new;
                if (c.status === 'active') { onCallActive(); this.listenMessages(cid); }
                else if (c.status === 'rejected') { onCallRejected(); this.destroy(); }
                else if (c.status === 'ended') onCallEnded();
            }).subscribe();
    }
    
    listenMessages(cid) {
        msgChannel = db.channel('callmsgs:' + cid)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_messages', filter: 'call_id=eq.' + cid }, p => {
                const m = p.new;
                if (m.sender_id !== this.uid) {
                    callMsgs.push(m);
                    showCallMsg(m, false);
                    setTimeout(() => hideCallMsg(m.id), 3000);
                }
            }).subscribe();
    }
    
    listenIncoming(cb) {
        return db.channel('incoming:' + this.uid)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls', filter: 'receiver_id=eq.' + this.uid }, p => {
                if (p.new.status === 'pending') cb(p.new);
            }).subscribe();
    }
    
    destroy() {
        if (callChannel) { db.removeChannel(callChannel); callChannel = null; }
        if (msgChannel) { db.removeChannel(msgChannel); msgChannel = null; }
        currentCallId = null;
    }
}

// ============ ДЕЙСТВИЯ ЗВОНКА ============
function startCall() {
    if (!chatId) return;
    // Находим собеседника в текущем чате
    db.from('chat_members').select('user_id').eq('chat_id', chatId).neq('user_id', user.id).single()
        .then(({ data }) => {
            if (data) {
                callChatId = chatId; // Сохраняем чат для сохранения переписки
                callMgr.startCall(data.user_id).then(c => {
                    if (c) {
                        openCallScreen(document.getElementById('chatTitle').textContent);
                        setCallStatus('Ожидание...');
                    }
                });
            } else alert('Собеседник не найден');
        });
}

function acceptCall() {
    const id = document.getElementById('incomingScreen').dataset.callId;
    callMgr.acceptCall(id);
    hideIncoming();
    openCallScreen('Собеседник');
    setCallStatus('Активен');
}

function rejectCall() {
    const id = document.getElementById('incomingScreen').dataset.callId;
    callMgr.rejectCall(id);
    hideIncoming();
}

function endCall() {
    callMgr.endCall().then(msgs => {
        closeCallScreen();
        if (msgs.length) showSaveModal();
    });
}

function sendCallMsg() {
    const inp = document.getElementById('callInput');
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    const msg = { id: 't' + Date.now(), sender_id: user.id, content: txt, created_at: new Date().toISOString() };
    showCallMsg(msg, true);
    callMgr.sendMsg(txt);
    setTimeout(() => hideCallMsg(msg.id), 3000);
}

function saveCall() {
    callMgr.saveToChat(callChatId || chatId, callMsgs).then(() => {
        hideSaveModal();
        alert('Сохранено в чат!');
    });
}

function discardCall() { hideSaveModal(); callMsgs = []; }

// ============ UI ЗВОНКА ============
function showIncomingCall(call) {
    const s = document.getElementById('incomingScreen');
    s.dataset.callId = call.id;
    s.classList.add('show');
    db.from('users').select('display_name').eq('id', call.caller_id).single().then(({ data }) => {
        if (data) {
            document.getElementById('incomingAvatar').textContent = data.display_name[0];
            document.getElementById('incomingName').textContent = data.display_name;
        }
    });
}

function hideIncoming() { document.getElementById('incomingScreen').classList.remove('show'); }

function openCallScreen(name) {
    document.getElementById('callAvatar').textContent = name[0];
    document.getElementById('callName').textContent = name;
    document.getElementById('callScreen').classList.add('show');
    document.getElementById('callMessages').innerHTML = '';
}

function closeCallScreen() { document.getElementById('callScreen').classList.remove('show'); }
function setCallStatus(s) { document.getElementById('callStatus').textContent = s; }

function showCallMsg(msg, isOut) {
    const c = document.getElementById('callMessages');
    const d = document.createElement('div');
    d.className = 'call-msg ' + (isOut ? 'outgoing' : 'incoming');
    d.id = 'cm-' + msg.id;
    d.innerHTML = '<div>' + msg.content + '</div><div style="font-size:10px;opacity:0.6;margin-top:4px">' + 
        new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</div>';
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
}

function hideCallMsg(id) {
    const el = document.getElementById('cm-' + id);
    if (el) { el.style.opacity = '0'; el.style.transform = 'scale(0.8)'; el.style.transition = '0.5s'; setTimeout(() => el.remove(), 500); }
}

function showSaveModal() { document.getElementById('saveModal').classList.add('show'); }
function hideSaveModal() { document.getElementById('saveModal').classList.remove('show'); }

function onCallActive() { setCallStatus('Активен'); hideIncoming(); }
function onCallRejected() { alert('Звонок отклонен'); closeCallScreen(); }
function onCallEnded() { closeCallScreen(); }
