let squares = 8;
let board = null;
let donetext = null;

/* reset on reload pgn */
let moves = null;
let boardspace = null;
let boardspace_at = null;
let is_rotate = false;
let is_learn = false;
let user_text = null;
let current_user_color = null;

/* Diff arrow state: when learning a Lichess game, show the move(s) the stored
   PGN says we should have played at the first divergence. */
let diff_ply = null;            // ply depth of the position right before the diverging move
let diff_suggested = [];        // SAN move(s) the stored PGN recommends there
let diff_arrow_color = 'red';   // 'red' (our move) or 'blue' (opponent move)
let arrow_svg = null;

/* Move animation: pieces slide to their squares instead of teleporting. */
const ANIM_MS = 160;
let anim_enabled = false;   // when true, set_piece_location applies a CSS slide transition
let nav_animating = false;  // throttles arrow-key navigation to one move per animation

let initial_gs = null;

let piece_images = {};
let audio_styles = {};

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
    /* anim_enabled is set only around programmatic moves (forward make_move and
       the backward slide in prev_move). Dragging, initial placement and board
       redraws leave it off so those snap instantly. */
    piece.style.transition = anim_enabled
        ? `left ${ANIM_MS}ms ease, top ${ANIM_MS}ms ease`
        : 'none';
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
}

function make_position(row, file) {
    let charf = lower2alpha(file);
    let charr = num2alpha(row);
    return charf + charr;
}

function tell(s) {
    user_text.value = s;
}

function piece_to_board_square(board, piece, x, y) {
    var squares = 8;
    br = board.getBoundingClientRect();
    pr = piece.getBoundingClientRect();

    var sw = br.width / squares;
    var sh = br.height / squares;

    var px = br.x + window.scrollX + (x * sw + (sw / 2)) - (pr.width / 2);
    var py = br.y + window.scrollY + (y * sw + (sh / 2)) - (pr.height / 2);

    set_piece_location(piece, px, py);
}

