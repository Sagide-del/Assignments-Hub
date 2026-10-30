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
for n,f in [('Regular','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf')]:pdfmetrics.registerFont(TTFont(n,'/usr/share/fonts/truetype/dejavu/'+f))
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
# Application attachment: one page, under 10 MB.
p=Page(OUT/'Assignment-Hub-Application-Summary.pdf');p.logo();p.label('LIVE PRODUCT / KENYA',408,39)
p.text('Learning that goes',34,98,29,True);p.text('beyond the page.',34,135,29,True)
p.para('Assignments, revision and interactive practical exploration.<br/>One online workspace for Kenyan learners in Grades 6–12.',34,182,520,11)
product(p,SRC/'assignments.png',34,238,257,135,(280,90,1405,550),'01  Subject and topic-based assignments')
product(p,SRC/'recall-water.png',304,238,257,135,(320,440,1375,1255),'02  Illustrated recall cards')
p.label('THE PROBLEM',34,409);p.para('Access to practical equipment, revision materials and individual feedback is uneven. Learners need more opportunities to practise and understand their mistakes.',34,430,247,10)
p.label('THE SOLUTION',304,409);p.para('A live browser-based platform connecting assignments, mock assessments, illustrated recall cards, 3D practical activities and guided skills lessons.',304,430,247,10)
p.label('HOW IT WORKS',34,526);p.para('A shared question bank stores content for review and publication to independent learners and schools. AI assists curriculum-guided content creation; reviewed content is saved and reused to manage costs.',34,547,527,10)
prices(p,610,True)
p.text('Founder: Frankline Sagide · Eldoret, Kenya',34,726,10,True);p.para('Live platform · Solo founder · Next: structured school and learner pilots.<br/>SDG 4: Quality Education · Seeking mentorship and pilot connections.',34,747,435,9);p.qr(492,717,68);footer(p);p.save()
# Two-page A4 brochure, designed for double-sided printing.
p=Page(OUT/'Assignment-Hub-Brochure-A4.pdf');p.logo();p.label('GRADES 6–12  /  KENYA',408,39)
p.rect(34,97,527,186,INK,16);p.label('YOUR NEXT LEARNING ADVENTURE',53,115,LIME)
p.text('Learn it. Practise it.',53,139,30,True,WHITE);p.text('Make it stick.',53,178,30,True,LIME)
p.para('Assignments, mock tests, visual revision and practical<br/>exploration — together in one online workspace.',53,227,485,11,WHITE)
product(p,SRC/'recall-water.png',34,302,325,232,(320,440,1375,1255),'Illustrated recall cards: a different way to revisit ideas.')
p.label('MORE THAN REVISION',380,310);p.text('See. Try. Understand.',380,334,12,True)
p.para('Practise by subject and topic.<br/><br/>Review answers and feedback.<br/><br/>Explore interactive 3D practicals.<br/><br/>Build skills through guided lessons.',380,365,177,10)
p.text('Choose the access that fits.',34,575,18,True);prices(p,608)
p.text('Already online. Start exploring.',34,741,15,True);p.text('assignmenthub.co.ke',34,766,12,True);p.link(URL,34,738,350,43);p.qr(487,724,72);footer(p,1);p.next()
p.logo();p.label('INSIDE THE WORKSPACE',398,39);p.text('From questions to discovery.',34,99,24,True)
p.para('A connected learning journey for students, families and schools.',34,135,527,10)
features=[('01','Assignments','Find subjects, open a topic and complete focused practice.'),('02','Mock assessments','Practise timed papers and review answers and feedback.'),('03','Illustrated recall cards','Revisit key ideas with visual prompts and optional study notes.'),('04','Interactive STEM labs','Explore practical concepts and record observations.'),('05','Learn a Skill','Follow guided lessons in areas such as coding and first aid.'),('06','Learning resources','Keep useful learning material within the same workspace.')]
for i,(num,title,body) in enumerate(features):
 x=34+(i%2)*270;y=179+(i//2)*90;p.rect(x,y,29,29,PALE,8);p.text(num,x+7,y+8,10,True);p.text(title,x+40,y+1,11,True);p.para(body,x+40,y+25,207,9)
product(p,SRC/'respiratory.png',34,463,257,141,(287,210,1200,925),'Explore a practical concept in a 3D workspace.')
product(p,SRC/'assignments.png',304,463,257,141,(280,90,1405,550),'Open a subject, choose a topic, start practising.')
p.rect(34,644,527,130,PALE,12);p.label('READY TO GET STARTED?',50,659);p.text('Families',50,681,11,True);p.para('Visit the website and create an individual<br/>learner account. KSh 200 per month.',50,704,240,9);p.text('Schools',316,681,11,True);p.para('Contact us for onboarding.<br/>KSh 150 per learner per year.',316,704,228,9)
p.text('Internet and a compatible device required. Content varies by grade and subject.',34,783,7,color=GRAY);footer(p,2);p.save()
# WhatsApp portrait: generous type, minimal text, same product artwork.
p=Page(OUT/'Assignment-Hub-WhatsApp.pdf',1080,1350);p.logo(64,48,294);p.rect(760,57,256,47,PALE,23);p.text('GRADES 6–12',792,69,21,True)
p.text('Learn it. Practise it.',64,141,56,True);p.text('Make it stick.',64,211,56,True)
p.text('Your online learning workspace. Made for Kenya.',64,298,23,color=GRAY)
p.rect(64,357,952,464,PALE,24);p.pic(ROOT/'frontend/public/recall-illustrations/water-scene.png',79,365,663,438);p.label('LEARN WITH',773,407);p.text('VISUALS',773,428,24,True);p.text('Practise',773,509,22,True);p.text('Explore',773,552,22,True);p.text('Recall',773,595,22,True)
p.text('Assignments  ·  Mock tests  ·  Illustrated recall cards',64,851,23,True);p.text('Interactive 3D STEM labs  ·  Guided skills lessons',64,891,23,color=GRAY)
for x,title,price,unit,fill in [(64,'SCHOOLS','150','per learner / year',PALE),(552,'INDIVIDUAL LEARNERS','200','per month',INK)]:
 p.rect(x,955,464,165,fill,18);dark=fill==INK;p.text(title,x+24,975,19,True,LIME if dark else GRAY);p.text('KSh '+price,x+24,1008,48,True,WHITE if dark else INK);p.text(unit,x+24,1075,22,color=WHITE if dark else GRAY)
p.text('assignmenthub.co.ke',64,1168,39,True);p.link(URL,64,1161,725,63);p.text('WhatsApp / Call  +254 748 519 923',64,1231,24);p.link(WA,64,1227,730,43);p.qr(886,1166,130);p.text('Internet and a compatible device required.',64,1297,16,color=GRAY);p.save()
subprocess.run(['pdftoppm','-scale-to-x','1080','-scale-to-y','1350','-singlefile','-png',str(OUT/'Assignment-Hub-WhatsApp.pdf'),str(OUT/'Assignment-Hub-WhatsApp')],check=True)
print('Created application summary, A4 brochure, WhatsApp PDF and 1080×1350 PNG.')
