"""Build print PDFs and social artwork from real Assignment Hub product previews.
Requires reportlab, Pillow and pdftoppm. No remote assets or AI generation calls.
"""
from pathlib import Path
import subprocess
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
SRC=OUT/'source'
for n,f in [('Regular','OpenSans-Regular.ttf'),('Bold','OpenSans-ExtraBold.ttf')]:pdfmetrics.registerFont(TTFont(n,'/usr/share/fonts/truetype/open-sans/'+f))
INK='#101820'; LIME='#B5E61D'; GRAY='#52616F'; PALE='#F3F6EF'; LINE='#DCE3E8'; WHITE='#FFFFFF'
URL='https://assignmenthub.co.ke/'; WA='https://wa.me/254748519923'
class Page:
 def __init__(self,path,w=595.276,h=841.89):
  self.w,self.h=w,h;self.c=canvas.Canvas(str(path),pagesize=(w,h));self.c.setTitle('Assignment Hub | Learning, practice and practical exploration');self.c.setAuthor('Assignment Hub | Frankline Sagide')
 def rect(self,x,y,w,h,color=WHITE,r=0,stroke=None):
  c=self.c;c.setFillColor(HexColor(color));c.setStrokeColor(HexColor(stroke or color));c.roundRect(x,self.h-y-h,w,h,r,stroke=bool(stroke),fill=1)
 def text(self,t,x,y,size=10,bold=False,color=INK):
  self.c.setFillColor(HexColor(color));self.c.setFont('Bold' if bold else 'Regular',size);self.c.drawString(x,self.h-y-size,t)
 def para(self,t,x,y,w,size=10,color=GRAY,leading=None,bold=False):
  st=ParagraphStyle('p',fontName='Bold' if bold else 'Regular',fontSize=size,leading=leading or size*1.5,textColor=HexColor(color));p=Paragraph(t,st);_,h=p.wrap(w,1000);p.drawOn(self.c,x,self.h-y-h);return h
 def pic(self,path,x,y,w,h,roi=None):
  iw,ih=Image.open(path).size
  a,b,d,e=roi or (0,0,iw,ih);scale=min(w/(d-a),h/(e-b));dw,dh=(d-a)*scale,(e-b)*scale
  x+=(w-dw)/2;y+=(h-dh)/2
  self.c.saveState();p=self.c.beginPath();p.rect(x,self.h-y-dh,dw,dh);self.c.clipPath(p,stroke=0,fill=0)
  self.c.drawImage(str(path),x-a*scale,self.h-y-(ih-b)*scale,iw*scale,ih*scale,mask='auto');self.c.restoreState()
 def logo(self,x=34,y=27,w=180):self.pic(ROOT/'frontend/public/logo.png',x,y,w,w/4.05,(72,383,1395,710))
 def link(self,url,x,y,w,h):self.c.linkURL(url,(x,self.h-y-h,x+w,self.h-y),relative=0,thickness=0)
 def qr(self,x,y,size=68):
  q=qr.QrCodeWidget(URL,barLevel='M');a,b,d,e=q.getBounds();dr=Drawing(size,size,transform=[size/(d-a),0,0,size/(e-b),0,0]);dr.add(q);renderPDF.draw(dr,self.c,x,self.h-y-size);self.link(URL,x,y,size,size)
 def label(self,t,x,y,color=GRAY):self.text(t.upper(),x,y,8,True,color)
 def next(self):self.c.showPage()
 def save(self):self.c.save()
def footer(p,n=None):
 p.rect(34,798,527,1,LINE);p.text('assignmenthub.co.ke',34,810,9,True);p.link(URL,34,807,150,20);p.text('WhatsApp / Call  +254 748 519 923',292,810,8);p.link(WA,292,807,235,20)
 if n:p.text(str(n),550,810,8,color=GRAY)
def prices(p,y,compact=False):
 w=257;h=95 if compact else 110
 for x,title,price,unit,fill in [(34,'SCHOOLS','150','per learner / year',PALE),(304,'INDIVIDUAL LEARNERS','200','per month',INK)]:
  dark=fill==INK;p.rect(x,y,w,h,fill,12);p.label(title,x+16,y+12,LIME if dark else GRAY);p.text('KSh',x+16,y+36,12,True,WHITE if dark else INK);p.text(price,x+49,y+28,34,True,WHITE if dark else INK);p.text(unit,x+16,y+72,10,color=WHITE if dark else GRAY)
