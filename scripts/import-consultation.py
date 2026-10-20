"""Import an approved PDF as private tablet slides; run locally, never during deployment."""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from pypdf import PdfReader

source = Path(sys.argv[1]).resolve()
destination = Path(__file__).resolve().parent.parent / 'private-assets/consultation'
reader = PdfReader(source)
titles = ['아카데미 소개', '김정태 · 프리미엄', '편보승 · 중급·취미', '김형민 · 기초', '임도윤 · 상담', '교육과정·강점', '시간표·수강료', '협력 네트워크', '제휴 혜택']
if len(reader.pages) != len(titles):
    raise ValueError('페이지 수가 바뀌면 상담 자료의 목차도 함께 갱신해 주세요.')
page_ids = {page.indirect_reference.idnum: index+1 for index, page in enumerate(reader.pages)}
pages = []
for page, title in zip(reader.pages, titles):
    width, height = float(page.mediabox.width), float(page.mediabox.height)
    if (width, height) != (768, 1024):
        raise ValueError('세로형 768 × 1024 자료를 사용해 주세요.')
    links = []
    for reference in page.get('/Annots', []):
        item = reference.get_object()
        if item.get('/Subtype') != '/Link':
            continue
        x0, y0, x1, y1 = map(float, item['/Rect'])
        link = dict(left=100*x0/width, top=100*(height-y1)/height, width=100*(x1-x0)/width, height=100*(y1-y0)/height)
        if '/Dest' in item and item['/Dest'][0].idnum in page_ids:
            target = page_ids[item['/Dest'][0].idnum]
            link.update(page=target, label=titles[target-1]+' 바로가기')
        elif str(item.get('/A', {}).get('/URI', '')).startswith('tel:'):
            link.update(href=str(item['/A']['/URI']), label='상담 전화 연결')
        else:
            continue
        links.append(link)
    pages.append(dict(title=title, links=links))
manifest = dict(title='김정태 배우아카데미 상담 자료', version=hashlib.sha256(source.read_bytes()).hexdigest()[:16], pages=pages)
with tempfile.TemporaryDirectory() as folder:
    stage = Path(folder)
    subprocess.run(['pdftoppm', '-scale-to', '1800', '-jpeg', '-jpegopt', 'quality=90', str(source), str(stage/'page')], check=True)
    images = sorted(stage.glob('page-*.jpg'))
    if len(images) != len(pages):
        raise ValueError('상담 자료 이미지 변환을 확인해 주세요.')
    destination.mkdir(parents=True, exist_ok=True)
    for index, image in enumerate(images, 1):
        shutil.copyfile(image, destination/f'page-{index}.jpg')
    shutil.copyfile(source, destination/'guide.pdf')
    (destination/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
archive=destination/'versions'/manifest['version']
if not archive.exists():
    archive.mkdir(parents=True)
    for asset in destination.iterdir():
        if asset.is_file():shutil.copyfile(asset,archive/asset.name)
print(f'{len(pages)}개 상담 페이지와 PDF를 비공개 자료 폴더에 저장했습니다.')
