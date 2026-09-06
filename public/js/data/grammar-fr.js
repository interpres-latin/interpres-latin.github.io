/**
 * Curated grammar explanations for the tutor, French side.
 *
 * The same contract as data/grammar.js: each topic carries the words that
 * should summon it and a short explanation in both languages, so the tutor can
 * answer in whichever one it was asked. Bodies are markdown.
 *
 * Hand-written rather than generated, for the same reason as the Spanish set —
 * everything the tutor says about French should be something a teacher would
 * actually sign off on.
 */

export const TOPICS = [
  {
    id: 'etre-avoir',
    keywords: ['être', 'avoir', 'être ou avoir', 'être vs avoir', 'difference entre être et avoir', 'to be', 'to have'],
    title: { fr: 'Être et avoir', en: 'Être vs. avoir' },
    body: {
      en: `The two most common verbs in French, and the two auxiliaries.

**Être** = *to be*. **Avoir** = *to have*. The trap is that French uses *avoir* where English uses *to be*:

- *J'ai faim.* — I **am** hungry. (literally: I have hunger)
- *J'ai soif / froid / chaud / peur / raison / tort / sommeil.*
- *J'ai vingt ans.* — I **am** twenty.

So a state you would call "being X" in English is often "having X" in French. Learn these as fixed expressions rather than translating word by word.

The other place they split is the **passé composé**, where one of them is the auxiliary:
- *J'**ai** mangé.* — most verbs take avoir.
- *Je **suis** allé.* — a short list of verbs of coming and going, plus every pronominal verb, take être.

See *le passé composé* for which is which.`,
      fr: `Les deux verbes les plus courants du français, et les deux auxiliaires.

**Être** et **avoir** ne se répartissent pas comme *to be* et *to have* en anglais. Là où l'anglais dit *to be*, le français dit souvent *avoir* :

- *J'ai faim.* — anglais : *I **am** hungry.*
- *J'ai soif / froid / chaud / peur / raison / tort / sommeil.*
- *J'ai vingt ans.* — anglais : *I **am** twenty.*

Ce sont des expressions figées : on les apprend telles quelles, sans les traduire mot à mot.

L'autre partage important est celui du **passé composé**, où l'un des deux sert d'auxiliaire :
- *J'**ai** mangé.* — la plupart des verbes prennent avoir.
- *Je **suis** allé.* — une courte liste de verbes de mouvement, et tous les verbes pronominaux, prennent être.

Voir *le passé composé*.`,
    },
  },

  {
    id: 'passe-compose',
    keywords: ['passé composé', 'passe compose', 'auxiliaire', 'avoir ou être', 'être ou avoir au passé',
      'accord du participe passé', 'perfect tense', 'past tense', 'dr mrs vandertramp'],
    title: { fr: 'Le passé composé', en: 'The passé composé' },
    body: {
      en: `The everyday past tense: **auxiliary in the present + past participle**.

*J'ai parlé. Tu as fini. Elle est partie.*

**Which auxiliary?** Almost every verb takes *avoir*. Two groups take *être*:

1. A short list of verbs of coming, going and changing state — aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, retourner, passer, and their compounds (revenir, devenir, rentrer…).
2. Every **pronominal** verb: *je me suis levé, elle s'est lavée.*

**Agreement.** With *être*, the participle agrees with the **subject**:
- *Il est allé* · *Elle est allée* · *Ils sont allés* · *Elles sont allées*

With *avoir*, there is no agreement with the subject — but the participle agrees with a **direct object that comes before the verb**:
- *J'ai vu **les filles**.* — no agreement, the object follows.
- *Les filles que j'ai **vues**.* — agreement, the object comes first.

**A catch worth knowing:** several of the *être* verbs take *avoir* when they have a direct object, and the meaning shifts with it.
- *Je suis sorti.* — I went out. · *J'ai sorti la poubelle.* — I took the bin out.
- *Elle est montée.* — She went up. · *Elle a monté les valises.* — She took the cases up.`,
      fr: `Le temps du passé de tous les jours : **auxiliaire au présent + participe passé**.

*J'ai parlé. Tu as fini. Elle est partie.*

**Quel auxiliaire ?** Presque tous les verbes prennent *avoir*. Deux groupes prennent *être* :

1. Une courte liste de verbes de déplacement et de changement d'état — aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, retourner, passer, et leurs composés (revenir, devenir, rentrer…).
2. Tous les verbes **pronominaux** : *je me suis levé, elle s'est lavée.*

**L'accord.** Avec *être*, le participe s'accorde avec le **sujet** :
- *Il est allé* · *Elle est allée* · *Ils sont allés* · *Elles sont allées*

Avec *avoir*, pas d'accord avec le sujet — mais le participe s'accorde avec le **complément d'objet direct placé avant** le verbe :
- *J'ai vu **les filles**.* — pas d'accord, l'objet suit.
- *Les filles que j'ai **vues**.* — accord, l'objet précède.

**Un piège utile :** plusieurs verbes de la liste prennent *avoir* dès qu'ils ont un complément d'objet direct, et le sens change avec l'auxiliaire.
- *Je suis sorti.* · *J'ai sorti la poubelle.*
- *Elle est montée.* · *Elle a monté les valises.*`,
    },
  },

  {
    id: 'passe-compose-imparfait',
    keywords: ['imparfait', 'passé composé et imparfait', 'imparfait ou passé composé', 'difference entre imparfait et passé composé',
      'imperfect', 'imperfect vs perfect', 'which past tense'],
    title: { fr: 'Passé composé et imparfait', en: 'Passé composé vs. imparfait' },
    body: {
      en: `Both are past. The split is **what happened** vs. **what was going on**.

**Passé composé** — a completed event, something that moves the story forward. It answers *and then what?*
- *Il a ouvert la porte.* — He opened the door.
- *J'ai vécu à Paris pendant trois ans.* — a closed stretch of time.

**Imparfait** — the background: descriptions, habits, states, and actions in progress. It answers *what was it like?*
- *Il faisait froid et la rue était vide.* — description.
- *Tous les étés, nous allions à la mer.* — habit.
- *Je dormais.* — in progress.

The classic pairing is one interrupting the other:
- *Je **dormais** quand le téléphone **a sonné**.* — I was sleeping (background) when the phone rang (event).

Some verbs shift meaning between the two:
- *Je savais* = I knew · *J'ai su* = I found out
- *Je voulais* = I wanted · *J'ai voulu* = I tried / decided to
- *Je connaissais* = I knew (someone) · *J'ai connu* = I met

The tense is a choice about how you are telling it, not a fact about the clock. The same afternoon can be *il pleuvait* or *il a plu*, depending on whether it is the scenery or the news.`,
      fr: `Les deux sont du passé. La distinction porte sur **ce qui est arrivé** face à **ce qui se passait**.

**Passé composé** — un événement achevé, qui fait avancer le récit. Il répond à *et ensuite ?*
- *Il a ouvert la porte.*
- *J'ai vécu à Paris pendant trois ans.* — une durée fermée.

**Imparfait** — l'arrière-plan : descriptions, habitudes, états, actions en cours. Il répond à *c'était comment ?*
- *Il faisait froid et la rue était vide.* — description.
- *Tous les étés, nous allions à la mer.* — habitude.
- *Je dormais.* — action en cours.

Le couple classique, l'un interrompant l'autre :
- *Je **dormais** quand le téléphone **a sonné**.*

Certains verbes changent de sens selon le temps :
- *Je savais* / *J'ai su* (= j'ai appris)
- *Je voulais* / *J'ai voulu* (= j'ai décidé, j'ai essayé)
- *Je connaissais* / *J'ai connu* (= j'ai rencontré)

Le temps traduit une façon de raconter, pas une donnée d'horloge : le même après-midi peut être *il pleuvait* ou *il a plu* selon qu'on décrit le décor ou qu'on annonce un fait.`,
    },
  },

  {
    id: 'subjonctif',
    keywords: ['subjonctif', 'le subjonctif', 'mode subjonctif', 'subjunctive', 'quand utiliser le subjonctif',
      'bien que', 'il faut que', 'pour que'],
    title: { fr: 'Le subjonctif', en: 'The subjunctive' },
    body: {
      en: `Not a tense but a **mood**. The indicative states what is; the subjunctive covers what is wanted, doubted, feared or judged. It lives almost entirely in a subordinate clause after **que**.

**How to form it.** Take the *ils* form of the present, drop *-ent*, add **-e, -es, -e, -ions, -iez, -ent**. The *nous* and *vous* forms fall back on the imperfect stem.
- *ils parlent* → que je **parle**, que nous **parlions**
- *ils finissent* → que je **finisse**
- *ils boivent* → que je **boive**, que nous **buvions**

Irregular: *être* (sois), *avoir* (aie), *aller* (aille), *faire* (fasse), *pouvoir* (puisse), *savoir* (sache), *vouloir* (veuille), *falloir* (faille).

**When.** After expressions of:
- **necessity** — *il faut que tu viennes*
- **wish or will** — *je veux qu'il parte*, *j'aimerais que tu restes*
- **emotion** — *je suis content que tu sois là*, *j'ai peur qu'il pleuve*
- **doubt or denial** — *je ne pense pas qu'il ait raison*, *je doute qu'elle vienne*
- certain **conjunctions** — *bien que, pour que, avant que, jusqu'à ce que, à condition que, sans que*

**Not** after *espérer* (*j'espère qu'il viendra*), nor after *penser* and *croire* in the affirmative (*je pense qu'il a raison*) — but yes in the negative or interrogative, where the doubt appears.

The subjunctive imperfect is a literary form. You will meet it reading; nobody says *que je parlasse* out loud.`,
      fr: `Ce n'est pas un temps mais un **mode**. L'indicatif dit ce qui est ; le subjonctif couvre ce qu'on veut, ce qu'on doute, ce qu'on craint ou ce qu'on juge. Il vit presque toujours dans une subordonnée après **que**.

**Formation.** On prend la forme *ils* du présent, on retire *-ent*, on ajoute **-e, -es, -e, -ions, -iez, -ent**. Les formes *nous* et *vous* reprennent le radical de l'imparfait.
- *ils parlent* → que je **parle**, que nous **parlions**
- *ils finissent* → que je **finisse**
- *ils boivent* → que je **boive**, que nous **buvions**

Irréguliers : *être* (sois), *avoir* (aie), *aller* (aille), *faire* (fasse), *pouvoir* (puisse), *savoir* (sache), *vouloir* (veuille), *falloir* (faille).

**Quand ?** Après l'expression :
- de la **nécessité** — *il faut que tu viennes*
- de la **volonté** — *je veux qu'il parte*, *j'aimerais que tu restes*
- du **sentiment** — *je suis content que tu sois là*, *j'ai peur qu'il pleuve*
- du **doute** ou de la négation — *je ne pense pas qu'il ait raison*, *je doute qu'elle vienne*
- après certaines **conjonctions** — *bien que, pour que, avant que, jusqu'à ce que, à condition que, sans que*

**Pas** après *espérer* (*j'espère qu'il viendra*), ni après *penser* et *croire* à l'affirmative (*je pense qu'il a raison*) — mais oui à la forme négative ou interrogative, où le doute réapparaît.

Le subjonctif imparfait est une forme littéraire : on la rencontre en lisant, on ne dit pas *que je parlasse* à voix haute.`,
    },
  },

  {
    id: 'articles-genre',
    keywords: ['le la les', 'un une des', 'articles', 'genre', 'masculin ou féminin', 'gender', 'definite article',
      'indefinite article', 'masculine feminine'],
    title: { fr: 'Le genre et les articles', en: 'Gender and articles' },
    body: {
      en: `Every French noun is masculine or feminine, and the article shows which.

| | masculine | feminine | plural |
| --- | --- | --- | --- |
| definite | **le** livre | **la** table | **les** livres |
| indefinite | **un** livre | **une** table | **des** livres |

Before a vowel or a mute h, *le* and *la* both become **l'**: *l'ami, l'école, l'hôtel*.

**Guessing the gender.** The ending is the best clue, though none of these is watertight:
- usually **masculine**: -age (*le fromage*), -ment (*le moment*), -eau (*le bureau*), -isme, -oir
- usually **feminine**: -tion (*la nation*), -sion, -té (*la liberté*), -ette, -ance, -ence, -ure

Learn the article with the noun, as one word — *une table*, not *table*. Recovering the gender later is much harder than storing it now.

Two contractions are compulsory:
- *à + le* → **au** (*je vais au cinéma*), *à + les* → **aux**
- *de + le* → **du** (*la porte du jardin*), *de + les* → **des**

*à la* and *à l'* do not contract: *je vais à la plage.*`,
      fr: `Tout nom français est masculin ou féminin, et l'article le montre.

| | masculin | féminin | pluriel |
| --- | --- | --- | --- |
| défini | **le** livre | **la** table | **les** livres |
| indéfini | **un** livre | **une** table | **des** livres |

Devant une voyelle ou un h muet, *le* et *la* deviennent **l'** : *l'ami, l'école, l'hôtel*.

**Deviner le genre.** La terminaison est le meilleur indice, sans être une règle absolue :
- souvent **masculin** : -age (*le fromage*), -ment (*le moment*), -eau (*le bureau*), -isme, -oir
- souvent **féminin** : -tion (*la nation*), -sion, -té (*la liberté*), -ette, -ance, -ence, -ure

Apprenez l'article avec le nom, comme un seul mot — *une table*, et non *table*. Retrouver le genre après coup coûte bien plus cher que de le retenir tout de suite.

Deux contractions sont obligatoires :
- *à + le* → **au** (*je vais au cinéma*), *à + les* → **aux**
- *de + le* → **du** (*la porte du jardin*), *de + les* → **des**

*à la* et *à l'* ne se contractent pas : *je vais à la plage.*`,
    },
  },

  {
    id: 'partitif',
    keywords: ['partitif', 'du de la des', 'article partitif', 'de after negation', 'partitive'],
    title: { fr: "L'article partitif", en: 'The partitive article' },
    body: {
      en: `French marks an unmeasured quantity where English says nothing at all. *I eat bread* is *je mange **du** pain* — the *du* is not optional.

| | | |
| --- | --- | --- |
| masculine | **du** | *du pain, du courage* |
| feminine | **de la** | *de la soupe, de la patience* |
| before a vowel | **de l'** | *de l'eau, de l'argent* |
| plural | **des** | *des frites* |

**It becomes *de* after a negative:**
- *Je mange du pain.* → *Je ne mange **pas de** pain.*
- *J'ai des amis.* → *Je n'ai **pas d'**amis.*

The exception is *être*, which keeps the article: *ce n'est pas du vin.*

**And after an expression of quantity:**
- *beaucoup **de** pain, un peu **de** sel, un kilo **de** pommes, trop **de** travail*

The clash to watch is with the definite article. *J'aime le café* is coffee in general — what you like. *Je bois du café* is some coffee — what is in the cup. Verbs of liking (*aimer, adorer, détester, préférer*) take *le / la / les*; verbs of consuming take the partitive.`,
      fr: `Le français marque une quantité indéterminée là où l'anglais ne met rien. *I eat bread* se dit *je mange **du** pain* : le *du* n'est pas facultatif.

| | | |
| --- | --- | --- |
| masculin | **du** | *du pain, du courage* |
| féminin | **de la** | *de la soupe, de la patience* |
| devant une voyelle | **de l'** | *de l'eau, de l'argent* |
| pluriel | **des** | *des frites* |

**Il devient *de* après une négation :**
- *Je mange du pain.* → *Je ne mange **pas de** pain.*
- *J'ai des amis.* → *Je n'ai **pas d'**amis.*

L'exception est *être*, qui garde l'article : *ce n'est pas du vin.*

**Et après une expression de quantité :**
- *beaucoup **de** pain, un peu **de** sel, un kilo **de** pommes, trop **de** travail*

Le vrai piège est la concurrence avec l'article défini. *J'aime le café*, c'est le café en général — ce qu'on aime. *Je bois du café*, c'est une certaine quantité — ce qu'il y a dans la tasse. Les verbes de goût (*aimer, adorer, détester, préférer*) prennent *le / la / les* ; les verbes de consommation prennent le partitif.`,
    },
  },

  {
    id: 'pronoms-objets',
    keywords: ['pronoms', 'pronom objet', 'cod', 'coi', 'le la les lui leur', 'me te nous vous',
      'object pronouns', 'direct object', 'indirect object', 'ordre des pronoms'],
    title: { fr: "Les pronoms d'objet", en: 'Object pronouns' },
    body: {
      en: `They go **before the verb**, not after it — the opposite of English.

**Direct (COD)** — replaces a noun with no preposition: **me, te, le / la, nous, vous, les**
- *Je vois **Marie**.* → *Je **la** vois.*

**Indirect (COI)** — replaces *à* + a person: **me, te, lui, nous, vous, leur**
- *Je parle **à Marie**.* → *Je **lui** parle.*

The two only differ in the third person, and *lui* covers both genders: *je lui parle* is to him or to her.

**Where they sit.**
- present: *je **te** vois*
- negative: *je ne **te** vois pas*
- passé composé: before the auxiliary — *je **t'**ai vu*
- with an infinitive: before the infinitive — *je vais **te** voir*
- affirmative imperative only: after, with a hyphen, and *me* becomes *moi* — *donne-**moi** le livre*, but *ne **me** donne pas le livre*

**Two at once** follow a fixed order:

> me / te / se / nous / vous → le / la / les → lui / leur → y → en

*Il **me le** donne.* · *Je **les lui** ai envoyés.* · *Il y **en** a trois.*

Remember that a pronoun before the verb turns the object into a preceding one, so the participle agrees: *je les ai **vues***.`,
      fr: `Ils se placent **avant le verbe**, et non après — l'inverse de l'anglais.

**Objet direct (COD)** — remplace un nom sans préposition : **me, te, le / la, nous, vous, les**
- *Je vois **Marie**.* → *Je **la** vois.*

**Objet indirect (COI)** — remplace *à* + une personne : **me, te, lui, nous, vous, leur**
- *Je parle **à Marie**.* → *Je **lui** parle.*

Les deux séries ne diffèrent qu'à la troisième personne, et *lui* vaut pour les deux genres : *je lui parle* s'adresse à lui comme à elle.

**Où les placer.**
- présent : *je **te** vois*
- négation : *je ne **te** vois pas*
- passé composé : avant l'auxiliaire — *je **t'**ai vu*
- avec un infinitif : avant l'infinitif — *je vais **te** voir*
- impératif affirmatif seulement : après, avec un trait d'union, et *me* devient *moi* — *donne-**moi** le livre*, mais *ne **me** donne pas le livre*

**Deux pronoms ensemble** suivent un ordre fixe :

> me / te / se / nous / vous → le / la / les → lui / leur → y → en

*Il **me le** donne.* · *Je **les lui** ai envoyés.* · *Il y **en** a trois.*

Attention : un pronom devant le verbe fait de l'objet un complément placé avant, donc le participe s'accorde — *je les ai **vues***.`,
    },
  },

  {
    id: 'y-en',
    keywords: ['y et en', 'y ou en', 'y and en', 'le pronom y', 'le pronom en', 'pronom y', 'pronom en', 'il y a'],
    title: { fr: 'Y et en', en: 'Y and en' },
    body: {
      en: `Two small pronouns that carry a great deal.

**Y** replaces **à + a thing** or a place.
- *Je vais **à Paris**.* → *J'**y** vais.*
- *Je pense **à mon travail**.* → *J'**y** pense.*
- Fixed: *il **y** a* — there is / there are.

It does not replace *à + a person*: that is *lui / leur*. *Je pense à Marie* → *je pense à elle*, never *j'y pense*.

**En** replaces **de + something**, and any quantity.
- *Je viens **de Lyon**.* → *J'**en** viens.*
- *J'ai **du pain**.* → *J'**en** ai.*
- *Je veux **trois pommes**.* → *J'**en** veux trois.* — the number stays.
- *Il parle **de son voyage**.* → *Il **en** parle.*

Both sit where an object pronoun sits, before the verb, and both come last in a run of pronouns: *il y en a trois*, *je lui en ai parlé*.

The habit to build is noticing the preposition the verb takes. *Penser **à*** takes *y*; *parler **de*** takes *en*. Nothing about the English translation tells you which.`,
      fr: `Deux petits pronoms qui portent beaucoup.

**Y** remplace **à + une chose**, ou un lieu.
- *Je vais **à Paris**.* → *J'**y** vais.*
- *Je pense **à mon travail**.* → *J'**y** pense.*
- Expression figée : *il **y** a*.

Il ne remplace pas *à + une personne* : c'est alors *lui / leur*, ou un pronom tonique. *Je pense à Marie* → *je pense à elle*, jamais *j'y pense*.

**En** remplace **de + quelque chose**, et toute quantité.
- *Je viens **de Lyon**.* → *J'**en** viens.*
- *J'ai **du pain**.* → *J'**en** ai.*
- *Je veux **trois pommes**.* → *J'**en** veux trois.* — le nombre reste.
- *Il parle **de son voyage**.* → *Il **en** parle.*

Les deux se placent comme les autres pronoms, avant le verbe, et arrivent en dernier dans une série : *il y en a trois*, *je lui en ai parlé*.

L'habitude à prendre est de repérer la préposition qu'appelle le verbe. *Penser **à*** donne *y* ; *parler **de*** donne *en*. La traduction anglaise n'en dit rien.`,
    },
  },

  {
    id: 'negation',
    keywords: ['négation', 'ne pas', 'ne jamais', 'ne plus', 'ne rien', 'ne personne', 'negation', 'negative'],
    title: { fr: 'La négation', en: 'Negation' },
    body: {
      en: `French negates with **two words around the verb**: *ne … pas*.

- *Je **ne** parle **pas**.*
- Before a vowel, *ne* becomes *n'*: *je **n'**aime **pas** ça.*

**The other second halves:**
| | |
| --- | --- |
| ne … **jamais** | never |
| ne … **plus** | not any more |
| ne … **rien** | nothing |
| ne … **personne** | nobody |
| ne … **que** | only (a restriction, not really a negative) |
| ne … **pas encore** | not yet |

**Where the two halves go.**
- Simple tense: around the verb — *je ne mange pas.*
- Passé composé: around the **auxiliary** — *je n'ai **pas** mangé.*
- With an infinitive: both parts together before it — *je préfère **ne pas** y aller.*

*Personne* and *que* are the exceptions: they follow the participle. *Je n'ai vu **personne**.* · *Je n'ai mangé **que** du pain.*

**After a negative, the article collapses to *de*:** *je n'ai **pas de** voiture* — see *l'article partitif*.

In speech the *ne* is very often dropped — *je sais pas*, *j'ai rien vu*. Recognise it, but keep writing it: leaving it out in an essay reads as a mistake, not as informality.`,
      fr: `Le français nie avec **deux mots autour du verbe** : *ne … pas*.

- *Je **ne** parle **pas**.*
- Devant une voyelle, *ne* devient *n'* : *je **n'**aime **pas** ça.*

**Les autres seconds éléments :**
| | |
| --- | --- |
| ne … **jamais** | jamais |
| ne … **plus** | plus du tout |
| ne … **rien** | rien |
| ne … **personne** | personne |
| ne … **que** | seulement — une restriction, pas vraiment une négation |
| ne … **pas encore** | pas encore |

**Où placer les deux éléments.**
- Temps simple : autour du verbe — *je ne mange pas.*
- Passé composé : autour de l'**auxiliaire** — *je n'ai **pas** mangé.*
- Avec un infinitif : les deux ensemble devant lui — *je préfère **ne pas** y aller.*

*Personne* et *que* font exception : ils suivent le participe. *Je n'ai vu **personne**.* · *Je n'ai mangé **que** du pain.*

**Après une négation, l'article se réduit à *de*** : *je n'ai **pas de** voiture* — voir *l'article partitif*.

À l'oral, le *ne* tombe très souvent — *je sais pas*, *j'ai rien vu*. Il faut savoir le reconnaître, mais continuer à l'écrire : son absence dans une copie passe pour une faute, pas pour un registre.`,
    },
  },

  {
    id: 'adjectifs',
    keywords: ['adjectifs', 'accord des adjectifs', 'place des adjectifs', 'adjective', 'adjectives',
      'adjective agreement', 'adjective placement', 'bags'],
    title: { fr: 'Les adjectifs', en: 'Adjectives' },
    body: {
      en: `**They agree** with the noun in gender and number. The default is add *-e* for feminine, *-s* for plural:
*un petit chat · une petite chatte · des petits chats · des petites chattes*

Some endings change shape:
- -eux → -euse (*heureux / heureuse*)
- -f → -ve (*actif / active*)
- -er → -ère (*cher / chère*)
- -en → -enne, -on → -onne (*ancien / ancienne*)
- already ending in -e: no change (*rouge, jaune, calme*)

**They usually follow the noun** — the opposite of English. *une voiture **rouge***, *un livre **intéressant***.

A short list goes **before**, and it is worth memorising because it is closed. The mnemonic is **BAGS**: Beauty, Age, Goodness, Size.
*beau, joli · jeune, vieux, nouveau · bon, mauvais · grand, petit, gros, long*
→ *un **beau** jardin, une **vieille** maison, un **bon** repas.*

**Five change form before a vowel:** beau → **bel**, nouveau → **nouvel**, vieux → **vieil**, fou → **fol**, mou → **mol**.
*un **bel** homme, un **nouvel** ami, un **vieil** arbre.*

**A few change meaning with position:**
- *un **ancien** professeur* = a former teacher · *un professeur **ancien*** = an aged one
- *ma **propre** chambre* = my own room · *ma chambre **propre*** = my clean room
- *un **grand** homme* = a great man · *un homme **grand*** = a tall man`,
      fr: `**Ils s'accordent** avec le nom en genre et en nombre. Par défaut, *-e* au féminin et *-s* au pluriel :
*un petit chat · une petite chatte · des petits chats · des petites chattes*

Certaines terminaisons changent de forme :
- -eux → -euse (*heureux / heureuse*)
- -f → -ve (*actif / active*)
- -er → -ère (*cher / chère*)
- -en → -enne, -on → -onne (*ancien / ancienne*)
- déjà terminé par -e : pas de changement (*rouge, jaune, calme*)

**Ils suivent généralement le nom**, contrairement à l'anglais : *une voiture **rouge***, *un livre **intéressant***.

Une courte liste se place **avant**, et il vaut la peine de l'apprendre parce qu'elle est fermée : *beau, joli · jeune, vieux, nouveau · bon, mauvais · grand, petit, gros, long*
→ *un **beau** jardin, une **vieille** maison, un **bon** repas.*

**Cinq changent de forme devant une voyelle :** beau → **bel**, nouveau → **nouvel**, vieux → **vieil**, fou → **fol**, mou → **mol**.
*un **bel** homme, un **nouvel** ami, un **vieil** arbre.*

**Quelques-uns changent de sens selon la place :**
- *un **ancien** professeur* (qui ne l'est plus) · *un professeur **ancien*** (âgé)
- *ma **propre** chambre* (la mienne) · *ma chambre **propre*** (nettoyée)
- *un **grand** homme* (illustre) · *un homme **grand*** (de haute taille)`,
    },
  },

  {
    id: 'futur',
    keywords: ['futur', 'futur simple', 'futur proche', 'aller + infinitif', 'future', 'future tense', 'going to'],
    title: { fr: 'Le futur', en: 'The future' },
    body: {
      en: `Two ways to talk about what is coming.

**Futur proche** — *aller* in the present + the infinitive. The everyday one, and the one you will hear most.
- *Je **vais partir**.* — I'm going to leave.
- *Il **va pleuvoir**.*

**Futur simple** — one word: the infinitive plus **-ai, -as, -a, -ons, -ez, -ont**. For *-re* verbs, drop the final *e*.
- *je parler**ai**, tu finir**as**, il vendr**a***

The stem is the infinitive itself, which makes the irregulars easy to spot — they are irregular precisely because the stem is not:
*être → **ser**ai · avoir → **aur**ai · aller → **ir**ai · faire → **fer**ai · venir → **viendr**ai · voir → **verr**ai · pouvoir → **pourr**ai · vouloir → **voudr**ai · devoir → **devr**ai · savoir → **saur**ai · falloir → il **faudr**a*

That same stem builds the **conditional**, with imperfect endings: *je ferais, tu serais, il viendrait.*

**Which to use.** The near future is more spoken, more immediate, and more certain-sounding; the simple future is more written, more distant, more neutral. Both are correct for tomorrow.

One rule with no English counterpart: after **quand**, **lorsque**, **dès que** and **aussitôt que**, French uses the future where English uses the present.
- *Je t'appellerai **quand j'arriverai**.* — I'll call you when I **arrive**.`,
      fr: `Deux façons de parler de ce qui vient.

**Futur proche** — *aller* au présent + l'infinitif. C'est le plus courant à l'oral.
- *Je **vais partir**.*
- *Il **va pleuvoir**.*

**Futur simple** — un seul mot : l'infinitif suivi de **-ai, -as, -a, -ons, -ez, -ont**. Pour les verbes en *-re*, on retire le *e* final.
- *je parler**ai**, tu finir**as**, il vendr**a***

Le radical est l'infinitif lui-même, ce qui rend les irréguliers faciles à repérer — ils le sont justement parce que le radical ne l'est pas :
*être → **ser**ai · avoir → **aur**ai · aller → **ir**ai · faire → **fer**ai · venir → **viendr**ai · voir → **verr**ai · pouvoir → **pourr**ai · vouloir → **voudr**ai · devoir → **devr**ai · savoir → **saur**ai · falloir → il **faudr**a*

Ce même radical sert au **conditionnel**, avec les terminaisons de l'imparfait : *je ferais, tu serais, il viendrait.*

**Lequel choisir ?** Le futur proche est plus oral, plus immédiat, plus assuré ; le futur simple est plus écrit, plus lointain, plus neutre. Les deux conviennent pour demain.

Une règle sans équivalent anglais : après **quand**, **lorsque**, **dès que** et **aussitôt que**, le français emploie le futur là où l'anglais met le présent.
- *Je t'appellerai **quand j'arriverai**.*`,
    },
  },

  {
    id: 'conditionnel-si',
    keywords: ['conditionnel', 'phrases avec si', 'phrase avec si', 'hypothèse', 'conditional',
      'if clauses', 'si imparfait', 'irréel'],
    title: { fr: 'Le conditionnel et les phrases en « si »', en: 'The conditional and si clauses' },
    body: {
      en: `**Form:** the future stem plus the imperfect endings — *-ais, -ais, -ait, -ions, -iez, -aient*.
*je parlerais, tu serais, il ferait, nous irions, vous auriez, ils viendraient*

If you know the future, you know the conditional; only the endings differ.

**What it does:**
- politeness — *je **voudrais** un café* (much softer than *je veux*)
- a hypothesis — *à ta place, je **partirais***
- reported future — *il a dit qu'il **viendrait***
- unverified news — *le train **aurait** du retard* — the train is apparently late

**Si clauses** run on three fixed pairings. The tense in the *si* half is never a future and never a conditional:

| si + … | main clause | |
| --- | --- | --- |
| present | future | *Si j'**ai** le temps, je **viendrai**.* — a real possibility |
| imperfect | conditional | *Si j'**avais** le temps, je **viendrais**.* — unreal now |
| pluperfect | past conditional | *Si j'**avais eu** le temps, je **serais venu**.* — too late |

The most common mistake is *si je serais* or *si j'aurais*. Never: after *si*, the imperfect carries the hypothesis on its own.`,
      fr: `**Formation :** le radical du futur avec les terminaisons de l'imparfait — *-ais, -ais, -ait, -ions, -iez, -aient*.
*je parlerais, tu serais, il ferait, nous irions, vous auriez, ils viendraient*

Qui connaît le futur connaît le conditionnel : seules les terminaisons changent.

**À quoi il sert :**
- la politesse — *je **voudrais** un café* (bien plus doux que *je veux*)
- l'hypothèse — *à ta place, je **partirais***
- le futur dans le passé — *il a dit qu'il **viendrait***
- l'information non vérifiée — *le train **aurait** du retard*

**Les phrases en « si »** obéissent à trois couples fixes. Le temps de la subordonnée n'est jamais un futur ni un conditionnel :

| si + … | principale | |
| --- | --- | --- |
| présent | futur | *Si j'**ai** le temps, je **viendrai**.* — possible |
| imparfait | conditionnel | *Si j'**avais** le temps, je **viendrais**.* — irréel du présent |
| plus-que-parfait | conditionnel passé | *Si j'**avais eu** le temps, je **serais venu**.* — irréel du passé |

La faute la plus fréquente est *si je serais* ou *si j'aurais*. Jamais : après *si*, l'imparfait porte l'hypothèse à lui seul.`,
    },
  },

  {
    id: 'savoir-connaitre',
    keywords: ['savoir', 'connaître', 'savoir ou connaître', 'savoir vs connaitre', 'to know', 'difference entre savoir et connaître'],
    title: { fr: 'Savoir et connaître', en: 'Savoir vs. connaître' },
    body: {
      en: `English has one *to know*; French has two, and they are not interchangeable.

**Savoir** — a fact, a piece of information, or how to do something. It takes a clause or an infinitive.
- *Je **sais** que tu as raison.*
- *Je **sais** où il habite.*
- *Je **sais** nager.* — I know how to swim. (*savoir* + infinitive = to know how)

**Connaître** — to be acquainted with. It always takes a **direct object**: a person, a place, a work.
- *Je **connais** Marie.*
- *Tu **connais** Paris ?*
- *Je **connais** cette chanson.*

The test is simple: *connaître* is never followed by *que* or by an infinitive. If a clause comes next, it is *savoir*.

- *Je **sais** son adresse* (I have the information) · *Je **connais** son quartier* (I am familiar with it)

In the passé composé both shift meaning:
- *J'ai **su*** = I found out · *J'ai **connu*** = I met, I became acquainted with`,
      fr: `L'anglais n'a qu'un *to know* ; le français en a deux, et ils ne sont pas interchangeables.

**Savoir** — un fait, une information, ou une compétence. Il se construit avec une proposition ou un infinitif.
- *Je **sais** que tu as raison.*
- *Je **sais** où il habite.*
- *Je **sais** nager.* — *savoir* + infinitif = être capable de.

**Connaître** — être familier de quelque chose ou de quelqu'un. Il prend toujours un **complément d'objet direct** : une personne, un lieu, une œuvre.
- *Je **connais** Marie.*
- *Tu **connais** Paris ?*
- *Je **connais** cette chanson.*

Le test est simple : *connaître* n'est jamais suivi de *que* ni d'un infinitif. Si une proposition suit, c'est *savoir*.

- *Je **sais** son adresse* (l'information) · *Je **connais** son quartier* (je le fréquente)

Au passé composé, les deux changent de sens :
- *J'ai **su*** = j'ai appris · *J'ai **connu*** = j'ai rencontré`,
    },
  },

  {
    id: 'c-est-il-est',
    keywords: ["c'est", 'il est', "c'est ou il est", 'ce sont', 'elle est', 'it is', 'he is', 'this is'],
    title: { fr: "C'est et il est", en: "C'est vs. il est" },
    body: {
      en: `Both come out as *it is* or *he is* in English, which is why they get mixed up.

**C'est** + a noun phrase, a name, a stressed pronoun, or a standalone judgement.
- *C'est un professeur.* — with an article, so *c'est*.
- *C'est Marie. C'est moi. C'est intéressant.*
- Plural: *ce sont des professeurs.*

**Il / elle est** + a bare adjective or an unmodified profession, nationality or religion.
- *Il est professeur.* — no article, so *il est*.
- *Elle est française. Il est grand.*

The dividing line is the **article**. If a determiner appears in front of the noun, use *c'est*; if the noun stands bare, use *il est*.
- *Il est médecin.* · *C'est **un** médecin.* · *C'est **un bon** médecin.*

**For a comment on a situation**, *c'est* takes the masculine singular adjective:
- *La grammaire ? **C'est difficile**.* — not *elle est difficile*, unless you really mean that one grammar book.

Set expressions: *c'est vrai, c'est dommage, c'est ça, il est tard, il est temps de partir.*`,
      fr: `Les deux se traduisent par *it is* ou *he is*, d'où la confusion fréquente dans l'autre sens.

**C'est** + un groupe nominal, un nom propre, un pronom tonique, ou un jugement autonome.
- *C'est un professeur.* — il y a un article, donc *c'est*.
- *C'est Marie. C'est moi. C'est intéressant.*
- Au pluriel : *ce sont des professeurs.*

**Il / elle est** + un adjectif seul, ou un métier, une nationalité, une religion sans déterminant.
- *Il est professeur.* — pas d'article, donc *il est*.
- *Elle est française. Il est grand.*

La frontière est l'**article**. Si un déterminant précède le nom, c'est *c'est* ; si le nom est nu, c'est *il est*.
- *Il est médecin.* · *C'est **un** médecin.* · *C'est **un bon** médecin.*

**Pour commenter une situation**, *c'est* prend l'adjectif au masculin singulier :
- *La grammaire ? **C'est difficile**.* — et non *elle est difficile*, sauf à parler d'une grammaire précise.

Expressions figées : *c'est vrai, c'est dommage, c'est ça, il est tard, il est temps de partir.*`,
    },
  },

  {
    id: 'pronoms-relatifs',
    keywords: ['dont', 'pronoms relatifs', 'pronom relatif', 'relative pronouns', 'lequel',
      'qui ou que', 'qui et que', 'qui que dont ou'],
    title: { fr: 'Qui, que, dont, où', en: 'Relative pronouns' },
    body: {
      en: `Four words that join two clauses. The one you need depends on the **job the noun does in the second clause**, not on whether it is a person or a thing.

**Qui** — the subject of the following verb. A verb comes right after it.
- *L'homme **qui** parle est mon père.*

**Que** — the direct object. A subject comes right after it. It elides: *qu'*.
- *L'homme **que** je vois est mon père.*

The test: look at what follows. Verb → *qui*. Subject → *que*. This is why *qui* is used for things too — *le livre qui est sur la table*.

**Dont** — replaces *de* + something. Use it when the verb or the noun takes *de*.
- *Le livre **dont** je parle.* (parler **de**)
- *La femme **dont** le fils est médecin.* — whose son.

**Où** — a place or a time.
- *La ville **où** je suis né.*
- *Le jour **où** il est parti.* — where English says *the day **when***.

After a preposition other than *de*, a person takes *qui* and a thing takes *lequel / laquelle*:
- *L'ami **avec qui** je travaille.* · *La table **sur laquelle** j'écris.*

Unlike English, the relative pronoun can never be left out. *The book I read* must be *le livre **que** j'ai lu*.`,
      fr: `Quatre mots qui relient deux propositions. Le choix dépend de la **fonction du nom dans la seconde proposition**, et non de son caractère animé ou non.

**Qui** — sujet du verbe qui suit. Un verbe vient juste après.
- *L'homme **qui** parle est mon père.*

**Que** — complément d'objet direct. Un sujet vient juste après. Il s'élide en *qu'*.
- *L'homme **que** je vois est mon père.*

Le test : regarder ce qui suit. Un verbe → *qui*. Un sujet → *que*. C'est pourquoi *qui* s'emploie aussi pour les choses — *le livre qui est sur la table*.

**Dont** — remplace *de* + quelque chose. On l'emploie quand le verbe ou le nom se construit avec *de*.
- *Le livre **dont** je parle.* (parler **de**)
- *La femme **dont** le fils est médecin.*

**Où** — un lieu ou un moment.
- *La ville **où** je suis né.*
- *Le jour **où** il est parti.*

Après une préposition autre que *de*, une personne appelle *qui* et une chose *lequel / laquelle* :
- *L'ami **avec qui** je travaille.* · *La table **sur laquelle** j'écris.*

Contrairement à l'anglais, le pronom relatif ne peut jamais être omis : *the book I read* se dit *le livre **que** j'ai lu*.`,
    },
  },

  {
    id: 'accents',
    keywords: ['accents', 'accent aigu', 'accent grave', 'accent circonflexe', 'cédille', 'tréma',
      'written accents', 'accent marks', 'ç'],
    title: { fr: 'Les accents', en: 'Written accents' },
    body: {
      en: `French accents are part of the spelling, not decoration. Leaving one off is a spelling mistake.

**é — accent aigu.** Only on e, and it fixes the sound: *é* as in *été, parlé, préférer*.

**è — accent grave.** On e, it opens the vowel: *père, très, achète*. On *a* and *u* it does not change the sound at all — it only tells two words apart:
- *a* (has) vs *à* (to) · *ou* (or) vs *où* (where) · *la* (the) vs *là* (there)

**ê — accent circonflexe.** Often the ghost of a lost *s*, which is why the English cousin still has one: *forêt / forest, hôpital / hospital, île / island, château / castle*. It also separates *sur* (on) from *sûr* (sure), and marks the *nous* form of the passé simple: *nous fûmes*.

**ç — cédille.** Keeps a *c* soft before a, o, u: *français, garçon, nous commençons*. Never before e or i, where the c is already soft.

**ë ï ü — tréma.** Says the two vowels are pronounced separately: *Noël, naïf, maïs, aiguë*.

Capitals do take their accents — *À bientôt*, *École* — even though a lot of signage skips them.

The keyboard is the real obstacle, not the rule. On a Mac: ⌥+e then the letter gives é, ⌥+\` then the letter gives è, ⌥+i then the letter gives î, and ⌥+c gives ç.`,
      fr: `Les accents font partie de l'orthographe, ils ne sont pas décoratifs : en omettre un est une faute.

**é — accent aigu.** Seulement sur le e, dont il ferme le son : *été, parlé, préférer*.

**è — accent grave.** Sur le e, il ouvre la voyelle : *père, très, achète*. Sur *a* et *u*, il ne change rien à la prononciation — il distingue seulement deux mots :
- *a* / *à* · *ou* / *où* · *la* / *là*

**ê — accent circonflexe.** Souvent la trace d'un *s* disparu, ce que l'anglais a gardé : *forêt / forest, hôpital / hospital, île / island, château / castle*. Il distingue aussi *sur* de *sûr*, et marque la forme *nous* du passé simple : *nous fûmes*.

**ç — cédille.** Maintient le son doux du *c* devant a, o, u : *français, garçon, nous commençons*. Jamais devant e ni i, où le c est déjà doux.

**ë ï ü — tréma.** Indique que les deux voyelles se prononcent séparément : *Noël, naïf, maïs, aiguë*.

Les majuscules prennent leurs accents — *À bientôt*, *École* — même si beaucoup d'enseignes s'en dispensent.

Le vrai obstacle est le clavier, pas la règle. Sur un Mac : ⌥+e puis la lettre donne é, ⌥+\` puis la lettre donne è, ⌥+i puis la lettre donne î, et ⌥+c donne ç.`,
    },
  },

  {
    id: 'tu-vous',
    keywords: ['tu ou vous', 'tu et vous', 'tu vs vous', 'tutoyer', 'vouvoyer', 'formal you',
      'politeness', 'vouvoiement', 'tutoiement'],
    title: { fr: 'Tu et vous', en: 'Tu vs. vous' },
    body: {
      en: `**Vous** does two jobs: it is the plural *you*, and it is the polite singular. **Tu** is singular and familiar only.

**Use vous** with anyone you do not know, anyone older, anyone in a professional role, and anyone senior to you. It is the safe default — nobody is ever offended by *vous*.

**Use tu** with family, friends, classmates, children, and animals. Among students of the same age *tu* is immediate and expected.

The verb follows the pronoun, not the number of people: *vous êtes* even for one person, and the adjective stays singular — *vous êtes gentil* to one man, *vous êtes gentils* to a group.

Moving from *vous* to *tu* is a small social event with its own verbs — *tutoyer* and *vouvoyer*. The person senior in age or rank offers it: *on peut se tutoyer ?* Do not start on your own.

Compared with Spanish, French leans much more on the formal side: *vous* covers ground that Spanish would give to *tú*. A shopkeeper, a bus driver and a teacher are all *vous*.`,
      fr: `**Vous** occupe deux fonctions : c'est le *vous* pluriel, et c'est le singulier de politesse. **Tu** est uniquement singulier et familier.

**Employez vous** avec toute personne que vous ne connaissez pas, toute personne plus âgée, toute relation professionnelle, toute personne d'un rang supérieur. C'est l'usage sûr : personne n'a jamais été froissé par un *vous*.

**Employez tu** avec la famille, les amis, les camarades de classe, les enfants et les animaux. Entre élèves du même âge, le *tu* va de soi.

Le verbe s'accorde avec le pronom, non avec le nombre de personnes : *vous êtes* même pour une seule, et l'adjectif reste au singulier — *vous êtes gentil* à un homme, *vous êtes gentils* à un groupe.

Passer du *vous* au *tu* est un petit événement social, qui a ses verbes : *tutoyer* et *vouvoyer*. C'est à la personne la plus âgée ou la plus haut placée de le proposer : *on peut se tutoyer ?* Ne le décidez pas seul.

Par rapport à l'espagnol, le français penche nettement plus vers la forme polie : le *vous* couvre un terrain que l'espagnol confierait au *tú*. Un commerçant, un chauffeur de bus et un professeur sont tous des *vous*.`,
    },
  },

  {
    id: 'verbes-pronominaux',
    keywords: ['verbes pronominaux', 'verbe pronominal', 'pronominal', 'se laver', 'réfléchi',
      'reflexive', 'reflexive verbs'],
    title: { fr: 'Les verbes pronominaux', en: 'Pronominal verbs' },
    body: {
      en: `A verb carried with a pronoun that matches its subject: **me, te, se, nous, vous, se**.

*je **me** lève · tu **te** lèves · il **se** lève · nous **nous** levons · vous **vous** levez · ils **se** lèvent*

**Three kinds:**
- **reflexive** — the action comes back on the subject: *je me lave*, *elle se regarde*.
- **reciprocal** — they do it to each other: *ils se parlent*, *nous nous écrivons*.
- **idiomatic** — the pronoun is simply part of the verb, with no reflexive sense at all: *se souvenir* (to remember), *s'en aller* (to leave), *se moquer de* (to make fun of), *se rendre compte* (to realise).

Some verbs change meaning with the pronoun: *aller* (to go) → *s'en aller* (to leave); *demander* (to ask) → *se demander* (to wonder); *attendre* (to wait) → *s'attendre à* (to expect).

**In the passé composé they always take être:**
- *Je **me suis** levé(e). Elle **s'est** lavée. Ils **se sont** parlé.*

The agreement is subtler than it looks. The participle agrees when the pronoun is the **direct** object — *elle s'est lavée* — but not when it is indirect: *elle s'est lavé **les mains*** (she washed the hands to herself), and *ils se sont **parlé*** (parler *à* quelqu'un).

**In the imperative**, the pronoun goes after in the affirmative and *te* becomes *toi*: *lève-**toi**!* — but *ne **te** lève pas.*`,
      fr: `Un verbe accompagné d'un pronom qui reprend le sujet : **me, te, se, nous, vous, se**.

*je **me** lève · tu **te** lèves · il **se** lève · nous **nous** levons · vous **vous** levez · ils **se** lèvent*

**Trois types :**
- **réfléchi** — l'action revient sur le sujet : *je me lave*, *elle se regarde*.
- **réciproque** — l'un à l'autre : *ils se parlent*, *nous nous écrivons*.
- **idiomatique** — le pronom fait simplement partie du verbe, sans valeur réfléchie : *se souvenir*, *s'en aller*, *se moquer de*, *se rendre compte*.

Certains verbes changent de sens avec le pronom : *aller* → *s'en aller* ; *demander* → *se demander* ; *attendre* → *s'attendre à*.

**Au passé composé, ils prennent toujours être :**
- *Je **me suis** levé(e). Elle **s'est** lavée. Ils **se sont** parlé.*

L'accord est plus subtil qu'il n'y paraît. Le participe s'accorde quand le pronom est complément d'objet **direct** — *elle s'est lavée* — mais pas quand il est indirect : *elle s'est lavé **les mains***, *ils se sont **parlé*** (parler *à* quelqu'un).

**À l'impératif**, le pronom passe après à l'affirmative et *te* devient *toi* : *lève-**toi** !* — mais *ne **te** lève pas.*`,
    },
  },

  {
    id: 'comparatif',
    keywords: ['comparatif', 'superlatif', 'plus que', 'moins que', 'aussi que', 'meilleur', 'mieux',
      'comparative', 'superlative', 'better', 'best'],
    title: { fr: 'Le comparatif et le superlatif', en: 'Comparative and superlative' },
    body: {
      en: `**Comparative** — one pattern covers everything, with no *-er* ending to learn.

- **plus … que** — *Il est **plus** grand **que** moi.*
- **moins … que** — *Elle est **moins** rapide **que** lui.*
- **aussi … que** — *Tu es **aussi** fort **que** lui.*

With a noun it is *plus **de*** : *j'ai **plus de** livres que toi.*

**Superlative** — the comparative with a definite article in front.
- *le plus grand, la plus belle, les plus intéressants*
- If the adjective normally follows the noun, the article is repeated: *la voiture **la plus** rapide.*
- *in* after a superlative is **de**: *le plus grand **de** la classe* — not *dans*.

**The two irregulars are the ones you will actually need:**
- *bon* → **meilleur** (adjective) — *ce gâteau est **meilleur***
- *bien* → **mieux** (adverb) — *elle chante **mieux***

English uses *better* for both, which is exactly why they get swapped. If it describes a noun, *meilleur*; if it describes a verb, *mieux*.
- *C'est un **meilleur** livre.* · *Je vais **mieux**.*

*mauvais* → *pire* (or the regular *plus mauvais*); *petit* → *moindre* for abstract things, *plus petit* for size.`,
      fr: `**Le comparatif** — un seul schéma suffit, sans terminaison à apprendre.

- **plus … que** — *Il est **plus** grand **que** moi.*
- **moins … que** — *Elle est **moins** rapide **que** lui.*
- **aussi … que** — *Tu es **aussi** fort **que** lui.*

Avec un nom, on emploie *plus **de*** : *j'ai **plus de** livres que toi.*

**Le superlatif** — le comparatif précédé de l'article défini.
- *le plus grand, la plus belle, les plus intéressants*
- Si l'adjectif suit normalement le nom, l'article se répète : *la voiture **la plus** rapide.*
- Le complément du superlatif se construit avec **de** : *le plus grand **de** la classe*, et non *dans la classe*.

**Les deux irréguliers sont justement ceux dont on a besoin :**
- *bon* → **meilleur** (adjectif) — *ce gâteau est **meilleur***
- *bien* → **mieux** (adverbe) — *elle chante **mieux***

L'anglais dit *better* pour les deux, d'où la confusion. Si le mot qualifie un nom, c'est *meilleur* ; s'il modifie un verbe, c'est *mieux*.
- *C'est un **meilleur** livre.* · *Je vais **mieux**.*

*mauvais* → *pire* (ou *plus mauvais*) ; *petit* → *moindre* pour l'abstrait, *plus petit* pour la taille.`,
    },
  },

  {
    id: 'depuis-pendant',
    keywords: ['depuis', 'pendant', 'depuis ou pendant', 'depuis et pendant', 'il y a',
      'since', 'ago', 'expressions de temps'],
    title: { fr: 'Depuis, pendant, pour, il y a', en: 'Depuis, pendant, pour, il y a' },
    body: {
      en: `English uses *for* for all of these. French splits them by whether the action is still going on.

**Depuis** — started in the past and **still going**. The verb is in the **present**, where English uses a perfect.
- *J'habite ici **depuis** trois ans.* — I **have been** living here for three years.
- *Je t'attends **depuis** une heure.*
- It also handles a starting point: *depuis 2019, depuis lundi.*

**Pendant** — a finished stretch, usually with a past tense.
- *J'ai habité à Lyon **pendant** trois ans.* — and I no longer do.

**Pour** — a duration planned in advance, with a future sense.
- *Je pars **pour** deux semaines.* — the leaving is planned to last two weeks.

**Il y a** — *ago*. It marks a point, not a length.
- *Je suis arrivé **il y a** trois ans.*

Note the pair: *j'habite ici depuis trois ans* (still here) against *j'ai habité ici pendant trois ans* (finished). The tense and the preposition have to agree with each other — a present with *pendant*, or a passé composé with *depuis*, is the usual mistake.

In the negative, *depuis* takes the passé composé: *je ne l'ai pas vu depuis un an.*`,
      fr: `L'anglais dit *for* pour presque tous. Le français les répartit selon que l'action se poursuit ou non.

**Depuis** — commencé dans le passé et **toujours en cours**. Le verbe est au **présent**, là où l'anglais met un parfait.
- *J'habite ici **depuis** trois ans.*
- *Je t'attends **depuis** une heure.*
- Il marque aussi un point de départ : *depuis 2019, depuis lundi.*

**Pendant** — une durée achevée, généralement avec un temps du passé.
- *J'ai habité à Lyon **pendant** trois ans.* — et je n'y habite plus.

**Pour** — une durée prévue à l'avance, tournée vers l'avenir.
- *Je pars **pour** deux semaines.*

**Il y a** — marque un point dans le passé, non une durée.
- *Je suis arrivé **il y a** trois ans.*

Comparez : *j'habite ici depuis trois ans* (j'y suis encore) et *j'ai habité ici pendant trois ans* (c'est fini). Le temps du verbe et la préposition doivent s'accorder entre eux — un présent avec *pendant*, ou un passé composé avec *depuis*, est la faute habituelle.

À la forme négative, *depuis* appelle le passé composé : *je ne l'ai pas vu depuis un an.*`,
    },
  },
];

