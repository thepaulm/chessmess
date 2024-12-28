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
    copy(prev) {
        var me = new Move(this.color, this.move_number, this.move, prev);
        return me;
    }
    walk(paths) {
        if (this.next.moves.length == 0) {
            var pcopy = this.next.prev.copy();
            var mecopy = this.copy(pcopy);
            pcopy.moves.push(mecopy);

            /* get to copy of the root and add to the list */
            var at = pcopy;
            while (at.prev != null) {
                at = at.prev;
            }
            at.validate();
            paths.push(at);

        } else {
            this.next.walk(paths);
        }
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

    string() {
        var str = "";
        var at = this;

        if (at.color == "white") {
            str += at.moveno + ".";
            str += " " + at.moves[0].move;
        }
        while (at.moves[0].next.moves.length > 0) {
            at = at.moves[0].next;
            if (at.color == "white") {
                str += " " + at.moveno + ".";
            }
            str += " " + at.moves[0].move;
        }
        return str;
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

    walk(paths) {
        for (let i = 0; i < this.moves.length; i++) {
            this.moves[i].walk(paths);
        }
    }

    copy() {
        if (this.prev == null) {
            var me = new MoveOptionNode(this.color, null);
            me.gs = this.gs;
            return me;
        }
        // in order to make a copy of myself, I need a copy of my parent. In order to copy my parent I need to
        // know which move of my parent got me here.
        var pcopy = this.prev.copy();
        var me = new MoveOptionNode(this.color, pcopy);
        me.moveno = this.moveno;

        for (let i = 0; i < this.prev.moves.length; i++) {
            if (this.prev.moves[i].next == this) {
                pcopy.moves.push(this.prev.moves[i].copy(pcopy));
                pcopy.moves[0].next = me;
                break;
            }
        }
        return me;
    }
    validate() {
        if (this.moves.length > 1) {
            console.log("VALIDATE FAIL.");
        }
        for (let i = 0; i < this.moves.length; i++) {
            if (this.moves[i].next != null) {
                this.moves[i].next.validate();
            }
        }
    }
}

class MoveTree {
    constructor() {
        this.top = new MoveOptionNode("white", null);
        this.paths = null;
    }
    set_initial_gs(gs) {
        this.top.gs = gs;
    }
    linearize() {
        this.paths = new Array();
        this.top.walk(this.paths);
        for (let i = 0; i < this.paths.length; i++) {
            this.paths[i].validate();
            var pathstr = this.paths[i].string();
            console.log("PATH: " + pathstr);
        }
    }
    random_start() {
        if (this.paths == null || this.paths.length == 0) {
            console.log("Asked to start but no paths.");
            return;
        }
        var which = random_range(0, this.paths.length);
        console.log("I have a choice of " + this.paths.length + " options, I am choosing number " + which);
        return this.paths[which];
    }
    console_out() {
        function recur_console(at) {
            console.log(at.moveno + ": " + at.color + " has " + at.moves.length + " moves.");
            for (let i = 0; i < at.moves.length; i++) {
                console.log("( " + at.moves[i].move + " )");
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
    var branch_black = null;

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
                    branch_black = at;
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
            at = branch_black;
            continue;
        }
        /* Handle dumb star */
        if (move == "*") {
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

