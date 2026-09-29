import type { ClientError } from '../../lib/store';

const en: Record<ClientError | 'UNREADABLE_IMAGE', string> = {
  BAD_REQUEST: 'Something went wrong. Try again.',
  ROOM_NOT_FOUND: "This room doesn't exist (anymore). Check the code.",
  ROOM_FULL: 'This room is full.',
  GAME_IN_PROGRESS: 'The game already started in this room.',
  NAME_TAKEN: 'Someone in the room already has that name.',
  INVALID_NAME: 'Pick a name first.',
  NOT_IN_ROOM: "You're not in this room anymore.",
  NOT_HOST: 'Only the host can do that.',
  WRONG_PHASE: 'Not right now!',
  NOT_ENOUGH_PLAYERS: 'You need at least 3 players with photos to start.',
  INVALID_PHOTO: "That file isn't a photo we can use.",
  PHOTO_TOO_LARGE: 'That photo is too big.',
  INVALID_VOTE: "That vote didn't count. Try again.",
  SESSION_ACTIVE: "You're already playing in another tab.",
  RATE_LIMITED: 'Whoa, slow down!',
  SERVER_BUSY: 'The server is full right now. Try again in a bit.',
  SERVER_ERROR: 'The server hiccuped. Try again.',
  NETWORK: 'Connection problem. Try again.',
  UNREADABLE_IMAGE: "Couldn't read that image. Try a JPG or PNG.",
};

const fr: typeof en = {
  BAD_REQUEST: "Quelque chose s'est mal passé. Réessaie.",
  ROOM_NOT_FOUND: "Ce salon n'existe pas (ou plus). Vérifie le code.",
  ROOM_FULL: 'Ce salon est complet.',
  GAME_IN_PROGRESS: 'La partie a déjà commencé dans ce salon.',
  NAME_TAKEN: 'Quelqu’un a déjà ce pseudo dans le salon.',
  INVALID_NAME: "Choisis d'abord un pseudo.",
  NOT_IN_ROOM: "Tu n'es plus dans ce salon.",
  NOT_HOST: "Seul l'hôte peut faire ça.",
  WRONG_PHASE: 'Pas maintenant !',
  NOT_ENOUGH_PLAYERS: 'Il faut au moins 3 joueurs avec des photos pour lancer.',
  INVALID_PHOTO: "Ce fichier n'est pas une photo utilisable.",
  PHOTO_TOO_LARGE: 'Cette photo est trop lourde.',
  INVALID_VOTE: "Ce vote n'a pas compté. Réessaie.",
  SESSION_ACTIVE: 'Tu joues déjà dans un autre onglet.',
  RATE_LIMITED: 'Doucement !',
  SERVER_BUSY: 'Le serveur est plein. Réessaie dans un moment.',
  SERVER_ERROR: 'Le serveur a eu un hoquet. Réessaie.',
  NETWORK: 'Problème de connexion. Réessaie.',
  UNREADABLE_IMAGE: "Impossible de lire cette image. Essaie un JPG ou un PNG.",
};

export default { en, fr };
