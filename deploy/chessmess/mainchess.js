function set_piece_location(piece, x, y) {
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
}

function ascii(c) {
    return c.charCodeAt(0);
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
    row = 8 - Number(cpos[1]);
    file = ascii(cpos[0]) - ascii('a');

    piece_to_square(board, piece, file, row);
}

function load_piece(filename, position) {
    var p = new Image();
    p.src = filename;
    p.isdragging = false;
    p.onload = () => {
        document.body.appendChild(p);
        p.style.position = 'absolute';
        set_piece(board, p, position);
    };

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

(function () {
    var squares = 8;
    var board = document.getElementById('board')
    board.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    load_piece('p.png', 'a7');
    load_piece('p.png', 'b7');
    load_piece('p.png', 'c7');
    load_piece('p.png', 'd7');
    load_piece('p.png', 'e7');
    load_piece('p.png', 'f7');
    load_piece('p.png', 'g7');
    load_piece('p.png', 'h7');

    load_piece('r.png', 'a8');
    load_piece('n.png', 'b8');
    load_piece('b.png', 'c8');
    load_piece('q.png', 'd8');
    load_piece('k.png', 'e8');
    load_piece('b.png', 'f8');
    load_piece('n.png', 'g8');
    load_piece('r.png', 'h8');

    load_piece('P.png', 'a2');
    load_piece('P.png', 'b2');
    load_piece('P.png', 'c2');
    load_piece('P.png', 'd2');
    load_piece('P.png', 'e2');
    load_piece('P.png', 'f2');
    load_piece('P.png', 'g2');
    load_piece('P.png', 'h2');

    load_piece('R.png', 'a1');
    load_piece('N.png', 'b1');
    load_piece('B.png', 'c1');
    load_piece('Q.png', 'd1');
    load_piece('K.png', 'e1');
    load_piece('B.png', 'f1');
    load_piece('N.png', 'g1');
    load_piece('R.png', 'h1');
})();

