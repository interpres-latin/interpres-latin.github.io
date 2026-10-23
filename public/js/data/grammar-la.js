/**
 * The grammar pages' content. Static: nothing here touches the server.
 *
 * ADJECTIVES and PARTICIPLES are the Latin reference sheets from the planner
 * (build_resources.py, _adj_html and _part_html), parsed into blocks and split
 * into the parts the page's selector offers. Blocks are { type: 'h' | 'p' |
 * 'ul' | 'table' }; text may carry <i> and <b>, nothing else.
 */

export const ADJECTIVES = [
  {
    "key": "regulae",
    "label": "Rules",
    "title": "Adjective rules",
    "blocks": [
      {
        "type": "ul",
        "items": [
          "An adjective agrees with its noun in gender, number and case, not always in declension or ending: agricola <i>bonus</i>, nauta <i>fortis</i>.",
          "Most adjectives come after their noun; adjectives of size and quantity (magnus, multus, omnis) and demonstratives usually come before.",
          "Used without a noun, an adjective stands for people or things: bonī (good men), multa (many things), omnia (everything).",
          "Dictionary entries show the declension: bonus, -a, -um is 1st/2nd; omnis, -e or ingēns, -entis is 3rd."
        ]
      }
    ]
  },
  {
    "key": "prima",
    "label": "1st/2nd declension",
    "title": "1st/2nd declension adjectives: bonus, bona, bonum (good)",
    "blocks": [
      {
        "type": "p",
        "text": "Masculine like servus, feminine like puella, neuter like bellum."
      },
      {
        "type": "table",
        "head": [
          "Case",
          "Masc. sg",
          "Fem. sg",
          "Neut. sg",
          "Masc. pl",
          "Fem. pl",
          "Neut. pl"
        ],
        "rows": [
          [
            "Nominative",
            "bonus",
            "bona",
            "bonum",
            "bonī",
            "bonae",
            "bona"
          ],
          [
            "Genitive",
            "bonī",
            "bonae",
            "bonī",
            "bonōrum",
            "bonārum",
            "bonōrum"
          ],
          [
            "Dative",
            "bonō",
            "bonae",
            "bonō",
            "bonīs",
            "bonīs",
            "bonīs"
          ],
          [
            "Accusative",
            "bonum",
            "bonam",
            "bonum",
            "bonōs",
            "bonās",
            "bona"
          ],
          [
            "Ablative",
            "bonō",
            "bonā",
            "bonō",
            "bonīs",
            "bonīs",
            "bonīs"
          ],
          [
            "Vocative",
            "bone",
            "bona",
            "bonum",
            "bonī",
            "bonae",
            "bona"
          ]
        ]
      },
      {
        "type": "p",
        "text": "-er adjectives: some drop the e (pulcher, pulchra, pulchrum; noster, nostra, nostrum), some keep it (miser, misera, miserum; līber, lībera, līberum)."
      },
      {
        "type": "h",
        "text": "Special genitive and dative (UNUS NAUTA)"
      },
      {
        "type": "p",
        "text": "ūnus, nūllus, ūllus, sōlus, neuter, alius, uter, tōtus, alter: genitive singular -īus and dative singular -ī in all genders (ūnīus, ūnī); everything else like bonus."
      }
    ]
  },
  {
    "key": "tertia",
    "label": "3rd declension",
    "title": "3rd declension adjectives: omnis, omne (all, every)",
    "blocks": [
      {
        "type": "p",
        "text": "i-stems: ablative singular -ī, genitive plural -ium, neuter nominative/accusative plural -ia."
      },
      {
        "type": "table",
        "head": [
          "Case",
          "Masc./fem. sg",
          "Neut. sg",
          "Masc./fem. pl",
          "Neut. pl"
        ],
        "rows": [
          [
            "Nominative",
            "omnis",
            "omne",
            "omnēs",
            "omnia"
          ],
          [
            "Genitive",
            "omnis",
            "omnis",
            "omnium",
            "omnium"
          ],
          [
            "Dative",
            "omnī",
            "omnī",
            "omnibus",
            "omnibus"
          ],
          [
            "Accusative",
            "omnem",
            "omne",
            "omnēs (omnīs)",
            "omnia"
          ],
          [
            "Ablative",
            "omnī",
            "omnī",
            "omnibus",
            "omnibus"
          ],
          [
            "Vocative",
            "omnis",
            "omne",
            "omnēs",
            "omnia"
          ]
        ]
      },
      {
        "type": "table",
        "head": [
          "Type",
          "Nominative forms",
          "Example"
        ],
        "rows": [
          [
            "Three endings",
            "Masc., fem. and neut. all differ in the nominative singular",
            "ācer, ācris, ācre (sharp); celer, celeris, celere (swift)"
          ],
          [
            "Two endings",
            "Masc./fem. share one form, neuter has its own",
            "omnis, omne; fortis, forte; facilis, facile"
          ],
          [
            "One ending",
            "One nominative for all genders; the genitive gives the stem",
            "ingēns, ingentis (huge); fēlīx, fēlīcis (lucky); audāx, audācis (bold)"
          ]
        ]
      },
      {
        "type": "p",
        "text": "One-ending neuters: accusative singular = nominative (ingēns), nominative/accusative plural -ia (ingentia)."
      }
    ]
  },
  {
    "key": "comparatio",
    "label": "Comparison",
    "title": "Comparison",
    "blocks": [
      {
        "type": "table",
        "head": [
          "Degree",
          "How to form",
          "Example"
        ],
        "rows": [
          [
            "Comparative",
            "Stem + -ior (m/f), -ius (n); declines like a 3rd declension consonant stem (ablative -e, genitive plural -um, neuter plural -a)",
            "longus: longior, longius (longer, rather long)"
          ],
          [
            "Superlative",
            "Stem + -issimus, -a, -um",
            "longissimus (longest, very long)"
          ],
          [
            "-er adjectives",
            "Nominative + -rimus",
            "ācer: ācerrimus; pulcher: pulcherrimus"
          ],
          [
            "Six -lis adjectives",
            "Stem + -limus: facilis, difficilis, similis, dissimilis, gracilis, humilis",
            "facilis: facillimus"
          ]
        ]
      },
      {
        "type": "table",
        "head": [
          "Positive",
          "Comparative",
          "Superlative"
        ],
        "rows": [
          [
            "bonus (good)",
            "melior, melius",
            "optimus"
          ],
          [
            "malus (bad)",
            "peior, peius",
            "pessimus"
          ],
          [
            "magnus (big)",
            "maior, maius",
            "maximus"
          ],
          [
            "parvus (small)",
            "minor, minus",
            "minimus"
          ],
          [
            "multus (much)",
            "plūs (plūrēs, plūra in the plural)",
            "plūrimus"
          ]
        ]
      },
      {
        "type": "p",
        "text": "quam with a comparative means than: altior quam mūrus. Without quam, the thing compared can go in the ablative: altior mūrō."
      }
    ]
  },
  {
    "key": "adverbia",
    "label": "Adverbs",
    "title": "Adverbs from adjectives",
    "blocks": [
      {
        "type": "table",
        "head": [
          "Adjective",
          "Adverb ending",
          "Example"
        ],
        "rows": [
          [
            "1st/2nd declension",
            "-ē",
            "lātus: lātē; miser: miserē (bonus: bene)"
          ],
          [
            "3rd declension",
            "-iter",
            "fortis: fortiter; ācer: ācriter"
          ],
          [
            "3rd declension in -ns",
            "-er",
            "sapiēns: sapienter"
          ],
          [
            "Comparative",
            "neuter comparative",
            "lātius, fortius"
          ],
          [
            "Superlative",
            "-issimē",
            "lātissimē, fortissimē"
          ]
        ]
      }
    ]
  }
];

