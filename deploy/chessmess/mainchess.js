let squares = 8;
let board = null;

/* reset on reload pgn */
let moves = null;
let boardspace = null;
let boardspace_at = null;

function img_row(cpos) {
    return 8 - Number(cpos[1]);
}

function img_file(cpos) {
    return ascii(cpos[0]) - ascii('a');
}

function brow(cpos) {
    return Number(cpos[1]);
}

function bfile(cpos) {
    return ascii(cpos[0]) - ascii('a');
}

function set_piece_location(piece, x, y) {
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
}

function piece_to_square(board, piece, file, row) {
    var squares = 8;
    br = board.getBoundingClientRect();
    pr = piece.getBoundingClientRect();

    var sw = br.width / squares;
    var sh = br.height / squares;

    var px = br.x + (file * sw + (sw / 2)) - (pr.width / 2);
    var py = br.y + (row * sw + (sh / 2)) - (pr.height / 2);

    set_piece_location(piece, px, py);
}

function center_piece(board, piece) {
    var squares = 8;
    br = board.getBoundingClientRect();
    pr = piece.getBoundingClientRect();

    centerx = pr.left + pr.width / 2;
    centery = pr.top + pr.height / 2;
    var board_center_x = centerx - br.x;
    var board_center_y = centery - br.y;

    var sw = br.width / squares;
    var sh = br.height / squares;

    piece_to_square(board, piece, Math.floor(board_center_x / sw), Math.floor(board_center_y / sh));
}

function set_piece(board, piece, cpos) {
    var prow = img_row(cpos);
    var pfile = img_file(cpos);

    piece_to_square(board, piece, pfile, prow);
}

class Piece {
    constructor(name, image, position) {
        this.name = name;
        this.type = upper(name);
        this.image = image;
        this.position = position;
        if (islower(name[0])) {
            this.color = "black";
        } else {
            this.color = "white";
        }
    }
    remove_from_board() {
        this.image.parentElement.removeChild(this.image);
    }
}

function load_piece(name, filename, position) {
    var p = new Image();
    p.src = filename;
    p.isdragging = false;
    p.onload = () => {
        document.body.appendChild(p);
        p.style.position = 'absolute';
        set_piece(board, p, position);
    };

    var piece = new Piece(name, p, position);
    var prow = brow(position);
    var pfile = bfile(position);
    boardspace[prow][pfile] = piece;

    p.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        p.isdragging = true;
        function move(e) {
            if (!p.isdragging) return;

            var l = e.clientX - p.width / 2;
            var t = e.clientY - p.height / 2;
            set_piece_location(p, l, t);
        }

        function stop(e) {
            p.isdragging = false;
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', stop);

            center_piece(board, p);
        }

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', stop);
    });
}

function print_moves() {
    var at = moves.top;

    for (;;) {
        if (at.moves.length == 0) {
            return;
        }
        var move = at.moves[0];
        console.log(move.move_number + " " + move.color + ": " + move.move);
        at = move.next;
    }
}

function make_pgn_handler(board, pgn_paste) {
    return async function (event) {
        reload_board();
        moves = parse_move_tree(pgn_paste.value);
        print_moves();
    }
}

function is_loc(m) {
    return ascii(m) >= ascii('a') && ascii(m) <= ascii('h');
}

function is_piece(m) {
    return m == 'P' || m == 'R' || m == 'N' || m == 'B' || m == 'Q' || m == 'K';
}

function is_file(m) {
    return ascii(m) >= ascii('a') && ascii(m) <= ascii('h');
}

function is_takes(m) {
    return m == 'x';
}

function piece_at(position) {
    return boardspace[brow(position)][bfile(position)];
}

function king_at_start(color) {
    var piece = null;
    if (color == "black") {
        piece = piece_at('e8');
        if (piece.type == 'K' && piece.color == "black") {
            return piece;
        }
    } else {
        peice = piece_at('e1');
        if (piece.type == 'K' && piece.color == "white") {
            return peice;
        }
    }
    return null;
}

