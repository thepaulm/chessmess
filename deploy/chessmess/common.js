function ascii(c) {
    return c.charCodeAt(0);
}

function isnum(c) {
    return ascii(c) >= ascii('0') && ascii(c) <= ascii('9');
}

function tonum(c) {
    return ascii(c) - ascii('0');
}

function isspace(c) {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}
