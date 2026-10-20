const fs = require('node:fs/promises');
const path = require('node:path');
const auth = require('./_admin');

function createHandler({directory = path.join(__dirname, '../private-assets/consultation'), requireAdmin = (...args) => auth.requireAdmin(...args), roomStore} = {}) {
 const rooms=require('./_consultation-rooms').createHandler({directory,store:roomStore});
 return async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (!await requireAdmin(req, res)) return;
  const params = new URL(req.url, 'http://localhost').searchParams;
  if(params.get('resource')==='rooms')return rooms(req,res);
  if (req.method !== 'GET') {res.setHeader('Allow', 'GET');return res.status(405).json({error:'지원하지 않는 요청입니다.'});}
  const version=params.get('version')||params.get('v');
  if(version&&!/^[a-f0-9]{16}$/.test(version))return res.status(400).json({error:'자료 버전을 확인해주세요.'});
  const assetDirectory=version?path.join(directory,'versions',version):directory;
  const page = params.get('page'), download = params.get('download');
  if ((page !== null && !/^[1-9]\d?$/.test(page)) || (download !== null && download !== 'pdf') || (page !== null && download !== null)) return res.status(400).json({error:'자료 주소를 확인해주세요.'});
  try {
   const manifest = JSON.parse(await fs.readFile(path.join(assetDirectory, 'manifest.json'), 'utf8'));
   if (page !== null && Number(page) > manifest.pages.length) return res.status(404).json({error:'해당 페이지가 없습니다.'});
   if (page === null && download === null) return res.json({title:manifest.title, version:manifest.version, pages:manifest.pages,demo:!!roomStore?.demo});
   const file = download ? 'guide.pdf' : `page-${Number(page)}.jpg`;
   const data = await fs.readFile(path.join(assetDirectory, file));
   res.setHeader('Content-Type', download ? 'application/pdf' : 'image/jpeg');
   res.setHeader('Content-Length', String(data.length));
   if (download) res.setHeader('Content-Disposition', 'attachment; filename="KJT-consultation.pdf"');
   return res.end(data);
  } catch {
   return res.status(503).json({error:'상담 자료를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'});
  }
 };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
