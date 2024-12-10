/*

MoveTree
  [w              w              w               w]
 [b b b]        [b b]           [b]            [b b b]
 [w w] [w] [w]  [w] [w]       [w w w w w]    [w] [w] [w w w ]

 */

class Move {
    constructor(color, move_number, move, prev) {
        this.color = color;
        this.move_number = move_number;
        this.move = move;
        var nextcolor;
        if (color == "white") {
            nextcolor = "black";
        } else {
            nextcolor = "white";
        }
        this.next = new MoveOptionNode(nextcolor, prev);
    }
}
class MoveOptionNode {
    constructor(color, prev) {
        this.color = color;
        this.moves = new Array();
        this.gs = null;
        this.prev = prev;
        this.moveno = 1;
    }

    set_moveno(moveno) {
        this.moveno = moveno;
    }

    set_gs(gs) {
        this.gs = gs;
    }

    add_move(move_number, move) {
        var nextm = new Move(this.color, move_number, move, this);
        var pushno = this.moves.push(nextm);
        return nextm.next;
    }
}

class MoveTree {
    constructor() {
        this.top = new MoveOptionNode("white", null);
    }
    set_initial_gs(gs) {
        this.top.gs = gs;
    }
    console_out() {
        function recur_console(at) {
            console.log(at.moveno + ": " + at.color + " has " + at.moves.length + " moves.");
            for (let i = 0; i < at.moves.length; i++) {
                console.log("(");
                console.log("   " + at.moves[i].move);
                console.log(")");
            }
            for (let i = 0; i < at.moves.length; i++) {
                console.log(" --->  move " + i + ": " + at.moves[i].move);
                recur_console(at.moves[i].next);
            }
        }
        recur_console(this.top);
    }
}

function parse_move_tree(text) {
    var mt = new MoveTree();
    var at = mt.top;

    var i = 0;
    var moveno = 1;
    var handle_alt = false;
    var branch_stack = new Array();

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

        /* Handle ( alternate sequence */
        if (text[i] == '(') {
            handle_alt = true;
            i++;
            continue;
        }

        /* Handle ) close anternate */
        if (text[i] == ')') {
            at = branch_stack.pop();
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
            if (handle_alt) {
                branch_stack.push(at);
                while (at.moveno != moveno) {
                    at = at.prev;
                }
                while (at.prev != null && at.prev.moveno == moveno) {
                    at = at.prev;
                }
                handle_alt = false;
            } else {
                at.set_moveno(moveno);
            }
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

        at = at.add_move(moveno, move);
        at.set_moveno(moveno);

        /* Stop parsing at checkmate */
        if (move.length > 0 && move[move.length-1] == '#') {
            break;
        }
    }
    
    return mt;
}

