    /* ------------------------------------------------------------------ *
     *  SPRITE SANITY CHECK + INIT
     *
     *  The last script to load. Verifies the sprite sheet is reachable,
     *  then fires the start-up calls: draw the turn pill, size the board,
     *  mark any en-passant pairings, and keep the board fitted on resize.
     * ------------------------------------------------------------------ */
    const sprite = new Image();
    sprite.onerror = () => console.error('Sprite sheet not found: img/sprites.png');
    sprite.src = 'img/sprites.png';

    renderTurn();
    fitBoard();
    refreshEnPassantMarkers();

    window.addEventListener('resize', fitBoard);
    window.addEventListener('load', fitBoard);
    if (window.ResizeObserver) {
      new ResizeObserver(fitBoard).observe(document.querySelector('.board-wrap'));
    }
