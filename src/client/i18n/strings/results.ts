// Strings for the results screen. `fr` must mirror `en` exactly (enforced by the type).
//
// Copy that depends on what the photos show comes in four "flavors" (see `Flavor` in
// screens/results/helpers.ts): `parents` (dads & moms), `family` (anything else: siblings,
// friends, pets, a mix of kinds…), `childhood` (players as kids) and `pick` (pictures players
// picked). Per-photo copy is keyed by photo kind instead.

/** Same text whatever the flavor. */
const same = (text: string) => ({ parents: text, family: text, childhood: text, pick: text });

const en = {
  title: 'And the winner is…',
  /** Sub title once the winner landed on the podium. */
  winner: {
    one: {
      parents: ['{name} takes the crown!', 'All hail {name}, parent whisperer!', '{name} knows your parents better than you do.'],
      family: ['{name} takes the crown!', 'All hail {name}, family whisperer!', '{name} knows your people better than you do.'],
      childhood: ['{name} takes the crown!', 'All hail {name}, baby whisperer! 👶', '{name} would recognise you all in diapers.'],
      pick: ['{name} takes the crown!', 'All hail {name}, mind reader! 🔮', '{name} knows your taste better than you do.'],
    },
    me: {
      parents: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! Your friends’ parents have no secrets for you.'],
      family: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! Your friends’ families have no secrets for you.'],
      childhood: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! No baby face can fool you.'],
      pick: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! You read your friends like an open book.'],
    },
    tie: ['It’s a tie! {names} share the crown.', 'Can’t split them: {names} rule together!'],
    nobody: ['Nobody scored a single point… Everybody loses! 🙈', 'Zero points for everyone. Do you even know each other?'],
  },
  and: '&',
  pts: 'pts',
  more: '+{count}',
  ranking: {
    title: 'Final ranking',
    guessedRight: '{correct}/{guesses} guessed right',
    noGuesses: 'No guesses 😴',
  },
  awards: {
    title: 'Awards',
    subtitle: 'The ceremony nobody asked for',
    none: 'No awards this time: not enough votes to judge anyone. 🤷',
    photoOf: 'Photo of the award',
    /** "Paul's mom" in the middle of a sentence. */
    possessiveMid: {
      daron: "{name}'s dad",
      daronne: "{name}'s mom",
      brother: "{name}'s brother",
      sister: "{name}'s sister",
      grandpa: "{name}'s grandpa",
      grandma: "{name}'s grandma",
      friend: "{name}'s friend",
      partner: "{name}'s partner",
      pet: "{name}'s pet",
      kid: '{name} as a kid',
      pick: "{name}'s pick",
    },
    sherlock: {
      title: { parents: 'Sherlock', family: 'Sherlock', childhood: 'Sherlock', pick: 'Mind reader' },
      parents: {
        one: [
          '{names} spotted {value} out of {total} parents. Were you going through everyone’s photo albums?',
          '{names} spotted {value} out of {total} parents. Suspiciously good. We’re watching you. 👀',
        ],
        many: ['{names} spotted {value} out of {total} parents each. Great minds stalk alike.'],
      },
      family: {
        one: [
          '{names} got {value} out of {total} right. Were you going through everyone’s photo albums?',
          '{names} got {value} out of {total} right. Suspiciously good. We’re watching you. 👀',
        ],
        many: ['{names} got {value} out of {total} right each. Great minds stalk alike.'],
      },
      childhood: {
        one: [
          '{names} recognised {value} out of {total} baby faces. Were you there when they were born?',
          '{names} recognised {value} out of {total} baby faces. Did you work at their daycare? 👀',
        ],
        many: ['{names} recognised {value} out of {total} baby faces each. Former daycare staff, all of them.'],
      },
      pick: {
        one: [
          '{names} guessed who picked what {value} times out of {total}. Are you reading our minds? 🔮',
          '{names} matched {value} out of {total} pictures to their picker. You know us way too well. 👀',
        ],
        many: ['{names} guessed who picked what {value} times out of {total} each. A coven of mind readers. 🔮'],
      },
    },
    needsGlasses: {
      title: { parents: 'Needs glasses', family: 'Needs glasses', childhood: 'Needs glasses', pick: 'Total stranger' },
      parents: {
        one: [
          '{names} got {value} out of {total} right. An eye test has been booked for you.',
          '{names} got {value} out of {total} right. Could not spot a parent in a lineup of one.',
        ],
        many: ['{names} got {value} out of {total} right. Group discount at the optician!'],
      },
      family: {
        one: [
          '{names} got {value} out of {total} right. An eye test has been booked for you.',
          '{names} got {value} out of {total} right. Could not spot a familiar face in a lineup of one.',
        ],
        many: ['{names} got {value} out of {total} right. Group discount at the optician!'],
      },
      childhood: {
        one: [
          '{names} got {value} out of {total} right. To be fair, all babies look the same. 👶',
          '{names} got {value} out of {total} right. Would not even recognise their own baby photo.',
        ],
        many: ['{names} got {value} out of {total} right. To be fair, all babies look the same. 👶'],
      },
      pick: {
        one: [
          '{names} got {value} out of {total} right. Do you even know these people? 😬',
          '{names} got {value} out of {total} right. Maybe try talking to your friends sometimes.',
        ],
        many: ['{names} got {value} out of {total} right. Total strangers, all of you.'],
      },
    },
    carbonCopy: {
      title: { parents: 'Carbon copy', family: 'Carbon copy', childhood: 'Hasn’t changed a bit', pick: 'Open book' },
      parents: {
        one: [
          "{value}% of the guesses on {names}'s parents were right. Same face, no DNA test needed. 🧬",
          "{value}% recognised {names}'s parents instantly. The apple did not fall far from the tree.",
        ],
        many: ['{value}% of the guesses on the parents of {names} were right. Walking photocopies.'],
      },
      family: {
        one: [
          "{value}% of the guesses on {names}'s photos were right. Same vibe, no DNA test needed. 🧬",
          "{value}% matched {names}'s photos instantly. Your people are written all over your face.",
        ],
        many: ['{value}% of the guesses on the photos of {names} were right. Walking photocopies.'],
      },
      childhood: {
        one: ['{value}% recognised {names} as a kid. Same face, just taller. 📏', '{value}% spotted mini {names} instantly. Did you ever grow up?'],
        many: ['{value}% recognised {names} as kids. Same faces, just taller. 📏'],
      },
      pick: {
        one: [
          "{value}% saw {names}'s pick coming a mile away. So predictable. 📖",
          "{value}% of the guesses on {names}'s picks were right. No secrets, no mystery.",
        ],
        many: ['{value}% saw the picks of {names} coming a mile away. Predictable, all of them. 📖'],
      },
    },
    masterOfDisguise: {
      title: { parents: 'Master of disguise', family: 'Master of disguise', childhood: 'Glow-up of the year', pick: 'Poker face' },
      parents: {
        one: [
          "Only {value}% recognised {names}'s parents. Are you sure you’re not adopted?",
          "Only {value}% recognised {names}'s parents. Swapped at birth, maybe?",
        ],
        many: ['Only {value}% recognised the parents of {names}. Swapped at birth, all of them?'],
      },
      family: {
        one: [
          "Only {value}% matched {names}'s photos. Are you sure you know these people?",
          "Only {value}% matched {names}'s photos. Zero family resemblance. Suspicious.",
        ],
        many: ['Only {value}% matched the photos of {names}. Who even are these people?'],
      },
      childhood: {
        one: ['Only {value}% recognised {names} as a kid. What a glow-up! ✨', 'Only {value}% recognised {names} as a kid. Swapped at birth, maybe?'],
        many: ['Only {value}% recognised {names} as kids. Glow-ups all round! ✨'],
      },
      pick: {
        one: ["Only {value}% guessed {names}'s pick. Nobody saw that coming. 🃏", "Only {value}% guessed {names}'s pick. Full of surprises, aren’t you?"],
        many: ['Only {value}% guessed the picks of {names}. Full of surprises, all of them. 🃏'],
      },
    },
    doppelganger: {
      title: { parents: 'Doppelgänger', family: 'Doppelgänger', childhood: 'Generic baby', pick: 'Usual suspect' },
      parents: {
        one: [
          '{value} votes wrongly went to {names}. Apparently everyone’s parents look like yours.',
          'People picked {names} {value} times for someone else’s parent. You have one of those families.',
        ],
        many: ['{value} wrong votes each for {names}. Everyone’s parents look like yours, apparently.'],
      },
      family: {
        one: [
          '{value} votes wrongly went to {names}. Apparently everyone’s people look like yours.',
          'People picked {names} {value} times for someone else’s photo. You have one of those faces.',
        ],
        many: ['{value} wrong votes each for {names}. Everyone’s people look like yours, apparently.'],
      },
      childhood: {
        one: [
          '{value} votes wrongly went to {names}. Apparently every baby looks like you. 👶',
          'People saw {names} {value} times in someone else’s baby photo. You have one of those faces.',
        ],
        many: ['{value} wrong votes each for {names}. Apparently every baby looks like you. 👶'],
      },
      pick: {
        one: [
          '{value} votes wrongly went to {names}. Apparently every weird pick sounds like you. 🤔',
          'People blamed {names} {value} times for someone else’s pick. Your reputation precedes you.',
        ],
        many: ['{value} wrong votes each for {names}. Every weird pick sounds like you, apparently.'],
      },
    },
    mostConfusing: {
      title: same('Most confusing photo'),
      text: ['{possessive} got votes for {value} different people. Total chaos.', '{possessive} fooled everyone: {value} different suspects!'],
    },
    biggestMixup: {
      title: same('Biggest mix-up'),
      /** {possessive}: "Paul's mom" (mid-sentence), {names}: the owner, {other}: who got picked instead. */
      daron: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      daronne: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      brother: ["{value} people think {possessive} is actually {other}'s. {other}, a secret sibling? 👀"],
      sister: ["{value} people think {possessive} is actually {other}'s. {other}, a secret sibling? 👀"],
      grandpa: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      grandma: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      friend: ["{value} people think {possessive} is actually {other}'s. Friend thief! 👀"],
      partner: ["{value} people think {possessive} is actually {other}'s. Awkward… 😬"],
      pet: ["{value} people think {possessive} is actually {other}'s. {other}, give the pet back! 🐾"],
      kid: ['{value} people were sure this cutie was {other}. Plot twist: it’s {names}! Separated at birth?'],
      pick: ['{value} people think {other} picked this one. Nope, it was {names}! But {other}, it does sound like you.'],
    },
    stat: {
      sherlock: '{value}/{total} ✓',
      needsGlasses: '{value}/{total} ✓',
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
    /** Under "found/votes" on the viewer's own photos. */
    recognised: {
      parents: 'recognised your parents',
      family: 'matched your photos',
      childhood: 'recognised mini you',
      pick: 'knew it was you',
    },
    noPhotos: {
      parents: 'No parents this time',
      family: 'No photos this time',
      childhood: 'No baby photo this time',
      pick: 'No pick this time',
    },
    noVotes: 'no votes',
    yourPhoto: {
      daron: 'Your dad',
      daronne: 'Your mom',
      brother: 'Your brother',
      sister: 'Your sister',
      grandpa: 'Your grandpa',
      grandma: 'Your grandma',
      friend: 'Your friend',
      partner: 'Your partner',
      pet: 'Your pet',
      kid: 'Mini you',
      pick: 'Your pick',
    },
    photoScore: '{correct}/{total}',
    yourAwards: 'Your awards',
    verdict: {
      first: {
        parents: ['Undisputed parent detective. 🏆', 'Nobody can hide a parent from you.'],
        family: ['Undisputed family detective. 🏆', 'Nobody can hide a relative from you.'],
        childhood: ['Undisputed baby-face detective. 🏆', 'Nobody can hide their baby pics from you.'],
        pick: ['Undisputed mind reader. 🔮', 'Nobody can hide their taste from you.'],
      },
      podium: ['On the podium! Your mom would be proud.', 'Podium! Not bad at all, detective.'],
      middle: ['Solid effort. Some photos remain a mystery.', 'Right in the middle. Very balanced, very Swiss.'],
      last: ['Last place. Do you even know your friends? 😬', 'Dead last. Maybe hang out with your friends more?'],
      afk: ['You didn’t guess a single photo. Were you even here? 👻'],
      nobody: ['Tied first… with zero points. Nothing to brag about. 🙃'],
    },
    share: 'Share my score',
  },
  wall: {
    title: { parents: 'The parent wall', family: 'The photo wall', childhood: 'The baby wall', pick: 'The wall of picks' },
    subtitle: 'Tap a photo to zoom in',
    badge: '{correct}/{total} ✓',
    lightbox: '{caption} · {correct}/{total} found it',
    youGotIt: 'You got it',
    youMissed: 'You missed it',
  },
  bar: {
    playAgain: 'Play again 🔁',
    waiting: 'Waiting for {host}…',
    share: 'Share my score',
  },
  share: {
    first: 'I won at Daron Guessr 🏆 {correct}/{guesses} photos guessed! Your turn:',
    other: 'I finished #{rank} at Daron Guessr 🕵️ {correct}/{guesses} photos guessed! Your turn:',
    copied: 'Score copied, paste it anywhere!',
    failed: 'Couldn’t share your score.',
  },
};

const fr: typeof en = {
  title: 'Et le gagnant est…',
  winner: {
    one: {
      parents: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, spécialiste des darons !', '{name} connaît vos darons mieux que vous.'],
      family: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, spécialiste des familles !', '{name} connaît vos proches mieux que vous.'],
      childhood: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, spécialiste des bébés ! 👶', '{name} vous reconnaîtrait tous en couche-culotte.'],
      pick: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, télépathe officiel·le ! 🔮', '{name} connaît vos goûts mieux que vous.'],
    },
    me: {
      parents: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Les darons de tes potes n’ont aucun secret pour toi.'],
      family: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Les proches de tes potes n’ont aucun secret pour toi.'],
      childhood: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Aucune bouille de bébé ne te résiste.'],
      pick: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Tu lis dans tes potes comme dans un livre ouvert.'],
    },
    tie: ['Égalité ! {names} se partagent la couronne.', 'Impossible de les départager : {names} règnent ensemble !'],
    nobody: ['Personne n’a marqué un seul point… Tout le monde a perdu ! 🙈', 'Zéro pointé pour tout le monde. Vous vous connaissez vraiment ?'],
  },
  and: 'et',
  pts: 'pts',
  more: '+{count}',
  ranking: {
    title: 'Classement final',
    guessedRight: '{correct}/{guesses} trouvés',
    noGuesses: 'Aucun vote 😴',
  },
  awards: {
    title: 'Les trophées',
    subtitle: 'La cérémonie que personne n’a demandée',
    none: 'Pas de trophée cette fois : pas assez de votes pour juger qui que ce soit. 🤷',
    photoOf: 'Photo du trophée',
    possessiveMid: {
      daron: 'le daron de {name}',
      daronne: 'la daronne de {name}',
      brother: 'le frère de {name}',
      sister: 'la sœur de {name}',
      grandpa: 'le papi de {name}',
      grandma: 'la mamie de {name}',
      friend: 'le ou la pote de {name}',
      partner: 'la moitié de {name}',
      pet: "l'animal de {name}",
      kid: '{name} en version mini',
      pick: 'le choix de {name}',
    },
    sherlock: {
      title: { parents: 'Sherlock', family: 'Sherlock', childhood: 'Sherlock', pick: 'Télépathe' },
      parents: {
        one: [
          '{names} a reconnu {value} darons sur {total}. T’as fouillé les albums photo de tout le monde ?',
          '{names} a reconnu {value} darons sur {total}. Louche. On te surveille. 👀',
        ],
        many: ['{names} ont reconnu {value} darons sur {total} chacun. De vrais détectives privés.'],
      },
      family: {
        one: [
          '{names} a vu juste {value} fois sur {total}. T’as fouillé les albums photo de tout le monde ?',
          '{names} a vu juste {value} fois sur {total}. Louche. On te surveille. 👀',
        ],
        many: ['{names} ont vu juste {value} fois sur {total} chacun. De vrais détectives privés.'],
      },
      childhood: {
        one: [
          '{names} a reconnu {value} bouilles de bébé sur {total}. T’étais à la maternité ou quoi ?',
          '{names} a reconnu {value} bouilles de bébé sur {total}. T’as bossé à leur crèche ? 👀',
        ],
        many: ['{names} ont reconnu {value} bouilles de bébé sur {total} chacun. D’anciens de la crèche, forcément.'],
      },
      pick: {
        one: [
          '{names} a deviné qui avait choisi quoi {value} fois sur {total}. Tu lis dans nos pensées ? 🔮',
          '{names} a vu juste {value} fois sur {total}. Tu nous connais beaucoup trop bien. 👀',
        ],
        many: ['{names} ont deviné qui avait choisi quoi {value} fois sur {total} chacun. Une secte de télépathes. 🔮'],
      },
    },
    needsGlasses: {
      title: { parents: 'Besoin de lunettes', family: 'Besoin de lunettes', childhood: 'Besoin de lunettes', pick: 'Connaît personne' },
      parents: {
        one: [
          '{names} a trouvé {value} sur {total}. Rendez-vous chez l’ophtalmo pris d’office.',
          '{names} a trouvé {value} sur {total}. Incapable de reconnaître un daron dans une foule d’une personne.',
        ],
        many: ['{names} ont trouvé {value} sur {total}. Tarif de groupe chez l’opticien !'],
      },
      family: {
        one: [
          '{names} a trouvé {value} sur {total}. Rendez-vous chez l’ophtalmo pris d’office.',
          '{names} a trouvé {value} sur {total}. Incapable de reconnaître un visage familier dans une foule d’une personne.',
        ],
        many: ['{names} ont trouvé {value} sur {total}. Tarif de groupe chez l’opticien !'],
      },
      childhood: {
        one: [
          '{names} a trouvé {value} sur {total}. En même temps, tous les bébés se ressemblent. 👶',
          '{names} a trouvé {value} sur {total}. Capable de ne pas se reconnaître sur ses propres photos de bébé.',
        ],
        many: ['{names} ont trouvé {value} sur {total}. En même temps, tous les bébés se ressemblent. 👶'],
      },
      pick: {
        one: [
          '{names} a trouvé {value} sur {total}. Tu les connais vraiment, ces gens ? 😬',
          '{names} a trouvé {value} sur {total}. Faudrait parler à tes potes de temps en temps.',
        ],
        many: ['{names} ont trouvé {value} sur {total}. De parfaits inconnus, tous autant qu’ils sont.'],
      },
    },
    carbonCopy: {
      title: { parents: 'Copié-collé', family: 'Copié-collé', childhood: 'Pas changé d’un poil', pick: 'Livre ouvert' },
      parents: {
        one: [
          '{value} % des votes sur les darons de {names} étaient bons. Même tête, pas besoin de test ADN. 🧬',
          '{value} % ont reconnu direct les darons de {names}. Les chiens ne font pas des chats.',
        ],
        many: ['{value} % des votes sur les darons de {names} étaient bons. Des photocopies ambulantes.'],
      },
      family: {
        one: [
          '{value} % des votes sur les photos de {names} étaient bons. Même vibe, pas besoin de test ADN. 🧬',
          '{value} % ont reconnu direct l’entourage de {names}. Qui se ressemble s’assemble.',
        ],
        many: ['{value} % des votes sur les photos de {names} étaient bons. Des photocopies ambulantes.'],
      },
      childhood: {
        one: ['{value} % ont reconnu {names} en version mini. Même tête, en plus grand. 📏', '{value} % ont grillé mini-{names} direct. T’as jamais grandi en fait ?'],
        many: ['{value} % ont reconnu {names} en version mini. Mêmes têtes, en plus grand. 📏'],
      },
      pick: {
        one: ['{value} % ont grillé le choix de {names} direct. Prévisible à souhait. 📖', '{value} % des votes sur les choix de {names} étaient bons. Aucun mystère, aucun secret.'],
        many: ['{value} % ont grillé les choix de {names} direct. Prévisibles à souhait. 📖'],
      },
    },
    masterOfDisguise: {
      title: { parents: 'Maître du déguisement', family: 'Maître du déguisement', childhood: 'Méconnaissable', pick: 'Impénétrable' },
      parents: {
        one: [
          'Seulement {value} % ont reconnu les darons de {names}. On t’aurait pas échangé à la maternité ?',
          'Seulement {value} % ont reconnu les darons de {names}. T’es sûr·e que c’est ta famille ?',
        ],
        many: ['Seulement {value} % ont reconnu les darons de {names}. Tous échangés à la maternité ?'],
      },
      family: {
        one: [
          'Seulement {value} % ont reconnu l’entourage de {names}. T’es sûr·e que tu les connais ?',
          'Seulement {value} % ont reconnu l’entourage de {names}. Aucun air de famille. Louche.',
        ],
        many: ['Seulement {value} % ont reconnu l’entourage de {names}. Mais c’est qui, tous ces gens ?'],
      },
      childhood: {
        one: [
          'Seulement {value} % ont reconnu {names} en version mini. Quelle métamorphose ! ✨',
          'Seulement {value} % ont reconnu {names} en version mini. On t’aurait pas échangé à la maternité ?',
        ],
        many: ['Seulement {value} % ont reconnu {names} en version mini. Métamorphoses en série ! ✨'],
      },
      pick: {
        one: ['Seulement {value} % ont deviné le choix de {names}. Personne ne l’avait vu venir. 🃏', 'Seulement {value} % ont deviné le choix de {names}. Toujours là où on ne l’attend pas.'],
        many: ['Seulement {value} % ont deviné les choix de {names}. Personne ne les avait vus venir. 🃏'],
      },
    },
    doppelganger: {
      title: { parents: 'Sosie officiel', family: 'Sosie officiel', childhood: 'Bébé passe-partout', pick: 'Suspect n°1' },
      parents: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Apparemment, tous les darons te ressemblent.',
          'On a pris {names} {value} fois pour l’enfant de quelqu’un d’autre. T’as une tête de famille, toi.',
        ],
        many: ['{value} votes à tort chacun pour {names}. Tous les darons vous ressemblent, apparemment.'],
      },
      family: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Apparemment, tout le monde a un air de famille avec toi.',
          'On a désigné {names} {value} fois pour la photo de quelqu’un d’autre. T’as une tête de famille, toi.',
        ],
        many: ['{value} votes à tort chacun pour {names}. Tout le monde a un air de famille avec vous, apparemment.'],
      },
      childhood: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Apparemment, tous les bébés te ressemblent. 👶',
          'On a vu {names} {value} fois sur des photos de bébé qui n’étaient pas les siennes. T’as une bouille passe-partout.',
        ],
        many: ['{value} votes à tort chacun pour {names}. Apparemment, tous les bébés vous ressemblent. 👶'],
      },
      pick: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Apparemment, tous les choix chelous te ressemblent. 🤔',
          'On a accusé {names} {value} fois pour le choix de quelqu’un d’autre. Ta réputation te précède.',
        ],
        many: ['{value} votes à tort chacun pour {names}. Tous les choix chelous vous ressemblent, apparemment.'],
      },
    },
    mostConfusing: {
      title: same('La photo qui embrouille'),
      text: ['{possessive} a récolté des votes pour {value} personnes différentes. Le chaos total.', '{possessive} a semé le doute : {value} suspects différents !'],
    },
    biggestMixup: {
      title: same('La grosse confusion'),
      daron: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, un truc à nous avouer ?'],
      daronne: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, un truc à nous avouer ?'],
      brother: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, un frère caché ? 👀'],
      sister: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, une sœur cachée ? 👀'],
      grandpa: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, un truc à nous avouer ?'],
      grandma: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, un truc à nous avouer ?'],
      friend: ['{value} personnes ont refilé {possessive} à {other}. Vol de pote en bande organisée ! 👀'],
      partner: ['{value} personnes pensent que {possessive} est en fait celle de {other}. Gênant… 😬'],
      pet: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, rends-lui sa bestiole ! 🐾'],
      kid: ['{value} personnes étaient sûres que ce bout de chou, c’était {other}. Raté : c’est {names} ! Séparés à la naissance ?'],
      pick: ['{value} personnes pensent que c’est {other} qui a choisi cette image. Raté, c’est {names} ! Mais avoue {other}, ça te ressemble.'],
    },
    stat: {
      sherlock: '{value}/{total} ✓',
      needsGlasses: '{value}/{total} ✓',
      carbonCopy: '{value} %',
      masterOfDisguise: '{value} %',
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
    recognised: {
      parents: 'ont reconnu tes darons',
      family: 'ont trouvé tes photos',
      childhood: 'ont reconnu mini-toi',
      pick: 'ont deviné que c’était toi',
    },
    noPhotos: {
      parents: 'Pas de darons cette fois',
      family: 'Pas de photos cette fois',
      childhood: 'Pas de photo de bébé cette fois',
      pick: 'Pas de choix cette fois',
    },
    noVotes: 'aucun vote',
    yourPhoto: {
      daron: 'Ton daron',
      daronne: 'Ta daronne',
      brother: 'Ton frère',
      sister: 'Ta sœur',
      grandpa: 'Ton papi',
      grandma: 'Ta mamie',
      friend: 'Ton/ta pote',
      partner: 'Ta moitié',
      pet: 'Ton animal',
      kid: 'Mini-toi',
      pick: 'Ton choix',
    },
    photoScore: '{correct}/{total}',
    yourAwards: 'Tes trophées',
    verdict: {
      first: {
        parents: ['Détective des darons incontesté·e. 🏆', 'Impossible de te cacher un daron.'],
        family: ['Détective des familles incontesté·e. 🏆', 'Impossible de te cacher un proche.'],
        childhood: ['Détective des bébés incontesté·e. 🏆', 'Impossible de te cacher une photo de bébé.'],
        pick: ['Télépathe incontesté·e. 🔮', 'Impossible de te cacher quoi que ce soit.'],
      },
      podium: ['Sur le podium ! Ta daronne serait fière.', 'Podium ! Pas mal du tout, inspecteur.'],
      middle: ['Honnête. Certaines photos restent un mystère.', 'Pile au milieu. Très suisse, tout ça.'],
      last: ['Lanterne rouge. Tu connais vraiment tes potes ? 😬', 'Dernière place. Faudrait voir tes potes plus souvent.'],
      afk: ['T’as pas voté une seule fois. T’étais là au moins ? 👻'],
      nobody: ['Premier ex æquo… avec zéro point. Pas de quoi frimer. 🙃'],
    },
    share: 'Partager mon score',
  },
  wall: {
    title: { parents: 'Le mur des darons', family: 'Le mur des photos', childhood: 'Le mur des bébés', pick: 'Le mur des choix' },
    subtitle: 'Touche une photo pour zoomer',
    badge: '{correct}/{total} ✓',
    lightbox: '{caption} · {correct}/{total} ont trouvé',
    youGotIt: 'Trouvé',
    youMissed: 'Raté',
  },
  bar: {
    playAgain: 'Rejouer 🔁',
    waiting: 'On attend {host}…',
    share: 'Partager mon score',
  },
  share: {
    first: 'J’ai gagné à Daron Guessr 🏆 {correct}/{guesses} photos trouvées ! À ton tour :',
    other: 'J’ai fini #{rank} à Daron Guessr 🕵️ {correct}/{guesses} photos trouvées ! À ton tour :',
    copied: 'Score copié, colle-le où tu veux !',
    failed: 'Impossible de partager ton score.',
  },
};

export default { en, fr };
