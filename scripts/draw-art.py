"""
Draws the site's illustrations into public/assets/art/ (and the favicon).

    python3 scripts/draw-art.py public/assets/art

Flat Duolingo-style shapes: no outlines, a darker shade down one side, a light
highlight pill. The Colosseum is generated rather than hand-drawn because its
arches have to follow the curve of the building.
"""
import math, random, sys, os
OUT = sys.argv[1]
RED, RED_D, RED_L = '#D42A32', '#A11D24', '#F2777C'
GOLD, GOLD_D, GOLD_L = '#FFC800', '#E5A400', '#FFE680'
SAND, SAND_D, SAND_L = '#F7C77E', '#E2A257', '#FFE3B0'
ARCH, ARCH_D = '#B4692F', '#934F1E'
BLUE, PURPLE, GREEN, GREEN_D, ORANGE = '#1CB0F6', '#CE82FF', '#58CC02', '#46A302', '#FF9600'

def f(x):
    text = f'{x:.1f}'
    return text[:-2] if text.endswith('.0') else text

def write(name, w, h, body):
    with open(os.path.join(OUT, name), 'w') as fh:
        fh.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>\n')

def arch(cx, yb, w, h, fill):
    r = w / 2
    return (f'<path d="M{f(cx-r)} {f(yb)}V{f(yb-h+r)}A{f(r)} {f(r)} 0 0 1 {f(cx+r)} {f(yb-h+r)}V{f(yb)}Z" fill="{fill}"/>')

def confetti(seed, box, n, avoid=None):
    rnd = random.Random(seed)
    cols = [BLUE, PURPLE, RED, GOLD, GREEN, ORANGE, BLUE, RED]
    out = []
    x0, y0, x1, y1 = box
    placed = 0
    while placed < n:
        x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        if avoid and avoid[0] < x < avoid[2] and avoid[1] < y < avoid[3]:
            continue
        a = rnd.uniform(0, 180)
        c = cols[placed % len(cols)]
        out.append(f'<rect x="{f(x-7)}" y="{f(y-4)}" width="14" height="8" rx="3" fill="{c}" transform="rotate({f(a)} {f(x)} {f(y)})"/>')
        placed += 1
    return ''.join(out)

# ---------------------------------------------------------------- colosseum
def confetti_at(seed, box, n, avoid):
    """Confetti in `box`, kept out of every rectangle in `avoid`."""
    rnd = random.Random(seed)
    cols = [BLUE, PURPLE, RED, GOLD, GREEN, ORANGE]
    out, placed, tries = [], 0, 0
    x0, y0, x1, y1 = box
    while placed < n and tries < 5000:
        tries += 1
        x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        if any(ax0 - 10 < x < ax1 + 10 and ay0 - 10 < y < ay1 + 10 for ax0, ay0, ax1, ay1 in avoid):
            continue
        if any((x - px) ** 2 + (y - py) ** 2 < 26 ** 2 for px, py in [(p[0], p[1]) for p in out]):
            continue
        out.append((x, y, rnd.uniform(0, 180), cols[placed % len(cols)]))
        placed += 1
    return ''.join(f'<rect x="{f(x-7)}" y="{f(y-4)}" width="14" height="8" rx="3" fill="{c}" transform="rotate({f(a)} {f(x)} {f(y)})"/>' for x, y, a, c in out)


