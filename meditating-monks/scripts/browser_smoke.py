"""Offline Chromium component checks of the actual UI code, with explicit API fixtures.

Does not claim a live-browser network, DNS, TLS, real TTS or deployment test.
Useful in restricted environments where Chromium cannot navigate to localhost.
Run: python scripts/browser_smoke.py --chromium /usr/bin/chromium --output /tmp/mm-preview
"""
from __future__ import annotations
import argparse
import base64
import io
import json
import re
import struct
import sys
import wave
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import ROOT, Profile
from app.engine import Engine
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--chromium',default=None)
parser.add_argument('--output',type=Path,default=ROOT/'test-results')
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
profile=Profile.model_validate_json((ROOT/'profiles/public-compassion.json').read_text())
state={**Engine(profile,108).summary(),'run_id':'component-test','updated_at_ms':1,'status':'running','counter_kind':'digital-events','uncredited_gap_ms':0}
fixture={'version':'0.1.0','node':{'name':'The Quiet Monastery','dedication':'Möge dieser digitale Raum Menschen an Mitgefühl erinnern. Möge alles dadurch entstehende Heilsame dem Wohl und der Befreiung aller fühlenden Wesen dienen.','id':'test-node','public_key':'test-public-key','federation_enabled':False},'profile':profile.model_dump(),'audio':[],'state':state}
html=(ROOT/'web/index.html').read_text()
html=re.sub(r'<link[^>]+rel="stylesheet"[^>]*>','',html)
html=re.sub(r'<script[^>]+src="/assets/app.js"[^>]*></script>','',html)
icon='data:image/svg+xml;base64,'+base64.b64encode((ROOT/'web/icon.svg').read_bytes()).decode()
html=html.replace('/assets/icon.svg',icon).replace('</head>',f'<style>{(ROOT/"web/style.css").read_text()}</style></head>')
js='\n'.join(re.sub(r'^import[^\n]+\n','', (ROOT/'web'/name).read_text(), flags=re.M).replace('export ','') for name in ['engine.js','audio.js','app.js'])
buf=io.BytesIO()
with wave.open(buf,'wb') as wav:
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(8000)
    # Silence is sufficient to test decode/loop graph without pretending to provide a chant.
    wav.writeframes(b'\x00\x00'*(8*8000))
wave64=base64.b64encode(buf.getvalue()).decode()
bridge="""
window.__fixture=FIXTURE; window.__offline=false; window.__spoken=[]; window.__starts=[];
window.__testAudio=false; window.__boot=performance.now();
window.__currentState=()=>({...window.__fixture.state,active_ms:Math.floor((performance.now()-window.__boot)/1000)*1000,updated_at_ms:Math.floor((performance.now()-window.__boot)/1000)+1});
window.__memoryStore=new Map();
Object.defineProperty(window,'localStorage',{value:{getItem:k=>window.__memoryStore.get(k)||null,setItem:(k,v)=>window.__memoryStore.set(k,v)}});
window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Mock local voice',lang:'de-DE',localService:true}],addEventListener(){},cancel(){},speak(u){window.__spoken.push(u.text);}}});
const originalStart=AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start=function(...args){window.__starts.push(args);return originalStart.apply(this,args);};
window.fetch=async function(url){
 if(window.__offline) throw new Error('offline fixture');
 if(url==='/api/bootstrap') return new Response(JSON.stringify({...window.__fixture,state:window.__currentState()}),{status:200});
 if(url==='/api/state') return new Response(JSON.stringify(window.__currentState()),{status:200});
 if(url==='/api/network') return new Response(JSON.stringify({enabled:false,peers:[]}),{status:200});
 if(url==='/media/test.wav')return new Response(Uint8Array.from(atob('WAVE64'),c=>c.charCodeAt(0)),{status:200});
 throw new Error('Unexpected request in fixture: '+url);
};
window.EventSource=class {constructor(){this.intervals=[];}addEventListener(name,callback){if(name==='state')this.intervals.push(setInterval(()=>{if(!window.__offline)callback({data:JSON.stringify(window.__currentState())});},1000));}close(){this.intervals.forEach(clearInterval);}};
""".replace('FIXTURE',json.dumps(fixture,ensure_ascii=False)).replace('WAVE64',wave64)

class Progress(list):
    def append(self, item):
        super().append(item)
        print(item, flush=True)
