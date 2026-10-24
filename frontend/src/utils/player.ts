const PLAYER_ID_KEY = "void-lock-player-id";

export function getPlayerId(): string {
  let playerId = localStorage.getItem(PLAYER_ID_KEY);

  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }

  return playerId;
}