def colosseum():
    """
    The Colosseum, front on and seen a little from above. The facade is drawn
    on a real cylinder of radius RC, and everything is placed in the
    cylinder's own flat coordinates first (s along the wall, v down it) and
    then projected with cyl(s, v):

      x = mid + RC sin(s / RC)        the wall turning away at the sides
      y = v + off(x)                  the near side lower, as seen from above

    So an arch near the edge comes out narrower, its round top squashed into
    half an ellipse, and its foot tilted to follow the ledge, exactly as a
    round arch painted on a drum would. Nine bays sit at equal angles, each
    arch centred in its bay, so the three storeys line up.

    The ruined left side, the shading, the attic windows and the flag poles
    all sit on bay boundaries, so nothing lands half way across an arch.
    """
    W, H = 520, 440
    L, R = 70, 450
    mid, span = (L + R) / 2, (R - L) / 2
    DIP = 24
    ROUND = 12                      # corners are rounded by stroking this wide

    # The cylinder. The outline's edges are where it turns 75 degrees away.
    EDGE = math.radians(75)
    RC = span / math.sin(EDGE)

    def off(x):
        """How far a level line has dropped at x: depth on the cylinder,
        scaled so it is 0 at the outline's edges and DIP in the middle."""
        c = math.sqrt(max(0.0, 1 - ((x - mid) / RC) ** 2))
        return DIP * (c - math.cos(EDGE)) / (1 - math.cos(EDGE))

    def cyl(sx, v):
        x = mid + RC * math.sin(sx / RC)
        return x, v + off(x)

    def shape(points):
        """A closed path through points given in wall coordinates."""
        pts = [cyl(sx, v) for sx, v in points]
        return 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + 'Z'

    def arch_points(sc, ws, vt, vb, steps=28):
        """A round-headed arch in wall coordinates: centre sc, width ws, from
        vt (top of the head) down to vb (the foot)."""
        r = ws / 2
        pts = [(sc - r, vb), (sc - r, vt + r)]
        for i in range(1, steps):
            a = math.pi - math.pi * i / steps
            pts.append((sc + r * math.cos(a), vt + r - r * math.sin(a)))
        pts += [(sc + r, vt + r), (sc + r, vb)]
        pts += [(sc + r - ws * i / 12, vb) for i in range(1, 12)]
        return pts

    def band_points(s0, s1, v0, v1, steps=16):
        top = [(s0 + (s1 - s0) * i / steps, v0) for i in range(steps + 1)]
        return top + [(s1 - (s1 - s0) * i / steps, v1) for i in range(steps + 1)]

    # Storeys, top to bottom, before the curve: (top, bottom)
    ATTIC_TOP = 92
    LEDGE_A = (144, 153)            # under the attic
    TIER3 = (153, 217)
    LEDGE_B = (217, 226)
    TIER2 = (226, 290)
    LEDGE_C = (290, 299)
    TIER1 = (299, 362)
    PLINTH = (362, 370)
    BOTTOM = 370

    # Nine bays at equal angles, inside the outline's 75 degrees.
    N, PHI = 9, math.radians(70)
    angles = [-PHI + j * 2 * PHI / N for j in range(N + 1)]
    bay_s = [RC * a for a in angles]                        # bay edges, along the wall
    centre_s = [(bay_s[k] + bay_s[k + 1]) / 2 for k in range(N)]
    arch_ws = [0.6 * (bay_s[k + 1] - bay_s[k]) for k in range(N)]
    edges = [mid + RC * math.sin(a) for a in angles]        # the same, on screen
    centres = [mid + RC * math.sin(sc / RC) for sc in centre_s]

    # The ruin: bays 0-2 lost the attic and the storey's top ledge; bay 3 steps
    # up to the full height in two goes. Steps fall on bay boundaries and the
    # middle of bay 3, never across an arch below, since the attic has none.
    def top_base(x):
        if x < edges[3]: return TIER3[0]
        if x < centres[3]: return 134
        if x < edges[4]: return 113
        return ATTIC_TOP

    xs = [L + i for i in range(0, R - L + 1, 1)]
    top = [(x, top_base(x) + off(x)) for x in xs]
    bot = [(x, BOTTOM + off(x)) for x in reversed(xs)]
    # Start the outline half way along the base, not at a corner: some
    # renderers (WebKit) do not round the join where a path closes, which left
    # the top-left corner square with a spike.
    ring = top + bot
    start = len(top) + len(bot) // 2
    ring = ring[start:] + ring[:start]
    body_d = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in ring) + 'Z'

    SHADE_X = edges[N - 2]          # the last two bays are in shadow
    LIT_X = (L + cyl(centre_s[0] - arch_ws[0] / 2, 0)[0]) / 2   # a lit strip up the left edge
    LEDGE_SHADE = '#EDB46A'

    s = []
    s.append(f'<defs><mask id="body" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">'
             f'<path d="{body_d}" fill="#fff" stroke="#fff" stroke-width="{ROUND}" stroke-linejoin="round"/></mask></defs>')

    # sun, low on the ruined side where the wall is lowest
    SUN = (138, 96, 46)
    sx, sy, sr = SUN
    s.append(f'<circle cx="{sx}" cy="{sy}" r="{sr}" fill="{GOLD}"/>')
    s.append(f'<path d="M{sx} {sy-sr}a{sr} {sr} 0 0 1 0 {2*sr}z" fill="{GOLD_D}" opacity=".35"/>')
    s.append(f'<rect x="{sx-30}" y="{sy-26}" width="22" height="11" rx="5.5" fill="{GOLD_L}" transform="rotate(-35 {sx-19} {sy-20})"/>')

    # ground: a green disc with a darker front lip, like a pressed button
    GX, GY, GRX, GRY = mid, 380, 250, 40
    s.append(f'<ellipse cx="{GX}" cy="{GY+7}" rx="{GRX}" ry="{GRY}" fill="{GREEN_D}"/>')
    s.append(f'<ellipse cx="{GX}" cy="{GY}" rx="{GRX}" ry="{GRY}" fill="{GREEN}"/>')
    # (the highlight pill goes in front of the building; see below)

    def ground_top(x):
        dx = (x - GX) / GRX
        return GY - GRY * math.sqrt(max(0.0, 1 - dx * dx))

    def ground_bottom(x):
        dx = (x - GX) / GRX
        return GY + GRY * math.sqrt(max(0.0, 1 - dx * dx))

    # Cypresses, the far ones first. Each base is checked to sit on the grass.
    def cypress(cx, base, sc):
        assert ground_top(cx) + 4 < base < ground_bottom(cx) - 4, ('tree off the grass', cx, base)
        hgt, wid = 150 * sc, 40 * sc
        out = [f'<rect x="{f(cx-4*sc)}" y="{f(base-18*sc)}" width="{f(8*sc)}" height="{f(20*sc)}" rx="{f(4*sc)}" fill="{ARCH_D}"/>']
        full = (f'M{f(cx)} {f(base-hgt)}C{f(cx+wid*0.75)} {f(base-hgt*0.55)} {f(cx+wid*0.6)} {f(base-14*sc)} {f(cx)} {f(base-14*sc)}'
                f'C{f(cx-wid*0.6)} {f(base-14*sc)} {f(cx-wid*0.75)} {f(base-hgt*0.55)} {f(cx)} {f(base-hgt)}Z')
        half = (f'M{f(cx)} {f(base-hgt)}C{f(cx+wid*0.75)} {f(base-hgt*0.55)} {f(cx+wid*0.6)} {f(base-14*sc)} {f(cx)} {f(base-14*sc)}Z')
        out.append(f'<path d="{full}" fill="{GREEN}"/><path d="{half}" fill="{GREEN_D}"/>')
        out.append(f'<rect x="{f(cx-wid*0.3)}" y="{f(base-hgt*0.64)}" width="{f(wid*0.15)}" height="{f(hgt*0.22)}" rx="{f(wid*0.075)}" fill="#8EE04A"/>')
        return ''.join(out)

    s.append(cypress(486, 384, 0.85))
    s.append(cypress(34, 386, 1.0))

    # Contact shadow: a darker band hugging the base, so the building sits in
    # the grass rather than on top of it.
    # It starts under the base (the outline reaches ROUND/2 below BOTTOM) and
    # stops short of the rounded corners, so no square end shows beneath them.
    sh_xs = [x for x in range(L + 8, R - 7)]
    s.append('<path d="M' + ' L'.join(f'{x} {f(BOTTOM + off(x))}' for x in sh_xs)
             + ' L' + ' L'.join(f'{x} {f(BOTTOM + off(x) + ROUND / 2 + 5)}' for x in reversed(sh_xs))
             + f'Z" fill="{GREEN_D}" stroke="{GREEN_D}" stroke-width="6" stroke-linejoin="round"/>')
    for x in (L, R):
        assert ground_top(x) < BOTTOM + off(x) - 6, ('corner floats above the grass', x)

    # The body: lit, then the shaded bays, then the lit strip, each the same
    # rounded outline cut to its own side, so no rim of the wrong colour shows.
    s.append(f'<path d="{body_d}" fill="{SAND}" stroke="{SAND}" stroke-width="{ROUND}" stroke-linejoin="round"/>')
    face = [f'<rect x="{f(SHADE_X)}" y="0" width="{W}" height="{H}" fill="{SAND_D}"/>',
            f'<rect x="0" y="0" width="{f(LIT_X)}" height="{H}" fill="{SAND_L}"/>']

    # Ledges and the plinth, over the arches' feet. Lighter on the lit side.
    # A band runs right out to the rounded edge, which is ROUND/2 outside L and
    # R; beyond L and R it carries on level, as the outline does.
    edge_xs = [x / 2 for x in range(2 * (L - ROUND), 2 * (R + ROUND) + 1)]
    def curve(x):
        # Past L or R the band keeps going at the slope it had there, so it
        # meets the rounded edge without a kink.
        c = min(max(x, L), R)
        h = 0.01 if c == L else -0.01
        slope = (off(c + h) - off(c)) / h
        return off(c) + slope * (x - c)

    def band(y0, y1, x_from, x_to, fill):
        bx = [x for x in edge_xs if x_from <= x <= x_to]
        return ('<path d="M' + ' L'.join(f'{f(x)} {f(y0+curve(x))}' for x in bx) + ' L'
                + ' L'.join(f'{f(x)} {f(y1+curve(x))}' for x in reversed(bx)) + f'Z" fill="{fill}"/>')

    # Bands run past both edges and are cut to the rounded outline by the mask,
    # so they meet the edge exactly, rounded corners included. The plinth runs
    # down past the base for the same reason. The ledge under the attic starts
    # at the first step of the ruin, the first place the wall is that high.
    LEFT, RIGHT = L - ROUND, R + ROUND
    for (y0, y1), start in ((LEDGE_C, LEFT), (LEDGE_B, LEFT), (LEDGE_A, edges[3] - ROUND / 2),
                            ((PLINTH[0], BOTTOM + ROUND), LEFT)):
        is_plinth = y0 == PLINTH[0]
        lit_fill = SAND_D if is_plinth else SAND_L
        dark_fill = '#D4914A' if is_plinth else LEDGE_SHADE
        face.append(band(y0, y1, start, SHADE_X, lit_fill))
        face.append(band(y0, y1, SHADE_X, RIGHT, dark_fill))
    s.append('<g mask="url(#body)">' + ''.join(face) + '</g>')

    # Arches, on the cylinder: each centred in its bay, its head just under
    # the ledge above and its foot on the ledge below, with a darker sill.
    for (t, b) in (TIER3, TIER2, TIER1):
        for k in range(N):
            sc, ws = centre_s[k], arch_ws[k]
            dark = centres[k] > SHADE_X
            s.append(f'<path d="{shape(arch_points(sc, ws, t + 9, b))}" fill="{ARCH_D if dark else ARCH}"/>')
            s.append(f'<path d="{shape(band_points(sc - ws / 2, sc + ws / 2, b - 8, b))}" fill="{ARCH_D}" opacity=".6"/>')
            left, right = cyl(sc - ws / 2, b)[0], cyl(sc + ws / 2, b)[0]
            assert edges[k] < left and right < edges[k + 1], 'arch outside its bay'

    # Attic windows, also on the cylinder: one over each arch where the attic
    # stands, a little round-ended slot.
    for k in range(N):
        sc = centre_s[k]
        if cyl(sc - arch_ws[k] / 2, 0)[0] < edges[4] + 2: continue
        ws = arch_ws[k] * 0.42
        v_mid = (ATTIC_TOP + LEDGE_A[0]) / 2
        r = ws / 2
        pts = [(sc + r * math.cos(math.pi - math.pi * i / 14), v_mid - 6 - r * math.sin(math.pi - math.pi * i / 14)) for i in range(15)]
        pts += [(sc + r * math.cos(math.pi * i / 14), v_mid + 6 + r * math.sin(math.pi * i / 14)) for i in range(15)]
        s.append(f'<path d="{shape(pts)}" fill="{ARCH_D if centres[k] > SHADE_X else ARCH}"/>')

    # A highlight pill on the lit strip, between the ledges.
    s.append(f'<rect x="{f((L + LIT_X) / 2 - 3)}" y="{f(TIER2[0] + off(L) + 10)}" width="6" height="22" rx="3" fill="#FFF3DC"/>')

    # Flags on the piers between bays, on the full-height attic.
    flags = []
    for x in (edges[5], edges[8]):
        top_y = ATTIC_TOP + off(x) - ROUND / 2
        s.append(f'<rect x="{f(x-3)}" y="{f(top_y-60)}" width="6" height="62" rx="3" fill="{ARCH_D}"/>')
        s.append(f'<circle cx="{f(x)}" cy="{f(top_y-62)}" r="6" fill="{GOLD}"/>')
        fy = top_y - 56
        s.append(f'<path d="M{f(x+3)} {f(fy)}h44l-11 14l11 14h-44z" fill="{RED}"/>')
        s.append(f'<path d="M{f(x+3)} {f(fy+14)}h33l11 14h-44z" fill="{RED_D}"/>')
        s.append(f'<rect x="{f(x+10)}" y="{f(fy+5)}" width="16" height="5" rx="2.5" fill="{RED_L}"/>')
        flags.append((x - 8, top_y - 70, x + 50, top_y))

    px = 120
    py = max(BOTTOM + off(x) + ROUND / 2 + 5 + 4 for x in (px, px + 40))
    assert py + 5 < min(ground_bottom(x) for x in (px, px + 40)) - 3, 'grass highlight off the grass'
    s.append(f'<rect x="{px}" y="{f(py)}" width="40" height="5" rx="2.5" fill="#8EE04A"/>')

    avoid = [(L - 10, ATTIC_TOP - 10, R + 10, H), (sx - sr, sy - sr, sx + sr, sy + sr), *flags,
             (0, 225, 70, H), (450, 225, W, H)]
    s.append(confetti_at(7, (12, 12, W - 12, 330), 14, avoid))
    write('colosseum.svg', W, H, ''.join(s))

