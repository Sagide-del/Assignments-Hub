from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
SOURCE = OUT / "source" / "parent-product-snapshot"
TMP = OUT / "tmp" / "parent-product-snapshot"
TMP.mkdir(parents=True, exist_ok=True)

OUTPUT = OUT / "Assignment-Hub-Parent-Product-Snapshot-One-Page.pdf"
LOGO = ROOT / "frontend" / "public" / "logo.png"

NAVY = "#101820"
NAVY_2 = "#172431"
LIME = "#B5E61D"
INK = "#0F172A"
SLATE = "#475569"
MUTED = "#94A3B8"
LINE = "#DCE4EC"
SOFT = "#F4F7FA"
WHITE = "#FFFFFF"

WEBSITE = "assignmenthub.co.ke"
PHONE = "0748 519 923"


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Segoe", "C:/Windows/Fonts/segoeui.ttf"))
    pdfmetrics.registerFont(TTFont("Segoe-Semibold", "C:/Windows/Fonts/seguisb.ttf"))
    pdfmetrics.registerFont(TTFont("Segoe-Bold", "C:/Windows/Fonts/segoeuib.ttf"))


def cropped_logo() -> Image.Image:
    image = Image.open(LOGO).convert("RGBA")
    rgb = image.convert("RGB")
    difference = ImageChops.difference(rgb, Image.new("RGB", rgb.size, "white")).convert("L")
    difference = difference.point(lambda value: 255 if value > 12 else 0)
    bbox = difference.getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    padding = 18
    return image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )


def image_reader(image: Image.Image) -> ImageReader:
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    stream.seek(0)
    return ImageReader(stream)


def draw_logo(pdf: canvas.Canvas, x: float, y: float, width: float) -> None:
    logo = cropped_logo()
    height = width * logo.height / logo.width
    pdf.drawImage(image_reader(logo), x, y, width=width, height=height, mask="auto")


def draw_qr(pdf: canvas.Canvas, value: str, x: float, y: float, size: float) -> None:
    widget = qr.QrCodeWidget(value)
    bounds = widget.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(widget)
    renderPDF.draw(drawing, pdf, x, y)


