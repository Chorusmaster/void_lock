<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { usePlayerStore } from "@/stores/player";
import { storeToRefs } from "pinia";
import { getPlayerId } from "@/utils/player";
import { socket } from "@/utils/socket";

const props = defineProps<{
  roomCode: string;
}>();

const player = storeToRefs(usePlayerStore());
const voiceChatState = ref<"off" | "connecting" | "connected">("off");
const voiceChatError = ref("");
const remoteAudio = ref<HTMLAudioElement | null>(null);

type VoiceChatSignal =
  | { type: "offer" | "answer"; description: RTCSessionDescriptionInit }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

let localStream: MediaStream | null = null;
let peerConnection: RTCPeerConnection | null = null;
let pendingCandidates: RTCIceCandidateInit[] = [];
let activationId = 0;

function closeVoiceChat() {
  activationId += 1;
  peerConnection?.close();
  peerConnection = null;
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;
  pendingCandidates = [];

  if (remoteAudio.value) {
    remoteAudio.value.srcObject = null;
  }

  voiceChatState.value = "off";
}

function stopVoiceChat(notifyPeer: boolean, errorMessage = "") {
  if (notifyPeer && socket.connected) {
    socket.emit("voice-chat-stop", { roomCode: props.roomCode });
  }

  closeVoiceChat();
  voiceChatError.value = errorMessage;
}

