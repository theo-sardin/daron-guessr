// Strings for the results screen. `fr` must mirror `en` exactly (enforced by the type).
//
// Copy that depends on what the photos show comes in eight "flavors" (see `Flavor` in
// screens/results/helpers.ts): one per mode — `parents` (dads & moms), `childhood` (players as
// kids), `pick` (pictures players picked), `roll` (camera-roll roulette), `crush` (teen crushes),
// `whois` (photos of the players themselves), `body` (body parts) — and `family` for anything
// else (siblings, friends, pets, a mix of kinds…). Per-photo copy is keyed by photo kind instead.

/** Same text whatever the flavor. */
const same = <T,>(text: T) => ({ parents: text, family: text, childhood: text, pick: text, roll: text, crush: text, whois: text, body: text });

const en = {
  title: 'And the winner is…',
  /** Sub title once the winner landed on the podium. */
  winner: {
    one: {
      parents: ['{name} takes the crown!', 'All hail {name}, parent whisperer!', '{name} knows your parents better than you do.'],
      family: ['{name} takes the crown!', 'All hail {name}, family whisperer!', '{name} knows your people better than you do.'],
      childhood: ['{name} takes the crown!', 'All hail {name}, baby whisperer! 👶', '{name} would recognise you all in diapers.'],
      pick: ['{name} takes the crown!', 'All hail {name}, mind reader! 🔮', '{name} knows your taste better than you do.'],
      roll: ['{name} takes the crown!', 'All hail {name}, camera-roll whisperer! 📱', '{name} knows your phones better than you do.'],
      crush: ['{name} takes the crown!', 'All hail {name}, keeper of teen secrets! 💘', '{name} knows exactly who was on your bedroom wall.'],
      whois: ['{name} takes the crown!', 'All hail {name}, face detective! 🧐', '{name} would recognise you all through frosted glass.'],
      body: ['{name} takes the crown!', 'All hail {name}, anatomy expert! 🔬', '{name} would recognise you all by your elbows.'],
    },
    me: {
      parents: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! Your friends’ parents have no secrets for you.'],
      family: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! Your friends’ families have no secrets for you.'],
      childhood: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! No baby face can fool you.'],
      pick: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! You read your friends like an open book.'],
      roll: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! Your friends’ camera rolls have no secrets for you.'],
      crush: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! You know everyone’s teen crushes by heart. 💘'],
      whois: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! No face can hide from you, blurry or not.'],
      body: ['That’s YOU! Take a bow. 🙇', 'You won! Frame this moment. 🖼️', 'Champion! You know your friends inside out. Well, outside.'],
    },
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
    /** Blur games: part of the score that comes from the speed bonus (after a ⚡). */
    bonus: 'incl. +{bonus} bonus',
    /** Screen-reader text of the same. */
    bonusAria: 'including a {bonus}-point speed bonus',
    /** Tag on the last player when they stand alone at the bottom. */
    shame: 'the shame',
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
      brother: "{name}'s brother",
      sister: "{name}'s sister",
      grandpa: "{name}'s grandpa",
      grandma: "{name}'s grandma",
      friend: "{name}'s friend",
      partner: "{name}'s partner",
      pet: "{name}'s pet",
      kid: '{name} as a kid',
      pick: "{name}'s pick",
      roll: "{name}'s camera roll",
      crush: "{name}'s teen crush",
      me: "{name}'s photo",
      hand: "{name}'s hand",
      foot: "{name}'s foot",
      ear: "{name}'s ear",
      eye: "{name}'s eye",
      nose: "{name}'s nose",
      smile: "{name}'s smile",
      knee: "{name}'s knee",
      elbow: "{name}'s elbow",
      navel: "{name}'s belly button",
      hair: "{name}'s hair",
    },
    sherlock: {
      title: { parents: 'Sherlock', family: 'Sherlock', childhood: 'Sherlock', pick: 'Mind reader', roll: 'Phone snoop', crush: 'Love detective', whois: 'Face reader', body: 'Forensic expert' },
      parents: {
        one: [
          '{names} spotted {value} out of {total} parents. Were you going through everyone’s photo albums?',
          '{names} spotted {value} out of {total} parents. Suspiciously good. We’re watching you. 👀',
        ],
        many: ['{names} spotted {value} out of {total} parents each. Great minds stalk alike.'],
      },
      family: {
        one: [
          '{names} got {value} out of {total} right. Were you going through everyone’s photo albums?',
          '{names} got {value} out of {total} right. Suspiciously good. We’re watching you. 👀',
        ],
        many: ['{names} got {value} out of {total} right each. Great minds stalk alike.'],
      },
      childhood: {
        one: [
          '{names} recognised {value} out of {total} baby faces. Were you there when they were born?',
          '{names} recognised {value} out of {total} baby faces. Did you work at their daycare? 👀',
        ],
        many: ['{names} recognised {value} out of {total} baby faces each. Former daycare staff, all of them.'],
      },
      pick: {
        one: [
          '{names} guessed who picked what {value} times out of {total}. Are you reading our minds? 🔮',
          '{names} matched {value} out of {total} pictures to their picker. You know us way too well. 👀',
        ],
        many: ['{names} guessed who picked what {value} times out of {total} each. A coven of mind readers. 🔮'],
      },
      roll: {
        one: [
          '{names} matched {value} out of {total} camera rolls. Have you been going through our phones? 📱',
          '{names} got {value} out of {total} right. You know what’s in our phones. That’s creepy. 👀',
        ],
        many: ['{names} matched {value} out of {total} camera rolls each. Phone snoops, the lot of them.'],
      },
      crush: {
        one: [
          '{names} matched {value} out of {total} teen crushes. Were you reading everyone’s diary? 📔',
          '{names} got {value} out of {total} right. You knew about the posters, didn’t you? 👀',
        ],
        many: ['{names} matched {value} out of {total} teen crushes each. Diary readers, all of them.'],
      },
      whois: {
        one: [
          '{names} recognised {value} out of {total} faces. Even blurry, nobody hides from you.',
          '{names} recognised {value} out of {total} faces. Facial recognition, but make it human. 👀',
        ],
        many: ['{names} recognised {value} out of {total} faces each. A security camera would be jealous. 📹'],
      },
      body: {
        one: [
          '{names} identified {value} out of {total} body parts. How do you know these so well? 🤨',
          '{names} got {value} out of {total} right. You’ve studied our elbows, haven’t you? 👀',
        ],
        many: ['{names} identified {value} out of {total} body parts each. Questions will be asked.'],
      },
    },
    needsGlasses: {
      title: {
        parents: 'Needs glasses',
        family: 'Needs glasses',
        childhood: 'Needs glasses',
        pick: 'Total stranger',
        roll: 'Total stranger',
        crush: 'Clueless',
        whois: 'Needs glasses',
        body: 'Needs glasses',
      },
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
          '{names} got {value} out of {total} right. To be fair, all babies look the same. 👶',
          '{names} got {value} out of {total} right. Would not even recognise their own baby photo.',
        ],
        many: ['{names} got {value} out of {total} right. To be fair, all babies look the same. 👶'],
      },
      pick: {
        one: [
          '{names} got {value} out of {total} right. Do you even know these people? 😬',
          '{names} got {value} out of {total} right. Maybe try talking to your friends sometimes.',
        ],
        many: ['{names} got {value} out of {total} right. Total strangers, all of you.'],
      },
      roll: {
        one: [
          '{names} got {value} out of {total} right. Do you even know these people? 😬',
          '{names} got {value} out of {total} right. Maybe ask your friends what they’re up to sometimes.',
        ],
        many: ['{names} got {value} out of {total} right. Total strangers, all of you.'],
      },
      crush: {
        one: [
          '{names} got {value} out of {total} right. Never once listened during sleepovers.',
          '{names} got {value} out of {total} right. Missed every single heart drawn in a notebook. 😬',
        ],
        many: ['{names} got {value} out of {total} right. Never invited to the sleepovers, clearly.'],
      },
      whois: {
        one: [
          '{names} got {value} out of {total} right. Couldn’t recognise a friend standing right there.',
          '{names} got {value} out of {total} right. Everything looks blurry to you, even at the end. 🌫️',
        ],
        many: ['{names} got {value} out of {total} right. Group discount at the optician!'],
      },
      body: {
        one: ['{names} got {value} out of {total} right. A knee is a knee, right? 🦵', '{names} got {value} out of {total} right. Would not recognise their own hand.'],
        many: ['{names} got {value} out of {total} right. To be fair, all elbows look the same.'],
      },
    },
    carbonCopy: {
      title: {
        parents: 'Carbon copy',
        family: 'Carbon copy',
        childhood: 'Hasn’t changed a bit',
        pick: 'Open book',
        roll: 'Open book',
        crush: 'So predictable',
        whois: 'Unmistakable',
        body: 'One of a kind',
      },
      parents: {
        one: [
          "{value}% of the guesses on {names}'s parents were right. Same face, no DNA test needed. 🧬",
          "{value}% recognised {names}'s parents instantly. The apple did not fall far from the tree.",
        ],
        many: ['{value}% of the guesses on the parents of {names} were right. Walking photocopies.'],
      },
      family: {
        one: [
          "{value}% of the guesses on {names}'s photos were right. Same vibe, no DNA test needed. 🧬",
          "{value}% matched {names}'s photos instantly. Your people are written all over your face.",
        ],
        many: ['{value}% of the guesses on the photos of {names} were right. Walking photocopies.'],
      },
      childhood: {
        one: ['{value}% recognised {names} as a kid. Same face, just taller. 📏', '{value}% spotted mini {names} instantly. Did you ever grow up?'],
        many: ['{value}% recognised {names} as kids. Same faces, just taller. 📏'],
      },
      pick: {
        one: ["{value}% saw {names}'s pick coming a mile away. So predictable. 📖", "{value}% of the guesses on {names}'s picks were right. No secrets, no mystery."],
        many: ['{value}% saw the picks of {names} coming a mile away. Predictable, all of them. 📖'],
      },
      roll: {
        one: ["{value}% knew that camera roll was {names}'s. Your phone is an open book. 📖", "{value}% of the guesses on {names}'s camera roll were right. Zero mystery."],
        many: ['{value}% recognised the camera rolls of {names}. Predictable phones, all of them.'],
      },
      crush: {
        one: ["{value}% knew {names}'s teen crush. Everyone saw the posters. 💌", "{value}% of the guesses on {names}'s crush were right. You weren’t subtle at 14."],
        many: ['{value}% guessed the crushes of {names}. Not subtle teens, any of them.'],
      },
      whois: {
        one: ['{value}% recognised {names} right away. Same face since forever. 🎯', '{value}% spotted {names} instantly, blur or no blur.'],
        many: ['{value}% recognised {names} right away. Unmistakable faces, all of them. 🎯'],
      },
      body: {
        one: ["{value}% recognised {names}'s body parts. Distinctive, to say the least. 🦄", "{value}% of the guesses on {names}'s close-ups were right. Recognisable from any angle."],
        many: ['{value}% recognised the close-ups of {names}. Distinctive, all of them.'],
      },
    },
    masterOfDisguise: {
      title: {
        parents: 'Master of disguise',
        family: 'Master of disguise',
        childhood: 'Glow-up of the year',
        pick: 'Poker face',
        roll: 'Poker face',
        crush: 'Secret crush',
        whois: 'Glow-up of the year',
        body: 'Incognito',
      },
      parents: {
        one: ["Only {value}% recognised {names}'s parents. Are you sure you’re not adopted?", "Only {value}% recognised {names}'s parents. Swapped at birth, maybe?"],
        many: ['Only {value}% recognised the parents of {names}. Swapped at birth, all of them?'],
      },
      family: {
        one: ["Only {value}% matched {names}'s photos. Are you sure you know these people?", "Only {value}% matched {names}'s photos. Zero family resemblance. Suspicious."],
        many: ['Only {value}% matched the photos of {names}. Who even are these people?'],
      },
      childhood: {
        one: ['Only {value}% recognised {names} as a kid. What a glow-up! ✨', 'Only {value}% recognised {names} as a kid. Swapped at birth, maybe?'],
        many: ['Only {value}% recognised {names} as kids. Glow-ups all round! ✨'],
      },
      pick: {
        one: ["Only {value}% guessed {names}'s pick. Nobody saw that coming. 🃏", "Only {value}% guessed {names}'s pick. Full of surprises, aren’t you?"],
        many: ['Only {value}% guessed the picks of {names}. Full of surprises, all of them. 🃏'],
      },
      roll: {
        one: ["Only {value}% guessed {names}'s camera roll. What do you even do with your phone? 🃏", "Only {value}% matched {names}'s camera roll. A phone full of surprises."],
        many: ['Only {value}% matched the camera rolls of {names}. Mysterious phones, all of them.'],
      },
      crush: {
        one: ["Only {value}% guessed {names}'s teen crush. A secret kept since middle school. 🤫", "Only {value}% guessed {names}'s crush. Nobody saw that one coming."],
        many: ['Only {value}% guessed the crushes of {names}. Secret admirers, all of them. 🤫'],
      },
      whois: {
        one: ['Only {value}% recognised {names}. Is that really you? ✨', 'Only {value}% recognised {names}. Witness protection would hire you.'],
        many: ['Only {value}% recognised {names}. Unrecognisable, all of them. ✨'],
      },
      body: {
        one: ["Only {value}% recognised {names}'s close-ups. Nobody knows you that well. 🕶️", "Only {value}% identified {names}'s body parts. Totally incognito."],
        many: ['Only {value}% recognised the close-ups of {names}. Incognito, all of them. 🕶️'],
      },
    },
    doppelganger: {
      title: {
        parents: 'Doppelgänger',
        family: 'Doppelgänger',
        childhood: 'Generic baby',
        pick: 'Usual suspect',
        roll: 'Usual suspect',
        crush: 'Fickle heart',
        whois: 'Doppelgänger',
        body: 'Standard model',
      },
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
          '{value} votes wrongly went to {names}. Apparently every baby looks like you. 👶',
          'People saw {names} {value} times in someone else’s baby photo. You have one of those faces.',
        ],
        many: ['{value} wrong votes each for {names}. Apparently every baby looks like you. 👶'],
      },
      pick: {
        one: [
          '{value} votes wrongly went to {names}. Apparently every weird pick sounds like you. 🤔',
          'People blamed {names} {value} times for someone else’s pick. Your reputation precedes you.',
        ],
        many: ['{value} wrong votes each for {names}. Every weird pick sounds like you, apparently.'],
      },
      roll: {
        one: [
          '{value} votes wrongly went to {names}. Every chaotic camera roll sounds like you. 🤔',
          'People blamed {names} {value} times for someone else’s camera roll. Your reputation precedes you.',
        ],
        many: ['{value} wrong votes each for {names}. Every chaotic phone sounds like yours, apparently.'],
      },
      crush: {
        one: [
          '{value} votes wrongly went to {names}. Apparently you had a crush on everyone. 💞',
          'People thought {names} swooned over {value} crushes that weren’t theirs. Big heart.',
        ],
        many: ['{value} wrong votes each for {names}. A crush on everyone, apparently. 💞'],
      },
      whois: {
        one: [
          '{value} votes wrongly went to {names}. Apparently everyone looks like you.',
          'People saw {names} {value} times in someone else’s photo. You have one of those faces. 👯',
        ],
        many: ['{value} wrong votes each for {names}. Everyone looks like you, apparently.'],
      },
      body: {
        one: [
          '{value} votes wrongly went to {names}. Apparently every elbow looks like yours.',
          'People saw {names} {value} times in someone else’s close-up. Very standard parts. 🏭',
        ],
        many: ['{value} wrong votes each for {names}. Every close-up looks like yours, apparently.'],
      },
    },
    /** Blur games only: the most speed-bonus points. */
    eagleEye: {
      title: same('Eagle eye'),
      one: [
        '{names} grabbed {value} bonus points by guessing through the blur. Who needs pixels? 👀',
        '{names} recognised everyone before the photo even sharpened: +{value} speed bonus. 🦅',
      ],
      many: ['{names} grabbed {value} bonus points each by guessing through the blur. Laser eyes, all of them. ⚡'],
    },
    mostConfusing: {
      title: same('Most confusing photo'),
      /** {possessive}: "Paul's mom" (mid-sentence), {Possessive}: the same at the start of a sentence. */
      text: ['{Possessive} got votes for {value} different people. Total chaos. 🌀', '{Possessive} fooled everyone: {value} different suspects!'],
    },
    biggestMixup: {
      title: same('Biggest mix-up'),
      /** {possessive}: "Paul's mom" (mid-sentence), {names}: the owner, {other}: who got picked instead. */
      daron: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      daronne: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      brother: ["{value} people think {possessive} is actually {other}'s. {other}, a secret sibling? 👀"],
      sister: ["{value} people think {possessive} is actually {other}'s. {other}, a secret sibling? 👀"],
      grandpa: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      grandma: ["{value} people think {possessive} is actually {other}'s. {other}, anything to tell us?"],
      friend: ["{value} people think {possessive} is actually {other}'s. Friend thief! 👀"],
      partner: ["{value} people think {possessive} is actually {other}'s. Awkward… 😬"],
      pet: ["{value} people think {possessive} is actually {other}'s. {other}, give the pet back! 🐾"],
      kid: ['{value} people were sure this cutie was {other}. Plot twist: it’s {names}! Separated at birth?'],
      pick: ['{value} people think {other} picked this one. Nope, it was {names}! But {other}, it does sound like you.'],
      roll: ["{value} people think {possessive} is actually {other}'s. {other}, show us your phone! 📱"],
      crush: ['{value} people were sure {other} had a crush on this one. Nope, it was {names}! {other}, you’re blushing. 😳'],
      me: ['{value} people were sure this was {other}. Nope, it’s {names}! Separated at birth? 👯'],
      hand: ["{value} people think {possessive} is actually {other}'s. Compare palms, you two. ✋"],
      foot: ["{value} people think {possessive} is actually {other}'s. {other}, shoes off, now. 🦶"],
      ear: ["{value} people think {possessive} is actually {other}'s. {other}, are you listening? 👂"],
      eye: ["{value} people think {possessive} is actually {other}'s. {other}, we’ve got our eye on you. 👀"],
      nose: ["{value} people think {possessive} is actually {other}'s. Something smells fishy, {other}. 👃"],
      smile: ["{value} people think {possessive} is actually {other}'s. {other}, say cheese to compare! 😁"],
      knee: ["{value} people think {possessive} is actually {other}'s. {other}, roll up your trousers. 🦵"],
      elbow: ["{value} people think {possessive} is actually {other}'s. {other}, elbows on the table, let’s compare. 💪"],
      navel: ["{value} people think {possessive} is actually {other}'s. {other}, nothing to declare? 🛃"],
      hair: ["{value} people think {possessive} is actually {other}'s. {other}, same hairdresser? 💇"],
    },
    stat: {
      sherlock: '{value}/{total} ✓',
      needsGlasses: '{value}/{total} ✓',
      carbonCopy: '{value}%',
      masterOfDisguise: '{value}%',
      doppelganger: '×{value}',
      mostConfusing: '{value} suspects',
      biggestMixup: '{value} votes',
      eagleEye: '⚡ +{value} pts',
    },
  },
  mine: {
    title: 'Your game',
    rank: '#{rank}',
    outOf: 'out of {count}',
    /** Screen-reader text of the rank badge. */
    rankAria: 'Rank {rank} out of {count}',
    guessed: 'guessed right',
    /** Blur games: the viewer's speed bonus. */
    bonus: 'speed bonus',
    /** Under "found/votes" on the viewer's own photos. */
    recognised: {
      parents: 'recognised your parents',
      family: 'matched your photos',
      childhood: 'recognised mini you',
      pick: 'knew it was you',
      roll: 'knew it was your phone',
      crush: 'guessed your crush',
      whois: 'recognised you',
      body: 'recognised your parts',
    },
    noPhotos: {
      parents: 'No parents this time',
      family: 'No photos this time',
      childhood: 'No baby photo this time',
      pick: 'No pick this time',
      roll: 'No camera roll this time',
      crush: 'No crush this time',
      whois: 'No photo of you this time',
      body: 'No close-ups this time',
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
      roll: 'Your camera roll',
      crush: 'Your crush',
      me: 'You!',
      hand: 'Your hand',
      foot: 'Your foot',
      ear: 'Your ear',
      eye: 'Your eye',
      nose: 'Your nose',
      smile: 'Your smile',
      knee: 'Your knee',
      elbow: 'Your elbow',
      navel: 'Your belly button',
      hair: 'Your hair',
    },
    photoScore: '{correct}/{total}',
    /** Screen-reader text of one of the viewer's photos: "Your mom · 3 of 4 found it". */
    photoAria: '{photo} · {correct} of {total} found it',
    yourAwards: 'Your awards',
    verdict: {
      first: {
        parents: ['Undisputed parent detective. 🏆', 'Nobody can hide a parent from you.'],
        family: ['Undisputed family detective. 🏆', 'Nobody can hide a relative from you.'],
        childhood: ['Undisputed baby-face detective. 🏆', 'Nobody can hide their baby pics from you.'],
        pick: ['Undisputed mind reader. 🔮', 'Nobody can hide their taste from you.'],
        roll: ['Undisputed phone snoop. 📱', 'Nobody can hide their camera roll from you.'],
        crush: ['Undisputed love detective. 💘', 'Nobody can hide a teen crush from you.'],
        whois: ['Undisputed face detective. 🧐', 'Nobody can hide behind a blur from you.'],
        body: ['Undisputed anatomy expert. 🔬', 'Nobody can hide an elbow from you.'],
      },
      podium: ['On the podium! Your mom would be proud.', 'Podium! Not bad at all, detective.'],
      middle: ['Solid effort. Some photos remain a mystery.', 'Right in the middle. Very balanced, very Swiss.'],
      last: ['Last place. Do you even know your friends? 😬', 'Dead last. Maybe hang out with your friends more?'],
      afk: ['You didn’t guess a single photo. Were you even here? 👻'],
      nobody: ['Tied first… with zero points. Nothing to brag about. 🙃'],
    },
    share: 'Share my score',
  },
  wall: {
    title: {
      parents: 'The parent wall',
      family: 'The photo wall',
      childhood: 'The baby wall',
      pick: 'The wall of picks',
      roll: 'The camera-roll wall',
      crush: 'The crush wall',
      whois: 'The face wall',
      body: 'The anatomy wall',
    },
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
      parents: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, spécialiste des darons !', '{name} connaît vos darons mieux que vous.'],
      family: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, spécialiste des familles !', '{name} connaît vos proches mieux que vous.'],
      childhood: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, spécialiste des bébés ! 👶', '{name} vous reconnaîtrait tous en couche-culotte.'],
      pick: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, télépathe officiel·le ! 🔮', '{name} connaît vos goûts mieux que vous.'],
      roll: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, spécialiste des pellicules ! 📱', '{name} connaît vos téléphones mieux que vous.'],
      crush: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, gardien·ne des secrets d’ado ! 💘', '{name} sait exactement qui était en poster dans vos chambres.'],
      whois: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, physionomiste en chef ! 🧐', '{name} vous reconnaîtrait tous derrière une vitre dépolie.'],
      body: ['{name} remporte la couronne !', 'Tous à genoux devant {name}, expert·e en anatomie ! 🔬', '{name} vous reconnaîtrait tous rien qu’au coude.'],
    },
    me: {
      parents: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Les darons de tes potes n’ont aucun secret pour toi.'],
      family: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Les proches de tes potes n’ont aucun secret pour toi.'],
      childhood: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Aucune bouille de bébé ne te résiste.'],
      pick: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Tu lis dans tes potes comme dans un livre ouvert.'],
      roll: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Les pellicules de tes potes n’ont aucun secret pour toi.'],
      crush: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Tu connais les crushs d’ado de tout le monde par cœur. 💘'],
      whois: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Aucun visage ne te résiste, flou ou pas.'],
      body: ['C’est TOI ! Salue la foule. 🙇', 'T’as gagné ! Encadre ce moment. 🖼️', 'Champion·ne ! Tu connais tes potes sous toutes les coutures.'],
    },
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
    bonus: 'dont +{bonus} de bonus',
    bonusAria: 'dont {bonus} points de bonus vitesse',
    shame: 'la honte',
  },
  awards: {
    title: 'Les trophées',
    subtitle: 'La cérémonie que personne n’a demandée',
    none: 'Pas de trophée cette fois : pas assez de votes pour juger qui que ce soit. 🤷',
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
      pet: 'l’animal de {name}',
      kid: '{name} en version mini',
      pick: 'le choix de {name}',
      roll: 'la pellicule de {name}',
      crush: 'le crush d’ado de {name}',
      me: 'la photo de {name}',
      hand: 'la main de {name}',
      foot: 'le pied de {name}',
      ear: 'l’oreille de {name}',
      eye: 'l’œil de {name}',
      nose: 'le nez de {name}',
      smile: 'le sourire de {name}',
      knee: 'le genou de {name}',
      elbow: 'le coude de {name}',
      navel: 'le nombril de {name}',
      hair: 'les cheveux de {name}',
    },
    sherlock: {
      title: {
        parents: 'Sherlock',
        family: 'Sherlock',
        childhood: 'Sherlock',
        pick: 'Télépathe',
        roll: 'Fouineur de téléphones',
        crush: 'Détective du cœur',
        whois: 'Physionomiste',
        body: 'Médecin légiste',
      },
      parents: {
        one: [
          '{names} a reconnu {value} darons sur {total}. T’as fouillé les albums photo de tout le monde ?',
          '{names} a reconnu {value} darons sur {total}. Louche. On te surveille. 👀',
        ],
        many: ['{names} ont reconnu {value} darons sur {total} chacun. De vrais détectives privés.'],
      },
      family: {
        one: [
          '{names} a vu juste {value} fois sur {total}. T’as fouillé les albums photo de tout le monde ?',
          '{names} a vu juste {value} fois sur {total}. Louche. On te surveille. 👀',
        ],
        many: ['{names} ont vu juste {value} fois sur {total} chacun. De vrais détectives privés.'],
      },
      childhood: {
        one: [
          '{names} a reconnu {value} bouilles de bébé sur {total}. T’étais à la maternité ou quoi ?',
          '{names} a reconnu {value} bouilles de bébé sur {total}. T’as bossé à leur crèche ? 👀',
        ],
        many: ['{names} ont reconnu {value} bouilles de bébé sur {total} chacun. D’anciens de la crèche, forcément.'],
      },
      pick: {
        one: [
          '{names} a deviné qui avait choisi quoi {value} fois sur {total}. Tu lis dans nos pensées ? 🔮',
          '{names} a vu juste {value} fois sur {total}. Tu nous connais beaucoup trop bien. 👀',
        ],
        many: ['{names} ont deviné qui avait choisi quoi {value} fois sur {total} chacun. Une secte de télépathes. 🔮'],
      },
      roll: {
        one: [
          '{names} a reconnu {value} pellicules sur {total}. T’as fouillé nos téléphones ? 📱',
          '{names} a vu juste {value} fois sur {total}. Tu sais ce qu’il y a dans nos téléphones. Flippant. 👀',
        ],
        many: ['{names} ont reconnu {value} pellicules sur {total} chacun. Des fouineurs de téléphones, tous.'],
      },
      crush: {
        one: [
          '{names} a deviné {value} crushs d’ado sur {total}. T’as lu le journal intime de tout le monde ? 📔',
          '{names} a vu juste {value} fois sur {total}. Toi, t’étais au courant pour les posters. 👀',
        ],
        many: ['{names} ont deviné {value} crushs d’ado sur {total} chacun. Des lecteurs de journaux intimes.'],
      },
      whois: {
        one: [
          '{names} a reconnu {value} visages sur {total}. Même flou, personne ne t’échappe.',
          '{names} a reconnu {value} visages sur {total}. La reconnaissance faciale, version humaine. 👀',
        ],
        many: ['{names} ont reconnu {value} visages sur {total} chacun. Les caméras de surveillance sont jalouses. 📹'],
      },
      body: {
        one: [
          '{names} a identifié {value} morceaux sur {total}. Comment tu les connais si bien ? 🤨',
          '{names} a vu juste {value} fois sur {total}. T’as étudié nos coudes, avoue. 👀',
        ],
        many: ['{names} ont identifié {value} morceaux sur {total} chacun. On a des questions.'],
      },
    },
    needsGlasses: {
      title: {
        parents: 'Besoin de lunettes',
        family: 'Besoin de lunettes',
        childhood: 'Besoin de lunettes',
        pick: 'Connaît personne',
        roll: 'Connaît personne',
        crush: 'À côté de la plaque',
        whois: 'Besoin de lunettes',
        body: 'Besoin de lunettes',
      },
      parents: {
        one: [
          '{names} a trouvé {value} sur {total}. Rendez-vous chez l’ophtalmo pris d’office.',
          '{names} a trouvé {value} sur {total}. Incapable de reconnaître un daron dans une foule d’une personne.',
        ],
        many: ['{names} ont trouvé {value} sur {total}. Tarif de groupe chez l’opticien !'],
      },
      family: {
        one: [
          '{names} a trouvé {value} sur {total}. Rendez-vous chez l’ophtalmo pris d’office.',
          '{names} a trouvé {value} sur {total}. Incapable de reconnaître un visage familier dans une foule d’une personne.',
        ],
        many: ['{names} ont trouvé {value} sur {total}. Tarif de groupe chez l’opticien !'],
      },
      childhood: {
        one: [
          '{names} a trouvé {value} sur {total}. En même temps, tous les bébés se ressemblent. 👶',
          '{names} a trouvé {value} sur {total}. Capable de ne pas se reconnaître sur ses propres photos de bébé.',
        ],
        many: ['{names} ont trouvé {value} sur {total}. En même temps, tous les bébés se ressemblent. 👶'],
      },
      pick: {
        one: ['{names} a trouvé {value} sur {total}. Tu les connais vraiment, ces gens ? 😬', '{names} a trouvé {value} sur {total}. Faudrait parler à tes potes de temps en temps.'],
        many: ['{names} ont trouvé {value} sur {total}. De parfaits inconnus, tous autant qu’ils sont.'],
      },
      roll: {
        one: ['{names} a trouvé {value} sur {total}. Tu les connais vraiment, ces gens ? 😬', '{names} a trouvé {value} sur {total}. Demande des nouvelles à tes potes, de temps en temps.'],
        many: ['{names} ont trouvé {value} sur {total}. De parfaits inconnus, tous autant qu’ils sont.'],
      },
      crush: {
        one: [
          '{names} a trouvé {value} sur {total}. Jamais écouté une seule confidence en soirée pyjama.',
          '{names} a trouvé {value} sur {total}. N’a vu aucun des cœurs dessinés dans les cahiers. 😬',
        ],
        many: ['{names} ont trouvé {value} sur {total}. Jamais invités aux soirées pyjama, visiblement.'],
      },
      whois: {
        one: [
          '{names} a trouvé {value} sur {total}. Incapable de reconnaître un pote assis juste à côté.',
          '{names} a trouvé {value} sur {total}. Pour toi, tout est resté flou jusqu’au bout. 🌫️',
        ],
        many: ['{names} ont trouvé {value} sur {total}. Tarif de groupe chez l’opticien !'],
      },
      body: {
        one: ['{names} a trouvé {value} sur {total}. Un genou, c’est un genou, non ? 🦵', '{names} a trouvé {value} sur {total}. Capable de ne pas reconnaître sa propre main.'],
        many: ['{names} ont trouvé {value} sur {total}. En même temps, tous les coudes se ressemblent.'],
      },
    },
    carbonCopy: {
      title: {
        parents: 'Copié-collé',
        family: 'Copié-collé',
        childhood: 'Pas changé d’un poil',
        pick: 'Livre ouvert',
        roll: 'Livre ouvert',
        crush: 'Trop prévisible',
        whois: 'Reconnaissable entre mille',
        body: 'Signe distinctif',
      },
      parents: {
        one: [
          '{value} % des votes sur les darons de {names} étaient bons. Même tête, pas besoin de test ADN. 🧬',
          '{value} % ont reconnu direct les darons de {names}. Les chiens ne font pas des chats.',
        ],
        many: ['{value} % des votes sur les darons de {names} étaient bons. Des photocopies ambulantes.'],
      },
      family: {
        one: [
          '{value} % des votes sur les photos de {names} étaient bons. Même vibe, pas besoin de test ADN. 🧬',
          '{value} % ont reconnu direct l’entourage de {names}. Qui se ressemble s’assemble.',
        ],
        many: ['{value} % des votes sur les photos de {names} étaient bons. Des photocopies ambulantes.'],
      },
      childhood: {
        one: ['{value} % ont reconnu {names} en version mini. Même tête, en plus grand. 📏', '{value} % ont grillé mini-{names} direct. T’as jamais grandi en fait ?'],
        many: ['{value} % ont reconnu {names} en version mini. Mêmes têtes, en plus grand. 📏'],
      },
      pick: {
        one: ['{value} % ont grillé le choix de {names} direct. Prévisible à souhait. 📖', '{value} % des votes sur les choix de {names} étaient bons. Aucun mystère, aucun secret.'],
        many: ['{value} % ont grillé les choix de {names} direct. Prévisibles à souhait. 📖'],
      },
      roll: {
        one: ['{value} % ont reconnu la pellicule de {names} direct. Ton téléphone est un livre ouvert. 📖', '{value} % des votes sur la pellicule de {names} étaient bons. Zéro mystère.'],
        many: ['{value} % ont reconnu les pellicules de {names}. Des téléphones prévisibles à souhait.'],
      },
      crush: {
        one: ['{value} % ont deviné le crush d’ado de {names}. Tout le monde avait vu les posters. 💌', '{value} % des votes sur le crush de {names} étaient bons. T’étais pas discret·ète à 14 ans.'],
        many: ['{value} % ont deviné les crushs de {names}. Des ados pas discrets pour un sou.'],
      },
      whois: {
        one: ['{value} % ont reconnu {names} direct. Même tête depuis toujours. 🎯', '{value} % ont grillé {names} tout de suite, flou ou pas flou.'],
        many: ['{value} % ont reconnu {names} direct. Reconnaissables entre mille. 🎯'],
      },
      body: {
        one: ['{value} % ont reconnu les morceaux de {names}. Signe distinctif, c’est le cas de le dire. 🦄', '{value} % des votes sur les gros plans de {names} étaient bons. Reconnaissable sous tous les angles.'],
        many: ['{value} % ont reconnu les gros plans de {names}. Signes distinctifs à gogo.'],
      },
    },
    masterOfDisguise: {
      title: {
        parents: 'Maître du déguisement',
        family: 'Maître du déguisement',
        childhood: 'Méconnaissable',
        pick: 'Impénétrable',
        roll: 'Impénétrable',
        crush: 'Crush secret',
        whois: 'Méconnaissable',
        body: 'Incognito',
      },
      parents: {
        one: [
          'Seulement {value} % ont reconnu les darons de {names}. On t’aurait pas échangé à la maternité ?',
          'Seulement {value} % ont reconnu les darons de {names}. T’es sûr·e que c’est ta famille ?',
        ],
        many: ['Seulement {value} % ont reconnu les darons de {names}. Tous échangés à la maternité ?'],
      },
      family: {
        one: [
          'Seulement {value} % ont reconnu l’entourage de {names}. T’es sûr·e que tu les connais ?',
          'Seulement {value} % ont reconnu l’entourage de {names}. Aucun air de famille. Louche.',
        ],
        many: ['Seulement {value} % ont reconnu l’entourage de {names}. Mais c’est qui, tous ces gens ?'],
      },
      childhood: {
        one: [
          'Seulement {value} % ont reconnu {names} en version mini. Quelle métamorphose ! ✨',
          'Seulement {value} % ont reconnu {names} en version mini. On t’aurait pas échangé à la maternité ?',
        ],
        many: ['Seulement {value} % ont reconnu {names} en version mini. Métamorphoses en série ! ✨'],
      },
      pick: {
        one: ['Seulement {value} % ont deviné le choix de {names}. Personne ne l’avait vu venir. 🃏', 'Seulement {value} % ont deviné le choix de {names}. Toujours là où on ne l’attend pas.'],
        many: ['Seulement {value} % ont deviné les choix de {names}. Personne ne les avait vus venir. 🃏'],
      },
      roll: {
        one: ['Seulement {value} % ont reconnu la pellicule de {names}. Mais tu fais quoi de ton téléphone ? 🃏', 'Seulement {value} % ont reconnu la pellicule de {names}. Un téléphone plein de surprises.'],
        many: ['Seulement {value} % ont reconnu les pellicules de {names}. Des téléphones mystérieux.'],
      },
      crush: {
        one: ['Seulement {value} % ont deviné le crush d’ado de {names}. Un secret bien gardé depuis le collège. 🤫', 'Seulement {value} % ont deviné le crush de {names}. Celui-là, personne ne l’avait vu venir.'],
        many: ['Seulement {value} % ont deviné les crushs de {names}. Des admirateurs secrets, tous. 🤫'],
      },
      whois: {
        one: ['Seulement {value} % ont reconnu {names}. C’est vraiment toi, là ? ✨', 'Seulement {value} % ont reconnu {names}. La protection des témoins va t’embaucher.'],
        many: ['Seulement {value} % ont reconnu {names}. Méconnaissables, tous. ✨'],
      },
      body: {
        one: ['Seulement {value} % ont reconnu les gros plans de {names}. Personne ne te connaît si bien. 🕶️', 'Seulement {value} % ont identifié les morceaux de {names}. Incognito total.'],
        many: ['Seulement {value} % ont reconnu les gros plans de {names}. Incognito, tous. 🕶️'],
      },
    },
    doppelganger: {
      title: {
        parents: 'Sosie officiel',
        family: 'Sosie officiel',
        childhood: 'Bébé passe-partout',
        pick: 'Suspect n°1',
        roll: 'Suspect n°1',
        crush: 'Cœur d’artichaut',
        whois: 'Sosie officiel',
        body: 'Modèle standard',
      },
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
          '{value} votes sont tombés à tort sur {names}. Apparemment, tous les bébés te ressemblent. 👶',
          'On a vu {names} {value} fois sur des photos de bébé qui n’étaient pas les siennes. T’as une bouille passe-partout.',
        ],
        many: ['{value} votes à tort chacun pour {names}. Apparemment, tous les bébés vous ressemblent. 👶'],
      },
      pick: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Apparemment, tous les choix chelous te ressemblent. 🤔',
          'On a accusé {names} {value} fois pour le choix de quelqu’un d’autre. Ta réputation te précède.',
        ],
        many: ['{value} votes à tort chacun pour {names}. Tous les choix chelous vous ressemblent, apparemment.'],
      },
      roll: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Toutes les pellicules chaotiques te ressemblent. 🤔',
          'On a accusé {names} {value} fois pour la pellicule de quelqu’un d’autre. Ta réputation te précède.',
        ],
        many: ['{value} votes à tort chacun pour {names}. Tous les téléphones en bazar vous ressemblent, apparemment.'],
      },
      crush: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Apparemment, t’as craqué pour tout le monde. 💞',
          'On a prêté à {names} {value} crushs d’ado qui n’étaient pas les siens. Cœur d’artichaut.',
        ],
        many: ['{value} votes à tort chacun pour {names}. Des cœurs d’artichaut, apparemment. 💞'],
      },
      whois: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Apparemment, tout le monde te ressemble.',
          'On a vu {names} {value} fois sur la photo de quelqu’un d’autre. T’as une tête passe-partout. 👯',
        ],
        many: ['{value} votes à tort chacun pour {names}. Tout le monde vous ressemble, apparemment.'],
      },
      body: {
        one: [
          '{value} votes sont tombés à tort sur {names}. Apparemment, tous les coudes ressemblent aux tiens.',
          'On a vu {names} {value} fois sur le gros plan de quelqu’un d’autre. Modèle de série. 🏭',
        ],
        many: ['{value} votes à tort chacun pour {names}. Tous les gros plans vous ressemblent, apparemment.'],
      },
    },
    eagleEye: {
      title: same('Œil de lynx'),
      one: [
        '{names} a raflé {value} points de bonus en devinant à travers le flou. Qui a besoin de pixels ? 👀',
        '{names} a reconnu tout le monde avant même que la photo soit nette : +{value} de bonus vitesse. 🦅',
      ],
      many: ['{names} ont raflé {value} points de bonus chacun en devinant à travers le flou. Des yeux laser. ⚡'],
    },
    mostConfusing: {
      title: same('La photo qui embrouille'),
      text: ['{Possessive} a récolté des votes pour {value} personnes différentes. Le chaos total. 🌀', '{Possessive} a semé le doute : {value} suspects différents !'],
    },
    biggestMixup: {
      title: same('La grosse confusion'),
      daron: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, un truc à nous avouer ?'],
      daronne: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, un truc à nous avouer ?'],
      brother: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, un frère caché ? 👀'],
      sister: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, une sœur cachée ? 👀'],
      grandpa: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, un truc à nous avouer ?'],
      grandma: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, un truc à nous avouer ?'],
      friend: ['{value} personnes ont refilé {possessive} à {other}. Vol de pote en bande organisée ! 👀'],
      partner: ['{value} personnes pensent que {possessive} est en fait celle de {other}. Gênant… 😬'],
      pet: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, rends-lui sa bestiole ! 🐾'],
      kid: ['{value} personnes étaient sûres que ce bout de chou, c’était {other}. Raté : c’est {names} ! Séparés à la naissance ?'],
      pick: ['{value} personnes pensent que c’est {other} qui a choisi cette image. Raté, c’est {names} ! Mais avoue {other}, ça te ressemble.'],
      roll: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, montre-nous ton téléphone ! 📱'],
      crush: ['{value} personnes étaient sûres que c’était le crush d’ado de {other}. Raté, c’est celui de {names} ! {other}, tu rougis. 😳'],
      me: ['{value} personnes étaient sûres que c’était {other}. Raté, c’est {names} ! Séparés à la naissance ? 👯'],
      hand: ['{value} personnes pensent que {possessive} est en fait celle de {other}. Comparez vos paumes, tous les deux. ✋'],
      foot: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, enlève tes chaussures. 🦶'],
      ear: ['{value} personnes pensent que {possessive} est en fait celle de {other}. {other}, tu nous écoutes ? 👂'],
      eye: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, on t’a à l’œil. 👀'],
      nose: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, ça sent l’embrouille. 👃'],
      smile: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, souris pour comparer ! 😁'],
      knee: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, remonte ton pantalon. 🦵'],
      elbow: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, coude à coude, on compare. 💪'],
      navel: ['{value} personnes pensent que {possessive} est en fait celui de {other}. {other}, rien à déclarer ? 🛃'],
      hair: ['{value} personnes pensent que {possessive} sont en fait ceux de {other}. {other}, même coiffeur ? 💇'],
    },
    stat: {
      sherlock: '{value}/{total} ✓',
      needsGlasses: '{value}/{total} ✓',
      carbonCopy: '{value} %',
      masterOfDisguise: '{value} %',
      doppelganger: '×{value}',
      mostConfusing: '{value} suspects',
      biggestMixup: '{value} votes',
      eagleEye: '⚡ +{value} pts',
    },
  },
  mine: {
    title: 'Ta partie',
    rank: '#{rank}',
    outOf: 'sur {count}',
    rankAria: 'Rang {rank} sur {count}',
    guessed: 'bien trouvés',
    bonus: 'bonus vitesse',
    recognised: {
      parents: 'ont reconnu tes darons',
      family: 'ont trouvé tes photos',
      childhood: 'ont reconnu mini-toi',
      pick: 'ont deviné que c’était toi',
      roll: 'ont reconnu ta pellicule',
      crush: 'ont deviné ton crush',
      whois: 't’ont reconnu·e',
      body: 'ont reconnu tes morceaux',
    },
    noPhotos: {
      parents: 'Pas de darons cette fois',
      family: 'Pas de photos cette fois',
      childhood: 'Pas de photo de bébé cette fois',
      pick: 'Pas de choix cette fois',
      roll: 'Pas de pellicule cette fois',
      crush: 'Pas de crush cette fois',
      whois: 'Pas de photo de toi cette fois',
      body: 'Pas de gros plans cette fois',
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
      roll: 'Ta pellicule',
      crush: 'Ton crush',
      me: 'Toi !',
      hand: 'Ta main',
      foot: 'Ton pied',
      ear: 'Ton oreille',
      eye: 'Ton œil',
      nose: 'Ton nez',
      smile: 'Ton sourire',
      knee: 'Ton genou',
      elbow: 'Ton coude',
      navel: 'Ton nombril',
      hair: 'Tes cheveux',
    },
    photoScore: '{correct}/{total}',
    photoAria: '{photo} · {correct} sur {total} ont trouvé',
    yourAwards: 'Tes trophées',
    verdict: {
      first: {
        parents: ['Détective des darons incontesté·e. 🏆', 'Impossible de te cacher un daron.'],
        family: ['Détective des familles incontesté·e. 🏆', 'Impossible de te cacher un proche.'],
        childhood: ['Détective des bébés incontesté·e. 🏆', 'Impossible de te cacher une photo de bébé.'],
        pick: ['Télépathe incontesté·e. 🔮', 'Impossible de te cacher quoi que ce soit.'],
        roll: ['Fouineur·se de téléphones incontesté·e. 📱', 'Impossible de te cacher une pellicule.'],
        crush: ['Détective du cœur incontesté·e. 💘', 'Impossible de te cacher un crush d’ado.'],
        whois: ['Physionomiste incontesté·e. 🧐', 'Impossible de se cacher derrière le flou avec toi.'],
        body: ['Expert·e en anatomie incontesté·e. 🔬', 'Impossible de te cacher un coude.'],
      },
      podium: ['Sur le podium ! Ta daronne serait fière.', 'Podium ! Pas mal du tout, inspecteur.'],
      middle: ['Honnête. Certaines photos restent un mystère.', 'Pile au milieu. Très suisse, tout ça.'],
      last: ['Lanterne rouge. Tu connais vraiment tes potes ? 😬', 'Dernière place. Faudrait voir tes potes plus souvent.'],
      afk: ['T’as pas voté une seule fois. T’étais là au moins ? 👻'],
      nobody: ['Premier ex æquo… avec zéro point. Pas de quoi frimer. 🙃'],
    },
    share: 'Partager mon score',
  },
  wall: {
    title: {
      parents: 'Le mur des darons',
      family: 'Le mur des photos',
      childhood: 'Le mur des bébés',
      pick: 'Le mur des choix',
      roll: 'Le mur des pellicules',
      crush: 'Le mur des crushs',
      whois: 'Le mur des têtes',
      body: 'Le mur anatomique',
    },
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
    first: 'J’ai gagné à Daron Guessr 🏆 {correct}/{guesses} photos trouvées ! À ton tour :',
    other: 'J’ai fini #{rank} à Daron Guessr 🕵️ {correct}/{guesses} photos trouvées ! À ton tour :',
    copied: 'Score copié, colle-le où tu veux !',
    failed: 'Impossible de partager ton score.',
  },
};

export default { en, fr };