export const PARTICIPLES = [
  {
    "key": "natura",
    "label": "Basics",
    "title": "What a participle is",
    "blocks": [
      {
        "type": "ul",
        "items": [
          "A verbal adjective: it comes from a verb, so it has tense and voice and can take objects or adverbs, but it declines like an adjective and agrees with a noun in gender, number and case.",
          "Latin has three: present active (loving), perfect passive (having been loved) and future active (about to love).",
          "Participle tense is relative to the main verb, not to now: present = at the same time, perfect = before, future = after."
        ]
      }
    ]
  },
  {
    "key": "forma",
    "label": "Formation",
    "title": "Formation",
    "blocks": [
      {
        "type": "table",
        "head": [
          "Conjugation",
          "Present active",
          "Perfect passive",
          "Future active"
        ],
        "rows": [
          [
            "1st: amō, amāre, amāvī, amātus",
            "amāns, amantis",
            "amātus, -a, -um",
            "amātūrus, -a, -um"
          ],
          [
            "2nd: moneō, monēre, monuī, monitus",
            "monēns, monentis",
            "monitus, -a, -um",
            "monitūrus, -a, -um"
          ],
          [
            "3rd: regō, regere, rēxī, rēctus",
            "regēns, regentis",
            "rēctus, -a, -um",
            "rēctūrus, -a, -um"
          ],
          [
            "3rd -iō: capiō, capere, cēpī, captus",
            "capiēns, capientis",
            "captus, -a, -um",
            "captūrus, -a, -um"
          ],
          [
            "4th: audiō, audīre, audīvī, audītus",
            "audiēns, audientis",
            "audītus, -a, -um",
            "audītūrus, -a, -um"
          ]
        ]
      },
      {
        "type": "table",
        "head": [
          "Participle",
          "How to form it",
          "Translation"
        ],
        "rows": [
          [
            "Present active",
            "Present stem + -ns (genitive -ntis): -āns in the 1st, -ēns in the 2nd and 3rd, -iēns in the 3rd -iō and 4th",
            "loving, while loving"
          ],
          [
            "Perfect passive",
            "4th principal part: drop nothing, it already ends in -us",
            "(having been) loved"
          ],
          [
            "Future active",
            "Stem of the 4th principal part + -ūrus, -ūra, -ūrum",
            "about to love, going to love"
          ]
        ]
      },
      {
        "type": "ul",
        "items": [
          "sum has no present or perfect participle; its future participle is futūrus (about to be). eō: iēns, euntis. possum: potēns (powerful, used as an adjective).",
          "Deponent verbs have a perfect participle with active meaning: cōnātus (having tried), secūtus (having followed), locūtus (having spoken), profectus (having set out), ēgressus (having gone out)."
        ]
      }
    ]
  },
  {
    "key": "declinatio",
    "label": "Declension",
    "title": "Declension",
    "blocks": [
      {
        "type": "h",
        "text": "Present participle: 3rd declension, one ending (amāns, amantis)"
      },
      {
        "type": "table",
        "head": [
          "Case",
          "Masc./fem. sg",
          "Neut. sg",
          "Masc./fem. pl",
          "Neut. pl"
        ],
        "rows": [
          [
            "Nominative",
            "amāns",
            "amāns",
            "amantēs",
            "amantia"
          ],
          [
            "Genitive",
            "amantis",
            "amantis",
            "amantium",
            "amantium"
          ],
          [
            "Dative",
            "amantī",
            "amantī",
            "amantibus",
            "amantibus"
          ],
          [
            "Accusative",
            "amantem",
            "amāns",
            "amantēs",
            "amantia"
          ],
          [
            "Ablative",
            "amante (amantī)",
            "amante (amantī)",
            "amantibus",
            "amantibus"
          ],
          [
            "Vocative",
            "amāns",
            "amāns",
            "amantēs",
            "amantia"
          ]
        ]
      },
      {
        "type": "p",
        "text": "Ablative singular -e when it acts as a verb (ā puerō clāmante), -ī when it is a plain adjective (ā virō sapientī). Genitive plural -ium, neuter plural -ia."
      },
      {
        "type": "h",
        "text": "Perfect and future participles: like bonus, bona, bonum"
      },
      {
        "type": "p",
        "text": "portātus, portāta, portātum; portātūrus, portātūra, portātūrum. They take every 1st/2nd declension ending: portātī, portātae, portāta, portātōrum and so on."
      }
    ]
  },
  {
    "key": "usus",
    "label": "Uses",
    "title": "Uses",
    "blocks": [
      {
        "type": "table",
        "head": [
          "Use",
          "What it does",
          "Example",
          "Translation"
        ],
        "rows": [
          [
            "Attributive",
            "Describes a noun like any adjective",
            "puerum <i>dormientem</i> vīdī",
            "I saw the sleeping boy"
          ],
          [
            "Circumstantial",
            "Adds when, why, although or if; translate with a clause",
            "mīlitēs urbem <i>captam</i> dēlēvērunt",
            "The soldiers captured the city and destroyed it / destroyed the city after it had been captured"
          ],
          [
            "Substantive",
            "Stands alone as a noun",
            "<i>audientēs</i> plausērunt; <i>captī</i> clāmābant",
            "The listeners applauded; the captives were shouting"
          ],
          [
            "Ablative absolute",
            "Noun + participle in the ablative, not tied to the main clause grammatically",
            "<i>urbe captā</i>, Rōmānī discessērunt",
            "When the city had been captured, the Romans left"
          ],
          [
            "With sum (passive perfect system)",
            "Perfect participle + sum makes the perfect passive",
            "epistula <i>scrīpta est</i>",
            "The letter was written / has been written"
          ],
          [
            "Future active + sum",
            "Active periphrastic: intention or likelihood",
            "<i>discessūrus</i> sum",
            "I am about to leave, I intend to leave"
          ],
          [
            "Future active of purpose",
            "Sometimes shows purpose after verbs of motion",
            "vēnit <i>pugnātūrus</i>",
            "He came to fight"
          ]
        ]
      }
    ]
  },
  {
    "key": "tempus",
    "label": "Relative time",
    "title": "Relative time",
    "blocks": [
      {
        "type": "table",
        "head": [
          "Participle",
          "Time compared with the main verb",
          "Example",
          "Translation"
        ],
        "rows": [
          [
            "Present",
            "Same time",
            "senem <i>ambulantem</i> salūtāvit",
            "He greeted the old man (who was) walking"
          ],
          [
            "Perfect",
            "Before",
            "senem <i>vulnerātum</i> iūvit",
            "He helped the old man who had been wounded"
          ],
          [
            "Future",
            "After",
            "senem <i>moritūrum</i> cōnsōlātus est",
            "He comforted the old man who was about to die"
          ]
        ]
      }
    ]
  },
  {
    "key": "absolutus",
    "label": "Ablative absolute",
    "title": "Ablative absolute",
    "blocks": [
      {
        "type": "ul",
        "items": [
          "A noun or pronoun in the ablative plus a participle (or another noun or adjective, since sum has no present participle: <i>Caesare duce</i>, with Caesar as leader; <i>mē invītō</i>, against my will).",
          "The noun cannot be the subject or object of the main verb; if it were, Latin would use an ordinary participle instead.",
          "Translate with when, after, since, although or because, or with \"with\": <i>hostibus vīsīs</i>, when the enemy had been seen, after seeing the enemy.",
          "Present: <i>rēge regente</i>, while the king was ruling. Perfect: <i>signō datō</i>, after the signal had been given."
        ]
      }
    ]
  },
  {
    "key": "consilia",
    "label": "Translation tips",
    "title": "Translation tips",
    "blocks": [
      {
        "type": "ul",
        "items": [
          "Find the noun the participle agrees with first (same gender, number and case), then decide how it relates to the main verb.",
          "Perfect passive participles are passive: <i>servus captus</i> is the slave who was captured, not who captured. For \"having captured\" Latin uses an ablative absolute or a cum clause, or a deponent.",
          "A participle often sits far from its noun and can wrap around words that belong to it: <i>ad urbem ā mīlitibus dēlētam</i>, to the city destroyed by the soldiers.",
          "Long participle phrases usually read best as a relative clause (who, which) or a when/after clause."
        ]
      }
    ]
  }
];

