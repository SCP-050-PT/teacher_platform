/**
 * Нормализация и мягкое сравнение ФИО
 * «Андреев Н. А.» ≈ «Андреев Н.А.» ≈ «Андреев Николай Александрович»
 */

function normalizeFio(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[,«»"']/g, ' ')
        .replace(/\s*\.\s*/g, '.')
        .replace(/\./g, '. ')
        .replace(/\s+/g, ' ')
        .trim();
}

function fioMatchKey(str) {
    const n = normalizeFio(str);
    if (!n) return null;

    const parts = n.split(' ').filter(Boolean);
    if (!parts.length) return null;

    const lastName = parts[0].replace(/\./g, '');
    if (!lastName) return null;

    let nameL = '';
    let patrL = '';

    if (parts.length === 1) {
        return `${lastName}||`;
    }

    const rest = parts.slice(1).join(' ');
    const compact = rest.replace(/\s/g, '').replace(/\./g, '');

    if (compact.length <= 3 && /^[a-zа-я]{1,3}$/i.test(compact)) {
        nameL = compact[0] || '';
        patrL = compact[1] || '';
    } else {
        nameL = (parts[1] || '').replace(/\./g, '')[0] || '';
        patrL = (parts[2] || '').replace(/\./g, '')[0] || '';
    }

    return `${lastName}|${nameL}|${patrL}`;
}

function fioKeysMatch(a, b) {
    const ka = fioMatchKey(a);
    const kb = fioMatchKey(b);
    if (!ka || !kb) return false;
    const [la, na, pa] = ka.split('|');
    const [lb, nb, pb] = kb.split('|');
    if (la !== lb) return false;
    if ((!na && !pa) || (!nb && !pb)) {
        return normalizeFio(a) === normalizeFio(b);
    }
    if (na && nb && na !== nb) return false;
    if (pa && pb && pa !== pb) return false;
    return true;
}

module.exports = { normalizeFio, fioMatchKey, fioKeysMatch };