# ---------------------------------------------------------------- icons (96)
def helmet():
    s = []
    # crest, a brush of red running front to back
    s.append(f'<path d="M14 40C12 14 40 6 60 10C78 14 86 28 84 40C76 30 62 26 48 26C34 26 22 32 14 40Z" fill="{RED}"/>')
    s.append(f'<path d="M60 10C78 14 86 28 84 40C78 32 70 28 60 27Z" fill="{RED_D}"/>')
    s.append(f'<rect x="26" y="16" width="20" height="7" rx="3.5" fill="{RED_L}" transform="rotate(-16 36 19)"/>')
    # dome
    s.append(f'<path d="M16 62C16 40 30 30 48 30C66 30 80 40 80 62Z" fill="{GOLD}"/>')
    s.append(f'<path d="M48 30C66 30 80 40 80 62H62C62 46 57 35 48 30Z" fill="{GOLD_D}"/>')
    s.append(f'<rect x="25" y="38" width="14" height="8" rx="4" fill="{GOLD_L}" transform="rotate(-32 32 42)"/>')
    # brim
    s.append(f'<rect x="10" y="58" width="76" height="11" rx="5.5" fill="{GOLD_D}"/>')
    s.append(f'<rect x="16" y="60" width="18" height="4" rx="2" fill="{GOLD}"/>')
    # cheek guards
    s.append(f'<path d="M20 66h17v10c0 6-4 10-8.5 10S20 82 20 76z" fill="{GOLD}"/>')
    s.append(f'<path d="M59 66h17v10c0 6-4 10-8.5 10S59 82 59 76z" fill="{GOLD_D}"/>')
    s.append(f'<circle cx="28.5" cy="74" r="2.5" fill="{GOLD_D}"/><circle cx="67.5" cy="74" r="2.5" fill="{GOLD}"/>')
    write('helmet.svg', 96, 96, ''.join(s))