/**
 * The seven cases and their uses, after Allen and Greenough and Wheelock.
 * Each use has a name, what it does, examples as [Latin, English], and what
 * to look for in the sentence.
 */
export const CASES = [
  {
    key: 'nominativus',
    label: 'Nominative',
    latin: 'nōminātīvus',
    asks: 'Who? What?',
    uses: [
      {
        name: 'Subject',
        what: 'The person or thing that does the action of a finite verb, or that the sentence is about.',
        examples: [['Puella currit.', 'The girl runs.']],
        look: 'The verb’s personal ending agrees with it in number.',
      },
      {
        name: 'Predicate nominative',
        what: 'A noun or adjective after a linking verb that renames or describes the subject, in the same case as the subject.',
        examples: [
          ['Mārcus est mīles.', 'Marcus is a soldier.'],
          ['Cicerō cōnsul creātus est.', 'Cicero was elected consul.'],
        ],
        look: 'sum, fīō, videor, and passive verbs of naming, making and choosing: appellor, creor, dēligor, habeor.',
      },
    ],
  },
  {
    key: 'genetivus',
    label: 'Genitive',
    latin: 'genetīvus',
    asks: 'Whose? Of what?',
    uses: [
      {
        name: 'Possession',
        what: 'The owner of something.',
        examples: [['liber puerī', 'the boy’s book']],
        look: 'English “of” or “’s”.',
      },
      {
        name: 'Partitive (genitive of the whole)',
        what: 'The whole that a part is taken from.',
        examples: [
          ['magna pars mīlitum', 'a large part of the soldiers'],
          ['satis pecūniae', 'enough money'],
        ],
        look: 'pars, nēmō, nihil, satis, multum, plūs, quid, aliquid, and superlatives. Numbers usually take ex or dē with the ablative instead.',
      },
      {
        name: 'Description (quality)',
        what: 'A noun with an adjective that describes another noun, often by size or measure.',
        examples: [
          ['vir magnae virtūtis', 'a man of great courage'],
          ['fossa decem pedum', 'a ditch of ten feet'],
        ],
        look: 'The genitive noun always has an adjective or number with it. The ablative of description is the alternative.',
      },
      {
        name: 'Material',
        what: 'What something is made of or consists of.',
        examples: [['flūmina lactis', 'rivers of milk']],
        look: 'Rare. Prose more often uses ex with the ablative: pōcula ex aurō.',
      },
      {
        name: 'Subjective',
        what: 'The genitive noun does the action implied by the noun it depends on.',
        examples: [['amor mātris', 'a mother’s love (the mother loves)']],
        look: 'A noun of action or feeling; turn it into a verb and the genitive becomes its subject.',
      },
      {
        name: 'Objective',
        what: 'The genitive noun receives the action implied by a noun or adjective.',
        examples: [
          ['amor patriae', 'love of (for) one’s country'],
          ['timor mortis', 'fear of death'],
        ],
        look: 'Nouns and adjectives of feeling and desire: amor, timor, metus, cupiditās, spēs, memoria. Turn the noun into a verb and the genitive becomes its object.',
      },
      {
        name: 'With adjectives',
        what: 'Completes adjectives of desire, knowledge, memory, fullness, power, sharing and guilt, and their opposites.',
        examples: [
          ['Cupidus glōriae est.', 'He is eager for glory.'],
          ['perītus bellī', 'skilled in war'],
        ],
        look: 'cupidus, avidus, studiōsus, perītus, imperītus, memor, immemor, plēnus, particeps, expers.',
      },
      {
        name: 'With verbs of remembering and forgetting',
        what: 'The person or thing remembered or forgotten.',
        examples: [['Nōlī oblīvīscī meī.', 'Do not forget me.']],
        look: 'meminī, reminīscor, oblīvīscor; admoneō and commoneō (remind someone of). Things can also be in the accusative.',
      },
      {
        name: 'With impersonal verbs of feeling',
        what: 'The cause of the feeling; the person who feels it is in the accusative.',
        examples: [
          ['Mē paenitet stultitiae meae.', 'I regret my foolishness.'],
          ['Miseret mē tuī.', 'I pity you.'],
        ],
        look: 'pudet, paenitet, piget, taedet, miseret; also misereor.',
      },
      {
        name: 'Charge (with verbs of accusing)',
        what: 'The crime someone is accused, convicted or acquitted of.',
        examples: [['Prōditiōnis accūsātus est.', 'He was accused of treason.']],
        look: 'accūsō, arguō, īnsimulō, damnō, condemnō, absolvō. The penalty can be genitive too: capitis damnāre, to condemn to death.',
      },
      {
        name: 'Value (indefinite price)',
        what: 'How highly something is valued, in general terms rather than an exact sum.',
        examples: [['Hunc librum magnī aestimō.', 'I value this book highly.']],
        look: 'magnī, parvī, plūris, minōris, tantī, quantī with aestimō, faciō, putō, habeō, sum. An exact price is ablative.',
      },
      {
        name: 'With interest and rēfert',
        what: 'The person whose interest is concerned.',
        examples: [['Interest omnium rēctē facere.', 'It is in everyone’s interest to act rightly.']],
        look: 'interest, rēfert. For personal pronouns Latin uses meā, tuā, nostrā, vestrā instead: meā interest.',
      },
      {
        name: 'Predicate genitive (characteristic)',
        what: 'With sum: it is the mark, duty or nature of someone to do something.',
        examples: [['Cuiusvīs hominis est errāre.', 'It is (the nature) of any man to err.']],
        look: 'est with a genitive and an infinitive.',
      },
      {
        name: 'With causā and grātiā',
        what: 'Purpose: for the sake of. The genitive, often a gerund or gerundive, comes before causā or grātiā.',
        examples: [['Pācis petendae causā vēnērunt.', 'They came to ask for peace.']],
        look: 'causā or grātiā at the end of the phrase.',
      },
    ],
  },
  {
    key: 'dativus',
    label: 'Dative',
    latin: 'datīvus',
    asks: 'To whom? For whom?',
    uses: [
      {
        name: 'Indirect object',
        what: 'The person to whom something is given, shown or said.',
        examples: [['Servō librum dedit.', 'He gave the book to the slave.']],
        look: 'dō, dōnō, reddō, mōnstrō, ostendō, dīcō, nūntiō, nārrō. Motion toward a place takes ad with the accusative instead.',
      },
      {
        name: 'Reference (advantage or disadvantage)',
        what: 'The person or thing affected by the action, or in whose eyes it is true.',
        examples: [['Nōn scholae sed vītae discimus.', 'We learn not for school but for life.']],
        look: 'English “for” or “in the eyes of”. Also called the dative of interest.',
      },
      {
        name: 'Purpose',
        what: 'The end or purpose something serves, usually an abstract noun.',
        examples: [['Locum castrīs dēlēgit.', 'He chose a place for a camp.']],
        look: 'Often paired with a dative of reference in a double dative.',
      },
      {
        name: 'Double dative',
        what: 'A dative of purpose and a dative of reference together.',
        examples: [['Ea rēs magnō ūsuī nostrīs fuit.', 'That was of great use to our men.']],
        look: 'sum with auxiliō, cūrae, dōnō, odiō, praesidiō, ūsuī; mittō, veniō, relinquō with auxiliō or praesidiō.',
      },
      {
        name: 'Possession (with sum)',
        what: 'The owner is in the dative and the thing owned is the subject of sum.',
        examples: [['Puellae multī amīcī sunt.', 'The girl has many friends.']],
        look: 'A form of sum with a dative of a person: mihi est, nōbīs sunt.',
      },
      {
        name: 'Agent (with the passive periphrastic)',
        what: 'The person by whom something must be done.',
        examples: [['Haec nōbīs agenda sunt.', 'These things must be done by us.']],
        look: 'A gerundive with sum: agendus est, dēlenda est.',
      },
      {
        name: 'With special intransitive verbs',
        what: 'Verbs meaning favour, help, please, trust, obey, serve, resist, envy, threaten, pardon, spare and persuade take a dative, not an accusative.',
        examples: [
          ['Mīlitēs ducī pārent.', 'The soldiers obey the leader.'],
          ['Crēde mihi.', 'Believe me.'],
        ],
        look: 'crēdō, faveō, ignōscō, imperō, invideō, noceō, parcō, pāreō, persuādeō, placeō, resistō, serviō, studeō, subveniō.',
      },
      {
        name: 'With compound verbs',
        what: 'Many verbs compounded with a preposition take a dative.',
        examples: [['Lēgātus legiōnī praeerat.', 'The legate was in command of the legion.']],
        look: 'Prefixes ad, ante, con, in, inter, ob, post, prae, prō, sub, super: adsum, dēsum, praesum, intersum, obstō, praeficiō, impōnō, succurrō.',
      },
      {
        name: 'With adjectives',
        what: 'Adjectives of fitness, nearness, likeness, friendliness and service, and their opposites.',
        examples: [['Fīlius patrī similis est.', 'The son is like his father.']],
        look: 'amīcus, inimīcus, cārus, grātus, fidēlis, similis, dissimilis, pār, propinquus, proximus, ūtilis, idōneus, aptus, facilis, necessārius.',
      },
      {
        name: 'Separation',
        what: 'With compounds of ab, dē and ex, the person something is taken from.',
        examples: [['Mīlitī scūtum dētrāxit.', 'He pulled the shield away from the soldier.']],
        look: 'adimō, auferō, dētrahō, ēripiō, surripiō. Translate with “from”.',
      },
    ],
  },
  {
    key: 'accusativus',
    label: 'Accusative',
    latin: 'accūsātīvus',
    asks: 'Whom? What? Where to? How long?',
    uses: [
      {
        name: 'Direct object',
        what: 'The person or thing that receives the action of a transitive verb.',
        examples: [['Canis puerum mordet.', 'The dog bites the boy.']],
        look: 'A transitive verb in the active voice.',
      },
      {
        name: 'Extent of time',
        what: 'How long something lasts.',
        examples: [['Trēs hōrās labōrābat.', 'He was working for three hours.']],
        look: 'A unit of time with no preposition: tōtum diem, multōs annōs. Sometimes per.',
      },
      {
        name: 'Extent of space',
        what: 'How far, how high, how wide or how deep.',
        examples: [['Mūrus decem pedēs altus est.', 'The wall is ten feet high.']],
        look: 'pedēs, passūs, mīlia passuum with altus, lātus, longus, or with verbs of motion.',
      },
      {
        name: 'Place to which',
        what: 'Motion toward a place.',
        examples: [['Rōmam rediit et domum festīnāvit.', 'He returned to Rome and hurried home.']],
        look: 'ad, in and sub with the accusative; names of cities, towns and small islands, and domum and rūs, with no preposition.',
      },
      {
        name: 'Subject of an infinitive',
        what: 'The subject of an infinitive in indirect statement and after verbs such as iubeō and volō.',
        examples: [['Dīcit puellam venīre.', 'He says that the girl is coming.']],
        look: 'Verbs of saying, thinking, knowing and perceiving; iubeō, vetō, cupiō, volō.',
      },
      {
        name: 'Exclamation',
        what: 'An exclamation, with or without an interjection.',
        examples: [
          ['Mē miserum!', 'Poor me!'],
          ['Ō fallācem hominum spem!', 'Oh, the deceptive hope of men!'],
        ],
        look: 'ō, heu, ēn, or a noun or pronoun with an adjective and no verb.',
      },
      {
        name: 'Double accusative',
        what: 'Two accusatives: a person and a thing with verbs of asking, teaching and concealing; an object and a predicate with verbs of naming, making and choosing.',
        examples: [
          ['Mē sententiam rogāvit.', 'He asked me my opinion.'],
          ['Populus Cicerōnem cōnsulem creāvit.', 'The people elected Cicero consul.'],
        ],
        look: 'rogō, doceō, cēlō, ōrō; appellō, creō, faciō, dēligō, habeō.',
      },
      {
        name: 'Respect (Greek accusative)',
        what: 'The part affected, mostly in poetry: “in respect of”.',
        examples: [['Ōs umerōsque deō similis.', 'Like a god in face and shoulders.']],
        look: 'Poetry; a part of the body with an adjective or a passive verb.',
      },
      {
        name: 'Cognate accusative',
        what: 'A noun of related meaning, often with an adjective, after an otherwise intransitive verb.',
        examples: [['Beātam vītam vīvit.', 'He lives a happy life.']],
        look: 'vītam vīvere, pugnam pugnāre, somnum dormīre.',
      },
      {
        name: 'Adverbial accusative',
        what: 'A neuter pronoun or adjective, or a few nouns, used like an adverb.',
        examples: [['Multum valet.', 'He has great influence.']],
        look: 'multum, plūrimum, nihil, aliquid, quid, magnam partem.',
      },
      {
        name: 'With prepositions',
        what: 'The object of prepositions that take the accusative.',
        examples: [['Per urbem ambulāmus.', 'We walk through the city.']],
        look: 'ad, ante, apud, circum, contrā, inter, ob, per, post, prope, propter, trāns; in and sub for motion.',
      },
    ],
  },
  {
    key: 'ablativus',
    label: 'Ablative',
    latin: 'ablātīvus',
    asks: 'By what? With what? From where? When?',
    uses: [
      {
        name: 'Means (instrument)',
        what: 'The thing with which something is done. Never a person.',
        examples: [['Gladiō pugnat.', 'He fights with a sword.']],
        look: 'No preposition. Translate with “with” or “by”.',
      },
      {
        name: 'Manner',
        what: 'How something is done.',
        examples: [['Magnā cum cūrā labōrābat.', 'He worked with great care.']],
        look: 'cum with an abstract noun; cum may drop out when the noun has an adjective: magnā cūrā.',
      },
      {
        name: 'Accompaniment',
        what: 'The person or thing that goes with someone.',
        examples: [['Cum amīcīs ambulat.', 'He walks with his friends.']],
        look: 'cum. In military language cum can drop out: omnibus cōpiīs.',
      },
      {
        name: 'Personal agent',
        what: 'The person by whom the action of a passive verb is done.',
        examples: [['Urbs ā mīlitibus capta est.', 'The city was captured by the soldiers.']],
        look: 'ā or ab with a person and a passive verb.',
      },
      {
        name: 'Cause',
        what: 'Why something happens, especially with verbs of feeling.',
        examples: [['Timōre fūgērunt.', 'They fled out of fear.']],
        look: 'No preposition. Compare ob and propter with the accusative, and causā with the genitive.',
      },
      {
        name: 'Place where',
        what: 'Where something is or happens.',
        examples: [['In forō stābat.', 'He was standing in the forum.']],
        look: 'in and sub with the ablative. locō, terrā marīque and tōtā urbe often have no preposition. Cities and towns use the locative.',
      },
      {
        name: 'Place from which',
        what: 'Motion away from a place.',
        examples: [
          ['Ex urbe fūgit.', 'He fled from the city.'],
          ['Rōmā discessit.', 'He left Rome.'],
        ],
        look: 'ā/ab, ē/ex, dē; names of cities, towns and small islands, and domō and rūre, with no preposition.',
      },
      {
        name: 'Separation',
        what: 'What someone is freed from, deprived of or lacks.',
        examples: [['Urbem metū līberāvit.', 'He freed the city from fear.']],
        look: 'careō, egeō, līberō, prīvō, spoliō, abstineō; vacuus, līber. With or without ā/ab, ē/ex.',
      },
      {
        name: 'Origin (source)',
        what: 'The parent or family someone is born from.',
        examples: [['Nōbilī genere nātus est.', 'He was born of a noble family.']],
        look: 'nātus, ortus, genitus, satus. ā/ab or ex for remoter ancestors.',
      },
      {
        name: 'Time when',
        what: 'The point in time at which something happens.',
        examples: [['Prīmā lūce discessērunt.', 'They left at dawn.']],
        look: 'hōrā, diē, nocte, aestāte, tempore with no preposition.',
      },
      {
        name: 'Time within which',
        what: 'The period within which something happens.',
        examples: [['Tribus diēbus redībit.', 'He will return within three days.']],
        look: 'A number of units of time with no preposition. Compare the accusative of extent of time.',
      },
      {
        name: 'Comparison',
        what: 'The thing compared, after a comparative, instead of quam.',
        examples: [['Nihil est clārius sōle.', 'Nothing is brighter than the sun.']],
        look: 'A comparative with no quam. Used only when the first thing is nominative or accusative.',
      },
      {
        name: 'Degree of difference',
        what: 'By how much one thing differs from another.',
        examples: [
          ['Multō altior est.', 'It is much taller.'],
          ['Paucīs post diēbus vēnit.', 'He came a few days later.'],
        ],
        look: 'multō, paulō, tantō, quantō, and numbers, with comparatives, superlatives, ante and post.',
      },
      {
        name: 'Description (quality)',
        what: 'A noun with an adjective that describes another noun, often a physical feature.',
        examples: [['Erat vir magnā virtūte.', 'He was a man of great courage.']],
        look: 'Always with an adjective. Compare the genitive of description.',
      },
      {
        name: 'Respect (specification)',
        what: 'In what respect something is true.',
        examples: [['Hī omnēs linguā, īnstitūtīs, lēgibus inter sē differunt.', 'These all differ from one another in language, customs and laws.']],
        look: 'Adjectives and verbs of differing, excelling, being strong or weak: differō, superō, praestō, valeō. Translate with “in”.',
      },
      {
        name: 'Price',
        what: 'The definite price of something.',
        examples: [['Librum decem dēnāriīs ēmit.', 'He bought the book for ten denarii.']],
        look: 'emō, vēndō, cōnstō, sum; magnō and parvō for costing much or little. General value is genitive.',
      },
      {
        name: 'Ablative absolute',
        what: 'A noun and a participle in the ablative, not tied to the main clause grammatically.',
        examples: [
          ['Urbe captā, Rōmānī discessērunt.', 'When the city had been captured, the Romans left.'],
          ['Caesare duce', 'with Caesar as leader'],
        ],
        look: 'A noun and participle, or two nouns, or a noun and adjective, in the ablative and set off by commas. Translate with when, after, since, although or with.',
      },
      {
        name: 'With special deponents',
        what: 'Five deponent verbs and their compounds take an ablative, not an accusative.',
        examples: [
          ['Gladiō ūtitur.', 'He uses a sword.'],
          ['Rōmānī urbe potītī sunt.', 'The Romans took possession of the city.'],
        ],
        look: 'ūtor, fruor, fungor, potior, vēscor.',
      },
      {
        name: 'With dignus and indignus',
        what: 'What someone is worthy or unworthy of.',
        examples: [['Dignus laude est.', 'He is worthy of praise.']],
        look: 'dignus, indignus; also contentus, frētus, praeditus.',
      },
      {
        name: 'Route (way by which)',
        what: 'The road, gate or way by which someone goes.',
        examples: [['Viā Appiā iter fēcit.', 'He travelled by the Appian Way.']],
        look: 'viā, itinere, portā, ponte, terrā, marī with no preposition.',
      },
      {
        name: 'With prepositions',
        what: 'The object of prepositions that take the ablative.',
        examples: [['Sine metū vīvimus.', 'We live without fear.']],
        look: 'ā/ab, cum, dē, ē/ex, prae, prō, sine; in and sub for place where.',
      },
    ],
  },
  {
    key: 'vocativus',
    label: 'Vocative',
    latin: 'vocātīvus',
    asks: 'Who is spoken to?',
    uses: [
      {
        name: 'Direct address',
        what: 'The person or thing spoken to.',
        examples: [
          ['Quid agis, Mārce?', 'How are you, Marcus?'],
          ['Venī, mī fīlī.', 'Come, my son.'],
        ],
        look: 'Often ō, and commas around the name. It differs from the nominative only in 2nd declension nouns in -us (-e: Mārce) and -ius (-ī: fīlī); meus becomes mī.',
      },
    ],
  },
  {
    key: 'locativus',
    label: 'Locative',
    latin: 'locātīvus',
    asks: 'Where? (at a city, at home)',
    uses: [
      {
        name: 'Cities, towns and small islands',
        what: 'Place where, with names of cities, towns and small islands, with no preposition.',
        examples: [
          ['Rōmae habitat.', 'He lives at Rome.'],
          ['Athēnīs studēbat.', 'He was studying at Athens.'],
        ],
        look: 'A place name with no preposition answering “where?”. Countries and large islands use in with the ablative: in Italiā, in Siciliā.',
      },
      {
        name: 'domus, rūs, humus',
        what: 'A few common nouns keep the locative.',
        examples: [
          ['Domī manet.', 'He stays at home.'],
          ['Rūrī vīvit.', 'He lives in the country.'],
          ['Humī iacēbat.', 'He was lying on the ground.'],
        ],
        look: 'domī, rūrī, humī; also bellī and mīlitiae: domī mīlitiaeque, at home and at war.',
      },
    ],
    table: {
      title: 'Forms of the locative',
      head: ['Declension', 'Ending', 'Examples'],
      rows: [
        ['1st singular', '-ae (like the genitive)', 'Rōmae (at Rome)'],
        ['1st plural', '-īs (like the ablative)', 'Athēnīs (at Athens)'],
        ['2nd singular', '-ī (like the genitive)', 'Corinthī (at Corinth), Rhodī (on Rhodes)'],
        ['2nd plural', '-īs (like the ablative)', 'Delphīs (at Delphi)'],
        ['3rd singular', '-ī or -e', 'Carthāginī or Carthāgine (at Carthage)'],
        ['3rd plural', '-ibus (like the ablative)', 'Gādibus (at Cadiz)'],
        ['Special forms', '', 'domī (at home), rūrī (in the country), humī (on the ground)'],
      ],
    },
  },
];