function piece_to_square(board, piece, file, row) {
    if (is_rotate) {
        file = 7 - file;
        row = 7 - row;
    }
    piece_to_board_square(board, piece, file, row);
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

function x2board_file(file) {
    if (is_rotate) {
        file = 7 - file;
    }
    return file;
}

function y2board_row(row) {
    if (!is_rotate) {
        row = 8 - row;
    } else {
        row = row + 1;
    }
    return row;
}

function x2board_file_str(x) {
    return bfile_name(x2board_file(x));
}

function y2board_row_str(y) {
    return brow_name(y2board_row(y));
}

/* ---- Diff arrows: draw the move(s) the stored PGN recommends ---- */

const ARROW_NS = 'http://www.w3.org/2000/svg';
const ARROW_COLORS = { red: '#9b1c1c', blue: '#1f3a93' };

/* Compare two game-state grids and return the piece motions between them, as
   {from:{r,f}, to:{r,f}} pairs (from = square the piece occupies in `before`,
   to = square it occupies in `after`). Pieces are matched by name, so normal
   moves, captures and castling resolve; promotions/en-passant captures that
   have no name match are simply left out (snapped, not slid). */
function diff_moves(before, after) {
    var gone = [];      // had a piece in `before`, changed in `after`
    var appeared = [];  // has a piece in `after`, changed from `before`
    for (var r = 1; r <= squares; r++) {
        for (var f = 0; f < squares; f++) {
            var b = before[r][f];
            var a = after[r][f];
            if (b === a) continue;
            if (b != null) gone.push({ r: r, f: f, name: b });
            if (a != null) appeared.push({ r: r, f: f, name: a });
        }
    }
    var slides = [];
    var used = new Array(gone.length).fill(false);
    for (var i = 0; i < appeared.length; i++) {
        for (var j = 0; j < gone.length; j++) {
            if (!used[j] && gone[j].name === appeared[i].name) {
                used[j] = true;
                slides.push({ from: gone[j], to: appeared[i] });
                break;
            }
        }
    }
    return slides;
}

function node_depth(node) {
    var d = 0;
    var at = node;
    while (at != null && at.prev != null) {
        d++;
        at = at.prev;
    }
    return d;
}

/* Screen square center, in board-local coordinates (origin = board top-left),
   following the same file/row flipping the pieces use when the board is rotated. */
function square_center_xy(cpos, sw, sh) {
    var file = bfile(cpos);
    var row = 8 - brow(cpos);
    if (is_rotate) {
        file = 7 - file;
        row = 7 - row;
    }
    return { x: (file + 0.5) * sw, y: (row + 0.5) * sh };
}

/* Resolve a SAN move against the current board position to from/to squares. */
function resolve_move_squares(san, color) {
    var res = piece_for_move({ move: san, color: color });
    var piece = res[0];
    var movestr = res[1];
    if (piece == null) return null;
    var from = piece.position;
    var to;
    if (movestr == 'O-O') {
        to = 'g' + piece.position[1];
    } else if (movestr == 'O-O-O') {
        to = 'c' + piece.position[1];
    } else {
        var m = movestr.match(/[a-h][1-8]/);
        if (m == null) return null;
        to = m[0];
    }
    return { from: from, to: to };
}

function clear_diff_arrows() {
    if (arrow_svg != null) {
        while (arrow_svg.firstChild) arrow_svg.removeChild(arrow_svg.firstChild);
        arrow_svg.style.display = 'none';
    }
}

function draw_diff_arrows(pairs, color) {
    if (arrow_svg == null) {
        arrow_svg = document.createElementNS(ARROW_NS, 'svg');
        arrow_svg.style.position = 'absolute';
        arrow_svg.style.pointerEvents = 'none';
        arrow_svg.style.zIndex = 100;
        document.body.appendChild(arrow_svg);
    }
    while (arrow_svg.firstChild) arrow_svg.removeChild(arrow_svg.firstChild);

    var br = board.getBoundingClientRect();
    var sw = br.width / squares;
    var sh = br.height / squares;

    arrow_svg.style.left = (br.x + window.scrollX) + 'px';
    arrow_svg.style.top = (br.y + window.scrollY) + 'px';
    arrow_svg.style.width = br.width + 'px';
    arrow_svg.style.height = br.height + 'px';
    arrow_svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
    arrow_svg.style.display = 'block';

    var hex = ARROW_COLORS[color] || ARROW_COLORS.red;
    var width = sw * 0.16;

    for (var i = 0; i < pairs.length; i++) {
        var a = square_center_xy(pairs[i].from, sw, sh);
        var b = square_center_xy(pairs[i].to, sw, sh);
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;
        var ux = dx / len;
        var uy = dy / len;

        var head = sw * 0.42;          // length of the arrow head
        var tailGap = sw * 0.28;       // pull the tail out of the source square center
        var x1 = a.x + ux * tailGap;
        var y1 = a.y + uy * tailGap;
        var x2 = b.x - ux * head;      // shaft stops where the head begins
        var y2 = b.y - uy * head;

        var line = document.createElementNS(ARROW_NS, 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', hex);
        line.setAttribute('stroke-width', width);
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', '0.8');
        arrow_svg.appendChild(line);

        /* Triangular head pointing at the destination square center. */
        var hw = sw * 0.30;            // half-width of the head base
        var bx = b.x - ux * head;
        var by = b.y - uy * head;
        var px = -uy;                  // perpendicular unit vector
        var py = ux;
        var tri = document.createElementNS(ARROW_NS, 'polygon');
        var points = [
            b.x + ',' + b.y,
            (bx + px * hw) + ',' + (by + py * hw),
            (bx - px * hw) + ',' + (by - py * hw)
        ].join(' ');
        tri.setAttribute('points', points);
        tri.setAttribute('fill', hex);
        tri.setAttribute('opacity', '0.8');
        arrow_svg.appendChild(tri);
    }
}

/* Show the recommended-move arrow(s) only when the board is sitting at the
   position right before the first diverging move; clear it otherwise. */
function update_diff_arrows() {
    if (!is_learn || diff_ply == null || diff_suggested.length === 0 ||
        boardspace_at == null || node_depth(boardspace_at) !== diff_ply) {
        clear_diff_arrows();
        return;
    }
    var color = (diff_ply % 2 === 0) ? 'white' : 'black';
    var pairs = [];
    for (var i = 0; i < diff_suggested.length; i++) {
        var sq = resolve_move_squares(diff_suggested[i], color);
        if (sq != null) pairs.push(sq);
    }
    if (pairs.length === 0) {
        clear_diff_arrows();
        return;
    }
    draw_diff_arrows(pairs, diff_arrow_color);
}

async function incorrect_move(piece, x, y) {
    await fail_animation(piece, x, y);
}

async function correct_move(piece, x, y) {
    await success_animation(piece, x, y);
}

async function completed() {
    tell("END OF THE GAME.");
    donetext = document.createElement('span');
    donetext.innerHTML = "DONE!";
    donetext.style.position = 'absolute';
    donetext.style.color = '#ff0000';
    donetext.style.fontSize = '100';
    donetext.style.left = Math.floor(board.width / 2) - 100;
    donetext.style.top = Math.floor(board.height / 2) - 100;
    document.body.appendChild(donetext);
    await game_over_audio();
}

async function check_learn_move(piece, x, y) {
    piece_to_board_square(board, piece.image, x, y);
    console.log(piece.position + " move to " + x2board_file_str(x) + y2board_row_str(y));

    var bx = x2board_file(x);
    var by = y2board_row(y);

    if (boardspace_at.moves.length == 0) {
        await completed();
        return;
    }

    var right_piece = null;
    var index = null;

    for (index = 0; index < boardspace_at.moves.length; index++) {

      // User could have a choice here
      var right_move = boardspace_at.moves[index];

      var movestr = null;
      var take = null;

      [right_piece, movestr, take] = piece_for_move(right_move);

      var movey = brow(movestr);
      var movex = bfile(movestr);
      if (piece == right_piece) {
          if (movestr == 'O-O') {
              movey = brow(right_piece.position);
              movex = 6;
          } else if (movestr == 'O-O-O') {
              movey = brow(right_piece.position);
              movex = 2;
          }
      }
      if (piece == right_piece && movey == by && movex == bx) {
        break;
      }
    }

    /* Is this the right piece */
    if (piece != right_piece || movey != by || movex != bx) {
        var a = bad_move_audio();
        var b = incorrect_move(piece, bx, by);
        var prow = img_row(piece.position);
        var pfile = img_file(piece.position);
        piece_to_square(board, piece.image, pfile, prow);
        await Promise.all([a, b]);
    } else {
        move_audio();
        var b = correct_move(piece, bx, by);
        make_move(index); // officially do my move
        await b;

        if (boardspace_at.moves.length == 0) {
            await completed();
            return;
        }

        move_audio();
        make_move(); // lets do the next one ...

        if (boardspace_at.moves.length == 0) {
            await completed();
            return;
        }
    }
}

async function drag_piece(board, piece) {
    var squares = 8;
    br = board.getBoundingClientRect();
    pr = piece.image.getBoundingClientRect();

    centerx = pr.left + pr.width / 2;
    centery = pr.top + pr.height / 2;
    var board_center_x = centerx - br.x;
    var board_center_y = centery - br.y;

    var sw = br.width / squares;
    var sh = br.height / squares;

    var x = Math.floor(board_center_x / sw);
    var y = Math.floor(board_center_y / sh);

    /* They didn't actually move it anywhere, just set it back down */
    if (x2board_file(x) == bfile(piece.position) && y2board_row(y) == brow(piece.position)) {
        piece_to_board_square(board, piece.image, x, y);
    } else if (is_learn) {
        await check_learn_move(piece, x, y);
    } else {
        piece_to_board_square(board, piece.image, x, y);
    }
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

function make_press_handler(piece) {
    return async function onpress(e) {
        var p = piece.image;
        e.stopPropagation();
        e.preventDefault();
        p.isdragging = true;
        function move(e) {
            if (!p.isdragging) return;

            var cx;
            var cy;

            if (typeof e.clientX !== 'undefined') {
                cx = e.clientX;
                cy = e.clientY;
            } else {
                cx = e.touches[0].clientX;
                cy = e.touches[0].clientY;
            }
            cx = cx + window.scrollX;
            cy = cy + window.scrollY;
            var l = cx - p.width / 2;
            var t = cy - p.height / 2;
            set_piece_location(p, l, t);
        }

        async function stop(e) {
            e.stopPropagation();
            e.preventDefault();
            p.isdragging = false;
            document.removeEventListener('mousemove', move);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('mouseup', stop);
            document.removeEventListener('touchend', stop);

            await drag_piece(board, piece);
        }

        document.addEventListener('mousemove', move);
        document.addEventListener('touchmove', move);
        document.addEventListener('mouseup', stop);
        document.addEventListener('touchend', stop);
    }
}

function place_piece_image(name, p, position) {
    var piece = new Piece(name, p, position);
    var prow = brow(position);
    var pfile = bfile(position);
    boardspace[prow][pfile] = piece;

    p.isdragging = false;
    p.addEventListener('mousedown', make_press_handler(piece));
    p.addEventListener('touchstart', make_press_handler(piece));
}

async function place_piece(type, position) {
    var p = await piece_to_screen(type, position);
    place_piece_image(type, p, position);
}

function place_game_piece(gs, type, position) {
    var prow = brow(position);
    var pfile = bfile(position);

    gs[prow][pfile] = type;
}

async function set_board_state(gs) {
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
                await place_piece(name, make_position(row, file));
            }
        }
    }
}

