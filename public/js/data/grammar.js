/**
 * Curated grammar explanations for the tutor.
 *
 * Each topic carries the words that should summon it and a short explanation in
 * both languages, so the tutor can answer in whichever language it was asked.
 * Bodies are markdown; the chat renders them with lib/markdown.js.
 *
 * These are hand-written rather than generated: everything the tutor says about
 * Spanish should be something a teacher would actually sign off on.
 */

export const TOPICS = [
  {
    id: 'ser-estar',
    keywords: ['ser', 'estar', 'ser vs estar', 'ser o estar', 'diferencia entre ser y estar', 'to be'],
    title: { es: 'Ser y estar', en: 'Ser vs. estar' },
    body: {
      en: `Both mean *to be*. The split is roughly **what something is** vs. **how or where it is right now**.

**Ser** — identity, origin, material, profession, possession, time and dates, and characteristics treated as inherent.
- *Soy profesora.* — I'm a teacher.
- *La mesa es de madera.* — The table is (made of) wood.
- *Son las tres.* — It's three o'clock.

**Estar** — location, and states or conditions that could change.
- *Estoy cansado.* — I'm tired.
- *Madrid está en España.* — Madrid is in Spain.
- *La sopa está fría.* — The soup is cold (right now).

The same adjective can take either, and the meaning shifts:
- *Es aburrido* = he's boring · *Está aburrido* = he's bored
- *Es listo* = he's clever · *Está listo* = he's ready
- *Es rico* = he's rich · *Está rico* = it tastes good

Location is the classic trap: **events** use *ser*, everything else uses *estar*. *La fiesta es en mi casa*, but *mi casa está en la esquina*.`,
      es: `Los dos significan *to be*. La división es, a grandes rasgos, **qué es algo** frente a **cómo o dónde está ahora**.

**Ser** — identidad, origen, material, profesión, posesión, la hora y las fechas, y las características que se sienten como inherentes.
- *Soy profesora.*
- *La mesa es de madera.*
- *Son las tres.*

**Estar** — ubicación y estados o condiciones que pueden cambiar.
- *Estoy cansado.*
- *Madrid está en España.*
- *La sopa está fría.*

Un mismo adjetivo admite los dos y cambia de sentido:
- *Es aburrido* (aburre) · *Está aburrido* (se aburre)
- *Es listo* (inteligente) · *Está listo* (preparado)
- *Es rico* (tiene dinero) · *Está rico* (sabe bien)

La ubicación es la trampa clásica: los **eventos** llevan *ser* y todo lo demás *estar*. *La fiesta es en mi casa*, pero *mi casa está en la esquina*.`,
    },
  },

  {
    id: 'por-para',
    keywords: ['por', 'para', 'por vs para', 'por o para', 'diferencia entre por y para', 'preposiciones', 'prepositions'],
    title: { es: 'Por y para', en: 'Por vs. para' },
    body: {
      en: `Rough rule: **para** points forward to a destination, purpose or deadline. **Por** points back at a cause, or covers the means and the exchange.

**Para** — goal, recipient, deadline, destination, opinion.
- *Este regalo es para ti.* — This present is for you.
- *Estudio para aprender.* — I study in order to learn.
- *Lo necesito para el lunes.* — I need it by Monday.

**Por** — reason, duration, exchange, movement through, means, agent.
- *Lo hice por ti.* — I did it because of you / for your sake.
- *Estuve allí por dos horas.* — I was there for two hours.
- *Lo compré por veinte euros.* — I bought it for twenty euros.
- *Caminamos por el parque.* — We walked through the park.
- *Fue escrito por Cervantes.* — It was written by Cervantes.

The pair that shows the difference best:
- *Lo hago para ti* = I'm doing it to give to you.
- *Lo hago por ti* = I'm doing it on your behalf, because of you.`,
      es: `Regla aproximada: **para** apunta hacia adelante — destino, finalidad o plazo. **Por** apunta hacia atrás — la causa — o cubre el medio y el intercambio.

**Para** — objetivo, destinatario, plazo, destino, opinión.
- *Este regalo es para ti.*
- *Estudio para aprender.*
- *Lo necesito para el lunes.*

**Por** — motivo, duración, intercambio, movimiento a través de, medio, agente.
- *Lo hice por ti.*
- *Estuve allí por dos horas.*
- *Lo compré por veinte euros.*
- *Caminamos por el parque.*
- *Fue escrito por Cervantes.*

El par que mejor muestra la diferencia:
- *Lo hago para ti* = para dártelo a ti.
- *Lo hago por ti* = en tu lugar, a causa de ti.`,
    },
  },

  {
    id: 'preterito-imperfecto',
    keywords: ['preterito', 'imperfecto', 'preterito vs imperfecto', 'pasado', 'past tense', 'preterite', 'imperfect', 'hablaba', 'hable', 'pluscuamperfecto', 'pretérito pluscuamperfecto', 'tiempos compuestos', 'pretérito perfecto', 'have been', 'present perfect', 'he hablado'],
    title: { es: 'Pretérito e imperfecto', en: 'Preterite vs. imperfect' },
    body: {
      en: `Both are past tenses. The **preterite** frames an action as a completed whole; the **imperfect** leaves it open — background, habit, or something in progress.

**Preterite** — a finished event, however long it lasted.
- *Ayer comí paella.* — Yesterday I ate paella.
- *Viví diez años en Sevilla.* — I lived in Seville for ten years. (the stay is over)

**Imperfect** — what used to happen, what was going on, descriptions, age, time, weather.
- *De niño comía paella los domingos.* — As a child I used to eat paella on Sundays.
- *Vivía en Sevilla cuando la conocí.* — I was living in Seville when I met her.
- *Eran las ocho y llovía.* — It was eight o'clock and it was raining.

They work together: the imperfect sets the scene, the preterite is what happened in it.
> *Leía tranquilamente cuando sonó el teléfono.*
> I was reading quietly when the phone rang.

A few verbs shift meaning in the preterite: *sabía* = I knew, *supe* = I found out. *Conocía* = I knew (a person), *conocí* = I met. *Quería* = I wanted, *quise* = I tried. *No quise* = I refused.`,
      es: `Los dos son tiempos del pasado. El **pretérito** presenta la acción como un bloque terminado; el **imperfecto** la deja abierta — fondo, costumbre o algo en curso.

**Pretérito** — un hecho acabado, dure lo que dure.
- *Ayer comí paella.*
- *Viví diez años en Sevilla.* (la estancia terminó)

**Imperfecto** — lo que se hacía habitualmente, lo que estaba pasando, descripciones, la edad, la hora, el tiempo atmosférico.
- *De niño comía paella los domingos.*
- *Vivía en Sevilla cuando la conocí.*
- *Eran las ocho y llovía.*

Funcionan juntos: el imperfecto pone el decorado y el pretérito, lo que ocurre en él.
> *Leía tranquilamente cuando sonó el teléfono.*

Algunos verbos cambian de sentido en pretérito: *sabía* / *supe* (me enteré), *conocía* / *conocí*, *quería* / *quise* (intenté), *no quise* (me negué).`,
    },
  },

  {
    id: 'subjuntivo',
    keywords: ['subjuntivo', 'subjunctive', 'cuando se usa el subjuntivo', 'ojala', 'espero que', 'quiero que'],
    title: { es: 'El subjuntivo', en: 'The subjunctive' },
    body: {
      en: `The subjunctive isn't a tense, it's a mood. The indicative states what is; the subjunctive handles what is wanted, doubted, felt about, or not yet real.

It almost always turns up in a subordinate clause after **que**, with a different subject on each side:
- *Quiero que **vengas**.* — I want you to come.
- *Es importante que lo **sepas**.* — It's important that you know.
- *Dudo que **tenga** razón.* — I doubt he's right.
- *Me alegra que **estés** aquí.* — I'm glad you're here.

The usual triggers, worth memorising as a set: **wanting** (*querer, pedir, esperar*), **emotion** (*alegrarse, sentir, temer*), **doubt or denial** (*dudar, no creer, negar*), **impersonal judgements** (*es necesario / raro / mejor que*), and **the not-yet-real** after *cuando, antes de que, para que, aunque, sin que*.

Same subject on both sides? Use the infinitive instead:
- *Quiero venir.* — I want to come.
- *Quiero que vengas.* — I want you to come.

Watch what negation does:
- *Creo que **es** verdad.* (indicative — you believe it)
- *No creo que **sea** verdad.* (subjunctive — you don't)

And *cuando* splits by whether it has happened:
- *Cuando **llego** a casa, ceno.* — habit, indicative.
- *Cuando **llegue** a casa, cenaré.* — hasn't happened yet, subjunctive.`,
      es: `El subjuntivo no es un tiempo, es un modo. El indicativo afirma lo que hay; el subjuntivo cubre lo que se desea, se duda, se valora o todavía no es real.

Casi siempre aparece en una subordinada con **que** y con sujeto distinto a cada lado:
- *Quiero que **vengas**.*
- *Es importante que lo **sepas**.*
- *Dudo que **tenga** razón.*
- *Me alegra que **estés** aquí.*

Los disparadores habituales: **deseo** (*querer, pedir, esperar*), **emoción** (*alegrarse, sentir, temer*), **duda o negación** (*dudar, no creer, negar*), **juicios impersonales** (*es necesario / raro / mejor que*) y **lo aún no real** tras *cuando, antes de que, para que, aunque, sin que*.

¿El mismo sujeto en los dos lados? Entonces infinitivo:
- *Quiero venir.*
- *Quiero que vengas.*

Fíjate en lo que hace la negación:
- *Creo que **es** verdad.* (indicativo)
- *No creo que **sea** verdad.* (subjuntivo)

Y *cuando* se reparte según si ya ha ocurrido:
- *Cuando **llego** a casa, ceno.* (costumbre)
- *Cuando **llegue** a casa, cenaré.* (todavía no)`,
    },
  },

  {
    id: 'gustar',
    keywords: ['gustar', 'me gusta', 'gustar verbs', 'encantar', 'interesar', 'doler', 'faltar', 'why me gusta'],
    title: { es: 'Gustar y verbos parecidos', en: 'Gustar and verbs like it' },
    body: {
      en: `*Gustar* doesn't mean *to like* — it means **to be pleasing to**. The thing you like is the subject, and you are the indirect object. That's why it's *me gusta*, never *yo gusto*.

> *Me gusta el café.* — literally: coffee is pleasing to me.

So the verb agrees with the **thing**, not the person:
- *Me gusta el libro.* — singular thing.
- *Me gusta**n** los libros.* — plural thing, plural verb.

The pronoun changes for who: *me, te, le, nos, os, les*.
- *Le gusta bailar.* — He/she likes dancing.
- *Nos gustan las películas viejas.* — We like old films.

An infinitive counts as singular, even several of them: *Me gusta leer y escribir.*

For emphasis or to clear up *le*, add **a + person**: *A María le gusta el café.* · *A mí me gusta más el té.*

Same pattern: **encantar** (to love), **interesar**, **importar**, **molestar**, **doler** (*me duele la cabeza*), **faltar**, **quedar**, **parecer**.`,
      es: `*Gustar* no significa *to like*: significa **resultar agradable a alguien**. Lo que te gusta es el sujeto y tú eres el complemento indirecto. Por eso se dice *me gusta* y nunca *yo gusto*.

> *Me gusta el café.* — el café me resulta agradable.

El verbo concuerda con **la cosa**, no con la persona:
- *Me gusta el libro.*
- *Me gusta**n** los libros.*

El pronombre marca quién: *me, te, le, nos, os, les*.
- *Le gusta bailar.*
- *Nos gustan las películas viejas.*

Un infinitivo cuenta como singular, aunque haya varios: *Me gusta leer y escribir.*

Para enfatizar o aclarar *le*, se añade **a + persona**: *A María le gusta el café.* · *A mí me gusta más el té.*

Siguen el mismo patrón: **encantar**, **interesar**, **importar**, **molestar**, **doler** (*me duele la cabeza*), **faltar**, **quedar**, **parecer**.`,
    },
  },

  {
    id: 'saber-conocer',
    keywords: ['saber', 'conocer', 'saber vs conocer', 'to know'],
    title: { es: 'Saber y conocer', en: 'Saber vs. conocer' },
    body: {
      en: `Both mean *to know*.

**Saber** — facts, information, and how to do things.
- *Sé su nombre.* — I know his name.
- *No sé dónde está.* — I don't know where it is.
- *¿Sabes nadar?* — Can you swim? (do you know how to)

**Conocer** — being acquainted with people, places, and works.
- *Conozco a María.* — I know María.
- *No conozco Barcelona.* — I don't know Barcelona (never been).
- *¿Conoces esa canción?* — Are you familiar with that song?

Rule of thumb: *saber* takes facts and clauses (*sé que…, sé dónde…*), *conocer* takes a direct object that is a person, place or thing — and a person object needs the personal **a**: *conozco **a** tu hermano*.

In the preterite both shift: *supe* = I found out, *conocí* = I met (for the first time).`,
      es: `Los dos se traducen por *to know*.

**Saber** — datos, información y habilidades.
- *Sé su nombre.*
- *No sé dónde está.*
- *¿Sabes nadar?*

**Conocer** — tener trato o familiaridad con personas, lugares y obras.
- *Conozco a María.*
- *No conozco Barcelona.*
- *¿Conoces esa canción?*

Regla práctica: *saber* lleva datos y subordinadas (*sé que…, sé dónde…*); *conocer* lleva un objeto directo que es persona, lugar o cosa — y si es persona necesita la **a** personal: *conozco **a** tu hermano*.

En pretérito cambian los dos: *supe* (me enteré) y *conocí* (nos conocimos por primera vez).`,
    },
  },

  {
    id: 'pronombres-objeto',
    keywords: ['pronombres', 'objeto directo', 'objeto indirecto', 'lo la le les', 'se lo', 'object pronouns', 'me te lo'],
    title: { es: 'Pronombres de objeto', en: 'Object pronouns' },
    body: {
      en: `**Direct** (the thing acted on): *me, te, **lo/la**, nos, os, **los/las***
**Indirect** (the one it's done to or for): *me, te, **le**, nos, os, **les***

Only the third person tells them apart — everything else is the same word.

- *¿Ves el coche? — Sí, **lo** veo.* (direct)
- ***Le** di el libro a Ana.* (indirect — to her)

**Placement.** Before a conjugated verb; attached to the end of an infinitive, gerund or affirmative command.
- *Lo quiero comprar.* = *Quiero comprar**lo***. — both fine.
- *Estoy leyéndo**lo***. = *Lo estoy leyendo.*
- *Dá**melo***. — Give it to me. But negative: *No me lo des.*

**Both together:** indirect first, then direct — *me lo, te la, nos los*.
- *¿El libro? Ana **me lo** dio.*

**The le → se rule.** *Le* and *les* become **se** in front of *lo/la/los/las*, because *le lo* is unsayable.
- *Le di el libro* → ***Se** lo di.* (never *le lo di*)

Attaching pronouns can add a written accent, to keep the stress where it was: *da* → *dámelo*, *leyendo* → *leyéndolo*.`,
      es: `**Directo** (lo que recibe la acción): *me, te, **lo/la**, nos, os, **los/las***
**Indirecto** (a quién o para quién): *me, te, **le**, nos, os, **les***

Solo la tercera persona los distingue; el resto comparte forma.

- *¿Ves el coche? — Sí, **lo** veo.* (directo)
- ***Le** di el libro a Ana.* (indirecto)

**Colocación.** Delante del verbo conjugado; pegados al infinitivo, al gerundio o al imperativo afirmativo.
- *Lo quiero comprar.* = *Quiero comprar**lo***.
- *Estoy leyéndo**lo***. = *Lo estoy leyendo.*
- *Dá**melo***. Pero en negativo: *No me lo des.*

**Juntos:** primero el indirecto y después el directo — *me lo, te la, nos los*.
- *¿El libro? Ana **me lo** dio.*

**La regla le → se.** *Le* y *les* se convierten en **se** delante de *lo/la/los/las*, porque *le lo* no se puede pronunciar.
- *Le di el libro* → ***Se** lo di.*

Al pegar pronombres suele aparecer una tilde para mantener el acento: *da* → *dámelo*, *leyendo* → *leyéndolo*.`,
    },
  },

  {
    id: 'se',
    keywords: ['se', 'reflexivo', 'reflexive', 'verbos reflexivos', 'levantarse', 'se impersonal', 'se vende'],
    title: { es: 'Los usos de «se»', en: 'The many uses of "se"' },
    body: {
      en: `*Se* does several unrelated jobs. The four worth knowing:

**1. Reflexive** — the subject acts on itself. The pronoun changes with the person: *me, te, se, nos, os, se*.
- *Me levanto a las siete.* — I get (myself) up at seven.
- *Se llama Ana.* — She calls herself Ana.

Many verbs shift meaning with it: *ir* (to go) → *irse* (to leave); *dormir* (to sleep) → *dormirse* (to fall asleep); *acordar* (to agree) → *acordarse* (to remember).

**2. Reciprocal** — plural subjects doing it to each other.
- *Se abrazaron.* — They hugged each other.

**3. Impersonal / passive** — no particular agent. Extremely common on signs.
- *Se habla español.* — Spanish is spoken here.
- *Se venden pisos.* — Flats for sale. (verb agrees with *pisos*)
- *¿Cómo se dice…?* — How do you say…?

**4. The substitute se** — *le/les* becoming *se* before *lo/la/los/las*: *Se lo di.* This one has nothing to do with the other three; it's a pronunciation fix.

There's also the accidental *se*, which quietly removes blame: *Se me rompió el vaso* — the glass broke on me.`,
      es: `*Se* hace varios trabajos distintos. Los cuatro que conviene saber:

**1. Reflexivo** — el sujeto actúa sobre sí mismo. El pronombre cambia según la persona: *me, te, se, nos, os, se*.
- *Me levanto a las siete.*
- *Se llama Ana.*

Muchos verbos cambian de sentido: *ir* → *irse*; *dormir* → *dormirse*; *acordar* → *acordarse*.

**2. Recíproco** — sujetos en plural que se lo hacen el uno al otro.
- *Se abrazaron.*

**3. Impersonal o pasiva refleja** — sin agente concreto. Habitual en los carteles.
- *Se habla español.*
- *Se venden pisos.* (el verbo concuerda con *pisos*)
- *¿Cómo se dice…?*

**4. El «se» sustituto** — *le/les* se vuelve *se* delante de *lo/la/los/las*: *Se lo di.* No tiene relación con los otros tres: es un arreglo de pronunciación.

Existe además el *se* accidental, que reparte la culpa: *Se me rompió el vaso*.`,
    },
  },

  {
    id: 'tildes',
    keywords: ['tilde', 'tildes', 'acento', 'acentos', 'accent', 'accents', 'reglas de acentuacion', 'agudas', 'llanas', 'esdrujulas'],
    title: { es: 'Las tildes', en: 'Written accents' },
    body: {
      en: `Every Spanish word has a stressed syllable. The written accent only appears when the stress *breaks* the default rule.

**The default:**
- Words ending in a **vowel, n or s** are stressed on the **second-to-last** syllable: *ca-**sa***, *jo-ven*, *li-bros*.
- Words ending in **any other consonant** are stressed on the **last**: *pa-**pel***, *ciu-**dad***, *re-lo**j***.

Write the accent when a word breaks its rule:
- *ca-**fé*** — ends in a vowel but stressed on the last → accent.
- ***á**r-bol* — ends in *l* but stressed on the second-to-last → accent.
- ***rá**-pi-do* — stressed on the third-to-last → **always** an accent.

**Hiatus.** A weak vowel (*i, u*) that carries the stress next to a strong one (*a, e, o*) always takes an accent, whatever the rule says: *dí-a*, *pa-ís*, *rí-o*, *ba-úl*.

**Telling words apart.** Some one-syllable words take an accent purely to distinguish them:
*el* / *él* · *tu* / *tú* · *mi* / *mí* · *si* / *sí* · *se* / *sé* · *mas* / *más* · *te* / *té* · *de* / *dé*

Question words carry one in questions **and** in indirect questions: *¿Qué quieres?* · *No sé qué quieres.*`,
      es: `Toda palabra española tiene una sílaba tónica. La tilde solo aparece cuando el acento **rompe** la regla por defecto.

**Por defecto:**
- Las palabras terminadas en **vocal, n o s** son llanas: *ca-**sa***, *jo-ven*, *li-bros*.
- Las terminadas en **cualquier otra consonante** son agudas: *pa-**pel***, *ciu-**dad***, *re-lo**j***.

Se escribe tilde cuando la palabra rompe su regla:
- *ca-**fé*** — acaba en vocal pero es aguda.
- ***á**r-bol* — acaba en *l* pero es llana.
- ***rá**-pi-do* — esdrújula: **siempre** lleva tilde.

**Hiato.** Una vocal débil (*i, u*) tónica junto a una fuerte (*a, e, o*) lleva tilde siempre: *dí-a*, *pa-ís*, *rí-o*, *ba-úl*.

**Tilde diacrítica.** Algunos monosílabos la llevan solo para distinguirse:
*el* / *él* · *tu* / *tú* · *mi* / *mí* · *si* / *sí* · *se* / *sé* · *mas* / *más* · *te* / *té* · *de* / *dé*

Los interrogativos la llevan en preguntas directas **e** indirectas: *¿Qué quieres?* · *No sé qué quieres.*`,
    },
  },

  {
    id: 'futuro',
    keywords: ['futuro', 'future', 'ir a', 'voy a', 'future tense', 'como se dice will', 'futuro perfecto'],
    title: { es: 'Hablar del futuro', en: 'Talking about the future' },
    body: {
      en: `Three ways, and everyday speech leans on the second.

**1. Simple future** — one word, endings added to the whole infinitive: *hablaré, comerás, vivirá*. Used for predictions and formal or distant future.
- *Mañana lloverá.* — It'll rain tomorrow.

A dozen verbs have irregular stems here — *tendré, pondré, saldré, vendré, haré, diré, podré, querré, sabré, habré, cabré, valdré* — and the conditional uses the very same stems.

**2. Ir a + infinitive** — the everyday choice, like English *going to*.
- *Voy a estudiar esta noche.* — I'm going to study tonight.

**3. Plain present** — for scheduled things, exactly as English does it.
- *El tren sale a las ocho.* — The train leaves at eight.

One quirk: the future is also used for **guessing about the present**.
- *¿Qué hora será?* — I wonder what time it is.
- *Estará en casa.* — He's probably at home.`,
      es: `Tres maneras, y en la lengua corriente domina la segunda.

**1. Futuro simple** — una sola palabra: las terminaciones se añaden al infinitivo entero (*hablaré, comerás, vivirá*). Para predicciones y para el futuro lejano o formal.
- *Mañana lloverá.*

Una docena de verbos tiene raíz irregular — *tendré, pondré, saldré, vendré, haré, diré, podré, querré, sabré, habré, cabré, valdré* — y el condicional usa exactamente esas mismas raíces.

**2. Ir a + infinitivo** — la opción de todos los días.
- *Voy a estudiar esta noche.*

**3. Presente** — para lo que está programado.
- *El tren sale a las ocho.*

Una peculiaridad: el futuro sirve además para **conjeturar sobre el presente**.
- *¿Qué hora será?*
- *Estará en casa.*`,
    },
  },

  {
    id: 'a-personal',
    keywords: ['a personal', 'personal a', 'veo a', 'cuando se usa a'],
    title: { es: 'La «a» personal', en: 'The personal "a"' },
    body: {
      en: `When the direct object of a verb is a specific person, Spanish puts **a** in front of it. English has nothing like it, so it's easy to drop.

- *Veo **a** María.* — I see María.
- *Veo la casa.* — I see the house. (no *a*, it's a thing)
- *Busco **a** mi hermano.* — I'm looking for my brother.
- *Busco un médico.* — I'm looking for a doctor. (any doctor, not a specific one)

That last pair is the whole rule: it marks a **specific** person. An unspecified one takes nothing.

It also covers pets treated as family (*paseo a mi perro*), and the pronouns *alguien, nadie, quién*: *No veo **a** nadie.*

The one verb that refuses it is **tener** in its plain sense: *Tengo dos hermanos*, not *tengo a dos hermanos*.`,
      es: `Cuando el objeto directo de un verbo es una persona concreta, el español antepone una **a**. En inglés no existe nada parecido, así que se olvida con facilidad.

- *Veo **a** María.*
- *Veo la casa.* (cosa: sin *a*)
- *Busco **a** mi hermano.*
- *Busco un médico.* (uno cualquiera, sin *a*)

Ese último par resume la regla: marca a una persona **determinada**. Si es indeterminada, no se pone.

Vale también para los animales de compañía (*paseo a mi perro*) y para *alguien, nadie, quién*: *No veo **a** nadie.*

El verbo que la rechaza es **tener** en su sentido llano: *Tengo dos hermanos*, no *tengo a dos hermanos*.`,
    },
  },

  {
    id: 'tu-usted',
    keywords: ['tu', 'usted', 'ustedes', 'vosotros', 'formal', 'informal', 'tuteo', 'voseo', 'you'],
    title: { es: 'Tú, usted, vosotros, ustedes', en: 'Ways of saying "you"' },
    body: {
      en: `Spanish splits *you* four ways — by number and by formality.

| | informal | formal |
|---|---|---|
| **singular** | tú | usted |
| **plural** | vosotros/as | ustedes |

**Usted** takes third-person verb forms, which surprises everyone at first: *usted **habla***, not *usted hablas*. Same for *ustedes*: *ustedes **hablan***.

**Regional split.** *Vosotros* is Spain-only. In all of Latin America the plural is **ustedes** whether you're being formal or not — so a Mexican speaking to friends says *ustedes hablan*, where a Spaniard says *vosotros habláis*.

**Voseo.** Argentina, Uruguay, Paraguay and much of Central America use **vos** instead of *tú*, with its own present forms: *vos hablás, vos comés, vos vivís* — stress on the last syllable, no stem change. *Vos tenés* where Spain has *tú tienes*.

Rule of thumb for a learner: *tú* with people your own age and anyone who uses it with you, *usted* with strangers much older than you and in professional settings. Latin America is generally more formal with *usted* than Spain.`,
      es: `El español reparte el *you* en cuatro, por número y por formalidad.

| | informal | formal |
|---|---|---|
| **singular** | tú | usted |
| **plural** | vosotros/as | ustedes |

**Usted** lleva las formas de tercera persona, cosa que sorprende al principio: *usted **habla***, no *usted hablas*. Igual con *ustedes*: *ustedes **hablan***.

**Reparto regional.** *Vosotros* solo se usa en España. En toda Hispanoamérica el plural es **ustedes**, sea formal o no.

**Voseo.** Argentina, Uruguay, Paraguay y buena parte de Centroamérica usan **vos** en lugar de *tú*, con formas propias: *vos hablás, vos comés, vos vivís* — acento en la última sílaba y sin diptongación. *Vos tenés* frente a *tú tienes*.

Regla práctica: *tú* con la gente de tu edad y con quien te tutee; *usted* con desconocidos mayores y en contextos profesionales. Hispanoamérica usa *usted* más que España.`,
    },
  },

  {
    id: 'adjetivos',
    keywords: ['adjetivos', 'adjectives', 'concordancia', 'agreement', 'genero', 'gender', 'posicion del adjetivo', 'diminutivos', 'diminutivo', 'aumentativos'],
    title: { es: 'Los adjetivos', en: 'Adjectives: agreement and position' },
    body: {
      en: `**Agreement.** An adjective copies the gender and number of its noun.
- *un libro roj**o*** · *una casa roj**a*** · *unos libros roj**os*** · *unas casas roj**as***

Adjectives ending in **-e** or a consonant don't change for gender, only number: *un coche verde / una casa verde / unos coches verdes*. Ones ending in **-ista** are the same for both: *un chico realista, una chica realista*.

Nationalities are the exception — they do take a feminine even after a consonant: *español / español**a***, *francés / frances**a***.

**Position.** Default is **after** the noun, which is the neutral, descriptive slot: *una casa grande*.

Put it **before** and it becomes subjective or emphatic — and a few adjectives change meaning outright:
- *un hombre **grande*** = a big man · *un **gran** hombre* = a great man
- *un amigo **viejo*** = an elderly friend · *un **viejo** amigo* = a long-standing friend
- *un coche **nuevo*** = a brand-new car · *un **nuevo** coche* = another car
- *un traje **pobre*** = a shabby suit · *un **pobre** hombre* = a poor wretch

*Grande* shortens to *gran* before any singular noun; *bueno* and *malo* shorten to *buen* and *mal* before a masculine singular: *un buen libro*.`,
      es: `**Concordancia.** El adjetivo copia el género y el número del sustantivo.
- *un libro roj**o*** · *una casa roj**a*** · *unos libros roj**os*** · *unas casas roj**as***

Los acabados en **-e** o en consonante no cambian de género, solo de número: *un coche verde / una casa verde / unos coches verdes*. Los acabados en **-ista** valen para los dos: *un chico realista, una chica realista*.

Los gentilicios son la excepción: sí tienen femenino aunque acaben en consonante — *español / español**a***, *francés / frances**a***.

**Posición.** Por defecto va **detrás**, que es la posición neutra y descriptiva: *una casa grande*.

Delante se vuelve subjetivo o enfático, y unos cuantos cambian de significado:
- *un hombre **grande*** / *un **gran** hombre*
- *un amigo **viejo*** / *un **viejo** amigo*
- *un coche **nuevo*** / *un **nuevo** coche*
- *un traje **pobre*** / *un **pobre** hombre*

*Grande* se apocopa en *gran* ante singular; *bueno* y *malo* en *buen* y *mal* ante masculino singular: *un buen libro*.`,
    },
  },

  {
    id: 'haber-tener',
    keywords: ['haber', 'tener', 'hay', 'hay vs esta', 'there is', 'there are', 'haber vs tener'],
    title: { es: 'Haber, tener y «hay»', en: 'Haber, tener and "hay"' },
    body: {
      en: `**Tener** = to have, to possess. *Tengo dos hermanos.*

**Haber** is almost never used that way. It has two jobs:

**1. The auxiliary** for compound tenses, always followed by a participle.
- *He comido.* — I have eaten.
- *Había salido.* — He had left.

Note that *tener* cannot do this: *tengo comido* is not how you say *I have eaten*.

**2. Hay** — *there is / there are*, for saying that something exists.
- *Hay un problema.* — There's a problem.
- *Hay tres libros.* — There are three books.

**Hay never becomes plural.** It's *hay tres libros*, never *han tres libros*. In other tenses it's *había*, *hubo*, *habrá* — all invariable too: *Había mucha gente*, not *habían*.

**Hay vs. está.** *Hay* introduces something new and unspecified; *está* locates something already known.
- *Hay un banco en la esquina.* — There's a bank on the corner. (mentioning it for the first time)
- *El banco está en la esquina.* — The bank is on the corner. (you know which bank)

So *hay* goes with *un/una/tres/mucho*, and *está* goes with *el/la/mi/este*.

Set phrases with *tener* where English uses *to be*: *tengo hambre, tengo sed, tengo frío, tengo sueño, tengo 20 años, tengo razón, tengo prisa, tengo miedo*.`,
      es: `**Tener** = poseer. *Tengo dos hermanos.*

**Haber** casi nunca se usa así. Tiene dos oficios:

**1. Auxiliar** de los tiempos compuestos, siempre con participio.
- *He comido.*
- *Había salido.*

*Tener* no puede hacer esto: *tengo comido* no significa *he comido*.

**2. Hay** — expresa existencia.
- *Hay un problema.*
- *Hay tres libros.*

**Hay no tiene plural.** Se dice *hay tres libros*, nunca *han tres libros*. En otros tiempos: *había*, *hubo*, *habrá*, igual de invariables: *Había mucha gente*, no *habían*.

**Hay frente a está.** *Hay* presenta algo nuevo e indeterminado; *está* sitúa algo ya conocido.
- *Hay un banco en la esquina.*
- *El banco está en la esquina.*

Por eso *hay* va con *un/una/tres/mucho* y *está* con *el/la/mi/este*.

Locuciones con *tener* donde el inglés usa *to be*: *tengo hambre, sed, frío, sueño, 20 años, razón, prisa, miedo*.`,
    },
  },

  {
    id: 'muy-mucho',
    keywords: ['muy', 'mucho', 'muy vs mucho', 'very', 'a lot', 'adverbios', 'adverbs', 'mente'],
    title: { es: 'Muy y mucho', en: 'Muy vs. mucho' },
    body: {
      en: `**Muy** = *very*. It modifies adjectives and adverbs, and never changes form.
- *muy grande, muy rápido, muy bien, muy temprano*

**Mucho** = *a lot / much / many*. It modifies nouns and verbs.
- With a noun it agrees: *much**o** dinero, much**a** gente, much**os** libros, much**as** veces*.
- With a verb it's invariable and follows it: *Trabajo mucho.* — I work a lot.

The line is simple: *muy* + adjective/adverb, *mucho* + noun/verb.
- ✅ *Estoy muy cansado.* — ❌ *Estoy mucho cansado.*
- ✅ *Tengo mucho trabajo.* — ❌ *Tengo muy trabajo.*

Two things to watch. *Mucho* goes with the four irregular comparatives instead of *muy*: *mucho mejor, mucho peor, mucho mayor, mucho menor* — never *muy mejor*.

And *muy* can't stand alone. *¿Estás cansado? — Mucho.* Never *muy*.`,
      es: `**Muy** modifica adjetivos y adverbios, y es invariable.
- *muy grande, muy rápido, muy bien, muy temprano*

**Mucho** modifica sustantivos y verbos.
- Con sustantivo concuerda: *much**o** dinero, much**a** gente, much**os** libros, much**as** veces*.
- Con verbo es invariable y va detrás: *Trabajo mucho.*

La frontera es sencilla: *muy* + adjetivo/adverbio, *mucho* + sustantivo/verbo.
- ✅ *Estoy muy cansado.* — ❌ *Estoy mucho cansado.*
- ✅ *Tengo mucho trabajo.* — ❌ *Tengo muy trabajo.*

Dos avisos. Con los cuatro comparativos irregulares se usa *mucho*: *mucho mejor, mucho peor, mucho mayor, mucho menor* — nunca *muy mejor*.

Y *muy* no puede ir solo. *¿Estás cansado? — Mucho.* Nunca *muy*.`,
    },
  },

  {
    id: 'condicional-si',
    keywords: ['condicional', 'conditional', 'si', 'si clauses', 'would', 'hubiera', 'si tuviera', 'condicional perfecto'],
    title: { es: 'El condicional y las oraciones con «si»', en: 'The conditional and "si" clauses' },
    body: {
      en: `The **conditional** (*hablaría, comerías, viviría*) is English *would*. Its endings go on the full infinitive, and it shares the twelve irregular stems with the future: *tendría, haría, diría, podría*.

Uses: hypotheticals (*Yo no haría eso*), politeness (*¿Podrías ayudarme?*), and the future seen from the past (*Dijo que vendría*).

**The three si-patterns** are worth learning as fixed shapes:

**1. Real** — si + present, then present or future.
- *Si tengo tiempo, te llamo.* — If I have time, I'll call you.

**2. Unreal present** — si + **imperfect subjunctive**, then conditional.
- *Si tuviera tiempo, te llamaría.* — If I had time, I'd call you.

**3. Unreal past** — si + **pluperfect subjunctive**, then conditional perfect.
- *Si hubiera tenido tiempo, te habría llamado.* — If I'd had time, I'd have called you.

The rule that catches everyone: **never put the conditional or the present subjunctive straight after *si***. *Si tendría* and *si tenga* are both wrong; it's *si tuviera*.`,
      es: `El **condicional** (*hablaría, comerías, viviría*) equivale al *would* inglés. Las terminaciones se añaden al infinitivo completo y comparte con el futuro las doce raíces irregulares: *tendría, haría, diría, podría*.

Usos: hipótesis (*Yo no haría eso*), cortesía (*¿Podrías ayudarme?*) y futuro visto desde el pasado (*Dijo que vendría*).

**Los tres patrones con «si»** conviene aprenderlos como moldes fijos:

**1. Real** — si + presente, y presente o futuro.
- *Si tengo tiempo, te llamo.*

**2. Irreal de presente** — si + **imperfecto de subjuntivo**, y condicional.
- *Si tuviera tiempo, te llamaría.*

**3. Irreal de pasado** — si + **pluscuamperfecto de subjuntivo**, y condicional compuesto.
- *Si hubiera tenido tiempo, te habría llamado.*

La regla que a todos se les escapa: **detrás de *si* no van ni el condicional ni el presente de subjuntivo**. *Si tendría* y *si tenga* son incorrectos; se dice *si tuviera*.`,
    },
  },
  {
    id: 'imperativo',
    keywords: ['imperativo', 'mandatos', 'órdenes', 'ordenes', 'imperative', 'commands', 'command',
      'cómo dar órdenes', 'usted commands', 'tú commands', 'negative commands'],
    title: { es: 'El imperativo', en: 'Commands' },
    body: {
      en: `Spanish has a different form for a command depending on **who** you are telling and **whether it is negative**. That second half is the part people forget.

**Affirmative tú** — the third person singular of the present. No ending to learn:
- *habla* (speak), *come* (eat), *escribe* (write)

**Eight irregulars**, and they are all short. Learn them as a list — *ven, di, sal, haz, ten, ve, pon, sé*:
- venir → **ven** · decir → **di** · salir → **sal** · hacer → **haz**
- tener → **ten** · ir → **ve** · poner → **pon** · ser → **sé**

**Everything else is the subjunctive.** That is the whole trick:

| | affirmative | negative |
| --- | --- | --- |
| tú | habla | **no hables** |
| usted | hable | no hable |
| nosotros | hablemos | no hablemos |
| vosotros | hablad | no habléis |
| ustedes | hablen | no hablen |

So *habla* becomes *no hables* — the negative tú command is not the negative of the affirmative one, it is the subjunctive. *No ven* is wrong; *no vengas* is right.

**Pronouns attach to an affirmative command and precede a negative one:**
- *dímelo* — tell me it · *no me lo digas* — don't tell me it
- Attaching one often needs a written accent to keep the stress: *dime*, *dímelo*.`,
      es: `El español cambia de forma según **a quién** se manda y **si la orden es negativa**. Lo segundo es lo que más se olvida.

**Afirmativo de tú** — la tercera persona del singular del presente, sin terminación nueva:
- *habla*, *come*, *escribe*

**Ocho irregulares**, todos cortos — *ven, di, sal, haz, ten, ve, pon, sé*:
- venir → **ven** · decir → **di** · salir → **sal** · hacer → **haz**
- tener → **ten** · ir → **ve** · poner → **pon** · ser → **sé**

**Todo lo demás es el subjuntivo.** Ese es el truco entero:

| | afirmativo | negativo |
| --- | --- | --- |
| tú | habla | **no hables** |
| usted | hable | no hable |
| nosotros | hablemos | no hablemos |
| vosotros | hablad | no habléis |
| ustedes | hablen | no hablen |

*Habla* pasa a *no hables*: el negativo de tú no es la negación del afirmativo, es el subjuntivo. *No ven* es incorrecto; *no vengas* es lo correcto.

**Los pronombres se pegan al afirmativo y van delante del negativo:**
- *dímelo* · *no me lo digas*
- Al pegarlos suele hacer falta una tilde para mantener el acento: *dime*, *dímelo*.`,
    },
  },

  {
    id: 'gerundio-progresivo',
    keywords: ['gerundio', 'progresivo', 'estar + gerundio', 'gerund', 'progressive', '-ing',
      'present progressive', 'estoy hablando', 'participio presente'],
    title: { es: 'El gerundio y el progresivo', en: 'The gerund and the progressive' },
    body: {
      en: `**Form:** -ar verbs take **-ando**, -er and -ir verbs take **-iendo**.
*hablar → hablando* · *comer → comiendo* · *vivir → viviendo*

Spelling and stem changes:
- a vowel before the ending turns *-iendo* into **-yendo**: *leer → leyendo*, *oír → oyendo*, *construir → construyendo*
- -ir verbs with a stem change use the weak one: *dormir → durmiendo*, *pedir → pidiendo*, *sentir → sintiendo*

**With estar**, it says the action is going on right now:
- *Estoy comiendo.* — I'm eating (this minute).

**The trap.** English uses "-ing" far more widely than Spanish uses the gerund, and three of those uses are wrong in Spanish:
- **Future** — "I'm eating tomorrow" is *Como mañana* or *Voy a comer mañana*, never *estoy comiendo mañana*.
- **As a noun** — "reading is fun" is *leer es divertido*, with the **infinitive**, not *leyendo*.
- **Describing a noun** — "a running man" is *un hombre que corre*, not *un hombre corriendo*.

The plain present already covers habits and general truths, so *hablo español* is "I speak Spanish" and *estoy hablando español* means you are doing it at this moment.

**Other verbs take it too**, and each shades the meaning: *sigue lloviendo* (it's still raining), *va mejorando* (it's gradually improving), *lleva dos horas esperando* (he's been waiting two hours).`,
      es: `**Formación:** los verbos en -ar toman **-ando**; los de -er e -ir toman **-iendo**.
*hablar → hablando* · *comer → comiendo* · *vivir → viviendo*

Cambios ortográficos y de raíz:
- una vocal antes de la terminación convierte *-iendo* en **-yendo**: *leer → leyendo*, *oír → oyendo*, *construir → construyendo*
- los verbos en -ir con cambio de raíz usan el débil: *dormir → durmiendo*, *pedir → pidiendo*, *sentir → sintiendo*

**Con estar**, indica que la acción ocurre ahora mismo:
- *Estoy comiendo.*

**La trampa.** El inglés usa *-ing* mucho más de lo que el español usa el gerundio, y tres de esos usos son incorrectos aquí:
- **Futuro** — *I'm eating tomorrow* es *como mañana* o *voy a comer mañana*, nunca *estoy comiendo mañana*.
- **Como sustantivo** — *reading is fun* es *leer es divertido*, con **infinitivo**.
- **Describiendo a un sustantivo** — *a running man* es *un hombre que corre*, no *un hombre corriendo*.

El presente simple ya cubre hábitos y verdades generales: *hablo español* frente a *estoy hablando español*, que es lo que ocurre en este momento.

**Otros verbos también lo llevan**, y cada uno matiza: *sigue lloviendo*, *va mejorando*, *lleva dos horas esperando*.`,
    },
  },

  {
    id: 'pasiva',
    keywords: ['pasiva', 'voz pasiva', 'passive', 'passive voice', 'ser + participio',
      'se pasiva', 'pasiva refleja', 'fue escrito', 'was written', 'participio', 'participio pasado', 'past participle'],
    title: { es: 'La voz pasiva', en: 'The passive voice' },
    body: {
      en: `Spanish has three ways to avoid saying who did something, and the middle one is the one it actually uses.

**1. True passive — ser + past participle.** The participle **agrees** with the subject.
- *La carta fue escrita por María.* — The letter was written by María.
- *Las cartas fueron escritas.* — plural, so *escritas*.

Correct, but far less common than in English. Spanish reaches for it mainly when the agent is named, and mostly in writing.

**2. Passive se — what Spanish really says.** No agent, and the verb agrees with the thing.
- *Se habla español.* — Spanish is spoken.
- *Se venden casas.* — Houses are sold. (**plural**, because *casas* is)

This is the one on shop signs and in instructions, and it is what an English passive usually becomes.

**3. Third person plural, with no subject** — when a person did it but it does not matter who.
- *Dicen que va a llover.* — They say it's going to rain.
- *Me robaron la bicicleta.* — My bike was stolen.

**Estar + participle is not a passive.** It describes a resulting state, not an action:
- *La puerta fue cerrada* — the door was closed (someone closed it)
- *La puerta estaba cerrada* — the door was closed (it was shut)`,
      es: `El español tiene tres maneras de no decir quién hizo algo, y la del medio es la que de verdad se usa.

**1. Pasiva perifrástica — ser + participio.** El participio **concuerda** con el sujeto.
- *La carta fue escrita por María.*
- *Las cartas fueron escritas.*

Es correcta, pero mucho menos frecuente que en inglés: se emplea sobre todo cuando se nombra el agente, y más por escrito.

**2. Pasiva refleja — lo que el español dice de verdad.** Sin agente, y el verbo concuerda con la cosa.
- *Se habla español.*
- *Se venden casas.* (**plural**, porque *casas* lo es)

Es la de los carteles y las instrucciones, y en lo que suele convertirse una pasiva inglesa.

**3. Tercera persona del plural, sin sujeto** — cuando lo hizo alguien pero da igual quién.
- *Dicen que va a llover.*
- *Me robaron la bicicleta.*

**Estar + participio no es una pasiva.** Describe un estado resultante, no una acción:
- *La puerta fue cerrada* (alguien la cerró) · *La puerta estaba cerrada* (estaba así)`,
    },
  },

  {
    id: 'comparativo',
    keywords: ['comparativo', 'superlativo', 'comparative', 'superlative', 'más que', 'menos que',
      'tan como', 'mejor', 'peor', 'mayor', 'menor', 'comparisons', 'better', 'best'],
    title: { es: 'El comparativo y el superlativo', en: 'Comparative and superlative' },
    body: {
      en: `One pattern covers almost everything — there is no *-er* ending to learn.

- **más … que** — *Es **más** alto **que** yo.*
- **menos … que** — *Es **menos** caro **que** el otro.*
- **tan … como** — *Es **tan** alto **como** yo.* (as … as)
- With a noun rather than an adjective, "as much/many as" is **tanto … como**, and *tanto* agrees: *tantos libros como tú*.

**Than a number is *de*, not *que*:** *más de veinte*. This one costs marks.

**Superlative** — the comparative with a definite article in front:
- *el más alto*, *la más alta*, *los más altos*
- "in" after a superlative is **de**: *el más alto **de** la clase*, never *en*.

**The irregulars are the ones you will actually use:**

| | comparative | superlative |
| --- | --- | --- |
| bueno | **mejor** | el mejor |
| malo | **peor** | el peor |
| grande | **mayor** (older, greater) | el mayor |
| pequeño | **menor** (younger, lesser) | el menor |

*mayor* and *menor* are about age or importance; for physical size Spanish says *más grande* and *más pequeño*.

**-ísimo** is the other superlative, and it means "very", not "most": *guapísimo*, *carísima*, *facilísimo*. It replaces a final vowel and takes the spelling changes with it — *rico → riquísimo*, *largo → larguísimo*.`,
      es: `Un solo esquema cubre casi todo; no hay terminación que aprender.

- **más … que** — *Es **más** alto **que** yo.*
- **menos … que** — *Es **menos** caro **que** el otro.*
- **tan … como** — *Es **tan** alto **como** yo.*
- Con sustantivo se usa **tanto … como**, y *tanto* concuerda: *tantos libros como tú*.

**Ante un número se usa *de*, no *que*:** *más de veinte*.

**Superlativo** — el comparativo con artículo delante:
- *el más alto*, *la más alta*, *los más altos*
- El complemento va con **de**: *el más alto **de** la clase*, nunca *en*.

**Los irregulares son los que de verdad se usan:**

| | comparativo | superlativo |
| --- | --- | --- |
| bueno | **mejor** | el mejor |
| malo | **peor** | el peor |
| grande | **mayor** | el mayor |
| pequeño | **menor** | el menor |

*Mayor* y *menor* se refieren a la edad o a la importancia; para el tamaño se dice *más grande* y *más pequeño*.

**-ísimo** es el otro superlativo y significa "muy", no "el más": *guapísimo*, *carísima*, *facilísimo*. Sustituye a la vocal final y arrastra los cambios ortográficos — *rico → riquísimo*, *largo → larguísimo*.`,
    },
  },

  {
    id: 'articulos-genero',
    keywords: ['artículos', 'articulos', 'género', 'genero', 'articles', 'gender', 'el la los las',
      'un una', 'masculino o femenino', 'masculine feminine', 'plural', 'plurales', 'formar el plural'],
    title: { es: 'El género y los artículos', en: 'Gender and articles' },
    body: {
      en: `Every noun is masculine or feminine, and the article shows which.

| | masculine | feminine |
| --- | --- | --- |
| definite | **el** libro / **los** libros | **la** casa / **las** casas |
| indefinite | **un** libro / **unos** libros | **una** casa / **unas** casas |

**Guessing the gender.** The ending is the best clue:
- **-o** is usually masculine, **-a** usually feminine
- **-ción, -sión, -dad, -tad, -tud, -umbre** are feminine, always
- **-ma** from Greek is masculine: *el problema, el sistema, el tema, el idioma*
- Exceptions worth memorising: *el día*, *la mano*, *el mapa*, *la foto*, *la moto*

**A feminine noun starting with a stressed a- takes *el*** — for sound, not gender. It stays feminine, so the adjective does too:
- *el agua **fría***, *el águila, el hambre*
- and the plural goes back to normal: *las aguas*

**Two contractions are compulsory:** *a + el* → **al**, *de + el* → **del**. Never *a el* or *de el*.

**Plurals:** add **-s** after a vowel (*libro → libros*), **-es** after a consonant (*papel → papeles*). A final **-z** becomes **-c**: *lápiz → lápices*.

Spanish uses the definite article where English uses nothing — with general nouns (*me gusta **el** café*), with languages (*hablo **el** español*, though it is dropped right after *hablar*), with days (*el lunes* = on Monday), and with body parts and clothes where English uses a possessive (*me duele **la** cabeza*).`,
      es: `Todo sustantivo es masculino o femenino, y el artículo lo indica.

| | masculino | femenino |
| --- | --- | --- |
| determinado | **el** libro / **los** libros | **la** casa / **las** casas |
| indeterminado | **un** libro / **unos** libros | **una** casa / **unas** casas |

**Adivinar el género.** La terminación es la mejor pista:
- **-o** suele ser masculino; **-a**, femenino
- **-ción, -sión, -dad, -tad, -tud, -umbre** son siempre femeninos
- **-ma** de origen griego es masculino: *el problema, el sistema, el tema, el idioma*
- Excepciones que conviene saber: *el día*, *la mano*, *el mapa*, *la foto*, *la moto*

**Un sustantivo femenino que empieza por a- tónica lleva *el***, por razones de sonido, no de género. Sigue siendo femenino, y el adjetivo también:
- *el agua **fría***, *el águila*, *el hambre*
- en plural vuelve a la normalidad: *las aguas*

**Dos contracciones son obligatorias:** *a + el* → **al**, *de + el* → **del**.

**Plurales:** **-s** tras vocal (*libro → libros*), **-es** tras consonante (*papel → papeles*). La **-z** final pasa a **-c**: *lápiz → lápices*.

El español usa el artículo donde el inglés no pone nada: con sustantivos generales (*me gusta **el** café*), con los días (*el lunes*), y con partes del cuerpo y ropa donde el inglés usa posesivo (*me duele **la** cabeza*).`,
    },
  },

  {
    id: 'reflexivos',
    keywords: ['reflexivos', 'verbos reflexivos', 'reflexive', 'reflexive verbs', 'me te se nos os se',
      'levantarse', 'pronombres reflexivos', 'recíprocos'],
    title: { es: 'Los verbos reflexivos', en: 'Reflexive verbs' },
    body: {
      en: `A verb carried with a pronoun matching its subject: **me, te, se, nos, os, se**. The infinitive is quoted with *-se* on the end — *levantarse*.

*me levanto · te levantas · se levanta · nos levantamos · os levantáis · se levantan*

**Three kinds:**
- **reflexive** — the action comes back on the subject: *me lavo* (I wash myself)
- **reciprocal** — they do it to each other: *se escriben* (they write to each other)
- **idiomatic** — the pronoun is simply part of the verb: *acordarse de* (remember), *quejarse* (complain), *atreverse* (dare)

**Many change meaning with the pronoun**, and this is where the marks are:
- *ir* (to go) → *irse* (to leave) · *dormir* (to sleep) → *dormirse* (to fall asleep)
- *poner* (to put) → *ponerse* (to put on, to become) · *llevar* (to carry) → *llevarse* (to take away)
- *acordar* (to agree) → *acordarse* (to remember)

**Where the pronoun goes** — the same rule as any object pronoun:
- before the conjugated verb: *me levanto*, *no me levanto*
- attached to an infinitive or gerund, or before the whole thing: *voy a levantar**me*** or *me voy a levantar*
- attached to an affirmative command, before a negative one: *levánta**te***, but *no **te** levantes*

**With body parts and clothes, Spanish uses the definite article**, not a possessive, because the pronoun already says whose: *me lavo **las** manos* — I wash **my** hands.`,
      es: `Un verbo acompañado de un pronombre que reproduce el sujeto: **me, te, se, nos, os, se**. El infinitivo se cita con *-se* — *levantarse*.

*me levanto · te levantas · se levanta · nos levantamos · os levantáis · se levantan*

**Tres tipos:**
- **reflexivo** — la acción recae en el sujeto: *me lavo*
- **recíproco** — el uno al otro: *se escriben*
- **idiomático** — el pronombre forma parte del verbo: *acordarse de*, *quejarse*, *atreverse*

**Muchos cambian de sentido con el pronombre:**
- *ir* → *irse* · *dormir* → *dormirse*
- *poner* → *ponerse* · *llevar* → *llevarse*
- *acordar* → *acordarse*

**Dónde va el pronombre** — la regla de cualquier pronombre átono:
- delante del verbo conjugado: *me levanto*, *no me levanto*
- pegado al infinitivo o al gerundio, o delante de todo: *voy a levantar**me*** o *me voy a levantar*
- pegado al imperativo afirmativo, delante del negativo: *levánta**te***, pero *no **te** levantes*

**Con partes del cuerpo y ropa se usa el artículo**, no el posesivo, porque el pronombre ya dice de quién es: *me lavo **las** manos*.`,
    },
  },

];