def column():
    s = []
    s.append(f'<rect x="18" y="12" width="60" height="12" rx="6" fill="{SAND}"/>')
    s.append(f'<circle cx="20" cy="22" r="8" fill="{SAND_D}"/><circle cx="76" cy="22" r="8" fill="{SAND_D}"/>')
    s.append(f'<circle cx="20" cy="22" r="3" fill="{SAND}"/><circle cx="76" cy="22" r="3" fill="{SAND}"/>')
    s.append(f'<rect x="26" y="26" width="44" height="54" fill="{SAND}"/>')
    s.append(f'<rect x="56" y="26" width="14" height="54" fill="{SAND_D}"/>')
    for x in (32, 42, 52):
        s.append(f'<rect x="{x}" y="30" width="4" height="46" rx="2" fill="{SAND_L}"/>')
    s.append(f'<rect x="22" y="78" width="52" height="8" rx="4" fill="{SAND_D}"/>')
    s.append(f'<rect x="16" y="84" width="64" height="8" rx="4" fill="{RED}"/>')
    s.append(f'<rect x="54" y="84" width="26" height="8" rx="4" fill="{RED_D}"/>')
    write('column.svg', 96, 96, ''.join(s))

def scroll():
    s = []
    s.append(f'<rect x="20" y="16" width="56" height="64" rx="6" fill="#FFF1C9"/>')
    s.append(f'<rect x="56" y="16" width="20" height="64" fill="#F6DE9E"/>')
    for y, w in ((30, 34), (40, 40), (50, 28), (60, 36)):
        s.append(f'<rect x="28" y="{y}" width="{w}" height="5" rx="2.5" fill="#E6C27A"/>')
    for y in (10, 76):
        s.append(f'<rect x="12" y="{y}" width="72" height="12" rx="6" fill="{GOLD}"/>')
        s.append(f'<rect x="56" y="{y}" width="28" height="12" rx="6" fill="{GOLD_D}"/>')
        s.append(f'<rect x="18" y="{y+3}" width="14" height="4" rx="2" fill="{GOLD_L}"/>')
    # seal
    s.append(f'<circle cx="66" cy="68" r="11" fill="{RED}"/>')
    s.append(f'<path d="M66 57a11 11 0 0 1 0 22z" fill="{RED_D}"/>')
    s.append(f'<rect x="60" y="62" width="6" height="4" rx="2" fill="{RED_L}"/>')
    write('scroll.svg', 96, 96, ''.join(s))

