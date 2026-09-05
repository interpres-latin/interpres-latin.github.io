/**
 * Reference forms for the conjugation engine, checked against the RAE
 * paradigms. Run with `npm test`.
 */
import { conjugate, PERSONS } from '../public/js/lib/conjugator.js';

let checked = 0;
const failures = [];

function expect(verb, path, expected) {
  const result = conjugate(verb);
  if (!result.ok) {
    failures.push(`${verb} ${path}: engine error — ${result.error}`);
    return;
  }
  const actual = path.split('.').reduce((node, key) => node?.[key], result.table);
  const got = Array.isArray(expected)
    ? PERSONS.map((person) => actual?.[person]).join(', ')
    : actual;
  const want = Array.isArray(expected) ? expected.join(', ') : expected;
  checked += 1;
  if (got !== want) failures.push(`${verb} ${path}\n    expected: ${want}\n    actual:   ${got}`);
}

// --- regular models -------------------------------------------------------
expect('hablar', 'indicativo.presente', ['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan']);
expect('hablar', 'indicativo.preterito', ['hablé', 'hablaste', 'habló', 'hablamos', 'hablasteis', 'hablaron']);
expect('hablar', 'indicativo.imperfecto', ['hablaba', 'hablabas', 'hablaba', 'hablábamos', 'hablabais', 'hablaban']);
expect('hablar', 'indicativo.futuro', ['hablaré', 'hablarás', 'hablará', 'hablaremos', 'hablaréis', 'hablarán']);
expect('hablar', 'indicativo.condicional', ['hablaría', 'hablarías', 'hablaría', 'hablaríamos', 'hablaríais', 'hablarían']);
expect('hablar', 'indicativo.preteritoPerfecto', ['he hablado', 'has hablado', 'ha hablado', 'hemos hablado', 'habéis hablado', 'han hablado']);
expect('hablar', 'indicativo.preteritoAnterior', ['hube hablado', 'hubiste hablado', 'hubo hablado', 'hubimos hablado', 'hubisteis hablado', 'hubieron hablado']);
expect('hablar', 'subjuntivo.presente', ['hable', 'hables', 'hable', 'hablemos', 'habléis', 'hablen']);
expect('hablar', 'subjuntivo.imperfectoRa', ['hablara', 'hablaras', 'hablara', 'habláramos', 'hablarais', 'hablaran']);
expect('hablar', 'subjuntivo.imperfectoSe', ['hablase', 'hablases', 'hablase', 'hablásemos', 'hablaseis', 'hablasen']);
expect('hablar', 'subjuntivo.futuro', ['hablare', 'hablares', 'hablare', 'habláremos', 'hablareis', 'hablaren']);
expect('hablar', 'subjuntivo.pluscuamperfectoRa', ['hubiera hablado', 'hubieras hablado', 'hubiera hablado', 'hubiéramos hablado', 'hubierais hablado', 'hubieran hablado']);
expect('hablar', 'imperativo.afirmativo.tu', 'habla');
expect('hablar', 'imperativo.afirmativo.vosotros', 'hablad');
expect('hablar', 'imperativo.negativo.tu', 'no hables');
expect('hablar', 'formas.gerundio', 'hablando');
expect('hablar', 'formas.participio', 'hablado');

expect('comer', 'indicativo.presente', ['como', 'comes', 'come', 'comemos', 'coméis', 'comen']);
expect('comer', 'indicativo.preterito', ['comí', 'comiste', 'comió', 'comimos', 'comisteis', 'comieron']);
expect('comer', 'indicativo.imperfecto', ['comía', 'comías', 'comía', 'comíamos', 'comíais', 'comían']);
expect('comer', 'subjuntivo.presente', ['coma', 'comas', 'coma', 'comamos', 'comáis', 'coman']);
expect('comer', 'subjuntivo.imperfectoRa', ['comiera', 'comieras', 'comiera', 'comiéramos', 'comierais', 'comieran']);
expect('comer', 'imperativo.afirmativo.vosotros', 'comed');
expect('comer', 'formas.gerundio', 'comiendo');

