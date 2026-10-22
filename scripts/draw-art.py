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

def f(x): return f'{x:.1f}'.rstrip('0').rstrip('.')

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
def colosseum():
    W, H = 520, 440
    L, R = 70, 450
    mid, span = (L + R) / 2, (R - L) / 2
    DIP = 26
    def off(x):
        t = (x - L) / (R - L)
        return 4 * DIP * t * (1 - t)
    def top_base(x):
        # The ruined side: the outer wall is lower on the left, as on the real one.
        if x < 190: return 150
        if x < 214: return 132
        if x < 236: return 114
        return 96
    BOTTOM = 372
    xs = [L + i for i in range(0, R - L + 1, 2)]
    top = [(x, top_base(x) + off(x)) for x in xs]
    bot = [(x, BOTTOM + off(x)) for x in reversed(xs)]
    pts = top + bot
    body_d = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + 'Z'
    s = []
    s.append('<defs><clipPath id="c"><path d="%s"/></clipPath></defs>' % body_d)
    # sun
    s.append(f'<circle cx="392" cy="86" r="54" fill="{GOLD}"/><circle cx="392" cy="86" r="54" fill="{GOLD_D}" clip-path="inset(0 0 0 50%)" opacity="0"/>')
    s.append(f'<path d="M392 32a54 54 0 0 1 0 108z" fill="{GOLD_D}" opacity=".35"/>')
    s.append(f'<rect x="352" y="52" width="26" height="12" rx="6" fill="{GOLD_L}" transform="rotate(-35 365 58)"/>')
    # ground
    s.append(f'<ellipse cx="{mid}" cy="{BOTTOM+DIP+6}" rx="236" ry="26" fill="{GREEN}"/>')
    s.append(f'<path d="M{mid-236} {BOTTOM+DIP+6}a236 26 0 0 0 472 0z" fill="{GREEN_D}"/>')
    # cypresses
    for cx, sc in ((38, 1.0), (488, 0.9), (470, 0.7)):
        hgt = 150 * sc; wid = 40 * sc
        base = BOTTOM + DIP - 2
        s.append(f'<rect x="{f(cx-4)}" y="{f(base-18)}" width="8" height="22" rx="4" fill="{ARCH_D}"/>')
        d = f'M{f(cx)} {f(base-hgt)}C{f(cx+wid*0.75)} {f(base-hgt*0.55)} {f(cx+wid*0.6)} {f(base-12)} {f(cx)} {f(base-12)}C{f(cx-wid*0.6)} {f(base-12)} {f(cx-wid*0.75)} {f(base-hgt*0.55)} {f(cx)} {f(base-hgt)}Z'
        s.append(f'<path d="{d}" fill="{GREEN}"/>')
        d2 = f'M{f(cx)} {f(base-hgt)}C{f(cx+wid*0.75)} {f(base-hgt*0.55)} {f(cx+wid*0.6)} {f(base-12)} {f(cx)} {f(base-12)}Z'
        s.append(f'<path d="{d2}" fill="{GREEN_D}"/>')
        s.append(f'<rect x="{f(cx-wid*0.28)}" y="{f(base-hgt*0.62)}" width="{f(wid*0.16)}" height="{f(hgt*0.22)}" rx="{f(wid*0.08)}" fill="#8EE04A"/>')
    # body, rounded corners by stroking in its own colour
    s.append(f'<path d="{body_d}" fill="{SAND}" stroke="{SAND}" stroke-width="12" stroke-linejoin="round"/>')
    g = []
    g.append(f'<rect x="{R-62}" y="0" width="80" height="{H}" fill="{SAND_D}"/>')
    g.append(f'<rect x="{L-10}" y="0" width="26" height="{H}" fill="{SAND_L}"/>')
    # ledges between tiers
    for y, x_from in ((292, L), (214, L), (150 if False else 0, 0)):
        if not x_from: continue
        d = 'M' + ' L'.join(f'{f(x)} {f(y+off(x))}' for x in xs) + ' L' + ' L'.join(f'{f(x)} {f(y+10+off(x))}' for x in reversed(xs)) + 'Z'
        g.append(f'<path d="{d}" fill="{SAND_L}"/>')
    ax = [x for x in xs if x >= 236]
    d = 'M' + ' L'.join(f'{f(x)} {f(150+off(x))}' for x in ax) + ' L' + ' L'.join(f'{f(x)} {f(160+off(x))}' for x in reversed(ax)) + 'Z'
    g.append(f'<path d="{d}" fill="{SAND_L}"/>')
    s.append('<g clip-path="url(#c)">' + ''.join(g) + '</g>')
    # arcades
    for (yb, h, n, lo) in ((370, 62, 9, L), (290, 58, 9, L), (212, 50, 9, L)):
        for i in range(n):
            th = (i + 0.5) * math.pi / n
            cx = mid - span * 0.84 * math.cos(th)
            w = 10 + 24 * math.sin(th)
            y = yb - 4 + off(cx)
            if yb == 212 and top_base(cx - w / 2) > 150 - 1 and cx < 190 and False: continue
            right = cx > mid + span * 0.55
            s.append(arch(cx, y, w, h, ARCH_D if right else ARCH))
            # a lit sill inside each arch
            s.append(f'<rect x="{f(cx - w/2)}" y="{f(y-8)}" width="{f(w)}" height="8" fill="{ARCH_D}" opacity=".55"/>')
    # attic windows
    for i in range(6):
        cx = 254 + i * 33
        y = 128 + off(cx)
        s.append(f'<rect x="{f(cx-7)}" y="{f(y-12)}" width="14" height="20" rx="5" fill="{ARCH}"/>')
    # highlight pills on the left face
    s.append(f'<rect x="{L+4}" y="{f(166)}" width="8" height="22" rx="4" fill="#FFF3DC"/>')
    # banners
    for px, top_y, flip in ((262, 100 + off(262), False), (430, 96 + off(430), True)):
        s.append(f'<rect x="{px-3}" y="{f(top_y-62)}" width="6" height="66" rx="3" fill="{ARCH_D}"/>')
        s.append(f'<circle cx="{px}" cy="{f(top_y-64)}" r="6" fill="{GOLD}"/>')
        fy = top_y - 58
        d = f'M{px+3} {f(fy)}h46l-12 15l12 15h-46z'
        s.append(f'<path d="{d}" fill="{RED}"/>')
        s.append(f'<path d="M{px+3} {f(fy+15)}h34l12 15h-46z" fill="{RED_D}"/>')
        s.append(f'<rect x="{px+10}" y="{f(fy+5)}" width="16" height="5" rx="2.5" fill="{RED_L}"/>')
    s.append(confetti(7, (10, 10, 510, 330), 16, avoid=(60, 26, 470, 400)))
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