function find_pawn_src(color, trow, tfile) {
    /* first check pawn one off */
    var p = boardspace[trow+1][tfile];
    if (p != null && p.color == color) {
        return p;
    }
    p = boardspace[trow-1][tfile];
    if (p != null && p.color == color) {
        return p;
    }

    /* check for first move double */
    if (trow == 4) {
        p = boardspace[trow-2][tfile];
        if (p != null) {
            return p;
        }
    }
    if (trow == 5) {
        p = boardspace[trow + 2][tfile];
        if (p != null) {
            return p;
        }
    }
    return null;
}

function search_incr(color, type, rowdir, filedir, trow, tfile) {
    var srow = trow;
    var sfile = tfile;

    for (;;) {
        srow += rowdir;
        sfile += filedir;
        if (srow < 1 || sfile < 0 || srow > 8 || sfile > 7) {
            return null;
        }

        var piece = boardspace[srow][sfile];
        if (piece == null) {
            continue;
        }
        if (piece.color != color) {
            return null;
        }
        if (piece.type != type) {
            return null;
        }
        return piece;
    }
}

function find_knight_src(color, trow, tfile, filerestrict) {
    var srow = trow;
    var sfile = tfile;

    srow = trow + 2;
    if (srow <= 8) {
        sfile = tfile + 1;
        if (sfile < 8) {
            if (filerestrict == null || filerestrict == sfile) {
                var piece = boardspace[srow][sfile];
                if (piece != null && piece.color == color && piece.type == 'N') {
                    return piece;
                }
            }
        }
        sfile = tfile - 1;
        if (sfile >= 0) {
            if (filerestrict == null || filerestrict == sfile) {
                var piece = boardspace[srow][sfile];
                if (piece != null && piece.color == color && piece.type == 'N') {
                    return piece;
                }
            }
        }
    }
    srow = trow - 2;
    if (srow > 0) {
        sfile = tfile + 1;
        if (sfile < 8) {
            if (filerestrict == null || filerestrict == sfile) {
                var piece = boardspace[srow][sfile];
                if (piece != null && piece.color == color && piece.type == 'N') {
                    return piece;
                }
            }
        }
        sfile = tfile - 1;
        if (sfile >= 0) {
            if (filerestrict == null || filerestrict == sfile) {
                var piece = boardspace[srow][sfile];
                if (piece != null && piece.color == color && piece.type == 'N') {
                    return piece;
                }
            }
        }
    }
    srow = trow + 1;
    if (srow <= 8) {
        sfile = tfile + 2;
        if (sfile < 8) {
            if (filerestrict == null || filerestrict == sfile) {
                var piece = boardspace[srow][sfile];
                if (piece != null && piece.color == color && piece.type == 'N') {
                    return piece;
                }
            }
        }
        sfile = tfile - 2;
        if (sfile >= 0) {
            if (filerestrict == null || filerestrict == sfile) {
                var piece = boardspace[srow][sfile];
                if (piece != null && piece.color == color && piece.type == 'N') {
                    return piece;
                }
            }
        }
    }
    srow = trow - 1;
    if (srow > 0) {
        sfile = tfile + 2;
        if (sfile < 8) {
            if (filerestrict == null || filerestrict == sfile) {
                var piece = boardspace[srow][sfile];
                if (piece != null && piece.color == color && piece.type == 'N') {
                    return piece;
                }
            }
        }
        sfile = tfile - 2;
        if (sfile >= 0) {
            if (filerestrict == null || filerestrict == sfile) {
                var piece = boardspace[srow][sfile];
                if (piece != null && piece.color == color && piece.type == 'N') {
                    return piece;
                }
            }
        }
    }
    return null;
}

