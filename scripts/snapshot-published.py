"""Read-only snapshot of our published site; never uploads or changes production."""
from urllib.request import urlopen
from urllib.parse import urljoin,urlparse,unquote
from html.parser import HTMLParser
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent.parent/'published-source'
BASE='https://scene-academy.vercel.app/'
queue=[BASE]+[BASE+"courses/"+slug for slug in ["basic","camera","audition"]];seen=set();failed=[]
class Links(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if v and k in ('src','href','poster'):enqueue(v,self.url)
def enqueue(value,base):
 url=urljoin(base,value);p=urlparse(url)
 if p.netloc!='scene-academy.vercel.app' or p.scheme!='https' or p.query or p.path.startswith(('/api/','/materials')):return
 if p.path.endswith(('.pdf','.docx','.md')):return
 clean='https://'+p.netloc+p.path
 if clean not in seen and clean not in queue:queue.append(clean)
while queue:
 url=queue.pop(0)
 if url in seen:continue
 seen.add(url);p=urlparse(url);name=unquote(p.path).lstrip('/') or 'index.html'
 if not Path(name).suffix:name+='.html'
 target=ROOT/name
 if '..' in Path(name).parts:continue
 try:
  with urlopen(url,timeout=25) as r:data=r.read();mime=r.headers.get('Content-Type','')
 except Exception as e:failed.append(p.path);continue
 target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 if 'text/html' in mime:
  parser=Links();parser.url=url;parser.feed(data.decode('utf-8'))
 elif 'text/css' in mime:
  for value in re.findall(r'url\([\'\"]?([^\)\'\"]+)',data.decode('utf-8')):enqueue(value,url)
print('Saved',len(seen)-len(failed),'files; unavailable:',failed)
