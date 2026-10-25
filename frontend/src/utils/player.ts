const PLAYER_ID_KEY = "void-lock-player-id";

export function getPlayerId(): string {
  let playerId = sessionStorage.getItem(PLAYER_ID_KEY);

  if (!playerId) {
    playerId = crypto.randomUUID();
    sessionStorage.setItem(PLAYER_ID_KEY, playerId);
  }

  return playerId;
}