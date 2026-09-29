import type { PhotoKind } from '../../../shared/protocol';
import type { CaptionGroup } from '../../screens/reveal/kinds';
import type { Outcome } from '../../screens/reveal/timeline';

// Strings for the reveal screen. `fr` must mirror `en` exactly (enforced by the type).
// Arrays are variants picked deterministically with `tpick(key, photoIndex)`.
// Per-kind copy is keyed by PhotoKind; captions and mood lines are keyed by CaptionGroup
// (see screens/reveal/kinds.ts), so French agreement is written out instead of patched in.
type PerKind = Record<PhotoKind, string>;
type PerGroup = Record<CaptionGroup, string[]>;

const en = {
  intro: {
    title: 'The votes are in!',
    sub: 'Time for the truth…',
    /** After a date-stamp number: "08 photos to reveal". */
    photos: 'photos to reveal',
    /** Micro-label above the countdown stamp. */
    startsIn: 'Starts in',
  },
  /** Micro-label above the "03/10" stamp. */
  photoLabel: 'Photo',
  progressLabel: 'Photo {i} of {total}',
  zoom: 'Tap to zoom',
  andItIs: ['And it’s…', 'The answer is…', 'Drum roll please…', 'It’s obviously…'],
  votes: {
    one: '1 vote',
    many: '{count} votes',
  },
  noVotes: 'Nobody voted?!',
  noVotesSub: 'Too shy to guess?',
  /** Marks the candidate the viewer voted for ("pick" would clash with the 'pick' kind). */
  yourPick: 'your vote',
  /** Mid-sentence "{name}'s dad" (FR: lowercase article). Sentence starts use common.possessive. */
  of: {
    daron: '{name}’s dad',
    daronne: '{name}’s mom',
    brother: '{name}’s brother',
    sister: '{name}’s sister',
    grandpa: '{name}’s grandpa',
    grandma: '{name}’s grandma',
    friend: '{name}’s friend',
    partner: '{name}’s partner',
    pet: '{name}’s pet',
    kid: '{name} as a kid',
    pick: '{name}’s pick',
  } satisfies PerKind,
  /** Stamped on the photo: most voters right / nobody right / anything in between. */
  stamp: {
    spotted: {
      daron: 'SPOTTED!',
      daronne: 'SPOTTED!',
      brother: 'SPOTTED!',
      sister: 'SPOTTED!',
      grandpa: 'SPOTTED!',
      grandma: 'SPOTTED!',
      friend: 'SPOTTED!',
      partner: 'SPOTTED!',
      pet: 'SPOTTED!',
      kid: 'SPOTTED!',
      pick: 'CALLED IT!',
    } satisfies PerKind,
    hidden: {
      daron: 'UNDERCOVER',
      daronne: 'UNDERCOVER',
      brother: 'UNDERCOVER',
      sister: 'UNDERCOVER',
      grandpa: 'UNDERCOVER',
      grandma: 'UNDERCOVER',
      friend: 'UNDERCOVER',
      partner: 'UNDERCOVER',
      pet: 'UNDERCOVER',
      kid: 'GLOW-UP!',
      pick: 'PLOT TWIST',
    } satisfies PerKind,
    revealed: {
      daron: 'REVEALED',
      daronne: 'REVEALED',
      brother: 'REVEALED',
      sister: 'REVEALED',
      grandpa: 'REVEALED',
      grandma: 'REVEALED',
      friend: 'REVEALED',
      partner: 'REVEALED',
      pet: 'REVEALED',
      kid: 'REVEALED',
      pick: 'REVEALED',
    } satisfies PerKind,
  },
  /**
   * One caption per outcome and group. Vars: {name} = the owner, except wrongMajority (the
   * wrongly picked player) and onlyOneNamed (the only right guesser); {owner} = the owner;
   * {who} = sentence-start "{owner}'s dad"; {of} = the same mid-sentence; {yours} = "your dad".
   */
  caption: {
    everybody: {
      relM: [
        'Carbon copy! Everyone recognised {of}',
        'Same genes, same face. Nobody was fooled!',
        '{name}, you ARE {yours}. Everyone saw it',
      ],
      relF: [
        'Carbon copy! Everyone recognised {of}',
        'Same genes, same face. Nobody was fooled!',
        '{name}, you ARE {yours}. Everyone saw it',
      ],
      other: [
        'Everyone recognised {of}. You two are inseparable',
        'They say you end up looking alike. Confirmed',
        '{name}, that’s basically your twin. Everyone saw it',
      ],
      kid: [
        'Same face, just smaller! Everyone recognised {name}',
        '{name} hasn’t changed one bit. Nobody was fooled!',
        'Those cheeks don’t lie. 100% {name}',
      ],
      pick: [
        'So predictable! Everyone knew {name} picked this',
        'That’s SO {name}. Nobody hesitated',
        '{name}, you’re an open book',
      ],
    },
    nobody: {
      relM: [
        'Nobody got it! {who} is a master of disguise',
        'Zero out of everyone. Who even IS he?! 😂',
        '{name}, are you two really related?',
      ],
      relF: [
        'Nobody got it! {who} is a master of disguise',
        'Zero out of everyone. Who even IS she?! 😂',
        '{name}, are you two really related?',
      ],
      other: [
        'Nobody got it! {who} is a master of disguise',
        'Zero out of everyone. Nobody saw that one coming 😂',
        '{name}, do you two even know each other?',
      ],
      kid: [
        'Nobody recognised {name}! What a glow-up',
        'Zero out of everyone. Who was that cutie?! 😂',
        '{name}, is that really you?',
      ],
      pick: [
        'Nobody saw it coming! {name} hid it well',
        'Zero out of everyone. {name}, you’re a mystery',
        '{name}, turns out we don’t know you at all',
      ],
    },
    wrongMajority: {
      relM: [
        '{name}, anything to confess? Everyone thinks it’s {yours} 👀',
        'Plot twist: everyone bet on {name}. It was {of}!',
        'All the votes went to {name}… but it’s {of}',
      ],
      relF: [
        '{name}, anything to confess? Everyone thinks it’s {yours} 👀',
        'Plot twist: everyone bet on {name}. It was {of}!',
        'All the votes went to {name}… but it’s {of}',
      ],
      other: [
        '{name}, anything to confess? Everyone thinks it’s {yours} 👀',
        'Plot twist: everyone bet on {name}. It was {of}!',
        'All the votes went to {name}… but it’s {of}',
      ],
      kid: [
        'Everyone thinks that’s {name} as a kid. Nope, it’s {owner}!',
        'Plot twist: everyone bet on {name}. It was mini {owner}!',
        'All the votes went to {name}… but it’s little {owner}',
      ],
      pick: [
        'Everyone thinks {name} picked this. It was {owner}!',
        'Plot twist: everyone bet on {name}. It was {owner}’s pick!',
        'So very {name}… and yet {owner} chose it',
      ],
    },
    onlyOne: {
      relM: [
        'Only one person recognised him. A true detective',
        'One single brain cell in this room got it',
        'Just one right answer. Respect.',
      ],
      relF: [
        'Only one person recognised her. A true detective',
        'One single brain cell in this room got it',
        'Just one right answer. Respect.',
      ],
      other: [
        'Only one person got it. A true detective',
        'One single brain cell in this room got it',
        'Just one right answer. Respect.',
      ],
      kid: [
        'Only one person recognised {name}. A true detective',
        'One single brain cell in this room got it',
        'Just one right answer. Respect.',
      ],
      pick: [
        'Only one person saw through {name}. A true detective',
        'One single brain cell in this room got it',
        'Just one right answer. Respect.',
      ],
    },
    onlyOneNamed: {
      relM: [
        'Only {name} recognised him. Suspicious…',
        '{name} is the only one who got it. Big brain',
        'Everyone else was lost. {name} wasn’t',
      ],
      relF: [
        'Only {name} recognised her. Suspicious…',
        '{name} is the only one who got it. Big brain',
        'Everyone else was lost. {name} wasn’t',
      ],
      other: [
        'Only {name} got it. Suspicious…',
        '{name} is the only one who got it. Big brain',
        'Everyone else was lost. {name} wasn’t',
      ],
      kid: [
        'Only {name} recognised little {owner}. Suspicious…',
        '{name} is the only one who got it. Big brain',
        'Everyone else was lost. {name} wasn’t',
      ],
      pick: [
        'Only {name} knew {owner} would pick this. Suspicious…',
        '{name} is the only one who got it. Big brain',
        'Everyone else was lost. {name} wasn’t',
      ],
    },
    most: {
      relM: [
        'Most of you nailed it. {who} fools nobody',
        'Pretty obvious, huh? Family resemblance strikes again',
        'The majority saw it. The rest need glasses 👓',
      ],
      relF: [
        'Most of you nailed it. {who} fools nobody',
        'Pretty obvious, huh? Family resemblance strikes again',
        'The majority saw it. The rest need glasses 👓',
      ],
      other: [
        'Most of you nailed it. {who} fools nobody',
        'Pretty obvious, huh? Birds of a feather…',
        'The majority saw it. The rest need glasses 👓',
      ],
      kid: [
        'Most of you nailed it. Mini {name} fools nobody',
        'Pretty obvious, huh? That smile hasn’t changed',
        'The majority saw it. The rest need glasses 👓',
      ],
      pick: [
        'Most of you nailed it. {name}’s taste fools nobody',
        'Pretty obvious, huh? That’s so {name}',
        'The majority saw it. The rest need glasses 👓',
      ],
    },
    close: {
      relM: ['Close call! The right answer won by a whisker 😮‍💨', 'Right answer on top… but it was tight', 'The crowd got there. Barely.'],
      relF: ['Close call! The right answer won by a whisker 😮‍💨', 'Right answer on top… but it was tight', 'The crowd got there. Barely.'],
      other: ['Close call! The right answer won by a whisker 😮‍💨', 'Right answer on top… but it was tight', 'The crowd got there. Barely.'],
      kid: ['Close call! The right answer won by a whisker 😮‍💨', 'Right answer on top… but it was tight', 'The crowd got there. Barely.'],
      pick: ['Close call! The right answer won by a whisker 😮‍💨', 'Right answer on top… but it was tight', 'The crowd got there. Barely.'],
    },
    split: {
      relM: [
        'Total chaos! Votes all over the place',
        'Nobody agrees on anything. {who} stays a mystery',
        'What a mess. This family tree is confusing',
      ],
      relF: [
        'Total chaos! Votes all over the place',
        'Nobody agrees on anything. {who} stays a mystery',
        'What a mess. This family tree is confusing',
      ],
      other: [
        'Total chaos! Votes all over the place',
        'Nobody agrees on anything. {who} stays a mystery',
        'What a mess. Who even hangs out with whom?',
      ],
      kid: [
        'Total chaos! Votes all over the place',
        'Nobody agrees on anything. Mini {name} stays a mystery',
        'What a mess. All kids look alike anyway',
      ],
      pick: [
        'Total chaos! Votes all over the place',
        'Nobody agrees on anything. {name} stays a mystery',
        'What a mess. Anyone could have picked that',
      ],
    },
    noVotes: {
      relM: ['Crickets… nobody voted 🦗', 'Nobody dared to guess. It was {of}!', 'Zero votes. Were you all asleep?'],
      relF: ['Crickets… nobody voted 🦗', 'Nobody dared to guess. It was {of}!', 'Zero votes. Were you all asleep?'],
      other: ['Crickets… nobody voted 🦗', 'Nobody dared to guess. It was {of}!', 'Zero votes. Were you all asleep?'],
      kid: ['Crickets… nobody voted 🦗', 'Nobody dared to guess. It was {of}!', 'Zero votes. Were you all asleep?'],
      pick: ['Crickets… nobody voted 🦗', 'Nobody dared to guess. It was {of}!', 'Zero votes. Were you all asleep?'],
    },
  } satisfies Record<Outcome, PerGroup>,
  me: {
    rightTitle: ['You got it!', 'Nailed it!', 'Eagle eye!'],
    rightSub: 'Straight into your score',
    wrongTitle: 'You said {name}',
    wrongSub: ['Better luck next time', 'So close… or not', 'Oops. Awkward.'],
    noneTitle: 'You didn’t vote',
    noneSub: 'No points this time',
    /** The owner's own card, after a "03/04" stamp (right guesses / votes). */
    mineTitle: {
      daron: 'Your dad!',
      daronne: 'Your mom!',
      brother: 'Your brother!',
      sister: 'Your sister!',
      grandpa: 'Your grandpa!',
      grandma: 'Your grandma!',
      friend: 'Your friend!',
      partner: 'Your partner!',
      pet: 'Your pet!',
      kid: 'You as a kid!',
      pick: 'Your pick!',
    } satisfies PerKind,
    mineCount: {
      daron: 'recognised him',
      daronne: 'recognised her',
      brother: 'recognised him',
      sister: 'recognised her',
      grandpa: 'recognised him',
      grandma: 'recognised her',
      friend: 'recognised them',
      partner: 'recognised them',
      pet: 'recognised them',
      kid: 'recognised you',
      pick: 'guessed it was you',
    } satisfies PerKind,
    mineNoVotes: {
      daron: 'Nobody even tried to guess him',
      daronne: 'Nobody even tried to guess her',
      brother: 'Nobody even tried to guess him',
      sister: 'Nobody even tried to guess her',
      grandpa: 'Nobody even tried to guess him',
      grandma: 'Nobody even tried to guess her',
      friend: 'Nobody even tried to guess',
      partner: 'Nobody even tried to guess',
      pet: 'Nobody even tried to guess',
      kid: 'Nobody even tried to guess',
      pick: 'Nobody even tried to guess',
    } satisfies PerKind,
    /** Most voters got it right. */
    mineProud: {
      relM: ['Proud family resemblance', 'Genetics never lie', 'Clearly the same face'],
      relF: ['Proud family resemblance', 'Genetics never lie', 'Clearly the same face'],
      other: ['You two are inseparable', 'Matching vibes, obviously', 'They know you too well'],
      kid: ['You haven’t changed a bit', 'Cute then, cute now', 'Same face, just bigger'],
      pick: ['Your taste is iconic', 'Everyone has your number', 'Your style is unmistakable'],
    } satisfies PerGroup,
    /** Most voters got it wrong (or nobody voted). */
    mineOffended: {
      relM: ['How dare they?!', 'Rude. Very rude.', 'Deeply offended'],
      relF: ['How dare they?!', 'Rude. Very rude.', 'Deeply offended'],
      other: ['How dare they?!', 'Rude. Very rude.', 'Guess you’re not that close'],
      kid: ['Nobody recognises a legend', 'Unrecognisable. Rude.', 'Glow-up confirmed'],
      pick: ['Unpredictable, as always', 'Nobody knows you, huh?', 'Too deep for them'],
    } satisfies PerGroup,
  },
  scores: 'Scores',
  next: 'Next photo',
  results: 'See the results',
  waitingFor: 'Waiting for {host}…',
};