expect('vivir', 'indicativo.presente', ['vivo', 'vives', 'vive', 'vivimos', 'vivís', 'viven']);
expect('vivir', 'indicativo.preterito', ['viví', 'viviste', 'vivió', 'vivimos', 'vivisteis', 'vivieron']);
expect('vivir', 'subjuntivo.presente', ['viva', 'vivas', 'viva', 'vivamos', 'viváis', 'vivan']);
expect('vivir', 'imperativo.afirmativo.vosotros', 'vivid');
expect('vivir', 'formas.gerundio', 'viviendo');

// --- orthographic changes -------------------------------------------------
expect('buscar', 'indicativo.preterito', ['busqué', 'buscaste', 'buscó', 'buscamos', 'buscasteis', 'buscaron']);
expect('buscar', 'subjuntivo.presente', ['busque', 'busques', 'busque', 'busquemos', 'busquéis', 'busquen']);
expect('llegar', 'indicativo.preterito', ['llegué', 'llegaste', 'llegó', 'llegamos', 'llegasteis', 'llegaron']);
expect('llegar', 'subjuntivo.presente', ['llegue', 'llegues', 'llegue', 'lleguemos', 'lleguéis', 'lleguen']);
expect('cruzar', 'indicativo.preterito', ['crucé', 'cruzaste', 'cruzó', 'cruzamos', 'cruzasteis', 'cruzaron']);
expect('averiguar', 'indicativo.preterito', ['averigüé', 'averiguaste', 'averiguó', 'averiguamos', 'averiguasteis', 'averiguaron']);
expect('coger', 'indicativo.presente', ['cojo', 'coges', 'coge', 'cogemos', 'cogéis', 'cogen']);
expect('coger', 'subjuntivo.presente', ['coja', 'cojas', 'coja', 'cojamos', 'cojáis', 'cojan']);
expect('dirigir', 'indicativo.presente', ['dirijo', 'diriges', 'dirige', 'dirigimos', 'dirigís', 'dirigen']);
expect('distinguir', 'indicativo.presente', ['distingo', 'distingues', 'distingue', 'distinguimos', 'distinguís', 'distinguen']);
expect('conocer', 'indicativo.presente', ['conozco', 'conoces', 'conoce', 'conocemos', 'conocéis', 'conocen']);
expect('conocer', 'subjuntivo.presente', ['conozca', 'conozcas', 'conozca', 'conozcamos', 'conozcáis', 'conozcan']);
expect('vencer', 'indicativo.presente', ['venzo', 'vences', 'vence', 'vencemos', 'vencéis', 'vencen']);
expect('leer', 'indicativo.preterito', ['leí', 'leíste', 'leyó', 'leímos', 'leísteis', 'leyeron']);
expect('leer', 'subjuntivo.imperfectoRa', ['leyera', 'leyeras', 'leyera', 'leyéramos', 'leyerais', 'leyeran']);
expect('leer', 'formas.gerundio', 'leyendo');
expect('leer', 'formas.participio', 'leído');
expect('construir', 'indicativo.presente', ['construyo', 'construyes', 'construye', 'construimos', 'construís', 'construyen']);
expect('construir', 'indicativo.preterito', ['construí', 'construiste', 'construyó', 'construimos', 'construisteis', 'construyeron']);
expect('construir', 'subjuntivo.presente', ['construya', 'construyas', 'construya', 'construyamos', 'construyáis', 'construyan']);
expect('construir', 'formas.gerundio', 'construyendo');
expect('construir', 'formas.participio', 'construido');
expect('gruñir', 'indicativo.preterito', ['gruñí', 'gruñiste', 'gruñó', 'gruñimos', 'gruñisteis', 'gruñeron']);
expect('gruñir', 'formas.gerundio', 'gruñendo');
expect('conducir', 'indicativo.presente', ['conduzco', 'conduces', 'conduce', 'conducimos', 'conducís', 'conducen']);
expect('conducir', 'indicativo.preterito', ['conduje', 'condujiste', 'condujo', 'condujimos', 'condujisteis', 'condujeron']);
expect('traducir', 'indicativo.preterito', ['traduje', 'tradujiste', 'tradujo', 'tradujimos', 'tradujisteis', 'tradujeron']);

