/**
 * Curated grammar explanations for the tutor, Latin side.
 *
 * The largest of the three sets, because Latin needs it: a reader meets the
 * whole case system in the first fortnight and cannot get through a sentence
 * without it, where a Spanish beginner can say a great deal before the
 * subjunctive turns up.
 *
 * Bodies are English only, and deliberately. The chat answers in English
 * whatever the interface is set to — a tutor replying in Latin would be a joke
 * at the reader's expense. Titles carry the Latin name too, because that is
 * what the grammar is called and what a textbook will say.
 */

const topic = (id, keywords, la, en, body) => ({
  id,
  keywords,
  title: { la, en },
  body: { la: body, en: body },
});

export const TOPICS = [
  topic('cases', ['cases', 'case', 'the cases', 'casus', 'six cases', 'what are the cases', 'vocative', 'locative', 'which case', 'ablative case', 'accusative case'],
    'Casus', 'The cases', `Latin marks a noun's job in the sentence by its **ending**, not by its position. That is the whole idea, and it is why word order is free.

| case | job | rough English |
| --- | --- | --- |
| **nominative** | the subject | *the girl* |
| **vocative** | the person addressed | *o girl!* |
| **accusative** | the direct object | *the girl* (as object) |
| **genitive** | possession, "of" | *of the girl* |
| **dative** | indirect object, "to/for" | *to the girl* |
| **ablative** | by, with, from, in | *by the girl* |

*Puella agricolam amat* and *agricolam puella amat* mean the same thing: the girl loves the farmer. **Puella** is nominative so it is the subject; **agricolam** is accusative so it is the object. Swap the endings and you swap the meaning — *puellam agricola amat* is the farmer loving the girl — no matter where the words sit.

The habit to build is reading the ending first and the position not at all. English does the opposite, which is why the first month is hard.`),

  topic('nominative-accusative', ['nominative', 'accusative', 'subject', 'object', 'nominative vs accusative', 'direct object'],
    'Nominativus et accusativus', 'Nominative and accusative', `The two that carry the backbone of a sentence.

**Nominative** — the subject, and anything describing it after *sum*.
- *Puella cantat.* — The girl sings.
- *Puella est laeta.* — The girl is happy. (*laeta* is nominative too: **sum** takes a nominative on both sides, never an accusative.)

**Accusative** — the direct object.
- *Puellam video.* — I see the girl.

**Endings to know:**

| | 1st | 2nd m. | 2nd n. | 3rd |
| --- | --- | --- | --- | --- |
| nom. sg. | puell**a** | domin**us** | bell**um** | rex |
| acc. sg. | puell**am** | domin**um** | bell**um** | reg**em** |
| nom. pl. | puell**ae** | domin**i** | bell**a** | reg**es** |
| acc. pl. | puell**as** | domin**os** | bell**a** | reg**es** |

**Neuters never distinguish the two.** *Bellum* is nominative and accusative alike, and *bella* covers both in the plural. Only the sense tells you which — a rule with no exceptions in any declension.

The accusative also follows certain prepositions of motion towards: *ad, in* (into), *per, trans, prope, circum*.
- *ad villam* — to the house · *in villam* — into the house`),

  topic('genitive', ['genitive', 'of', 'possession', 'possessive', 'genitivus'],
    'Genitivus', 'The genitive', `The "of" case: it attaches one noun to another.

- *liber puellae* — the book **of the girl**, the girl's book
- *rex Romanorum* — the king **of the Romans**

The genitive almost always sits next to the noun it belongs to, and it is the case a dictionary quotes to tell you the declension — *puella, puell**ae*** is first, *rex, reg**is*** is third. That is its second job and the reason principal parts exist.

**Endings:**

| | sg. | pl. |
| --- | --- | --- |
| 1st | puell**ae** | puell**arum** |
| 2nd | domin**i** | domin**orum** |
| 3rd | reg**is** | reg**um** (i-stem: **-ium**) |
| 4th | man**us** | man**uum** |
| 5th | di**ei** | di**erum** |

**Other uses worth knowing:**
- **partitive** — *satis pecuniae* (enough of money), *nihil novi* (nothing new)
- **description** — *vir magnae virtutis* (a man of great courage)
- with a few adjectives — *plenus aquae* (full of water), *cupidus gloriae*

The trap for an English reader is that "the girl's book" and "the book of the girl" are the same Latin, and the genitive is the girl either way — never the book.`),

  topic('dative', ['dative', 'to', 'for', 'indirect object', 'dativus'],
    'Dativus', 'The dative', `The "to" or "for" case — the person something is given to, done for, or happens to.

- *puellae librum do* — I give the book **to the girl**
- *tibi hoc facio* — I do this **for you**

**Endings:**

| | sg. | pl. |
| --- | --- | --- |
| 1st | puell**ae** | puell**is** |
| 2nd | domin**o** | domin**is** |
| 3rd | reg**i** | reg**ibus** |
| 4th | man**ui** | man**ibus** |
| 5th | di**ei** | di**ebus** |

Note that the first declension dative and genitive singular are both *puellae*, and the dative and ablative plural are both *puellis*. Context does the separating; there is no ending that will help you.

**Verbs that take a dative where English takes an object** — these have to be learned as a list, because nothing in the English signals it:
- *credo* (believe), *faveo* (favour), *ignosco* (forgive), *impero* (order), *noceo* (harm), *pareo* (obey), *persuadeo* (persuade), *placeo* (please), *resisto* (resist), *servio* (serve)
- *tibi credo* — I believe you (not *te credo*)

**Dative of possession**, with *sum*: *mihi est liber* — literally "there is a book to me", i.e. I have a book.`),

  topic('ablative', ['ablative', 'ablativus', 'by with from in', 'ablative uses', 'means', 'manner'],
    'Ablativus', 'The ablative', `The case that swallowed three older ones, which is why it does so many jobs. English needs *by*, *with*, *from* and *in* to cover it.

**Endings:**

| | sg. | pl. |
| --- | --- | --- |
| 1st | puell**a** | puell**is** |
| 2nd | domin**o** | domin**is** |
| 3rd | reg**e** (i-stem **-i**) | reg**ibus** |
| 4th | man**u** | man**ibus** |
| 5th | di**e** | di**ebus** |

**Without a preposition:**
- **means or instrument** — *gladio pugnat*, he fights **with a sword**. The thing used is bare ablative.
- **manner** — *magna cum cura*, with great care. (*cum* is usual when an adjective is present.)
- **time when** — *prima luce*, at first light; *tertio die*, on the third day.
- **comparison** — *melior fratre*, better **than his brother**, as an alternative to *quam*.
- **description** — *vir magna virtute*, a man of great courage.

**With a preposition:**
- *ab / a* — from, by (a **person**): *a nautis amatur*, he is loved **by the sailors**
- *cum* — with (**accompaniment**): *cum amicis*, with friends
- *de* — down from, about · *ex / e* — out of · *in* — in, on · *sub* — under

The distinction students lose marks on: **means has no preposition, agent has *ab***. A sword is a thing, so *gladio necatus*; a sailor is a person, so *a nauta necatus*. Both are "by" in English.`),

  topic('declensions', ['declensions', 'declension', 'five declensions', 'noun endings', 'declinatio', '1st declension', '2nd declension', '3rd declension', 'i-stem', 'i stem', 'first declension', 'second declension', 'third declension', 'fourth declension', 'fifth declension'],
    'Declinationes', 'The five declensions', `Every Latin noun belongs to one of five patterns, and its **genitive singular** says which. That is why a dictionary quotes two forms.

| | genitive | example | mostly |
| --- | --- | --- | --- |
| 1st | **-ae** | puella, puellae | feminine |
| 2nd | **-i** | dominus, domini · bellum, belli | masculine / neuter |
| 3rd | **-is** | rex, regis | any gender |
| 4th | **-us** | manus, manus | masculine |
| 5th | **-ei** | dies, diei | feminine |

**The stem comes from the genitive, never the nominative.** *Rex* gives you nothing; *regis* gives you **reg-**, and every other form is built on it — *regem, regi, rege, reges, regum*. This is the single most useful habit in reading Latin, and it is why third declension nouns look so unlike their own nominatives.

**Two rules that catch everyone:**
- **Neuters** always have nominative = accusative, and their nominative plural always ends **-a**.
- **Third declension i-stems** differ in a handful of cells — genitive plural **-ium** rather than **-um**. A noun is an i-stem if it is parisyllabic (*civis, civis*), if two consonants close the stem (*urbs, urbis* → urb-), or if it is a neuter in *-al, -ar, -e* (*animal, mare*).

The declensions page on this site will decline any noun you give it the two parts for.`),

  topic('gender-agreement', ['gender', 'agreement', 'adjective agreement', 'masculine feminine neuter'],
    'Genus et consensus', 'Gender and agreement', `Every noun has a fixed gender, and every adjective describing it must **agree in case, number and gender**. Three things at once, every time.

*bonus dominus* · *bona puella* · *bonum bellum*
*bonos dominos* · *bonarum puellarum* · *bonis dominis*

**Agreement is not rhyme.** The adjective takes the ending its own declension gives for that case, number and gender — which often looks nothing like the noun's:
- *puella bona* — both first declension, so they match by luck
- *nauta bonus* — *nauta* is a **masculine** first declension noun, so its adjective is masculine second declension. This pair is the classic exam question.
- *rex bonus* · *reges boni* · *regis boni* — third declension noun, second declension adjective

**Guessing gender:**
- 1st declension: feminine, except a handful of male roles — *nauta, agricola, poeta, incola, pirata*
- 2nd in *-us*: masculine · 2nd in *-um*: neuter
- 3rd: has to be learned, though *-io, -tas, -tudo* are feminine and *-us, -men* neuter
- 4th: masculine, except *manus* and *domus*, which are feminine`),

  topic('adjectives', ['adjectives', 'adjective', 'comparative', 'superlative', 'better', 'best', 'comparison'],
    'Adiectiva', 'Adjectives', `Two families, and the dictionary form says which.

**First and second declension** — *bonus, bona, bonum*. Masculine like *dominus*, feminine like *puella*, neuter like *bellum*.

**Third declension** — always i-stems, so ablative singular **-i** and genitive plural **-ium**. They come with one, two or three terminations:
- *acer, acris, acre* — three, one per gender
- *fortis, forte* — two, the second being the neuter
- *ingens, ingentis* — one, the second part being the **genitive**; every gender shares the nominative

**Comparative and superlative:**

| | | |
| --- | --- | --- |
| positive | *longus* | long |
| comparative | *long**ior**, long**ius*** | longer, rather long, too long |
| superlative | *long**issimus*** | longest, very long |

The comparative declines as a third declension consonant stem; the superlative as *bonus*. *quam* + superlative means "as … as possible": *quam celerrime*, as fast as possible.

**The irregulars are the ones you will actually meet:**
- *bonus → melior → optimus*
- *malus → peior → pessimus*
- *magnus → maior → maximus*
- *parvus → minor → minimus*
- *multus → plus → plurimus*

Adjectives in *-er* form the superlative in *-rimus* (*celer → celerrimus*), and six in *-lis* in *-limus* (*facilis → facillimus*).`),

  topic('principal-parts', ['principal parts', 'four principal parts', 'parts', 'verb parts', 'stems', 'supine', 'supine stem', 'perfect stem', 'present stem'],
    'Partes principales', 'Principal parts', `A Latin verb is quoted by three or four forms, and they are not decoration — each one is a **stem you cannot predict from the others**.

*amo, amare, amavi, amatus*

| part | what it is | what it builds |
| --- | --- | --- |
| 1st | 1st person sg. present | the present, with the 2nd |
| 2nd | present infinitive | which conjugation; the **present stem** *ama-* |
| 3rd | 1st person sg. perfect | the **perfect stem** *amav-* — perfect, pluperfect, future perfect |
| 4th | perfect passive participle (or supine) | the **supine stem** *amat-* — the passive perfect, the future participle |

*rego, regere, rexi, rectus* — you could never have guessed *rexi* from *rego*, or *rectus* from *rexi*. That is exactly why they are learned by heart.

**Which conjugation:** the second part tells you.

| | infinitive | example |
| --- | --- | --- |
| 1st | **-are** | amo, amare |
| 2nd | **-ere** (long e) | moneo, monere |
| 3rd | **-ere** (short e) | rego, regere |
| 3rd -io | **-ere** | capio, capere |
| 4th | **-ire** | audio, audire |

Second and third look identical without macrons, so the **first** part separates them: a second conjugation verb ends *-eo* (*moneo*), a third *-io* verb ends *-io* (*capio*), and everything else in *-o* is plain third.`),

  topic('conjugations', ['conjugations', 'five conjugations', 'which conjugation', '3rd io', 'third io',
    'io verbs', 'capio', 'mixed conjugation', 'how to conjugate 3rd-io', 'how do you conjugate', 'impersonal verbs', 'defective verbs', 'irregular verbs'],
    'Coniugationes', 'The five conjugations', `Every Latin verb belongs to one of five patterns, and the **second principal part** says which.

| | infinitive | example | present stem |
| --- | --- | --- | --- |
| 1st | **-are** | amo, amare | ama- |
| 2nd | **-ere** (long e) | moneo, monere | mone- |
| 3rd | **-ere** (short e) | rego, regere | reg- |
| 3rd **-io** | **-ere** | capio, capere | cap- |
| 4th | **-ire** | audio, audire | audi- |

Three of them end *-ere* and macrons are not printed, so the infinitive alone cannot tell them apart. The **first** principal part can, and this is the test to memorise:

- ends **-eo** → second conjugation (*moneo, video, habeo, teneo*)
- ends **-io** *with* an *-ere* infinitive → third **-io** (*capio, facio, fugio*)
- ends **-o** otherwise → plain third (*rego, dico, mitto*)

### The third -io conjugation

It is the awkward one, and the awkwardness is worth stating plainly: **it looks like the fourth in some forms and the third in others.** The rule is that the *i* survives wherever the fourth conjugation would have one, and disappears where the third conjugation has a short vowel.

| | 3rd *rego* | 3rd -io *capio* | 4th *audio* |
| --- | --- | --- | --- |
| I | reg**o** | cap**io** | aud**io** |
| you | reg**is** | cap**is** | aud**is** |
| he | reg**it** | cap**it** | aud**it** |
| we | reg**imus** | cap**imus** | aud**imus** |
| you (pl.) | reg**itis** | cap**itis** | aud**itis** |
| they | reg**unt** | cap**iunt** | aud**iunt** |

So *capio* is **exactly like *rego*** except in the first person singular and the third person plural, where the *i* comes back.

Everywhere else the *i* stays:
- imperfect — *capiebam* (like *audiebam*, not *regebam*)
- future — *capiam, capies* (like *audiam*, not *regam, reges*… which happens to look the same in the first person and different after)
- present subjunctive — *capiam, capias*
- present participle — *capiens*
- gerundive — *capiendus*

And it drops out in the two places the third conjugation is bare:
- imperfect subjunctive — *caperem*, from the infinitive *capere*
- imperative — *cape*, *capite*

**The verbs worth knowing** are common enough that you will meet them constantly: *capio* (take), *facio* (make, do), *fugio* (flee), *iacio* (throw), *rapio* (seize), *cupio* (desire), *accipio* (receive), *conspicio* (catch sight of), *incipio* (begin), *interficio* (kill).

Note that most compounds of *facio* and *capio* weaken the vowel: *facio → perficio, efficio, reficio*; *capio → accipio, incipio, recipio*.`),

  topic('present-tense', ['present', 'present tense', 'praesens'],
    'Tempus praesens', 'The present tense', `Formed on the present stem, which is the infinitive minus its ending.

| | 1st ama- | 2nd mone- | 3rd reg- | 3rd -io cap- | 4th audi- |
| --- | --- | --- | --- | --- | --- |
| I | amo | moneo | rego | capio | audio |
| you | amas | mones | regis | capis | audis |
| he/she | amat | monet | regit | capit | audit |
| we | amamus | monemus | regimus | capimus | audimus |
| you (pl.) | amatis | monetis | regitis | capitis | auditis |
| they | amant | monent | regunt | capiunt | audiunt |

The personal endings **-o, -s, -t, -mus, -tis, -nt** are the same throughout; only the vowel in front of them changes. Learn the endings once and the rest is which vowel.

Latin has no separate continuous tense: *amat* is "he loves", "he is loving" and "he does love", and only the English needs choosing.

**No pronoun is needed** — the ending already says who. *Amo* is "I love" on its own; *ego amo* adds emphasis, "**I** love".`),

  topic('imperfect-perfect', ['imperfect', 'perfect', 'imperfect vs perfect', 'past tense', 'past tenses', 'which past tense', 'pluperfect', 'plusquamperfect', 'future perfect', 'perfect tense'],
    'Imperfectum et perfectum', 'Imperfect vs. perfect', `Both are past. The split is the same one Spanish and French make, and for the same reason.

**Imperfect** — going on, repeated, or descriptive. Stem + **-bam, -bas, -bat, -bamus, -batis, -bant**.
- *amabam* — I was loving, I used to love
- *regebam, capiebam, audiebam* — the third and fourth insert **-e-**

**Perfect** — done, finished, a single completed event. Built on the **third principal part**, with endings of its own:
**-i, -isti, -it, -imus, -istis, -erunt**
- *amavi* — I loved, I have loved
- *rexi, rexisti, rexit, reximus, rexistis, rexerunt*

*Dum ambulabam, canem vidi.* — While I **was walking** (imperfect, the background) I **saw** a dog (perfect, the event).

The perfect covers both English "I loved" and "I have loved". Nothing in the Latin distinguishes them; the sentence around it decides.

**Pluperfect** — had done. Perfect stem + **-eram, -eras, -erat, -eramus, -eratis, -erant**. *amaveram*, I had loved.

**Future perfect** — will have done. Perfect stem + **-ero, -eris, -erit, -erimus, -eritis, -erint**. *amavero*.`),

  topic('future', ['future', 'future tense', 'futurum'],
    'Tempus futurum', 'The future tense', `Two patterns, split down the middle of the conjugations — which is why it is worth learning as two things.

**First and second conjugation: -bo, -bis, -bit, -bimus, -bitis, -bunt**
- *amabo, amabis, amabit, amabimus, amabitis, amabunt*
- *monebo, monebis, monebit…*

**Third and fourth: -am, -es, -et, -emus, -etis, -ent**
- *regam, reges, reget, regemus, regetis, regent*
- *capiam, capies, capiet…* · *audiam, audies, audiet…*

**The trap.** In the third and fourth conjugations the future first person singular *regam* is spelled exactly like the present subjunctive *regam*, and *reges* like the subjunctive *reges*… no: the subjunctive is *regas*. Only the first person collides. But *amabit* could never be a subjunctive, so the first two conjugations are safe.

The other trap is that **-bo** looks like it should be everywhere. It is not; *regibo* is not a word.

For *sum*: *ero, eris, erit, erimus, eritis, erunt*.`),

  topic('passive', ['passive', 'passive voice', 'passivum', 'is loved', 'was loved'],
    'Vox passiva', 'The passive voice', `The passive endings replace the active ones and are the same in every conjugation:

**-r, -ris, -tur, -mur, -mini, -ntur**

- *amor, amaris, amatur, amamur, amamini, amantur* — I am loved, you are loved…
- *regor, regeris, regitur, regimur, regimini, reguntur*

Imperfect *amabar*, future *amabor* — the same endings on the same stems.

**The perfect passive is two words**: the perfect participle plus *sum*.
- *amatus sum* — I was loved / I have been loved
- *amatus eram* — I had been loved
- *amatus ero* — I will have been loved

The participle is an adjective and **agrees with the subject**: *puella amata est*, the girl was loved; *pueri amati sunt*, the boys were loved.

**Who did it:**
- a person — *ab* + ablative: *a nautis amatur*, he is loved **by the sailors**
- a thing — bare ablative: *gladio necatus est*, he was killed **with a sword**

Do not confuse *amatus est* (he was loved) with *amatus erat* (he had been loved) — the tense of *sum* moves the whole thing back one step.`),

  topic('deponents', ['deponent', 'deponents', 'deponent verbs', 'passive in form'],
    'Verba deponentia', 'Deponent verbs', `Verbs that are **passive in form and active in meaning**. There is no rule for spotting them; they are a list, and the dictionary form gives them away by having only three parts, the last being a participle.

*sequor, sequi, secutus* — to follow
*conor, conari, conatus* — to try
*loquor, loqui, locutus* — to speak
*patior, pati, passus* — to suffer, allow
*proficiscor, proficisci, profectus* — to set out
*morior, mori, mortuus* — to die
*nascor, nasci, natus* — to be born
*utor, uti, usus* — to use (**+ ablative**)

*Sequitur* looks like "he is followed" and means "he follows". Every form behaves this way:
- *sequor* — I follow · *sequebar* — I was following · *sequar* — I shall follow
- *secutus sum* — I followed
- *sequi* — to follow · *sequere!* — follow!

**The one exception inside the exception:** their **present and future participles are active in form** — *sequens* (following), *secuturus* (about to follow) — and the perfect participle *secutus* is active in meaning too, which the perfect participle of an ordinary verb never is.

**Semi-deponents** are active in the present and deponent in the perfect: *audeo, audere, ausus sum* (dare); *gaudeo, gaudere, gavisus sum* (rejoice).`),

  topic('participles', ['participle', 'participles', 'participium', 'present participle', 'perfect participle', 'future participle'],
    'Participia', 'Participles', `A participle is a **verbal adjective**: it comes from a verb, and it declines and agrees like *bonus* or *ingens*.

| | form | meaning | declines like |
| --- | --- | --- | --- |
| present active | *amans, amantis* | loving, while loving | third declension |
| perfect passive | *amatus, -a, -um* | having been loved | bonus |
| future active | *amaturus, -a, -um* | about to love | bonus |
| gerundive | *amandus, -a, -um* | needing to be loved | bonus |

**They agree with the noun they describe**, so their case tells you what they attach to:
- *puella cantans* — the girl **singing**
- *puellam cantantem audio* — I hear the girl singing (both accusative)
- *urbs capta* — the captured city · *urbem captam vidi* — I saw the captured city

**Latin has no present passive or perfect active participle.** There is no way to say "being loved" or "having loved" with a participle — which is why deponents, whose perfect participle *is* active, are so useful in narrative.

The perfect participle is where a great deal of Latin narrative lives: *his verbis dictis* (these words having been said) does the work of a whole English clause. See *the ablative absolute*.`),

  topic('ablative-absolute', ['ablative absolute', 'ablativus absolutus', 'absolute'],
    'Ablativus absolutus', 'The ablative absolute', `A noun and a participle, both in the **ablative**, standing loose from the rest of the sentence — "absolute" means "unattached". It sets the scene and then the main clause happens.

- *his verbis dictis, discessit.* — **These words having been said**, he departed.
- *urbe capta, milites redierunt.* — **The city having been captured**, the soldiers returned.
- *Caesare duce, vicimus.* — **Caesar being leader**, we won.

**The test:** the noun in the ablative is **not** the subject or object of the main verb. In *urbe capta, milites redierunt*, the city is neither returning nor being returned to — it just sets the situation. That looseness is the whole construction.

**Translating it.** The literal version ("the city having been captured") is stilted English, so English readers turn it into a clause and pick the connection from context:
- *when* the city had been captured
- *after* the city was captured
- *because* the city had been captured
- *although* the city had been captured

Latin does not say which; you choose from the sense.

**With no participle at all** it is often two nouns, or a noun and an adjective, with "being" understood — *Caesare duce* (with Caesar as leader), *me invito* (against my will), *Cicerone consule* (in Cicero's consulship). There is no present participle of *sum*, so this is the only way to say it.`),

  topic('indirect-statement', ['indirect statement', 'accusative and infinitive', 'oratio obliqua', 'he said that', 'reported speech'],
    'Oratio obliqua', 'Indirect statement', `English reports speech with "that". Latin has no such word here: it puts the **subject in the accusative** and the **verb in the infinitive**.

- Direct: *puella cantat* — the girl is singing.
- Indirect: *dico **puellam cantare*** — I say **that the girl is singing**.

Literally "I say the girl to sing", which is why it takes practice.

**Which infinitive** depends on when the reported action happened relative to the main verb:

| | infinitive | meaning |
| --- | --- | --- |
| same time | *cantare* | that she **is** singing |
| earlier | *cantavisse* | that she **sang / has sung** |
| later | *cantaturam esse* | that she **will** sing |

- *dixit puellam cantavisse* — he said that the girl **had** sung
- *dixit puellam cantaturam esse* — he said that the girl **would** sing

Note that the future infinitive is a participle plus *esse*, so it **agrees** with the accusative subject: *puellam cantatur**am*** esse.

**Verbs that take it:** *dico, nuntio, scribo, audio, video, sentio, puto, credo, spero, scio, nescio*.

The two things to check when you meet an accusative: is there another accusative that is the object, and is there an infinitive nearby? An accusative plus an infinitive after a verb of saying is almost always this.`),

  topic('subjunctive', ['subjunctive', 'coniunctivus', 'subjunctive mood', 'subjunctive uses'],
    'Modus coniunctivus', 'The subjunctive', `Not a tense but a **mood**. The indicative states; the subjunctive supposes, wishes, intends or fears. It lives almost entirely in subordinate clauses.

**Formation — present.** The vowel changes, and the endings are the ordinary personal ones.

| | present indicative | present subjunctive |
| --- | --- | --- |
| 1st | am**a**t | am**e**t |
| 2nd | mon**e**t | mone**a**t |
| 3rd | reg**i**t | reg**a**t |
| 3rd -io | cap**i**t | capi**a**t |
| 4th | aud**i**t | audi**a**t |

The mnemonic is **"she wears a diamond"** — the first conjugation takes *e*, and every other takes *a*.

**Imperfect subjunctive** is the easiest tense in Latin: the **present infinitive plus personal endings**. *amarem, amares, amaret* · *regerem* · *esse → essem*.

**Perfect** — perfect stem + *-erim*. **Pluperfect** — perfect stem + *-issem*.

**Where you meet it:**
- **purpose** — *venit ut videret*, he came **in order to** see
- **result** — *tam fessus erat ut dormiret*, he was so tired **that** he slept
- **indirect question** — *rogavit quid faceres*, he asked what you **were doing**
- **cum clauses** — *cum haec dixisset*, **when** he had said this
- **fear** — *timeo ne veniat*, I fear **that** he may come

Latin uses the subjunctive far more than Spanish or French, and a great deal of it corresponds to nothing in English at all.`),

  topic('purpose-result', ['purpose', 'result', 'ut', 'ne', 'purpose clause', 'result clause', 'so that', 'in order to'],
    'Ut finale et consecutivum', 'Purpose and result clauses', `Both are introduced by **ut** and both take the subjunctive, which is why they get confused. The negative separates them.

**Purpose — why it was done.** Negative **ne**.
- *venit **ut** amicum **videret**.* — He came **in order to** see his friend.
- *fugit **ne** caperetur.* — He fled **so that he would not** be caught.

**Result — what followed from it.** Negative **ut non**.
- *tam fessus erat **ut** dormiret.* — He was so tired **that** he slept.
- *tanta erat tempestas **ut non** navigaremus.* — The storm was so great **that we did not** sail.

**Two tests:**
1. **The negative.** *ne* means purpose; *ut non* means result. This is the reliable one.
2. **The signpost.** A result clause is nearly always announced in advance by *tam* (so), *ita* (so), *sic* (thus), *tantus* (so great), *talis* (such), *tot* (so many). If one of those is sitting in the main clause, expect result.

English blurs them — "he shouted so that everyone heard" could be either — but Latin never does.

**Sequence of tenses:** a main verb in a present or future tense takes the present subjunctive; a past main verb takes the imperfect. *venit ut videat* against *venit ut videret*.`),

  topic('relative', ['relative', 'relative pronoun', 'qui quae quod', 'who which that', 'relative clause'],
    'Pronomen relativum', 'Qui, quae, quod', `The relative pronoun — who, which, that. It declines fully:

| | m. sg. | f. sg. | n. sg. | m. pl. | f. pl. | n. pl. |
| --- | --- | --- | --- | --- | --- | --- |
| nom. | qui | quae | quod | qui | quae | quae |
| acc. | quem | quam | quod | quos | quas | quae |
| gen. | cuius | cuius | cuius | quorum | quarum | quorum |
| dat. | cui | cui | cui | quibus | quibus | quibus |
| abl. | quo | qua | quo | quibus | quibus | quibus |

**The rule that makes it work, and it is worth memorising as one sentence:**

> The relative takes its **gender and number from the noun it refers back to**, and its **case from its own clause**.

- *puella **quae** cantat* — *quae* is feminine singular (it refers to *puella*) and **nominative** because it is the subject of *cantat*.
- *puella **quam** video* — feminine singular still, but **accusative** because it is the object of *video*.
- *rex **cuius** filium vidi* — masculine singular, **genitive** because it means "whose".

So the two halves of the pronoun answer to two different things at once, and reading it means asking both questions.

Unlike English, the relative can **never be left out**: "the book I read" must be *liber **quem** legi*.`),

  topic('pronouns', ['pronouns', 'is ea id', 'hic haec hoc', 'ille illa illud', 'demonstrative', 'personal pronouns', 'this that'],
    'Pronomina', 'Pronouns', `**Personal.** Only used for emphasis in the nominative, since the verb ending already says who.

| | I | you | we | you (pl.) |
| --- | --- | --- | --- | --- |
| nom. | ego | tu | nos | vos |
| acc. | me | te | nos | vos |
| gen. | mei | tui | nostrum | vestrum |
| dat. | mihi | tibi | nobis | vobis |
| abl. | me | te | nobis | vobis |

There is no third person personal pronoun; **is, ea, id** does the job.

**is, ea, id** — he, she, it; that. The workhorse.
- *is* (he) · *eum* (him) · *eius* (his/her) · *ei* (to him) · *eo* (by him)
- *ei / eae / ea* (they) · *eos / eas / ea* (them) · *eorum / earum* (their) · *eis* (to/by them)

*eius* means "his" or "her" referring to **someone else**; *suus* means "his own", referring to the subject. *patrem suum amat* (he loves his own father) against *patrem eius amat* (he loves the other man's father).

**hic, haec, hoc** — this, near me. **ille, illa, illud** — that, over there.
- *hic vir* — this man · *ille vir* — that man
- Both have the irregular genitive *huius / illius* and dative *huic / illi* in every gender.

**ipse** — himself, the very one. **idem** — the same. **se** — himself/herself/themselves, always referring back to the subject.`),

  topic('imperatives', ['imperative', 'command', 'commands', 'noli', 'imperativus', 'negative command'],
    'Modus imperativus', 'Commands', `**Singular** — the present stem on its own. **Plural** — add **-te**.

| | sg. | pl. |
| --- | --- | --- |
| 1st | ama! | amate! |
| 2nd | mone! | monete! |
| 3rd | rege! | regite! |
| 3rd -io | cape! | capite! |
| 4th | audi! | audite! |

Note the third conjugation singular ends **-e** and the plural inserts **-i-**: *rege, regite*.

**Four shorten in the singular** and simply have to be known: **dic** (say), **duc** (lead), **fac** (do), **fer** (bring). Not *dice, duce, face, fere*.

**Negative commands do not use the imperative at all.** Latin says "be unwilling to":
- ***noli** + infinitive* — *noli currere!*, don't run!
- ***nolite** + infinitive* for more than one — *nolite currere!*

*Ne curre* exists in poetry, but *noli currere* is what prose says and what you should write.

Deponents form their imperative passively: *sequere!* (follow!), *sequimini!* (follow, plural), *conare!* (try!).`),

  topic('gerund-gerundive', ['gerund', 'gerundive', 'gerundium', 'gerundivum', 'ad + gerundive', 'must be done'],
    'Gerundium et gerundivum', 'Gerund and gerundive', `Two forms that look alike and do opposite things.

**The gerund** is a **verbal noun** — "-ing" used as a thing. Neuter singular, and it has no nominative (the infinitive covers that).
- *ars scribendi* — the art **of writing**
- *paratus ad pugnandum* — ready **for fighting**
- *discimus legendo* — we learn **by reading**

**The gerundive** is a **verbal adjective** — *amandus, -a, -um*, "needing to be loved". It agrees like *bonus*.
- *liber legendus* — a book **to be read**

**With *sum* it expresses obligation**, and this is where you will meet it most:
- *liber legendus est* — the book **must be read**
- *nobis pugnandum est* — **we must fight** (literally "it must be fought by us"; the person obliged goes in the **dative**)
- *Carthago delenda est* — Carthage **must be destroyed**

**Purpose with *ad*** — *ad urbem capiendam*, "for the purpose of capturing the city". Latin prefers this to a gerund with an object: not *ad capiendum urbem*.

The way to tell them apart in a sentence: a gerundive **agrees with a noun**, a gerund stands alone as a neuter.`),

  topic('numbers-time', ['numbers', 'numerals', 'time', 'dates', 'how long', 'when', 'counting'],
    'Numeri et tempus', 'Numbers and time', `**Cardinals.** Only the first three decline, plus the hundreds and *mille* in the plural.

*unus, duo, tres, quattuor, quinque, sex, septem, octo, novem, decem*
*undecim, duodecim, viginti, triginta, centum, mille*

*unus* declines like *bonus* but with genitive *unius* and dative *uni*. *duo, duae, duo* and *tres, tria* have forms of their own and must be learned.

**Ordinals** all decline like *bonus*: *primus, secundus, tertius, quartus, quintus…*

**Time.** The case does the work that English does with prepositions:
- **when** — **ablative**: *tertia hora*, at the third hour; *aestate*, in summer
- **how long** — **accusative**: *tres horas*, for three hours; *multos annos*, for many years
- **within which** — **ablative**: *tribus diebus*, within three days

No preposition is used in any of the three, which is why they are so easy to miss. The one to hold on to is the contrast: *tres horas* (for three hours, throughout) against *tribus horis* (within three hours).`),

  topic('word-order', ['word order', 'order', 'syntax', 'sentence structure', 'how to read latin'],
    'Ordo verborum', 'Word order', `Latin word order is **free but not random**. The endings carry the grammar, so order carries emphasis instead.

**The default, when nothing is being emphasised:**
- The **verb goes last**. *Puella agricolam amat.*
- The subject comes first.
- Adjectives usually follow their noun — *vir bonus* — though possessives and numbers precede.
- The genitive sits next to what it belongs to.
- *est* often comes early or is left out entirely.

**Moving a word to the front emphasises it.** *Agricolam puella amat* still means the girl loves the farmer, but now it is **the farmer** she loves.

**How to read a sentence**, which is a different skill from translating it:
1. Find the **verb** — usually at the end. It gives you the person and number of the subject.
2. Find the **nominative** — that is your subject, and it must agree with the verb.
3. Find the **accusative** — that is your object.
4. Attach everything else: genitives to their nouns, adjectives to what they agree with, ablatives to the verb.

Resist reading left to right and hoping. Latin sentences are built to be held whole and then unpacked, and the ending of a word is always worth more than its position.`),
];

