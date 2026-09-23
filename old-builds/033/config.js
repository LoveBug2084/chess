    /* ------------------------------------------------------------------ *
     *  CONFIG
     *
     *  Constants and helpers shared across the whole game: the sprite
     *  layout, the palette, colour maths, and the four players.
     * ------------------------------------------------------------------ */
    const PIECE_COLS = ['pawn','knight','bishop','rook','queen','king']; // sprite x-order

    // Sprite rows, top to bottom (0 = top row) for the TRIMMED 10-row sheet.
    // (white/light-grey/dark-grey's grey rows were removed from the image;
    //  the sheet is now 10 rows tall.)
    const COLOUR_ROWS = [
      'black', 'white', 'pink', 'red', 'orange',
      'yellow', 'green', 'blue', 'light-blue', 'purple'
    ];

    // Real hex values sampled from sprites.png (used for swatch + overlays)
    const COLOUR_HEX = {
      'black':'#000000', 'white':'#ffffff', 'pink':'#fe98cb', 'red':'#fe0000',
      'orange':'#fe9832', 'yellow':'#fefe32', 'green':'#00cb32',
      'blue':'#3232fe', 'light-blue':'#65cbfe', 'purple':'#9865fe'
    };

    // Perceived luminance (Rec. 601). Returns a value 0-255.
    function luminance(hex) {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 0xff;
      const g = (n >> 8) & 0xff;
      const b = n & 0xff;
      return r * 0.3 + g * 0.59 + b * 0.11;
    }

    // Black or white text, whichever contrasts with the given background.
    function readableTextColour(hex) {
      return luminance(hex) < 128 ? '#ffffff' : '#000000';
    }

    // Turn a colour key like 'light-blue' into a display name 'Light blue'
    function colourLabel(key) {
      return key
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    const C0 = 3, C1 = 10, N = 14;   // centre block spans rows/cols 3..10

    function pickFourColours() {
      const pool = COLOUR_ROWS.slice();
      const picked = [];
      while (picked.length < 4) {
        const i = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(i, 1)[0]);
      }
      return picked;
    }

    const [southColour, northColour, westColour, eastColour] = pickFourColours();
    const colourIndex = c => COLOUR_ROWS.indexOf(c);

    // Players in clockwise turn order.
    // The 'key' is the side: it identifies the army, the arm it starts in,
    // and its fixed forward/backward orientation.
    const PLAYERS = [
      { key: 'south', label: 'South', colour: southColour },
      { key: 'west',  label: 'West',  colour: westColour  },
      { key: 'north', label: 'North', colour: northColour },
      { key: 'east',  label: 'East',  colour: eastColour  }
    ];

    // Hex colour of the player who owns a given arm letter ('N'/'S'/'W'/'E').
    function armOwnerColour(arm) {
      if (arm === 'N') return COLOUR_HEX[northColour];
      if (arm === 'S') return COLOUR_HEX[southColour];
      if (arm === 'W') return COLOUR_HEX[westColour];
      if (arm === 'E') return COLOUR_HEX[eastColour];
      return null;
    }