function find_bishop_pattern(type, color, trow, tfile, filerestrict) {
    var ret = null;
    ret = search_incr(color, type, 1, 1, trow, tfile);
    if (ret != null) {
        return ret;
    }
    ret = search_incr(color, type, -1, 1, trow, tfile);
    if (ret != null) {
        return ret;
    }
    ret = search_incr(color, type, 1, -1, trow, tfile);
    if (ret != null) {
        return ret;
    }
    ret = search_incr(color, type, -1, -1, trow, tfile);
    if (ret != null) {
        return ret;
    }
    return null;
}

function find_rook_pattern(type, color, trow, tfile, filerestrict) {
    var ret = null;
    ret = search_incr(color, type, 0, 1, trow, tfile);
    if (ret != null) {
        return ret;
    }
    ret = search_incr(color, type, 0, -1, trow, tfile);
    if (ret != null) {
        return ret;
    }
    ret = search_incr(color, type, 1, 0, trow, tfile);
    if (ret != null) {
        return ret;
    }
    ret = search_incr(color, type, -1, 0, trow, tfile);
    if (ret != null) {
        return ret;
    }
    return null;
}

function find_bishop_src(color, trow, tfile, filerestrict) {
    return find_bishop_pattern('B', color, trow, tfile, filerestrict);
}

function find_rook_src(color, trow, tfile, filerestrict) {
    return find_rook_pattern('R', color, trow, tfile, filerestrict);
}

function find_queen_src(color, trow, tfile, filerestrict) {
    var piece = find_bishop_pattern('Q', color, trow, tfile, filerestrict);
    if (piece == null) {
        piece = find_rook_pattern('Q', color, trow, tfile, filerestrict);
    }
    return piece;
}

function find_king_src(color, trow, tfile) {
    return null;
}

function find_src_type(color, type, trow, tfile, filerestrict) {
    if (type == 'B') {
        return find_bishop_src(color, trow, tfile, filerestrict);
    } else if (type == 'N') {
        return find_knight_src(color, trow, tfile, filerestrict);
    } else if (type == 'Q') {
        return find_queen_src(color, trow, tfile, filerestrict);
    } else if (type == 'R') {
        return find_rook_src(color, trow, tfile, filerestrict);
    } else if (type == "K") {
        return find_king_src(color, trow, tfile);
    }
    return null;
}

function move_piece(piece, position, take) {
    if (position == "O-O") {
        var rook = boardspace[brow(piece.position)][7];
        move_piece(rook, 'f' + piece.position[1], take);
        move_piece(piece, 'g' + piece.position[1], take);
    } else {
        var prow = brow(piece.position);
        var pfile = bfile(piece.position);
        boardspace[prow][pfile] = null;

        prow = brow(position);
        pfile = bfile(position);
        if (take) {
            if (boardspace[prow][pfile] == null) {
                console.log("Supposed to take? Not here: " + position);
            } else {
                boardspace[prow][pfile].remove_from_board();
            }
        }
        boardspace[prow][pfile] = piece;

        prow = img_row(position);
        pfile = img_file(position);
        piece_to_square(board, piece.image, pfile, prow);
        piece.position = position;
    }
}

function find_attack_pawn(move) {
    var trow;
    var tfile = bfile(move.move);
    var movestr = move.move.substr(2);
    if (move.color == 'white') {
        trow = brow(movestr) - 1;
    } else {
        trow = brow(movestr) + 1;
    }
    piece = boardspace[trow][tfile];
    return piece;
}

function run_move(move) {
    console.log("run: " + move.move);
    var piece = null;
    var movestr = null;
    var take = false;

    if (is_loc(move.move[0])) {
        if (is_takes(move.move[1])) {
            movestr = move.move.substr(2);
            take = true;
            piece = find_attack_pawn(move);
        } else {
            movestr = move.move;
            var trow = brow(movestr);
            var tfile = bfile(movestr);
            piece = find_pawn_src(move.color, trow, tfile);
        }
    } else if (is_piece(move.move[0])) {
        var filerestrict = null;
        if (is_file(move.move[1]) && is_file(move.move[2])) {
            movestr = move.move.substr(2);
            filerestrict = ascii(move.move[1]) - ascii('a');
        } else if (is_takes(move.move[1])) {
            movestr = move.move.substr(2);
            take = true;
        } else {
            movestr = move.move.substr(1);
        }
        var trow = brow(movestr);
        var tfile = bfile(movestr);
        piece = find_src_type(move.color, move.move[0], trow, tfile, filerestrict);
    } else if (move.move == "O-O") {
        movestr = move.move;
        piece = king_at_start(move.color);
    }

    if (piece != null) {
        move_piece(piece, movestr, take);
    } else {
        console.log("CANT RUN: " + move.move);
    }

}