const fr: typeof en = {
  intro: {
    title: 'Les votes sont tombés !',
    sub: "L'heure de vérité a sonné…",
    photos: 'photos à révéler',
    startsIn: 'Début dans',
  },
  photoLabel: 'Photo',
  progressLabel: 'Photo {i} sur {total}',
  zoom: 'Toucher pour zoomer',
  andItIs: ["Et c'est…", 'La réponse est…', 'Roulement de tambour…', 'Évidemment, c’est…'],
  votes: {
    one: '1 vote',
    many: '{count} votes',
  },
  noVotes: 'Personne a voté ?!',
  noVotesSub: 'Trop timides pour deviner ?',
  yourPick: 'ton vote',
  of: {
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
  },
  // Agreement follows the subject: GRILLÉ(E) / DÉMASQUÉ(E) only where the gender is known.
  stamp: {
    spotted: {
      daron: 'GRILLÉ !',
      daronne: 'GRILLÉE !',
      brother: 'GRILLÉ !',
      sister: 'GRILLÉE !',
      grandpa: 'GRILLÉ !',
      grandma: 'GRILLÉE !',
      friend: 'BINGO !',
      partner: 'BINGO !',
      pet: 'GRILLÉ !',
      kid: 'BINGO !',
      pick: 'BIEN VU !',
    },
    hidden: {
      daron: 'INCOGNITO',
      daronne: 'INCOGNITO',
      brother: 'INCOGNITO',
      sister: 'INCOGNITO',
      grandpa: 'INCOGNITO',
      grandma: 'INCOGNITO',
      friend: 'INCOGNITO',
      partner: 'INCOGNITO',
      pet: 'INCOGNITO',
      kid: 'INCOGNITO',
      pick: 'SURPRISE !',
    },
    revealed: {
      daron: 'DÉMASQUÉ !',
      daronne: 'DÉMASQUÉE !',
      brother: 'DÉMASQUÉ !',
      sister: 'DÉMASQUÉE !',
      grandpa: 'DÉMASQUÉ !',
      grandma: 'DÉMASQUÉE !',
      friend: 'RÉVÉLATION',
      partner: 'RÉVÉLATION',
      pet: 'DÉMASQUÉ !',
      kid: 'RÉVÉLATION',
      pick: 'RÉVÉLATION',
    },
  },
  // The owner's and guessers' genders are unknown: no adjective or participle agrees with {name}/{owner}.
  caption: {
    everybody: {
      relM: [
        'Copie conforme ! Tout le monde a reconnu {of}',
        'Mêmes gènes, même tête. Personne ne s’est fait avoir !',
        '{name}, t’es le portrait craché de {yours}',
      ],
      relF: [
        'Copie conforme ! Tout le monde a reconnu {of}',
        'Mêmes gènes, même tête. Personne ne s’est fait avoir !',
        '{name}, t’es le portrait craché de {yours}',
      ],
      other: [
        'Tout le monde a reconnu {of}. Vous êtes inséparables',
        'On finit par se ressembler, c’est prouvé',
        '{name}, c’est ton double ! Tout le monde a vu',
      ],
      kid: [
        'Même tête, en plus petit ! Tout le monde a reconnu {name}',
        '{name} n’a pas changé d’un poil. Personne ne s’est fait avoir !',
        'Ces joues ne mentent pas. 100 % {name}',
      ],
      pick: [
        'Trop prévisible ! Tout le monde savait que c’était {name}',
        'C’est TELLEMENT {name}. Personne n’a hésité',
        '{name}, on lit en toi comme dans un livre ouvert',
      ],
    },
    nobody: {
      relM: [
        'Personne ! {who} est un maître du déguisement',
        'Zéro pointé. Mais c’est qui, lui ?! 😂',
        '{name}, vous êtes vraiment de la même famille ?',
      ],
      relF: [
        'Personne ! {who} est une pro de l’incognito',
        'Zéro pointé. Mais c’est qui, elle ?! 😂',
        '{name}, vous êtes vraiment de la même famille ?',
      ],
      other: [
        'Personne ! {who} a bien caché son jeu',
        'Zéro pointé. Là, tout le monde a séché 😂',
        '{name}, vous vous connaissez vraiment ?',
      ],
      kid: [
        'Personne n’a reconnu {name} ! Quelle métamorphose',
        'Zéro pointé. Mais c’était qui, ce bébé ?! 😂',
        '{name}, c’est vraiment toi, là ?',
      ],
      pick: [
        'Personne n’a trouvé ! {name} cache bien son jeu',
        'Zéro pointé. {name}, t’es un mystère',
        '{name}, en fait on te connaît pas du tout',
      ],
    },
    wrongMajority: {
      relM: [
        '{name}, t’as un truc à nous avouer ? Tout le monde pense que c’est {yours} 👀',
        'Retournement de situation : tout le monde a misé sur {name}. C’était {of} !',
        'Tous les votes pour {name}… mais c’est {of}',
      ],
      relF: [
        '{name}, t’as un truc à nous avouer ? Tout le monde pense que c’est {yours} 👀',
        'Retournement de situation : tout le monde a misé sur {name}. C’était {of} !',
        'Tous les votes pour {name}… mais c’est {of}',
      ],
      other: [
        '{name}, t’as un truc à nous avouer ? Tout le monde pense que c’est {yours} 👀',
        'Retournement de situation : tout le monde a misé sur {name}. C’était {of} !',
        'Tous les votes pour {name}… mais c’est {of}',
      ],
      kid: [
        'Tout le monde pense que c’est {name} en version mini. Raté, c’est {owner} !',
        'Retournement de situation : tout le monde a misé sur {name}. C’était mini-{owner} !',
        'Tous les votes pour {name}… mais c’est mini-{owner}',
      ],
      pick: [
        'Tout le monde pense que {name} a choisi ça. C’était {owner} !',
        'Retournement de situation : tout le monde a misé sur {name}. C’était le choix de {owner} !',
        'Ça fait tellement {name}… et pourtant c’est le choix de {owner}',
      ],
    },
    onlyOne: {
      relM: [
        'Une seule personne l’a reconnu. Un vrai flair de détective',
        'Un seul neurone dans la pièce a trouvé',
        'Une seule bonne réponse. Respect.',
      ],
      relF: [
        'Une seule personne l’a reconnue. Un vrai flair de détective',
        'Un seul neurone dans la pièce a trouvé',
        'Une seule bonne réponse. Respect.',
      ],
      other: [
        'Une seule personne a trouvé. Un vrai flair de détective',
        'Un seul neurone dans la pièce a trouvé',
        'Une seule bonne réponse. Respect.',
      ],
      kid: [
        'Une seule personne a reconnu {name}. Un vrai flair de détective',
        'Un seul neurone dans la pièce a trouvé',
        'Une seule bonne réponse. Respect.',
      ],
      pick: [
        'Une seule personne a percé {name} à jour. Un vrai flair de détective',
        'Un seul neurone dans la pièce a trouvé',
        'Une seule bonne réponse. Respect.',
      ],
    },
    onlyOneNamed: {
      relM: [
        'Y a que {name} qui l’a reconnu. Louche…',
        'Un seul cerveau dans la bande : celui de {name}',
        'Tout le monde s’est planté, sauf {name}',
      ],
      relF: [
        'Y a que {name} qui l’a reconnue. Louche…',
        'Un seul cerveau dans la bande : celui de {name}',
        'Tout le monde s’est planté, sauf {name}',
      ],
      other: [
        'Y a que {name} qui a trouvé. Louche…',
        'Un seul cerveau dans la bande : celui de {name}',
        'Tout le monde s’est planté, sauf {name}',
      ],
      kid: [
        'Y a que {name} qui a reconnu mini-{owner}. Louche…',
        'Un seul cerveau dans la bande : celui de {name}',
        'Tout le monde s’est planté, sauf {name}',
      ],
      pick: [
        'Y a que {name} qui savait que {owner} choisirait ça. Louche…',
        'Un seul cerveau dans la bande : celui de {name}',
        'Tout le monde s’est planté, sauf {name}',
      ],
    },
    most: {
      relM: [
        'La plupart l’ont eu. {who} ne trompe personne',
        'Assez évident, non ? L’air de famille frappe encore',
        'La majorité a trouvé. Les autres : direction l’ophtalmo 👓',
      ],
      relF: [
        'La plupart l’ont eue. {who} ne trompe personne',
        'Assez évident, non ? L’air de famille frappe encore',
        'La majorité a trouvé. Les autres : direction l’ophtalmo 👓',
      ],
      other: [
        'La plupart ont trouvé. {who} ne trompe personne',
        'Assez évident, non ? Qui se ressemble s’assemble',
        'La majorité a trouvé. Les autres : direction l’ophtalmo 👓',
      ],
      kid: [
        'La plupart ont trouvé. Mini-{name} ne trompe personne',
        'Assez évident, non ? Ce sourire n’a pas changé',
        'La majorité a trouvé. Les autres : direction l’ophtalmo 👓',
      ],
      pick: [
        'La plupart ont trouvé. Les goûts de {name} ne trompent personne',
        'Assez évident, non ? Ça fait tellement {name}',
        'La majorité a trouvé. Les autres : direction l’ophtalmo 👓',
      ],
    },
    close: {
      relM: ['C’était serré ! La bonne réponse gagne d’un poil 😮‍💨', 'La bonne réponse passe devant… de justesse', 'Le groupe a trouvé. Sur le fil.'],
      relF: ['C’était serré ! La bonne réponse gagne d’un cheveu 😮‍💨', 'La bonne réponse passe devant… de justesse', 'Le groupe a trouvé. Sur le fil.'],
      other: ['C’était serré ! La bonne réponse gagne d’un cheveu 😮‍💨', 'La bonne réponse passe devant… de justesse', 'Le groupe a trouvé. Sur le fil.'],
      kid: ['C’était serré ! La bonne réponse gagne d’un cheveu 😮‍💨', 'La bonne réponse passe devant… de justesse', 'Le groupe a trouvé. Sur le fil.'],
      pick: ['C’était serré ! La bonne réponse gagne d’un cheveu 😮‍💨', 'La bonne réponse passe devant… de justesse', 'Le groupe a trouvé. Sur le fil.'],
    },
    split: {
      relM: [
        'Chaos total ! Les votes partent dans tous les sens',
        'Personne n’est d’accord. {who} reste un mystère',
        'Quel bazar. Cet arbre généalogique est un casse-tête',
      ],
      relF: [
        'Chaos total ! Les votes partent dans tous les sens',
        'Personne n’est d’accord. {who} reste un mystère',
        'Quel bazar. Cet arbre généalogique est un casse-tête',
      ],
      other: [
        'Chaos total ! Les votes partent dans tous les sens',
        'Personne n’est d’accord. {who} reste un mystère',
        'Quel bazar. Qui traîne avec qui, au juste ?',
      ],
      kid: [
        'Chaos total ! Les votes partent dans tous les sens',
        'Personne n’est d’accord. Mini-{name} reste un mystère',
        'Quel bazar. De toute façon, tous les bébés se ressemblent',
      ],
      pick: [
        'Chaos total ! Les votes partent dans tous les sens',
        'Personne n’est d’accord. {name} reste un mystère',
        'Quel bazar. N’importe qui aurait pu choisir ça',
      ],
    },
    noVotes: {
      relM: ['Criquets… personne n’a voté 🦗', 'Personne n’a osé. C’était {of} !', 'Zéro vote. Vous dormiez ou quoi ?'],
      relF: ['Criquets… personne n’a voté 🦗', 'Personne n’a osé. C’était {of} !', 'Zéro vote. Vous dormiez ou quoi ?'],
      other: ['Criquets… personne n’a voté 🦗', 'Personne n’a osé. C’était {of} !', 'Zéro vote. Vous dormiez ou quoi ?'],
      kid: ['Criquets… personne n’a voté 🦗', 'Personne n’a osé. C’était {of} !', 'Zéro vote. Vous dormiez ou quoi ?'],
      pick: ['Criquets… personne n’a voté 🦗', 'Personne n’a osé. C’était {of} !', 'Zéro vote. Vous dormiez ou quoi ?'],
    },
  },
  me: {
    rightTitle: ['Bien vu !', 'Dans le mille !', 'Œil de lynx !'],
    rightSub: 'Direct dans ton score',
    wrongTitle: 'T’as dit {name}',
    wrongSub: ['Ce sera pour la prochaine', 'Pas loin… ou pas', 'Oups. Gênant.'],
    noneTitle: 'T’as pas voté',
    noneSub: 'Pas de points cette fois',
    mineTitle: {
      daron: 'Ton daron !',
      daronne: 'Ta daronne !',
      brother: 'Ton frère !',
      sister: 'Ta sœur !',
      grandpa: 'Ton papi !',
      grandma: 'Ta mamie !',
      friend: 'Ton ou ta pote !',
      partner: 'Ta moitié !',
      pet: 'Ton animal !',
      kid: 'Toi en version mini !',
      pick: 'Ton choix !',
    },
    mineCount: {
      daron: 'l’ont reconnu',
      daronne: 'l’ont reconnue',
      brother: 'l’ont reconnu',
      sister: 'l’ont reconnue',
      grandpa: 'l’ont reconnu',
      grandma: 'l’ont reconnue',
      friend: 'ont trouvé',
      partner: 'ont trouvé',
      pet: 'l’ont reconnu',
      kid: 'ont reconnu ta bouille',
      pick: 'ont deviné que c’était toi',
    },
    mineNoVotes: {
      daron: 'Personne n’a même tenté',
      daronne: 'Personne n’a même tenté',
      brother: 'Personne n’a même tenté',
      sister: 'Personne n’a même tenté',
      grandpa: 'Personne n’a même tenté',
      grandma: 'Personne n’a même tenté',
      friend: 'Personne n’a même tenté',
      partner: 'Personne n’a même tenté',
      pet: 'Personne n’a même tenté',
      kid: 'Personne n’a même tenté',
      pick: 'Personne n’a même tenté',
    },
    mineProud: {
      relM: ['L’air de famille, la fierté', 'La génétique ne ment jamais', 'Clairement la même tête'],
      relF: ['L’air de famille, la fierté', 'La génétique ne ment jamais', 'Clairement la même tête'],
      other: ['Inséparables, c’est officiel', 'Même vibe, évidemment', 'Ils te connaissent trop bien'],
      kid: ['T’as pas changé d’un poil', 'Déjà trop chou à l’époque', 'Même tête, en plus grand'],
      pick: ['Tes goûts sont iconiques', 'Tout le monde te connaît par cœur', 'Ton style se reconnaît entre mille'],
    },
    mineOffended: {
      relM: ['Comment ils osent ?!', 'Vexation totale.', 'C’est une insulte à la famille'],
      relF: ['Comment ils osent ?!', 'Vexation totale.', 'C’est une insulte à la famille'],
      other: ['Comment ils osent ?!', 'Vexation totale.', 'Faut croire que vous êtes pas si proches'],
      kid: ['Personne ne reconnaît la légende', 'Méconnaissable. Vexant.', 'Glow-up confirmé'],
      pick: ['Imprévisible, comme toujours', 'Personne te connaît, en fait', 'Un choix trop subtil pour eux'],
    },
  },
  scores: 'Scores',
  next: 'Photo suivante',
  results: 'Voir les résultats',
  waitingFor: 'On attend {host}…',
};

export default { en, fr };
