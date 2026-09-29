// Strings for the results screen. `fr` must mirror `en` exactly (enforced by the type).
const en = {
  title: 'And the winner is…',
  /** Sub title once the winner landed on the podium. */
  winner: {
    one: ['{name} takes the crown!', 'All hail {name}, parent whisperer!', '{name} knows your family better than you do.'],
    me: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! Your friends’ parents have no secrets for you.'],
    tie: ['It’s a tie! {names} share the crown.', 'Can’t split them: {names} rule together!'],
    nobody: ['Nobody scored a single point… Everybody loses! 🙈', 'Zero points for everyone. Do you even know each other?'],
  },
  and: '&',
  pts: 'pts',
  more: '+{count}',
  ranking: {
    title: 'Final ranking',
    guessedRight: '{correct}/{guesses} guessed right',
    noGuesses: 'No guesses 😴',
  },
  awards: {
    title: 'Awards',
    subtitle: 'The ceremony nobody asked for',
    none: 'No awards this time: not enough votes to judge anyone. 🤷',
    photoOf: 'Photo of the award',
    /** "Paul's mom" in the middle of a sentence. */
    possessiveMid: {
      daron: "{name}'s dad",
      daronne: "{name}'s mom",
    },
    sherlock: {
      title: 'Sherlock',
      one: [
        '{names} spotted {value} parents out of {total}. Were you going through everyone’s photo albums?',
        '{names} spotted {value} parents out of {total}. Suspiciously good. We’re watching you. 👀',
      ],
      many: ['{names} spotted {value} parents out of {total} each. Great minds stalk alike.'],
    },
    needsGlasses: {
      title: 'Needs glasses',
      one: [
        '{names} got {value} out of {total} right. An eye test has been booked for you.',
        '{names} got {value} out of {total} right. Could not spot a parent in a lineup of one.',
      ],
      many: ['{names} got {value} out of {total} right. Group discount at the optician!'],
    },
    carbonCopy: {
      title: 'Carbon copy',
      one: [
        "{value}% of the guesses on {names}'s parents were right. Same face, no DNA test needed. 🧬",
        "{value}% recognised {names}'s parents instantly. The apple did not fall far from the tree.",
      ],
      many: ['{value}% of the guesses on the parents of {names} were right. Walking photocopies.'],
    },
    masterOfDisguise: {
      title: 'Master of disguise',
      one: [
        "Only {value}% recognised {names}'s parents. Are you sure you’re not adopted?",
        "Only {value}% recognised {names}'s parents. Swapped at birth, maybe?",
      ],
      many: ['Only {value}% recognised the parents of {names}. Swapped at birth, all of them?'],
    },
    doppelganger: {
      title: 'Doppelgänger',
      one: [
        '{value} votes wrongly went to {names}. Apparently everyone’s parents look like yours.',
        'People picked {names} {value} times for someone else’s parent. You have one of those families.',
      ],
      many: ['{value} wrong votes each for {names}. Everyone’s parents look like yours, apparently.'],
    },
    mostConfusing: {
      title: 'Most confusing photo',
      text: ['{possessive} got votes for {value} different people. Total chaos.', '{possessive} fooled everyone: {value} different suspects!'],
    },
    biggestMixup: {
      title: 'Biggest mix-up',
      daron: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      daronne: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
    },
    stat: {
      sherlock: '{value}/{total} ✓',
      needsGlasses: '{value}/{total} ✓',
      carbonCopy: '{value}%',
      masterOfDisguise: '{value}%',
      doppelganger: '×{value}',
      mostConfusing: '{value} suspects',
      biggestMixup: '{value} votes',
    },
  },
  mine: {
    title: 'Your game',
    rank: '#{rank}',
    outOf: 'out of {count}',
    guessed: 'guessed right',
    recognised: 'recognised your parents',
    noPhotos: 'No parents this time',
    noVotes: 'no votes',
    yourPhoto: {
      daron: 'Your dad',
      daronne: 'Your mom',
    },
    photoScore: '{correct}/{total}',
    yourAwards: 'Your awards',
    verdict: {
      first: ['Undisputed parent detective. 🏆', 'Nobody can hide a parent from you.'],
      podium: ['On the podium! Your mom would be proud.', 'Podium! Not bad at all, detective.'],
      middle: ['Solid effort. Some parents remain a mystery.', 'Right in the middle. Very balanced, very Swiss.'],
      last: ['Last place. Do you even know your friends? 😬', 'Dead last. Maybe ask for the family photos next time.'],
      afk: ['You didn’t guess a single photo. Were you even here? 👻'],
      nobody: ['Tied first… with zero points. Nothing to brag about. 🙃'],
    },
    share: 'Share my score',
  },
  wall: {
    title: 'The photo wall',
    subtitle: 'Tap a photo to zoom in',
    badge: '{correct}/{total} ✓',
    lightbox: '{caption} · {correct}/{total} found it',
    youGotIt: 'You got it',
    youMissed: 'You missed it',
  },
  bar: {
    playAgain: 'Play again 🔁',
    waiting: 'Waiting for {host}…',
    share: 'Share my score',
  },
  share: {
    first: 'I won at Daron Guessr 🏆 {correct}/{guesses} parents spotted! Your turn:',
    other: 'I finished #{rank} at Daron Guessr 🕵️ {correct}/{guesses} parents spotted! Your turn:',
    copied: 'Score copied, paste it anywhere!',
    failed: 'Couldn’t share your score.',
  },
};