def tablet():
    """A wax writing tablet and its stylus: the grammar's picture."""
    WOOD, WOOD_D, WOOD_L = ARCH, ARCH_D, '#D9894A'
    WAX, WAX_LINE = '#5A3A1E', '#C98543'
    s = ['<g transform="translate(-6 -2)">']
    # the wooden frame, its right side in shade
    s.append(f'<rect x="14" y="14" width="60" height="72" rx="9" fill="{WOOD}"/>')
    s.append(f'<path d="M56 14h9a9 9 0 0 1 9 9v54a9 9 0 0 1-9 9H56z" fill="{WOOD_D}"/>')
    s.append(f'<rect x="17.5" y="22" width="3.5" height="16" rx="1.75" fill="{WOOD_L}"/>')
    # the wax, with lines scratched into it
    s.append(f'<rect x="24" y="23" width="40" height="54" rx="4" fill="{WAX}"/>')
    for y, w in ((32, 28), (42, 22), (52, 30), (62, 16)):
        s.append(f'<rect x="30" y="{y}" width="{w}" height="4" rx="2" fill="{WAX_LINE}"/>')
    # the stylus, leaning across the frame
    s.append('<g transform="translate(76 54) rotate(20)">')
    s.append(f'<rect x="-4" y="-32" width="8" height="54" rx="4" fill="{GOLD}"/>')
    s.append(f'<path d="M0 -32a4 4 0 0 1 4 4v46a4 4 0 0 1-4 4z" fill="{GOLD_D}"/>')
    s.append(f'<rect x="-2.5" y="-24" width="2.5" height="14" rx="1.25" fill="{GOLD_L}"/>')
    s.append('<path d="M-4 20h8l-4 12z" fill="#4B4B4B"/>')
    s.append(f'<rect x="-7" y="-38" width="14" height="8" rx="4" fill="{GOLD_D}"/>')
    s.append('</g></g>')
    write('tablet.svg', 96, 96, ''.join(s))