def laurel():
    s = []
    def leaf(x, y, a, c):
        return f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="9" ry="4.5" fill="{c}" transform="rotate({f(a)} {f(x)} {f(y)})"/>'
    for side in (-1, 1):
        for i in range(6):
            th = math.radians(200 - i * 26) if side < 0 else math.radians(-20 + i * 26)
            r = 32
            x = 48 + r * math.cos(th) * (1 if side > 0 else 1)
            y = 50 - r * math.sin(th) * -1
            x = 48 + side * abs(r * math.cos(math.radians(250 - i * 26 + 90)))
            ang = 90 - i * 26
            px = 48 + side * 32 * math.sin(math.radians(30 + i * 24))
            py = 54 + 32 * math.cos(math.radians(30 + i * 24))
            tilt = side * (60 + i * 24)
            s.append(leaf(px, py, tilt, GREEN if (i % 2 == 0) else GREEN_D))
            ox = 48 + side * 22 * math.sin(math.radians(40 + i * 24))
            oy = 54 + 22 * math.cos(math.radians(40 + i * 24))
            s.append(leaf(ox, oy, tilt + side * 40, GREEN_D if (i % 2 == 0) else GREEN))
    s.append(f'<path d="M40 80l-8 12l8-2l4 4z" fill="{RED_D}"/><path d="M56 80l8 12l-8-2l-4 4z" fill="{RED_D}"/>')
    s.append(f'<rect x="38" y="76" width="20" height="10" rx="5" fill="{RED}"/>')
    write('laurel.svg', 96, 96, ''.join(s))

