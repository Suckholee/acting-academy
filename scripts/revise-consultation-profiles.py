"""Revise instructor, audition and partner-benefit pages while retaining navigation."""
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
# A photo-free program overview gives the audition and production opportunities priority.
c.setFillColor(HexColor('#F7F4ED'));c.rect(0,0,W,H,fill=1,stroke=0)
text(42,29,'김정태 배우아카데미',16);text(555,34,'CONSULTATION GUIDE',10,MUT,'E');line(42,67,684)
text(42,103,'PROGRAMS & OUR DIFFERENCE',10.5,GOLD,'E')
text(42,140,'배움이, 다음 장면으로.',35,INK,'KB')
text(42,195,'나에게 맞는 과정에서 시작하는 연기.',18,MUT)
courses=[('카메라·무대 연기 기초','김형민 강사'),('카메라·무대 연기 중급','편보승 주임강사'),('카메라·무대 연기 프리미엄','김정태 원장'),('오디션 트레이닝','오디션 준비'),('취미반','뮤지컬·연기·보컬'),('시니어 모델 트레이닝','시니어 모델의 시작')]
for index,(title,subtitle) in enumerate(courses):
    x=42+(index%2)*350;y=250+(index//2)*98
    text(x,y,title,19,INK,'KB');text(x,y+33,subtitle,15,MUT);line(x,y+72,334)
# Keep the recurring audition prominent while separating the three requested opportunities.
c.setFillColor(HexColor('#222823'));c.roundRect(42,H-930,684,382,10,fill=1,stroke=0)
text(70,568,'THE KJT ADVANTAGE',11,'#D2B980','E')
text(70,600,'4개월마다,',36,'#F7F4ED','KB')
text(70,648,'자체 오디션.',40,'#E4C487','KB')
text(70,711,'현직 배우·액팅코치의 수업 · 자체 제작 작품 참여',18,'#F7F4ED')
text(70,755,'협력 에이전시 작품 오디션 진행',20,'#F7F4ED','KB')
text(70,783,'- 피카소유니온 외 다수',16,'#E4C487')
text(70,819,'감독 오디션 후 캐스팅 진행',20,'#F7F4ED','KB')
text(70,860,'김정태 배우 특강 외 다수 특강 진행',20,'#F7F4ED','KB')
text(70,903,'일정·참여 조건은 별도 안내합니다.',12,'#CAD0C1')
line(42,957,684);text(42,981,'KIM JUNG TAE ACTING ACADEMY',9,MUT,'E')
for title,x in [('처음',452),('과정',516),('수강료',580)]:text(x,978,title,14,MUT)
text(679,979,'06 / 09',11,MUT,'E');c.showPage()
# Recorded feedback: all studio examples must be Im Do Yoon's actual studio photos.
c.setFillColor(HexColor('#F7F4ED'));c.rect(0,0,W,H,fill=1,stroke=0)
text(42,29,'김정태 배우아카데미',16);text(555,34,'CONSULTATION GUIDE',10,MUT,'E');line(42,67,684)
text(42,103,'PROFILE STUDIO & MEMBER BENEFITS',10.5,GOLD,'E')
text(42,141,'프로필의 완성도까지,',34,INK,'KB')
text(42,188,'함께 준비합니다.',34,INK,'KB')
for number,x in enumerate([42,276,510],1):
    source=ROOT/f'private-assets/consultation/source-photos/im-do-yoon-studio-20261021-{number}.jpg'
    image=Image.open(source).convert('RGB')
    image=ImageOps.fit(image,(648,906),centering=(.5,.25))
    c.drawImage(ImageReader(image),x,H-245-302,216,302)
text(42,560,'픽셀그램 스튜디오 촬영 예시 · 임도윤 실장',11,MUT)
c.setFillColor(HexColor('#222823'));c.roundRect(42,H-725,684,135,7,fill=1,stroke=0)
text(64,605,'01 / PROFILE STUDIO',10.5,'#D2B980','E')
text(64,631,'픽셀그램 스튜디오',23,'#F7F4ED','KB')
text(64,669,'3컨셉 20만 원',28,'#F7F4ED','KB');text(467,677,'50% 할인가',21,'#E4C487','KB')
text(64,708,'촬영 구성·예약 일정은 제휴처 문의',11,'#CAD0C1')
c.setFillColor(HexColor('#EAE6DB'));c.roundRect(42,H-875,684,135,7,fill=1,stroke=0)
text(64,752,'02 / HAIR & MAKEUP',10.5,GOLD,'E');text(64,774,'끌로에 본점',22,INK,'KB')
text(64,807,'프로필 헤어·메이크업 60% 할인가',17,GOLD)
text(64,835,'여성 110,000원',19);text(397,835,'남성 88,000원',19)
text(64,862,'오전 7시 이전 22,000원 추가 · 헤어 시술 40% 할인가',11.5,MUT)
text(42,887,'학원 02-2666-4528',17)
text(42,915,'상담 담당 임도윤 010-9942-4528',16)
text(42,941,'제휴 혜택은 제공된 양식 기준입니다. 예약 전 적용 대상·금액·조건을 확인해 주세요.',9,MUT)
line(42,957,684);text(42,981,'KIM JUNG TAE ACTING ACADEMY',9,MUT,'E')
for title,x in [('처음',452),('과정',516),('수강료',580)]:text(x,978,title,14,MUT)
text(679,979,'09 / 09',11,MUT,'E');c.showPage()
c.save();stream.seek(0)
original=PdfReader(args.source);replacement=PdfReader(stream)
assert len(original.pages)==9 and all(tuple(p.mediabox)==(0,0,768,1024) for p in original.pages)
writer=PdfWriter();writer.clone_document_from_reader(original)
for number,page in zip([profile['page'] for profile in profiles]+[6,9],replacement.pages):
    target=writer.pages[number-1]
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
assert len(check.pages[5].images)==0, 'The program page must contain no photos'
assert '4개월마다' in check.pages[5].extract_text()
for required in ['협력 에이전시 작품 오디션 진행','피카소유니온 외 다수','감독 오디션 후 캐스팅 진행','김정태 배우 특강 외 다수 특강 진행']:assert required in check.pages[5].extract_text(),required
assert len(check.pages[5].get('/Annots',[]))==len(original.pages[5].get('/Annots',[]))
assert len(check.pages[8].images)==3, 'The studio page must show three supplied portraits'
assert '임도윤 실장' in check.pages[8].extract_text()
assert len(check.pages[8].get('/Annots',[]))==len(original.pages[8].get('/Annots',[]))
print(args.output)