const fr: typeof en = {
  title: 'Et le gagnant est…',
  winner: {
    one: ['{name} remporte la couronne !', '{name}, le roi des darons !', '{name} connaît vos darons mieux que vous.'],
    me: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Les darons de tes potes n’ont aucun secret pour toi.'],
    tie: ['Égalité ! {names} se partagent la couronne.', 'Impossible de les départager : {names} règnent ensemble !'],
    nobody: ['Personne n’a marqué un seul point… Tout le monde a perdu ! 🙈', 'Zéro pointé pour tout le monde. Vous vous connaissez vraiment ?'],
  },
  and: 'et',
  pts: 'pts',
  more: '+{count}',
  ranking: {
    title: 'Classement final',
    guessedRight: '{correct}/{guesses} trouvés',
    noGuesses: 'Aucun vote 😴',
  },
  awards: {
    title: 'Les trophées',
    subtitle: 'La cérémonie que personne n’a demandée',
    none: 'Pas de trophée cette fois : pas assez de votes pour juger qui que ce soit. 🤷',
    photoOf: 'Photo du trophée',
    possessiveMid: {
      daron: 'le daron de {name}',
      daronne: 'la daronne de {name}',
    },
    sherlock: {
      title: 'Sherlock',
      one: [
        '{names} a reconnu {value} darons sur {total}. T’as fouillé les albums photo de tout le monde ?',
        '{names} a reconnu {value} darons sur {total}. Louche. On te surveille. 👀',
      ],
      many: ['{names} ont reconnu {value} darons sur {total} chacun. De vrais détectives privés.'],
    },
    needsGlasses: {
      title: 'Besoin de lunettes',
      one: [
        '{names} a trouvé {value} sur {total}. Rendez-vous chez l’ophtalmo pris d’office.',
        '{names} a trouvé {value} sur {total}. Incapable de reconnaître un daron dans une foule d’une personne.',
      ],
      many: ['{names} ont trouvé {value} sur {total}. Tarif de groupe chez l’opticien !'],
    },
    carbonCopy: {
      title: 'Copié-collé',
      one: [
        '{value} % des votes sur les darons de {names} étaient bons. Même tête, pas besoin de test ADN. 🧬',
        '{value} % ont reconnu direct les darons de {names}. Les chiens ne font pas des chats.',
      ],
      many: ['{value} % des votes sur les darons de {names} étaient bons. Des photocopies ambulantes.'],
    },
    masterOfDisguise: {
      title: 'Maître du déguisement',
      one: [
        'Seulement {value} % ont reconnu les darons de {names}. On t’aurait pas échangé à la maternité ?',
        'Seulement {value} % ont reconnu les darons de {names}. T’es sûr·e que c’est ta famille ?',
      ],
      many: ['Seulement {value} % ont reconnu les darons de {names}. Tous échangés à la maternité ?'],
    },
    doppelganger: {
      title: 'Sosie officiel',
      one: [
        '{value} votes sont tombés à tort sur {names}. Apparemment, tous les darons te ressemblent.',
        'On a pris {names} {value} fois pour l’enfant de quelqu’un d’autre. T’as une tête de famille, toi.',
      ],
      many: ['{value} votes à tort chacun pour {names}. Tous les darons vous ressemblent, apparemment.'],
    },
    mostConfusing: {
      title: 'La photo qui embrouille',
      text: ['{possessive} a récolté des votes pour {value} personnes différentes. Le chaos total.', '{possessive} a semé le doute : {value} suspects différents !'],
    },
    biggestMixup: {
      title: 'La grosse confusion',
      daron: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, un truc à nous avouer ?'],
      daronne: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, un truc à nous avouer ?'],
    },
    stat: {
      sherlock: '{value}/{total} ✓',
      needsGlasses: '{value}/{total} ✓',
      carbonCopy: '{value} %',
      masterOfDisguise: '{value} %',
      doppelganger: '×{value}',
      mostConfusing: '{value} suspects',
      biggestMixup: '{value} votes',
    },
  },
  mine: {
    title: 'Ta partie',
    rank: '#{rank}',
    outOf: 'sur {count}',
    guessed: 'bien trouvés',
    recognised: 'ont reconnu tes darons',
    noPhotos: 'Pas de darons cette fois',
    noVotes: 'aucun vote',
    yourPhoto: {
      daron: 'Ton daron',
      daronne: 'Ta daronne',
    },
    photoScore: '{correct}/{total}',
    yourAwards: 'Tes trophées',
    verdict: {
      first: ['Détective des darons incontesté·e. 🏆', 'Impossible de te cacher un daron.'],
      podium: ['Sur le podium ! Ta daronne serait fière.', 'Podium ! Pas mal du tout, inspecteur.'],
      middle: ['Honnête. Certains darons restent un mystère.', 'Pile au milieu. Très suisse, tout ça.'],
      last: ['Dernier. Tu connais vraiment tes potes ? 😬', 'Bon dernier. Demande les albums de famille la prochaine fois.'],
      afk: ['T’as pas voté une seule fois. T’étais là au moins ? 👻'],
      nobody: ['Premier ex æquo… avec zéro point. Pas de quoi frimer. 🙃'],
    },
    share: 'Partager mon score',
  },
  wall: {
    title: 'Le mur des darons',
    subtitle: 'Touche une photo pour zoomer',
    badge: '{correct}/{total} ✓',
    lightbox: '{caption} · {correct}/{total} ont trouvé',
    youGotIt: 'Trouvé',
    youMissed: 'Raté',
  },
  bar: {
    playAgain: 'Rejouer 🔁',
    waiting: 'On attend {host}…',
    share: 'Partager mon score',
  },
  share: {
    first: 'J’ai gagné à Daron Guessr 🏆 {correct}/{guesses} darons démasqués ! À ton tour :',
    other: 'J’ai fini #{rank} à Daron Guessr 🕵️ {correct}/{guesses} darons démasqués ! À ton tour :',
    copied: 'Score copié, colle-le où tu veux !',
    failed: 'Impossible de partager ton score.',
  },
};

export default { en, fr };