def owl():
    BR, BR_D, BEL = '#C07A3E', '#9C5E2A', '#F6DDB4'
    s = []
    # body
    s.append(f'<path d="M20 50C20 30 32 22 48 22C64 22 76 30 76 50V70C76 84 64 90 48 90C32 90 20 84 20 70Z" fill="{BR}"/>')
    s.append(f'<path d="M48 22C64 22 76 30 76 50V70C76 84 64 90 48 90Z" fill="{BR_D}" opacity=".45"/>')
    s.append(f'<path d="M32 66C32 56 40 52 48 52C56 52 64 56 64 66V74C64 82 56 86 48 86C40 86 32 82 32 74Z" fill="{BEL}"/>')
    for x, y in ((42, 64), (54, 64), (48, 72), (42, 79), (54, 79)):
        s.append(f'<path d="M{x-3} {y}q3 4 6 0" fill="none" stroke="#E2BC86" stroke-width="2.4" stroke-linecap="round"/>')
    # helmet with crest: Minerva's owl
    s.append(f'<path d="M22 30C24 10 72 10 74 30C66 23 30 23 22 30Z" fill="{RED}"/>')
    s.append(f'<path d="M24 34C24 22 34 16 48 16C62 16 72 22 72 34Z" fill="{GOLD}"/>')
    s.append(f'<path d="M48 16C62 16 72 22 72 34H60C60 26 56 19 48 16Z" fill="{GOLD_D}"/>')
    s.append(f'<rect x="20" y="31" width="56" height="7" rx="3.5" fill="{GOLD_D}"/>')
    # eyes
    for cx in (37, 59):
        s.append(f'<circle cx="{cx}" cy="46" r="11" fill="#fff"/>')
        s.append(f'<circle cx="{cx+2}" cy="47" r="5.5" fill="#3C3C3C"/>')
        s.append(f'<circle cx="{cx+4}" cy="45" r="1.8" fill="#fff"/>')
    s.append(f'<path d="M44 54h8l-4 7z" fill="{ORANGE}"/>')
    # feet
    s.append(f'<rect x="36" y="86" width="10" height="6" rx="3" fill="{ORANGE}"/><rect x="50" y="86" width="10" height="6" rx="3" fill="{ORANGE}"/>')
    write('owl.svg', 96, 96, ''.join(s))

def logo():
    # A small red Colosseum: the brand mark and the favicon.
    s = []
    s.append(f'<path d="M6 16C6 10 14 6 24 6C34 6 42 10 42 16V36H6Z" fill="{RED}"/>')
    s.append(f'<path d="M24 6C34 6 42 10 42 16V36H30V7Z" fill="{RED_D}"/>')
    s.append(f'<rect x="4" y="34" width="40" height="6" rx="3" fill="{RED_D}"/>')
    for y, hgt in ((22, 12), (12, 7)):
        for i, x in enumerate((10, 18.5, 27, 35.5)):
            w = 5
            s.append(arch(x + 0.5 + w/2 - 2.5 + 2.5, y + hgt, w, hgt, '#fff'))
    write('logo.svg', 48, 44, ''.join(s))
    with open(os.path.join(OUT, '..', '..', 'favicon.svg'), 'w') as fh:
        fh.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -4 52 52" width="48" height="48">' + ''.join(s) + '</svg>\n')

colosseum(); helmet(); column(); scroll(); laurel(); owl(); logo()
print('ok')