results=Progress()
with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox']}
    if args.chromium:launch['executable_path']=args.chromium
    browser=p.chromium.launch(**launch)
    page=browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1)
    page.set_default_timeout(8000)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html)
    page.add_script_tag(content=bridge)
    page.add_script_tag(content=js,type='module')
    expect(page.locator('.monk-tile')).to_have_count(72)
    expect(page.locator('#selected-phase')).to_have_text('Mani-Rezitation')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    results.append('Desktop 1440px: initial render, 72 virtualized tiles, selected mantra, no overflow')
    page.screenshot(path=str(args.output/'desktop.png'),full_page=True)
    page.locator('[data-filter="prostration"]').click()
    assert page.locator('.monk-tile').count()>0
    page.locator('.monk-tile').first.click()
    expect(page.locator('#portrait')).to_have_attribute('data-kind','prostration')
    results.append('Prostration filter and single-monk view')
    page.locator('[data-filter="offering"]').click()
    assert page.locator('.monk-tile').count()>0
    page.locator('.monk-tile').first.click()
    expect(page.locator('#portrait')).to_have_attribute('data-kind','offering')
    results.append('Offering filter and single-monk view')
    page.locator('[data-filter="all"]').click()
    page.locator('#page-next').click();expect(page.locator('.monk-tile')).to_have_count(36)
    page.locator('#page-prev').click();expect(page.locator('.monk-tile')).to_have_count(72)
    results.append('Pagination 72 + 36')
    page.locator('#mala-open').click()
    for _ in range(3):page.locator('#mala-add').click()
    expect(page.locator('#mala-count')).to_have_text('3')
    page.locator('#mala-undo').click();expect(page.locator('#mala-count')).to_have_text('2')
    assert page.evaluate("localStorage.getItem('meditating-monks.personal-mala.v1')")=='2'
    page.keyboard.press('Escape');expect(page.locator('#mala-dialog')).not_to_be_visible()
    results.append('Manual mala +3 / undo / storage API mock / Escape dialog')
    page.locator('#audio-toggle').click()
    expect(page.locator('#audio-status')).to_contain_text('Noch keine Aufnahme')
    results.append('Missing recording is disclosed, not faked')
    page.locator('[data-filter="mantra"]').click();page.locator('.monk-tile').first.click()
    page.locator('#audio-mode').select_option('tts');page.locator('#audio-toggle').click()
    page.wait_for_timeout(400)
    assert page.evaluate('window.__spoken.length')>=1
    expect(page.locator('#audio-toggle')).to_have_attribute('aria-pressed','true')
    page.locator('#audio-toggle').click()
    results.append('TTS control flow with mocked local voice (not real pronunciation test)')
    page.locator('#audio-toggle').click()
    page.evaluate('window.__offline=true')
    expect(page.locator('#connection-label')).to_contain_text('unterbrochen',timeout=10000)
    expect(page.locator('#audio-toggle')).to_have_attribute('aria-pressed','false')
    results.append('Stale heartbeat freezes display and stops audio')
    page.evaluate('window.__offline=false');page.wait_for_timeout(1500)
    page.locator('[data-filter="all"]').click()
    page.locator('#audio-mode').select_option('recording')
    page.evaluate('document.activeElement.blur()')
    page.set_viewport_size({'width':390,'height':844})
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    page.screenshot(path=str(args.output/'mobile.png'),full_page=True)
    results.append('Mobile 390px: no horizontal overflow')
    page.emulate_media(reduced_motion='reduce')
    page.locator('[data-filter="prostration"]').click();page.locator('.monk-tile').first.click()
    # Inline descendants (not SVG use shadow trees) make motion style inspectable.
    assert page.locator('#portrait .bow-torso').evaluate('(node) => getComputedStyle(node).animationName') == 'none'
    results.append('Reduced-motion disables the prostration animation')
    # New document: audio catalog is part of bootstrap, not a hidden runtime mutation.
    audio_page=browser.new_page(viewport={'width':1280,'height':900})
    audio_page.set_default_timeout(8000)
    audio_page.on('pageerror',lambda error:errors.append(str(error)))
    audio_page.set_content(html)
    audio_page.add_script_tag(content=bridge+"\nwindow.__fixture.audio.push({id:'mani',url:'/media/test.wav',title:'TEST ONLY',performer:'Silent fixture',license:'test',loop_start_seconds:0,loop_end_seconds:8});")
    audio_page.add_script_tag(content=js,type='module')
    expect(audio_page.locator('.monk-tile')).to_have_count(72)
    audio_page.locator('#chorus').check();audio_page.locator('#audio-toggle').click()
    audio_page.wait_for_function('window.__starts.length>=3',timeout=8000)
    expect(audio_page.locator('#audio-status')).to_contain_text('3 virtuelle Stimmen')
    results.append('Real Web Audio decode + 3 loop sources, using a silent test WAV')
    assert not errors,errors
    results.append('No uncaught JavaScript errors')
    browser.close()
report={'mode':'offline UI component checks with API/storage/TTS fixtures; real Chromium DOM and Web Audio', 'checks':results,'count':len(results),'errors':errors}
(args.output/'browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
