function fail_animation(piece, x, y) {
    var p = piece_images['bad'];
    p = p.cloneNode(true);
    p.style.position = 'absolute';
    set_piece_location(p, x, y);

    /*
    let x = new Promise((resolve, reject) => {
        p.onload = () => {
            p.style.position = 'absolute';
            set_piece_image(board, p, position);
            resolve(p);
        };
    });
    await x;
    place_piece_image(type, p, position);
    */
}
