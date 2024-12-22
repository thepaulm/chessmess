function random_range(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

function ascii(c) {
    return c.charCodeAt(0);
}

function num2alpha(n) {
    return String.fromCharCode(ascii('0') + n);
}

function lower2alpha(l) {
    return String.fromCharCode(ascii('a') + l);
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

function islower(a) {
    return ascii(a) >= ascii('a') && ascii(a) <= ascii('z');
}

function upper(a) {
    if (ascii(a) >= ascii('a') && ascii(a) <= ascii('z')) {
        return String.fromCharCode(ascii('A') + (ascii(a) - ascii('a')));
    }
    return a;
}

function lower(a) {
    if (ascii(a) >= ascii('A') && ascii(a) <= ascii('Z')) {
        return String.fromCharCode(ascii('a') + (ascii(a) - ascii('A')));
    }
    return a;
}

function bfile_name(file) {
    return String.fromCharCode(ascii('a') + file);
}

function brow_name(row) {
    return String.fromCharCode(ascii('0') + row);
}
