from __future__ import annotations
import csv, io, json, os, subprocess, sys, webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
INBOX=ROOT/'FEFO_novos_conteudos'; CATALOG=ROOT/'repository/catalog.json'

def write_csv(items):
    INBOX.mkdir(exist_ok=True)
    for folder in ('audio','faces','video','system'): (INBOX/folder).mkdir(exist_ok=True)
    fields=['arquivo_origem','titulo','menu_principal','submenu','tipo','disponibilidade','evento','extensao','publicar','observacoes']
    with (INBOX/'Catalogo_Online_Planilha.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,delimiter=';'); w.writeheader()
        for x in items:
            if x.get('tipo')=='system_audio': x={**x,'tipo':'audio','disponibilidade':'sistema'}
            w.writerow({k:x.get(k,'') for k in fields})

def apply_edits(draft):
    if not CATALOG.exists(): return
    catalog=json.loads(CATALOG.read_text(encoding='utf-8'))
    for section in ('audio','faces','videos'):
        by_id={str(x.get('id')):x for x in catalog.get(section,[])}
        kept=[]
        for item in catalog.get(section,[]):
            edit=next((x for x in draft if str(x.get('id'))==str(item.get('id'))),None)
            if edit:
                if edit.get('publicar')=='Não': continue
                for old,new in [('titulo','titulo'),('menu','menu'),('submenu','submenu'),('arquivo','arquivo'),('evento','evento')]:
                    if new in edit and edit[new] is not None: item[old]=edit[new]
            kept.append(item)
        catalog[section]=kept
    catalog['catalogVersion']=int(catalog.get('catalogVersion',1))+1
    catalog.pop('assinaturaCatalogo',None); catalog.pop('assinaturaCatalogoCanonica',None)
    CATALOG.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def process(metadata, files):
    items=metadata.get('items',[]) if isinstance(metadata,dict) else []
    write_csv(items)
    for name,data in files:
        meta=next((x for x in items if x.get('arquivo_origem')==name),{})
        kind=meta.get('tipo','audio')
        if kind=='system_audio':
            (INBOX/'system'/name).write_bytes(data)
            (INBOX/'audio'/name).write_bytes(data)
        else:
            folder={'face':'faces','video':'video'}.get(kind,'audio')
            (INBOX/folder/name).write_bytes(data)
    env=os.environ.copy(); env['FEFO_NO_PUSH']='1'
    result=subprocess.run([sys.executable,str(ROOT/'tools/auto_update_content.py')],cwd=ROOT,env=env,capture_output=True,text=True)
    if result.returncode: raise RuntimeError(result.stderr or result.stdout[-2000:])
    apply_edits(items)
    return {'ok':True,'message':'Processamento concluído. Revise o resumo antes de publicar.','output':result.stdout[-4000:]}

class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        try:
            length=int(self.headers.get('Content-Length','0')); body=self.rfile.read(length)
            if self.path=='/api/process':
                from email.parser import BytesParser
                from email.policy import default
                msg=BytesParser(policy=default).parsebytes(b'Content-Type: '+self.headers.get('Content-Type','') .encode()+b'\r\n\r\n'+body)
                metadata={}; files=[]
                for part in msg.walk():
                    if part.get_content_disposition()!='form-data': continue
                    name=part.get_param('name',header='content-disposition')
                    if name=='metadata': metadata=json.loads(part.get_content())
                    elif name=='file' and part.get_filename(): files.append((part.get_filename(),part.get_payload(decode=True)))
                result=process(metadata,files)
            elif self.path=='/api/publish':
                key=Path(os.environ.get('FEFO_SIGNING_KEY',str(Path.home()/'FEFO'/'fefo-signing-private.pem')))
                if not key.exists(): key=Path(r'D:\Downloads\FEFO\fefo-signing-private.pem')
                subprocess.run(['powershell','-NoProfile','-ExecutionPolicy','Bypass','-File',str(ROOT/'tools/sign_catalog.ps1'),'-Catalog',str(CATALOG),'-PrivateKey',str(key)],cwd=ROOT,check=True)
                subprocess.run(['git','add','repository/catalog.json','repository/catalog.json.sig','repository/audio','repository/faces','repository/video','fefo_firmware/sdcard'],cwd=ROOT,check=True)
                subprocess.run(['git','commit','-m','catalog: publicar revisao processada'],cwd=ROOT,check=False)
                subprocess.run(['git','push','origin','main'],cwd=ROOT,check=True)
                result={'ok':True,'message':'Catálogo assinado e publicado no GitHub.'}
            else: raise ValueError('endpoint inválido')
            data=json.dumps(result,ensure_ascii=False).encode()
            self.send_response(200); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
        except Exception as e:
            data=json.dumps({'ok':False,'message':str(e)},ensure_ascii=False).encode(); self.send_response(500); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
    def log_message(self,*args): pass

os.chdir(ROOT); server=ThreadingHTTPServer(('127.0.0.1',8765),Handler); print('Administrador local: http://127.0.0.1:8765/catalog-admin.html'); webbrowser.open('http://127.0.0.1:8765/catalog-admin.html'); server.serve_forever()