/**
 * The counterparts to the profe's interjections, fired on the same three
 * moments: a word found, a question outside what the tutor covers, and a verb
 * hairy enough to deserve a reaction.
 */
export const EXCLAMATIONS = {
  good: ['Et voilà !', 'Parfait !', 'Magnifique !'],
  bad: ['Zut alors !', 'Mince alors !'],
  wow: ['Oh là là !', "Nom d'un chien !"],
};

/** Conversational openers the tutor answers without looking anything up. */
export const SMALL_TALK = [
  {
    match: /^(bonjour|bonsoir|salut|coucou|hey|hi|hello|ca va|comment ca va|comment allez vous)\b/,
    reply: {
      fr: 'Bonjour ! Je peux conjuguer des verbes, chercher des mots dans le dictionnaire, traduire des phrases et vous expliquer des points de grammaire. Par où commence-t-on ?',
      en: 'Hello! I can conjugate verbs, look words up in the dictionary, translate phrases and explain grammar. Where would you like to start?',
    },
  },
  {
    match: /^(merci|merci beaucoup|thanks|thank you|ok|d accord|super|parfait|genial)\b/,
    reply: {
      fr: 'Je vous en prie ! Demandez-moi ce que vous voulez.',
      en: "You're welcome. Ask me anything else you need.",
    },
  },
  {
    match: /^(au revoir|a bientot|salut|bye|goodbye|a plus|bonne nuit)\b/,
    reply: {
      fr: 'À bientôt ! Bon courage avec le français.',
      en: 'See you! Good luck with your French.',
    },
  },
];