def product(p,path,x,y,w,h,roi,caption):
 p.rect(x,y,w,h,WHITE,8,LINE);p.pic(path,x+5,y+5,w-10,h-10,roi);p.text(caption,x,y+h+7,8,True)
# Product-led editorial campaign. Screens are real frontend captures with demo records.
def rule(p,x,y,w,color=LIME):p.rect(x,y,w,3,color)
def track(p,t,x,y,size=8,color=GRAY):
 p.c.saveState();p.c.setFillColor(HexColor(color));o=p.c.beginText(x,p.h-y-size);o.setFont('Bold',size);o.setCharSpace(1.4);o.textOut(t);p.c.drawText(o);p.c.restoreState()
def arrow(p,x,y,size=18,color=INK):
 c=p.c;c.setStrokeColor(HexColor(color));c.setLineWidth(1.6);c.line(x,p.h-y,x+size,p.h-y);c.line(x+size,p.h-y,x+size-6,p.h-y+6);c.line(x+size,p.h-y,x+size-6,p.h-y-6)
def window(p,path,x,y,w,h,roi=None):
 # Thin browser chrome and generous shadow; screenshot remains unaltered.
 p.rect(x+3,y+6,w,h,'#DDE3E6',9);p.rect(x,y,w,h,WHITE,9,LINE)
 p.rect(x+1,y+1,w-2,18,'#EFF2F4',8)
 for i,col in enumerate(['#C9D1D5','#D4DADF','#DDE3E6']):p.rect(x+9+7*i,y+7,3,3,col,1.5)
 p.text('assignmenthub.co.ke',x+38,y+4,6,color=GRAY)
 iw,ih=Image.open(path).size
 a,b,d,e=roi or (0,0,iw,ih);target=(w-2)/(h-21)
 if (d-a)/(e-b)>target:
  wanted=(e-b)*target;mid=(a+d)/2;a,d=mid-wanted/2,mid+wanted/2
 else:
  wanted=(d-a)/target;mid=(b+e)/2;b,e=mid-wanted/2,mid+wanted/2
 p.pic(path,x+1,y+20,w-2,h-21,(a,b,d,e))
def foot(p,n):
 rule(p,30,793,535,'#DCE3E8');p.text('assignmenthub.co.ke',30,807,10,True);p.link(URL,30,804,180,20);p.text('+254 748 519 923',358,808,9);p.link(WA,350,802,150,24);p.text(f'0{n}',550,808,9,True)
def priceband(p,y):
 p.rect(30,y,535,119,INK,12);track(p,'SCHOOL ACCESS',49,y+15,8,LIME);track(p,'INDIVIDUAL ACCESS',319,y+15,8,LIME)
 for x,price,unit in [(49,'150','per learner / year'),(319,'200','per month')]:
  p.text('KSh',x,y+43,11,True,WHITE);p.text(price,x+34,y+30,40,True,WHITE);p.text(unit,x,y+87,10,color='#D3DDE4')
 p.rect(297,y+19,1,81,'#38444C')
# Brochure front: an actual student workspace is the hero.
p=Page(OUT/'Assignment-Hub-Studio-Brochure-A4.pdf');p.logo(30,25,184);track(p,'FOR KENYAN LEARNERS',376,35,7);track(p,'GRADES 6–12',434,52,7,'#607D00')
p.text('A clearer way',30,103,39,True);p.text('to learn.',30,151,39,True);rule(p,30,210,76)
p.para('Schoolwork, revision and practical discovery.<br/>Together in one online workspace.',343,120,221,12,INK,18)
track(p,'THIS IS YOUR LEARNING SPACE.',30,241,8);p.text('Live at assignmenthub.co.ke',368,241,8,color=GRAY)
window(p,SRC/'dashboard.png',30,263,535,319,(0,0,3200,1850))
p.rect(30,599,5,29,LIME,2);p.para('Choose a subject. Work through a question. Explore a practical.<br/>Return to key ideas with illustrated recall cards.',44,598,510,10,INK,15)
priceband(p,647);foot(p,1);p.next()
# Brochure back: three scenes, three concrete student actions.
p.logo(30,25,184);track(p,'INSIDE ASSIGNMENT HUB',368,38,7)
p.text('A question is only',30,102,30,True);p.text('the beginning.',30,140,30,True);rule(p,30,188,76)
rows=[(211,'01 / PRACTISE','Find your next\nchallenge.','Subjects and topics bring your assignments into focus. Open a task and work through it.',SRC/'subject-library.png',(670,140,3070,1740)),(383,'02 / EXPLORE & RECALL','See it.\nMake it stick.','Explore a practical concept. Revisit key ideas with illustrated recall cards.',SRC/'respiratory.png',(287,185,1430,1000)),(555,'03 / BUILD SKILLS','Start small.\nKeep learning.','Follow guided lessons in areas such as first aid, robotics and coding.',SRC/'skills.png',(660,150,3060,1850))]
for y,tag,title,body,path,roi in rows:
 track(p,tag,30,y,7,'#607D00')
 for j,line in enumerate(title.split('\n')):p.text(line,30,y+22+j*22,17,True)
 p.para(body,30,y+76,167,9,GRAY,13)
 if tag.startswith('02'):
  window(p,path,215,y,167,151,(470,380,1035,965))
  window(p,SRC/'recall-water.png',395,y,170,151,(320,440,1375,1255))
 else:window(p,path,215,y,350,151,roi)