async function reset_game_tree(pgn_paste, user_color = null) {
    diff_ply = null;
    diff_suggested = [];
    clear_diff_arrows();
    await reload_board();
    moves = parse_move_tree(pgn_paste.value);
    moves.set_initial_gs(initial_gs);
    if (user_color !== null) {
        var should_rotate = (user_color === 'black');
        if (should_rotate !== is_rotate) {
            await rotate_board(null);
        }
    } else if (moves.color_choices['white'] > moves.color_choices['black']) {
        if (!is_rotate) {
            await rotate_board(null);
        }
    } else if (moves.color_choices['black'] > moves.color_choices['white']) {
        if (is_rotate) {
            await rotate_board(null);
        }
    }
}

function make_pgn_handler(pgn_paste) {
    return async function (event) {
        await reset_game_tree(pgn_paste);
    }
}

function make_clear_handler(tarea) {
    return async function (event) {
        tarea.value = "";
        await reload_board();
    }
}

async function load_new_pgn(text, user_color = null) {
    current_user_color = user_color;
    var pgn_paste = document.getElementById('pgn_paste');
    pgn_paste.value = text;
    window.setPgnDiffRanges([]);
    window.highlightPgnCharacters(0, 0);
    await reset_game_tree(pgn_paste, user_color);
    boardspace_at = moves.top;
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
    update_diff_arrows();
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
    if (trow + 1 <= 8) {
        var p = boardspace[trow+1][tfile];
        if (p != null && p.type == "P" && p.color == color) {
            return p;
        }
    }
    if (trow - 1 >= 1) {
        var p = boardspace[trow-1][tfile];
        if (p != null && p.type == "P" && p.color == color) {
            return p;
        }
    }

    /* check for first move double */
    if (trow == 4) {
        p = boardspace[trow-2][tfile];
        if (p != null && p.type == "P" && p.color == color) {
            return p;
        }
    }
    if (trow == 5) {
        p = boardspace[trow + 2][tfile];
        if (p != null && p.type == "P" && p.color == color) {
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

    if (rowrestrict != null) {
        srow = rowrestrict;
        if (numdiff(srow, trow) == 2) {
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
        } else {
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
    } else {

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

function matches_restrict(piece, filerestrict, rowrestrict) {
    if (filerestrict != null) {
        if (bfile(piece.position) != filerestrict) {
            return false;
        }
    }
    if (rowrestrict != null) {
        if (brow(piece.position) != rowrestrict) {
            return false;
        }
    }
    return true;
}

function find_rook_pattern(type, color, trow, tfile, filerestrict, rowrestrict) {
    var ret = null;

    ret = search_incr(color, type, 0, 1, trow, tfile);
    if (ret != null) {
        if (matches_restrict(ret, filerestrict, rowrestrict)) {
            return ret;
        }
    }
    ret = search_incr(color, type, 0, -1, trow, tfile);
    if (ret != null) {
        if (matches_restrict(ret, filerestrict, rowrestrict)) {
            return ret;
        }
    }
    ret = search_incr(color, type, 1, 0, trow, tfile);
    if (ret != null) {
        if (matches_restrict(ret, filerestrict, rowrestrict)) {
            return ret;
        }
    }
    ret = search_incr(color, type, -1, 0, trow, tfile);
    if (ret != null) {
        if (matches_restrict(ret, filerestrict, rowrestrict)) {
            return ret;
        }
    }
    return null;
}

function find_bishop_src(color, trow, tfile, filerestrict, rowrestrict) {
    return find_bishop_pattern('B', color, trow, tfile, filerestrict, rowrestrict);
}

function find_rook_src(color, trow, tfile, filerestrict, rowrestrict) {
    return find_rook_pattern('R', color, trow, tfile, filerestrict, rowrestrict);
}

function find_queen_src(color, trow, tfile, filerestrict, rowrestrict) {
    var piece = find_bishop_pattern('Q', color, trow, tfile, filerestrict, rowrestrict);
    if (piece == null) {
        piece = find_rook_pattern('Q', color, trow, tfile, filerestrict, rowrestrict);
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
        return find_rook_src(color, trow, tfile, filerestrict, rowrestrict);
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
    var piece = boardspace[trow][tfile];
    return piece;
}

/* Return the promoted piece's name (color-cased) for a SAN move like "e8=Q"
   or "exd8=Q+", or null if the move isn't a promotion. */
function promo_piece(san, color) {
    var eq = san.indexOf('=');
    if (eq === -1 || eq + 1 >= san.length) {
        return null;
    }
    var letter = upper(san[eq + 1]);
    if (letter !== 'Q' && letter !== 'R' && letter !== 'B' && letter !== 'N') {
        return null;
    }
    return color === 'white' ? letter : lower(letter);
}

function piece_for_move(move) {
    var take = false;
    var piece = null;
    var movestr = null;

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
        if (is_file(move.move[1])) {
            var target_start = 2;
            if (is_takes(move.move[target_start])) {
                take = true;
                target_start++;
            }
            if (!is_file(move.move[target_start])) {
                target_start--;
            } else {
                filerestrict = ascii(move.move[1]) - ascii('a');
            }
            movestr = move.move.substr(target_start);
        }
        else if (is_row(move.move[1])) {
            var target_start = 2;
            if (is_takes(move.move[target_start])) {
                take = true;
                target_start++;
            }
            rowrestrict = ascii(move.move[1]) - ascii('0');
            movestr = move.move.substr(target_start);
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
    /* Drop any promotion suffix ("e8=Q" -> "e8") so the target square and the
       piece's stored position stay clean; the promotion itself is applied in
       run_move via promo_piece. */
    if (movestr != null) {
        var eq = movestr.indexOf('=');
        if (eq !== -1) {
            movestr = movestr.substr(0, eq);
        }
    }
    return [piece, movestr, take];
}

function run_move(move, gs) {
    console.log("run: " + move.move);
    var piece = null;
    var movestr = null;
    var take = false;

    [piece, movestr, take] = piece_for_move(move);
    if (piece != null) {
        move_piece(piece, movestr, take, gs);
        var promo = promo_piece(move.move, move.color);
        if (promo != null) {
            promote_piece(piece, promo, gs);
        }
    } else {
        console.log("CANT RUN: " + move.move);
    }
}

/* Morph a pawn that just reached the back rank into its promoted piece.
   move_piece has already slid the pawn to its target square; we reuse the
   same DOM image (just swap its source) so the slide animation is preserved,
   then update the logical name/type and the gamespace. */
function promote_piece(piece, promo_name, gs) {
    var prow = brow(piece.position);
    var pfile = bfile(piece.position);
    piece.name = promo_name;
    piece.type = upper(promo_name);
    if (piece_images[promo_name] != null) {
        piece.image.src = piece_images[promo_name].src;
    }
    gs[prow][pfile] = promo_name;
}

async function prev_move() {
    var at = boardspace_at.prev;
    if (at == null) {
        console.log("No prev moves.");
        return;
    }

    /* Slide the moved piece(s) back to their previous squares, then let
       set_board_state snap everything to the authoritative position (which
       also restores any captured pieces). The snap is invisible because the
       slid pieces already finished at the squares set_board_state recreates. */
    var slides = diff_moves(boardspace_at.gs, at.gs);
    if (slides.length > 0) {
        anim_enabled = true;
        for (var s = 0; s < slides.length; s++) {
            var mover = boardspace[slides[s].from.r][slides[s].from.f];
            if (mover != null) {
                set_piece_image(board, mover.image, make_position(slides[s].to.r, slides[s].to.f));
            }
        }
        anim_enabled = false;
        await new Promise(function (res) { setTimeout(res, ANIM_MS); });
    }

    await set_board_state(at.gs);
    boardspace_at = at;
    update_diff_arrows();

    // Highlight the move that led to this position (stored in at.prev.moves)
    if (at.prev != null) {
        for (var i = 0; i < at.prev.moves.length; i++) {
            if (at.prev.moves[i].next == at) {
                window.highlightPgnCharacters(at.prev.moves[i].move_start, at.prev.moves[i].move_end);
                return;
            }
        }
    }
    window.highlightPgnCharacters(0, 0);
}

function make_move(index = null) {
    if (moves == null) {
        console.log("Load pgn first");
        return;
    }
    if (boardspace_at == null) {
        console.log("move location not set, starting at very top.");
        boardspace_at = moves.top;
    }
    if (boardspace_at.moves.length == 0) {
        console.log("end of the game buddy");
        return;
    }

    if (index == null) {
      index = random_range(0, boardspace_at.moves.length);
    }
    var move = boardspace_at.moves[index];
    var gs = copy_gamespace(boardspace_at.gs);
    anim_enabled = true;
    run_move(move, gs);   // slides the piece(s) from their current squares to the target
    anim_enabled = false;
    boardspace_at = move.next;
    window.highlightPgnCharacters(move.move_start, move.move_end);
    boardspace_at.set_gs(gs);
    update_diff_arrows();
}

async function key_press(k) {
    /* Ignore new navigation while a slide is still playing, so transitions
       aren't cut off mid-flight. */
    if (nav_animating) return;
    if (k.key == "ArrowRight") {
        if (boardspace_at != null && boardspace_at.moves.length > 0) {
            nav_animating = true;
            make_move();
            move_audio();
            setTimeout(function () { nav_animating = false; }, ANIM_MS);
        }
    } else if (k.key == "ArrowLeft") {
        if (boardspace_at != null && boardspace_at.prev != null) {
            nav_animating = true;
            await prev_move();
            move_audio();
            nav_animating = false;
        }
    }
}

function make_learn_handler(pgn_paste) {
    return async function (event) {
        tell("Learning ...");
        is_learn = true;

        /* Reset the board and find matching saved game in parallel */
        const [, result] = await Promise.all([
            reset_game_tree(pgn_paste, current_user_color),
            find_best_pgn_match(pgn_paste.value, current_user_color)
        ]);

        tell(result.name ? `Learning: ${result.name}` : 'Learning...');
        window.setPgnDiffRanges(result.diff_ranges);
        window.highlightPgnCharacters(0, 0);

        /* Set up the recommended-move arrow for the first divergence. */
        diff_suggested = result.suggested_moves || [];
        diff_ply = (diff_suggested.length > 0 && typeof result.diff_ply === 'number')
            ? result.diff_ply : null;
        diff_arrow_color = (result.diff_ranges[0] && result.diff_ranges[0].color) || 'red';

        moves.linearize();

        /* Randomize start */
        boardspace_at = moves.random_start();

        if (is_rotate) {
            move_audio();
            make_move();
        }
        update_diff_arrows();
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

function load_audio_style(type, filename) {
    var a = new Audio(filename);
    a.preload = 'auto';
    audio_styles[type] = a;
}

async function reload_board() {
    if (donetext != null) {
        document.body.removeChild(donetext);
        donetext = null;
    }
    clean_old_boardspace();
    make_boardspace();
    boardspace_at = null;

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

    await set_board_state(gs);
    if (initial_gs == null) {
        initial_gs = gs;
    }
}

function load_piece_images() {
    load_piece_image('p', 'bp.png');
    load_piece_image('P', 'wP.png');
    load_piece_image('r', 'br.png');
    load_piece_image('R', 'wR.png');
    load_piece_image('n', 'bn.png');
    load_piece_image('N', 'wN.png');
    load_piece_image('b', 'bb.png');
    load_piece_image('B', 'wB.png');
    load_piece_image('q', 'bq.png');
    load_piece_image('Q', 'wQ.png');
    load_piece_image('k', 'bk.png');
    load_piece_image('K', 'wK.png');
    load_piece_image('bad', 'annotation_bad.png')
    load_piece_image('good', 'annotation_good.png')
}

function load_audio_styles() {
    load_audio_style("game_over", "mixkit-completion-of-a-level-2063.wav");
    load_audio_style("move", "MovePiece.wav");
    load_audio_style("bad_move", "mixkit-interface-option-select-2573.wav");
    setup_move_audio("MovePiece.wav").then(function () {
        // Temporary A/B/C audition: randomly play one of the candidate move
        // sounds per move (logged to the console) so they can be compared.
        setup_move_audio_candidates([
            { label: 'A', filename: 'MovePiece_A.wav' },
            { label: 'B', filename: 'MovePiece_B.wav' },
            { label: 'C', filename: 'MovePiece_C.wav' },
        ]);
    });
}

(function () {
    board = document.getElementById('board')
    board.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });
    var pgn_paste = document.getElementById('pgn_paste');
    user_text = document.getElementById('user_text');
    var clear = document.getElementById('clear');
    var rotate = document.getElementById('rotate');
    var learn = document.getElementById('learn');
    var upload = document.getElementById('uploadForm');
    pgn_paste.style.width = board.width + 'px';
    pgn_paste.style.height = (board.width / 4) + 'px';
    user_text.style.width = board.width + 'px';

    // Initialize highlight backdrop
    var backdrop = document.getElementById('pgn_paste_backdrop');
    var container = document.querySelector('.textarea-container');
    container.style.width = board.width + 'px';
    backdrop.style.width = pgn_paste.style.width;
    backdrop.style.height = pgn_paste.style.height;

    new ResizeObserver(() => {
        var w = user_text.offsetWidth + 'px';
        container.style.width = w;
        pgn_paste.style.width = w;
        backdrop.style.width = w;
    }).observe(user_text);

    // Match exact styling to prevent scroll height differences
    var computedStyle = window.getComputedStyle(pgn_paste);
    backdrop.style.padding = computedStyle.padding;
    backdrop.style.border = computedStyle.border;
    backdrop.style.boxSizing = computedStyle.boxSizing;
    backdrop.style.lineHeight = computedStyle.lineHeight;

    // Sync backdrop with textarea on input and scroll
    function syncBackdrop() {
        backdrop.scrollTop = pgn_paste.scrollTop;
        backdrop.scrollLeft = pgn_paste.scrollLeft;
    }

    pgn_paste.addEventListener('input', syncBackdrop);
    pgn_paste.addEventListener('scroll', syncBackdrop);

    var pgn_diff_map = new Map();

    window.setPgnDiffRanges = function(ranges) {
        pgn_diff_map = new Map();
        for (const r of ranges) {
            var cls = r.color === 'blue' ? 'highlight-diff-blue' : 'highlight-diff-red';
            for (let i = r.start; i <= r.end; i++) {
                pgn_diff_map.set(i, cls);
            }
        }
    };

    // Function to highlight specific characters
    window.highlightPgnCharacters = function(start, end) {
        var text = pgn_paste.value;
        var highlightedHtml = '';

        for (var i = 0; i < text.length; i++) {
            if (i >= start && i < end) {
                highlightedHtml += '<span class="highlight">' + escapeHtml(text[i]) + '</span>';
            } else if (pgn_diff_map.has(i)) {
                highlightedHtml += '<span class="' + pgn_diff_map.get(i) + '">' + escapeHtml(text[i]) + '</span>';
            } else {
                highlightedHtml += escapeHtml(text[i]);
            }
        }

        backdrop.innerHTML = highlightedHtml + '\n\n';  // Add extra newlines to ensure scrollable area matches
        // Ensure backdrop scroll matches textarea after update
        backdrop.scrollTop = pgn_paste.scrollTop;
        backdrop.scrollLeft = pgn_paste.scrollLeft;
    };

    // Helper function to escape HTML
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clear.addEventListener('click', make_clear_handler(pgn_paste));
    rotate.addEventListener('click', rotate_board);
    learn.addEventListener('click', make_learn_handler(pgn_paste));
    upload.addEventListener('submit', upload_pgn);
    document.getElementById('lichess-fetch').addEventListener('click', fetch_lichess_games);

    document.onkeydown = key_press;

    load_piece_images();
    load_audio_styles();
    window.addEventListener('load', async (event) => {
        await reload_board();
    });

})();

