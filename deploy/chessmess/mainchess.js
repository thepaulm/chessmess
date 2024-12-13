let squares = 8;
let board = null;

/* reset on reload pgn */
let moves = null;
let boardspace = null;
let boardspace_at = null;
let is_rotate = false;

let initial_gs = null;

let piece_images = new Map();

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

function make_position(row, file) {
    let charf = lower2alpha(file);
    let charr = num2alpha(row);
    return charf + charr;
}

function piece_to_square(board, piece, file, row) {
    if (is_rotate) {
        file = 7 - file;
        row = 7 - row;
    }
    var squares = 8;
    br = board.getBoundingClientRect();
    pr = piece.getBoundingClientRect();

    var sw = br.width / squares;
    var sh = br.height / squares;

    var px = br.x + (file * sw + (sw / 2)) - (pr.width / 2);
    var py = br.y + (row * sw + (sh / 2)) - (pr.height / 2);

    set_piece_location(piece, px, py);
}

function redraw_board() {
    for (let i = 1; i < squares + 1; i++) {
        for (let j = 0; j < squares; j++) {
            var piece = boardspace[i][j];
            if (piece != null) {
                piece_to_square(board, piece.image, bfile(piece.position), 7 - (brow(piece.position) - 1));
            }
        }
    }
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

function set_piece_image(board, piece, cpos) {
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

function place_piece_image(name, p, position) {
    var piece = new Piece(name, p, position);
    var prow = brow(position);
    var pfile = bfile(position);
    boardspace[prow][pfile] = piece;

    p.isdragging = false;
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

function place_piece(type, position) {
    var p = piece_images[type];
    p = p.cloneNode(true);
    p.style.position = 'absolute';
    set_piece_location(p, 0, 0);

    document.body.appendChild(p);

    p.onload = () => {
        p.style.position = 'absolute';
        set_piece_image(board, p, position);
    };

    place_piece_image(type, p, position);
}

function place_game_piece(gs, type, position) {
    var prow = brow(position);
    var pfile = bfile(position);

    gs[prow][pfile] = type;
}

function set_board_state(gs) {
    for (let row = 1; row <= squares; row++) {
        for (let file = 0; file < squares; file++) {

            /* handle gs is empty - just clear the boardspace */
            if (gs[row][file] == null && boardspace[row][file] != null) {
                piece_taken(row, file);
            } else if (gs[row][file] == null) {
                continue;
            } else {
                var piece = boardspace[row][file];
                var name = gs[row][file];
                if (piece != null) {
                    /* handle boardspace doesn't match - clear the boardspace and place */
                    if (piece.name != name) {
                        piece_taken(row, file);
                    } else {
                        continue;
                    }
                }
                place_piece(name, make_position(row, file));
            }
        }
    }
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

function make_pgn_handler(pgn_paste) {
    return async function (event) {
        reload_board();
        moves = parse_move_tree(pgn_paste.value);
        moves.set_initial_gs(initial_gs);
        print_moves();
        moves.console_out();
    }
}

function make_clear_handler(tarea) {
    return async function (event) {
        tarea.value = "";
        reload_board();
    }
}

async function rotate_board(event) {
    if (is_rotate) {
        board.style.transform = "";
        is_rotate = false;
    } else {
        board.style.transform = "rotate(180deg)";
        is_rotate = true;
    }
    redraw_board();
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

function is_row(m) {
    return ascii(m) >= ascii('1') && ascii(m) <= ascii('8');
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
        if (piece != null) {
            if (piece.type == 'K' && piece.color == "black") {
                return piece;
            }
        }
    } else {
        piece = piece_at('e1');
        if (piece != null) {
            if (piece.type == 'K' && piece.color == "white") {
                return piece;
            }
        }
    }
    return null;
}

function find_pawn_src(color, trow, tfile) {
    /* first check pawn one off */
    var p = boardspace[trow+1][tfile];
    if (p != null && p.type == "P" && p.color == color) {
        return p;
    }
    p = boardspace[trow-1][tfile];
    if (p != null && p.type == "P" && p.color == color) {
        return p;
    }

    /* check for first move double */
    if (trow == 4) {
        p = boardspace[trow-2][tfile];
        if (p != null && p.type == "P") {
            return p;
        }
    }
    if (trow == 5) {
        p = boardspace[trow + 2][tfile];
        if (p != null && p.type == "P") {
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

function find_knight_src(color, trow, tfile, filerestrict, rowrestrict) {
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

function find_bishop_pattern(type, color, trow, tfile, filerestrict, rowrestrict) {
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

function find_rook_pattern(type, color, trow, tfile) {
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

function find_bishop_src(color, trow, tfile, filerestrict, rowrestrict) {
    return find_bishop_pattern('B', color, trow, tfile, filerestrict);
}

function find_rook_src(color, trow, tfile, filerestrict, rowrestrict) {
    return find_rook_pattern('R', color, trow, tfile);
}

function find_queen_src(color, trow, tfile, filerestrict, rowrestrict) {
    var piece = find_bishop_pattern('Q', color, trow, tfile, filerestrict);
    if (piece == null) {
        piece = find_rook_pattern('Q', color, trow, tfile);
    }
    return piece;
}

function get_king(color, trow, tfile, rowoff, fileoff) {
    trow += rowoff;
    tfile += fileoff;

    if (trow > 0 && trow <= 8 && tfile >=0 && tfile < 8) {
        var piece = boardspace[trow][tfile];
        if (piece != null && piece.color == color && piece.type == "K") {
            return piece;
        }
    }
    return null;
}

function find_king_src(color, trow, tfile) {
    var piece = get_king(color, trow, tfile, -1, -1);
    if (piece != null) {
        return piece;
    }
    var piece = get_king(color, trow, tfile, -1, 0);
    if (piece != null) {
        return piece;
    }
    var piece = get_king(color, trow, tfile, -1, 1);
    if (piece != null) {
        return piece;
    }

    var piece = get_king(color, trow, tfile, 0, -1);
    if (piece != null) {
        return piece;
    }
    var piece = get_king(color, trow, tfile, 0, 1);
    if (piece != null) {
        return piece;
    }

    var piece = get_king(color, trow, tfile, 1, -1);
    if (piece != null) {
        return piece;
    }
    var piece = get_king(color, trow, tfile, 1, 0);
    if (piece != null) {
        return piece;
    }
    var piece = get_king(color, trow, tfile, 1, 1);
    if (piece != null) {
        return piece;
    }
    return null;
}

function find_rook_at(color, srow, sfile) {
    var piece = boardspace[srow][sfile];
    if (piece != null && piece.type == 'R' && piece.color == color) {
        return piece;
    }
    return null;
}

function find_src_type(color, type, trow, tfile, filerestrict, rowrestrict) {
    if (type == 'B') {
        return find_bishop_src(color, trow, tfile, filerestrict, rowrestrict);
    } else if (type == 'N') {
        return find_knight_src(color, trow, tfile, filerestrict, rowrestrict);
    } else if (type == 'Q') {
        return find_queen_src(color, trow, tfile, filerestrict, rowrestrict);
    } else if (type == 'R') {
        if (rowrestrict != null) {
            return find_rook_at(color, rowrestrict, tfile);
        } else if (filerestrict != null) {
            return find_rook_at(color, trow, filerestrict);
        } else {
            return find_rook_src(color, trow, tfile, filerestrict, rowrestrict);
        }
    } else if (type == "K") {
        return find_king_src(color, trow, tfile);
    }
    return null;
}

function piece_taken(row, file) {
    boardspace[row][file].remove_from_board();
    boardspace[row][file] = null;
}

function move_piece(piece, position, take, gs) {
    if (position == "O-O") {
        var rook = boardspace[brow(piece.position)][7];
        move_piece(rook, 'f' + piece.position[1], take, gs);
        move_piece(piece, 'g' + piece.position[1], take, gs);
    } else if (position == "O-O-O") {
        var rook = boardspace[brow(piece.position)][0];
        move_piece(rook, 'd' + piece.position[1], take, gs);
        move_piece(piece, 'c' + piece.position[1], take, gs);
    } else {
        var prow = brow(piece.position);
        var pfile = bfile(piece.position);
        boardspace[prow][pfile] = null;
        gs[prow][pfile] = null;

        prow = brow(position);
        pfile = bfile(position);
        if (take) {
            if (boardspace[prow][pfile] == null) {
                /* check for en passant */
                if (piece.type == 'P') {
                    if (piece.color == "black" && prow == 3) {
                        if (boardspace[prow+1][pfile].type == "P" && boardspace[prow+1][pfile].color == "white") {
                            piece_taken(prow + 1, pfile);
                            gs[prow][pfile] = null;
                        } else {
                            console.log("Supposed to take? (en passant black) Not here: " + position);
                        }
                    } else if (piece.color == "white" && prow == 6) {
                        if (boardspace[prow-1][pfile].type == "P" && boardspace[prow-1][pfile].color == "black") {
                            piece_taken(prow - 1, pfile);
                            gs[prow][pfile] = null;
                        } else {
                            console.log("Supposed to take? (en passant white) Not here: " + position);
                        }
                    } else {
                        console.log("Supposed to take? (en passant) Not here: " + position);
                    }
                } else {
                    console.log("Supposed to take? Not here: " + position);
                }
            } else {
                piece_taken(prow, pfile);
            }
        }
        boardspace[prow][pfile] = piece;
        gs[prow][pfile] = piece.name;

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

function run_move(move, gs) {
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
        var rowrestrict = null;
        if (is_file(move.move[1]) && is_file(move.move[2])) {
            movestr = move.move.substr(2);
            filerestrict = ascii(move.move[1]) - ascii('a');
        } else if (is_row(move.move[1])) {
            movestr = move.move.substr(2);
            rowrestrict = ascii(move.move[1]) - ascii('0');
        } else if (is_takes(move.move[1])) {
            movestr = move.move.substr(2);
            take = true;
        } else {
            movestr = move.move.substr(1);
        }
        var trow = brow(movestr);
        var tfile = bfile(movestr);
        piece = find_src_type(move.color, move.move[0], trow, tfile, filerestrict, rowrestrict);
    } else if (move.move == "O-O" || move.move == "O-O-O") {
        movestr = move.move;
        piece = king_at_start(move.color);
    }

    if (piece != null) {
        move_piece(piece, movestr, take, gs);
    } else {
        console.log("CANT RUN: " + move.move);
    }
}

function prev_move() {
    var at = boardspace_at.prev;
    if (at == null) {
        console.log("No prev moves.");
        return;
    }
    set_board_state(at.gs);
    boardspace_at = at;
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
    console.log("[ " + boardspace_at.moves.length + " ] move no: " + boardspace_at.moveno + " is " + move.move);
    var gs = copy_gamespace(boardspace_at.gs);
    run_move(move, gs);
    boardspace_at = move.next;
    boardspace_at.set_gs(gs);
}

function key_press(k) {
    if (k.key == "ArrowRight") {
        make_move();
    } else if (k.key == "ArrowLeft") {
        prev_move();
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

function make_gamespace() {
    var gs = new Array(squares);
    /* adding 1 to the rows so we can index 1-8 like the moves are called */
    for (let i = 0; i < squares + 1; i++) {
        gs[i] = new Array(squares);
        for (let j = 0; j < squares; j++) {
            gs[i][j] = null;
        }
    }
    return gs;
}

function copy_gamespace(gs) {
    var newgs = make_gamespace();
    /* adding 1 to the rows so we can index 1-8 like the moves are called */
    for (let i = 0; i < squares + 1; i++) {
        for (let j = 0; j < squares; j++) {
            newgs[i][j] = gs[i][j];
        }
    }
    return newgs;
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

function load_piece_image(type, filename) {
    var p = new Image();
    p.onload = () => {
        p.style.position = 'absolute';
    }
    p.src = filename;
    piece_images[type] = p;
}

function reload_board() {
    clean_old_boardspace();
    make_boardspace();
    boardspace_at = null;

    load_piece_image('p', 'p.png');
    load_piece_image('P', 'P.png');
    load_piece_image('r', 'r.png');
    load_piece_image('R', 'R.png');
    load_piece_image('n', 'n.png');
    load_piece_image('N', 'N.png');
    load_piece_image('b', 'b.png');
    load_piece_image('B', 'B.png');
    load_piece_image('q', 'q.png');
    load_piece_image('Q', 'Q.png');
    load_piece_image('k', 'k.png');
    load_piece_image('K', 'K.png');
    load_piece_image('bad', 'annotation_bad.png')
    load_piece_image('good', 'annotation_good.png')

    var gs = make_gamespace();

    place_game_piece(gs, 'p', 'a7');
    place_game_piece(gs, 'p', 'b7');
    place_game_piece(gs, 'p', 'c7');
    place_game_piece(gs, 'p', 'd7');
    place_game_piece(gs, 'p', 'e7');
    place_game_piece(gs, 'p', 'f7');
    place_game_piece(gs, 'p', 'g7');
    place_game_piece(gs, 'p', 'h7');

    place_game_piece(gs, 'r', 'a8');
    place_game_piece(gs, 'n', 'b8');
    place_game_piece(gs, 'b', 'c8');
    place_game_piece(gs, 'q', 'd8');
    place_game_piece(gs, 'k', 'e8');
    place_game_piece(gs, 'b', 'f8');
    place_game_piece(gs, 'n', 'g8');
    place_game_piece(gs, 'r', 'h8');

    place_game_piece(gs, 'P', 'a2');
    place_game_piece(gs, 'P', 'b2');
    place_game_piece(gs, 'P', 'c2');
    place_game_piece(gs, 'P', 'd2');
    place_game_piece(gs, 'P', 'e2');
    place_game_piece(gs, 'P', 'f2');
    place_game_piece(gs, 'P', 'g2');
    place_game_piece(gs, 'P', 'h2');

    place_game_piece(gs, 'R', 'a1');
    place_game_piece(gs, 'N', 'b1');
    place_game_piece(gs, 'B', 'c1');
    place_game_piece(gs, 'Q', 'd1');
    place_game_piece(gs, 'K', 'e1');
    place_game_piece(gs, 'B', 'f1');
    place_game_piece(gs, 'N', 'g1');
    place_game_piece(gs, 'R', 'h1');

    set_board_state(gs);
    if (initial_gs == null) {
        initial_gs = gs;
    }
}

(function () {
    board = document.getElementById('board')
    board.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });
    var pgn_paste = document.getElementById('pgn_paste');
    var clear = document.getElementById('clear');
    var rotate = document.getElementById('rotate');
    pgn_paste.style.width = board.width;
    pgn_paste.style.height = board.width / 4;

    var pgn_run = document.getElementById('pgn_run');
    pgn_run.addEventListener('click', make_pgn_handler(pgn_paste));
    clear.addEventListener('click', make_clear_handler(pgn_paste));
    rotate.addEventListener('click', rotate_board);

    document.onkeydown = key_press;

    reload_board();

})();

