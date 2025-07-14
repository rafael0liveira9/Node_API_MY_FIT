const forbiddenWords = [
    // Português
    "porra", "puta", "putinha", "puto", "caralho", "carai", "cacete", "merda", "bosta", "cu", "foda", "fodase", "foda-se",
    "pqp", "vai tomar no cu", "vai se foder", "vai se ferrar", "fdp", "desgraça", "inferno", "diabo", "corno", "corna",
    "buceta", "xereca", "xota", "xibiu", "arrombado", "arrombada", "vagabunda", "vagabundo", "trouxa", "otário", "otaria",
    "piranha", "babaca", "nojento", "nojenta", "escroto", "escrota",

    // Variações com números e juntas
    "filhodaputa", "filhadaputa", "filhodaput4", "filhadaput4", "f1lhodaputa", "f1lhodaput4",
    "vai tomarnocu", "vaisefoder", "vaifoder", "vaisefude", "vaitomanocu", "vai-tomar-no-cu",

    // Espanhol
    "mierda", "joder", "puta", "puto", "gilipollas", "coño", "pendejo", "pendeja", "cabron", "cabrona", "chinga", "chingar",
    "chingado", "chingate", "hijueputa", "malparido", "concha", "pelotudo", "boludo",

    // Inglês
    "fuck", "fucking", "motherfucker", "shit", "bitch", "bastard", "asshole", "dick", "pussy", "cunt", "fag", "faggot",
    "douche", "slut", "whore", "cock", "retard", "nigger", "nigga", "suckmydick", "suckdick", "goddamn", "damn", "hell",

    // Compactadas e estilizadas
    "fck", "fcku", "fcking", "sh1t", "sh!t", "b1tch", "b!tch", "s3x", "fuk", "fukin", "fk", "fu", "btch", "d1ck", "c0ck",
];

function textCheck(text) {
    const regex = new RegExp(`(${forbiddenWords.join('|')})`, 'gi');

    const hasForbidden = regex.test(text);

    const censoredText = text.replace(regex, '***');

    return {
        ok: !hasForbidden,
        text: censoredText,
    };
}

// function textCheck(text) {
//     const regex = new RegExp(`(${forbiddenWords.join('|')})`, 'gi');
//     return text.replace(regex, (match) => '*'.repeat(match.length));
// }


const ImageNamesConvert = (string) => {
    if (!string) return '';

    const sanitized = string
        .toLowerCase()
        .replace(/[^a-z0-9 .]/g, '')
        .replace(/ /g, '-');

    return sanitized;
};

module.exports = { ImageNamesConvert, textCheck };
