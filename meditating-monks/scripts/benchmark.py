"""Synthetic engine benchmark, NOT a VPS or concurrent-visitor capacity promise."""
import json
import platform
import statistics
import sys
import time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.config import ROOT, Profile
from app.engine import Engine
p=Profile.model_validate_json((ROOT/'profiles/public-compassion.json').read_text())
results=[]
for population in (108,500,1000,5000):
    engine=Engine(p,population);samples=[]
    for _ in range(100):
        engine.advance(1000);start=time.perf_counter_ns();engine.summary();samples.append((time.perf_counter_ns()-start)/1e6)
    results.append({'monks':population,'summary_median_ms':round(statistics.median(samples),3),'summary_p95_ms':round(sorted(samples)[94],3),'iterations':100})
print(json.dumps({'python':platform.python_version(),'platform':platform.system(),'scope':'engine.summary only, no HTTP/audio/database/visitors','results':results},indent=2))