p.rect(30,720,535,57,PALE,8);p.text('Start individually. Or bring your school.',43,732,12,True);p.text('Visit the website or WhatsApp us for school onboarding.',43,754,8,color=GRAY);p.qr(501,719,57);p.text('Internet and a compatible device required. Content varies by grade.',30,782,6.5,color=GRAY)
foot(p,2);p.save()
# Application one-pager: prototype evidence, business and next step.
p=Page(OUT/'Assignment-Hub-Studio-Application-Summary.pdf');p.logo(30,25,184);track(p,'LIVE PRODUCT / KENYA',390,37,7)
p.text('Practice. Discovery.',30,99,31,True);p.text('One learning workspace.',30,139,31,True);p.para('Assignment Hub connects assignments, revision and practical exploration<br/>for Kenyan learners in Grades 6–12.',30,190,535,11,INK,16)
window(p,SRC/'dashboard.png',30,240,338,209,(0,0,3200,1850));window(p,SRC/'respiratory.png',383,240,182,209,(450,390,920,940))
track(p,'THE NEED',30,477,7,'#607D00');p.para('Access to practical equipment, revision materials and individual feedback is uneven. Learners need opportunities to practise and understand their mistakes.',30,496,248,9.5,GRAY,14)
track(p,'THE LIVE SOLUTION',310,477,7,'#607D00');p.para('A browser-based platform with assignments, mock assessments, illustrated recall cards, interactive 3D practicals and guided skills lessons.',310,496,255,9.5,GRAY,14)
rule(p,30,570,535,'#DCE3E8');track(p,'REVIEW ONCE. STORE. REUSE.',30,589,7);p.para('A central question bank supports reviewed content publication to schools and independent learners. AI assists curriculum-guided creation; saving and reusing content helps control operating costs.',30,608,535,9.5,GRAY,14)
# compact business model, visually linked to both channels.
p.rect(30,667,535,69,INK,9);p.text('SCHOOLS',46,678,8,True,LIME);p.text('KSh 150',46,695,23,True,WHITE);p.text('per learner / year',164,707,8,color=WHITE);p.text('INDIVIDUALS',316,678,8,True,LIME);p.text('KSh 200',316,695,23,True,WHITE);p.text('per month',437,707,8,color=WHITE)
p.text('Frankline Sagide · Solo founder · Eldoret, Kenya',30,749,10,True);p.para('SDG 4: Quality Education. Next: structured learner and school pilots.<br/>Seeking mentorship, pilot connections and business guidance.',30,767,463,8,GRAY,12);foot(p,1);p.save()
# WhatsApp series: one concept per card; deliberate editorial rhythm.
def social_head(p,tag,dark=False):
 p.rect(0,0,1080,1350,INK if dark else WHITE)
 if dark:p.rect(55,43,385,100,WHITE,12)
 p.logo(72 if dark else 55,60,330);track(p,tag,670,88,12,LIME if dark else GRAY)
def social_bottom(p,dark=False):
 color=WHITE if dark else INK;rule(p,55,1235,970,'#38444C' if dark else LINE);p.text('assignmenthub.co.ke',55,1260,29,True,color);p.text('+254 748 519 923',720,1268,18,color=color);p.link(URL,55,1250,630,64);p.link(WA,710,1250,320,64)
