class MoveNode {
    constructor () {
        this.moves = new Array();
    }
}

class MoveTree {
    constructor() {
        this.top = new MoveNode();
    }
}

function parse_move_tree(text) {
    var mt = new MoveTree();
    var at = mt.top;

    var i = 0;
    var moveno = 1;
    var inmove = false;
    var whomove = 0;

    for (;;) {
        /* Skip leading whitespace */
        while (isspace(text[i])) {
            i++;
            if (i == text.length) {
                break;
            }
        }
        if (i == text.length) {
            break;
        }
        /* End skip leading white space */

        /* Handle [] comment */
        if (text[i] == '[') {
            while (text[i] != ']') {
                i++;
            }
            i++;
            continue;
        }

        /* Handle {} comment */
        if (text[i] == '{') {
            while (text[i] != '}') {
                i++;
            }
            i++;
            continue;
        }

        /* Handle move annotation */
        if (isnum(text[i])) {
            moveno = 0;
            while (isnum(text[i])) {
                moveno = moveno * 10;
                moveno += tonum(text[i]);
                i++;
            }
            if (text[i] == '.') {
                i++;
            }
            while (isspace(text[i])) {
                i++;
            }
            if (!inmove) {
                console.log("Move no: " + moveno);
            }
            inmove = true;
            continue;
        }

        /* Handle piece move annotation */
        var move = "";
        while (!isspace(text[i])) {
            move += text[i];
            i++;
            if (i >= text.length) {
                break;
            }
        }

        /* Handle redundant place */
        if (move == "..") {
            continue;
        }

        if (whomove == 0) {
            console.log("White move: " + move);
            whomove = 1;
        } else {
            console.log("Black move: " + move);
            whomove = 0;
            inmove = false;
        }

        /* Stop parsing at checkmate */
        if (move.length > 0 && move[move.length-1] == '#') {
            break;
        }
    }
    
    return mt;
}

