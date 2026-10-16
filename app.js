/* AELTRIX Social prototype 0.2
 * PeerJS handles WebRTC signaling automatically through its hosted broker.
 * Chat data travels over a WebRTC DataConnection; identity is not authenticated.
 */
const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "aeltrix.profile.v1";
const FRIENDS_KEY = "aeltrix.friends.v1";
let peer = null;
let channel = null;
let toastTimer = null;
let myPeerId = "";

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
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
  toast("تم حفظ الاسم محليًا. أرسل رابط الدعوة للاتصال به.");
}
function setConnected(connected) {
  $("statusDot").parentElement.classList.toggle("connected", connected);
  $("statusText").textContent = connected ? "متصل مباشرةً مع قرين" : (myPeerId ? "جاهز — بانتظار اتصال" : "جارٍ الاتصال بخدمة التنسيق...");
  $("connectionPill").textContent = connected ? "CONNECTED" : (myPeerId ? "READY" : "CONNECTING");
  $("connectionPill").classList.toggle("online", connected);
  $("messageInput").disabled = !connected;
  $("sendMessage").disabled = !connected;
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
function attachChannel(conn) {
  if (channel && channel !== conn && channel.open) {
    conn.close();
    toast("هناك محادثة نشطة بالفعل على هذا الجهاز.");
    return;
  }
  channel = conn;
  conn.on("open", () => {
    setConnected(true);
    const name = readJson(STORAGE_KEY, {}).displayName || readJson(STORAGE_KEY, {}).username || "Peer";
    addSystemMessage("تم الاتصال مباشرةً. المحادثة جاهزة.");
    toast("اتصلت بنجاح!");
  });
  conn.on("data", (data) => {
    try {
      const packet = typeof data === "string" ? JSON.parse(data) : data;
      if (packet && packet.type === "chat" && typeof packet.text === "string") {
        addBubble(packet.text, String(packet.sender || "Peer").slice(0, 32), false);
      }
    } catch { addSystemMessage("وصلت بيانات غير قابلة للقراءة."); }
  });
  conn.on("close", () => {
    if (channel === conn) channel = null;
    setConnected(false);
    addSystemMessage("انقطع اتصال الصديق.");
  });
  conn.on("error", (err) => {
    console.error("[AELTRIX] data connection error", err);
    toast("مشكلة في اتصال البيانات. جرّب الاتصال مجددًا.");
  });
}
function initPeer() {
  if (!window.Peer) {
    $("peerStatus").textContent = "تعذر تحميل مكتبة الاتصال. تحقق من الإنترنت ثم أعد تحميل الصفحة.";
    return;
  }
  setConnected(false);
  peer = new Peer(undefined, {
    debug: 1,
    config: { iceServers: [
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:stun.l.google.com:19302" }
    ]}
  });
  peer.on("open", (id) => {
    myPeerId = id;
    $("myPeerId").value = id;
    $("peerStatus").textContent = "جاهز. أرسل رابط الدعوة لصديقك؛ يجب أن تبقى هذه الصفحة مفتوحة.";
    setConnected(false);
    const params = new URLSearchParams(window.location.search);
    const invitedPeer = params.get("peer");
    if (invitedPeer && invitedPeer !== id) {
      $("friendPeerId").value = invitedPeer;
      addSystemMessage("رابط دعوة موجود. اضغط «اتصال بالصديق» لبدء المحادثة.");
    }
  });
  peer.on("connection", (conn) => {
    attachChannel(conn);
  });
  peer.on("disconnected", () => {
    $("peerStatus").textContent = "انقطع الاتصال بخدمة التنسيق؛ جارٍ إعادة الاتصال...";
    if (peer && !peer.destroyed) peer.reconnect();
  });
  peer.on("error", (err) => {
    console.error("[AELTRIX] PeerJS error", err);
    if (err.type === "peer-unavailable") toast("لم نعثر على هذا الصديق. تأكد أن صفحته مفتوحة ورمزه صحيح.");
    else if (err.type === "network" || err.type === "server-error") $("peerStatus").textContent = "تعذر الوصول لخدمة التنسيق. تحقق من الإنترنت وحاول مجددًا.";
    else if (err.type === "unavailable-id") toast("تعذر حجز معرّف الاتصال. أعد تحميل الصفحة.");
    else toast("خطأ اتصال: " + (err.type || err.message || "غير معروف"));
  });
}
async function copyText(value, success) {
  if (!value) return toast("لا يوجد شيء لنسخه بعد.");
  try {
    await navigator.clipboard.writeText(value);
    toast(success);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = value;
    document.body.append(helper);
    helper.select();
    const ok = document.execCommand("copy");
    helper.remove();
    toast(ok ? success : "تعذر النسخ التلقائي؛ انسخ النص يدويًا.");
  }
}
function inviteLink() {
  if (!myPeerId) return "";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("peer", myPeerId);
  return url.toString();
}
async function copyInvite() {
  if (!myPeerId) return toast("انتظر حتى يصبح الاتصال جاهزًا.");
  await copyText(inviteLink(), "تم نسخ رابط الدعوة. أرسله لصديقك.");
}
function connectToFriend() {
  const friendId = $("friendPeerId").value.trim();
  if (!friendId) return toast("افتح رابط دعوة الصديق أو الصق معرّفه هنا.");
  if (!peer || !myPeerId) return toast("خدمة الاتصال لم تصبح جاهزة بعد.");
  if (friendId === myPeerId) return toast("هذا معرّف جهازك؛ أدخل معرّف صديقك.");
  if (channel && channel.open) return toast("أنت متصل بالفعل.");
  try {
    const conn = peer.connect(friendId, { reliable: true, serialization: "json", metadata: { app: "AELTRIX Social" } });
    attachChannel(conn);
    addSystemMessage("جارٍ الاتصال بالصديق...");
    toast("جارٍ طلب الاتصال...");
  } catch (err) {
    console.error(err);
    toast("تعذر بدء الاتصال: " + (err.message || err));
  }
}
function sendMessage(event) {
  event.preventDefault();
  const text = $("messageInput").value.trim();
  if (!text || !channel || !channel.open) return;
  const profile = readJson(STORAGE_KEY, {});
  const sender = profile.displayName || profile.username || "You";
  try {
    channel.send({ type: "chat", text, sender });
    addBubble(text, sender, true);
    $("messageInput").value = "";
  } catch (e) {
    toast("فشل إرسال الرسالة: " + (e.message || e));
  }
}
$("saveProfile").addEventListener("click", saveProfile);
$("addFriend").addEventListener("click", addFriend);
$("friendName").addEventListener("keydown", e => { if (e.key === "Enter") addFriend(); });
$("copyInvite").addEventListener("click", copyInvite);
$("connectFriend").addEventListener("click", connectToFriend);
$("friendPeerId").addEventListener("keydown", e => { if (e.key === "Enter") connectToFriend(); });
$("messageForm").addEventListener("submit", sendMessage);
loadProfile();
renderFriends();
setConnected(false);
initPeer();
