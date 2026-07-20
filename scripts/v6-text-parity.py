# -*- coding: utf-8 -*-
import re, os, io, json, glob
# Resolve everything from the repo root so the script runs from anywhere.
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MOCK = os.path.join(ROOT, "client_requirements", "completelyautomatedsetup (V6)")
FILES = [(f"{MOCK}/iqcommune-main-landing-page.html","landing"),
         (f"{MOCK}/iqcommune-empanelment.html","empanelment"),
         (f"{MOCK}/iqcommune-admin-console-automated.html","admin")] + \
        [(p,"sub:"+os.path.basename(p).replace("iqcommune-","").replace(".html","")) for p in glob.glob(f"{MOCK}/files/*.html")]

# ── Documented exclusions: strings that SHOULD NOT exist in the codebase ──────────
# Each is a deliberate divergence or mockup-only content, not an unmet requirement.
EXCLUDE_SUBSTR = [
  # 1. The mockup hardcodes the year; the live footer renders it dynamically. The rest
  #    of the sentence ("iqcommune. All rights reserved.") IS cloned verbatim — copying
  #    the literal "2025" would be a bug that silently goes stale.
  "2025 iqcommune. All rights reserved",
  # 2. Mockup seed/demo data (a sample practitioner identity line), not app copy. The
  #    live page renders the same structure from the signed link's params.
  "Equity Analyst", "Kotak Securities",
  # 3. The landing mockup embeds a post-session photo-upload modal that its own
  #    openPostSession() never calls — it is dead in the client's prototype. The live app
  #    ships this entire flow as the real /submit-photos page (measured separately at
  #    100%), reached by an HMAC-signed link. Cloning the modal onto the public marketing
  #    page would create a SECOND, unreachable copy AND an unauthenticated upload surface
  #    (the live submit route requires a signed `sig`). Not cloned for that reason.
  "Candid ", "Front-left corner", "Front-right corner", "Group photo ",
  "From trainer's position", "Share your session photos", "Photos received",
  "Photos from sessions are displayed", "Date of session",
  "Organisation / group name", "for tagging",
]

blob=[]
for root in [os.path.join(ROOT,"iqcommune",d) for d in ("app","components","lib")]:
    for dp,_,fns in os.walk(root):
        if "node_modules" in dp: continue
        for fn in fns:
            if fn.endswith((".tsx",".ts",".css")):
                try: blob.append(io.open(os.path.join(dp,fn),encoding="utf-8").read())
                except Exception: pass
code=" ".join(blob)

def canon(s):
    for a,b in [("&nbsp;"," "),("&amp;","&"),("&#39;","'"),("&quot;",'"'),("&rsquo;","'"),
                ("’","'"),("‘","'"),("&apos;","'"),(" "," ")]:
        s=s.replace(a,b)
    s=re.sub(r'\{"\s*"\}|\{"\s*—\s*"\}'," ",s)     # JSX spacer expressions
    s=re.sub(r"[—–]"," ",s)                    # em/en dash -> space (JSX splits on these)
    s=re.sub(r"[^\w'&%()/.,:?!+]+"," ",s, flags=re.U)    # collapse punctuation/separators
    return re.sub(r"\s+"," ",s).strip().lower()

code_c = canon(code)
CODEY=re.compile(r"[;=<>{}\[\]$`|]|\.\w+\(|=>|\bvar\b|\bfunction\b|px\b")

def ui_text(s):
    t=re.sub(r"\s+"," ",s).strip()
    if not (14<=len(t)<=220) or t.count(" ")<2: return None
    if CODEY.search(t): return None
    if sum(c.isalpha() for c in t) < len(t)*0.6: return None
    return t

res={}; excluded_total=0
for path,label in FILES:
    html=io.open(path,encoding="utf-8").read()
    static=re.sub(r"<(script|style)[^>]*>.*?</\1>"," ",html,flags=re.S|re.I)
    js=" ".join(re.findall(r"<script[^>]*>(.*?)</script>",html,flags=re.S|re.I))
    tpl=" ".join(re.findall(r"`(.*?)`",js,flags=re.S))
    cand=set()
    for src in (static,tpl):
        for t in re.findall(r">([^<>]{14,240})<",src):
            u=ui_text(t)
            if u: cand.add(u)
    scoped=[]; excl=0
    for t in cand:
        if any(x.lower() in t.lower() for x in EXCLUDE_SUBSTR): excl+=1; continue
        scoped.append(t)
    excluded_total+=excl
    hit=0; misses=[]
    for t in scoped:
        c=canon(t)
        if c and c in code_c: hit+=1; continue
        w=c.split(); found=False
        for i in range(0,max(1,len(w)-4)):
            win=" ".join(w[i:i+5])
            if len(win)>20 and win in code_c: found=True; break
        if found: hit+=1
        else: misses.append(t)
    res[label]={"scoped":len(scoped),"hit":hit,"miss":len(misses),"excluded":excl,
                "pct":round(100.0*hit/max(1,len(scoped)),1),"misses":sorted(misses)}
tot=sum(v["scoped"] for v in res.values()); th=sum(v["hit"] for v in res.values())
for k,v in res.items(): print(f"{k:26s} {v['hit']:4d}/{v['scoped']:4d} = {v['pct']:5.1f}%  miss={v['miss']:2d}  excluded={v['excluded']}")
print(f"{'OVERALL':26s} {th:4d}/{tot:4d} = {round(100.0*th/tot,1)}%   (excluded by design: {excluded_total})")
io.open(os.path.join(ROOT,"iqcommune","scripts","v6-text-parity.json"),"w",encoding="utf-8").write(json.dumps(res,ensure_ascii=False,indent=1))
