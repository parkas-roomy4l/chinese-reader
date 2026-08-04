from PIL import Image, ImageDraw, ImageFont

W,H = 1200,630
PAPER=(247,243,234); INK=(43,38,32); INK_SOFT=(107,99,87)
SEAL=(176,46,32); LINE=(217,208,191); CARD=(255,253,248); GRID=(226,199,193)
CJK_B="/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
CJK_R="/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"
def f(p,s): return ImageFont.truetype(p,s)

im=Image.new("RGB",(W,H),PAPER); d=ImageDraw.Draw(im)
d.rectangle([34,34,W-34,H-34],outline=LINE,width=2)
d.line([34,36,W-34,36],fill=SEAL,width=5)

# ---- 田字格 seal box ----
bx,by,bs = 96,186,258
d.rounded_rectangle([bx,by,bx+bs,by+bs],radius=18,fill=CARD,outline=SEAL,width=11)
cx,cy=bx+bs//2,by+bs//2
def dashed(x0,y0,x1,y1,dash=13,gap=10):
    if x0==x1:
        y=y0
        while y<y1:
            d.line([x0,y,x0,min(y+dash,y1)],fill=GRID,width=2); y+=dash+gap
    else:
        x=x0
        while x<x1:
            d.line([x,y0,min(x+dash,x1),y0],fill=GRID,width=2); x+=dash+gap
inset=16
dashed(bx+inset,cy,bx+bs-inset,cy)
dashed(cx,by+inset,cx,by+bs-inset)

zi=f(CJK_B,172)
bb=d.textbbox((0,0),"字",font=zi)
d.text((cx-(bb[2]-bb[0])/2-bb[0], cy-(bb[3]-bb[1])/2-bb[1]),"字",font=zi,fill=SEAL)

# ---- right column ----
x=430; RIGHT=W-70
d.text((x,176),"一字一世界",font=f(CJK_B,84),fill=INK)
d.text((x,280),"yī zì yī shìjiè · one word, one world",font=f(CJK_B,32),fill=SEAL)

body=f(CJK_R,33)
y=342
for ln in ["The 1,000 words that carry modern","Chinese life — from 你好 to 房租,","面试 and 分手."]:
    d.text((x,y),ln,font=body,fill=INK_SOFT); y+=45

# ---- pills: measure first, shrink to fit the frame ----
labels=["HSK 1–3 complete","Two stories","Cards + game"]
size=26
while size>15:
    pf=f(CJK_R,size); pad_x,gap=18,13
    widths=[d.textbbox((0,0),l,font=pf)[2]-d.textbbox((0,0),l,font=pf)[0]+pad_x*2 for l in labels]
    if x+sum(widths)+gap*(len(labels)-1) <= RIGHT: break
    size-=1
pf=f(CJK_R,size); pad_x,pad_y,gap=18,12,13
px,py_=x,494
for l in labels:
    bb=d.textbbox((0,0),l,font=pf); w=bb[2]-bb[0]; h=bb[3]-bb[1]
    d.rounded_rectangle([px,py_,px+w+pad_x*2,py_+h+pad_y*2],radius=(h+pad_y*2)//2,outline=SEAL,width=2)
    d.text((px+pad_x-bb[0],py_+pad_y-bb[1]),l,font=pf,fill=SEAL)
    px+=w+pad_x*2+gap
print("pills end at",px,"frame right edge",RIGHT,"-> fits:",px<=RIGHT)

im.save("/mnt/user-data/outputs/og-image.png")
im.convert("RGB").save("/mnt/user-data/outputs/og-image.jpg",quality=92)
print("saved at",im.size)
