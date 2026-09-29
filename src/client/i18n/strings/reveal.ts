// Strings for the reveal screen. `fr` must mirror `en` exactly (enforced by the type).
// Arrays are variants picked deterministically with `tpick(key, photoIndex)`.
const en = {
  intro: {
    title: 'The votes are in! 🗳️',
    sub: 'Time for the truth…',
    count: '{total} photos to reveal',
  },
  photoOf: 'Photo {i}/{total}',
  progressLabel: 'Photo {i} of {total}',
  zoom: 'Tap to zoom',
  andItIs: ['And it’s…', 'The answer is…', 'Drum roll please…', 'It’s obviously…'],
  votes: {
    one: '1 vote',
    many: '{count} votes',
  },
  noVotes: 'Nobody voted?! 🦗',
  noVotesSub: 'Too shy to guess?',
  yourPick: 'your pick',
  stamp: {
    spotted: { daron: 'SPOTTED!', daronne: 'SPOTTED!' },
    hidden: { daron: 'UNDERCOVER', daronne: 'UNDERCOVER' },
    revealed: { daron: 'REVEALED', daronne: 'REVEALED' },
  },
  /** {name} = owner; wrongMajority: {name} = the wrongly picked player, {owner} = owner; onlyOneNamed: {name} = the only right guesser. */
  caption: {
    everybody: {
      daron: [
        'Carbon copy! Everyone recognised {name}’s dad 👯',
        'Same face, 30 years later. Nobody was fooled!',
        '{name}, you ARE your dad. Everyone saw it 🧬',
      ],
      daronne: [
        'Carbon copy! Everyone recognised {name}’s mom 👯',
        'Same face, 30 years later. Nobody was fooled!',
        '{name}, you ARE your mom. Everyone saw it 🧬',
      ],
    },
    nobody: {
      daron: [
        'Nobody got it! {name}’s dad is a master of disguise 🥸',
        'Zero out of everyone. Who even is this man?! 😂',
        '{name}, are you two really related? 🤔',
      ],
      daronne: [
        'Nobody got it! {name}’s mom is a master of disguise 🥸',
        'Zero out of everyone. Who even is this woman?! 😂',
        '{name}, are you two really related? 🤔',
      ],
    },
    wrongMajority: {
      daron: [
        '{name}, anything to confess? Everyone thinks it’s your dad 👀',
        'Plot twist: everyone bet on {name}. It was {owner}’s dad!',
        '{name}’s long-lost dad? Nope, {owner}’s 😅',
      ],
      daronne: [
        '{name}, anything to confess? Everyone thinks it’s your mom 👀',
        'Plot twist: everyone bet on {name}. It was {owner}’s mom!',
        '{name}’s long-lost mom? Nope, {owner}’s 😅',
      ],
    },
    onlyOne: {
      daron: [
        'Only one person recognised him. A true detective 🕵️',
        'One single brain cell in this room got it 🧠',
        'Just one right answer. Respect 🫡',
      ],
      daronne: [
        'Only one person recognised her. A true detective 🕵️',
        'One single brain cell in this room got it 🧠',
        'Just one right answer. Respect 🫡',
      ],
    },
    onlyOneNamed: {
      daron: [
        'Only {name} recognised him. Suspicious… 🕵️',
        '{name} is the only one who got it. Big brain 🧠',
        'Everyone else was lost. {name} wasn’t 🫡',
      ],
      daronne: [
        'Only {name} recognised her. Suspicious… 🕵️',
        '{name} is the only one who got it. Big brain 🧠',
        'Everyone else was lost. {name} wasn’t 🫡',
      ],
    },
    most: {
      daron: [
        'Most of you nailed it. {name}’s dad fools nobody 😎',
        'Pretty obvious, huh? Family resemblance strikes again',
        'The majority saw it. The rest need glasses 👓',
      ],
      daronne: [
        'Most of you nailed it. {name}’s mom fools nobody 😎',
        'Pretty obvious, huh? Family resemblance strikes again',
        'The majority saw it. The rest need glasses 👓',
      ],
    },
    close: {
      daron: [
        'Close call! The right answer won by a whisker 😮‍💨',
        'Right answer on top… but it was tight',
        'The crowd got there. Barely 🐢',
      ],
      daronne: [
        'Close call! The right answer won by a whisker 😮‍💨',
        'Right answer on top… but it was tight',
        'The crowd got there. Barely 🐢',
      ],
    },
    split: {
      daron: [
        'Total chaos! Votes all over the place 🤯',
        'Nobody agrees on anything. {name}’s dad stays a mystery',
        'What a mess. This family tree is confusing 🌳',
      ],
      daronne: [
        'Total chaos! Votes all over the place 🤯',
        'Nobody agrees on anything. {name}’s mom stays a mystery',
        'What a mess. This family tree is confusing 🌳',
      ],
    },
    noVotes: {
      daron: ['Crickets… nobody voted 🦗', 'Nobody dared to guess. It was {name}’s dad!', 'Zero votes. Were you all asleep? 😴'],
      daronne: ['Crickets… nobody voted 🦗', 'Nobody dared to guess. It was {name}’s mom!', 'Zero votes. Were you all asleep? 😴'],
    },
  },
  me: {
    rightTitle: ['You got it! 🎯', 'Nailed it! 🎯', 'Eagle eye! 🎯'],
    rightSub: 'Straight into your score',
    wrongTitle: 'You said {name} ❌',
    wrongSub: ['Better luck next time', 'So close… or not', 'Oops. Awkward.'],
    noneTitle: 'You didn’t vote 😴',
    noneSub: 'No points this time',
    mineTitle: { daron: 'Your dad!', daronne: 'Your mom!' },
    mineCount: { daron: '{correct}/{total} recognised him', daronne: '{correct}/{total} recognised her' },
    mineNoVotes: { daron: 'Nobody even tried to guess him', daronne: 'Nobody even tried to guess her' },
    mineProud: ['Proud family resemblance', 'Genetics never lie', 'Clearly the same face'],
    mineOffended: ['How dare they?!', 'Rude. Very rude.', 'Deeply offended'],
  },
  scores: 'Scores',
  next: 'Next photo ➡️',
  results: 'See the results 🏆',
  waitingFor: 'Waiting for {host}…',
};

