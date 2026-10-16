/* AELTRIX Social prototype 0.1
 * Static GitHub Pages + manual WebRTC signaling.
 * WebRTC DataChannels are protected by DTLS in transit, but this prototype
 * does not authenticate peer identity or provide durable/offline delivery.
 */
const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "aeltrix.profile.v1";
const FRIENDS_KEY = "aeltrix.friends.v1";
let pc = null;
let channel = null;
let toastTimer = null;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveProfile() {
  const profile = {
    displayName: $("displayName").value.trim().slice(0, 32),
    username: $("username").value.trim().replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 24),
    bio: $("bio").value.trim().slice(0, 120)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  $("avatar").textContent = (profile.displayName || profile.username || "A").slice(0,1).toUpperCase();
  toast("تم حفظ الملف محليًا على هذا الجهاز.");
}
function loadProfile() {
  const p = readJson(STORAGE_KEY, {});
  $("displayName").value = p.displayName || "";
  $("username").value = p.username || "";
  $("bio").value = p.bio || "";
  $("avatar").textContent = (p.displayName || p.username || "A").slice(0,1).toUpperCase();
}
function renderFriends() {
  const friends = readJson(FRIENDS_KEY, []);
  const list = $("friendsList");
  list.replaceChildren();
  if (!friends.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "لا يوجد أصدقاء محفوظون بعد.";
    list.append(li);
    return;
  }
  friends.forEach((name, index) => {
    const li = document.createElement("li");
    li.textContent = name + " ";
    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "حذف";
    remove.style.padding = "3px 8px";
    remove.style.marginInlineStart = "8px";
    remove.addEventListener("click", () => {
      const next = readJson(FRIENDS_KEY, []);
      next.splice(index, 1);
      localStorage.setItem(FRIENDS_KEY, JSON.stringify(next));
      renderFriends();
    });
    li.append(remove);
    list.append(li);
  });
}
function addFriend() {
  const name = $("friendName").value.trim().slice(0,32);
  if (!name) return toast("اكتب اسم الصديق أولاً.");
  const friends = readJson(FRIENDS_KEY, []);
  if (friends.some(x => x.toLowerCase() === name.toLowerCase())) return toast("هذا الاسم موجود بالفعل.");
  friends.push(name);
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  $("friendName").value = "";
  renderFriends();
  toast("تم حفظ الاسم محليًا. لم يتم إرسال دعوة.");
}
function setConnected(connected) {
  $("statusDot").parentElement.classList.toggle("connected", connected);
  $("statusText").textContent = connected ? "متصل مباشرةً مع قرين" : "محلي — غير متصل";
  $("connectionPill").textContent = connected ? "CONNECTED" : "OFFLINE";
  $("connectionPill").classList.toggle("online", connected);
  $("messageInput").disabled = !connected;
  $("sendMessage").disabled = !connected;
}
function newPeer() {
  if (pc) {
    try { pc.close(); } catch {}
  }
  // STUN helps peers discover reachable network addresses; it does not relay chat data.
  // Strict zero-server operation is not reliable across different NATs/networks.
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });
  pc.onconnectionstatechange = () => {
    console.info("[AELTRIX] connectionState:", pc.connectionState,
      "| signalingState:", pc.signalingState,
      "| iceConnectionState:", pc.iceConnectionState);
    if (pc.connectionState === "connected") {
      setConnected(true);
      addSystemMessage("اتصل الطرفان بنجاح. يمكنكما إرسال الرسائل.");
    }
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      setConnected(false);
      if (pc.connectionState === "failed") {
        addSystemMessage("فشل اتصال الشبكة. تأكد من تبادل Offer/Answer كاملين، وقد تمنع الشبكة اتصال WebRTC المباشر.");
      }
    }
  };
  pc.oniceconnectionstatechange = () => {
    console.info("[AELTRIX] iceConnectionState:", pc.iceConnectionState);
  };
  pc.ondatachannel = (event) => attachChannel(event.channel);
  return pc;
}
function attachChannel(ch) {
  channel = ch;
  channel.onopen = () => {
    setConnected(true);
    addSystemMessage("تم فتح قناة الاتصال المباشر.");
  };
  channel.onclose = () => setConnected(false);
  channel.onerror = () => toast("حدث خطأ في قناة البيانات.");
  channel.onmessage = (event) => {
    try {
      const packet = JSON.parse(event.data);
      if (packet.type === "chat" && typeof packet.text === "string") addBubble(packet.text, packet.sender || "Peer", false);
      else addSystemMessage("وصلت حزمة غير معروفة.");
    } catch { addSystemMessage("وصلت بيانات غير قابلة للقراءة."); }
  };
}
function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "system-message";
  div.textContent = text;
  $("messages").append(div);
  $("messages").scrollTop = $("messages").scrollHeight;
}
function addBubble(text, sender, mine) {
  const div = document.createElement("div");
  div.className = "bubble" + (mine ? " mine" : "");
  const small = document.createElement("small");
  small.textContent = sender;
  const body = document.createElement("div");
  body.textContent = text;
  div.append(small, body);
  $("messages").append(div);
  $("messages").scrollTop = $("messages").scrollHeight;
}
async function waitIceGatheringComplete(peer) {
  if (peer.iceGatheringState === "complete") return;
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 8000);
    function check() {
      if (peer.iceGatheringState === "complete") {
        clearTimeout(timeout);
        peer.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    }
    peer.addEventListener("icegatheringstatechange", check);
  });
}
function showLocalDescription() {
  $("signalOut").value = JSON.stringify(pc.localDescription);
}
async function createOffer() {
  try {
    const peer = newPeer();
    attachChannel(peer.createDataChannel("aeltrix-chat", {ordered: true}));
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await waitIceGatheringComplete(peer);
    showLocalDescription();
    toast("أرسل Offer للطرف الآخر عبر قناة منفصلة.");
  } catch (e) {
    console.error(e);
    toast("تعذر إنشاء Offer: " + (e.message || e));
  }
}
async function acceptOffer() {
  try {
    const offer = JSON.parse($("signalIn").value.trim());
    if (offer.type !== "offer" || !offer.sdp) throw new Error("النص ليس Offer صالحًا.");
    const peer = newPeer();
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await waitIceGatheringComplete(peer);
    showLocalDescription();
    toast("أرسل Answer إلى الشخص الذي أنشأ Offer.");
  } catch (e) {
    console.error(e);
    toast("تعذر قبول Offer: " + (e.message || e));
  }
}
async function applyAnswer() {
  try {
    if (!pc) throw new Error("هذا الجهاز لم ينشئ Offer. طبّق Answer فقط على الجهاز الذي أنشأ Offer.");
    if (pc.signalingState === "stable" && pc.remoteDescription?.type === "answer") {
      throw new Error("تم تطبيق هذا الـ Answer بالفعل. لا تضغط تطبيق مرة ثانية؛ افحص حالة الاتصال وانتظر.");
    }
    if (pc.signalingState !== "have-local-offer") {
      throw new Error("حالة الاتصال الحالية هي " + pc.signalingState + ". أعد بدء الاتصال: أنشئ Offer جديدًا على الجهاز A ثم اتبع الخطوات بالترتيب.");
    }
    const answer = JSON.parse($("signalIn").value.trim());
    if (answer.type !== "answer" || !answer.sdp) throw new Error("النص ليس Answer صالحًا.");
    await pc.setRemoteDescription(answer);
    toast("تم تطبيق Answer مرة واحدة. جارٍ فحص اتصال الشبكة...");
  } catch (e) {
    console.error(e);
    toast("تعذر تطبيق Answer: " + (e.message || e));
  }
}
async function copySignal() {
  const value = $("signalOut").value.trim();
  if (!value) return toast("لا يوجد نص اتصال لنسخه.");
  try {
    await navigator.clipboard.writeText(value);
    toast("تم نسخ نص الاتصال.");
  } catch {
    $("signalOut").focus();
    $("signalOut").select();
    toast("تعذر النسخ التلقائي؛ حدد النص وانسخه يدويًا.");
  }
}
function sendMessage(event) {
  event.preventDefault();
  const text = $("messageInput").value.trim();
  if (!text || !channel || channel.readyState !== "open") return;
  const profile = readJson(STORAGE_KEY, {});
  const sender = profile.displayName || profile.username || "You";
  try {
    channel.send(JSON.stringify({type:"chat", text, sender}));
    addBubble(text, sender, true);
    $("messageInput").value = "";
  } catch (e) {
    toast("فشل إرسال الرسالة: " + (e.message || e));
  }
}
$("saveProfile").addEventListener("click", saveProfile);
$("addFriend").addEventListener("click", addFriend);
$("friendName").addEventListener("keydown", e => { if (e.key === "Enter") addFriend(); });
$("createOffer").addEventListener("click", createOffer);
$("acceptOffer").addEventListener("click", acceptOffer);
$("applyAnswer").addEventListener("click", applyAnswer);
$("copySignal").addEventListener("click", copySignal);
$("messageForm").addEventListener("submit", sendMessage);
loadProfile();
renderFriends();
setConnected(false);