/**
 * The profe's own interjections, used the way she used them. Spellings follow
 * the RAE: *olé* is the interjection "para animar y aplaudir"; *mecachis* is one
 * word, "para expresar extrañeza o contrariedad"; *la madre que me parió* is a
 * set phrase, so it keeps its *que*.
 *
 * Keyed by the kind of moment, not by the message — the tutor picks one when
 * something actually goes right or wrong, and stays quiet the rest of the time.
 */
export const EXCLAMATIONS = {
  good: ['¡Olé!', '¡Olé, olé!', '¡Olé ahí!'],
  bad: ['¡Mecachis en todo!', '¡Mecachis!', '¡Mecachis en la mar!'],
  wow: ['¡La madre que me parió!', '¡Ay, la madre que me parió!'],
};

/** Conversational openers the tutor answers without looking anything up. */
export const SMALL_TALK = [
  {
    match: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|hi|hello|que tal|como estas|como va)\b/,
    reply: {
      es: '¡Hola! Puedo conjugar verbos, buscar palabras en la RAE, traducir frases y explicarte puntos de gramática. ¿Por dónde empezamos?',
      en: "Hello! I can conjugate verbs, look words up in the RAE dictionary, translate phrases and explain grammar. Where would you like to start?",
    },
  },
  {
    match: /^(gracias|muchas gracias|thanks|thank you|ok|vale|genial|perfecto)\b/,
    reply: {
      es: '¡De nada! Pregúntame lo que necesites.',
      en: "You're welcome. Ask me anything else you need.",
    },
  },
  {
    match: /^(adios|hasta luego|chao|bye|goodbye)\b/,
    reply: { es: '¡Hasta luego! Buena suerte con el español.', en: 'See you! Good luck with your Spanish.' },
  },
];
