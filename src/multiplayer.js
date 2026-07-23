const ROOM_PREFIX = "dxr-room";
const JOIN_TIMEOUT_MS = 10000;

function makeRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function roomCodeToPeerId(roomCode) {
  return `${ROOM_PREFIX}-${roomCode}`;
}

function normalizeRoomCode(value) {
  return String(value ?? "").trim().replace(/\D/g, "").slice(0, 4);
}

function clonePacket(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createMultiplayerClient({ onStatus, onRoomCode, onGuestInput, onSnapshot, onStart, onPeerName }) {
  let peer = null;
  let connection = null;
  let role = "solo";
  let mode = null;
  let currentRoomCode = null;
  let localName = "玩家";
  let remoteName = "玩家";
  let joinTimer = null;

  function setStatus(message) {
    onStatus?.(message);
  }

  function clearJoinTimer() {
    if (!joinTimer) return;
    clearTimeout(joinTimer);
    joinTimer = null;
  }

  function startJoinTimer(roomCode) {
    clearJoinTimer();
    joinTimer = setTimeout(() => {
      joinTimer = null;
      setStatus(`加入房间 ${roomCode} 超时：请确认房主还在等待，或者网络没有挡住联机。`);
    }, JOIN_TIMEOUT_MS);
  }

  function ensurePeer(id = undefined) {
    if (!window.Peer) {
      setStatus("联机库还没加载好，请稍等一下再试。");
      return null;
    }

    peer?.destroy();
    peer = new window.Peer(id);
    peer.on("error", (error) => {
      clearJoinTimer();
      if (error.type === "unavailable-id") {
        setStatus("这个4位房间号刚好被占用了，请重新创建一次。");
        return;
      }
      if (error.type === "peer-unavailable") {
        setStatus("找不到这个房间：请检查4位房间号，或者让房主重新创建。");
        return;
      }
      setStatus(`联机错误：${error.type ?? error.message}`);
    });
    peer.on("disconnected", () => setStatus("房间信令断开，正在等待重连。"));
    return peer;
  }

  function wireConnection(conn) {
    connection = conn;
    connection.on("open", () => {
      clearJoinTimer();
      setStatus(role === "host" ? "玩家已加入，房间已连接。" : "已加入房间，等待房主开始。");
      if (role === "guest") {
        connection.send({ type: "guest-ready", name: localName });
      }
    });
    connection.on("data", (packet) => {
      if (packet?.type === "guest-ready" && role === "host") {
        remoteName = packet.name || "玩家2";
        onPeerName?.({ role, localName, remoteName });
        setStatus(`${remoteName} 已加入，房间已连接。`);
        connection.send({ type: "host-start", mode, hostName: localName });
      }
      if (packet?.type === "guest-input" && role === "host") {
        onGuestInput?.(packet);
      }
      if (packet?.type === "host-snapshot" && role === "guest") {
        onSnapshot?.(packet.state);
      }
      if (packet?.type === "host-start" && role === "guest") {
        mode = packet.mode;
        remoteName = packet.hostName || "房主";
        setStatus(`已进入${mode === "coop" ? "双人无尽" : "对战"}房间。`);
        onPeerName?.({ role, localName, remoteName });
        onStart?.({ role, mode, hostName: remoteName, guestName: localName });
      }
    });
    connection.on("error", () => {
      clearJoinTimer();
      setStatus("联机连接失败：请让房主保持等待房间打开，再重新加入。");
    });
    connection.on("close", () => {
      clearJoinTimer();
      setStatus("联机已断开。");
    });
  }

  function createRoom(nextMode, name = "房主") {
    role = "host";
    mode = nextMode;
    localName = name || "房主";
    remoteName = "玩家2";
    const roomCode = makeRoomCode();
    const roomId = roomCodeToPeerId(roomCode);
    currentRoomCode = roomCode;
    setStatus("正在创建房间...");
    const nextPeer = ensurePeer(roomId);
    if (!nextPeer) return null;

    nextPeer.on("open", () => {
      onRoomCode?.(roomCode);
      setStatus(`你已进入局域网房间 ${roomCode}，正在等待朋友加入。`);
      onStart?.({ role, mode, roomCode, waitingForGuest: true });
    });
    nextPeer.on("connection", (conn) => {
      wireConnection(conn);
    });

    return roomCode;
  }

  function joinRoom(roomId, name = "玩家2") {
    const cleanRoomCode = normalizeRoomCode(roomId);
    if (cleanRoomCode.length !== 4) {
      setStatus("请输入4位房间号。");
      return false;
    }
    if (role === "host" && currentRoomCode === cleanRoomCode) {
      setStatus(`你已经在房间 ${cleanRoomCode} 里了，把房间号发给朋友就行。`);
      return true;
    }

    role = "guest";
    mode = null;
    currentRoomCode = cleanRoomCode;
    localName = name || "玩家2";
    remoteName = "房主";
    setStatus(`正在加入房间 ${cleanRoomCode}：连接联机服务器...`);
    startJoinTimer(cleanRoomCode);
    const nextPeer = ensurePeer();
    if (!nextPeer) return false;

    nextPeer.on("open", () => {
      setStatus(`正在加入房间 ${cleanRoomCode}：正在寻找房主...`);
      wireConnection(nextPeer.connect(roomCodeToPeerId(cleanRoomCode)));
    });
    return true;
  }

  function sendGuestInput(packet) {
    if (role !== "guest" || !connection?.open) return;
    connection.send({ type: "guest-input", ...packet });
  }

  function sendSnapshot(state) {
    if (role !== "host" || !connection?.open || !state) return;
    connection.send({ type: "host-snapshot", state: clonePacket(state) });
  }

  function getRole() {
    return role;
  }

  function getMode() {
    return mode;
  }

  function isConnected() {
    return Boolean(connection?.open);
  }

  function close() {
    connection?.close();
    peer?.destroy();
    clearJoinTimer();
    connection = null;
    peer = null;
    role = "solo";
    mode = null;
    currentRoomCode = null;
    localName = "玩家";
    remoteName = "玩家";
    setStatus("联机已关闭。");
  }

  return { createRoom, joinRoom, sendGuestInput, sendSnapshot, getRole, getMode, isConnected, close };
}
