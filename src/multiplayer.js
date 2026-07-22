const ROOM_PREFIX = "dxr";

function makeRoomId() {
  return `${ROOM_PREFIX}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clonePacket(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createMultiplayerClient({ onStatus, onGuestInput, onSnapshot, onStart }) {
  let peer = null;
  let connection = null;
  let role = "solo";
  let mode = null;

  function setStatus(message) {
    onStatus?.(message);
  }

  function ensurePeer(id = undefined) {
    if (!window.Peer) {
      setStatus("联机库还没加载好，请稍等一下再试。");
      return null;
    }

    peer?.destroy();
    peer = new window.Peer(id);
    peer.on("error", (error) => setStatus(`联机错误：${error.type ?? error.message}`));
    peer.on("disconnected", () => setStatus("房间信令断开，正在等待重连。"));
    return peer;
  }

  function wireConnection(conn) {
    connection = conn;
    connection.on("open", () => {
      setStatus(role === "host" ? "玩家已加入，房间已连接。" : "已加入房间。");
      if (role === "guest") {
        connection.send({ type: "guest-ready" });
      }
      onStart?.({ role, mode });
    });
    connection.on("data", (packet) => {
      if (packet?.type === "guest-input" && role === "host") {
        onGuestInput?.(packet);
      }
      if (packet?.type === "host-snapshot" && role === "guest") {
        onSnapshot?.(packet.state);
      }
      if (packet?.type === "host-start" && role === "guest") {
        mode = packet.mode;
        onStart?.({ role, mode });
      }
    });
    connection.on("close", () => setStatus("联机已断开。"));
  }

  function createRoom(nextMode) {
    role = "host";
    mode = nextMode;
    const roomId = makeRoomId();
    const nextPeer = ensurePeer(roomId);
    if (!nextPeer) return null;

    nextPeer.on("open", () => setStatus(`房间号：${roomId}`));
    nextPeer.on("connection", (conn) => {
      wireConnection(conn);
      conn.on("open", () => conn.send({ type: "host-start", mode }));
    });

    return roomId;
  }

  function joinRoom(roomId) {
    const cleanRoomId = roomId.trim();
    if (!cleanRoomId) {
      setStatus("请输入房间号。");
      return false;
    }

    role = "guest";
    mode = null;
    const nextPeer = ensurePeer();
    if (!nextPeer) return false;

    nextPeer.on("open", () => {
      setStatus("正在加入房间...");
      wireConnection(nextPeer.connect(cleanRoomId));
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
    connection = null;
    peer = null;
    role = "solo";
    mode = null;
    setStatus("联机已关闭。");
  }

  return { createRoom, joinRoom, sendGuestInput, sendSnapshot, getRole, getMode, isConnected, close };
}
