from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / 'dist/fonts'
OUT = ROOT / 'dist/immersive/textures/showcase-screen.png'
PAPER, INK, TEAL, CHROME, BLUE = ('#fffaf0', '#242b30', '#327b78', '#d4d1c5', '#244a70')

def font(size, kind='body'):
    file = {'body': 'OldStandard-Regular.ttf', 'bold': 'OldStandard-Bold.ttf', 'ui': 'PixelifySans.ttf', 'display': 'AlfaSlabOne-Regular.ttf'}[kind]
    return ImageFont.truetype(str(FONTS / file), size)

def wrap(draw, text, f, width):
    lines = []
    line = ''
    for word in text.split():
        trial = (line + ' ' + word).strip()
        if draw.textlength(trial, font=f) > width and line:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    return lines

def render():
    im = Image.new('RGB', (960, 744), TEAL)
    d = ImageDraw.Draw(im)
    for i, name in enumerate(['Showcase', 'Calculator', 'Paint', 'Notepad']):
        y = 31 + i * 100
        x = 39
        if i == 0:
            d.rectangle((x, y + 4, x + 32, y + 32), fill='#dcae56', outline=INK, width=2)
            d.rectangle((x + 6, y, x + 27, y + 25), fill=PAPER, outline=INK)
            d.polygon([(x, y + 12), (x + 34, y + 12), (x + 30, y + 32), (x, y + 32)], fill='#ebc572', outline=INK)
        elif i == 1:
            d.rectangle((x + 3, y, x + 29, y + 35), fill=CHROME, outline=INK, width=2)
            d.rectangle((x + 7, y + 4, x + 25, y + 13), fill='#94af93', outline=INK)
            for yy in (y + 18, y + 26):
                for xx in (x + 7, x + 14, x + 21):
                    d.rectangle((xx, yy, xx + 3, yy + 4), fill=BLUE)
        elif i == 2:
            d.rectangle((x + 2, y, x + 30, y + 34), fill=PAPER, outline=INK, width=2)
            d.rectangle((x + 6, y + 9, x + 19, y + 17), fill='#d99354')
            d.rectangle((x + 6, y + 23, x + 26, y + 29), fill='#8fae9b')
            d.line((x + 14, y + 23, x + 32, y + 1), fill='#d7aa60', width=6)
            d.polygon([(x + 11, y + 27), (x + 14, y + 18), (x + 19, y + 23)], fill=BLUE)
        else:
            d.rectangle((x + 4, y, x + 30, y + 34), fill='#fff5cd', outline=INK, width=2)
            d.rectangle((x + 4, y, x + 30, y + 4), fill='#b76f60')
            for yy in (y + 10, y + 17, y + 24):
                d.line((x, yy, x + 8, yy), fill='#82948a', width=2)
                d.line((x + 12, yy, x + 25, yy), fill='#7b9baf')
        tw = d.textlength(name, font=font(16, 'ui'))
        d.text((56 - tw / 2, y + 42), name, font=font(16, 'ui'), fill=PAPER)
    x0, y0, x1, y1 = (120, 43, 929, 701)
    d.rectangle((x0 + 4, y0 + 4, x1 + 4, y1 + 4), fill='#235754')
    d.rectangle((x0, y0, x1, y1), fill=CHROME, outline=INK, width=1)
    d.line((x0 + 1, y1 - 1, x0 + 1, y0 + 1, x1 - 1, y0 + 1), fill='#ffffec')
    d.rectangle((x0 + 5, y0 + 5, x1 - 5, y0 + 36), fill=BLUE)
    d.text((x0 + 15, y0 + 11), 'Showcase', font=font(18, 'ui'), fill='white')
    d.rectangle((x1 - 32, y0 + 9, x1 - 10, y0 + 30), fill=CHROME, outline=INK)
    d.line((x1 - 26, y0 + 14, x1 - 16, y0 + 24), fill=INK, width=2)
    d.line((x1 - 16, y0 + 14, x1 - 26, y0 + 24), fill=INK, width=2)
    sx = x0 + 150
    d.rectangle((x0 + 5, y0 + 41, x1 - 5, y1 - 5), fill=PAPER, outline='#89918b')
    d.rectangle((x0 + 6, y0 + 42, sx, y1 - 6), fill='#ece9da')
    for i, label in enumerate(['About', 'Experience', 'Projects', 'Contact', 'Résumé']):
        yy = y0 + 64 + i * 44
        if i == 0:
            d.rectangle((x0 + 17, yy - 5, sx - 12, yy + 28), fill=BLUE)
        d.text((x0 + 27, yy), label, font=font(18, 'ui'), fill=PAPER if i == 0 else '#3c4d4c')
    xx = sx + 34
    yy = y0 + 69
    width = x1 - xx - 40
    d.text((xx, yy), 'James Lee', font=font(43, 'display'), fill='#294641')
    yy += 76
    text = 'My background combines information systems, computer science, and quantitative research. I’ve worked on AI-assisted workflows, personalized consumer products, and financial prediction models.'
    for line in wrap(d, text, font(19), width):
        d.text((xx, yy), line, font=font(19), fill=INK)
        yy += 29
    yy += 24
    d.text((xx, yy), 'Education', font=font(25, 'bold'), fill='#344c47')
    yy += 43
    d.text((xx, yy), 'Carnegie Mellon University', font=font(19, 'bold'), fill=INK)
    yy += 30
    for line in wrap(d, 'B.S. in Information Systems, double major in Computer Science', font(19), width):
        d.text((xx, yy), line, font=font(19), fill=INK)
        yy += 28
    yy += 5
    d.text((xx, yy), 'AUGUST 2022 – MAY 2026', font=font(14, 'ui'), fill='#626a60')
    yy += 36
    for line in wrap(d, 'Coursework: Data Structures & Algorithms, Database Design, Computer Vision, and Probability Theory.', font(19), width):
        d.text((xx, yy), line, font=font(19), fill=INK)
        yy += 28
    d.rectangle((x1 - 18, y0 + 42, x1 - 6, y1 - 6), fill='#ece9da')
    d.rectangle((x1 - 17, y0 + 43, x1 - 7, y0 + 186), fill='#a6ada0', outline='#818d7d')
    im.save(OUT, optimize=True)
    print(OUT)
if __name__ == '__main__':
    render()