// --- stem changes ---------------------------------------------------------
expect('pensar', 'indicativo.presente', ['pienso', 'piensas', 'piensa', 'pensamos', 'pensáis', 'piensan']);
expect('pensar', 'subjuntivo.presente', ['piense', 'pienses', 'piense', 'pensemos', 'penséis', 'piensen']);
expect('empezar', 'indicativo.preterito', ['empecé', 'empezaste', 'empezó', 'empezamos', 'empezasteis', 'empezaron']);
expect('empezar', 'subjuntivo.presente', ['empiece', 'empieces', 'empiece', 'empecemos', 'empecéis', 'empiecen']);
expect('contar', 'indicativo.presente', ['cuento', 'cuentas', 'cuenta', 'contamos', 'contáis', 'cuentan']);
expect('volver', 'indicativo.presente', ['vuelvo', 'vuelves', 'vuelve', 'volvemos', 'volvéis', 'vuelven']);
expect('volver', 'formas.participio', 'vuelto');
expect('jugar', 'indicativo.presente', ['juego', 'juegas', 'juega', 'jugamos', 'jugáis', 'juegan']);
expect('jugar', 'subjuntivo.presente', ['juegue', 'juegues', 'juegue', 'juguemos', 'juguéis', 'jueguen']);
expect('jugar', 'indicativo.preterito', ['jugué', 'jugaste', 'jugó', 'jugamos', 'jugasteis', 'jugaron']);
expect('pedir', 'indicativo.presente', ['pido', 'pides', 'pide', 'pedimos', 'pedís', 'piden']);
expect('pedir', 'indicativo.preterito', ['pedí', 'pediste', 'pidió', 'pedimos', 'pedisteis', 'pidieron']);
expect('pedir', 'subjuntivo.presente', ['pida', 'pidas', 'pida', 'pidamos', 'pidáis', 'pidan']);
expect('pedir', 'formas.gerundio', 'pidiendo');
expect('dormir', 'indicativo.presente', ['duermo', 'duermes', 'duerme', 'dormimos', 'dormís', 'duermen']);
expect('dormir', 'indicativo.preterito', ['dormí', 'dormiste', 'durmió', 'dormimos', 'dormisteis', 'durmieron']);
expect('dormir', 'subjuntivo.presente', ['duerma', 'duermas', 'duerma', 'durmamos', 'durmáis', 'duerman']);
expect('dormir', 'subjuntivo.imperfectoRa', ['durmiera', 'durmieras', 'durmiera', 'durmiéramos', 'durmierais', 'durmieran']);
expect('dormir', 'formas.gerundio', 'durmiendo');
expect('sentir', 'indicativo.preterito', ['sentí', 'sentiste', 'sintió', 'sentimos', 'sentisteis', 'sintieron']);
expect('sentir', 'subjuntivo.presente', ['sienta', 'sientas', 'sienta', 'sintamos', 'sintáis', 'sientan']);
expect('seguir', 'indicativo.presente', ['sigo', 'sigues', 'sigue', 'seguimos', 'seguís', 'siguen']);
expect('seguir', 'indicativo.preterito', ['seguí', 'seguiste', 'siguió', 'seguimos', 'seguisteis', 'siguieron']);
expect('seguir', 'subjuntivo.presente', ['siga', 'sigas', 'siga', 'sigamos', 'sigáis', 'sigan']);
expect('elegir', 'indicativo.presente', ['elijo', 'eliges', 'elige', 'elegimos', 'elegís', 'eligen']);
expect('oler', 'indicativo.presente', ['huelo', 'hueles', 'huele', 'olemos', 'oléis', 'huelen']);
expect('oler', 'subjuntivo.presente', ['huela', 'huelas', 'huela', 'olamos', 'oláis', 'huelan']);
expect('adquirir', 'indicativo.presente', ['adquiero', 'adquieres', 'adquiere', 'adquirimos', 'adquirís', 'adquieren']);
expect('enviar', 'indicativo.presente', ['envío', 'envías', 'envía', 'enviamos', 'enviáis', 'envían']);
expect('continuar', 'indicativo.presente', ['continúo', 'continúas', 'continúa', 'continuamos', 'continuáis', 'continúan']);
expect('reunir', 'indicativo.presente', ['reúno', 'reúnes', 'reúne', 'reunimos', 'reunís', 'reúnen']);
expect('prohibir', 'indicativo.presente', ['prohíbo', 'prohíbes', 'prohíbe', 'prohibimos', 'prohibís', 'prohíben']);
expect('torcer', 'indicativo.presente', ['tuerzo', 'tuerces', 'tuerce', 'torcemos', 'torcéis', 'tuercen']);
expect('cocer', 'indicativo.presente', ['cuezo', 'cueces', 'cuece', 'cocemos', 'cocéis', 'cuecen']);
expect('avergonzar', 'indicativo.presente', ['avergüenzo', 'avergüenzas', 'avergüenza', 'avergonzamos', 'avergonzáis', 'avergüenzan']);

