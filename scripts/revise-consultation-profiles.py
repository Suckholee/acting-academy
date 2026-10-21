"""Replace only the four instructor pages; retain existing navigation and other pages."""
import argparse
import io
import json
from pathlib import Path
from xml.sax.saxutils import escape
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT/'private-assets/consultation/versions/e0bc62394fd331f1/guide.pdf')
parser.add_argument('--output', type=Path, default=ROOT/'output/pdf/강사_경력_출연작_확장_상담자료.pdf')
args = parser.parse_args()
profiles = json.loads((ROOT/'content/consultation-profiles.json').read_text())
pdfmetrics.registerFont(TTFont('K', '/Users/VIBRA_PETER/Library/Fonts/NanumBarunGothic.ttf'))
pdfmetrics.registerFont(TTFont('KB', '/Users/VIBRA_PETER/Library/Fonts/NanumSquareB.ttf'))
pdfmetrics.registerFont(TTFont('D', '/System/Library/Fonts/Supplemental/AppleMyungjo.ttf'))
pdfmetrics.registerFont(TTFont('E', '/System/Library/Fonts/Supplemental/Arial.ttf'))
W, H = 768, 1024
INK, GOLD, MUT, LINE = '#222421', '#9B7C47', '#71736B', '#DAD7CD'
stream = io.BytesIO()
c = canvas.Canvas(stream, pagesize=(W,H), invariant=1)
def text(x,y,value,size=17,color=INK,font='K'):
    c.setFillColor(HexColor(color)); c.setFont(font,size); c.drawString(x,H-y-size*.85,value)
def line(x,y,width):
    c.setStrokeColor(HexColor(LINE)); c.setLineWidth(.65); c.line(x,H-y,x+width,H-y)
def para(x,y,value,width,size=16,leading=23):
    p=Paragraph(escape(value).replace('\n','<br/>'),ParagraphStyle('text',fontName='K',fontSize=size,leading=leading,textColor=HexColor(INK),wordWrap='CJK'))
    _,height=p.wrap(width,1000);p.drawOn(c,x,H-y-height);return y+height

def section(x,y,title,items,width=326,size=16.5,leading=18):
    text(x,y,title,18,GOLD,'KB');y+=34
    for item in items:
        text(x,y,'·',size,GOLD)
        y=para(x+13,y,item,width-13,size,leading)+2
    return y+14

for profile in profiles:
    c.setFillColor(HexColor('#F7F4ED'));c.rect(0,0,W,H,fill=1,stroke=0)
    text(42,29,'김정태 배우아카데미',16);text(555,34,'CONSULTATION GUIDE',10,MUT,'E');line(42,67,684)
    image=Image.open(ROOT/'published-source'/profile['image'].lstrip('/')).convert('RGB')
    if profile['name']=='김정태':image=image.crop((image.width//2,0,image.width,image.height))
    image=ImageOps.fit(image,(420,526),centering=(.5,.21))
    c.drawImage(ImageReader(image),42,H-101-263,210,263)
    text(284,110,profile['english'],10.5,GOLD,'E')
    text(284,145,profile['name'],44,INK,'D');text(284,205,profile['role'],21,GOLD,'KB')
    para(284,244,profile['course'],442,18,26);line(284,300,442)
    y=316
    for item in profile['background']:y=para(284,y,item,442,15,22)+5
    assert y<391,(profile['name'],'background overflow',y)
    if profile.get('photoCredit'):text(42,371,profile['photoCredit'],7.5,MUT)
    text(42,402,'주요 출연작 · 활동 경력',25,INK,'KB');text(42,437,'제공된 강사 프로필 기준',11,MUT);line(42,460,684)
    for column,x in zip(profile['columns'],[42,400]):
        y=480
        for group in column:y=section(x,y,group['title'],group['items'],width=326,size=15.5,leading=18)
        assert y<953,(profile['name'],'credits overflow',y)
    line(42,957,684);text(42,981,'KIM JUNG TAE ACTING ACADEMY',9,MUT,'E')
    for title,x in [('처음',452),('과정',516),('수강료',580)]:text(x,978,title,14,MUT)
    text(679,979,f"{profile['page']:02d} / 09",11,MUT,'E');c.showPage()
c.save();stream.seek(0)
original=PdfReader(args.source);replacement=PdfReader(stream)
assert len(original.pages)==9 and all(tuple(p.mediabox)==(0,0,768,1024) for p in original.pages)
writer=PdfWriter();writer.clone_document_from_reader(original)
for profile,page in zip(profiles,replacement.pages):
    target=writer.pages[profile['page']-1]
    for key in ['/Contents','/Resources']:target[NameObject(key)]=page.raw_get(key).clone(writer)
writer.add_metadata({'/Title':'김정태 배우아카데미 | 경력·출연작 중심 상담 가이드','/Author':'김정태 배우아카데미'})
args.output.parent.mkdir(parents=True,exist_ok=True)
with args.output.open('wb') as output:writer.write(output)
check=PdfReader(args.output)
for profile in profiles:
    page=check.pages[profile['page']-1]
    assert len(page.images)==1,(profile['name'],'expected one portrait')
    assert len(page.get('/Annots',[]))==len(original.pages[profile['page']-1].get('/Annots',[]))
    for column in profile['columns']:
        for group in column:
            for title in group['items']:assert ''.join(title.split()) in ''.join(page.extract_text().split()),title
print(args.output)