def rounded_phone_image(source: Path, output: Path, crop_top: int, crop_bottom: int) -> Path:
    image = Image.open(source).convert("RGB")
    image = image.crop((0, crop_top, image.width, image.height - crop_bottom))

    inner_size = (660, 1320)
    fitted = ImageOps.contain(image, inner_size, method=Image.Resampling.LANCZOS)
    inner = Image.new("RGB", inner_size, "#F8FAFC")
    inner.paste(fitted, ((inner.width - fitted.width) // 2, (inner.height - fitted.height) // 2))

    frame = Image.new("RGBA", (724, 1422), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((2, 2, 721, 1419), radius=58, fill="#101820", outline="#DCE4EC", width=3)
    draw.rounded_rectangle((31, 51, 692, 1372), radius=34, fill="#FFFFFF")

    mask = Image.new("L", inner_size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, inner_size[0], inner_size[1]), radius=28, fill=255)
    frame.paste(inner, (32, 52), mask)
    draw.rounded_rectangle((292, 21, 432, 34), radius=7, fill="#40505F")
    frame.save(output)
    return output


def draw_device_icon(pdf: canvas.Canvas, x: float, y: float) -> None:
    pdf.roundRect(x + 5, y + 2, 18, 27, 4, fill=0, stroke=1)
    pdf.line(x + 10, y + 7, x + 18, y + 7)
    pdf.circle(x + 25, y + 9, 7, fill=0, stroke=1)
    pdf.setLineWidth(1.6)
    pdf.line(x + 21, y + 9, x + 24, y + 6)
    pdf.line(x + 24, y + 6, x + 29, y + 12)


def draw_feedback_icon(pdf: canvas.Canvas, x: float, y: float) -> None:
    pdf.roundRect(x + 3, y + 8, 27, 20, 5, fill=0, stroke=1)
    pdf.line(x + 10, y + 8, x + 7, y + 3)
    pdf.setLineWidth(1.6)
    pdf.line(x + 10, y + 18, x + 15, y + 13)
    pdf.line(x + 15, y + 13, x + 24, y + 23)


def draw_stem_icon(pdf: canvas.Canvas, x: float, y: float) -> None:
    pdf.line(x + 12, y + 29, x + 22, y + 29)
    pdf.line(x + 15, y + 29, x + 15, y + 20)
    pdf.line(x + 19, y + 29, x + 19, y + 20)
    path = pdf.beginPath()
    path.moveTo(x + 15, y + 20)
    path.lineTo(x + 7, y + 5)
    path.curveTo(x + 5, y + 1, x + 8, y, x + 12, y)
    path.lineTo(x + 25, y)
    path.curveTo(x + 29, y, x + 31, y + 2, x + 29, y + 6)
    path.lineTo(x + 19, y + 20)
    pdf.drawPath(path, fill=0, stroke=1)
    pdf.line(x + 10, y + 8, x + 27, y + 8)


def draw_path_icon(pdf: canvas.Canvas, x: float, y: float) -> None:
    pdf.circle(x + 17, y + 15, 14, fill=0, stroke=1)
    path = pdf.beginPath()
    path.moveTo(x + 12, y + 9)
    path.lineTo(x + 21, y + 22)
    path.lineTo(x + 17, y + 15)
    path.close()
    pdf.drawPath(path, fill=0, stroke=1)
    pdf.circle(x + 17, y + 15, 2, fill=1, stroke=0)


def draw_benefit(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    title: str,
    description: str,
    icon,
    width: float,
) -> None:
    pdf.setFillColor(HexColor(SOFT))
    pdf.setStrokeColor(HexColor(LINE))
    pdf.roundRect(x, y, width, 72, 13, fill=1, stroke=1)
    pdf.setFillColor(HexColor(LIME))
    pdf.circle(x + 29, y + 38, 20, fill=1, stroke=0)
    pdf.setStrokeColor(HexColor(NAVY))
    pdf.setFillColor(HexColor(NAVY))
    pdf.setLineWidth(1.8)
    icon(pdf, x + 12, y + 21)
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Segoe-Semibold", 10.5)
    pdf.drawString(x + 57, y + 45, title)
    pdf.setFillColor(HexColor(SLATE))
    pdf.setFont("Segoe", 8.4)
    pdf.drawString(x + 57, y + 29, description)


def build() -> Path:
    register_fonts()
    phone_sources = [
        ("Secure school access", SOURCE / "student-login.png", 184, 84),
        ("Assignments & results", SOURCE / "assignment-results.png", 184, 84),
        ("Practical skills", SOURCE / "skills-library.png", 184, 84),
        ("One learning menu", SOURCE / "student-navigation.png", 184, 84),
    ]
    phones: list[tuple[str, Path]] = []
    for index, (label, source, top, bottom) in enumerate(phone_sources):
        output = TMP / f"phone-{index + 1}.png"
        rounded_phone_image(source, output, top, bottom)
        phones.append((label, output))

    width, height = A4
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4)
    pdf.setTitle("Assignment Hub Parent Product Snapshot")
    pdf.setAuthor("Andolih EdTech Studios")
    pdf.setSubject("One-page product overview for parents and guardians")

    pdf.setFillColor(HexColor(WHITE))
    pdf.rect(0, 0, width, height, fill=1, stroke=0)

    # Hero
    pdf.setFillColor(HexColor(NAVY))
    pdf.rect(0, height - 182, width, 182, fill=1, stroke=0)
    pdf.setFillColor(HexColor(NAVY_2))
    pdf.circle(width - 18, height - 28, 102, fill=1, stroke=0)
    pdf.setFillColor(HexColor(LIME))
    pdf.roundRect(34, height - 64, 194, 38, 10, fill=1, stroke=0)
    pdf.setFillColor(HexColor(WHITE))
    pdf.roundRect(38, height - 60, 186, 30, 7, fill=1, stroke=0)
    draw_logo(pdf, 47, height - 54, 168)

    pdf.setFillColor(HexColor(LIME))
    pdf.setFont("Segoe-Bold", 8.5)
    pdf.drawRightString(width - 34, height - 47, "PARENT PRODUCT SNAPSHOT")
    pdf.setFillColor(HexColor(WHITE))
    pdf.setFont("Segoe-Bold", 26)
    pdf.drawString(34, height - 105, "Learning that moves")
    pdf.drawString(34, height - 137, "with your child.")
    pdf.setFillColor(HexColor("#D7E0E8"))
    pdf.setFont("Segoe", 10.5)
    pdf.drawString(320, height - 102, "Assignments, feedback, revision and practical")
    pdf.drawString(320, height - 119, "skills in one secure browser-based workspace.")
    pdf.setFillColor(HexColor(LIME))
    pdf.roundRect(320, height - 154, 193, 24, 12, fill=1, stroke=0)
    pdf.setFillColor(HexColor(NAVY))
    pdf.setFont("Segoe-Semibold", 8.7)
    pdf.drawCentredString(416.5, height - 146, "PHONE  |  TABLET  |  COMPUTER")

    # Product screens
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Segoe-Bold", 15)
    pdf.drawString(34, 633, "See the learning experience")
    pdf.setFillColor(HexColor(SLATE))
    pdf.setFont("Segoe", 9.4)
    pdf.drawRightString(width - 34, 635, "Actual Assignment Hub product screens")

    phone_w = 119
    phone_h = 234
    gap = 17
    start_x = (width - (phone_w * 4 + gap * 3)) / 2
    for index, (label, phone) in enumerate(phones):
        x = start_x + index * (phone_w + gap)
        pdf.drawImage(str(phone), x, 380, width=phone_w, height=phone_h, mask="auto")
        pdf.setFillColor(HexColor(INK))
        pdf.setFont("Segoe-Semibold", 8.7)
        pdf.drawCentredString(x + phone_w / 2, 366, label)

    # Product explanation
    pdf.setFillColor(HexColor(INK))
    pdf.setFont("Segoe-Bold", 15)
    pdf.drawString(34, 335, "One connected learning workspace")
    pdf.setFillColor(HexColor(SLATE))
    pdf.setFont("Segoe", 9.1)
    pdf.drawString(34, 317, "Learners sign in with their school code, admission number and PIN, complete work online,")
    pdf.drawString(34, 302, "receive released scores and feedback, revise with learning resources, and build future-ready skills.")

    benefit_w = (width - 85) / 2
    draw_benefit(pdf, 34, 211, "Learning continuity", "Schoolwork stays available on any device.", draw_device_icon, benefit_w)
    draw_benefit(pdf, 51 + benefit_w, 211, "Useful feedback", "Scores and corrections guide focused revision.", draw_feedback_icon, benefit_w)
    draw_benefit(pdf, 34, 127, "Beyond the classroom", "STEM, robotics, first aid and digital skills.", draw_stem_icon, benefit_w)
    draw_benefit(pdf, 51 + benefit_w, 127, "A clearer pathway", "Assignments, revision and skills in one place.", draw_path_icon, benefit_w)

    # CTA footer
    pdf.setFillColor(HexColor(NAVY))
    pdf.rect(0, 0, width, 101, fill=1, stroke=0)
    pdf.setFillColor(HexColor(LIME))
    pdf.setFont("Segoe-Bold", 9)
    pdf.drawString(34, 74, "ASK YOUR SCHOOL ABOUT ASSIGNMENT HUB")
    pdf.setFillColor(HexColor(WHITE))
    pdf.setFont("Segoe-Bold", 16)
    pdf.drawString(34, 48, "Make learning easier to access and follow.")
    pdf.setFont("Segoe", 9.3)
    pdf.setFillColor(HexColor("#D7E0E8"))
    pdf.drawString(34, 27, f"{WEBSITE}   |   WhatsApp {PHONE}")

    pdf.setFillColor(HexColor(WHITE))
    pdf.roundRect(width - 96, 12, 68, 76, 10, fill=1, stroke=0)
    draw_qr(pdf, f"https://{WEBSITE}/", width - 89, 23, 54)
    pdf.setFillColor(HexColor(NAVY))
    pdf.setFont("Segoe-Semibold", 6.5)
    pdf.drawCentredString(width - 62, 17, "OPEN WEBSITE")

    pdf.save()
    return OUTPUT


if __name__ == "__main__":
    print(build())
