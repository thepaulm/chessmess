async function piece_to_screen(type, position) {
    var p = piece_images[type];
    p = p.cloneNode(true);
    p.style.position = 'absolute';

    set_piece_location(p, 0, 0);

    document.body.appendChild(p);

    let x = new Promise((resolve, reject) => {
        p.onload = () => {
            p.style.position = 'absolute';
            set_piece_image(board, p, position);
            resolve(p);
        };
    });
    await x;
    return p;
}
async function fail_animation(piece, x, y) {
    var p = await piece_to_screen('bad', make_position(y, x));
    await new Promise(r => setTimeout(r, 2000));
    p.parentElement.removeChild(p);
}

async function success_animation(piece, x, y) {
    var p = await piece_to_screen('good', make_position(y, x));
    await new Promise(r => setTimeout(r, 300));
    p.parentElement.removeChild(p);
}

async function game_over_audio() {
    var a = audio_styles['game_over'];
    await a.play();
}

async function move_audio() {
    var a = audio_styles['move'];
    await a.play();
}

async function bad_move_audio() {
    var a = audio_styles['bad_move'];
    await a.play();
}