/**
 * The tutor's interjections.
 *
 * Latin has no schoolroom catchphrases the way the Spanish side does, so these
 * are things a Roman actually said, fired on the same three moments.
 */
export const EXCLAMATIONS = {
  good: ['Euge!', 'Optime!', 'Macte!'],
  bad: ['Eheu!', 'Pro di immortales!'],
  wow: ['Mehercle!', 'Di immortales!'],
};

/** Conversational openers the tutor answers without looking anything up. */
export const SMALL_TALK = [
  {
    match: /^(salve|salvete|ave|hello|hi|hey|good morning|good afternoon)\b/,
    reply: {
      la: 'Salve! I can conjugate verbs, decline nouns, look words up, translate, and explain grammar. Where would you like to start?',
      en: 'Salve! I can conjugate verbs, decline nouns, look words up, translate, and explain grammar. Where would you like to start?',
    },
  },
  {
    // No "perfect" here: on a Latin site it is a tense, and as a small-talk
    // trigger it swallowed "perfect participle" and "perfect tense" too.
    match: /^(gratias|gratias tibi|thanks|thank you|ok|great)\b/,
    reply: {
      la: 'Libenter! Ask me anything else you need.',
      en: 'Libenter! Ask me anything else you need.',
    },
  },
  {
    match: /^(vale|valete|bye|goodbye|see you)\b/,
    reply: {
      la: 'Vale! Good luck with your Latin.',
      en: 'Vale! Good luck with your Latin.',
    },
  },
];
