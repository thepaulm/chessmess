async function piece_to_screen(type, position) {
    var p = piece_images[type];
    p = p.cloneNode(true);
    p.style.position = 'absolute';

    set_piece_location(p, 0, 0);

    document.body.appendChild(p);

    if (p.complete) {
        p.style.position = 'absolute';
        set_piece_image(board, p, position);
    } else {
        await new Promise((resolve) => {
            p.onload = () => {
                p.style.position = 'absolute';
                set_piece_image(board, p, position);
                resolve();
            };
        });
    }
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
    a.currentTime = 0;
    await a.play();
}

let _moveAudioCtx = null;
let _moveAudioBuffer = null;
// A/B/C audition: each entry is {label, buffer}. When populated, move_audio
// picks one at random per move (and logs the label) so candidates can be
// compared in context. Leave empty to use the single _moveAudioBuffer.
let _moveAudioCandidates = [];

async function setup_move_audio(filename) {
    // 'interactive' requests the lowest available output latency so the click
    // lands the instant the piece snaps to its square.
    _moveAudioCtx = new AudioContext({ latencyHint: 'interactive' });
    const response = await fetch(filename);
    const arrayBuffer = await response.arrayBuffer();
    _moveAudioBuffer = await _moveAudioCtx.decodeAudioData(arrayBuffer);
}

// Load several candidate move sounds for random A/B/C auditioning. Each item is
// {label, filename}. Requires setup_move_audio to have created the context.
async function setup_move_audio_candidates(items) {
    _moveAudioCandidates = [];
    for (const item of items) {
        const response = await fetch(item.filename);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await _moveAudioCtx.decodeAudioData(arrayBuffer);
        _moveAudioCandidates.push({ label: item.label, buffer: buffer });
    }
}

// Fire-and-forget: starts the sound and returns immediately. Callers must NOT
// rely on the returned promise to know when the sound has finished playing —
// gating game logic on the full sample duration makes moves feel sluggish.
function move_audio() {
    if (!_moveAudioBuffer) {
        var a = audio_styles['move'];
        a.currentTime = 0;
        a.play();
        return;
    }
    if (_moveAudioCtx.state === 'suspended') _moveAudioCtx.resume();
    let buffer = _moveAudioBuffer;
    if (_moveAudioCandidates.length > 0) {
        const pick = _moveAudioCandidates[Math.floor(Math.random() * _moveAudioCandidates.length)];
        buffer = pick.buffer;
        console.log("move sound: " + pick.label);
    }
    const source = _moveAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 0.85 + Math.random() * 0.3;  // ±15% pitch variation
    source.connect(_moveAudioCtx.destination);
    source.start(0);
}

async function bad_move_audio() {
    var a = audio_styles['bad_move'];
    a.currentTime = 0;
    await a.play();
}
