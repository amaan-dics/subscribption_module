/** @odoo-module **/

function initChat() {
    let currentUserId = null;

    function getBox() {
        return document.getElementById("chat-box");
    }

    function getInput() {
        return document.getElementById("msg_input");
    }

    function esc(s) {
        return (s || "")
            .replace(/<[^>]*>/g, "")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function showTermsPopup(content) {
        const old = document.getElementById("terms-overlay");
        if (old) {
            old.remove();
        }
        const wrapper = document.createElement("div");
        wrapper.id = "terms-overlay";
        wrapper.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.8);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: #111c14;
                    color: white;
                    width: 500px;
                    max-width: 95%;
                    border-radius: 8px;
                    border: 1px solid rgba(196, 154, 46, 0.2);
                    padding: 24px;
                ">
                    <h4 style="color: #c49a2e; font-family: 'Playfair Display', serif;">Terms & Conditions</h4>
                    <div style="
                        max-height: 300px;
                        overflow-y: auto;
                        margin-top: 15px;
                        margin-bottom: 20px;
                        font-size: 0.9rem;
                        color: rgba(255,255,255,0.8);
                    ">
                        ${content}
                    </div>
                    <div class="mb-4 d-flex align-items-center gap-2">
                        <input type="checkbox" id="accept_terms" style="cursor: pointer; width: 16px; height: 16px;"/>
                        <label for="accept_terms" style="cursor: pointer; margin: 0; font-size: 0.9rem;">
                            I agree to the Terms & Conditions
                        </label>
                    </div>
                    <button
                        id="accept_btn"
                        class="btn btn-gold w-100"
                        style="background: #e0b84a; color: #000; border: none; padding: 10px; border-radius: 4px; font-weight: 600;"
                        disabled>
                        CONTINUE
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper);
        const checkbox = document.getElementById("accept_terms");
        const btn = document.getElementById("accept_btn");
        checkbox.addEventListener("change", function () {
            btn.disabled = !checkbox.checked;
        });
        btn.addEventListener("click", async function () {
            try {
                await fetch('/chat/terms/accept', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "call",
                        params: {
                            user_id: currentUserId
                        }
                    })
                });
                wrapper.remove();
                await load();
            } catch (e) {
                console.error("ACCEPT ERROR:", e);
            }
        });
    }

    async function checkNotifications() {
        try {
            const r = await fetch('/portal/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {}
                })
            });
            const d = await r.json();
            const list = d.result.notifications || [];
            list.forEach(n => {
                showPopupNotification(n);
            });
        } catch (e) {
            console.error("Notification error:", e);
        }
    }

    function showPopupNotification(n) {
        let container = document.getElementById("chat-notification-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "chat-notification-container";
            container.className = "chat-notification-container";
            document.body.appendChild(container);
        }
        const notif = document.createElement("div");
        notif.className = "chat-notification";
        notif.innerHTML = `
        <img class="notif-avatar" src="${n.image || '/web/static/img/avatar.png'}"/>
        <div class="notif-content">
            <div class="notif-title">
                ${n.from}
            </div>
            <div class="notif-msg">
                ${n.message}
            </div>
        </div>
        `;
        container.appendChild(notif);
        setTimeout(() => {
            notif.classList.add("show");
        }, 50);
        notif.onclick = () => {
            window.location.href = `/chatbox?user_id=${parseInt(n.from_id)}`;
        };
        setTimeout(() => {
            notif.classList.remove("show");
            setTimeout(() => {
                notif.remove();
            }, 300);
        }, 5000);
    }

    async function checkTerms() {
        if (!currentUserId) {
            return true;
        }
        try {
            const res = await fetch('/chat/terms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        user_id: currentUserId
                    }
                })
            });
            const data = await res.json();
            const result = data.result || {};
            if (!result.accepted) {
                showTermsPopup(result.content || "Please accept terms.");
                return false;
            }
            return true;
        } catch (e) {
            console.error("TERMS ERROR:", e);
            return false;
        }
    }

    async function load() {
        if (!currentUserId) {
            return;
        }
        const box = getBox();
        if (!box) {
            return;
        }
        try {
            const r = await fetch('/chat/messages', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({jsonrpc: "2.0", method: "call", params: {user_id: currentUserId}})
            });
            const d = await r.json();
            const blockBtn = document.getElementById("block_user_btn");
            if (blockBtn) {
                if (d.result.channel_archived) {
                    blockBtn.innerHTML = <i class="fa fa-unlock me-2"/>
                    Unblock
                    User;
                    blockBtn.dataset.action = "unblock";
                } else {
                    blockBtn.innerHTML = <i class="fa fa-ban me-2"/>
                    Block
                    User;
                    blockBtn.dataset.action = "block";
                }
            }

            box.innerHTML = "";

            if (d.result.requiest_id_status == 'rejected') {
                $("#send_btn").attr("disabled", "disabled");
            } else {
                $("#send_btn").removeAttr("disabled", "disabled");
            }

            // ✅ ADD from chat.js — separator
            if (d.result.messages && d.result.messages.length > 0) {
                const sep = document.createElement("div");
                sep.className = "chat-date-separator";
                sep.innerHTML = "<span>LATEST MESSAGES</span>";
                box.appendChild(sep);
            }

            (d.result.messages || []).forEach(m => {
                const msg = document.createElement("div");
                msg.className = m.is_me ? "msg-wrapper msg-sent" : "msg-wrapper msg-received";

                let avatarHtml = "";
                if (!m.is_me) {
                    const activeContact = document.querySelector('.contact_item.active .contact-name');
                    const letter = activeContact ? activeContact.textContent.trim().charAt(0).toUpperCase() : 'U';
                    avatarHtml = <div class="msg-avatar-letter">${letter}</div>;
                }

                let timeText = "Sent";
                if (m.date) {
                    let dStr = m.date.replace(' ', 'T');
                    if (!dStr.endsWith('Z')) {
                        dStr += 'Z';
                    }
                    const d = new Date(dStr);
                    if (!isNaN(d.getTime())) {
                        const now = new Date();
                        const yesterday = new Date(now);
                        yesterday.setDate(now.getDate() - 1);
                        const timeString = d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', hour12: true});
                        if (d.toDateString() === now.toDateString()) {
                            timeText = Today, $
                            {
                                timeString
                            }
                            ;
                        } else if (d.toDateString() === yesterday.toDateString()) {
                            timeText = Yesterday, $
                            {
                                timeString
                            }
                            ;
                        } else {
                            const dateString = d.toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                            timeText = $
                            {
                                dateString
                            }
                            $
                            {
                                timeString
                            }
                            ;
                        }
                    } else {
                        timeText = m.date;
                    }
                }

                const doubleTickHtml = m.is_me ? <i class="fa fa-check-double text-gold ms-1"></i> : '';
                msg.innerHTML = `
                ${avatarHtml}
                <div class="msg-bubble">
                    ${esc(m.body)}
                    <div class="msg-time">${timeText} ${doubleTickHtml}</div>
                </div>
            `;
                box.appendChild(msg);
            });

            box.scrollTop = box.scrollHeight;
        } catch (e) {
            console.error("LOAD ERROR:", e);
        }
    }

    async function send() {
        const input = getInput();
        if (!input) {
            return;
        }
        const msg = input.value.trim();
        if (!msg || !currentUserId) {
            return;
        }
        const accepted = await checkTerms();
        if (!accepted) {
            return;
        }
        try {
            const response = await fetch('/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        user_id: currentUserId,
                        message: msg
                    }
                })
            });

            const data = await response.json();
            if (data.result.status === 'ok') {
                input.value = "";
                await load();
            }
        } catch (e) {
            console.error("SEND ERROR:", e);
        }
    }

    const chatSidebar = document.querySelector('.chat-sidebar');
    const btnToggle = document.getElementById('mobile_chat_toggle');
    const btnClose = document.getElementById('mobile_chat_close');
    if (btnToggle && chatSidebar) {
        btnToggle.addEventListener('click', function () {
            chatSidebar.classList.add('open');
        });
    }
    if (btnClose && chatSidebar) {
        btnClose.addEventListener('click', function () {
            chatSidebar.classList.remove('open');
        });
    }

    document.addEventListener("click", function (e) {
        const menuBtn = e.target.closest("#chat_menu_btn");
        const menu = document.getElementById("chat_menu_dropdown");
        if (menuBtn) {
            console.log("MENU CLICKED");
            menu.classList.remove("d-none");
            menu.style.display = "block";
            menu.style.position = "absolute";
            menu.style.top = "45px";
            menu.style.right = "0";
            menu.style.background = "#111c14";
            menu.style.border = "1px solid 1px solid #d4af37";
            menu.style.zIndex = "999999";
            return;
        }
    });

    document.addEventListener("click", async function (e) {
        const contact = e.target.closest(".contact_item");
        if (contact) {
            console.log("CONTACT CLICKED");
            console.log("DATASET =", contact.dataset);
            currentUserId = parseInt(contact.dataset.id);
            console.log("currentUserId SET =", currentUserId);
            e.preventDefault();
            document.querySelectorAll(".contact_item").forEach(x => x.classList.remove("active"));
            contact.classList.add("active");
            const accepted = await checkTerms();
            if (accepted) {
                load();
            }
            return;
        }
    });

    document.addEventListener("click", async function (e) {
        const btn = e.target.closest("#block_user_btn");
        if (!btn) {
            return;
        }
        if (!currentUserId) {
            alert("Please select a user.");
            return;
        }
        const action = btn.dataset.action || "block";
        try {
            btn.disabled = true;
            const response = await fetch('/chat/toggle_block', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        user_id: currentUserId,
                        action: action
                    }
                })
            });
            const data = await response.json();
            if (data.result?.status === "ok") {
                if (action === "block") {
                    btn.innerHTML = `
                    <i class="fa fa-unlock me-2"/>
                    Unblock User
                `;
                    btn.dataset.action = "unblock";
                } else {
                    btn.innerHTML = `
                    <i class="fa fa-ban me-2"/>
                    Block User
                `;
                    btn.dataset.action = "block";
                }
                await load();
            }
        } catch (err) {
            console.error("BLOCK ERROR:", err);
        } finally {
            btn.disabled = false;
        }
    });
    const params = new URLSearchParams(window.location.search);
    const selectedId = params.get("user_id");
    setTimeout(() => {
        const sendBtn = document.getElementById("send_btn");
        if (sendBtn) {
            sendBtn.addEventListener("click", function (e) {
                e.preventDefault();
                send();
            });
        }
    }, 300);
    if (selectedId) {
        setTimeout(() => {
            document.querySelector(`.contact_item[data-id="${selectedId}"]`)?.click();
        }, 300);
    } else {
        setTimeout(() => {
            document.querySelector(".contact_item")?.click();
        }, 300);
    }
    setInterval(load, 1000);
    setInterval(checkNotifications, 1000);
    checkNotifications();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChat);
} else {
    initChat();
}