// --- irregular verbs ------------------------------------------------------
expect('ser', 'indicativo.presente', ['soy', 'eres', 'es', 'somos', 'sois', 'son']);
expect('ser', 'indicativo.imperfecto', ['era', 'eras', 'era', 'éramos', 'erais', 'eran']);
expect('ser', 'indicativo.preterito', ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron']);
expect('ser', 'subjuntivo.presente', ['sea', 'seas', 'sea', 'seamos', 'seáis', 'sean']);
expect('ser', 'subjuntivo.imperfectoRa', ['fuera', 'fueras', 'fuera', 'fuéramos', 'fuerais', 'fueran']);
expect('ser', 'imperativo.afirmativo.tu', 'sé');
expect('ser', 'imperativo.afirmativo.vosotros', 'sed');

expect('estar', 'indicativo.presente', ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están']);
expect('estar', 'indicativo.preterito', ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvisteis', 'estuvieron']);
expect('estar', 'subjuntivo.presente', ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén']);
expect('estar', 'subjuntivo.imperfectoSe', ['estuviese', 'estuvieses', 'estuviese', 'estuviésemos', 'estuvieseis', 'estuviesen']);

expect('haber', 'indicativo.presente', ['he', 'has', 'ha', 'hemos', 'habéis', 'han']);
expect('haber', 'indicativo.futuro', ['habré', 'habrás', 'habrá', 'habremos', 'habréis', 'habrán']);
expect('haber', 'subjuntivo.presente', ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan']);

expect('ir', 'indicativo.presente', ['voy', 'vas', 'va', 'vamos', 'vais', 'van']);
expect('ir', 'indicativo.imperfecto', ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban']);
expect('ir', 'indicativo.preterito', ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron']);
expect('ir', 'subjuntivo.presente', ['vaya', 'vayas', 'vaya', 'vayamos', 'vayáis', 'vayan']);
expect('ir', 'imperativo.afirmativo.tu', 've');
expect('ir', 'imperativo.afirmativo.vosotros', 'id');
expect('ir', 'formas.gerundio', 'yendo');

expect('tener', 'indicativo.presente', ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen']);
expect('tener', 'indicativo.preterito', ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron']);
expect('tener', 'indicativo.futuro', ['tendré', 'tendrás', 'tendrá', 'tendremos', 'tendréis', 'tendrán']);
expect('tener', 'indicativo.condicional', ['tendría', 'tendrías', 'tendría', 'tendríamos', 'tendríais', 'tendrían']);
expect('tener', 'subjuntivo.presente', ['tenga', 'tengas', 'tenga', 'tengamos', 'tengáis', 'tengan']);
expect('tener', 'subjuntivo.imperfectoRa', ['tuviera', 'tuvieras', 'tuviera', 'tuviéramos', 'tuvierais', 'tuvieran']);
expect('tener', 'imperativo.afirmativo.tu', 'ten');

expect('hacer', 'indicativo.presente', ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen']);
expect('hacer', 'indicativo.preterito', ['hice', 'hiciste', 'hizo', 'hicimos', 'hicisteis', 'hicieron']);
expect('hacer', 'indicativo.futuro', ['haré', 'harás', 'hará', 'haremos', 'haréis', 'harán']);
expect('hacer', 'subjuntivo.presente', ['haga', 'hagas', 'haga', 'hagamos', 'hagáis', 'hagan']);
expect('hacer', 'imperativo.afirmativo.tu', 'haz');
expect('hacer', 'formas.participio', 'hecho');

expect('decir', 'indicativo.presente', ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen']);
expect('decir', 'indicativo.preterito', ['dije', 'dijiste', 'dijo', 'dijimos', 'dijisteis', 'dijeron']);
expect('decir', 'subjuntivo.imperfectoRa', ['dijera', 'dijeras', 'dijera', 'dijéramos', 'dijerais', 'dijeran']);
expect('decir', 'formas.gerundio', 'diciendo');
expect('decir', 'formas.participio', 'dicho');
expect('decir', 'imperativo.afirmativo.tu', 'di');

expect('poder', 'indicativo.presente', ['puedo', 'puedes', 'puede', 'podemos', 'podéis', 'pueden']);
expect('poder', 'indicativo.preterito', ['pude', 'pudiste', 'pudo', 'pudimos', 'pudisteis', 'pudieron']);
expect('poder', 'subjuntivo.presente', ['pueda', 'puedas', 'pueda', 'podamos', 'podáis', 'puedan']);
expect('poder', 'formas.gerundio', 'pudiendo');

expect('poner', 'indicativo.preterito', ['puse', 'pusiste', 'puso', 'pusimos', 'pusisteis', 'pusieron']);
expect('poner', 'indicativo.futuro', ['pondré', 'pondrás', 'pondrá', 'pondremos', 'pondréis', 'pondrán']);
expect('poner', 'imperativo.afirmativo.tu', 'pon');
expect('poner', 'formas.participio', 'puesto');

expect('ver', 'indicativo.presente', ['veo', 'ves', 've', 'vemos', 'veis', 'ven']);
expect('ver', 'indicativo.preterito', ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron']);
expect('ver', 'indicativo.imperfecto', ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían']);
expect('ver', 'formas.participio', 'visto');

expect('dar', 'indicativo.presente', ['doy', 'das', 'da', 'damos', 'dais', 'dan']);
expect('dar', 'indicativo.preterito', ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron']);
expect('dar', 'subjuntivo.presente', ['dé', 'des', 'dé', 'demos', 'deis', 'den']);

expect('saber', 'indicativo.presente', ['sé', 'sabes', 'sabe', 'sabemos', 'sabéis', 'saben']);
expect('saber', 'indicativo.preterito', ['supe', 'supiste', 'supo', 'supimos', 'supisteis', 'supieron']);
expect('saber', 'subjuntivo.presente', ['sepa', 'sepas', 'sepa', 'sepamos', 'sepáis', 'sepan']);

expect('querer', 'indicativo.presente', ['quiero', 'quieres', 'quiere', 'queremos', 'queréis', 'quieren']);
expect('querer', 'indicativo.preterito', ['quise', 'quisiste', 'quiso', 'quisimos', 'quisisteis', 'quisieron']);
expect('querer', 'indicativo.futuro', ['querré', 'querrás', 'querrá', 'querremos', 'querréis', 'querrán']);

expect('venir', 'indicativo.presente', ['vengo', 'vienes', 'viene', 'venimos', 'venís', 'vienen']);
expect('venir', 'indicativo.preterito', ['vine', 'viniste', 'vino', 'vinimos', 'vinisteis', 'vinieron']);
expect('venir', 'formas.gerundio', 'viniendo');
expect('venir', 'imperativo.afirmativo.tu', 'ven');

expect('salir', 'indicativo.presente', ['salgo', 'sales', 'sale', 'salimos', 'salís', 'salen']);
expect('salir', 'indicativo.futuro', ['saldré', 'saldrás', 'saldrá', 'saldremos', 'saldréis', 'saldrán']);
expect('salir', 'imperativo.afirmativo.tu', 'sal');

expect('traer', 'indicativo.presente', ['traigo', 'traes', 'trae', 'traemos', 'traéis', 'traen']);
expect('traer', 'indicativo.preterito', ['traje', 'trajiste', 'trajo', 'trajimos', 'trajisteis', 'trajeron']);
expect('traer', 'formas.gerundio', 'trayendo');

expect('caer', 'indicativo.presente', ['caigo', 'caes', 'cae', 'caemos', 'caéis', 'caen']);
expect('caer', 'indicativo.preterito', ['caí', 'caíste', 'cayó', 'caímos', 'caísteis', 'cayeron']);
expect('caer', 'formas.participio', 'caído');

expect('oír', 'indicativo.presente', ['oigo', 'oyes', 'oye', 'oímos', 'oís', 'oyen']);
expect('oír', 'indicativo.preterito', ['oí', 'oíste', 'oyó', 'oímos', 'oísteis', 'oyeron']);
expect('oír', 'indicativo.futuro', ['oiré', 'oirás', 'oirá', 'oiremos', 'oiréis', 'oirán']);
expect('oír', 'subjuntivo.presente', ['oiga', 'oigas', 'oiga', 'oigamos', 'oigáis', 'oigan']);
expect('oír', 'imperativo.afirmativo.vosotros', 'oíd');
expect('oír', 'formas.gerundio', 'oyendo');
expect('oír', 'formas.participio', 'oído');

expect('andar', 'indicativo.preterito', ['anduve', 'anduviste', 'anduvo', 'anduvimos', 'anduvisteis', 'anduvieron']);
expect('caber', 'indicativo.presente', ['quepo', 'cabes', 'cabe', 'cabemos', 'cabéis', 'caben']);
expect('caber', 'indicativo.preterito', ['cupe', 'cupiste', 'cupo', 'cupimos', 'cupisteis', 'cupieron']);
expect('caber', 'indicativo.futuro', ['cabré', 'cabrás', 'cabrá', 'cabremos', 'cabréis', 'cabrán']);
expect('reír', 'indicativo.presente', ['río', 'ríes', 'ríe', 'reímos', 'reís', 'ríen']);
expect('reír', 'indicativo.preterito', ['reí', 'reíste', 'rio', 'reímos', 'reísteis', 'rieron']);
expect('reír', 'indicativo.futuro', ['reiré', 'reirás', 'reirá', 'reiremos', 'reiréis', 'reirán']);

// --- prefixed derivatives -------------------------------------------------
expect('obtener', 'indicativo.presente', ['obtengo', 'obtienes', 'obtiene', 'obtenemos', 'obtenéis', 'obtienen']);
expect('obtener', 'indicativo.preterito', ['obtuve', 'obtuviste', 'obtuvo', 'obtuvimos', 'obtuvisteis', 'obtuvieron']);
expect('obtener', 'indicativo.futuro', ['obtendré', 'obtendrás', 'obtendrá', 'obtendremos', 'obtendréis', 'obtendrán']);
expect('obtener', 'imperativo.afirmativo.tu', 'obtén');
expect('proponer', 'indicativo.preterito', ['propuse', 'propusiste', 'propuso', 'propusimos', 'propusisteis', 'propusieron']);
expect('proponer', 'imperativo.afirmativo.tu', 'propón');
expect('proponer', 'formas.participio', 'propuesto');
expect('describir', 'formas.participio', 'descrito');
expect('descubrir', 'formas.participio', 'descubierto');
expect('devolver', 'indicativo.presente', ['devuelvo', 'devuelves', 'devuelve', 'devolvemos', 'devolvéis', 'devuelven']);
expect('devolver', 'formas.participio', 'devuelto');
expect('conseguir', 'indicativo.presente', ['consigo', 'consigues', 'consigue', 'conseguimos', 'conseguís', 'consiguen']);
expect('sonreír', 'indicativo.presente', ['sonrío', 'sonríes', 'sonríe', 'sonreímos', 'sonreís', 'sonríen']);
expect('sonreír', 'indicativo.preterito', ['sonreí', 'sonreíste', 'sonrió', 'sonreímos', 'sonreísteis', 'sonrieron']);
expect('satisfacer', 'indicativo.preterito', ['satisfice', 'satisficiste', 'satisfizo', 'satisficimos', 'satisficisteis', 'satisficieron']);
expect('satisfacer', 'formas.participio', 'satisfecho');
expect('mantener', 'indicativo.presente', ['mantengo', 'mantienes', 'mantiene', 'mantenemos', 'mantenéis', 'mantienen']);

// --- irregular participles ------------------------------------------------
expect('escribir', 'formas.participio', 'escrito');
expect('abrir', 'formas.participio', 'abierto');
expect('romper', 'formas.participio', 'roto');
expect('morir', 'formas.participio', 'muerto');
expect('resolver', 'formas.participio', 'resuelto');
expect('imprimir', 'formas.participio', 'impreso');

// --- reflexive input ------------------------------------------------------
const reflexive = conjugate('levantarse');
checked += 1;
if (!reflexive.ok || !reflexive.pronominal || reflexive.table.indicativo.presente.yo !== 'levanto') {
  failures.push(`levantarse: expected pronominal flag and "levanto", got ${JSON.stringify(reflexive.table?.indicativo?.presente?.yo)}`);
}

// --- rejection ------------------------------------------------------------
checked += 1;
if (conjugate('perro').ok) failures.push('perro: should be rejected, it is not an infinitive');

// --- report ---------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} conjugation checks passed`);
