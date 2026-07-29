// ============ CALL MANAGER ============

class CallManager {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
        this.currentCall = null;
        this.callChannel = null;
        this.msgChannel = null;
        this.messages = [];
    }

    async startCall(receiverId) {
        const { data: call, error } = await this.db
            .from('calls')
            .insert({ caller_id: this.userId, receiver_id: receiverId, status: 'pending' })
            .select('*').single();

        if (error) { console.error(error); return null; }

        this.currentCall = call;
        this.listenCall(call.id);
        return call;
    }

    async acceptCall(callId) {
        await this.db.from('calls').update({ status: 'active' }).eq('id', callId);
        this.currentCall = { id: callId, status: 'active' };
        this.listenMessages(callId);
        return true;
    }

    async rejectCall(callId) {
        await this.db.from('calls').update({ status: 'rejected', ended_at: new Date() }).eq('id', callId);
        this.destroy();
    }

    async endCall() {
        if (!this.currentCall) return [];
        const msgs = [...this.messages];
        await this.db.from('calls').update({ status: 'ended', ended_at: new Date() }).eq('id', this.currentCall.id);
        this.messages = [];
        this.destroy();
        return msgs;
    }

    async sendMessage(content) {
        if (!this.currentCall) return;
        await this.db.from('call_messages').insert({
            call_id: this.currentCall.id,
            sender_id: this.userId,
            content: content
        });
    }

    async saveToChat(chatId, messages) {
        if (!messages.length) return;
        const rows = messages.map(m => ({
            chat_id: chatId,
            sender_id: m.sender_id,
            content: '📞 Звонок: ' + m.content,
            created_at: m.created_at
        }));
        await this.db.from('messages').insert(rows);
    }

    listenCall(callId) {
        this.callChannel = this.db
            .channel('call:' + callId)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: 'id=eq.' + callId }, payload => {
                const c = payload.new;
                this.currentCall = c;
                if (c.status === 'active') { onCallActive(c); this.listenMessages(callId); }
                else if (c.status === 'rejected') { onCallRejected(); this.destroy(); }
                else if (c.status === 'ended') onCallEnded();
            }).subscribe();
    }

    listenMessages(callId) {
        this.msgChannel = this.db
            .channel('callmsgs:' + callId)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_messages', filter: 'call_id=eq.' + callId }, payload => {
                const m = payload.new;
                if (m.sender_id !== this.userId) {
                    this.messages.push(m);
                    showCallMessage(m, false);
                    setTimeout(() => hideCallMessage(m.id), 3000);
                }
            }).subscribe();
    }

    listenIncoming(cb) {
        return this.db
            .channel('incoming:' + this.userId)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls', filter: 'receiver_id=eq.' + this.userId }, payload => {
                if (payload.new.status === 'pending') cb(payload.new);
            }).subscribe();
    }

    destroy() {
        if (this.callChannel) { this.db.removeChannel(this.callChannel); this.callChannel = null; }
        if (this.msgChannel) { this.db.removeChannel(this.msgChannel); this.msgChannel = null; }
        this.currentCall = null;
    }
}

// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let callMgr = null;

// ============ ИНИЦИАЛИЗАЦИЯ ============
function initCalls(userId) {
    callMgr = new CallManager(db, userId);
    callMgr.listenIncoming(call => showIncomingCall(call));
}

// ============ ДЕЙСТВИЯ ============
function startCall(rid, rname) {
    callMgr.startCall(rid).then(call => {
        if (call) { openCallScreen(rname); setStatus('Ожидание...'); }
    });
}

function acceptCall() {
    const id = document.getElementById('incomingScreen').dataset.callId;
    callMgr.acceptCall(id).then(() => {
        hideIncoming();
        openCallScreen('Собеседник');
        setStatus('Активен');
    });
}

function rejectCall() {
    const id = document.getElementById('incomingScreen').dataset.callId;
    callMgr.rejectCall(id);
    hideIncoming();
}

function endCall() {
    callMgr.endCall().then(msgs => {
        closeCallScreen();
        if (msgs.length) showSaveModal(msgs);
    });
}

function sendCallMsg() {
    const inp = document.getElementById('callInput');
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    const msg = { id: 't' + Date.now(), sender_id: callMgr.userId, content: txt, created_at: new Date().toISOString() };
    showCallMessage(msg, true);
    callMgr.sendMessage(txt);
    setTimeout(() => hideCallMessage(msg.id), 3000);
}

function saveCall(chatId) {
    callMgr.saveToChat(chatId, callMgr.messages).then(() => {
        hideSaveModal();
        alert('Сохранено в чат!');
    });
}

function discardCall() { hideSaveModal(); }

// ============ UI ============
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
function setStatus(s) { document.getElementById('callStatus').textContent = s; }

function showCallMessage(msg, isOut) {
    const c = document.getElementById('callMessages');
    const d = document.createElement('div');
    d.className = 'call-message ' + (isOut ? 'outgoing' : 'incoming');
    d.id = 'cm-' + msg.id;
    d.innerHTML = '<div>' + msg.content + '</div><div class="call-msg-time">' + new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</div>';
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
}

function hideCallMessage(id) {
    const el = document.getElementById('cm-' + id);
    if (el) { el.style.transition = '0.5s'; el.style.opacity = '0'; el.style.transform = 'scale(0.8)'; setTimeout(() => el.remove(), 500); }
}

function showSaveModal(msgs) { document.getElementById('saveModal').classList.add('show'); }
function hideSaveModal() { document.getElementById('saveModal').classList.remove('show'); }

// Колбэки для CallManager
function onCallActive(c) { setStatus('Активен'); hideIncoming(); }
function onCallRejected() { alert('Звонок отклонен'); closeCallScreen(); }
function onCallEnded() { closeCallScreen(); }