const fr: typeof en = {
  intro: {
    title: 'Les votes sont tombés ! 🗳️',
    sub: "L'heure de vérité a sonné…",
    count: '{total} photos à révéler',
  },
  photoOf: 'Photo {i}/{total}',
  progressLabel: 'Photo {i} sur {total}',
  zoom: 'Toucher pour zoomer',
  andItIs: ["Et c'est…", 'La réponse est…', 'Roulement de tambour…', 'Évidemment, c’est…'],
  votes: {
    one: '1 vote',
    many: '{count} votes',
  },
  noVotes: 'Personne a voté ?! 🦗',
  noVotesSub: 'Trop timides pour deviner ?',
  yourPick: 'ton choix',
  stamp: {
    spotted: { daron: 'GRILLÉ !', daronne: 'GRILLÉE !' },
    hidden: { daron: 'INCOGNITO', daronne: 'INCOGNITO' },
    revealed: { daron: 'DÉMASQUÉ !', daronne: 'DÉMASQUÉE !' },
  },
  caption: {
    everybody: {
      daron: [
        'Copie conforme ! Tout le monde a reconnu le daron de {name} 👯',
        'Même tête, 30 ans de plus. Personne ne s’est fait avoir !',
        '{name}, t’es le portrait craché de ton daron 🧬',
      ],
      daronne: [
        'Copie conforme ! Tout le monde a reconnu la daronne de {name} 👯',
        'Même tête, 30 ans de plus. Personne ne s’est fait avoir !',
        '{name}, t’es le portrait craché de ta daronne 🧬',
      ],
    },
    nobody: {
      daron: [
        'Personne ! Le daron de {name} est un maître du déguisement 🥸',
        'Zéro pointé. Mais c’est qui ce monsieur ?! 😂',
        '{name}, vous êtes vraiment de la même famille ? 🤔',
      ],
      daronne: [
        'Personne ! La daronne de {name} est une pro de l’incognito 🥸',
        'Zéro pointé. Mais c’est qui cette dame ?! 😂',
        '{name}, vous êtes vraiment de la même famille ? 🤔',
      ],
    },
    wrongMajority: {
      daron: [
        '{name}, t’as un truc à nous avouer ? Tout le monde pense que c’est ton daron 👀',
        'Retournement de situation : tout le monde a misé sur {name}. C’était le daron de {owner} !',
        'Le daron caché de {name} ? Non, celui de {owner} 😅',
      ],
      daronne: [
        '{name}, t’as un truc à nous avouer ? Tout le monde pense que c’est ta daronne 👀',
        'Retournement de situation : tout le monde a misé sur {name}. C’était la daronne de {owner} !',
        'La daronne cachée de {name} ? Non, celle de {owner} 😅',
      ],
    },
    onlyOne: {
      daron: [
        'Une seule personne l’a reconnu. Un vrai flair de détective 🕵️',
        'Un seul neurone dans la pièce a trouvé 🧠',
        'Une seule bonne réponse. Respect 🫡',
      ],
      daronne: [
        'Une seule personne l’a reconnue. Un vrai flair de détective 🕵️',
        'Un seul neurone dans la pièce a trouvé 🧠',
        'Une seule bonne réponse. Respect 🫡',
      ],
    },
    onlyOneNamed: {
      daron: [
        'Y a que {name} qui l’a reconnu. Louche… 🕵️',
        '{name} est le seul cerveau de la bande 🧠',
        'Tout le monde s’est planté, sauf {name} 🫡',
      ],
      daronne: [
        'Y a que {name} qui l’a reconnue. Louche… 🕵️',
        '{name} est le seul cerveau de la bande 🧠',
        'Tout le monde s’est planté, sauf {name} 🫡',
      ],
    },
    most: {
      daron: [
        'La plupart l’ont eu. Le daron de {name} ne trompe personne 😎',
        'Assez évident, non ? L’air de famille frappe encore',
        'La majorité a trouvé. Les autres : direction l’ophtalmo 👓',
      ],
      daronne: [
        'La plupart l’ont eue. La daronne de {name} ne trompe personne 😎',
        'Assez évident, non ? L’air de famille frappe encore',
        'La majorité a trouvé. Les autres : direction l’ophtalmo 👓',
      ],
    },
    close: {
      daron: [
        'C’était serré ! La bonne réponse gagne d’une moustache 😮‍💨',
        'La bonne réponse passe devant… de justesse',
        'Le groupe a trouvé. Sur le fil 🐢',
      ],
      daronne: [
        'C’était serré ! La bonne réponse gagne de justesse 😮‍💨',
        'La bonne réponse passe devant… de justesse',
        'Le groupe a trouvé. Sur le fil 🐢',
      ],
    },
    split: {
      daron: [
        'Chaos total ! Les votes partent dans tous les sens 🤯',
        'Personne n’est d’accord. Le daron de {name} reste un mystère',
        'Quel bazar. Cet arbre généalogique est un casse-tête 🌳',
      ],
      daronne: [
        'Chaos total ! Les votes partent dans tous les sens 🤯',
        'Personne n’est d’accord. La daronne de {name} reste un mystère',
        'Quel bazar. Cet arbre généalogique est un casse-tête 🌳',
      ],
    },
    noVotes: {
      daron: ['Criquets… personne n’a voté 🦗', 'Personne n’a osé. C’était le daron de {name} !', 'Zéro vote. Vous dormiez ou quoi ? 😴'],
      daronne: ['Criquets… personne n’a voté 🦗', 'Personne n’a osé. C’était la daronne de {name} !', 'Zéro vote. Vous dormiez ou quoi ? 😴'],
    },
  },
  me: {
    rightTitle: ['Bien vu ! 🎯', 'Dans le mille ! 🎯', 'Œil de lynx ! 🎯'],
    rightSub: 'Direct dans ton score',
    wrongTitle: 'T’as dit {name} ❌',
    wrongSub: ['Ce sera pour la prochaine', 'Pas loin… ou pas', 'Oups. Gênant.'],
    noneTitle: 'T’as pas voté 😴',
    noneSub: 'Pas de points cette fois',
    mineTitle: { daron: 'Ton daron !', daronne: 'Ta daronne !' },
    mineCount: { daron: '{correct}/{total} l’ont reconnu', daronne: '{correct}/{total} l’ont reconnue' },
    mineNoVotes: { daron: 'Personne n’a même tenté', daronne: 'Personne n’a même tenté' },
    mineProud: ['L’air de famille, la fierté', 'La génétique ne ment jamais', 'Clairement la même tête'],
    mineOffended: ['Comment ils osent ?!', 'Vexation totale.', 'C’est une insulte à la famille'],
  },
  scores: 'Scores',
  next: 'Photo suivante ➡️',
  results: 'Voir les résultats 🏆',
  waitingFor: 'On attend {host}…',
};

export default { en, fr };