# 01: product, not illustration.
p=Page(OUT/'Assignment-Hub-Studio-WhatsApp-01.pdf',1080,1350);social_head(p,'01 / YOUR WORKSPACE')
p.text('Schoolwork.',55,180,76,True);p.text('One clear workspace.',55,273,68,True);rule(p,55,381,136)
p.text('For Kenyan learners in Grades 6–12.',55,417,28,color=GRAY)
window(p,SRC/'dashboard.png',55,487,970,562,(0,0,3200,1770))
p.text('Assignments. Revision. Practical discovery.',55,1096,29,True)
p.text('Schools  KSh 150 / learner / year',55,1153,23,color=GRAY);p.text('Individuals  KSh 200 / month',55,1191,23,color=GRAY);social_bottom(p);p.save()
# 02: authentic UI across three activities.
p=Page(OUT/'Assignment-Hub-Studio-WhatsApp-02.pdf',1080,1350);social_head(p,'02 / LEARN BY DOING')
p.text('Read it. Try it.',55,176,70,True);p.text('Work through it.',55,262,70,True);p.text('A connected learning journey, inside Assignment Hub.',55,367,25,color=GRAY)
for y,tag,title,path,roi in [(438,'01','Choose a subject',SRC/'subject-library.png',(670,450,3070,1740)),(685,'02','Explore a practical',SRC/'respiratory.png',(287,185,1430,1000)),(932,'03','Build a new skill',SRC/'skills.png',(665,700,3060,1990))]:
 p.rect(55,y,49,49,PALE,12);p.text(tag,66,y+10,20,True);p.text(title,55,y+68,26,True);window(p,path,398,y,627,216,roi)
social_bottom(p);p.save()
# 03: pricing made unmistakable, two separate audiences.
p=Page(OUT/'Assignment-Hub-Studio-WhatsApp-03.pdf',1080,1350);social_head(p,'03 / CHOOSE YOUR ACCESS',True)
p.text('For your school.',55,185,69,True,WHITE);p.text('For your learner.',55,270,69,True,LIME)
for y,tag,price,unit,body in [(419,'SCHOOL SUBSCRIPTION','150','per learner / year','Contact us to arrange school onboarding.'),(724,'INDIVIDUAL SUBSCRIPTION','200','per month','Create an individual account on our website.')]:
 p.rect(55,y,970,272,'#1D2932',18);track(p,tag,82,y+28,16,LIME);p.text('KSh',82,y+97,28,True,WHITE);p.text(price,157,y+62,99,True,WHITE);p.text(unit,473,y+119,28,color=WHITE);p.text(body,82,y+216,23,color='#CBD5DC')
p.rect(873,1054,150,150,WHITE,8);p.qr(879,1060,138);p.text('Explore the live platform.',55,1074,31,True,WHITE);p.text('Scan to visit or open the link below.',55,1124,23,color='#CBD5DC');p.text('Internet and a compatible device required.',55,1182,17,color='#AAB9C2');social_bottom(p,True);p.save()
# Single-feature social panels put the actual product at centre stage.
for number,tag,title1,title2,sub,path,roi,benefits in [
 (4,'GUIDED SKILLS','Start with curiosity.','Build a new skill.','First aid, coding, robotics and more.',SRC/'skills.png',(665,450,3070,1920),'Guided lessons  /  Practical projects  /  Your saved progress'),
 (5,'VISUAL REVISION','A clearer picture.','A useful reminder.','Illustrated recall cards, inside your learning workspace.',SRC/'recall-water.png',(320,440,1375,1255),'Visual prompts  /  Optional study notes  /  Recall challenges'),
 (6,'INTERACTIVE STEM','Bring science','into view.','Explore a practical concept in an interactive 3D workspace.',SRC/'respiratory.png',(294,291,1400,1040),'Explore the model  /  Change a setting  /  Record observations')]:
 p=Page(OUT/f'Assignment-Hub-Studio-WhatsApp-0{number}.pdf',1080,1350);social_head(p,f'0{number} / {tag}')
 p.text(title1,55,181,61,True);p.text(title2,55,259,61,True);rule(p,55,357,136)
 p.text(sub,55,391,24,color=GRAY);window(p,path,55,459,970,651,roi)
 p.text(benefits,55,1142,21,True);p.text('Schools: KSh 150 / learner / year   •   Individuals: KSh 200 / month',55,1190,20,color=GRAY);social_bottom(p);p.save()
# Export phone-friendly images.
for i in [1,2,3,4,5,6]:
 name=f'Assignment-Hub-Studio-WhatsApp-0{i}';subprocess.run(['pdftoppm','-scale-to-x','1080','-scale-to-y','1350','-singlefile','-png',str(OUT/(name+'.pdf')),str(OUT/name)],check=True)
print('Built product-led brochure, application summary and six WhatsApp campaign cards.')
