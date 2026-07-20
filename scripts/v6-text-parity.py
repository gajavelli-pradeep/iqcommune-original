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
  # 1. Mockup hardcodes a year; the live footer renders it dynamically (copying the
  #    literal would be a bug that silently goes stale).
  "2025 iqcommune. All rights reserved",
  # 2. Mockup seed/demo data, not application copy.
  "Equity Analyst", "Kotak Securities",
  # 3. The landing mockup embeds a post-session photo modal whose openPostSession()
  #    is never called anywhere in that file (dead there). The live app ships this
  #    copy as the real /submit-photos page, which is measured separately below.
  "Candid ", "Front-left corner", "Front-right corner", "Group photo ",
  "From trainer's position", "Share your session photos", "Photos received",
  "Photos from sessions are displayed", "Date of session", "Organisation / group name",
  # 4. Mockup surfaces the live app implements differently: a photo *selection* modal
  #    (live downloads the set directly) and a photo-guide *preview* modal (live uses
  #    a PDF + an editable email draft).
  "Select the ones you want to download", "Photo request guide",
  "Session details + a shot guide", "Session details — for reference",
  "Shot guide — what to ask", "Draft email with guide",
  # 5. Decrypted PAN/GST/payment/invoice rows deliberately not surfaced (decision D2).
  "Not applicable / not provided", "(differs from name)",
  # 6. Label span belonging to the dead landing photo modal in (3) above.
  "for tagging",
  # 7. Footer button of the photo-guide *preview* modal in (4). The picker's own
  #    "Download photo guide (PDF)" IS implemented and is matched.
  "Download guide (PDF)",
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