async function enableVoiceChat() {
  voiceChatError.value = "";
  voiceChatState.value = "connecting";
  const currentActivation = ++activationId;

  if (
    !navigator.mediaDevices?.getUserMedia ||
    !("RTCPeerConnection" in window)
  ) {
    stopVoiceChat(false, "Voice chat is not supported by this browser.");
    return;
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
  } catch (error) {
    if (currentActivation !== activationId) return;

    stopVoiceChat(
      false,
      `Could not access your microphone: ${
        error instanceof Error ? error.message : "Permission was denied."
      }`,
    );
    return;
  }

  if (currentActivation !== activationId) {
    stream.getTracks().forEach((track) => track.stop());
    return;
  }

  try {
    localStream = stream;
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnection = connection;

    for (const track of stream.getAudioTracks()) {
      connection.addTrack(track, stream);
    }

    connection.onicecandidate = (event) => {
      if (
        event.candidate &&
        peerConnection === connection &&
        socket.connected
      ) {
        socket.emit("voice-chat-signal", {
          roomCode: props.roomCode,
          signal: {
            type: "candidate",
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    connection.ontrack = (event) => {
      if (peerConnection !== connection) return;
      const audio = remoteAudio.value;
      if (!audio) return;

      audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      void audio.play().catch(() => {
        voiceChatError.value =
          "Voice chat connected, but audio playback was blocked by the browser.";
      });
    };

    connection.onconnectionstatechange = () => {
      if (peerConnection !== connection) return;

      if (connection.connectionState === "connected") {
        voiceChatState.value = "connected";
      } else if (connection.connectionState === "failed") {
        stopVoiceChat(
          true,
          "Could not connect to your teammate. Check your network and try again.",
        );
      }
    };

    socket.emit("voice-chat-ready", { roomCode: props.roomCode });
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    if (localStream === stream) localStream = null;
    peerConnection?.close();
    peerConnection = null;
    voiceChatState.value = "off";
    voiceChatError.value =
      error instanceof Error
        ? `Could not start voice chat: ${error.message}`
        : "Could not start voice chat.";
  }
}

async function handleVoiceChatReady(data: {
  roomCode: string;
  initiatorId: string;
}) {
  const connection = peerConnection;
  if (
    data.roomCode !== props.roomCode ||
    data.initiatorId !== getPlayerId() ||
    !connection
  ) {
    return;
  }

  try {
    const offer = await connection.createOffer();
    if (connection !== peerConnection) return;
    await connection.setLocalDescription(offer);
    if (connection !== peerConnection) return;
    const description = connection.localDescription;
    if (!description) throw new Error("The voice chat offer was not created.");

    socket.emit("voice-chat-signal", {
      roomCode: props.roomCode,
      signal: {
        type: "offer",
        description: { type: description.type, sdp: description.sdp },
      },
    });
  } catch (error) {
    if (connection !== peerConnection) return;
    stopVoiceChat(
      true,
      error instanceof Error
        ? `Could not start the voice chat connection: ${error.message}`
        : "Could not start the voice chat connection.",
    );
  }
}

async function applyPendingCandidates(connection: RTCPeerConnection) {
  const candidates = pendingCandidates;
  pendingCandidates = [];

  for (const candidate of candidates) {
    await connection.addIceCandidate(candidate);
  }
}

async function handleVoiceChatSignal(data: {
  senderId: string;
  signal: VoiceChatSignal;
}) {
  const connection = peerConnection;
  if (!connection || voiceChatState.value === "off") return;

  try {
    if (data.signal.type === "candidate") {
      if (connection.remoteDescription) {
        await connection.addIceCandidate(data.signal.candidate);
      } else {
        pendingCandidates.push(data.signal.candidate);
      }
      return;
    }

    await connection.setRemoteDescription(data.signal.description);
    if (connection !== peerConnection) return;
    await applyPendingCandidates(connection);
    if (connection !== peerConnection) return;

    if (data.signal.type === "offer") {
      const answer = await connection.createAnswer();
      if (connection !== peerConnection) return;
      await connection.setLocalDescription(answer);
      if (connection !== peerConnection) return;
      const description = connection.localDescription;
      if (!description)
        throw new Error("The voice chat answer was not created.");

      socket.emit("voice-chat-signal", {
        roomCode: props.roomCode,
        signal: {
          type: "answer",
          description: { type: description.type, sdp: description.sdp },
        },
      });
    }
  } catch (error) {
    if (connection !== peerConnection) return;
    stopVoiceChat(
      true,
      error instanceof Error
        ? `Voice chat connection failed: ${error.message}`
        : "Voice chat connection failed.",
    );
  }
}

function handlePeerStopped() {
  if (voiceChatState.value === "off") return;
  stopVoiceChat(true, "Your teammate turned voice chat off.");
}

function handleVoiceChatError(message: string) {
  stopVoiceChat(true, message);
}

function handleSocketDisconnect() {
  stopVoiceChat(false);
}

function toggleVoiceChat() {
  if (voiceChatState.value === "off") {
    void enableVoiceChat();
  } else {
    stopVoiceChat(true);
  }
}

onMounted(() => {
  socket.on("voice-chat-ready", handleVoiceChatReady);
  socket.on("voice-chat-signal", handleVoiceChatSignal);
  socket.on("voice-chat-peer-stopped", handlePeerStopped);
  socket.on("voice-chat-error", handleVoiceChatError);
  socket.on("disconnect", handleSocketDisconnect);
});

onUnmounted(() => {
  socket.off("voice-chat-ready", handleVoiceChatReady);
  socket.off("voice-chat-signal", handleVoiceChatSignal);
  socket.off("voice-chat-peer-stopped", handlePeerStopped);
  socket.off("voice-chat-error", handleVoiceChatError);
  socket.off("disconnect", handleSocketDisconnect);
  stopVoiceChat(true);
});
</script>

<template>
  <div class="absolute top-4 left-4 w-56">
    <div
      class="h-40 overflow-hidden rounded-lg border"
      :class="
        player.mood.value === 'ok'
          ? 'bg-gray-700 border-gray-500'
          : 'bg-red-950 border-red-700'
      "
    >
      <img
        :src="`/images/${ player.role.value === 'Operator' ? 'operator' : 'decoder' }-${player.mood.value}.png`"
        :alt="player.mood.value === 'ok' ? 'Player OK' : 'Player FAIL'"
        class="w-full h-full object-cover"
      />
    </div>

    <button
      type="button"
      class="mt-2 w-full rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm font-semibold text-emerald-200/80 backdrop-blur-sm transition hover:bg-emerald-900/40"
      :class="
        voiceChatState === 'off'
          ? 'border-emerald-500/30 text-emerald-300'
          : voiceChatState === 'connecting'
            ? 'border-amber-500/40 text-amber-300'
            : 'border-red-500/40 text-red-400'
      "
      :aria-pressed="voiceChatState !== 'off'"
      @click="toggleVoiceChat"
    >
      {{
        voiceChatState === "off"
          ? "Enable voice chat"
          : voiceChatState === "connecting"
            ? "Cancel voice chat"
            : "Disable voice chat"
      }}
    </button>

    <p
      v-if="voiceChatState !== 'off'"
      class="mt-1 text-xs text-slate-400"
      aria-live="polite"
    >
      {{
        voiceChatState === "connected"
          ? "Voice chat connected"
          : "Waiting for your teammate..."
      }}
    </p>
    <p v-if="voiceChatError" role="alert" class="mt-1 text-xs text-red-300">
      {{ voiceChatError }}
    </p>
    <audio ref="remoteAudio" autoplay playsinline class="hidden"></audio>
  </div>
</template>