function make_move() {
    if (moves == null) {
        console.log("Load pgn first");
        return;
    }
    if (boardspace_at == null) {
        boardspace_at = moves.top;
    }
    if (boardspace_at.moves.length == 0) {
        console.log("end of the game buddy");
        return;
    }
    var move = boardspace_at.moves[0]; // could be a choice here
    run_move(move);
    boardspace_at = move.next;
}

function key_press(k) {
    if (k.key == "ArrowRight") {
        make_move();
    } else if (k.key == "ArrowLeft") {
        console.log("last move");
    }
}

function make_boardspace() {
    boardspace = new Array(squares);
    /* adding 1 to the rows so we can index 1-8 like the moves are called */
    for (let i = 0; i < squares + 1; i++) {
        boardspace[i] = new Array(squares);
        for (let j = 0; j < squares; j++) {
            boardspace[i][j] = null;
        }
    }
}

function clean_old_boardspace() {
    if (boardspace != null) {
        for (let i = 0; i < squares + 1; i++) {
            for (let j = 0; j < squares; j++) {
                if (boardspace[i][j] != null) {
                    var p = boardspace[i][j];
                    p.remove_from_board();
                }
            }
        }
    }
}

function reload_board() {
    clean_old_boardspace();
    make_boardspace();
    boardspace_at = null;

    load_piece('p', 'p.png', 'a7');
    load_piece('p', 'p.png', 'b7');
    load_piece('p', 'p.png', 'c7');
    load_piece('p', 'p.png', 'd7');
    load_piece('p', 'p.png', 'e7');
    load_piece('p', 'p.png', 'f7');
    load_piece('p', 'p.png', 'g7');
    load_piece('p', 'p.png', 'h7');

    load_piece('r', 'r.png', 'a8');
    load_piece('n', 'n.png', 'b8');
    load_piece('b', 'b.png', 'c8');
    load_piece('q', 'q.png', 'd8');
    load_piece('k', 'k.png', 'e8');
    load_piece('b', 'b.png', 'f8');
    load_piece('n', 'n.png', 'g8');
    load_piece('r', 'r.png', 'h8');

    load_piece('P', 'P.png', 'a2');
    load_piece('P', 'P.png', 'b2');
    load_piece('P', 'P.png', 'c2');
    load_piece('P', 'P.png', 'd2');
    load_piece('P', 'P.png', 'e2');
    load_piece('P', 'P.png', 'f2');
    load_piece('P', 'P.png', 'g2');
    load_piece('P', 'P.png', 'h2');

    load_piece('R', 'R.png', 'a1');
    load_piece('N', 'N.png', 'b1');
    load_piece('B', 'B.png', 'c1');
    load_piece('Q', 'Q.png', 'd1');
    load_piece('K', 'K.png', 'e1');
    load_piece('B', 'B.png', 'f1');
    load_piece('N', 'N.png', 'g1');
    load_piece('R', 'R.png', 'h1');
}

(function () {
    board = document.getElementById('board')
    board.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });
    var pgn_paste = document.getElementById('pgn_paste');
    pgn_paste.style.width = board.width;
    pgn_paste.style.height = board.width / 4;

    var pgn_run = document.getElementById('pgn_run');
    pgn_run.addEventListener('click', make_pgn_handler(board, pgn_paste));

    document.onkeydown = key_press;

    reload_board();

})();