def amphora():
    """A terracotta amphora: the dictionary page's picture."""
    TERRA, TERRA_D, TERRA_L = '#E07B39', '#B85C22', '#F5A66B'
    body = 'M48 32C68 32 76 46 74 60C72 72 60 82 52 88H44C36 82 24 72 22 60C20 46 28 32 48 32Z'
    s = [f'<defs><clipPath id="ab"><path d="{body}"/></clipPath></defs>']
    # handles, from the neck down to the shoulder
    for d in ('M41 20C27 18 22 32 31 41', 'M55 20C69 18 74 32 65 41'):
        s.append(f'<path d="{d}" fill="none" stroke="{TERRA_D}" stroke-width="6" stroke-linecap="round"/>')
    # neck and rim
    s.append(f'<rect x="40" y="14" width="16" height="22" fill="{TERRA}"/>')
    s.append(f'<rect x="49" y="14" width="7" height="22" fill="{TERRA_D}"/>')
    s.append(f'<rect x="34" y="8" width="28" height="9" rx="4.5" fill="{TERRA_D}"/>')
    # body, with its right side in shade and a painted band
    s.append(f'<path d="{body}" fill="{TERRA}"/>')
    s.append(f'<g clip-path="url(#ab)">'
             f'<rect x="20" y="50" width="60" height="7" fill="{GOLD}"/>'
             f'<rect x="20" y="60" width="60" height="3" fill="{GOLD_D}"/>'
             f'<rect x="56" y="28" width="24" height="64" fill="{TERRA_D}" opacity=".45"/></g>')
    s.append(f'<rect x="30" y="38" width="6" height="10" rx="3" fill="{TERRA_L}" transform="rotate(-25 33 43)"/>')
    s.append(f'<rect x="28" y="64" width="5" height="8" rx="2.5" fill="{TERRA_L}" transform="rotate(25 30 68)"/>')
    # foot
    s.append(f'<path d="M43 86h10l-1.5 6a3.5 3.5 0 0 1-7 0z" fill="{TERRA_D}"/>')
    write('amphora.svg', 96, 96, ''.join(s))

def logo():
    """The logo and the favicon are the dictionary's scroll."""
    with open(os.path.join(OUT, 'scroll.svg')) as fh:
        svg = fh.read()
    with open(os.path.join(OUT, 'logo.svg'), 'w') as fh:
        fh.write(svg)
    with open(os.path.join(OUT, '..', '..', 'favicon.svg'), 'w') as fh:
        fh.write(svg.replace('viewBox="0 0 96 96"', 'viewBox="6 4 84 88"'))

colosseum(); helmet(); column(); scroll(); tablet(); amphora(); logo()
print('ok')
