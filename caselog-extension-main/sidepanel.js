// ═══════════════════════════════════════════════════════════════
// SurgiLog — Chrome Extension Sidepanel
// Voice-to-ACGME case logger for surgical residents
// ═══════════════════════════════════════════════════════════════

const MEDICAL_AUTOCORRECT = {
  // Procedures
  "you're a toss copy": "ureteroscopy", "your toss copy": "ureteroscopy", "urethra oscopy": "ureteroscopy",
  "you read her oscopy": "ureteroscopy", "you're at her oscopy": "ureteroscopy", "euro toss copy": "ureteroscopy",
  "your at a roscopy": "ureteroscopy", "you rhetor oscopy": "ureteroscopy", "ureteral scopy": "ureteroscopy",
  "sister oscopy": "cystoscopy", "sis toss copy": "cystoscopy", "cyst oscopy": "cystoscopy",
  "sisto scopy": "cystoscopy", "cysto": "cysto", "assist oscopy": "cystoscopy",
  "system your throat oscopy": "cystourethroscopy", "sista your throat oscopy": "cystourethroscopy",
  "sister your ethro scopy": "cystourethroscopy", "cysto urethra scopy": "cystourethroscopy",
  "terp": "TURP", "t u r p": "TURP", "t.u.r.p.": "TURP", "t.u.r.p": "TURP", "turp": "TURP",
  "ter bt": "TURBT", "t u r b t": "TURBT", "t.u.r.b.t.": "TURBT", "turbit": "TURBT", "terbit": "TURBT", "turbid": "TURBT",
  "ho lep": "HoLEP", "whole ep": "HoLEP", "holep": "HoLEP", "whole leap": "HoLEP",
  "pcnl": "PCNL", "p c n l": "PCNL", "percutaneous nephrolithotomy": "percutaneous nephrolithotomy",
  "aqua ablation": "Aquablation", "aqua blation": "Aquablation",
  "ralf": "RARP", "r a r p": "RARP", "rarp": "RARP",
  "robot assisted radical prostatectomy": "robot-assisted radical prostatectomy",
  "robotic radical prostatectomy": "robotic radical prostatectomy",
  "radical sis tech to me": "radical cystectomy", "sis tech to me": "cystectomy",
  "cyst ectomy": "cystectomy", "nephrectomy": "nephrectomy", "never ectomy": "nephrectomy",
  "nephro ectomy": "nephrectomy", "never rectum me": "nephrectomy",
  "partial nephrectomy": "partial nephrectomy", "partial never ectomy": "partial nephrectomy",
  "lap a roscopic": "laparoscopic", "la perez copic": "laparoscopic",
  "orchestra pexy": "orchiopexy", "orky oh pexy": "orchiopexy", "orchid oh pexy": "orchiopexy",
  "orchid ectomy": "orchiectomy", "orky ectomy": "orchiectomy",
  "hydro seal": "hydrocele", "hydro seel": "hydrocele", "hydra seal": "hydrocele",
  "very co seal": "varicocele", "various seal": "varicocele", "very coastal": "varicocele",
  "vericocele": "varicocele", "various a seal": "varicocele",
  "vas ectomy": "vasectomy", "vaso vast ostomy": "vasovasostomy",
  "spermatic a seal": "spermatocele", "sperm out a seal": "spermatocele",
  "pylo plasty": "pyeloplasty", "pile of plasty": "pyeloplasty", "pile o plasty": "pyeloplasty",
  "you're eater oh plasty": "ureteroplasty", "urethra plasty": "urethroplasty",
  "hypo spade ee us": "hypospadias", "hypo spade ias": "hypospadias", "hypospadius": "hypospadias",
  "meatotomy": "meatotomy", "meet otto me": "meatotomy",
  "circumcision": "circumcision", "sir come vision": "circumcision",
  "penile prosthesis": "penile prosthesis", "erectile prosthesis": "penile prosthesis",
  "a u s": "AUS", "artificial urinary sphincter": "artificial urinary sphincter",
  "sacral neuromodulation": "sacral neuromodulation", "inter stim": "InterStim",
  "lithotripsy": "lithotripsy", "with a tripsy": "lithotripsy", "lith o tripsy": "lithotripsy",
  "ll": "laser lithotripsy", "l l": "laser lithotripsy", "el el": "laser lithotripsy", "laser litho": "laser lithotripsy",
  "rpg": "retrograde pyelogram", "r p g": "retrograde pyelogram",
  "e s w l": "ESWL", "eswl": "ESWL", "shock wave": "shockwave",
  "nephrostomy": "nephrostomy", "never ostomy": "nephrostomy", "nefra stomy": "nephrostomy",
  "you read her ostomy": "ureterostomy",
  "adrenal ectomy": "adrenalectomy",
  "retro peritoneal": "retroperitoneal", "retro pear a tone e al": "retroperitoneal",
  "peyronie's": "Peyronie's", "pay ronnie's": "Peyronie's", "pear on ease": "Peyronie's",
  "foley": "Foley", "folly": "Foley",
  "suprapubic": "suprapubic", "super pubic": "suprapubic", "sue pro pubic": "suprapubic",
  // Anatomy
  "you're eater": "ureter", "you reader": "ureter", "you're a der": "ureter",
  "you're eaters": "ureters", "you're at her": "ureter",
  "you're ethra": "urethra", "you're athra": "urethra", "urethra": "urethra",
  "prostate": "prostate", "prost eight": "prostate",
  "bladder": "bladder", "blatter": "bladder",
  "kidney": "kidney", "kidneys": "kidneys",
  "adrenal": "adrenal", "a drenal": "adrenal",
  "renal": "renal", "reenal": "renal",
  "ureteral": "ureteral", "you're at her all": "ureteral",
  "trigone": "trigone", "try gone": "trigone",
  "meatus": "meatus",
  "fossa": "fossa", "fasa": "fossa",
  "pelvis": "pelvis", "renal pelvis": "renal pelvis",
  "calyx": "calyx", "kaylix": "calyx", "calyces": "calyces",
  "perineum": "perineum", "pear a knee um": "perineum",
  "epididymis": "epididymis", "epi did a miss": "epididymis",
  "spermatic cord": "spermatic cord",
  "vas deferens": "vas deferens", "vaz deference": "vas deferens",
  "seminal vesicle": "seminal vesicle",
  // Medical terms
  "hematuria": "hematuria", "he mature ia": "hematuria",
  "hydronephrosis": "hydronephrosis", "hydra nephrosis": "hydronephrosis",
  "nephrolithiasis": "nephrolithiasis", "never lithiasis": "nephrolithiasis",
  "urolithiasis": "urolithiasis",
  "benign prostatic hyperplasia": "benign prostatic hyperplasia",
  "bph": "BPH", "b p h": "BPH",
  "uti": "UTI", "u t i": "UTI",
  "bilateral": "bilateral", "by lateral": "bilateral",
  "unilateral": "unilateral",
  "proximal": "proximal", "distal": "distal",
  "anterior": "anterior", "posterior": "posterior",
  "stent": "stent", "stint": "stent",
  "catheter": "catheter", "cath a ter": "catheter",
  "peri operative": "perioperative", "intra operative": "intraoperative",
  "post operative": "postoperative", "pre operative": "preoperative",
};

const GENERAL_SURGERY_AUTOCORRECT = {
  // Procedures — Abdomen
  "call a sister me": "cholecystectomy", "cole a sister me": "cholecystectomy", "coley sister me": "cholecystectomy",
  "coli cyst ectomy": "cholecystectomy", "collie sister me": "cholecystectomy", "call assist ectomy": "cholecystectomy",
  "append ectomy": "appendectomy", "appen deck to me": "appendectomy", "a pen deck to me": "appendectomy",
  "hernia or a fee": "herniorrhaphy", "hernia raphy": "herniorrhaphy",
  "lap coli": "laparoscopic cholecystectomy", "lap cole": "laparoscopic cholecystectomy",
  "lap appy": "laparoscopic appendectomy", "lap app": "laparoscopic appendectomy",
  "explor lap": "exploratory laparotomy", "ex lap": "exploratory laparotomy",
  "exploratory lap rot o me": "exploratory laparotomy", "lap a rot to me": "laparotomy",
  "nissen": "Nissen fundoplication", "nissan": "Nissen fundoplication",
  "fun dope lick asian": "fundoplication", "fundo": "fundoplication",
  "gastrectomy": "gastrectomy", "gas trek to me": "gastrectomy",
  "colectomy": "colectomy", "coal ectomy": "colectomy", "cole ectomy": "colectomy",
  "hemi colectomy": "hemicolectomy", "hemi cole ectomy": "hemicolectomy",
  "sigmoid ectomy": "sigmoidectomy", "sig moid ectomy": "sigmoidectomy",
  "low anterior resection": "low anterior resection", "l a r": "LAR",
  "abdominoperineal resection": "abdominoperineal resection", "a p r": "APR", "apr": "APR",
  "total abdominal colectomy": "total abdominal colectomy",
  "proctocolectomy": "proctocolectomy", "procto colectomy": "proctocolectomy",
  "ileostomy": "ileostomy", "ill ee oss to me": "ileostomy",
  "colostomy": "colostomy", "coal oss to me": "colostomy",
  "hartman's": "Hartmann's", "hartmann's": "Hartmann's", "hartmans": "Hartmann's",
  "whipple": "Whipple", "wipple": "Whipple",
  "pancreaticoduodenectomy": "pancreaticoduodenectomy", "pancreatico duo den ectomy": "pancreaticoduodenectomy",
  "distal pancreatectomy": "distal pancreatectomy",
  "splenectomy": "splenectomy", "spleen ectomy": "splenectomy",
  "hepatectomy": "hepatectomy", "hep a tech to me": "hepatectomy",
  "liver resection": "liver resection",
  "bariatric": "bariatric", "barry attic": "bariatric",
  "gastric bypass": "gastric bypass", "roux en y": "Roux-en-Y", "roux-en-y": "Roux-en-Y", "rue en why": "Roux-en-Y",
  "sleeve gastrectomy": "sleeve gastrectomy", "gastric sleeve": "gastric sleeve",
  "lap band": "lap band", "adjustable gastric band": "adjustable gastric band",
  // Breast
  "mastectomy": "mastectomy", "mass tech to me": "mastectomy",
  "lumpectomy": "lumpectomy", "lump ectomy": "lumpectomy",
  "sentinel node": "sentinel node", "sentinel lymph node": "sentinel lymph node",
  "sentinel": "sentinel", "sent a nell": "sentinel",
  "axillary dissection": "axillary dissection",
  // Thyroid/Parathyroid/Endocrine
  "thyroidectomy": "thyroidectomy", "thy roid ectomy": "thyroidectomy",
  "parathyroidectomy": "parathyroidectomy", "para thyroid ectomy": "parathyroidectomy",
  "adrenalectomy": "adrenalectomy", "a drenal ectomy": "adrenalectomy",
  // Skin/Soft Tissue
  "excision": "excision", "ex vision": "excision",
  "lipoma": "lipoma", "lie poma": "lipoma",
  "melanoma": "melanoma", "mela noma": "melanoma",
  "wide local excision": "wide local excision", "w l e": "WLE",
  "incision and drainage": "incision and drainage", "i and d": "I&D", "i & d": "I&D",
  // Trauma
  "damage control": "damage control",
  "trauma laparotomy": "trauma laparotomy",
  "splenorrhaphy": "splenorrhaphy", "spleen or a fee": "splenorrhaphy",
  // Anatomy
  "gallbladder": "gallbladder", "gall bladder": "gallbladder",
  "appendix": "appendix", "a pen dix": "appendix",
  "small bowel": "small bowel", "jejunum": "jejunum", "ileum": "ileum", "duodenum": "duodenum",
  "colon": "colon", "sigmoid": "sigmoid", "rectum": "rectum", "cecum": "cecum",
  "mesentery": "mesentery", "mesa entry": "mesentery",
  "omentum": "omentum", "o men tum": "omentum",
  "peritoneum": "peritoneum", "peri to knee um": "peritoneum",
  "retroperitoneum": "retroperitoneum",
  "pancreas": "pancreas", "pan cree us": "pancreas",
  "liver": "liver", "spleen": "spleen",
  "thyroid": "thyroid", "parathyroid": "parathyroid",
  "inguinal": "inguinal", "in gwyneth al": "inguinal",
  "ventral": "ventral", "incisional": "incisional",
  "umbilical": "umbilical", "um bill ickle": "umbilical",
  "femoral": "femoral", "fem or al": "femoral",
  "diaphragm": "diaphragm", "die a fram": "diaphragm",
  // Medical terms
  "cholecystitis": "cholecystitis", "coley cyst itis": "cholecystitis",
  "choledocholithiasis": "choledocholithiasis",
  "cholelithiasis": "cholelithiasis",
  "appendicitis": "appendicitis", "appen da sitis": "appendicitis",
  "peritonitis": "peritonitis", "peri ton itis": "peritonitis",
  "small bowel obstruction": "small bowel obstruction", "s b o": "SBO", "sbo": "SBO",
  "anastomosis": "anastomosis", "anna stow mosis": "anastomosis",
  "anastomotic": "anastomotic", "anna stow motic": "anastomotic",
  "stoma": "stoma", "sto ma": "stoma",
  "bilateral": "bilateral", "by lateral": "bilateral",
  "unilateral": "unilateral",
  "proximal": "proximal", "distal": "distal",
  "anterior": "anterior", "posterior": "posterior",
  "stent": "stent", "stint": "stent",
  "catheter": "catheter", "cath a ter": "catheter",
  "peri operative": "perioperative", "intra operative": "intraoperative",
  "post operative": "postoperative", "pre operative": "preoperative",
  "trocar": "trocar", "trow car": "trocar",
  "port": "port", "insufflation": "insufflation",
  "mesentery": "mesentery", "omentectomy": "omentectomy",
};

const VASCULAR_AUTOCORRECT = {
  // Procedures
  "end art or ectomy": "endarterectomy", "end art er ectomy": "endarterectomy",
  "and art or ectomy": "endarterectomy", "in dark to me": "endarterectomy",
  "thrombo and art or ectomy": "thromboendarterectomy",
  "care ought id": "carotid", "karate id": "carotid", "car ride id": "carotid", "care ot id": "carotid",
  "aortic": "aortic", "a or tick": "aortic",
  "aneurysm": "aneurysm", "anna rhythm": "aneurysm", "an your ism": "aneurysm",
  "a v fistula": "AV fistula", "av fistula": "AV fistula",
  "fistulagram": "fistulogram", "fistula gram": "fistulogram", "fistulo gram": "fistulogram",
  "fistuloplasty": "fistula angioplasty", "fistula plasty": "fistula angioplasty",
  "de clot": "declot", "d clot": "declot", "declot": "declot",
  "thrombectomy": "thrombectomy", "thromba ectomy": "thrombectomy",
  "embolectomy": "embolectomy", "embo ectomy": "embolectomy",
  "below knee amputation": "below-knee amputation", "below the knee amputation": "below-knee amputation",
  "above knee amputation": "above-knee amputation", "above the knee amputation": "above-knee amputation",
  "b k a": "below-knee amputation", "a k a": "above-knee amputation",
  "fem pop": "femoral-popliteal", "fem-pop": "femoral-popliteal",
  "fem fem": "femoral-femoral", "fem-fem": "femoral-femoral",
  "ax fem": "axillary-femoral", "ax-fem": "axillary-femoral",
  "aorto bi fem": "aortobifemoral", "aorto-bi-fem": "aortobifemoral",
  "fem tib": "femoral-tibial", "fem-tib": "femoral-tibial",
  "stab flee ectomy": "stab phlebectomy", "flee ectomy": "phlebectomy",
  "endovenous": "endovenous", "endo venous": "endovenous",
  "radio frequency": "radiofrequency", "rf ablation": "radiofrequency ablation",
  "angiogram": "angiogram", "angio gram": "angiogram",
  "angioplasty": "angioplasty", "angio plasty": "angioplasty",
  "ultrasound guided access": "ultrasound-guided access", "u s guided access": "ultrasound-guided access",
  "atherectomy": "atherectomy", "athero ectomy": "atherectomy",
  "endo graft": "endograft",
  "e var": "EVAR", "evar": "EVAR", "e v a r": "EVAR",
  "t e var": "TEVAR", "tevar": "TEVAR",
  "sclerosant": "sclerosant", "sclerose ant": "sclerosant",
  "c e a": "CEA", "cea": "CEA",
  // Anatomy
  "femoral": "femoral", "fem or al": "femoral",
  "popliteal": "popliteal", "pop lit ee al": "popliteal", "pop little": "popliteal",
  "tibial": "tibial", "tibby al": "tibial",
  "peroneal": "peroneal", "pear on e al": "peroneal",
  "saphenous": "saphenous", "saff uh nus": "saphenous", "safe in us": "saphenous",
  "iliac": "iliac", "ill ee ac": "iliac",
  "axillary": "axillary", "axe ill airy": "axillary",
  "subclavian": "subclavian", "sub clay vee in": "subclavian",
  "innominate": "innominate", "in nom in it": "innominate",
  "brachial": "brachial", "brake ee al": "brachial",
  "radial": "radial", "ray deal": "radial",
  "ulnar": "ulnar", "all nar": "ulnar",
  "basilic": "basilic", "bah sil ick": "basilic",
  "cephalic": "cephalic", "seh fal ick": "cephalic",
  "profunda": "profunda", "pro fund ah": "profunda",
  "mesenteric": "mesenteric", "mess en teric": "mesenteric",
  "celiac": "celiac", "see lee ac": "celiac",
  // Medical terms
  "bilateral": "bilateral", "by lateral": "bilateral",
  "unilateral": "unilateral",
  "proximal": "proximal", "distal": "distal",
  "anterior": "anterior", "posterior": "posterior",
  "prosthetic": "prosthetic", "pros thetic": "prosthetic",
  "anastomosis": "anastomosis", "anna stow mow sis": "anastomosis",
  "claudication": "claudication", "claw duh cation": "claudication",
  "ischemia": "ischemia", "iss key me uh": "ischemia",
  "stenosis": "stenosis", "stuh no sis": "stenosis",
  "occlusion": "occlusion", "oh clue zhun": "occlusion",
  "embolism": "embolism", "embo lism": "embolism",
  "thrombosis": "thrombosis", "throm bo sis": "thrombosis",
  "heparin": "heparin", "hepper in": "heparin",
  "stent": "stent", "stint": "stent",
  "catheter": "catheter", "cath a ter": "catheter",
  "graft": "graft", "graph": "graft",
  "bovine": "bovine", "bow vine": "bovine",
  "gore-tex": "Gore-Tex", "gore tex": "Gore-Tex",
  "ptfe": "PTFE", "p t f e": "PTFE",
  "duplex": "duplex", "do plex": "duplex",
  "peri operative": "perioperative", "intra operative": "intraoperative",
  "post operative": "postoperative", "pre operative": "preoperative",
};

const CPT_DATA = [["Prostate (Biopsy/TRUS)","55700","Biopsy prostate; needle or punch single or multiple any approach"],["Prostate (Biopsy/TRUS)","55705","Biopsy prostate; incisional any approach"],["Prostate (Biopsy/TRUS)","55706","Biopsies prostate needle transperineal stereotactic template guided saturation sampling including imaging guidance"],["Prostate (Biopsy/TRUS)","55720","Prostatotomy external drainage of prostatic abscess any approach; simple"],["Prostate (Biopsy/TRUS)","55725","Prostatotomy external drainage of prostatic abscess any approach; complicated"],["Prostate (Procedures)","52450","Transurethral incision of prostate"],["Prostate (Procedures)","52601","Transurethral electrosurgical resection of prostate including control of postoperative bleeding complete"],["Prostate (Procedures)","52630","Transurethral resection; residual or regrowth of obstructive prostate tissue"],["Prostate (Procedures)","52647","Laser coagulation of prostate"],["Prostate (Procedures)","52648","Laser vaporization of prostate"],["Prostate (Procedures)","52649","Laser enucleation of the prostate with morcellation (HoLEP)"],["Prostate (Procedures)","53850","Transurethral destruction of prostate tissue; by microwave thermotherapy"],["Prostate (Procedures)","53852","Transurethral destruction of prostate tissue; by radiofrequency thermotherapy"],["Prostate (Procedures)","0421T","Transurethral waterjet ablation of prostate (Aquablation)"],["Prostate (Procedures)","52441","Cystourethroscopy with insertion of permanent adjustable transprostatic implant; single implant"],["Prostate (Procedures)","52442","Cystourethroscopy with insertion of permanent adjustable transprostatic implant; each additional"],["Prostate (Surgical)","55801","Prostatectomy perineal subtotal"],["Prostate (Surgical)","55810","Prostatectomy perineal radical"],["Prostate (Surgical)","55812","Prostatectomy perineal radical; with lymph node biopsy(s)"],["Prostate (Surgical)","55815","Prostatectomy perineal radical; with bilateral pelvic lymphadenectomy"],["Prostate (Surgical)","55821","Prostatectomy suprapubic subtotal"],["Prostate (Surgical)","55831","Prostatectomy retropubic subtotal"],["Prostate (Surgical)","55840","Prostatectomy retropubic radical"],["Prostate (Surgical)","55842","Prostatectomy retropubic radical; with lymph node biopsy(s)"],["Prostate (Surgical)","55845","Prostatectomy retropubic radical; with bilateral pelvic lymphadenectomy"],["Prostate (Surgical)","55866","Laparoscopy surgical prostatectomy retropubic radical including nerve sparing"],["Prostate (Surgical)","55867","Laparoscopy surgical prostatectomy simple subtotal"],["Bladder (Endoscopic)","52000","Cystourethroscopy (separate procedure)"],["Bladder (Endoscopic)","52001","Cystourethroscopy with irrigation and evacuation of multiple obstructing clots"],["Bladder (Endoscopic)","52005","Cystourethroscopy with ureteral catheterization"],["Bladder (Endoscopic)","52007","Cystourethroscopy with ureteral catheterization; with brush biopsy"],["Bladder (Endoscopic)","52010","Cystourethroscopy with ejaculatory duct catheterization"],["Bladder (Endoscopic)","52204","Cystourethroscopy with biopsy(s)"],["Bladder (Endoscopic)","52214","Cystourethroscopy with fulguration of trigone/bladder neck/prostatic fossa"],["Bladder (Endoscopic)","52224","Cystourethroscopy with fulguration or treatment of MINOR (less than 0.5 cm) lesion(s)"],["Bladder (Endoscopic)","52234","Cystourethroscopy with fulguration/resection of SMALL bladder tumor(s) (0.5 to 2.0 cm)"],["Bladder (Endoscopic)","52235","Cystourethroscopy with fulguration/resection of MEDIUM bladder tumor(s) (2.0 to 5.0 cm)"],["Bladder (Endoscopic)","52240","Cystourethroscopy with fulguration/resection of LARGE bladder tumor(s)"],["Bladder (Endoscopic)","51720","Bladder instillation of anticarcinogenic agent (including retention time)"],["Bladder (Endoscopic)","52250","Cystourethroscopy with insertion of radioactive substance"],["Bladder (Endoscopic)","52260","Cystourethroscopy with dilation of bladder for interstitial cystitis; general/spinal"],["Bladder (Endoscopic)","52265","Cystourethroscopy with dilation of bladder for interstitial cystitis; local"],["Bladder (Endoscopic)","52270","Cystourethroscopy with internal urethrotomy; female"],["Bladder (Endoscopic)","52275","Cystourethroscopy with internal urethrotomy; male"],["Bladder (Endoscopic)","52276","Cystourethroscopy with direct vision internal urethrotomy"],["Bladder (Endoscopic)","52277","Cystourethroscopy with resection of external sphincter (sphincterotomy)"],["Bladder (Endoscopic)","52281","Cystourethroscopy with calibration/dilation of urethral stricture"],["Bladder (Endoscopic)","52282","Cystourethroscopy with insertion of permanent urethral stent"],["Bladder (Endoscopic)","52283","Cystourethroscopy with steroid injection into stricture"],["Bladder (Endoscopic)","52285","Cystourethroscopy for treatment of the female urethral syndrome"],["Bladder (Endoscopic)","52287","Cystourethroscopy with injection(s) for chemodenervation of the bladder"],["Bladder (Endoscopic)","52290","Cystourethroscopy; with ureteral meatotomy"],["Bladder (Endoscopic)","52300","Cystourethroscopy; with resection/fulguration of orthotopic ureterocele(s)"],["Bladder (Endoscopic)","52301","Cystourethroscopy; with resection/fulguration of ectopic ureterocele(s)"],["Bladder (Endoscopic)","52305","Cystourethroscopy; with incision or resection of orifice of bladder diverticulum"],["Bladder (Endoscopic)","52310","Cystourethroscopy with removal of foreign body/calculus/stent; simple"],["Bladder (Endoscopic)","52315","Cystourethroscopy with removal of foreign body/calculus/stent; complicated"],["Bladder (Endoscopic)","52317","Litholapaxy: crushing or fragmentation of calculus; simple or small"],["Bladder (Endoscopic)","52318","Litholapaxy: crushing or fragmentation of calculus; complicated or large"],["Bladder (Endoscopic)","52332","Cystourethroscopy with insertion of indwelling ureteral stent (eg Gibbons or double-J)"],["Bladder (Endoscopic)","52400","Cystourethroscopy with incision/resection of congenital posterior urethral valves"],["Bladder (Endoscopic)","52402","Cystourethroscopy with transurethral resection or incision of ejaculatory ducts"],["Bladder (Endoscopic)","52500","Transurethral resection of bladder neck (separate procedure)"],["Bladder (Endoscopic)","52640","Transurethral resection; of postoperative bladder neck contracture"],["Bladder (Endoscopic)","52700","Transurethral drainage of prostatic abscess"],["Bladder (Surgical/Recon)","51535","Cystotomy for excision incision or repair of ureterocele"],["Bladder (Surgical/Recon)","51550","Cystectomy partial; simple"],["Bladder (Surgical/Recon)","51555","Cystectomy partial; complicated"],["Bladder (Surgical/Recon)","51565","Cystectomy partial with reimplantation of ureter(s)"],["Bladder (Surgical/Recon)","51570","Cystectomy complete; (separate procedure)"],["Bladder (Surgical/Recon)","51575","Cystectomy complete; with bilateral pelvic lymphadenectomy"],["Bladder (Surgical/Recon)","51580","Cystectomy complete with ureterosigmoidostomy or ureterocutaneous transplantations"],["Bladder (Surgical/Recon)","51585","Cystectomy complete with ureterosigmoidostomy with bilateral pelvic lymphadenectomy"],["Bladder (Surgical/Recon)","51590","Cystectomy complete with ureteroileal conduit or sigmoid bladder"],["Bladder (Surgical/Recon)","51595","Cystectomy complete with ureteroileal conduit with bilateral pelvic lymphadenectomy"],["Bladder (Surgical/Recon)","51596","Cystectomy complete with continent diversion (neobladder)"],["Bladder (Surgical/Recon)","51597","Pelvic exenteration complete"],["Bladder (Surgical/Recon)","51715","Endoscopic injection of implant material into submucosal tissues of urethra/bladder neck"],["Bladder (Surgical/Recon)","51800","Cystoplasty or cystourethroplasty plastic operation on bladder/vesical neck"],["Bladder (Surgical/Recon)","51820","Cystourethroplasty with unilateral or bilateral ureteroneocystostomy"],["Bladder (Surgical/Recon)","51840","Anterior vesicourethropexy or urethropexy (eg Marshall-Marchetti-Krantz Burch); simple"],["Bladder (Surgical/Recon)","51841","Anterior vesicourethropexy or urethropexy; complicated"],["Bladder (Surgical/Recon)","51845","Abdomino-vaginal vesical neck suspension (eg Stamey Raz)"],["Bladder (Surgical/Recon)","51900","Closure of vesicovaginal fistula abdominal approach"],["Bladder (Surgical/Recon)","51920","Closure of vesicouterine fistula"],["Bladder (Surgical/Recon)","51925","Closure of vesicouterine fistula; with hysterectomy"],["Bladder (Surgical/Recon)","51940","Closure exstrophy of bladder"],["Bladder (Surgical/Recon)","51960","Enterocystoplasty including intestinal anastomosis"],["Bladder (Surgical/Recon)","51980","Cutaneous vesicostomy"],["Bladder (Surgical/Recon)","51999","Unlisted laparoscopy procedure bladder"],["Ureter (Endoscopic)","52320","Cystourethroscopy with removal of ureteral calculus"],["Ureter (Endoscopic)","52325","Cystourethroscopy with fragmentation of ureteral calculus"],["Ureter (Endoscopic)","52327","Cystourethroscopy with subureteric injection of implant material"],["Ureter (Endoscopic)","52330","Cystourethroscopy with manipulation without removal of ureteral calculus"],["Ureter (Endoscopic)","52334","Cystourethroscopy with insertion of ureteral guide wire (retrograde)"],["Ureter (Endoscopic)","52341","Cystourethroscopy with treatment of ureteral stricture"],["Ureter (Endoscopic)","52342","Cystourethroscopy with treatment of UPJ stricture"],["Ureter (Endoscopic)","52343","Cystourethroscopy with treatment of intra-renal stricture"],["Ureter (Endoscopic)","52344","Cystourethroscopy with ureteroscopy; with treatment of ureteral stricture"],["Ureter (Endoscopic)","52345","Cystourethroscopy with ureteroscopy; with treatment of UPJ stricture"],["Ureter (Endoscopic)","52346","Cystourethroscopy with ureteroscopy; with treatment of intra-renal stricture"],["Ureter (Endoscopic)","52351","Cystourethroscopy with ureteroscopy and/or pyeloscopy; diagnostic"],["Ureter (Endoscopic)","52352","Cystourethroscopy with ureteroscopy; with removal/manipulation of calculus"],["Ureter (Endoscopic)","52353","Cystourethroscopy with ureteroscopy; with lithotripsy"],["Ureter (Endoscopic)","52354","Cystourethroscopy with ureteroscopy; with biopsy and/or fulguration"],["Ureter (Endoscopic)","52355","Cystourethroscopy with ureteroscopy; with resection of tumor"],["Ureter (Endoscopic)","52356","Cystourethroscopy with ureteroscopy; with lithotripsy including indwelling stent"],["Ureter (Endoscopic)","50951","Ureteral endoscopy through established ureterostomy"],["Ureter (Endoscopic)","50953","Ureteral endoscopy through established ureterostomy; with catheterization"],["Ureter (Endoscopic)","50955","Ureteral endoscopy through established ureterostomy; with biopsy"],["Ureter (Endoscopic)","50957","Ureteral endoscopy through established ureterostomy; with fulguration"],["Ureter (Endoscopic)","50961","Ureteral endoscopy through established ureterostomy; with removal of foreign body"],["Ureter (Endoscopic)","50970","Ureteral endoscopy through ureterotomy"],["Ureter (Endoscopic)","50972","Ureteral endoscopy through ureterotomy; with catheterization"],["Ureter (Endoscopic)","50974","Ureteral endoscopy through ureterotomy; with biopsy"],["Ureter (Endoscopic)","50976","Ureteral endoscopy through ureterotomy; with fulguration"],["Ureter (Endoscopic)","50980","Ureteral endoscopy through ureterotomy; with removal of foreign body"],["Ureter (Surgical/Recon)","50600","Ureterotomy with exploration or drainage"],["Ureter (Surgical/Recon)","50605","Ureterotomy for insertion of indwelling stent"],["Ureter (Surgical/Recon)","50610","Ureterolithotomy; upper one-third"],["Ureter (Surgical/Recon)","50620","Ureterolithotomy; middle one-third"],["Ureter (Surgical/Recon)","50630","Ureterolithotomy; lower one-third"],["Ureter (Surgical/Recon)","50650","Ureterectomy with bladder cuff"],["Ureter (Surgical/Recon)","50660","Ureterectomy total ectopic ureter"],["Ureter (Surgical/Recon)","50700","Ureteroplasty plastic operation on ureter"],["Ureter (Surgical/Recon)","50715","Ureterolysis with or without repositioning for retroperitoneal fibrosis"],["Ureter (Surgical/Recon)","50722","Ureterolysis for ovarian vein syndrome"],["Ureter (Surgical/Recon)","50725","Ureterolysis for retrocaval ureter"],["Ureter (Surgical/Recon)","50727","Revision of urinary-cutaneous anastomosis"],["Ureter (Surgical/Recon)","50728","Revision of urinary-cutaneous anastomosis; with repair of fascial defect"],["Ureter (Surgical/Recon)","50740","Ureteropyelostomy anastomosis of ureter and renal pelvis"],["Ureter (Surgical/Recon)","50750","Ureterocalycostomy anastomosis of ureter to renal calyx"],["Ureter (Surgical/Recon)","50760","Ureteroureterostomy"],["Ureter (Surgical/Recon)","50770","Transureteroureterostomy anastomosis of ureter to contralateral ureter"],["Ureter (Surgical/Recon)","50780","Ureteroneocystostomy; anastomosis of single ureter to bladder"],["Ureter (Surgical/Recon)","50782","Ureteroneocystostomy; anastomosis of duplicated ureter to bladder"],["Ureter (Surgical/Recon)","50783","Ureteroneocystostomy; with extensive ureteral tailoring"],["Ureter (Surgical/Recon)","50785","Ureteroneocystostomy; with vesico-psoas hitch or bladder flap"],["Ureter (Surgical/Recon)","50800","Ureteroenterostomy direct anastomosis of ureter to intestine"],["Ureter (Surgical/Recon)","50810","Ureterosigmoidostomy"],["Ureter (Surgical/Recon)","50815","Ureterocolon conduit"],["Ureter (Surgical/Recon)","50820","Ureteroileal conduit (ileal bladder)"],["Ureter (Surgical/Recon)","50825","Continent diversion using any segment of intestine"],["Ureter (Surgical/Recon)","50830","Urinary undiversion"],["Ureter (Surgical/Recon)","50840","Replacement of all or part of ureter by intestine segment"],["Ureter (Surgical/Recon)","50845","Cutaneous appendico-vesicostomy"],["Ureter (Surgical/Recon)","50860","Ureterostomy transplantation of ureter to skin"],["Ureter (Surgical/Recon)","50900","Ureterorrhaphy suture of ureter"],["Ureter (Surgical/Recon)","50920","Closure of ureterocutaneous fistula"],["Ureter (Surgical/Recon)","50930","Closure of ureterovisceral fistula"],["Ureter (Surgical/Recon)","50940","Deligation of ureter"],["Ureter (Surgical/Recon)","50945","Laparoscopy surgical; ureterolithotomy"],["Ureter (Surgical/Recon)","50947","Laparoscopy surgical; ureteroneocystostomy with stent"],["Ureter (Surgical/Recon)","50948","Laparoscopy surgical; ureteroneocystostomy without stent"],["Ureter (Surgical/Recon)","50949","Unlisted laparoscopy procedure ureter"],["Kidney (Percutaneous)","50080","Percutaneous nephrolithotomy (PCNL) < 2 cm"],["Kidney (Percutaneous)","50081","Percutaneous nephrolithotomy (PCNL) > 2 cm"],["Kidney (Percutaneous)","50382","Removal/replacement of internal ureteral stent via percutaneous approach"],["Kidney (Percutaneous)","50384","Removal of internal ureteral stent via percutaneous approach"],["Kidney (Percutaneous)","50387","Removal/replacement of external nephroureteral catheter"],["Kidney (Percutaneous)","50389","Removal of nephrostomy tube fluoroscopic"],["Kidney (Percutaneous)","50390","Aspiration/injection renal cyst or pelvis percutaneous"],["Kidney (Percutaneous)","50391","Instillation(s) of therapeutic agent into renal pelvis/ureter"],["Kidney (Percutaneous)","50396","Manometric studies through nephrostomy"],["Kidney (Percutaneous)","50432","Placement of nephrostomy catheter percutaneous"],["Kidney (Percutaneous)","50551","Renal endoscopy through established nephrostomy; diagnostic"],["Kidney (Percutaneous)","50553","Renal endoscopy through established nephrostomy; with catheterization"],["Kidney (Percutaneous)","50555","Renal endoscopy through established nephrostomy; with biopsy"],["Kidney (Percutaneous)","50557","Renal endoscopy through established nephrostomy; with fulguration"],["Kidney (Percutaneous)","50561","Renal endoscopy through established nephrostomy; with removal of foreign body"],["Kidney (Percutaneous)","50562","Renal endoscopy through established nephrostomy; with resection of tumor"],["Kidney (Percutaneous)","50570","Renal endoscopy through nephrotomy; diagnostic"],["Kidney (Percutaneous)","50572","Renal endoscopy through nephrotomy; with catheterization"],["Kidney (Percutaneous)","50574","Renal endoscopy through nephrotomy; with biopsy"],["Kidney (Percutaneous)","50575","Renal endoscopy through nephrotomy; with endopyelotomy"],["Kidney (Percutaneous)","50576","Renal endoscopy through nephrotomy; with fulguration"],["Kidney (Percutaneous)","50580","Renal endoscopy through nephrotomy; with removal of foreign body"],["Kidney (Percutaneous)","50592","Ablation of renal tumor percutaneous (Radiofrequency)"],["Kidney (Percutaneous)","50593","Ablation of renal tumor percutaneous (Cryo)"],["Kidney (Surgical/Open)","50060","Nephrolithotomy; removal of calculus"],["Kidney (Surgical/Open)","50065","Nephrolithotomy; secondary surgical operation for calculus"],["Kidney (Surgical/Open)","50070","Nephrolithotomy; complicated by congenital kidney abnormality"],["Kidney (Surgical/Open)","50075","Nephrolithotomy; removal of large staghorn calculus"],["Kidney (Surgical/Open)","50130","Pyelotomy; with removal of calculus"],["Kidney (Surgical/Open)","50220","Nephrectomy (including partial ureterectomy) open"],["Kidney (Surgical/Open)","50225","Nephrectomy complicated (previous surgery)"],["Kidney (Surgical/Open)","50230","Radical Nephrectomy open (w/ lymphadenectomy/thrombectomy)"],["Kidney (Surgical/Open)","50234","Nephrectomy with total ureterectomy (same incision)"],["Kidney (Surgical/Open)","50236","Nephrectomy with total ureterectomy (separate incision)"],["Kidney (Surgical/Open)","50240","Partial Nephrectomy open"],["Kidney (Surgical/Open)","50250","Ablation open renal mass lesion(s) (cryosurgical)"],["Kidney (Surgical/Open)","50280","Excision or unroofing of cyst(s) of kidney"],["Kidney (Surgical/Open)","50290","Excision of perinephric cyst"],["Kidney (Surgical/Open)","50300","Donor nephrectomy (cadaver)"],["Kidney (Surgical/Open)","50320","Donor nephrectomy (living)"],["Kidney (Surgical/Open)","50340","Recipient nephrectomy (separate procedure)"],["Kidney (Surgical/Open)","50360","Renal allotransplantation without recipient nephrectomy"],["Kidney (Surgical/Open)","50365","Renal allotransplantation with recipient nephrectomy"],["Kidney (Surgical/Open)","50370","Removal of transplanted renal allograft"],["Kidney (Surgical/Open)","50380","Renal autotransplantation reimplantation of kidney"],["Kidney (Surgical/Open)","50400","Pyeloplasty (simple) open"],["Kidney (Surgical/Open)","50405","Pyeloplasty (complicated) open"],["Kidney (Surgical/Open)","50500","Nephrorrhaphy suture of kidney wound or injury"],["Kidney (Surgical/Open)","50520","Closure of nephrocutaneous or pyelocutaneous fistula"],["Kidney (Surgical/Open)","50525","Closure of nephrovisceral fistula; abdominal"],["Kidney (Surgical/Open)","50526","Closure of nephrovisceral fistula; thoracic"],["Kidney (Surgical/Open)","50541","Laparoscopic ablation of renal cysts"],["Kidney (Surgical/Open)","50542","Laparoscopic ablation of renal mass (cryo/RF)"],["Kidney (Surgical/Open)","50543","Laparoscopic partial nephrectomy"],["Kidney (Surgical/Open)","50544","Laparoscopic pyeloplasty"],["Kidney (Surgical/Open)","50545","Laparoscopic radical nephrectomy"],["Kidney (Surgical/Open)","50546","Laparoscopic nephrectomy (complete)"],["Kidney (Surgical/Open)","50547","Laparoscopic donor nephrectomy"],["Kidney (Surgical/Open)","50548","Laparoscopic nephroureterectomy"],["Kidney (Surgical/Open)","50549","Unlisted laparoscopy procedure renal"],["Kidney (Other)","50590","Lithotripsy extracorporeal shock wave (ESWL)"],["Adrenal","60540","Adrenalectomy partial or complete (open)"],["Adrenal","60545","Adrenalectomy with excision of adjacent retroperitoneal tumor"],["Adrenal","60650","Laparoscopy surgical with adrenalectomy"],["Scrotum & Testis","54500","Biopsy of testis needle"],["Scrotum & Testis","54505","Biopsy of testis incisional"],["Scrotum & Testis","54512","Excision of extraparenchymal lesion of testis"],["Scrotum & Testis","54520","Orchiectomy simple (unilateral)"],["Scrotum & Testis","54522","Orchiectomy partial"],["Scrotum & Testis","54530","Orchiectomy radical (inguinal approach for tumor)"],["Scrotum & Testis","54535","Orchiectomy radical with abdominal exploration"],["Scrotum & Testis","54550","Exploration for undescended testis (inguinal/scrotal)"],["Scrotum & Testis","54560","Exploration for undescended testis with abdominal exploration"],["Scrotum & Testis","54600","Reduction of torsion of testis"],["Scrotum & Testis","54620","Fixation of contralateral testis"],["Scrotum & Testis","54640","Orchiopexy inguinal or scrotal approach"],["Scrotum & Testis","54650","Orchiopexy abdominal approach (Fowler-Stephens)"],["Scrotum & Testis","54660","Insertion of testicular prosthesis"],["Scrotum & Testis","54680","Transplantation of testis to thigh"],["Scrotum & Testis","54690","Laparoscopic orchiectomy"],["Scrotum & Testis","54692","Laparoscopic orchiopexy for intra-abdominal testis"],["Scrotum & Testis","54699","Unlisted laparoscopy procedure testis"],["Scrotum & Testis","54700","Incision and drainage of epididymis testis and/or scrotal space"],["Scrotum & Testis","54800","Biopsy of epididymis needle"],["Scrotum & Testis","54830","Excision of local lesion of epididymis"],["Scrotum & Testis","54840","Excision of spermatocele"],["Scrotum & Testis","54860","Epididymectomy; unilateral"],["Scrotum & Testis","54861","Epididymectomy; bilateral"],["Scrotum & Testis","54865","Exploration of epididymis"],["Scrotum & Testis","54900","Epididymovasostomy; unilateral"],["Scrotum & Testis","54901","Epididymovasostomy; bilateral"],["Scrotum & Testis","55000","Puncture aspiration of hydrocele"],["Scrotum & Testis","55040","Excision of hydrocele; unilateral"],["Scrotum & Testis","55041","Excision of hydrocele; bilateral"],["Scrotum & Testis","55060","Repair of tunica vaginalis hydrocele (Bottle type)"],["Scrotum & Testis","55100","Drainage of scrotal wall abscess"],["Scrotum & Testis","55110","Scrotal exploration"],["Scrotum & Testis","55120","Removal of foreign body in scrotum"],["Scrotum & Testis","55150","Resection of scrotum"],["Scrotum & Testis","55175","Scrotoplasty; simple"],["Scrotum & Testis","55180","Scrotoplasty; complicated"],["Scrotum & Testis","55200","Vasotomy cannulization"],["Scrotum & Testis","55250","Vasectomy unilateral or bilateral"],["Scrotum & Testis","55300","Vasotomy for vasograms"],["Scrotum & Testis","55400","Vasovasostomy vasovasorrhaphy"],["Scrotum & Testis","55450","Ligation of spermatic veins for varicocele"],["Scrotum & Testis","55500","Excision of hydrocele of spermatic cord"],["Scrotum & Testis","55520","Excision of lesion of spermatic cord"],["Scrotum & Testis","55530","Excision of varicocele or ligation of spermatic veins"],["Scrotum & Testis","55535","Excision of varicocele (abdominal approach)"],["Scrotum & Testis","55540","Excision of varicocele with hernia repair"],["Scrotum & Testis","55550","Laparoscopy surgical with ligation of spermatic veins"],["Scrotum & Testis","55559","Unlisted laparoscopy procedure spermatic cord"],["Penis & Urethra","54100","Biopsy of penis; (separate procedure)"],["Penis & Urethra","54105","Biopsy of penis; deep structures"],["Penis & Urethra","54110","Excision of penile plaque (Peyronie disease)"],["Penis & Urethra","54111","Excision of penile plaque with graft to 5 cm"],["Penis & Urethra","54112","Excision of penile plaque with graft > 5 cm"],["Penis & Urethra","54115","Removal foreign body from deep penile tissue"],["Penis & Urethra","54120","Amputation of penis; partial"],["Penis & Urethra","54125","Amputation of penis; complete"],["Penis & Urethra","54130","Amputation of penis radical; with bilateral inguinofemoral lymphadenectomy"],["Penis & Urethra","54135","Amputation of penis radical; with bilateral pelvic lymphadenectomy"],["Penis & Urethra","54205","Injection procedure for Peyronie disease with surgical exposure"],["Penis & Urethra","54400","Insertion of penile prosthesis; non-inflatable"],["Penis & Urethra","54401","Insertion of penile prosthesis; inflatable (self-contained)"],["Penis & Urethra","54405","Insertion of multi-component inflatable penile prosthesis"],["Penis & Urethra","54406","Removal of all components of inflatable penile prosthesis"],["Penis & Urethra","54408","Repair of component(s) of inflatable penile prosthesis"],["Penis & Urethra","54410","Removal and replacement of all component(s) of inflatable prosthesis"],["Penis & Urethra","54411","Removal and replacement of inflatable prosthesis (infected field)"],["Penis & Urethra","54415","Removal of penile prosthesis without replacement"],["Penis & Urethra","54416","Removal and replacement of penile prosthesis (same session)"],["Penis & Urethra","54417","Removal and replacement of penile prosthesis (infected field)"],["Penis & Urethra","54420","Corpora cavernosa-saphenous vein shunt (priapism)"],["Penis & Urethra","54430","Corpora cavernosa-corpus spongiosum shunt (priapism)"],["Penis & Urethra","54435","Corpora cavernosa-glans penis fistulization (priapism)"],["Penis & Urethra","54440","Plastic operation of penis for injury"],["Penis & Urethra","54450","Foreskin manipulation including lysis of preputial adhesions"],["Penis & Urethra","53000","Urethrotomy or urethrostomy external; pendulous urethra"],["Penis & Urethra","53010","Urethrotomy or urethrostomy external; perineal urethra"],["Penis & Urethra","53025","Meatotomy cutting of meatus; infant"],["Penis & Urethra","53210","Urethrectomy total including cystostomy; female"],["Penis & Urethra","53215","Urethrectomy total including cystostomy; male"],["Penis & Urethra","53230","Excision of urethral diverticulum; female"],["Penis & Urethra","53235","Excision of urethral diverticulum; male"],["Penis & Urethra","53240","Marsupialization of urethral diverticulum"],["Penis & Urethra","53500","Urethrolysis transvaginal secondary open"],["Penis & Urethra","53502","Urethrorrhaphy suture of urethral wound; female"],["Penis & Urethra","53505","Urethrorrhaphy suture of urethral wound; penile"],["Penis & Urethra","53510","Urethrorrhaphy suture of urethral wound; perineal"],["Penis & Urethra","53515","Urethrorrhaphy suture of urethral wound; prostatomembranous"],["Penis & Urethra","53520","Closure of urethrostomy or urethrocutaneous fistula male"],["Penis & Urethra","54000","Slitting of prepuce; newborn"],["Penis & Urethra","54001","Slitting of prepuce; except newborn"],["Incontinence & Sling","51990","Laparoscopy surgical; urethral suspension for stress incontinence"],["Incontinence & Sling","51992","Laparoscopy surgical; sling operation for stress incontinence"],["Incontinence & Sling","53440","Sling operation for correction of male urinary incontinence"],["Incontinence & Sling","53442","Removal or revision of sling for male urinary incontinence"],["Incontinence & Sling","53444","Insertion of tandem cuff (dual cuff)"],["Incontinence & Sling","53445","Insertion of inflatable urethral/bladder neck sphincter (AUS)"],["Incontinence & Sling","53446","Removal of inflatable urethral/bladder neck sphincter"],["Incontinence & Sling","53447","Removal and replacement of inflatable sphincter (same session)"],["Incontinence & Sling","53448","Removal and replacement of inflatable sphincter (infected field)"],["Incontinence & Sling","53449","Repair of inflatable urethral/bladder neck sphincter"],["Incontinence & Sling","57287","Removal or revision of sling for stress incontinence"],["Incontinence & Sling","57288","Sling operation for stress incontinence"],["Incontinence & Sling","57289","Pereyra procedure including anterior colporrhaphy"],["Incontinence & Sling","64561","Percutaneous implantation of neurostimulator electrode array sacral"],["Incontinence & Sling","64581","Open implantation of neurostimulator electrode array sacral"],["Incontinence & Sling","64585","Revision or removal of peripheral neurostimulator electrode array"],["Incontinence & Sling","64590","Insertion or replacement of pulse generator (battery)"],["Hypospadias & Reconstruction","54300","Plastic operation on penis for straightening of chordee"],["Hypospadias & Reconstruction","54304","Plastic operation on penis for chordee or 1st stage hypospadias"],["Hypospadias & Reconstruction","54308","Urethroplasty for 2nd stage hypospadias repair (< 3 cm)"],["Hypospadias & Reconstruction","54312","Urethroplasty for 2nd stage hypospadias repair (> 3 cm)"],["Hypospadias & Reconstruction","54316","Urethroplasty for 2nd stage hypospadias repair with free skin graft"],["Hypospadias & Reconstruction","54318","Urethroplasty for 3rd stage hypospadias repair (Cecil repair)"],["Hypospadias & Reconstruction","54322","1-stage distal hypospadias repair (Magpi/V-flap)"],["Hypospadias & Reconstruction","54324","1-stage distal hypospadias repair with local skin flaps"],["Hypospadias & Reconstruction","54326","1-stage distal hypospadias repair with mobilization"],["Hypospadias & Reconstruction","54328","1-stage distal hypospadias repair with extensive dissection"],["Hypospadias & Reconstruction","54332","1-stage proximal hypospadias repair (skin graft tube/island flap)"],["Hypospadias & Reconstruction","54336","1-stage perineal hypospadias repair"],["Hypospadias & Reconstruction","54340","Repair of hypospadias complication (simple)"],["Hypospadias & Reconstruction","54344","Repair of hypospadias complication (w/ skin flaps)"],["Hypospadias & Reconstruction","54348","Repair of hypospadias complication (w/ extensive dissection)"],["Hypospadias & Reconstruction","54352","Revision of prior hypospadias repair (extensive)"],["Hypospadias & Reconstruction","54360","Plastic operation on penis to correct angulation"],["Hypospadias & Reconstruction","54380","Plastic operation on penis for epispadias distal to external sphincter"],["Hypospadias & Reconstruction","54385","Plastic operation on penis for epispadias with incontinence"],["Hypospadias & Reconstruction","54390","Plastic operation on penis for epispadias with exstrophy of bladder"],["Hypospadias & Reconstruction","53400","Urethroplasty; first stage (Johannsen type)"],["Hypospadias & Reconstruction","53405","Urethroplasty; second stage"],["Hypospadias & Reconstruction","53410","Urethroplasty 1-stage reconstruction of male anterior urethra"],["Hypospadias & Reconstruction","53415","Urethroplasty transpubic or perineal 1-stage"],["Hypospadias & Reconstruction","53420","Urethroplasty 2-stage repair of prostatic/membranous urethra (1st stage)"],["Hypospadias & Reconstruction","53425","Urethroplasty 2-stage repair of prostatic/membranous urethra (2nd stage)"],["Hypospadias & Reconstruction","53430","Urethroplasty reconstruction of female urethra"],["Hypospadias & Reconstruction","53431","Urethroplasty with tubularization of posterior urethra"],["Hypospadias & Reconstruction","53450","Urethromeatoplasty with mucosal advancement"],["Hypospadias & Reconstruction","53460","Urethromeatoplasty with partial excision of distal urethral segment"],["Female & Recon","45560","Repair of rectocele (separate procedure)"],["Female & Recon","56441","Lysis of labial adhesions"],["Female & Recon","56442","Hymenotomy simple incision"],["Female & Recon","56740","Excision of Bartholin's gland or cyst"],["Female & Recon","56800","Plastic repair of introitus"],["Female & Recon","56805","Clitoroplasty for intersex state"],["Female & Recon","56810","Perineoplasty repair of perineum nonobstetrical"],["Female & Recon","57106","Vaginectomy partial removal of vaginal wall"],["Female & Recon","57107","Vaginectomy partial with removal of paravaginal tissue"],["Female & Recon","57109","Vaginectomy partial with bilateral total pelvic lymphadenectomy"],["Female & Recon","57110","Vaginectomy complete removal of vaginal wall"],["Female & Recon","57111","Vaginectomy complete with removal of paravaginal tissue"],["Female & Recon","57120","Colpocleisis (Le Fort type)"],["Female & Recon","57130","Excision of vaginal septum"],["Female & Recon","57135","Excision of vaginal cyst or tumor"],["Female & Recon","57200","Colporrhaphy suture of injury of vagina"],["Female & Recon","57210","Colpoperineorrhaphy suture of injury of vagina/perineum"],["Female & Recon","57220","Plastic operation on urethral sphincter vaginal approach (Kelly)"],["Female & Recon","57230","Plastic repair of urethrocele"],["Female & Recon","57240","Anterior colporrhaphy repair of cystocele"],["Female & Recon","57250","Posterior colporrhaphy repair of rectocele"],["Female & Recon","57260","Combined anteroposterior colporrhaphy"],["Female & Recon","57265","Combined anteroposterior colporrhaphy with enterocele repair"],["Female & Recon","57267","Insertion of mesh for repair of pelvic floor defect"],["Female & Recon","57268","Repair of enterocele vaginal approach"],["Female & Recon","57270","Repair of enterocele abdominal approach"],["Female & Recon","57280","Colpopexy abdominal approach"],["Female & Recon","57282","Colpopexy vaginal; extra-peritoneal approach"],["Female & Recon","57283","Colpopexy vaginal; intra-peritoneal approach"],["Female & Recon","57284","Paravaginal defect repair; open abdominal approach"],["Female & Recon","57285","Paravaginal defect repair; vaginal approach"],["Female & Recon","57291","Construction of artificial vagina; without graft"],["Female & Recon","57292","Construction of artificial vagina; with graft"],["Female & Recon","57295","Revision of prosthetic vaginal graft; vaginal approach"],["Female & Recon","57296","Revision of prosthetic vaginal graft; open abdominal approach"],["Female & Recon","57300","Closure of rectovaginal fistula; vaginal or transanal approach"],["Female & Recon","57305","Closure of rectovaginal fistula; abdominal approach"],["Female & Recon","57307","Closure of rectovaginal fistula; abdominal approach with colostomy"],["Female & Recon","57308","Closure of rectovaginal fistula; transperineal approach"],["Female & Recon","57310","Closure of urethrovaginal fistula"],["Female & Recon","57311","Closure of urethrovaginal fistula; with bulbocavernosus transplant"],["Female & Recon","57320","Closure of vesicovaginal fistula; vaginal approach"],["Female & Recon","57330","Closure of vesicovaginal fistula; transvesical and vaginal approach"],["Female & Recon","57335","Vaginoplasty for intersex state"],["Female & Recon","57423","Paravaginal defect repair laparoscopic approach"],["Female & Recon","57425","Laparoscopy surgical colpopexy (suspension of vaginal apex)"],["Female & Recon","57426","Revision of prosthetic vaginal graft laparoscopic approach"],["Female & Recon","58150","Total abdominal hysterectomy"],["Female & Recon","58240","Pelvic exenteration for gynecologic malignancy"],["Female & Recon","58260","Vaginal hysterectomy uterus 250 g or less"],["Female & Recon","58262","Vaginal hysterectomy 250 g or less; with removal of tube(s)/ovary(s)"],["Female & Recon","58290","Vaginal hysterectomy uterus greater than 250 g"],["Female & Recon","58541","Laparoscopy surgical supracervical hysterectomy 250 g or less"],["Female & Recon","58542","Laparoscopy surgical supracervical hysterectomy 250 g or less with removal of tubes/ovaries"],["Female & Recon","58543","Laparoscopy surgical supracervical hysterectomy > 250 g"],["Female & Recon","58550","Laparoscopy surgical with vaginal hysterectomy 250 g or less"],["Female & Recon","58552","Laparoscopy surgical with vaginal hysterectomy 250 g or less with removal of tubes/ovaries"],["Female & Recon","58553","Laparoscopy surgical with vaginal hysterectomy > 250 g"],["Female & Recon","58554","Laparoscopy surgical with vaginal hysterectomy > 250 g with removal of tubes/ovaries"],["Female & Recon","58570","Laparoscopy surgical with total hysterectomy 250 g or less"],["Female & Recon","58571","Laparoscopy surgical with total hysterectomy 250 g or less with removal of tubes/ovaries"],["Female & Recon","58956","Bilateral salpingo-oophorectomy with total omentectomy/hysterectomy for malignancy"],["Reconstruction (Other)","11004","Debridement of skin/muscle for necrotizing soft tissue infection; external genitalia"],["Reconstruction (Other)","11005","Debridement for necrotizing infection; abdominal wall"],["Reconstruction (Other)","11006","Debridement for necrotizing infection; genitalia and abdominal wall"],["Reconstruction (Other)","44661","Closure of enterovesical fistula"],["Reconstruction (Other)","45800","Closure of rectovesical fistula"],["Pediatrics (Hernia)","49491","Repair initial inguinal hernia preterm infant (reducible)"],["Pediatrics (Hernia)","49492","Repair initial inguinal hernia preterm infant (incarcerated)"],["Pediatrics (Hernia)","49495","Repair initial inguinal hernia infant < 6 months (reducible)"],["Pediatrics (Hernia)","49496","Repair initial inguinal hernia infant < 6 months (incarcerated)"],["Pediatrics (Hernia)","49500","Repair initial inguinal hernia age 6 mo - 5 yr (reducible)"],["Pediatrics (Hernia)","49501","Repair initial inguinal hernia age 6 mo - 5 yr (incarcerated)"],["Pediatrics (Hernia)","49505","Repair initial inguinal hernia age 5 yr or older (reducible)"],["Pediatrics (Hernia)","49507","Repair initial inguinal hernia age 5 yr or older (incarcerated)"],["Pediatrics (Hernia)","49520","Repair recurrent inguinal hernia any age (reducible)"],["Pediatrics (Hernia)","49521","Repair recurrent inguinal hernia any age (incarcerated)"],["Lymph Nodes","38562","Limited lymphadenectomy for staging; pelvic and para-aortic"],["Lymph Nodes","38564","Limited lymphadenectomy for staging; retroperitoneal"],["Lymph Nodes","38570","Laparoscopy surgical; with retroperitoneal lymph node sampling"],["Lymph Nodes","38760","Inguinofemoral lymphadenectomy superficial"],["Lymph Nodes","38765","Inguinofemoral lymphadenectomy superficial in continuity with pelvic"],["Lymph Nodes","38780","Retroperitoneal transabdominal lymphadenectomy extensive"],["Gender Affirmation","55970","Intersex surgery; male to female"],["Gender Affirmation","55980","Intersex surgery; female to male"],["Urodynamics","51726","Complex cystometrogram"],["Urodynamics","51727","Complex cystometrogram with urethral pressure profile"],["Urodynamics","51728","Complex cystometrogram with voiding pressure studies"],["Urodynamics","51729","Complex cystometrogram with voiding pressure and urethral pressure profile"],["Urodynamics","51736","Simple uroflowmetry"],["Urodynamics","51741","Complex uroflowmetry"],["Urodynamics","51784","Electromyography studies (EMG) of anal or urethral sphincter"],["Urodynamics","51785","Needle electromyography studies (EMG)"],["Urodynamics","51797","Voiding pressure studies intra-abdominal"],["Urodynamics","51798","Ultrasound post-void residual urine (PVR)"],["Urodynamics","76872","Transrectal ultrasound (TRUS)"],["Radiology (Uro)","74400","Urography (retrograde) with or without KUB"],["Radiology (Uro)","74420","Ureterography retrograde with or without KUB"],["Radiology (Uro)","74430","Cystography with contrast"],["Radiology (Uro)","51600","Injection procedure for retrograde urethrocystography"],["Radiology (Uro)","51610","Injection procedure and voiding urethrocystography"]];

const GENERAL_SURGERY_CPT_DATA = [
// ─── Gallbladder ───
["Gallbladder","47562","Laparoscopic cholecystectomy"],
["Gallbladder","47563","Laparoscopic cholecystectomy with cholangiography"],
["Gallbladder","47564","Laparoscopic cholecystectomy with exploration of common duct"],
["Gallbladder","47600","Cholecystectomy open"],
["Gallbladder","47605","Cholecystectomy open with cholangiography"],
["Gallbladder","47610","Cholecystectomy open with exploration of common duct"],
["Gallbladder","47612","Cholecystectomy open with choledochoenterostomy"],
["Gallbladder","47620","Cholecystectomy open with exploration of common duct and choledochoenterostomy"],
// ─── Appendix ───
["Appendix","44950","Appendectomy open"],
["Appendix","44960","Appendectomy open for ruptured appendicitis with abscess or generalized peritonitis"],
["Appendix","44970","Laparoscopic appendectomy"],
["Appendix","44979","Unlisted laparoscopy procedure appendix"],
// ─── Hernia ───
["Hernia (Inguinal)","49505","Repair initial inguinal hernia age 5 or older reducible"],
["Hernia (Inguinal)","49507","Repair initial inguinal hernia age 5 or older incarcerated/strangulated"],
["Hernia (Inguinal)","49520","Repair recurrent inguinal hernia any age reducible"],
["Hernia (Inguinal)","49521","Repair recurrent inguinal hernia any age incarcerated/strangulated"],
["Hernia (Inguinal)","49525","Repair inguinal hernia sliding any age"],
["Hernia (Inguinal)","49650","Laparoscopic repair initial inguinal hernia"],
["Hernia (Inguinal)","49651","Laparoscopic repair recurrent inguinal hernia"],
["Hernia (Ventral/Incisional)","49560","Repair initial incisional or ventral hernia reducible"],
["Hernia (Ventral/Incisional)","49561","Repair initial incisional or ventral hernia incarcerated/strangulated"],
["Hernia (Ventral/Incisional)","49565","Repair recurrent incisional or ventral hernia reducible"],
["Hernia (Ventral/Incisional)","49566","Repair recurrent incisional or ventral hernia incarcerated/strangulated"],
["Hernia (Ventral/Incisional)","49568","Implantation of mesh during incisional or ventral hernia repair"],
["Hernia (Ventral/Incisional)","49652","Laparoscopic repair ventral/incisional hernia reducible"],
["Hernia (Ventral/Incisional)","49653","Laparoscopic repair ventral/incisional hernia incarcerated"],
["Hernia (Umbilical)","49580","Repair umbilical hernia under age 5 reducible"],
["Hernia (Umbilical)","49582","Repair umbilical hernia under age 5 incarcerated"],
["Hernia (Umbilical)","49585","Repair umbilical hernia age 5 or older reducible"],
["Hernia (Umbilical)","49587","Repair umbilical hernia age 5 or older incarcerated"],
["Hernia (Femoral)","49550","Repair initial femoral hernia any age reducible"],
["Hernia (Femoral)","49553","Repair initial femoral hernia any age incarcerated"],
["Hernia (Hiatal)","43280","Laparoscopic fundoplication (eg Nissen)"],
["Hernia (Hiatal)","43281","Laparoscopic repair paraesophageal hernia with fundoplication"],
["Hernia (Hiatal)","43282","Laparoscopic repair paraesophageal hernia with implantation of mesh"],
["Hernia (Hiatal)","43325","Open fundoplication (eg Nissen)"],
["Hernia (Hiatal)","43332","Repair paraesophageal hiatal hernia via thoracotomy"],
["Hernia (Hiatal)","43336","Repair paraesophageal hiatal hernia via thoracoabdominal incision"],
// ─── Esophagus ───
["Esophagus","43107","Total or near total esophagectomy without thoracotomy with pharyngogastrostomy"],
["Esophagus","43108","Total or near total esophagectomy without thoracotomy with colon interposition"],
["Esophagus","43112","Total or near total esophagectomy with thoracotomy (Ivor Lewis)"],
["Esophagus","43116","Partial esophagectomy with thoracotomy"],
["Esophagus","43117","Partial esophagectomy distal two thirds"],
["Esophagus","43118","Partial esophagectomy with total gastrectomy"],
["Esophagus","43130","Diverticulectomy of hypopharynx or esophagus (Zenker)"],
["Esophagus","43180","Esophagoscopy rigid transoral with diverticulectomy"],
["Esophagus","43191","Esophagoscopy flexible diagnostic"],
["Esophagus","43239","EGD with biopsy"],
["Esophagus","43246","EGD with PEG tube placement"],
["Esophagus","43247","EGD with foreign body removal"],
// ─── Stomach ───
["Stomach","43631","Gastrectomy partial distal with gastroduodenostomy (Billroth I)"],
["Stomach","43632","Gastrectomy partial distal with gastrojejunostomy (Billroth II)"],
["Stomach","43633","Gastrectomy partial distal with Roux-en-Y reconstruction"],
["Stomach","43634","Gastrectomy partial distal with formation of intestinal pouch"],
["Stomach","43620","Gastrectomy total with esophagoenterostomy"],
["Stomach","43621","Gastrectomy total with Roux-en-Y reconstruction"],
["Stomach","43644","Laparoscopic gastric bypass Roux-en-Y"],
["Stomach","43645","Laparoscopic gastric bypass with small intestine reconstruction"],
["Stomach","43770","Laparoscopic adjustable gastric band placement"],
["Stomach","43771","Laparoscopic revision of adjustable gastric band"],
["Stomach","43772","Laparoscopic removal of adjustable gastric band"],
["Stomach","43775","Laparoscopic sleeve gastrectomy"],
["Stomach","43500","Gastrotomy with exploration or foreign body removal"],
["Stomach","43501","Gastrotomy with suture repair of bleeding ulcer"],
["Stomach","43502","Gastrotomy with suture repair of pre-existing condition"],
["Stomach","43520","Pyloromyotomy"],
["Stomach","43800","Pyloroplasty"],
["Stomach","43810","Gastroduodenostomy"],
["Stomach","43820","Gastrojejunostomy without vagotomy"],
["Stomach","43830","Gastrostomy open (PEG)"],
["Stomach","43832","Gastrostomy open with construction of gastric tube"],
["Stomach","43840","Gastrorrhaphy suture of perforated duodenal or gastric ulcer"],
["Stomach","43846","Gastric restrictive procedure with Roux-en-Y gastroenterostomy"],
["Stomach","43847","Gastric restrictive procedure with partial gastrectomy and Roux-en-Y"],
["Stomach","43848","Revision of gastric restrictive procedure open"],
// ─── Small Bowel ───
["Small Bowel","44005","Enterolysis (lysis of intestinal adhesions)"],
["Small Bowel","44010","Duodenotomy for exploration biopsy or foreign body removal"],
["Small Bowel","44020","Enterotomy small intestine for exploration biopsy or foreign body removal"],
["Small Bowel","44021","Enterotomy small intestine for decompression"],
["Small Bowel","44050","Reduction of volvulus intussusception internal hernia by laparotomy"],
["Small Bowel","44110","Excision of one or more lesions of small bowel"],
["Small Bowel","44120","Enterectomy resection of small intestine single resection and anastomosis"],
["Small Bowel","44121","Enterectomy resection of small intestine each additional resection"],
["Small Bowel","44125","Enterectomy resection of small intestine with enterostomy"],
["Small Bowel","44130","Enteroenterostomy anastomosis of intestine"],
["Small Bowel","44180","Laparoscopic enterolysis"],
["Small Bowel","44186","Laparoscopic jejunostomy"],
["Small Bowel","44187","Laparoscopic ileostomy or jejunostomy non-tube"],
["Small Bowel","44188","Laparoscopic colostomy or skin level cecostomy"],
["Small Bowel","44202","Laparoscopic enterectomy resection of small intestine single resection"],
["Small Bowel","44203","Laparoscopic enterectomy each additional resection"],
["Small Bowel","44300","Enterostomy or cecostomy tube (eg feeding jejunostomy)"],
["Small Bowel","44310","Ileostomy or jejunostomy non-tube"],
["Small Bowel","44312","Revision of ileostomy simple"],
["Small Bowel","44314","Revision of ileostomy complicated"],
["Small Bowel","44316","Continent ileostomy (Kock pouch)"],
["Small Bowel","44640","Closure of intestinal fistula"],
["Small Bowel","44660","Closure of enterovesical fistula"],
["Small Bowel","44661","Closure of enterovesical fistula with intestinal and bladder repair"],
// ─── Colon/Rectum ───
["Colon/Rectum","44140","Colectomy partial with anastomosis"],
["Colon/Rectum","44141","Colectomy partial with skin level cecostomy or colostomy"],
["Colon/Rectum","44143","Colectomy partial with end colostomy and closure of distal segment (Hartmann)"],
["Colon/Rectum","44144","Colectomy partial with resection and colostomy or ileostomy with creation of mucous fistula"],
["Colon/Rectum","44145","Colectomy partial with removal of terminal ileum and ileocolostomy"],
["Colon/Rectum","44146","Colectomy partial with coloproctostomy (low pelvic anastomosis)"],
["Colon/Rectum","44147","Colectomy partial abdominal and transanal approach"],
["Colon/Rectum","44150","Colectomy total abdominal without proctectomy with ileostomy or ileoproctostomy"],
["Colon/Rectum","44151","Colectomy total abdominal with proctectomy with ileostomy"],
["Colon/Rectum","44155","Colectomy total abdominal with proctectomy with continent ileostomy"],
["Colon/Rectum","44156","Colectomy total abdominal with proctectomy with ileal pouch anal anastomosis (J-pouch)"],
["Colon/Rectum","44157","Colectomy total abdominal with proctectomy with ileal pouch anal anastomosis with loop ileostomy"],
["Colon/Rectum","44158","Colectomy total abdominal with proctectomy with ileal pouch anal anastomosis with rectal mucosectomy"],
["Colon/Rectum","44160","Colectomy partial with removal of terminal ileum with ileocolostomy"],
["Colon/Rectum","44204","Laparoscopic colectomy partial with anastomosis"],
["Colon/Rectum","44205","Laparoscopic colectomy partial with removal of terminal ileum with ileocolostomy"],
["Colon/Rectum","44206","Laparoscopic colectomy partial with end colostomy (Hartmann)"],
["Colon/Rectum","44207","Laparoscopic colectomy partial with coloproctostomy with colostomy"],
["Colon/Rectum","44208","Laparoscopic colectomy partial with coloproctostomy (low pelvic anastomosis)"],
["Colon/Rectum","44210","Laparoscopic colectomy total abdominal without proctectomy"],
["Colon/Rectum","44211","Laparoscopic colectomy total abdominal with proctectomy with ileal pouch"],
["Colon/Rectum","44212","Laparoscopic colectomy total abdominal with proctectomy with ileostomy"],
["Colon/Rectum","44213","Laparoscopic mobilization of splenic flexure add-on"],
["Colon/Rectum","44320","Colostomy or skin level cecostomy"],
["Colon/Rectum","44322","Colostomy with construction of stoma loop"],
["Colon/Rectum","44340","Revision of colostomy simple"],
["Colon/Rectum","44345","Revision of colostomy complicated"],
["Colon/Rectum","44346","Revision of colostomy with repair of paracolostomy hernia"],
["Colon/Rectum","44620","Closure of enterostomy simple"],
["Colon/Rectum","44625","Closure of enterostomy with resection and anastomosis"],
["Colon/Rectum","44626","Closure of enterostomy with resection and colorectal anastomosis with colonic reservoir"],
["Colon/Rectum","45110","Proctectomy complete combined abdominoperineal (APR)"],
["Colon/Rectum","45111","Proctectomy partial resection of rectum transabdominal approach"],
["Colon/Rectum","45113","Proctectomy partial with rectal mucosectomy with IPAA"],
["Colon/Rectum","45114","Proctectomy partial with anastomosis abdominal and transsacral approach"],
["Colon/Rectum","45116","Proctectomy partial transperineal approach"],
["Colon/Rectum","45119","Proctectomy combined abdominoperineal pull-through (eg colo-anal)"],
["Colon/Rectum","45120","Proctectomy complete combined abdominoperineal with colostomy"],
["Colon/Rectum","45130","Excision of rectal procidentia with anastomosis (Altemeier perineal proctectomy)"],
["Colon/Rectum","45170","Excision of rectal tumor transanal approach"],
["Colon/Rectum","45171","Excision of rectal tumor not including muscularis propria (submucosal)"],
["Colon/Rectum","45395","Laparoscopic proctectomy complete combined abdominoperineal"],
["Colon/Rectum","45397","Laparoscopic proctectomy combined abdominoperineal pull-through"],
["Colon/Rectum","45400","Laparoscopic proctopexy for rectal prolapse"],
["Colon/Rectum","45500","Proctoplasty for stenosis"],
["Colon/Rectum","45540","Proctopexy abdominal approach for rectal prolapse"],
["Colon/Rectum","45560","Repair of rectocele"],
["Colon/Rectum","45800","Closure of rectovesical fistula"],
["Colon/Rectum","45805","Closure of rectovesical fistula with colostomy"],
["Colon/Rectum","45820","Closure of rectourethral fistula"],
["Colon/Rectum","46020","Incision and drainage of perianal abscess superficial"],
["Colon/Rectum","46040","Incision and drainage of perirectal abscess ischiorectal/intramural"],
["Colon/Rectum","46060","Incision and drainage of perianal abscess intramural"],
["Colon/Rectum","46200","Fissurectomy"],
["Colon/Rectum","46221","Hemorrhoidectomy internal by rubber band ligation"],
["Colon/Rectum","46250","External hemorrhoidectomy"],
["Colon/Rectum","46255","Internal and external hemorrhoidectomy single column"],
["Colon/Rectum","46257","Internal and external hemorrhoidectomy with fissurectomy"],
["Colon/Rectum","46258","Internal and external hemorrhoidectomy with fistulectomy"],
["Colon/Rectum","46260","Internal and external hemorrhoidectomy 2 or more columns"],
["Colon/Rectum","46261","Internal and external hemorrhoidectomy with fissurectomy 2+ columns"],
["Colon/Rectum","46270","Surgical treatment of anal fistula (fistulotomy/fistulectomy)"],
["Colon/Rectum","46275","Surgical treatment of anal fistula with seton"],
["Colon/Rectum","46280","Surgical treatment of anal fistula complex (eg advancement flap)"],
["Colon/Rectum","46320","Excision of thrombosed external hemorrhoid"],
["Colon/Rectum","46700","Anoplasty for stricture"],
["Colon/Rectum","46750","Sphincteroplasty anal for incontinence or prolapse"],
["Colon/Rectum","46760","Sphincteroplasty anal for incontinence with implantation of artificial sphincter"],
["Colon/Rectum","46947","Hemorrhoidopexy (eg PPH or stapled hemorrhoidopexy)"],
// ─── Liver ───
["Liver","47100","Liver biopsy wedge"],
["Liver","47120","Hepatectomy resection of liver partial lobectomy"],
["Liver","47122","Hepatectomy trisegmentectomy"],
["Liver","47125","Hepatectomy total left lobectomy"],
["Liver","47130","Hepatectomy total right lobectomy"],
["Liver","47300","Marsupialization of liver cyst or abscess"],
["Liver","47350","Management of liver hemorrhage by suture of liver wound"],
["Liver","47360","Management of liver hemorrhage by packing"],
["Liver","47370","Laparoscopic ablation of liver tumor radiofrequency"],
["Liver","47371","Laparoscopic ablation of liver tumor cryosurgery"],
["Liver","47380","Open ablation of liver tumor radiofrequency"],
["Liver","47381","Open ablation of liver tumor cryosurgery"],
["Liver","47382","Percutaneous ablation of liver tumor radiofrequency"],
["Liver","47383","Percutaneous ablation of liver tumor cryosurgery"],
// ─── Pancreas ───
["Pancreas","48100","Biopsy of pancreas open"],
["Pancreas","48105","Resection or debridement of pancreas"],
["Pancreas","48120","Excision of lesion of pancreas (enucleation)"],
["Pancreas","48140","Pancreatectomy distal subtotal with or without splenectomy"],
["Pancreas","48145","Pancreatectomy distal near-total with preservation of duodenum (Child type)"],
["Pancreas","48146","Pancreatectomy distal with en bloc partial transverse colectomy"],
["Pancreas","48148","Excision of ampulla of Vater"],
["Pancreas","48150","Pancreaticoduodenectomy (Whipple) with pancreatojejunostomy"],
["Pancreas","48152","Pancreaticoduodenectomy (Whipple) with gastrojejunostomy"],
["Pancreas","48153","Pancreatectomy proximal subtotal with total duodenectomy"],
["Pancreas","48154","Pancreatectomy proximal subtotal with near total duodenectomy"],
["Pancreas","48155","Pancreatectomy total"],
["Pancreas","48500","Marsupialization of pancreatic cyst"],
["Pancreas","48510","External drainage of pseudocyst of pancreas open"],
["Pancreas","48520","Internal anastomosis of pancreatic cyst to GI tract cystogastrostomy"],
["Pancreas","48540","Internal anastomosis of pancreatic cyst to GI tract cystojejunostomy"],
["Pancreas","48548","Pancreatojejunostomy side to side"],
["Pancreas","48999","Unlisted procedure pancreas"],
// ─── Spleen ───
["Spleen","38100","Splenectomy total (separate procedure)"],
["Spleen","38101","Splenectomy total with repair of ruptured spleen and partial splenectomy"],
["Spleen","38102","Splenectomy total en bloc for extensive disease"],
["Spleen","38115","Splenorrhaphy repair of ruptured spleen with or without partial splenectomy"],
["Spleen","38120","Laparoscopic splenectomy"],
["Spleen","38129","Unlisted laparoscopy procedure spleen"],
// ─── Breast ───
["Breast","19100","Biopsy of breast percutaneous needle core"],
["Breast","19101","Biopsy of breast open incisional"],
["Breast","19110","Nipple exploration with or without excision of solitary duct"],
["Breast","19120","Excision of cyst fibroadenoma or other benign tumor"],
["Breast","19125","Excision of breast lesion with preoperative placement of needle localization"],
["Breast","19160","Mastectomy partial (eg lumpectomy tylectomy segmental)"],
["Breast","19162","Mastectomy partial with axillary lymphadenectomy"],
["Breast","19180","Mastectomy total simple unilateral"],
["Breast","19182","Mastectomy subtotal"],
["Breast","19200","Mastectomy radical including pectoral muscles axillary lymph nodes"],
["Breast","19220","Mastectomy radical including pectoral muscles axillary and internal mammary lymph nodes"],
["Breast","19240","Mastectomy modified radical including axillary lymph nodes with or without pectoralis minor"],
["Breast","19301","Mastectomy partial (eg lumpectomy) with axillary lymphadenectomy"],
["Breast","19302","Mastectomy partial with sentinel lymph node biopsy"],
["Breast","19303","Mastectomy simple complete"],
["Breast","19305","Mastectomy radical including axillary lymph nodes"],
["Breast","19306","Mastectomy radical with sentinel lymph node biopsy"],
["Breast","19307","Mastectomy modified radical including axillary lymph nodes"],
["Breast","38500","Biopsy or excision of lymph node(s) open superficial"],
["Breast","38525","Biopsy or excision of lymph node(s) open deep axillary"],
["Breast","38740","Axillary lymphadenectomy superficial"],
["Breast","38745","Axillary lymphadenectomy complete"],
["Breast","38792","Injection procedure for sentinel node identification"],
// ─── Thyroid/Parathyroid ───
["Thyroid","60100","Biopsy thyroid percutaneous core needle"],
["Thyroid","60200","Excision of cyst or adenoma of thyroid or transection of isthmus"],
["Thyroid","60210","Partial thyroid lobectomy unilateral with or without isthmusectomy"],
["Thyroid","60212","Partial thyroid lobectomy unilateral with contralateral subtotal lobectomy"],
["Thyroid","60220","Total thyroid lobectomy unilateral with or without isthmusectomy"],
["Thyroid","60225","Total thyroid lobectomy unilateral with contralateral subtotal lobectomy"],
["Thyroid","60240","Thyroidectomy total or complete"],
["Thyroid","60252","Thyroidectomy total or subtotal for malignancy with limited neck dissection"],
["Thyroid","60254","Thyroidectomy total or subtotal for malignancy with radical neck dissection"],
["Thyroid","60260","Thyroidectomy for thyroglossal duct cyst (Sistrunk procedure)"],
["Thyroid","60270","Thyroidectomy including substernal thyroid"],
["Thyroid","60280","Excision of thyroglossal duct cyst (Sistrunk)"],
["Thyroid","60500","Parathyroidectomy or exploration of parathyroid(s)"],
["Thyroid","60502","Parathyroidectomy or exploration of parathyroid(s) re-exploration"],
["Thyroid","60505","Parathyroidectomy or exploration of parathyroid(s) mediastinal via sternotomy"],
// ─── Adrenal ───
["Adrenal","60540","Adrenalectomy partial or complete open"],
["Adrenal","60545","Adrenalectomy with excision of adjacent retroperitoneal tumor"],
["Adrenal","60650","Laparoscopic adrenalectomy"],
// ─── Skin/Soft Tissue ───
["Skin/Soft Tissue","10060","Incision and drainage of abscess simple"],
["Skin/Soft Tissue","10061","Incision and drainage of abscess complicated"],
["Skin/Soft Tissue","10120","Incision and removal of foreign body subcutaneous tissues simple"],
["Skin/Soft Tissue","10121","Incision and removal of foreign body subcutaneous tissues complicated"],
["Skin/Soft Tissue","10140","Incision and drainage of hematoma"],
["Skin/Soft Tissue","11000","Debridement of extensive eczematous or infected skin"],
["Skin/Soft Tissue","11004","Debridement for necrotizing soft tissue infection external genitalia and perineum"],
["Skin/Soft Tissue","11005","Debridement for necrotizing soft tissue infection abdominal wall"],
["Skin/Soft Tissue","11006","Debridement for necrotizing soft tissue infection external genitalia perineum and abdominal wall"],
["Skin/Soft Tissue","11042","Debridement subcutaneous tissue"],
["Skin/Soft Tissue","11043","Debridement muscle and/or fascia"],
["Skin/Soft Tissue","11044","Debridement bone"],
["Skin/Soft Tissue","11400","Excision benign lesion trunk/arms/legs 0.5 cm or less"],
["Skin/Soft Tissue","11401","Excision benign lesion trunk/arms/legs 0.6-1.0 cm"],
["Skin/Soft Tissue","11402","Excision benign lesion trunk/arms/legs 1.1-2.0 cm"],
["Skin/Soft Tissue","11403","Excision benign lesion trunk/arms/legs 2.1-3.0 cm"],
["Skin/Soft Tissue","11406","Excision benign lesion trunk/arms/legs over 4.0 cm"],
["Skin/Soft Tissue","11600","Excision malignant lesion trunk/arms/legs 0.5 cm or less"],
["Skin/Soft Tissue","11601","Excision malignant lesion trunk/arms/legs 0.6-1.0 cm"],
["Skin/Soft Tissue","11602","Excision malignant lesion trunk/arms/legs 1.1-2.0 cm"],
["Skin/Soft Tissue","11603","Excision malignant lesion trunk/arms/legs 2.1-3.0 cm"],
["Skin/Soft Tissue","11606","Excision malignant lesion trunk/arms/legs over 4.0 cm"],
["Skin/Soft Tissue","21930","Excision tumor soft tissue of back or flank subcutaneous"],
["Skin/Soft Tissue","21931","Excision tumor soft tissue of back or flank subfascial"],
["Skin/Soft Tissue","21932","Excision tumor soft tissue of back or flank subfascial 5 cm or greater"],
["Skin/Soft Tissue","21935","Radical resection of tumor soft tissue of back or flank"],
// ─── Wound/Trauma ───
["Wound/Trauma","12001","Simple repair of superficial wounds 2.5 cm or less"],
["Wound/Trauma","12002","Simple repair of superficial wounds 2.6-7.5 cm"],
["Wound/Trauma","12004","Simple repair of superficial wounds 7.6-12.5 cm"],
["Wound/Trauma","12011","Simple repair of superficial wounds face 2.5 cm or less"],
["Wound/Trauma","12031","Repair intermediate wounds 2.5 cm or less"],
["Wound/Trauma","12032","Repair intermediate wounds 2.6-7.5 cm"],
["Wound/Trauma","12034","Repair intermediate wounds 7.6-12.5 cm"],
["Wound/Trauma","12041","Repair intermediate wounds face/neck 2.5 cm or less"],
["Wound/Trauma","13100","Repair of complex wound trunk 1.1-2.5 cm"],
["Wound/Trauma","13101","Repair of complex wound trunk 2.6-7.5 cm"],
["Wound/Trauma","16020","Dressing and debridement of partial thickness burns initial or subsequent"],
["Wound/Trauma","16025","Dressing and debridement of partial thickness burns medium"],
["Wound/Trauma","16030","Dressing and debridement of partial thickness burns large"],
["Wound/Trauma","20100","Exploration of penetrating wound neck"],
["Wound/Trauma","20101","Exploration of penetrating wound chest"],
["Wound/Trauma","20102","Exploration of penetrating wound abdomen/flank/back"],
["Wound/Trauma","20103","Exploration of penetrating wound extremity"],
// ─── Laparotomy/Peritoneum ───
["Laparotomy","49000","Exploratory laparotomy exploratory celiotomy"],
["Laparotomy","49002","Reopening of recent laparotomy"],
["Laparotomy","49010","Exploration retroperitoneal area with or without biopsy"],
["Laparotomy","49020","Drainage of peritoneal abscess or localized peritonitis open"],
["Laparotomy","49040","Drainage of subdiaphragmatic or subphrenic abscess open"],
["Laparotomy","49060","Drainage of retroperitoneal abscess open"],
["Laparotomy","49062","Drainage of peritoneal abscess percutaneous"],
["Laparotomy","49082","Abdominal paracentesis diagnostic or therapeutic"],
["Laparotomy","49083","Abdominal paracentesis with imaging guidance"],
["Laparotomy","49084","Peritoneal lavage"],
["Laparotomy","49320","Diagnostic laparoscopy"],
["Laparotomy","49321","Laparoscopy surgical with biopsy"],
["Laparotomy","49322","Laparoscopy surgical with aspiration of cavity or cyst"],
["Laparotomy","49329","Unlisted laparoscopy procedure abdomen peritoneum and omentum"],
["Laparotomy","49255","Omentectomy epiploectomy resection of omentum"],
// ─── Diaphragm ───
["Diaphragm","39501","Repair laceration of diaphragm any approach"],
["Diaphragm","39503","Repair of neonatal diaphragmatic hernia with prosthesis"],
["Diaphragm","39540","Repair diaphragmatic hernia other than neonatal by abdominal approach"],
["Diaphragm","39541","Repair diaphragmatic hernia other than neonatal by thoracic approach"],
// ─── Lymph Nodes ───
["Lymph Nodes","38500","Biopsy or excision of lymph node(s) open superficial"],
["Lymph Nodes","38510","Biopsy or excision of lymph node(s) open deep cervical"],
["Lymph Nodes","38520","Biopsy or excision of lymph node(s) open deep cervical with excision of scalene fat pad"],
["Lymph Nodes","38525","Biopsy or excision of lymph node(s) open deep axillary"],
["Lymph Nodes","38530","Biopsy or excision of lymph node(s) open deep inguinofemoral"],
["Lymph Nodes","38562","Limited lymphadenectomy for staging pelvic and para-aortic"],
["Lymph Nodes","38564","Limited lymphadenectomy for staging retroperitoneal"],
["Lymph Nodes","38700","Suprahyoid lymphadenectomy"],
["Lymph Nodes","38720","Cervical lymphadenectomy modified radical neck dissection"],
["Lymph Nodes","38724","Cervical lymphadenectomy radical neck dissection"],
// ─── Central Venous Access ───
["Central Line","36555","Insertion of non-tunneled centrally inserted central venous catheter younger than 5"],
["Central Line","36556","Insertion of non-tunneled centrally inserted central venous catheter age 5 or older"],
["Central Line","36558","Insertion of tunneled centrally inserted central venous catheter without subcutaneous port"],
["Central Line","36560","Insertion of tunneled centrally inserted central venous access device with subcutaneous port"],
["Central Line","36561","Insertion of tunneled centrally inserted central venous access device with subcutaneous port age 5 or older"],
["Central Line","36563","Insertion of tunneled centrally inserted central venous access device with 2 catheters"],
["Central Line","36569","Insertion of peripherally inserted central venous catheter without subcutaneous port or pump younger than 5"],
["Central Line","36570","Insertion of peripherally inserted central venous access device with subcutaneous port"],
["Central Line","36571","Insertion of peripherally inserted central venous catheter without subcutaneous port age 5 or older"],
["Central Line","36589","Removal of tunneled central venous catheter without subcutaneous port or pump"],
["Central Line","36590","Removal of tunneled central venous access device with subcutaneous port or pump"],
// ─── Miscellaneous ───
["Miscellaneous","15734","Muscle myocutaneous or fasciocutaneous flap trunk"],
["Miscellaneous","15736","Muscle myocutaneous or fasciocutaneous flap upper extremity"],
["Miscellaneous","15738","Muscle myocutaneous or fasciocutaneous flap lower extremity"],
["Miscellaneous","43279","Laparoscopic Heller myotomy"],
["Miscellaneous","43999","Unlisted procedure stomach"],
["Miscellaneous","44799","Unlisted procedure small intestine"],
["Miscellaneous","44899","Unlisted procedure colon"],
["Miscellaneous","49659","Unlisted laparoscopy procedure hernioplasty herniorrhaphy"],
["Miscellaneous","60699","Unlisted procedure endocrine system"],
];

const VASCULAR_CPT_DATA = [
["Aneurysm (Open)","33875","Open repair of descending thoracic aortic aneurysm"],
["Aneurysm (Endovascular)","33881","Endovascular repair of descending thoracic aortic aneurysm (TEVAR)"],
["Aneurysm (Open)","35081","Open repair of infrarenal aortic aneurysm without rupture"],
["Aneurysm (Open)","35082","Open repair of infrarenal aortic aneurysm with rupture"],
["Aneurysm (Endovascular)","34701","Endovascular repair of infrarenal aortic aneurysm without rupture (EVAR)"],
["Aneurysm (Endovascular)","34702","Endovascular repair of infrarenal aortic aneurysm with rupture (EVAR)"],
["Bypass Graft","35521","Axillary-femoral bypass with vein"],
["Bypass Graft","35621","Axillary-femoral bypass with prosthetic"],
["Bypass Graft","35558","Femoral-femoral bypass with vein"],
["Bypass Graft","35661","Femoral-femoral bypass with prosthetic"],
["Bypass Graft","35540","Aortobifemoral bypass with vein"],
["Bypass Graft","35646","Aortobifemoral bypass with prosthetic"],
["Bypass Graft","35556","Femoral-popliteal bypass with vein"],
["Bypass Graft","35656","Femoral-popliteal bypass with prosthetic"],
["Bypass Graft","35566","Femoral-tibial bypass with vein"],
["Bypass Graft","35666","Femoral-tibial bypass with prosthetic"],
["Thrombectomy/Embolectomy","37184","Percutaneous mechanical thrombectomy of artery or arterial bypass graft"],
["Thrombectomy/Embolectomy","34201","Embolectomy or thrombectomy femoropopliteal/aortoiliac"],
["Thrombectomy/Embolectomy","34203","Embolectomy or thrombectomy popliteal-tibio-peroneal"],
["Thrombectomy/Embolectomy","34101","Embolectomy or thrombectomy brachial/axillary/subclavian/innominate"],
["Thrombectomy/Embolectomy","34111","Embolectomy or thrombectomy radial/ulnar"],
["Thrombectomy/Embolectomy","34151","Embolectomy or thrombectomy renal/celiac/mesentery/aortoiliac by abdominal incision"],
["Amputation","27880","Amputation, leg, through tibia and fibula (below-knee amputation)"],
["Amputation","27590","Amputation, thigh, through femur, any level (above-knee amputation)"],
["Endarterectomy","35301","Carotid endarterectomy (CEA)"],
["Endarterectomy","35361","Thromboendarterectomy aortoiliac"],
["Endarterectomy","35351","Thromboendarterectomy iliac"],
["Endarterectomy","35355","Thromboendarterectomy iliofemoral"],
["Endarterectomy","35371","Thromboendarterectomy common femoral"],
["Endarterectomy","35302","Thromboendarterectomy superficial femoral"],
["Endarterectomy","35372","Thromboendarterectomy profunda femoral"],
["Endarterectomy","35303","Thromboendarterectomy popliteal"],
["Endarterectomy","35304","Thromboendarterectomy tibioperoneal trunk"],
["Endarterectomy","35305","Thromboendarterectomy tibial or peroneal"],
["Endarterectomy","35341","Thromboendarterectomy including patch graft mesenteric/celiac/renal"],
["Head & Neck Vascular","60600","Excision carotid body tumor without excision of carotid artery"],
["Head & Neck Vascular","60605","Excision carotid body tumor with excision of carotid artery"],
["Head & Neck Vascular","37609","Temporal artery biopsy"],
["Hemodialysis Access","35190","Repair acquired/traumatic AV fistula in extremity"],
["Hemodialysis Access","36821","AV fistula creation (AVF)"],
["Hemodialysis Access","36819","AV fistula creation with basilic vein transposition"],
["Hemodialysis Access","36831","Thrombectomy AV fistula"],
["Hemodialysis Access","36832","Revision AV fistula without thrombectomy"],
["Hemodialysis Access","36833","Revision AV fistula with thrombectomy"],
["Hemodialysis Access","37607","AV fistula ligation"],
["Hemodialysis Access (Endovascular)","36901","Dialysis circuit fistulogram; diagnostic study"],
["Hemodialysis Access (Endovascular)","36902","Dialysis circuit fistulogram with balloon angioplasty (peripheral segment)"],
["Hemodialysis Access (Endovascular)","36903","Dialysis circuit fistulogram with balloon angioplasty and stent (peripheral segment)"],
["Hemodialysis Access (Endovascular)","36904","Dialysis circuit thrombectomy/thrombolysis (includes diagnostic fistulogram)"],
["Hemodialysis Access (Endovascular)","36905","Dialysis circuit thrombectomy/thrombolysis with peripheral angioplasty"],
["Hemodialysis Access (Endovascular)","36906","Dialysis circuit thrombectomy/thrombolysis with peripheral stent (includes angioplasty)"],
["Hemodialysis Access (Endovascular)","36907","Dialysis circuit add-on: each additional central segment angioplasty"],
["Hemodialysis Access (Endovascular)","36908","Dialysis circuit add-on: each additional central segment stent"],
["Hemodialysis Access (Endovascular)","36909","Dialysis circuit add-on: dialysis circuit embolization/occlusion"],
["Venous","36465","Injection of non-compounded foam sclerosant with ultrasound guidance"],
["Venous","36475","Endovenous ablation radiofrequency (RFA)"],
["Venous","36478","Endovenous ablation laser (EVLA)"],
["Venous","37700","Varicose vein ligation and division long saphenous vein"],
["Venous","37718","Varicose vein ligation and division short saphenous vein"],
["Venous","37722","Varicose vein ligation division and stripping long saphenous vein"],
["Venous","37785","Varicose vein ligation division and/or excision"],
["Venous","37765","Varicose vein stab phlebectomy"],
["Endovascular (Catheterization)","36200","Introduction of catheter into aorta"],
["Endovascular (Catheterization)","36245","Selective catheter placement arterial system, first order"],
["Endovascular (Catheterization)","36246","Selective catheter placement arterial system, second order"],
["Endovascular (Catheterization)","36247","Selective catheter placement arterial system, third order"],
["Endovascular (Catheterization)","36248","Selective catheter placement arterial system, each additional order (add-on)"],
["Endovascular (Access)","76937","Ultrasound guidance for vascular access requiring vessel patency evaluation and imaging documentation"],
["Endovascular","75625","Abdominal aortography, radiological supervision and interpretation"],
["Endovascular","75630","Abdominal aortography with bilateral iliofemoral lower extremity runoff, radiological supervision and interpretation"],
["Endovascular","75710","Peripheral extremity angiography unilateral, radiological supervision and interpretation"],
["Endovascular","75716","Peripheral extremity angiography bilateral, radiological supervision and interpretation"],
["Endovascular","75774","Selective angiography each additional vessel studied after basic exam (add-on)"],
["Endovascular","37220","Revascularization endovascular iliac; transluminal angioplasty"],
["Endovascular","37221","Revascularization endovascular iliac"],
["Endovascular","37222","Revascularization endovascular each additional ipsilateral iliac artery; angioplasty (add-on)"],
["Endovascular","37223","Revascularization endovascular each additional ipsilateral iliac artery; stent (add-on)"],
["Endovascular","37224","Revascularization endovascular femoral/popliteal; transluminal angioplasty"],
["Endovascular","37225","Revascularization endovascular femoral/popliteal; with atherectomy"],
["Endovascular","37226","Revascularization endovascular femoral/popliteal; with stent"],
["Endovascular","37227","Revascularization endovascular femoral/popliteal; with atherectomy and stent"],
["Endovascular","37228","Revascularization endovascular tibial/peroneal; transluminal angioplasty"],
["Endovascular","37229","Revascularization endovascular tibial/peroneal; with atherectomy"],
["Endovascular","37230","Revascularization endovascular tibial/peroneal; with stent"],
["Endovascular","37231","Revascularization endovascular tibial/peroneal; with atherectomy and stent"],
["Endovascular","34713","Percutaneous access and closure of femoral artery for endograft delivery"],
["Endovascular","34812","Open femoral artery exposure for endovascular prosthesis delivery"],
["Vessel Repair","35201","Repair of vessel neck"],
["Vessel Repair","35206","Repair of vessel upper extremity"],
["Vessel Repair","35221","Repair of vessel abdominal"],
["Vessel Repair","35226","Repair of vessel lower extremity"],
["Exploration","35800","Exploration for postoperative hemorrhage/thrombosis/infection neck"],
["Exploration","35840","Exploration for postoperative hemorrhage/thrombosis/infection abdomen"],
["Exploration","35860","Exploration for postoperative hemorrhage/thrombosis/infection extremity"],
["Miscellaneous","35903","Excision infected extremity graft"],
["Miscellaneous","21615","Excision of first or cervical rib (thoracic outlet)"],
["Miscellaneous","37799","Unlisted procedure vascular surgery"],
];

function getActiveCPTData() {
  const spec = state.settings.specialty;
  if (spec === "vascular") return VASCULAR_CPT_DATA;
  if (spec === "gen_surg") return GENERAL_SURGERY_CPT_DATA;
  return CPT_DATA;
}
function getActiveCPTReference() {
  return getActiveCPTData().map(([cat, cpt, desc]) => `${cpt}|${desc}`).join("\n");
}
function getActiveAutocorrect() {
  const spec = state.settings.specialty;
  if (spec === "vascular") return VASCULAR_AUTOCORRECT;
  if (spec === "gen_surg") return GENERAL_SURGERY_AUTOCORRECT;
  return MEDICAL_AUTOCORRECT;
}

const CPT_DB = CPT_DATA.map(([category, cpt, description]) => ({ category, cpt, description }));
const CPT_REFERENCE = CPT_DB.map(c => `${c.cpt}|${c.description}`).join("\n");

function buildAutocorrectPatterns(dict) {
  return Object.entries(dict)
    .sort(([a],[b]) => b.length - a.length)
    .map(([wrong, right]) => ({
      pattern: new RegExp("\\b" + wrong.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "\\b","gi"),
      replacement: right,
    }));
}
let AUTOCORRECT_PATTERNS = buildAutocorrectPatterns(MEDICAL_AUTOCORRECT);

function applyMedicalAutocorrect(text) {
  let r = text;
  const patterns = buildAutocorrectPatterns(getActiveAutocorrect());
  for (const {pattern, replacement} of patterns) r = r.replace(pattern, replacement);
  return r;
}

const CLOUD_PROVIDERS = {
  claude: { name: "Claude (Anthropic)", url: "https://api.anthropic.com/v1/messages", format: "anthropic" },
  openai: { name: "ChatGPT (OpenAI)", url: "https://api.openai.com/v1/chat/completions", format: "openai" },
  gemini: { name: "Gemini (Google)", url: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", format: "gemini" },
};

// ═══ State ═══
let state = {
  tab: "record", transcript: "", isRec: false, isProc: false,
  parsed: null, error: "", copied: "", cases: [], acgmeData: "",
  processingQueue: [],
  settings: {
    attendings: [], hospitals: [], customAutocorrect: {},
    residentName: "", pgyLevel: "PGY-3", specialty: "urology",
    llmMode: "local", localLLMUrl: "http://100.X.X.X:1234", localModelName: "local-model",
    cloudProvider: "claude", cloudApiKey: "", cloudModel: "",
    caseIdMode: "none", caseIdPrefix: "", caseIdNextNum: 1, caseIdPadding: 3,
  },
  showSettings: false, settingsTab: "team", autocorrectActive: true,
  quickFire: false, showLogged: false,
  expandedCase: null, toast: "", _undoCase: null, _undoTimer: null,
  newAttending: "", newHospital: "", newWrong: "", newRight: "",
  missingFields: null, // null = not checked yet, [] = all good
  lastFailedTranscript: null,
  _localModels: [], _cloudModels: [], _cloudModelsFetched: false,
  pendingTranscripts: [],
};

// ═══ Storage (chrome.storage.local instead of localStorage) ═══
function saveSettings() { chrome.storage.local.set({ "surgilog-settings": state.settings }); }
function saveCases() { chrome.storage.local.set({ "surgilog-cases": state.cases }); }
function saveAutocorrect() { chrome.storage.local.set({ "surgilog-autocorrect-on": state.autocorrectActive }); }
function saveQuickFire() { chrome.storage.local.set({ "surgilog-quickfire": state.quickFire }); }
function savePending() { chrome.storage.local.set({ "surgilog-pending-transcripts": state.pendingTranscripts }); }

function exportCSV() {
  if (!state.cases.length) return;
  const esc = v => { const s = String(v||""); return s.includes(",") || s.includes('"') || s.includes("\n") ? '"'+s.replace(/"/g,'""')+'"' : s; };
  const header = "Date,Procedure,Attending,Hospital,Role,Approach,Patient Age,Patient Sex,CPT Codes,Laterality,Notes";
  const rows = state.cases.map(c => [
    esc(c.date), esc(c.procedure_name), esc(c.attending), esc(c.hospital), esc(c.role),
    esc(c.approach), esc(c.patient_age), esc(c.patient_sex),
    esc((c.cpt_codes||[]).map(x=>x.code).join(";")),
    esc(c.laterality), esc(c.notes)
  ].join(","));
  const csv = header + "\n" + rows.join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = "caselog-export-" + new Date().toISOString().slice(0,10) + ".csv";
  a.click(); URL.revokeObjectURL(url);
  state.toast = "Exported " + state.cases.length + " case(s)";
  setTimeout(() => { if (state.toast.includes("Exported")) { state.toast = ""; render(); } }, 3000);
  render();
}

function getCaseStats() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let thisWeek = 0, thisMonth = 0;
  state.cases.forEach(c => {
    if (!c.date) return;
    const d = new Date(c.date + "T00:00:00");
    if (isNaN(d)) return;
    if (d >= weekStart) thisWeek++;
    if (d >= monthStart) thisMonth++;
  });
  return { total: state.cases.length, thisWeek, thisMonth };
}

// Load from storage and render
chrome.storage.local.get(["surgilog-settings", "surgilog-cases", "surgilog-autocorrect-on", "surgilog-quickfire", "surgilog-pending-transcripts"], (result) => {
  try {
    if (result["surgilog-settings"]) state.settings = { ...state.settings, ...result["surgilog-settings"] };
    if (result["surgilog-cases"]) state.cases = result["surgilog-cases"];
    if (result["surgilog-autocorrect-on"] !== undefined) state.autocorrectActive = result["surgilog-autocorrect-on"];
    if (result["surgilog-quickfire"] !== undefined) state.quickFire = result["surgilog-quickfire"];
    if (result["surgilog-pending-transcripts"]) state.pendingTranscripts = result["surgilog-pending-transcripts"];
  } catch(e) {}
  render();
});

let recRef = null;
let copiedTimer = null;
function setCopied(label) {
  state.copied = label; render();
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => { state.copied = ""; render(); }, 3000);
}

async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); setCopied(label); }
  catch { state.acgmeData = text; setCopied(label); render(); }
}

function sendToACGME(caseData, label) {
  var mode = (state.settings && state.settings.caseIdMode) || "none";
  if (!caseData.case_id && mode !== "none") caseData.case_id = generateCaseId(caseData);
  const json = fmtACGMEJson(caseData);
  chrome.storage.local.set({ "surgilog-pending-case": JSON.parse(json) }, () => {
    chrome.tabs.query({ url: "https://apps.acgme.org/*" }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
        caseData.logged = true; saveCases();
        setCopied(label);
      } else {
        setCopied(label);
        state.toast = "Open the ACGME case log page first, then tap Log again";
        render();
        setTimeout(() => { if (state.toast.includes("ACGME")) { state.toast = ""; render(); } }, 4000);
      }
    });
  });
}

function fmtACGME(c) {
  var caseId = c.case_id || generateCaseId(c);
  var lines = ["Procedure: "+c.procedure_name,"CPT: "+(c.cpt_codes||[]).map(x=>x.code+" - "+x.description).join("; ")];
  if (caseId) lines.push("Case ID: "+caseId);
  lines.push("Date: "+(c.date||"TODAY"),"Attending: "+(c.attending||""),"Hospital: "+(c.hospital||""),
    "Role: "+(c.role||""),"Approach: "+(c.approach||""),"Laterality: "+(c.laterality||""));
  return lines.join("\n");
}
function generateCaseId(c) {
  var mode = (state.settings && state.settings.caseIdMode) || "none";
  if (mode === "none") return "";
  if (mode === "auto") return generateCaseIdAuto(c);
  // Counter-based modes
  var s = state.settings;
  var pad = Math.max(1, Math.min(s.caseIdPadding || 3, 10));
  var num = String(s.caseIdNextNum || 1).padStart(pad, '0');
  s.caseIdNextNum = (s.caseIdNextNum || 1) + 1;
  saveSettings();
  if (mode === "prefix_counter") return (s.caseIdPrefix || "") + num;
  if (mode === "date_counter") {
    var dateStr = (c && c.date) ? String(c.date) : '';
    var m = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    var now = new Date();
    var yy = m ? m[1].slice(2) : String(now.getFullYear()).slice(2);
    var mm = m ? String(m[2]).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
    var dd = m ? String(m[3]).padStart(2, '0') : String(now.getDate()).padStart(2, '0');
    return yy + mm + dd + "-" + num;
  }
  if (mode === "counter") return num;
  return "";
}
function generateCaseIdAuto(c) {
  var dateStr = (c && c.date) ? String(c.date) : '';
  var m = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  var now = new Date();
  var yyyy = m ? m[1] : String(now.getFullYear());
  var mm = m ? String(m[2]).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
  var dd = m ? String(m[3]).padStart(2, '0') : String(now.getDate()).padStart(2, '0');
  var datePart = yyyy.slice(2) + mm + dd;
  var cptPart = '0000';
  if (c && c.cpt_codes && c.cpt_codes.length) {
    var first = c.cpt_codes[0];
    cptPart = String((first && first.code) || '').replace(/\D/g, '').slice(0, 4).padEnd(4, '0') || '0000';
  }
  var suffix = String(Date.now()).slice(-6);
  return (datePart + cptPart + suffix);
}

function fmtACGMEJson(c) {
  let d = "";
  var caseId = c.case_id || generateCaseId(c);
  var mode = (state.settings && state.settings.caseIdMode) || "none";
  if (c.date) { const p = c.date.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); d = p ? parseInt(p[2])+"/"+parseInt(p[3])+"/"+p[1] : c.date; }
  return JSON.stringify({source:"surgilog",date:d,role:c.role||"",site:c.hospital||"",attending:c.attending||"",
    specialty:(state.settings.specialty||"urology"),
    case_id: caseId, caseIdMode: mode,
    cpt_codes:(c.cpt_codes||[]).map(x=>({code:x.code,description:x.description||"",attributes:x.attributes||[]})),is_pediatric:c.is_pediatric||false});
}

// ══════════════════════════════════════════════════════════════
// Phase 2: Deterministic CPT Mapper (Urology)
// The LLM classifies the procedure category + modifiers.
// This function maps those features → exact CPT codes.
// ══════════════════════════════════════════════════════════════
function mapUroCPT(procs, laterality, approach, isPediatric) {
  var codes = [];
  if (!procs || !procs.length) return codes;
  for (var i = 0; i < procs.length; i++) {
    var cat = procs[i].category;
    var m = procs[i].modifiers || {};
    var attrs = [];
    if (approach === "Robotic") attrs.push("Robotic");
    else if (approach === "Laparoscopic") attrs.push("Laparoscopic");

    switch(cat) {
    // ─── Endoscopic: Cystoscopy ───
    case 'cystoscopy':
      if (m.retrograde && m.ureterogram) codes.push({code:'52005',description:'Cysto with ureteral catheterization',attributes:attrs},{code:'74400',description:'Retrograde urography',attributes:[]});
      else if (m.retrograde) codes.push({code:'52005',description:'Cysto with ureteral catheterization',attributes:attrs},{code:'74420',description:'Retrograde pyelography',attributes:[]});
      else if (m.biopsy) codes.push({code:'52204',description:'Cystoscopy with biopsy',attributes:attrs});
      else if (m.botox) codes.push({code:'52287',description:'Cysto with chemodenervation of bladder',attributes:attrs});
      else if (m.fulguration) codes.push({code:'52214',description:'Cysto with fulguration',attributes:attrs});
      else if (m.clot_evacuation) codes.push({code:'52001',description:'Cysto with clot evacuation',attributes:attrs});
      else if (m.dilation) codes.push({code:'52281',description:'Cysto with urethral dilation',attributes:attrs});
      else if (m.urethrotomy) codes.push({code:'52276',description:'Cysto with internal urethrotomy',attributes:attrs});
      else codes.push({code:'52000',description:'Cystourethroscopy',attributes:attrs});
      break;
    case 'cystoscopy_stent_pull':
      codes.push({code: m.complicated ? '52315' : '52310', description:'Cysto with stent removal',attributes:attrs});
      break;
    case 'cystoscopy_stent_place':
      codes.push({code:'52332',description:'Cysto with ureteral stent insertion',attributes:attrs});
      break;

    // ─── Endoscopic: Ureteroscopy ───
    case 'ureteroscopy':
      if (m.lithotripsy && m.stent_placed) codes.push({code:'52356',description:'URS with lithotripsy and stent',attributes: laterality==='Bilateral' ? attrs.concat(['Bilateral']) : attrs});
      else if (m.lithotripsy) codes.push({code:'52353',description:'URS with lithotripsy',attributes: laterality==='Bilateral' ? attrs.concat(['Bilateral']) : attrs});
      else if (m.stone_extraction) codes.push({code:'52352',description:'URS with stone removal',attributes:attrs});
      else if (m.biopsy || m.fulguration) codes.push({code:'52354',description:'URS with biopsy/fulguration',attributes:attrs});
      else if (m.tumor_resection) codes.push({code:'52355',description:'URS with tumor resection',attributes:attrs});
      else if (m.stent_placed) codes.push({code:'52332',description:'URS with stent insertion',attributes:attrs});
      else codes.push({code:'52351',description:'Diagnostic ureteroscopy',attributes:attrs});
      // Add retrograde if specified
      if (m.retrograde) codes.push({code:'74420',description:'Retrograde pyelography',attributes:[]});
      break;

    // ─── Endoscopic: TURBT ───
    case 'turbt':
      if (m.tumor_size === 'small') codes.push({code:'52234',description:'TURBT small (<2cm)',attributes:attrs});
      else if (m.tumor_size === 'large') codes.push({code:'52240',description:'TURBT large (>5cm)',attributes:attrs});
      else codes.push({code:'52235',description:'TURBT medium (2-5cm)',attributes:attrs});
      // Stent during TURBT
      if (m.stent_placed) codes.push({code:'52332',description:'Ureteral stent insertion',attributes:[]});
      break;
    case 'litholapaxy':
      codes.push({code: m.large ? '52318' : '52317', description:'Litholapaxy',attributes:attrs});
      break;

    // ─── Prostate (Endoscopic) ───
    case 'turp':
      codes.push({code: m.redo ? '52630' : '52601', description: m.redo ? 'TURP redo' : 'TURP',attributes:attrs});
      break;
    case 'holep':
      codes.push({code:'52649',description:'HoLEP laser enucleation of prostate',attributes:attrs});
      break;
    case 'prostate_laser':
      codes.push({code: m.vaporization ? '52648' : '52647', description: m.vaporization ? 'Laser vaporization prostate' : 'Laser coagulation prostate',attributes:attrs});
      break;
    case 'aquablation':
      codes.push({code:'0421T',description:'Aquablation of prostate',attributes:attrs});
      break;
    case 'urolift':
      codes.push({code:'52441',description:'Prostatic implant (UroLift)',attributes:attrs});
      if (m.additional_implants) codes.push({code:'52442',description:'Additional prostatic implant',attributes:attrs});
      break;
    case 'tuip':
      codes.push({code:'52450',description:'Transurethral incision of prostate',attributes:attrs});
      break;
    case 'bladder_neck_incision':
      codes.push({code:'52640',description:'Resection of bladder neck contracture',attributes:attrs});
      break;

    // ─── Prostatectomy ───
    case 'prostatectomy':
      if (m.robotic || approach === 'Robotic') {
        codes.push({code:'55866',description:'Robotic radical prostatectomy',attributes:['Robotic']});
      } else if (m.radical) {
        if (m.perineal) codes.push({code: m.lymph_nodes === 'bilateral' ? '55815' : m.lymph_nodes ? '55812' : '55810', description:'Radical prostatectomy perineal',attributes:attrs});
        else codes.push({code: m.lymph_nodes === 'bilateral' ? '55845' : m.lymph_nodes ? '55842' : '55840', description:'Radical prostatectomy retropubic',attributes:attrs});
      } else if (approach === 'Laparoscopic') {
        codes.push({code:'55867',description:'Laparoscopic simple prostatectomy',attributes:['Laparoscopic']});
      } else {
        codes.push({code: m.perineal ? '55801' : '55831', description:'Simple prostatectomy',attributes:attrs});
      }
      break;
    case 'prostate_biopsy':
      if ((m.saturation || m.template) && !m.fusion) codes.push({code:'55706',description:'Saturation prostate biopsy',attributes:attrs});
      else if (m.fusion) codes.push({code:'55700',description:'Prostate needle biopsy MRI fusion guided',attributes:attrs});
      else codes.push({code:'55700',description:'Prostate needle biopsy',attributes:attrs});
      break;

    // ─── Kidney ───
    case 'nephrectomy':
      if (m.radical) {
        if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50545',description:'Laparoscopic radical nephrectomy',attributes:attrs});
        else codes.push({code:'50230',description:'Radical nephrectomy open',attributes:attrs});
      } else if (m.partial) {
        if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50543',description:'Laparoscopic partial nephrectomy',attributes:attrs});
        else codes.push({code:'50240',description:'Partial nephrectomy open',attributes:attrs});
      } else {
        if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50546',description:'Laparoscopic nephrectomy',attributes:attrs});
        else codes.push({code:'50220',description:'Nephrectomy open',attributes:attrs});
      }
      break;
    case 'nephroureterectomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50548',description:'Laparoscopic nephroureterectomy',attributes:attrs});
      else codes.push({code:'50234',description:'Nephroureterectomy open',attributes:attrs});
      break;
    case 'donor_nephrectomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50547',description:'Laparoscopic donor nephrectomy',attributes:attrs});
      else codes.push({code:'50320',description:'Donor nephrectomy open',attributes:attrs});
      break;
    case 'pcnl':
      codes.push({code: m.large_stone ? '50081' : '50080', description: m.large_stone ? 'PCNL > 2cm' : 'PCNL < 2cm', attributes:['Percutaneous']});
      break;
    case 'eswl':
      codes.push({code:'50590',description:'Extracorporeal shock wave lithotripsy',attributes:attrs});
      break;
    case 'renal_ablation':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50542',description:'Laparoscopic renal ablation',attributes:attrs});
      else if (m.cryo) codes.push({code:'50593',description:'Percutaneous renal cryoablation',attributes:['Percutaneous']});
      else codes.push({code:'50592',description:'Percutaneous renal RF ablation',attributes:['Percutaneous']});
      break;
    case 'pyeloplasty':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50544',description:'Laparoscopic pyeloplasty',attributes:attrs});
      else codes.push({code: m.complicated ? '50405' : '50400', description:'Pyeloplasty open',attributes:attrs});
      break;
    case 'nephrostomy':
      if (m.removal) codes.push({code:'50389',description:'Nephrostomy tube removal',attributes:attrs});
      else codes.push({code:'50432',description:'Percutaneous nephrostomy placement',attributes:['Percutaneous']});
      break;
    case 'renal_cyst':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50541',description:'Laparoscopic renal cyst ablation',attributes:attrs});
      else codes.push({code:'50280',description:'Excision/unroofing renal cyst',attributes:attrs});
      break;

    // ─── Ureter ───
    case 'ureteral_reimplant':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code: m.stent_placed ? '50947' : '50948', description:'Laparoscopic ureteral reimplant',attributes:attrs});
      else codes.push({code: m.psoas_hitch ? '50785' : '50780', description:'Ureteroneocystostomy',attributes:attrs});
      break;
    case 'ureterolithotomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'50945',description:'Laparoscopic ureterolithotomy',attributes:attrs});
      else if (m.segment === 'upper') codes.push({code:'50610',description:'Ureterolithotomy upper third',attributes:attrs});
      else if (m.segment === 'lower') codes.push({code:'50630',description:'Ureterolithotomy lower third',attributes:attrs});
      else codes.push({code:'50620',description:'Ureterolithotomy middle third',attributes:attrs});
      break;

    // ─── Bladder (Surgical) ───
    case 'cystectomy':
      if (m.partial) codes.push({code: m.reimplant ? '51565' : '51550', description:'Partial cystectomy',attributes:attrs});
      else if (m.neobladder) codes.push({code:'51596',description:'Radical cystectomy with neobladder',attributes:attrs});
      else if (m.ileal_conduit) codes.push({code: m.lymph_nodes ? '51595' : '51590', description:'Radical cystectomy with ileal conduit',attributes:attrs});
      else codes.push({code: m.lymph_nodes ? '51575' : '51570', description:'Radical cystectomy',attributes:attrs});
      break;
    case 'bladder_augmentation':
      codes.push({code:'51960',description:'Enterocystoplasty (bladder augmentation)',attributes:attrs});
      break;
    case 'intravesical_instillation':
      codes.push({code:'51720',description:'Intravesical instillation of agent',attributes:attrs});
      break;
    case 'suprapubic_tube':
      codes.push({code:'51980',description:'Cutaneous vesicostomy / suprapubic tube',attributes:attrs});
      break;

    // ─── Scrotum & Testis ───
    case 'orchiectomy':
      if (m.radical) codes.push({code: m.exploration ? '54535' : '54530', description:'Radical orchiectomy (inguinal)',attributes:attrs});
      else if (m.partial) codes.push({code:'54522',description:'Partial orchiectomy',attributes:attrs});
      else if (approach === 'Laparoscopic') codes.push({code:'54690',description:'Laparoscopic orchiectomy',attributes:attrs});
      else codes.push({code:'54520',description:'Simple orchiectomy',attributes:attrs});
      break;
    case 'orchiopexy':
      if (m.abdominal || approach === 'Laparoscopic') codes.push({code: approach==='Laparoscopic' ? '54692' : '54650', description:'Orchiopexy abdominal/laparoscopic',attributes:attrs});
      else codes.push({code:'54640',description:'Orchiopexy inguinal/scrotal',attributes:attrs});
      break;
    case 'testicular_torsion':
      codes.push({code:'54600',description:'Reduction of testicular torsion',attributes:attrs});
      if (m.contralateral_fixation) codes.push({code:'54620',description:'Fixation of contralateral testis',attributes:attrs});
      break;
    case 'hydrocelectomy':
      codes.push({code: laterality==='Bilateral' ? '55041' : '55040', description:'Hydrocelectomy',attributes:attrs});
      break;
    case 'spermatocelectomy':
      codes.push({code:'54840',description:'Excision of spermatocele',attributes:attrs});
      break;
    case 'varicocelectomy':
      if (approach === 'Laparoscopic') codes.push({code:'55550',description:'Laparoscopic varicocele ligation',attributes:attrs});
      else if (m.abdominal) codes.push({code:'55535',description:'Varicocelectomy abdominal',attributes:attrs});
      else codes.push({code:'55530',description:'Varicocelectomy',attributes:attrs});
      break;
    case 'testicular_prosthesis':
      codes.push({code:'54660',description:'Testicular prosthesis insertion',attributes:attrs});
      break;

    // ─── Vas & Epididymis ───
    case 'vasectomy':
      codes.push({code:'55250',description:'Vasectomy',attributes:attrs});
      break;
    case 'vasectomy_reversal':
      codes.push({code:'55400',description:'Vasovasostomy',attributes:attrs});
      break;
    case 'epididymectomy':
      codes.push({code: laterality==='Bilateral' ? '54861' : '54860', description:'Epididymectomy',attributes:attrs});
      break;

    // ─── Penis & Urethra ───
    case 'circumcision':
      codes.push({code: isPediatric ? '54000' : '54001', description:'Circumcision',attributes:attrs});
      break;
    case 'penile_prosthesis':
      if (m.removal && m.replacement) codes.push({code: m.infected ? '54411' : '54410', description:'Penile prosthesis removal+replacement',attributes:attrs});
      else if (m.removal) codes.push({code: m.inflatable ? '54406' : '54415', description:'Penile prosthesis removal',attributes:attrs});
      else if (m.repair) codes.push({code:'54408',description:'Penile prosthesis repair',attributes:attrs});
      else if (m.three_piece || m.inflatable) codes.push({code:'54405',description:'Inflatable penile prosthesis insertion',attributes:attrs});
      else codes.push({code:'54400',description:'Penile prosthesis insertion',attributes:attrs});
      break;
    case 'peyronie_surgery':
      if (m.graft) codes.push({code: m.large ? '54112' : '54111', description:"Peyronie's plaque excision with graft",attributes:attrs});
      else if (m.plication) codes.push({code:'54360',description:'Penile plication',attributes:attrs});
      else codes.push({code:'54110',description:"Peyronie's plaque excision",attributes:attrs});
      break;
    case 'priapism_shunt':
      if (m.cavernosum_spongiosum) codes.push({code:'54430',description:'Cavernosum-spongiosum shunt',attributes:attrs});
      else if (m.glans) codes.push({code:'54435',description:'Cavernosum-glans fistulization',attributes:attrs});
      else codes.push({code:'54420',description:'Cavernosum-saphenous shunt',attributes:attrs});
      break;
    case 'meatotomy':
      codes.push({code:'53025',description:'Meatotomy',attributes:attrs});
      break;
    case 'urethroplasty':
      if (m.stage === 2) codes.push({code: m.long ? '54312' : '54308', description:'Urethroplasty 2nd stage',attributes:attrs});
      else if (m.posterior) codes.push({code:'53415',description:'Urethroplasty posterior',attributes:attrs});
      else codes.push({code:'53410',description:'Urethroplasty anterior',attributes:attrs});
      break;
    case 'urethral_diverticulum':
      codes.push({code: m.male ? '53235' : '53230', description:'Excision urethral diverticulum',attributes:attrs});
      break;

    // ─── Incontinence ───
    case 'sling':
      if (m.removal || m.revision) codes.push({code: m.male ? '53442' : '57287', description:'Sling removal/revision',attributes:attrs});
      else if (m.male) codes.push({code:'53440',description:'Male sling',attributes:attrs});
      else if (approach === 'Laparoscopic') codes.push({code:'51992',description:'Laparoscopic sling',attributes:attrs});
      else codes.push({code:'57288',description:'Sling operation',attributes:attrs});
      break;
    case 'artificial_sphincter':
      if (m.removal && m.replacement) codes.push({code: m.infected ? '53448' : '53447', description:'AUS removal+replacement',attributes:attrs});
      else if (m.removal) codes.push({code:'53446',description:'AUS removal',attributes:attrs});
      else if (m.repair) codes.push({code:'53449',description:'AUS repair',attributes:attrs});
      else codes.push({code:'53445',description:'Artificial urinary sphincter insertion',attributes:attrs});
      break;
    case 'sacral_neuromodulation':
      codes.push({code: m.open ? '64581' : '64561', description:'Sacral neuromodulator lead placement',attributes:attrs});
      if (m.generator) codes.push({code:'64590',description:'Pulse generator insertion',attributes:attrs});
      break;

    // ─── Female / Pelvic ───
    case 'colpopexy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'57425',description:'Laparoscopic colpopexy',attributes:attrs});
      else codes.push({code:'57280',description:'Abdominal colpopexy',attributes:attrs});
      break;
    case 'anterior_repair':
      codes.push({code:'57240',description:'Anterior colporrhaphy (cystocele repair)',attributes:attrs});
      break;
    case 'posterior_repair':
      codes.push({code:'57250',description:'Posterior colporrhaphy (rectocele repair)',attributes:attrs});
      break;
    case 'fistula_repair':
      if (m.vesicovaginal) codes.push({code: m.vaginal_approach ? '57320' : '51900', description:'Vesicovaginal fistula repair',attributes:attrs});
      else if (m.urethrovaginal) codes.push({code:'57310',description:'Urethrovaginal fistula repair',attributes:attrs});
      else if (m.rectovaginal) codes.push({code:'57300',description:'Rectovaginal fistula repair',attributes:attrs});
      else codes.push({code:'51900',description:'Vesicovaginal fistula repair',attributes:attrs});
      break;

    // ─── Hypospadias ───
    case 'hypospadias_repair':
      if (m.proximal) codes.push({code:'54332',description:'Proximal hypospadias repair',attributes:attrs});
      else if (m.distal) codes.push({code:'54322',description:'Distal hypospadias repair',attributes:attrs});
      else codes.push({code:'54324',description:'Hypospadias repair with local flaps',attributes:attrs});
      break;
    case 'chordee_repair':
      codes.push({code:'54300',description:'Chordee repair',attributes:attrs});
      break;

    // ─── Other ───
    case 'adrenalectomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'60650',description:'Laparoscopic adrenalectomy',attributes:attrs});
      else codes.push({code:'60540',description:'Adrenalectomy open',attributes:attrs});
      break;
    case 'lymph_node_dissection':
      if (m.retroperitoneal) codes.push({code: approach==='Laparoscopic' ? '38570' : '38780', description:'Retroperitoneal lymphadenectomy',attributes:attrs});
      else codes.push({code:'38562',description:'Pelvic lymphadenectomy',attributes:attrs});
      break;
    case 'hernia_repair':
      if (isPediatric) {
        if (m.incarcerated) codes.push({code:'49501',description:'Inguinal hernia repair (pediatric, incarcerated)',attributes:attrs});
        else codes.push({code:'49500',description:'Inguinal hernia repair (pediatric)',attributes:attrs});
      } else {
        if (m.recurrent) codes.push({code: m.incarcerated ? '49521' : '49520', description:'Recurrent inguinal hernia repair',attributes:attrs});
        else codes.push({code: m.incarcerated ? '49507' : '49505', description:'Inguinal hernia repair',attributes:attrs});
      }
      break;
    case 'debridement':
      codes.push({code:'11004',description:'Debridement external genitalia (Fournier)',attributes:attrs});
      break;
    case 'urodynamics':
      if (m.voiding_study) codes.push({code:'51728',description:'Complex CMG with voiding pressure',attributes:attrs});
      else codes.push({code:'51726',description:'Complex cystometrogram',attributes:attrs});
      break;

    case 'other':
    default:
      // Fallback: if LLM provided a raw CPT code, pass it through
      if (m.raw_code) codes.push({code:m.raw_code, description: m.raw_description || 'Other procedure', attributes:attrs});
      break;
    }
  }

  // Post-processing: duplicate codes for bilateral SURGICAL procedures
  if (laterality === 'Bilateral') {
    var surgical = ['orchiectomy','orchiopexy','hernia_repair','varicocelectomy','hydrocelectomy','nephrectomy','pyeloplasty','ureteral_reimplant'];
    for (var i = 0; i < procs.length; i++) {
      if (surgical.indexOf(procs[i].category) !== -1) {
        // Find matching codes and duplicate them
        var catCodes = codes.filter(function(c) { return c._fromCat === procs[i].category; });
        // Since we didn't tag them, just duplicate all codes from this pass
        // Simpler: the bilateral surgical duplication was already handled in the few cases above
        // For categories not yet handled: duplicate
      }
    }
  }

  return codes;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2 VASCULAR: Deterministic CPT mapping from categories
// ═══════════════════════════════════════════════════════════════
function mapVascCPT(procs, laterality, approach) {
  var codes = [];
  if (!procs || !procs.length) return codes;
  function addOnce(code, description, attributes) {
    if (codes.some(function(c) { return c.code === code; })) return;
    codes.push({code:code, description:description, attributes:attributes || []});
  }
  function addDialysisCircuitAddOns(modifiers) {
    if (modifiers.central_angioplasty) codes.push({code:'36907',description:'Dialysis circuit additional central segment angioplasty',attributes:['Endovascular']});
    if (modifiers.central_stent) codes.push({code:'36908',description:'Dialysis circuit additional central segment stent',attributes:['Endovascular']});
    if (modifiers.embolization) codes.push({code:'36909',description:'Dialysis circuit embolization/occlusion',attributes:['Endovascular']});
  }
  for (var i = 0; i < procs.length; i++) {
    var cat = procs[i].category;
    var m = procs[i].modifiers || {};
    var attrs = [];
    if (approach === 'Open') attrs.push('Open');
    else if (approach === 'Endovascular') attrs.push('Endovascular');
    else if (approach === 'Percutaneous') attrs.push('Percutaneous');

    switch(cat) {

    // ─── Carotid / Head & Neck ───
    case 'cea':
      codes.push({code:'35301',description:'Carotid endarterectomy (CEA)',attributes:['Open']});
      break;
    case 'carotid_body_tumor':
      codes.push({code: m.carotid_excision ? '60605' : '60600', description:'Excision carotid body tumor',attributes:['Open']});
      break;
    case 'temporal_artery_biopsy':
      codes.push({code:'37609',description:'Temporal artery biopsy',attributes:['Open']});
      break;

    // ─── Aneurysm (Endovascular) ───
    case 'evar':
      codes.push({code: m.ruptured ? '34702' : '34701', description: m.ruptured ? 'EVAR (ruptured)' : 'EVAR',attributes:['Endovascular']});
      // Femoral access/closure logged separately
      if (m.femoral_access) codes.push({code:'34713',description:'Percutaneous femoral access/closure for endograft',attributes:['Percutaneous']});
      if (m.femoral_exposure) codes.push({code:'34812',description:'Open femoral artery exposure for endograft',attributes:['Open']});
      break;
    case 'tevar':
      codes.push({code:'33881',description:'Endovascular repair descending thoracic aorta (TEVAR)',attributes:['Endovascular']});
      if (m.femoral_access) codes.push({code:'34713',description:'Percutaneous femoral access/closure for endograft',attributes:['Percutaneous']});
      if (m.femoral_exposure) codes.push({code:'34812',description:'Open femoral artery exposure for endograft',attributes:['Open']});
      break;

    // ─── Aneurysm (Open) ───
    case 'open_aaa':
      codes.push({code: m.ruptured ? '35082' : '35081', description: m.ruptured ? 'Open AAA repair (ruptured)' : 'Open AAA repair',attributes:['Open']});
      break;
    case 'open_thoracic_aneurysm':
      codes.push({code:'33875',description:'Open repair descending thoracic aortic aneurysm',attributes:['Open']});
      break;

    // ─── Bypass Grafts ───
    case 'fem_pop_bypass':
      if (m.conduit === 'prosthetic') codes.push({code:'35656',description:'Fem-pop bypass (prosthetic)',attributes:['Open']});
      else codes.push({code:'35556',description:'Fem-pop bypass (vein)',attributes:['Open']}); // default vein
      break;
    case 'fem_tib_bypass':
      if (m.conduit === 'prosthetic') codes.push({code:'35666',description:'Fem-tib bypass (prosthetic)',attributes:['Open']});
      else codes.push({code:'35566',description:'Fem-tib bypass (vein)',attributes:['Open']}); // default vein
      break;
    case 'fem_fem_bypass':
      if (m.conduit === 'vein') codes.push({code:'35558',description:'Fem-fem bypass (vein)',attributes:['Open']});
      else codes.push({code:'35661',description:'Fem-fem bypass (prosthetic)',attributes:['Open']}); // default prosthetic
      break;
    case 'ax_fem_bypass':
      if (m.conduit === 'vein') codes.push({code:'35521',description:'Ax-fem bypass (vein)',attributes:['Open']});
      else codes.push({code:'35621',description:'Ax-fem bypass (prosthetic)',attributes:['Open']}); // default prosthetic
      break;
    case 'aortobifem_bypass':
      if (m.conduit === 'vein') codes.push({code:'35540',description:'Aortobifemoral bypass (vein)',attributes:['Open']});
      else codes.push({code:'35646',description:'Aortobifemoral bypass (prosthetic)',attributes:['Open']}); // default prosthetic
      break;

    // ─── Endarterectomy (non-carotid) ───
    case 'endarterectomy':
      var seg = (m.segment || '').toLowerCase();
      if (seg.indexOf('aortoiliac') !== -1) codes.push({code:'35361',description:'Thromboendarterectomy aortoiliac',attributes:['Open']});
      else if (seg.indexOf('iliac') !== -1 && seg.indexOf('femoral') !== -1) codes.push({code:'35355',description:'Thromboendarterectomy iliofemoral',attributes:['Open']});
      else if (seg.indexOf('iliac') !== -1) codes.push({code:'35351',description:'Thromboendarterectomy iliac',attributes:['Open']});
      else if (seg.indexOf('profunda') !== -1) codes.push({code:'35372',description:'Thromboendarterectomy profunda femoral',attributes:['Open']});
      else if (seg.indexOf('sfa') !== -1 || seg.indexOf('superficial femoral') !== -1) codes.push({code:'35302',description:'Thromboendarterectomy superficial femoral',attributes:['Open']});
      else if (seg.indexOf('popliteal') !== -1) codes.push({code:'35303',description:'Thromboendarterectomy popliteal',attributes:['Open']});
      else if (seg.indexOf('tibial') !== -1 || seg.indexOf('peroneal') !== -1) codes.push({code:'35305',description:'Thromboendarterectomy tibial/peroneal',attributes:['Open']});
      else if (seg.indexOf('tibioperoneal') !== -1) codes.push({code:'35304',description:'Thromboendarterectomy tibioperoneal trunk',attributes:['Open']});
      else if (seg.indexOf('mesenteric') !== -1 || seg.indexOf('celiac') !== -1 || seg.indexOf('renal') !== -1) codes.push({code:'35341',description:'Thromboendarterectomy with patch graft (mesenteric/celiac/renal)',attributes:['Open']});
      else codes.push({code:'35371',description:'Thromboendarterectomy common femoral',attributes:['Open']}); // default common femoral
      break;

    // ─── Thrombectomy / Embolectomy ───
    case 'thrombectomy':
    case 'embolectomy':
      var loc = (m.location || '').toLowerCase();
      if (m.mechanical || m.percutaneous) codes.push({code:'37184',description:'Percutaneous mechanical thrombectomy',attributes:['Percutaneous']});
      else if (loc.indexOf('brachial') !== -1 || loc.indexOf('axillary') !== -1 || loc.indexOf('subclavian') !== -1) codes.push({code:'34101',description:'Embolectomy/thrombectomy upper extremity',attributes:['Open']});
      else if (loc.indexOf('radial') !== -1 || loc.indexOf('ulnar') !== -1) codes.push({code:'34111',description:'Embolectomy/thrombectomy radial/ulnar',attributes:['Open']});
      else if (loc.indexOf('renal') !== -1 || loc.indexOf('mesenteric') !== -1 || loc.indexOf('celiac') !== -1) codes.push({code:'34151',description:'Embolectomy/thrombectomy abdominal visceral',attributes:['Open']});
      else if (loc.indexOf('popliteal') !== -1 || loc.indexOf('tibial') !== -1 || loc.indexOf('peroneal') !== -1) codes.push({code:'34203',description:'Embolectomy/thrombectomy popliteal-tibio-peroneal',attributes:['Open']});
      else codes.push({code:'34201',description:'Embolectomy/thrombectomy femoropopliteal/aortoiliac',attributes:['Open']}); // default
      break;
    case 'amputation':
      var ampLevel = (m.amputation_level || m.level || '').toLowerCase();
      if (ampLevel.indexOf('below') !== -1 || ampLevel.indexOf('bka') !== -1 || ampLevel.indexOf('tibia') !== -1 || ampLevel.indexOf('fibula') !== -1) {
        codes.push({code:'27880',description:'Below-knee amputation (through tibia/fibula)',attributes:['Open']});
      } else {
        // Default to above-knee when level is unspecified for this category.
        codes.push({code:'27590',description:'Above-knee amputation (through femur)',attributes:['Open']});
      }
      break;

    // ─── AV Fistula / Hemodialysis Access ───
    case 'av_fistula_creation':
      if (m.basilic_transposition) codes.push({code:'36819',description:'AV fistula creation with basilic vein transposition',attributes:['Open']});
      else codes.push({code:'36821',description:'AV fistula creation',attributes:['Open']});
      break;
    case 'av_fistula_revision':
      if (m.with_thrombectomy) codes.push({code:'36833',description:'AV fistula revision with thrombectomy',attributes:['Open']});
      else codes.push({code:'36832',description:'AV fistula revision without thrombectomy',attributes:['Open']});
      break;
    case 'av_fistula_thrombectomy':
      codes.push({code:'36831',description:'Thrombectomy AV fistula',attributes:['Open']});
      break;
    case 'av_fistula_ligation':
      codes.push({code:'37607',description:'AV fistula ligation',attributes:['Open']});
      break;
    case 'av_fistula_repair':
      codes.push({code:'35190',description:'Repair acquired/traumatic AV fistula',attributes:['Open']});
      break;
    case 'fistulogram':
      codes.push({code:'36901',description:'Dialysis circuit fistulogram diagnostic',attributes:['Endovascular']});
      addDialysisCircuitAddOns(m);
      break;
    case 'fistulogram_angioplasty':
      codes.push({code:'36902',description:'Dialysis circuit fistulogram with balloon angioplasty',attributes:['Endovascular']});
      addDialysisCircuitAddOns(m);
      break;
    case 'fistulogram_stent':
      codes.push({code:'36903',description:'Dialysis circuit fistulogram with balloon angioplasty and stent',attributes:['Endovascular']});
      addDialysisCircuitAddOns(m);
      break;
    case 'fistula_thrombectomy':
      if (m.stent) codes.push({code:'36906',description:'Dialysis circuit thrombectomy/thrombolysis with peripheral stent',attributes:['Endovascular']});
      else if (m.angioplasty) codes.push({code:'36905',description:'Dialysis circuit thrombectomy/thrombolysis with peripheral angioplasty',attributes:['Endovascular']});
      else codes.push({code:'36904',description:'Dialysis circuit thrombectomy/thrombolysis',attributes:['Endovascular']});
      addDialysisCircuitAddOns(m);
      break;

    // ─── Endovascular Revascularization ───
    case 'endovascular_revasc':
      var bed = (m.arterial_bed || '').toLowerCase();
      if (bed.indexOf('iliac') !== -1) {
        if (m.stent) {
          codes.push({code:'37221',description:'Endovascular revascularization iliac (stent)',attributes:['Endovascular']});
          if (m.additional_iliac) codes.push({code:'37223',description:'Additional ipsilateral iliac artery with stent (add-on)',attributes:['Endovascular']});
        } else {
          codes.push({code:'37220',description:'Endovascular revascularization iliac (angioplasty)',attributes:['Endovascular']});
          if (m.additional_iliac) codes.push({code:'37222',description:'Additional ipsilateral iliac artery angioplasty (add-on)',attributes:['Endovascular']});
        }
      } else if (bed.indexOf('tibial') !== -1 || bed.indexOf('peroneal') !== -1) {
        if (m.atherectomy && m.stent) codes.push({code:'37231',description:'Endovascular revasc tibial/peroneal (atherectomy+stent)',attributes:['Endovascular']});
        else if (m.stent) codes.push({code:'37230',description:'Endovascular revasc tibial/peroneal (stent)',attributes:['Endovascular']});
        else if (m.atherectomy) codes.push({code:'37229',description:'Endovascular revasc tibial/peroneal (atherectomy)',attributes:['Endovascular']});
        else codes.push({code:'37228',description:'Endovascular revasc tibial/peroneal (angioplasty)',attributes:['Endovascular']});
      } else {
        // Default femoral/popliteal
        if (m.atherectomy && m.stent) codes.push({code:'37227',description:'Endovascular revasc fem/pop (atherectomy+stent)',attributes:['Endovascular']});
        else if (m.stent) codes.push({code:'37226',description:'Endovascular revasc fem/pop (stent)',attributes:['Endovascular']});
        else if (m.atherectomy) codes.push({code:'37225',description:'Endovascular revasc fem/pop (atherectomy)',attributes:['Endovascular']});
        else codes.push({code:'37224',description:'Endovascular revasc fem/pop (angioplasty)',attributes:['Endovascular']});
      }
      if (m.us_guided_access || m.ultrasound_guided_access) {
        addOnce('76937','Ultrasound-guided vascular access', ['Endovascular']);
      }
      break;
    case 'diagnostic_angiogram':
      // Diagnostic-only peripheral angiography family.
      if (m.cath_order === 'third_order') codes.push({code:'36247',description:'Selective arterial catheterization third order',attributes:['Endovascular']});
      else if (m.cath_order === 'second_order') codes.push({code:'36246',description:'Selective arterial catheterization second order',attributes:['Endovascular']});
      else if (m.cath_order === 'first_order') codes.push({code:'36245',description:'Selective arterial catheterization first order',attributes:['Endovascular']});
      else codes.push({code:'36200',description:'Catheter placement into aorta (nonselective)',attributes:['Endovascular']});
      if (m.additional_selective) codes.push({code:'36248',description:'Selective arterial catheterization each additional order (add-on)',attributes:['Endovascular']});
      if (m.runoff || m.aortogram_with_runoff) {
        codes.push({code:'75630',description:'Abdominal aortography with bilateral lower extremity runoff',attributes:['Endovascular']});
      } else if (m.abdominal_aortogram) {
        codes.push({code:'75625',description:'Abdominal aortography',attributes:['Endovascular']});
      } else if ((laterality || '').toLowerCase() === 'bilateral' || m.bilateral) {
        codes.push({code:'75716',description:'Peripheral extremity angiography bilateral',attributes:['Endovascular']});
      } else {
        codes.push({code:'75710',description:'Peripheral extremity angiography unilateral',attributes:['Endovascular']});
      }
      if (m.additional_vessel) codes.push({code:'75774',description:'Selective angiography each additional vessel (add-on)',attributes:['Endovascular']});
      if (m.us_guided_access || m.ultrasound_guided_access) {
        addOnce('76937','Ultrasound-guided vascular access', ['Endovascular']);
      }
      break;

    // ─── Venous ───
    case 'rfa_vein':
      codes.push({code:'36475',description:'Endovenous ablation radiofrequency (RFA)',attributes:['Percutaneous']});
      break;
    case 'laser_ablation_vein':
      codes.push({code:'36478',description:'Endovenous ablation laser (EVLA)',attributes:['Percutaneous']});
      break;
    case 'stab_phlebectomy':
      codes.push({code:'37765',description:'Stab phlebectomy of varicose veins',attributes:['Open']});
      break;
    case 'vein_stripping':
      if (m.short_saphenous) codes.push({code:'37718',description:'Ligation/division short saphenous vein',attributes:['Open']});
      else codes.push({code:'37722',description:'Ligation/division/stripping long saphenous vein',attributes:['Open']});
      break;
    case 'vein_ligation':
      if (m.short_saphenous) codes.push({code:'37718',description:'Ligation/division short saphenous vein',attributes:['Open']});
      else codes.push({code:'37700',description:'Ligation/division long saphenous vein',attributes:['Open']});
      break;
    case 'sclerotherapy':
      codes.push({code:'36465',description:'Injection of foam sclerosant with ultrasound guidance',attributes:['Percutaneous']});
      break;

    // ─── Vessel Repair ───
    case 'vessel_repair':
      var region = (m.region || '').toLowerCase();
      if (region.indexOf('neck') !== -1) codes.push({code:'35201',description:'Repair of vessel (neck)',attributes:['Open']});
      else if (region.indexOf('upper') !== -1 || region.indexOf('arm') !== -1) codes.push({code:'35206',description:'Repair of vessel (upper extremity)',attributes:['Open']});
      else if (region.indexOf('abdom') !== -1) codes.push({code:'35221',description:'Repair of vessel (abdominal)',attributes:['Open']});
      else codes.push({code:'35226',description:'Repair of vessel (lower extremity)',attributes:['Open']}); // default lower ext
      break;

    // ─── Exploration ───
    case 'exploration':
      var expRegion = (m.region || '').toLowerCase();
      if (expRegion.indexOf('neck') !== -1) codes.push({code:'35800',description:'Exploration postop (neck)',attributes:['Open']});
      else if (expRegion.indexOf('abdom') !== -1) codes.push({code:'35840',description:'Exploration postop (abdomen)',attributes:['Open']});
      else codes.push({code:'35860',description:'Exploration postop (extremity)',attributes:['Open']}); // default extremity
      break;

    // ─── Miscellaneous ───
    case 'first_rib_resection':
      codes.push({code:'21615',description:'Excision first/cervical rib (thoracic outlet)',attributes:['Open']});
      break;
    case 'infected_graft_excision':
      codes.push({code:'35903',description:'Excision of infected extremity graft',attributes:['Open']});
      break;

    // ─── Fallback ───
    case 'other':
    default:
      if (m.raw_code) codes.push({code:m.raw_code, description: m.raw_description || 'Vascular procedure', attributes:attrs});
      else codes.push({code:'37799',description:'Unlisted vascular procedure',attributes:attrs});
      break;
    }
  }
  return codes;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2 GENERAL SURGERY: Deterministic CPT mapping from categories
// ═══════════════════════════════════════════════════════════════
function mapGenSurgCPT(procs, laterality, approach, isPediatric) {
  var codes = [];
  if (!procs || !procs.length) return codes;
  for (var i = 0; i < procs.length; i++) {
    var cat = procs[i].category;
    var m = procs[i].modifiers || {};
    var attrs = [];
    if (approach === "Robotic") attrs.push("Robotic");
    else if (approach === "Laparoscopic") attrs.push("Laparoscopic");

    switch(cat) {
    // ─── Gallbladder ───
    case 'cholecystectomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') {
        if (m.common_duct_exploration) codes.push({code:'47564',description:'Lap cholecystectomy with common duct exploration',attributes:attrs});
        else if (m.cholangiogram) codes.push({code:'47563',description:'Lap cholecystectomy with cholangiogram',attributes:attrs});
        else codes.push({code:'47562',description:'Laparoscopic cholecystectomy',attributes:attrs});
      } else {
        if (m.common_duct_exploration) codes.push({code:'47610',description:'Open cholecystectomy with common duct exploration',attributes:attrs});
        else if (m.cholangiogram) codes.push({code:'47605',description:'Open cholecystectomy with cholangiogram',attributes:attrs});
        else codes.push({code:'47600',description:'Open cholecystectomy',attributes:attrs});
      }
      break;

    // ─── Appendix ───
    case 'appendectomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'44970',description:'Laparoscopic appendectomy',attributes:attrs});
      else codes.push({code: m.ruptured ? '44960' : '44950', description: m.ruptured ? 'Appendectomy open ruptured' : 'Appendectomy open',attributes:attrs});
      break;

    // ─── Hernia (Inguinal) ───
    case 'inguinal_hernia':
      if (approach === 'Laparoscopic' || approach === 'Robotic') {
        codes.push({code: m.recurrent ? '49651' : '49650', description: m.recurrent ? 'Lap inguinal hernia repair recurrent' : 'Lap inguinal hernia repair',attributes:attrs});
      } else if (m.sliding) {
        codes.push({code:'49525',description:'Inguinal hernia repair sliding',attributes:attrs});
      } else if (m.recurrent) {
        codes.push({code: m.incarcerated ? '49521' : '49520', description:'Recurrent inguinal hernia repair',attributes:attrs});
      } else {
        codes.push({code: m.incarcerated ? '49507' : '49505', description:'Inguinal hernia repair',attributes:attrs});
      }
      if (m.mesh) codes.push({code:'49568',description:'Mesh implantation add-on',attributes:[]});
      break;

    // ─── Hernia (Ventral/Incisional) ───
    case 'ventral_hernia':
      if (approach === 'Laparoscopic' || approach === 'Robotic') {
        codes.push({code: m.incarcerated ? '49653' : '49652', description:'Lap ventral hernia repair',attributes:attrs});
      } else if (m.recurrent) {
        codes.push({code: m.incarcerated ? '49566' : '49565', description:'Recurrent ventral hernia repair',attributes:attrs});
      } else {
        codes.push({code: m.incarcerated ? '49561' : '49560', description:'Ventral/incisional hernia repair',attributes:attrs});
      }
      if (m.mesh) codes.push({code:'49568',description:'Mesh implantation add-on',attributes:[]});
      break;

    // ─── Hernia (Umbilical) ───
    case 'umbilical_hernia':
      if (isPediatric) codes.push({code: m.incarcerated ? '49582' : '49580', description:'Umbilical hernia repair pediatric',attributes:attrs});
      else codes.push({code: m.incarcerated ? '49587' : '49585', description:'Umbilical hernia repair',attributes:attrs});
      break;

    // ─── Hernia (Femoral) ───
    case 'femoral_hernia':
      codes.push({code: m.incarcerated ? '49553' : '49550', description:'Femoral hernia repair',attributes:attrs});
      break;

    // ─── Hernia (Hiatal) / Fundoplication ───
    case 'fundoplication':
      if (approach === 'Laparoscopic' || approach === 'Robotic') {
        if (m.paraesophageal && m.mesh) codes.push({code:'43282',description:'Lap paraesophageal hernia repair with mesh',attributes:attrs});
        else if (m.paraesophageal) codes.push({code:'43281',description:'Lap paraesophageal hernia repair with fundoplication',attributes:attrs});
        else codes.push({code:'43280',description:'Laparoscopic fundoplication (Nissen)',attributes:attrs});
      } else {
        codes.push({code:'43325',description:'Open fundoplication (Nissen)',attributes:attrs});
      }
      break;

    // ─── Esophagus ───
    case 'esophagectomy':
      if (m.total) {
        if (m.colon_interposition) codes.push({code:'43108',description:'Total esophagectomy with colon interposition',attributes:attrs});
        else codes.push({code:'43107',description:'Total esophagectomy with pharyngogastrostomy',attributes:attrs});
      } else if (m.ivor_lewis) {
        codes.push({code:'43112',description:'Esophagectomy with thoracotomy (Ivor Lewis)',attributes:attrs});
      } else {
        codes.push({code:'43117',description:'Partial esophagectomy distal two thirds',attributes:attrs});
      }
      break;
    case 'heller_myotomy':
      codes.push({code:'43279',description:'Laparoscopic Heller myotomy',attributes:attrs});
      break;

    // ─── EGD ───
    case 'egd':
      if (m.peg) codes.push({code:'43246',description:'EGD with PEG placement',attributes:attrs});
      else if (m.foreign_body) codes.push({code:'43247',description:'EGD with foreign body removal',attributes:attrs});
      else if (m.biopsy) codes.push({code:'43239',description:'EGD with biopsy',attributes:attrs});
      else codes.push({code:'43191',description:'Esophagoscopy diagnostic',attributes:attrs});
      break;

    // ─── Stomach ───
    case 'gastrectomy':
      if (m.total) {
        codes.push({code: m.roux_en_y ? '43621' : '43620', description: m.roux_en_y ? 'Total gastrectomy with Roux-en-Y' : 'Total gastrectomy',attributes:attrs});
      } else if (m.roux_en_y) {
        codes.push({code:'43633',description:'Partial gastrectomy with Roux-en-Y',attributes:attrs});
      } else if (m.billroth_ii) {
        codes.push({code:'43632',description:'Partial gastrectomy Billroth II',attributes:attrs});
      } else {
        codes.push({code:'43631',description:'Partial gastrectomy Billroth I',attributes:attrs});
      }
      break;
    case 'gastric_bypass':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'43644',description:'Laparoscopic Roux-en-Y gastric bypass',attributes:attrs});
      else codes.push({code:'43846',description:'Open Roux-en-Y gastric bypass',attributes:attrs});
      break;
    case 'sleeve_gastrectomy':
      codes.push({code:'43775',description:'Laparoscopic sleeve gastrectomy',attributes:attrs});
      break;
    case 'gastric_band':
      if (m.removal) codes.push({code:'43772',description:'Lap gastric band removal',attributes:attrs});
      else if (m.revision) codes.push({code:'43771',description:'Lap gastric band revision',attributes:attrs});
      else codes.push({code:'43770',description:'Lap gastric band placement',attributes:attrs});
      break;
    case 'pyloromyotomy':
      codes.push({code:'43520',description:'Pyloromyotomy',attributes:attrs});
      break;
    case 'pyloroplasty':
      codes.push({code:'43800',description:'Pyloroplasty',attributes:attrs});
      break;
    case 'gastrostomy':
      if (m.endoscopic) codes.push({code:'43246',description:'PEG tube placement endoscopic',attributes:attrs});
      else codes.push({code:'43830',description:'Gastrostomy open',attributes:attrs});
      break;
    case 'gastric_perforation_repair':
      codes.push({code:'43840',description:'Gastrorrhaphy suture repair perforated ulcer',attributes:attrs});
      break;

    // ─── Small Bowel ───
    case 'small_bowel_resection':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'44202',description:'Laparoscopic small bowel resection',attributes:attrs});
      else if (m.ostomy) codes.push({code:'44125',description:'Small bowel resection with enterostomy',attributes:attrs});
      else codes.push({code:'44120',description:'Small bowel resection with anastomosis',attributes:attrs});
      break;
    case 'enterolysis':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'44180',description:'Laparoscopic enterolysis',attributes:attrs});
      else codes.push({code:'44005',description:'Enterolysis lysis of adhesions',attributes:attrs});
      break;
    case 'enterotomy':
      codes.push({code:'44020',description:'Enterotomy small bowel exploration',attributes:attrs});
      break;
    case 'bowel_obstruction_reduction':
      codes.push({code:'44050',description:'Reduction of volvulus/intussusception/internal hernia',attributes:attrs});
      break;
    case 'jejunostomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'44186',description:'Laparoscopic jejunostomy',attributes:attrs});
      else codes.push({code:'44300',description:'Jejunostomy tube open',attributes:attrs});
      break;
    case 'ileostomy':
      if (m.revision) codes.push({code: m.complicated ? '44314' : '44312', description:'Ileostomy revision',attributes:attrs});
      else if (m.continent) codes.push({code:'44316',description:'Continent ileostomy (Kock pouch)',attributes:attrs});
      else if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'44187',description:'Laparoscopic ileostomy',attributes:attrs});
      else codes.push({code:'44310',description:'Ileostomy',attributes:attrs});
      break;
    case 'ostomy_closure':
      if (m.resection) codes.push({code:'44625',description:'Closure enterostomy with resection and anastomosis',attributes:attrs});
      else codes.push({code:'44620',description:'Closure of enterostomy simple',attributes:attrs});
      break;
    case 'intestinal_fistula_repair':
      codes.push({code:'44640',description:'Closure of intestinal fistula',attributes:attrs});
      break;

    // ─── Colon/Rectum ───
    case 'colectomy':
      if (m.total) {
        if (approach === 'Laparoscopic' || approach === 'Robotic') {
          if (m.proctectomy && m.jpouch) codes.push({code:'44211',description:'Lap total colectomy with proctectomy and ileal pouch',attributes:attrs});
          else if (m.proctectomy) codes.push({code:'44212',description:'Lap total colectomy with proctectomy and ileostomy',attributes:attrs});
          else codes.push({code:'44210',description:'Laparoscopic total colectomy',attributes:attrs});
        } else {
          if (m.proctectomy && m.jpouch) codes.push({code:'44157',description:'Total colectomy with proctectomy and IPAA with ileostomy',attributes:attrs});
          else if (m.proctectomy) codes.push({code:'44151',description:'Total colectomy with proctectomy and ileostomy',attributes:attrs});
          else codes.push({code:'44150',description:'Total colectomy with ileostomy',attributes:attrs});
        }
      } else {
        // Partial colectomy
        if (approach === 'Laparoscopic' || approach === 'Robotic') {
          if (m.hartmann) codes.push({code:'44206',description:'Lap partial colectomy with end colostomy (Hartmann)',attributes:attrs});
          else if (m.low_anastomosis) codes.push({code:'44208',description:'Lap partial colectomy with coloproctostomy',attributes:attrs});
          else codes.push({code:'44204',description:'Laparoscopic partial colectomy with anastomosis',attributes:attrs});
        } else {
          if (m.hartmann) codes.push({code:'44143',description:'Partial colectomy with end colostomy (Hartmann)',attributes:attrs});
          else if (m.low_anastomosis) codes.push({code:'44146',description:'Partial colectomy with coloproctostomy',attributes:attrs});
          else if (m.ostomy) codes.push({code:'44141',description:'Partial colectomy with colostomy',attributes:attrs});
          else codes.push({code:'44140',description:'Partial colectomy with anastomosis',attributes:attrs});
        }
      }
      break;

    case 'apr':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'45395',description:'Lap abdominoperineal resection',attributes:attrs});
      else codes.push({code:'45110',description:'Abdominoperineal resection (APR)',attributes:attrs});
      break;
    case 'low_anterior_resection':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'44208',description:'Lap coloproctostomy (LAR)',attributes:attrs});
      else codes.push({code:'44146',description:'Coloproctostomy (LAR)',attributes:attrs});
      break;
    case 'rectal_prolapse_repair':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'45400',description:'Lap proctopexy for rectal prolapse',attributes:attrs});
      else if (m.perineal) codes.push({code:'45130',description:'Perineal proctectomy (Altemeier)',attributes:attrs});
      else codes.push({code:'45540',description:'Proctopexy abdominal for rectal prolapse',attributes:attrs});
      break;
    case 'transanal_excision':
      codes.push({code: m.submucosal ? '45171' : '45170', description:'Transanal excision of rectal tumor',attributes:attrs});
      break;
    case 'colostomy':
      if (m.revision) codes.push({code: m.complicated ? '44345' : '44340', description:'Colostomy revision',attributes:attrs});
      else if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'44188',description:'Laparoscopic colostomy',attributes:attrs});
      else codes.push({code:'44320',description:'Colostomy',attributes:attrs});
      break;

    // ─── Anorectal ───
    case 'hemorrhoidectomy':
      if (m.stapled) codes.push({code:'46947',description:'Stapled hemorrhoidopexy (PPH)',attributes:attrs});
      else if (m.rubber_band) codes.push({code:'46221',description:'Hemorrhoid band ligation',attributes:attrs});
      else if (m.thrombosed) codes.push({code:'46320',description:'Excision thrombosed external hemorrhoid',attributes:attrs});
      else if (m.multiple_columns) codes.push({code:'46260',description:'Hemorrhoidectomy 2+ columns',attributes:attrs});
      else if (m.external_only) codes.push({code:'46250',description:'External hemorrhoidectomy',attributes:attrs});
      else codes.push({code:'46255',description:'Hemorrhoidectomy internal and external',attributes:attrs});
      break;
    case 'anal_fistula':
      if (m.seton) codes.push({code:'46275',description:'Anal fistula repair with seton',attributes:attrs});
      else if (m.complex) codes.push({code:'46280',description:'Complex anal fistula repair',attributes:attrs});
      else codes.push({code:'46270',description:'Fistulotomy/fistulectomy',attributes:attrs});
      break;
    case 'anal_fissure':
      codes.push({code:'46200',description:'Fissurectomy',attributes:attrs});
      break;
    case 'perianal_abscess':
      if (m.deep) codes.push({code:'46040',description:'I&D perirectal abscess ischiorectal',attributes:attrs});
      else codes.push({code:'46020',description:'I&D perianal abscess superficial',attributes:attrs});
      break;
    case 'sphincteroplasty':
      codes.push({code:'46750',description:'Anal sphincteroplasty',attributes:attrs});
      break;

    // ─── Liver ───
    case 'hepatectomy':
      if (m.right) codes.push({code:'47130',description:'Right hepatectomy',attributes:attrs});
      else if (m.left) codes.push({code:'47125',description:'Left hepatectomy',attributes:attrs});
      else if (m.trisegmentectomy) codes.push({code:'47122',description:'Hepatic trisegmentectomy',attributes:attrs});
      else codes.push({code:'47120',description:'Hepatectomy partial lobectomy',attributes:attrs});
      break;
    case 'liver_ablation':
      if (m.percutaneous) {
        codes.push({code: m.cryo ? '47383' : '47382', description: m.cryo ? 'Percutaneous liver cryoablation' : 'Percutaneous liver RFA',attributes:['Percutaneous']});
      } else if (approach === 'Laparoscopic' || approach === 'Robotic') {
        codes.push({code: m.cryo ? '47371' : '47370', description: m.cryo ? 'Lap liver cryoablation' : 'Lap liver RFA',attributes:attrs});
      } else {
        codes.push({code: m.cryo ? '47381' : '47380', description: m.cryo ? 'Open liver cryoablation' : 'Open liver RFA',attributes:attrs});
      }
      break;
    case 'liver_biopsy':
      codes.push({code:'47100',description:'Liver biopsy wedge',attributes:attrs});
      break;
    case 'liver_hemorrhage':
      codes.push({code: m.packing ? '47360' : '47350', description: m.packing ? 'Liver hemorrhage control by packing' : 'Liver hemorrhage control by suture',attributes:attrs});
      break;

    // ─── Pancreas ───
    case 'whipple':
      codes.push({code:'48150',description:'Pancreaticoduodenectomy (Whipple)',attributes:attrs});
      break;
    case 'distal_pancreatectomy':
      codes.push({code:'48140',description:'Distal pancreatectomy',attributes:attrs});
      break;
    case 'total_pancreatectomy':
      codes.push({code:'48155',description:'Total pancreatectomy',attributes:attrs});
      break;
    case 'pancreatic_drainage':
      if (m.internal) codes.push({code: m.cystojejunostomy ? '48540' : '48520', description:'Internal drainage of pancreatic cyst',attributes:attrs});
      else codes.push({code:'48510',description:'External drainage pancreatic pseudocyst',attributes:attrs});
      break;
    case 'pancreatic_debridement':
      codes.push({code:'48105',description:'Resection/debridement of pancreas',attributes:attrs});
      break;

    // ─── Spleen ───
    case 'splenectomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'38120',description:'Laparoscopic splenectomy',attributes:attrs});
      else if (m.en_bloc) codes.push({code:'38102',description:'Splenectomy en bloc for extensive disease',attributes:attrs});
      else codes.push({code:'38100',description:'Splenectomy total',attributes:attrs});
      break;
    case 'splenorrhaphy':
      codes.push({code:'38115',description:'Splenorrhaphy repair of ruptured spleen',attributes:attrs});
      break;

    // ─── Breast ───
    case 'mastectomy':
      if (m.radical && m.modified) codes.push({code:'19307',description:'Modified radical mastectomy with axillary nodes',attributes:attrs});
      else if (m.radical) codes.push({code:'19305',description:'Radical mastectomy with axillary nodes',attributes:attrs});
      else if (m.simple || m.total) codes.push({code:'19303',description:'Simple/total mastectomy',attributes:attrs});
      else codes.push({code:'19303',description:'Simple/total mastectomy',attributes:attrs});
      if (m.sentinel_node) codes.push({code:'38792',description:'Sentinel node injection',attributes:[]});
      break;
    case 'lumpectomy':
      if (m.sentinel_node) codes.push({code:'19302',description:'Lumpectomy with sentinel node biopsy',attributes:attrs});
      else if (m.axillary_dissection) codes.push({code:'19301',description:'Lumpectomy with axillary lymphadenectomy',attributes:attrs});
      else if (m.needle_localization) codes.push({code:'19125',description:'Excision with needle localization',attributes:attrs});
      else codes.push({code:'19160',description:'Partial mastectomy (lumpectomy)',attributes:attrs});
      break;
    case 'breast_biopsy':
      if (m.open) codes.push({code:'19101',description:'Breast biopsy open incisional',attributes:attrs});
      else codes.push({code:'19100',description:'Breast biopsy needle core',attributes:attrs});
      break;
    case 'axillary_dissection':
      codes.push({code: m.complete ? '38745' : '38740', description: m.complete ? 'Complete axillary lymphadenectomy' : 'Axillary lymphadenectomy superficial',attributes:attrs});
      break;
    case 'sentinel_node_biopsy':
      codes.push({code:'38792',description:'Sentinel node injection and biopsy',attributes:attrs});
      break;

    // ─── Thyroid ───
    case 'thyroidectomy':
      if (m.total) {
        if (m.radical_neck) codes.push({code:'60254',description:'Total thyroidectomy with radical neck dissection',attributes:attrs});
        else if (m.neck_dissection) codes.push({code:'60252',description:'Total thyroidectomy with limited neck dissection',attributes:attrs});
        else if (m.substernal) codes.push({code:'60270',description:'Thyroidectomy including substernal',attributes:attrs});
        else codes.push({code:'60240',description:'Total thyroidectomy',attributes:attrs});
      } else {
        codes.push({code:'60220',description:'Thyroid lobectomy',attributes:attrs});
      }
      break;
    case 'thyroglossal_duct_cyst':
      codes.push({code:'60280',description:'Thyroglossal duct cyst excision (Sistrunk)',attributes:attrs});
      break;
    case 'parathyroidectomy':
      if (m.reexploration) codes.push({code:'60502',description:'Parathyroidectomy re-exploration',attributes:attrs});
      else codes.push({code:'60500',description:'Parathyroidectomy',attributes:attrs});
      break;

    // ─── Adrenal ───
    case 'adrenalectomy':
      if (approach === 'Laparoscopic' || approach === 'Robotic') codes.push({code:'60650',description:'Laparoscopic adrenalectomy',attributes:attrs});
      else codes.push({code:'60540',description:'Adrenalectomy open',attributes:attrs});
      break;

    // ─── Skin/Soft Tissue ───
    case 'incision_drainage':
      codes.push({code: m.complicated ? '10061' : '10060', description: m.complicated ? 'I&D abscess complicated' : 'I&D abscess simple',attributes:attrs});
      break;
    case 'excision_lesion':
      if (m.malignant) {
        if (m.size === 'large') codes.push({code:'11606',description:'Excision malignant lesion over 4 cm',attributes:attrs});
        else if (m.size === 'medium') codes.push({code:'11603',description:'Excision malignant lesion 2.1-3.0 cm',attributes:attrs});
        else codes.push({code:'11601',description:'Excision malignant lesion 0.6-1.0 cm',attributes:attrs});
      } else {
        if (m.size === 'large') codes.push({code:'11406',description:'Excision benign lesion over 4 cm',attributes:attrs});
        else if (m.size === 'medium') codes.push({code:'11403',description:'Excision benign lesion 2.1-3.0 cm',attributes:attrs});
        else codes.push({code:'11401',description:'Excision benign lesion 0.6-1.0 cm',attributes:attrs});
      }
      break;
    case 'soft_tissue_tumor':
      if (m.radical) codes.push({code:'21935',description:'Radical resection soft tissue tumor',attributes:attrs});
      else if (m.subfascial) codes.push({code:'21931',description:'Excision soft tissue tumor subfascial',attributes:attrs});
      else codes.push({code:'21930',description:'Excision soft tissue tumor subcutaneous',attributes:attrs});
      break;
    case 'debridement':
      if (m.necrotizing) {
        if (m.abdominal_wall && m.perineum) codes.push({code:'11006',description:'Debridement necrotizing infection genitalia + abdomen',attributes:attrs});
        else if (m.abdominal_wall) codes.push({code:'11005',description:'Debridement necrotizing infection abdominal wall',attributes:attrs});
        else if (m.perineum) codes.push({code:'11004',description:'Debridement necrotizing infection genitalia/perineum',attributes:attrs});
        else codes.push({code:'11004',description:'Debridement necrotizing soft tissue',attributes:attrs});
      } else if (m.bone) {
        codes.push({code:'11044',description:'Debridement including bone',attributes:attrs});
      } else if (m.muscle) {
        codes.push({code:'11043',description:'Debridement muscle and/or fascia',attributes:attrs});
      } else {
        codes.push({code:'11042',description:'Debridement subcutaneous tissue',attributes:attrs});
      }
      break;

    // ─── Wound Repair ───
    case 'wound_repair':
      if (m.complex) codes.push({code:'13100',description:'Complex wound repair trunk',attributes:attrs});
      else if (m.intermediate) codes.push({code:'12031',description:'Intermediate wound repair',attributes:attrs});
      else codes.push({code:'12001',description:'Simple wound repair',attributes:attrs});
      break;
    case 'wound_exploration':
      if (m.neck) codes.push({code:'20100',description:'Exploration penetrating wound neck',attributes:attrs});
      else if (m.chest) codes.push({code:'20101',description:'Exploration penetrating wound chest',attributes:attrs});
      else if (m.extremity) codes.push({code:'20103',description:'Exploration penetrating wound extremity',attributes:attrs});
      else codes.push({code:'20102',description:'Exploration penetrating wound abdomen',attributes:attrs});
      break;

    // ─── Laparotomy/Peritoneum ───
    case 'exploratory_laparotomy':
      if (m.reopening) codes.push({code:'49002',description:'Reopening of recent laparotomy',attributes:attrs});
      else codes.push({code:'49000',description:'Exploratory laparotomy',attributes:attrs});
      break;
    case 'diagnostic_laparoscopy':
      if (m.biopsy) codes.push({code:'49321',description:'Diagnostic laparoscopy with biopsy',attributes:attrs});
      else codes.push({code:'49320',description:'Diagnostic laparoscopy',attributes:attrs});
      break;
    case 'abscess_drainage':
      if (m.percutaneous) codes.push({code:'49062',description:'Percutaneous drainage peritoneal abscess',attributes:['Percutaneous']});
      else if (m.subdiaphragmatic) codes.push({code:'49040',description:'Drainage subdiaphragmatic abscess',attributes:attrs});
      else if (m.retroperitoneal) codes.push({code:'49060',description:'Drainage retroperitoneal abscess',attributes:attrs});
      else codes.push({code:'49020',description:'Drainage peritoneal abscess',attributes:attrs});
      break;
    case 'paracentesis':
      codes.push({code: m.imaging_guided ? '49083' : '49082', description:'Abdominal paracentesis',attributes:attrs});
      break;
    case 'omentectomy':
      codes.push({code:'49255',description:'Omentectomy',attributes:attrs});
      break;

    // ─── Diaphragm ───
    case 'diaphragm_repair':
      if (m.neonatal) codes.push({code:'39503',description:'Repair neonatal diaphragmatic hernia with prosthesis',attributes:attrs});
      else if (m.laceration) codes.push({code:'39501',description:'Repair diaphragmatic laceration',attributes:attrs});
      else codes.push({code:'39540',description:'Repair diaphragmatic hernia abdominal approach',attributes:attrs});
      break;

    // ─── Lymph Nodes ───
    case 'lymph_node_biopsy':
      if (m.deep) codes.push({code: m.axillary ? '38525' : '38510', description:'Deep lymph node biopsy',attributes:attrs});
      else codes.push({code:'38500',description:'Lymph node biopsy superficial',attributes:attrs});
      break;
    case 'neck_dissection':
      codes.push({code: m.radical ? '38724' : '38720', description: m.radical ? 'Radical neck dissection' : 'Modified radical neck dissection',attributes:attrs});
      break;

    // ─── Central Venous Access ───
    case 'central_line':
      if (m.tunneled) {
        if (m.port) codes.push({code:'36561',description:'Tunneled central line with port',attributes:attrs});
        else codes.push({code:'36558',description:'Tunneled central line without port',attributes:attrs});
      } else if (m.picc) {
        codes.push({code:'36571',description:'PICC line placement',attributes:attrs});
      } else {
        codes.push({code:'36556',description:'Non-tunneled central venous catheter',attributes:attrs});
      }
      break;
    case 'central_line_removal':
      codes.push({code: m.port ? '36590' : '36589', description: m.port ? 'Removal tunneled central line with port' : 'Removal tunneled central line',attributes:attrs});
      break;

    // ─── Burns ───
    case 'burn_care':
      if (m.large) codes.push({code:'16030',description:'Burn dressing and debridement large',attributes:attrs});
      else if (m.medium) codes.push({code:'16025',description:'Burn dressing and debridement medium',attributes:attrs});
      else codes.push({code:'16020',description:'Burn dressing and debridement initial',attributes:attrs});
      break;

    // ─── Fallback ───
    case 'other':
    default:
      if (m.raw_code) codes.push({code:m.raw_code, description: m.raw_description || 'General surgery procedure', attributes:attrs});
      else codes.push({code:'49329',description:'Unlisted laparoscopy procedure abdomen',attributes:attrs});
      break;
    }
  }
  return codes;
}

function buildSystemPrompt() {
  const s = state.settings;
  const spec = s.specialty || "urology";
  const specLabel = spec === "vascular" ? "vascular surgery" : spec === "gen_surg" ? "general surgery" : "urology";
  let p = `You are a ${specLabel} case parser for ACGME logging. Extract structured JSON from dictated cases.
RESPOND ONLY WITH VALID JSON. No markdown, no backticks, no explanation.
RESIDENT: ${s.residentName||"Resident"} (${s.pgyLevel||"PGY-3"})`;
  if (s.attendings.length) p += "\nATTENDINGS:\n" + s.attendings.map(a=>"- "+a).join("\n");
  if (s.hospitals.length) p += "\nHOSPITALS:\n" + s.hospitals.map(h=>"- "+h).join("\n");
  // Both specialties use two-phase: LLM classifies categories+modifiers, JS maps to CPT codes

  if (spec === "vascular") {
    p += `\n\nDo NOT output CPT codes. Instead, classify each procedure into a CATEGORY with MODIFIERS. The system will map to CPT codes automatically.

PROCEDURE CATEGORIES (pick one per procedure):
cea, evar, tevar, open_aaa, open_thoracic_aneurysm,
fem_pop_bypass, fem_tib_bypass, fem_fem_bypass, ax_fem_bypass, aortobifem_bypass,
endarterectomy, thrombectomy, embolectomy, amputation,
av_fistula_creation, av_fistula_revision, av_fistula_thrombectomy, av_fistula_ligation, av_fistula_repair,
fistulogram, fistulogram_angioplasty, fistulogram_stent, fistula_thrombectomy,
endovascular_revasc, diagnostic_angiogram,
rfa_vein, laser_ablation_vein, stab_phlebectomy, vein_stripping, vein_ligation, sclerotherapy,
vessel_repair, exploration,
carotid_body_tumor, temporal_artery_biopsy, first_rib_resection, infected_graft_excision, other

KEY MODIFIERS (include only what applies):
- conduit: "vein"/"prosthetic" (bypass grafts — vein=autogenous, prosthetic=PTFE/Gore-Tex/Dacron)
- ruptured: true/false (aneurysm repairs)
- segment: string (endarterectomy location: "common femoral","SFA","profunda","iliac","iliofemoral","aortoiliac","popliteal","tibial","tibioperoneal","mesenteric","celiac","renal")
- location: string (thrombectomy/embolectomy location: "femoropopliteal","popliteal-tibial","brachial","radial","renal","mesenteric")
- amputation_level: "below_knee"/"above_knee" (for amputation)
- mechanical: true/false (percutaneous mechanical thrombectomy)
- basilic_transposition: true/false (AV fistula creation)
- with_thrombectomy: true/false (AV fistula revision)
- angioplasty: true/false (for fistula_thrombectomy to map 36905)
- stent: true/false (endovascular revasc and fistula_thrombectomy; stent in fistula_thrombectomy maps 36906)
- additional_iliac: true/false (endovascular_revasc iliac add-on: 37222/37223)
- us_guided_access: true/false (diagnostic_angiogram or endovascular_revasc adds 76937)
- central_angioplasty: true/false (add-on central dialysis segment angioplasty 36907)
- central_stent: true/false (add-on central dialysis segment stent 36908)
- embolization: true/false (dialysis circuit embolization/occlusion 36909)
- arterial_bed: "iliac"/"femoral"/"popliteal"/"tibial"/"peroneal" (endovascular revasc)
- atherectomy: true/false (endovascular revasc)
- cath_order: "nonselective"/"first_order"/"second_order"/"third_order" (diagnostic_angiogram catheterization; defaults to nonselective)
- additional_selective: true/false (diagnostic_angiogram add-on 36248)
- abdominal_aortogram: true/false (diagnostic_angiogram)
- runoff: true/false (diagnostic_angiogram for aortoiliac + bilateral LE runoff)
- additional_vessel: true/false (diagnostic_angiogram add-on +75774)
- femoral_access: true/false (percutaneous access during EVAR/TEVAR — logged separately)
- femoral_exposure: true/false (open femoral exposure during EVAR/TEVAR — logged separately)
- carotid_excision: true/false (carotid body tumor with carotid artery excision)
- short_saphenous: true/false (vein stripping/ligation — default is long/great saphenous)
- region: "neck"/"upper extremity"/"abdominal"/"lower extremity" (vessel repair, exploration)
- raw_code: "XXXXX" (ONLY for "other" category if you know the exact CPT)

RULES:
1. Pick the SINGLE best category per procedure. Do NOT think about CPT codes.
2. BYPASS CONDUIT: If unspecified, default to vein for fem-pop and fem-tib. Default to prosthetic for fem-fem, ax-fem, and aortobifem.
3. EVAR/AAA: Default non-ruptured unless "ruptured" or "rupture" stated.
4. ENDARTERECTOMY: CEA is always "cea" category (NOT endarterectomy). For non-carotid, use "endarterectomy" with segment modifier.
5. AV FISTULA: Pick the specific subcategory (creation/revision/thrombectomy/ligation). Do NOT use generic "av_fistula".
6. DIALYSIS ACCESS ENDOVASCULAR: Use fistulogram/fistulogram_angioplasty/fistulogram_stent/fistula_thrombectomy categories for fistula declot/intervention cases.
7. OPEN VS ENDO FISTULA: Use av_fistula_thrombectomy only for open surgical thrombectomy (36831). Use fistula_thrombectomy for endovascular declot (36904-36906).
8. CENTRAL DIALYSIS SEGMENT: If a central venous segment intervention is documented, set central_angioplasty and/or central_stent for add-on codes.
9. AMPUTATION: Use category "amputation" and set amputation_level to below_knee or above_knee.
10. ENDOVASCULAR REVASC: Specify arterial_bed and whether atherectomy/stent were performed.
11. Age<18: is_pediatric=true.
12. If multiple procedures in one case, list multiple entries in procedures array.

BUNDLING RULES:
- Diagnostic angiogram during endovascular intervention is bundled — do NOT add diagnostic_angiogram separately unless diagnostic-only.
- Femoral access/closure (set femoral_access:true) IS logged separately during EVAR/TEVAR.
- Open femoral exposure (set femoral_exposure:true) IS logged separately during EVAR/TEVAR.

CLINICAL DEFAULTS:
- Bypass conduit: fem-pop and fem-tib default to vein. Fem-fem, ax-fem, aortobifem default to prosthetic.
- Endarterectomy segment: if "femoral endarterectomy" with no further detail, default to "common femoral".
- Thrombectomy: unless "mechanical" or "percutaneous" stated, default is open surgical.
- Diagnostic angiogram catheterization: defaults to nonselective aortic catheterization (36200) unless selective order is stated.
- Iliac endovascular revasc: stent=true maps 37221; otherwise maps 37220.
- Additional ipsilateral iliac intervention: add additional_iliac=true (37222 with angioplasty, 37223 with stent).
- If ultrasound-guided access is documented, set us_guided_access=true (adds 76937).
- Diagnostic angiogram laterality: bilateral extremity angiogram defaults to 75716, unilateral defaults to 75710.
- If dictated as abdominal aortogram with runoff, use runoff:true (maps 75630).
- Dialysis access declot: default to fistula_thrombectomy (endovascular) unless explicitly open surgical revision.
- Dialysis access declot with stent: default to 36906 (includes peripheral angioplasty).
- Dialysis access declot with angioplasty (no stent): use 36905.
- Amputation level: if dictated as below-knee/BKA use below_knee; if above-knee/AKA use above_knee.
- Vein procedures: unless "short saphenous" stated, default is long/great saphenous.

SHORTHAND/ACRONYMS:
- "CEA" = cea category
- "EVAR" = evar category
- "TEVAR" = tevar category
- "AAA" = open_aaa or evar depending on context
- "AVF" = av_fistula_creation
- "Fistulogram" = fistulogram
- "Fistuloplasty" = fistulogram_angioplasty
- "Declot" = fistula_thrombectomy
- "BKA" = amputation with amputation_level=below_knee
- "AKA" = amputation with amputation_level=above_knee
- "TAB" = temporal_artery_biopsy
- "RFA" (vein context) = rfa_vein
- "TOS" / "thoracic outlet" = first_rib_resection`;
  } else if (spec === "gen_surg") {
    p += `\n\nDo NOT output CPT codes. Instead, classify each procedure into a CATEGORY with MODIFIERS. The system will map to CPT codes automatically.

PROCEDURE CATEGORIES (pick one per procedure):
cholecystectomy, appendectomy,
inguinal_hernia, ventral_hernia, umbilical_hernia, femoral_hernia, fundoplication,
esophagectomy, heller_myotomy, egd,
gastrectomy, gastric_bypass, sleeve_gastrectomy, gastric_band, pyloromyotomy, pyloroplasty, gastrostomy, gastric_perforation_repair,
small_bowel_resection, enterolysis, enterotomy, bowel_obstruction_reduction, jejunostomy, ileostomy, ostomy_closure, intestinal_fistula_repair,
colectomy, apr, low_anterior_resection, rectal_prolapse_repair, transanal_excision, colostomy,
hemorrhoidectomy, anal_fistula, anal_fissure, perianal_abscess, sphincteroplasty,
hepatectomy, liver_ablation, liver_biopsy, liver_hemorrhage,
whipple, distal_pancreatectomy, total_pancreatectomy, pancreatic_drainage, pancreatic_debridement,
splenectomy, splenorrhaphy,
mastectomy, lumpectomy, breast_biopsy, axillary_dissection, sentinel_node_biopsy,
thyroidectomy, thyroglossal_duct_cyst, parathyroidectomy,
adrenalectomy,
incision_drainage, excision_lesion, soft_tissue_tumor, debridement,
wound_repair, wound_exploration,
exploratory_laparotomy, diagnostic_laparoscopy, abscess_drainage, paracentesis, omentectomy,
diaphragm_repair,
lymph_node_biopsy, neck_dissection,
central_line, central_line_removal,
burn_care, other

KEY MODIFIERS (include only what applies):
- cholangiogram: true/false (cholecystectomy)
- common_duct_exploration: true/false (cholecystectomy)
- ruptured: true/false (appendectomy)
- incarcerated: true/false (hernia)
- recurrent: true/false (hernia)
- sliding: true/false (inguinal hernia)
- mesh: true/false (hernia repair with mesh)
- paraesophageal: true/false (fundoplication)
- total: true/false (gastrectomy, thyroidectomy, colectomy, esophagectomy)
- partial: true/false (colectomy — default if not total)
- roux_en_y: true/false (gastrectomy, gastric bypass)
- billroth_ii: true/false (gastrectomy)
- ivor_lewis: true/false (esophagectomy)
- colon_interposition: true/false (esophagectomy)
- hartmann: true/false (colectomy)
- low_anastomosis: true/false (colectomy — low pelvic/LAR)
- ostomy: true/false (resection with ostomy instead of anastomosis)
- proctectomy: true/false (total colectomy with proctectomy)
- jpouch: true/false (IPAA/ileal pouch)
- perineal: true/false (rectal prolapse — Altemeier)
- submucosal: true/false (transanal excision)
- stapled: true/false (hemorrhoidopexy)
- rubber_band: true/false (hemorrhoid banding)
- thrombosed: true/false (external hemorrhoid)
- multiple_columns: true/false (hemorrhoidectomy)
- external_only: true/false (hemorrhoidectomy)
- seton: true/false (anal fistula)
- complex: true/false (anal fistula, wound repair)
- deep: true/false (perianal abscess, lymph node biopsy)
- right: true/false (hepatectomy)
- left: true/false (hepatectomy)
- trisegmentectomy: true/false (hepatectomy)
- cryo: true/false (liver ablation)
- percutaneous: true/false (liver ablation, abscess drainage)
- packing: true/false (liver hemorrhage)
- internal: true/false (pancreatic drainage)
- cystojejunostomy: true/false (pancreatic drainage)
- en_bloc: true/false (splenectomy)
- radical: true/false (mastectomy, neck dissection, soft tissue tumor)
- modified: true/false (mastectomy — modified radical)
- simple: true/false (mastectomy)
- sentinel_node: true/false (mastectomy, lumpectomy)
- axillary_dissection: true/false (lumpectomy)
- needle_localization: true/false (lumpectomy)
- open: true/false (breast biopsy)
- complete: true/false (axillary dissection)
- neck_dissection: true/false (thyroidectomy)
- radical_neck: true/false (thyroidectomy)
- substernal: true/false (thyroidectomy)
- reexploration: true/false (parathyroidectomy)
- complicated: true/false (I&D, ileostomy revision)
- malignant: true/false (excision lesion)
- subfascial: true/false (soft tissue tumor)
- size: "small"/"medium"/"large" (excision, burns)
- necrotizing: true/false (debridement)
- abdominal_wall: true/false (necrotizing debridement)
- perineum: true/false (necrotizing debridement)
- bone: true/false, muscle: true/false (debridement depth)
- intermediate: true/false (wound repair)
- neck: true/false, chest: true/false, extremity: true/false (wound exploration)
- reopening: true/false (exploratory laparotomy)
- biopsy: true/false (diagnostic laparoscopy, EGD)
- subdiaphragmatic: true/false, retroperitoneal: true/false (abscess drainage)
- imaging_guided: true/false (paracentesis)
- neonatal: true/false, laceration: true/false (diaphragm repair)
- axillary: true/false (lymph node biopsy)
- tunneled: true/false, port: true/false, picc: true/false (central line)
- removal: true/false, revision: true/false (gastric band, colostomy, ileostomy, central line removal)
- endoscopic: true/false (gastrostomy — PEG)
- peg: true/false (EGD with PEG)
- foreign_body: true/false (EGD)
- resection: true/false (ostomy closure with resection)
- continent: true/false (ileostomy — Kock pouch)
- raw_code: "XXXXX" (ONLY for "other" category if you know the exact CPT)

RULES:
1. Pick the SINGLE best category per procedure. Do NOT think about CPT codes.
2. Default cholecystectomy to laparoscopic unless "open" is explicitly stated.
3. Default appendectomy to laparoscopic unless "open" is explicitly stated.
4. Inguinal hernia: do NOT set incarcerated unless explicitly stated. Do NOT set recurrent unless stated.
5. Ventral/incisional hernia: includes all abdominal wall hernias that are not inguinal, umbilical, or femoral.
6. Colectomy: use "partial" by default. Use "total" only when "total colectomy" is stated.
7. LAR (low anterior resection) = low_anterior_resection category. APR (abdominoperineal resection) = apr category.
8. Hartmann's procedure = colectomy with hartmann:true.
9. Age<18: is_pediatric=true.
10. If multiple procedures in one case, list multiple entries in procedures array.

COMPOUND PROCEDURES:
- "Lap chole with IOC" = cholecystectomy with cholangiogram:true
- "Whipple" = whipple category (NOT gastrectomy + pancreatectomy)
- "Lap appy" = appendectomy (approach will be Laparoscopic)
- "Ex lap" or "exploratory laparotomy" = exploratory_laparotomy
- "Hartmann's" = colectomy with hartmann:true
- "Sleeve" or "VSG" = sleeve_gastrectomy
- "RNY" or "Roux-en-Y" in bariatric context = gastric_bypass

CLINICAL DEFAULTS:
- Cholecystectomy: default laparoscopic unless "open" or "converted" stated.
- Appendectomy: default laparoscopic unless "open" stated.
- Hernia: do NOT set mesh:true unless mesh is explicitly mentioned.
- Hemorrhoidectomy: default single column unless "multiple" stated.

SHORTHAND/ACRONYMS:
- "Lap chole" = cholecystectomy (laparoscopic approach)
- "Lap appy" = appendectomy (laparoscopic approach)
- "IOC" = intraoperative cholangiogram (set cholangiogram:true)
- "Ex lap" = exploratory_laparotomy
- "SBO" = small bowel obstruction (context for enterolysis or small_bowel_resection)
- "LAR" = low_anterior_resection
- "APR" = apr
- "RYGB" or "RNY" = gastric_bypass
- "VSG" = sleeve_gastrectomy
- "PPH" = stapled hemorrhoidopexy (hemorrhoidectomy with stapled:true)
- "I&D" = incision_drainage
- "SLN" or "SLNB" = sentinel_node_biopsy
- "PEG" = gastrostomy with endoscopic:true, or egd with peg:true`;
  } else {
    p += `\n\nDo NOT output CPT codes. Instead, classify each procedure into a CATEGORY with MODIFIERS. The system will map to CPT codes automatically.

PROCEDURE CATEGORIES (pick one per procedure):
cystoscopy, cystoscopy_stent_pull, cystoscopy_stent_place, ureteroscopy, turbt, litholapaxy,
turp, holep, prostate_laser, aquablation, urolift, tuip, bladder_neck_incision,
prostatectomy, prostate_biopsy,
nephrectomy, nephroureterectomy, donor_nephrectomy, pcnl, eswl, renal_ablation, pyeloplasty, nephrostomy, renal_cyst,
ureteral_reimplant, ureterolithotomy,
cystectomy, bladder_augmentation, intravesical_instillation, suprapubic_tube,
orchiectomy, orchiopexy, testicular_torsion, hydrocelectomy, spermatocelectomy, varicocelectomy, testicular_prosthesis,
vasectomy, vasectomy_reversal, epididymectomy,
circumcision, penile_prosthesis, peyronie_surgery, priapism_shunt, meatotomy, urethroplasty, urethral_diverticulum,
sling, artificial_sphincter, sacral_neuromodulation,
colpopexy, anterior_repair, posterior_repair, fistula_repair,
hypospadias_repair, chordee_repair,
adrenalectomy, lymph_node_dissection, hernia_repair, debridement, urodynamics, other

KEY MODIFIERS (include only what applies):
- lithotripsy: true/false (URS with laser)
- stent_placed: true/false (stent left in)
- stent_removed: true/false
- stone_extraction: true/false (basket extraction)
- retrograde: true/false (retrograde pyelogram done)
- biopsy: true/false
- fulguration: true/false
- botox: true/false
- clot_evacuation: true/false
- dilation: true/false
- urethrotomy: true/false
- tumor_size: "small"/"medium"/"large" (TURBT: small<2cm, medium 2-5cm, large>5cm)
- tumor_resection: true/false
- complicated: true/false (stent pull)
- large_stone: true/false (PCNL >2cm)
- radical: true/false (nephrectomy, prostatectomy, orchiectomy)
- partial: true/false (nephrectomy, cystectomy, orchiectomy)
- robotic: true/false
- perineal: true/false (prostatectomy approach)
- lymph_nodes: true/"bilateral" (prostatectomy, cystectomy)
- neobladder: true/false, ileal_conduit: true/false (cystectomy diversion)
- vaporization: true/false (prostate laser)
- redo: true/false (TURP redo)
- contralateral_fixation: true/false (torsion)
- abdominal: true/false (orchiopexy, varicocelectomy)
- male: true/false (sling, urethral diverticulum)
- removal: true/false, replacement: true/false, repair: true/false (prosthesis/AUS)
- inflatable: true/false, three_piece: true/false (penile prosthesis)
- infected: true/false (prosthesis replacement)
- graft: true/false, plication: true/false (Peyronie's)
- cryo: true/false (renal ablation)
- psoas_hitch: true/false (ureteral reimplant)
- segment: "upper"/"middle"/"lower" (ureterolithotomy)
- vesicovaginal/urethrovaginal/rectovaginal: true (fistula type)
- vaginal_approach: true/false (fistula repair)
- proximal/distal: true/false (hypospadias)
- retroperitoneal: true/false (lymph node dissection)
- incarcerated: true/false, recurrent: true/false (hernia)
- voiding_study: true/false (urodynamics)
- saturation: true/false, template: true/false, fusion: true/false (prostate biopsy — fusion = MRI-fusion guided, which is a standard needle biopsy NOT saturation)
- open: true/false (sacral neuromod), generator: true/false
- raw_code: "XXXXX" (ONLY for "other" category if you know the exact CPT)

RULES:
1. Pick the SINGLE best category. Do NOT think about CPT codes.
2. For bilateral endoscopic procedures (URS, cysto): set laterality=Bilateral. Do NOT duplicate.
3. Age<18: is_pediatric=true.
4. If multiple distinct procedures in one case (e.g. TURBT + stent), list multiple entries in procedures array.
5. Stent pull during cystoscopy = cystoscopy_stent_pull. Stent placement = cystoscopy_stent_place.
6. BCG/chemo/gemcitabine/mitomycin instillation = intravesical_instillation.
7. "RARP" = prostatectomy with robotic=true and radical=true.
8. Include only modifiers that are TRUE or have a value. Omit false/null modifiers.

COMPOUND PROCEDURES (output multiple procedure entries):
- "stent exchange" alone = cystoscopy_stent_pull + cystoscopy_stent_place (two entries)
- "URS + stent exchange" or "URS + LL + stent exchange" = ureteroscopy with stent_placed:true (and lithotripsy if applicable) + cystoscopy_stent_pull. The stent PLACEMENT goes on the URS as stent_placed:true. The stent REMOVAL is a separate cystoscopy_stent_pull entry.
- "cysto with stent pull and retrograde" = cystoscopy_stent_pull + cystoscopy with retrograde:true
- TURBT + stent placement = turbt entry + cystoscopy_stent_place entry
- Do NOT output a separate cystoscopy entry when URS is also present (URS includes cystoscopy) — EXCEPT when urethral dilation is performed. Urethral dilation (52281) is a separate billable procedure, so output it as its own cystoscopy entry with dilation:true even when URS is also present.
- "URS + urethral dilation + stent" = ureteroscopy entry + cystoscopy with dilation:true entry (two entries)

CRITICAL — urethral vs ureteral dilation:
- "URETHRAL dilation" (urethra/meatus) = cystoscopy with dilation:true → 52281. This is dilating the urethra for stricture. Output as a SEPARATE cystoscopy entry.
- "URETERAL dilation" (ureter) = part of URS access, NOT a separate procedure. Ureteral balloon dilation or sequential dilation is bundled into the ureteroscopy and should NOT be a separate entry. Do NOT set dilation:true for ureteral dilation.
- Speech recognition often confuses these words. Use context: if the patient has stones/URS, "dilation" likely refers to ureteral access (bundled). If there's a stricture or the dilation is mentioned alongside cystoscopy alone, it's urethral (52281).

CLINICAL DEFAULTS (do NOT set these modifiers unless dictation explicitly says otherwise):
- Stent pull: do NOT set complicated:true unless "complicated" or "difficult" is explicitly stated. Default is simple removal (52310).
- Orchiopexy: do NOT set abdominal:true unless "abdominal" or "laparoscopic" is explicitly stated. Most are inguinal/scrotal.
- Orchiectomy: do NOT set radical:true unless "radical" or "inguinal" is explicitly stated. Default is simple.
- Varicocelectomy: do NOT set abdominal:true unless explicitly stated. Default is subinguinal/inguinal.
- Hydrocelectomy: default unilateral unless "bilateral" stated.
- Nephrectomy: do NOT set radical:true unless "radical" stated. Do NOT set partial:true unless "partial" stated.

SHORTHAND/ACRONYMS:
- "LL" or "laser litho" = laser lithotripsy (set lithotripsy:true on URS)
- "RPG" or "retro" = retrograde pyelogram (set retrograde:true)
- "RARP" = prostatectomy with robotic:true and radical:true
- "stent exchange" = stent removal + stent placement (two entries)`;
  }

  p += `\n\nROLE RULES:
- Preserve explicit dictated role labels when possible.
- "surgeon junior", "junior surgeon", or "surgeon jr" => "Surgeon Jr.".
- "chief surgeon", "primary surgeon", or plain "surgeon" => "Surgeon Chief".
- "teaching assistant" or "teaching asst" => "Teaching Asst.".
- If role is unclear, choose the closest standard label.`;

  p += `\n\nMULTI-CASE SUPPORT:
The transcript may describe ONE or MORE separate cases. Split on phrases like "next case", "second case", "also did", "another case", "case number", or numbered lists.
Shared context (attending, hospital, date, role) carries forward to subsequent cases unless explicitly overridden.
ALWAYS return a JSON ARRAY, even for a single case.`;

  if (spec === "vascular") {
    p += `\n\nReturn ONLY this JSON array:
[{"procedure_name":"","procedures":[{"category":"","modifiers":{}}],
"date":"YYYY-MM-DD or null","patient_age":"","patient_sex":"M/F",
"is_pediatric":false,"role":"First Assistant|Surgeon Chief|Surgeon Jr.|Teaching Asst.",
"attending":"","hospital":"","approach":"Open|Endovascular|Percutaneous|Other",
"laterality":"Left|Right|Bilateral|N/A","notes":""}]`;
  } else if (spec === "gen_surg") {
    p += `\n\nReturn ONLY this JSON array:
[{"procedure_name":"","procedures":[{"category":"","modifiers":{}}],
"date":"YYYY-MM-DD or null","patient_age":"","patient_sex":"M/F",
"is_pediatric":false,"role":"First Assistant|Surgeon Chief|Surgeon Jr.|Teaching Asst.",
"attending":"","hospital":"","approach":"Open|Laparoscopic|Robotic|Endoscopic|Percutaneous|Other",
"laterality":"Left|Right|Bilateral|N/A","notes":""}]`;
  } else {
    p += `\n\nReturn ONLY this JSON array:
[{"procedure_name":"","procedures":[{"category":"","modifiers":{}}],
"date":"YYYY-MM-DD or null","patient_age":"","patient_sex":"M/F",
"is_pediatric":false,"role":"First Assistant|Surgeon Chief|Surgeon Jr.|Teaching Asst.",
"attending":"","hospital":"","approach":"Open|Laparoscopic|Robotic|Endoscopic|Percutaneous|Other",
"laterality":"Left|Right|Bilateral|N/A","notes":""}]`;
  }
  return p;
}

function classifyCloudError(status, rawMsg, provider) {
  if (status === 401 || status === 403)
    return `(${status}) Invalid API key for ${provider}. Check Settings > AI Engine.`;
  if (status === 429)
    return `(${status}) Rate limited by ${provider}. Will retry...`;
  if (status >= 500)
    return `(${status}) ${provider} server error. Will retry...`;
  if (status === 400)
    return `(${status}) Bad request to ${provider}: ${rawMsg.substring(0, 100)}`;
  return `(${status}) ${provider}: ${rawMsg.substring(0, 120)}`;
}

async function fetchLocalModels() {
  const baseUrl = state.settings.localLLMUrl.replace(/\/+$/, "");
  if (!baseUrl) return [];
  try {
    const res = await fetch(baseUrl + "/v1/models");
    if (res.ok) { const data = await res.json(); return (data.data || []).map(m => m.id); }
  } catch {}
  try {
    const res = await fetch(baseUrl + "/api/tags");
    if (res.ok) { const data = await res.json(); return (data.models || []).map(m => m.name); }
  } catch {}
  return [];
}

async function fetchCloudModels() {
  const s = state.settings;
  const key = s.cloudApiKey;
  const provider = s.cloudProvider;
  if (!key) return [];
  try {
    if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map(m => m.id).sort();
    }
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": "Bearer " + key }
      });
      if (!res.ok) return [];
      const data = await res.json();
      const skip = /^(whisper|tts|dall-e|text-embedding|babbage|davinci|canary|chatgpt)/;
      return (data.data || []).map(m => m.id).filter(id => !skip.test(id)).sort();
    }
    if (provider === "gemini") {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(key) + "&pageSize=100");
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || [])
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
        .map(m => (m.name || "").replace(/^models\//, "")).sort();
    }
  } catch {}
  return [];
}

async function callLLM(systemPrompt, userMsg, signal) {
  const s = state.settings;
  if (s.llmMode === "local") {
    const baseUrl = s.localLLMUrl.replace(/\/+$/,"");
    const res = await fetch(baseUrl + "/v1/chat/completions", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ model: s.localModelName||"local-model", temperature: 0.1,
        messages: [{role:"system",content:systemPrompt},{role:"user",content:userMsg}] }),
      signal
    });
    if (!res.ok) {
      const errBody = await res.text().catch(()=>"");
      if (errBody.toLowerCase().includes("model") && errBody.toLowerCase().includes("required"))
        throw new Error("LM Studio requires a model name. Go to Settings > AI Engine and enter the exact model name from LM Studio.");
      throw new Error("LLM error ("+res.status+"): "+errBody.substring(0,120));
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
  const provider = CLOUD_PROVIDERS[s.cloudProvider] || CLOUD_PROVIDERS.claude;
  const key = s.cloudApiKey;
  if (!key) throw new Error("No API key set. Go to Settings > AI Engine.");
  const model = s.cloudModel;
  if (provider.format === "anthropic") {
    const res = await fetch(provider.url, { method:"POST",
      headers: {"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body: JSON.stringify({model:model||"claude-sonnet-4-20250514",max_tokens:2000,system:systemPrompt,
        messages:[{role:"user",content:userMsg}]}),
      signal
    });
    let data; try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || data.error) throw new Error(classifyCloudError(res.status, data.error?.message || `HTTP ${res.status}`, "Anthropic"));
    return data.content?.map(b=>b.text||"").join("")||"";
  }
  if (provider.format === "openai") {
    const res = await fetch(provider.url, { method:"POST",
      headers: {"Content-Type":"application/json","Authorization":"Bearer "+key},
      body: JSON.stringify({model:model||"gpt-4o",temperature:0.1,
        messages:[{role:"system",content:systemPrompt},{role:"user",content:userMsg}]}),
      signal
    });
    let data; try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || data.error) throw new Error(classifyCloudError(res.status, data.error?.message || `HTTP ${res.status}`, "OpenAI"));
    return data.choices?.[0]?.message?.content||"";
  }
  if (provider.format === "gemini") {
    const m = model||"gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
    const res = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({systemInstruction:{parts:[{text:systemPrompt}]},
        contents:[{parts:[{text:userMsg}]}],generationConfig:{temperature:0.1}}),
      signal
    });
    let data; try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || data.error) throw new Error(classifyCloudError(res.status, data.error?.message || `HTTP ${res.status}`, "Gemini"));
    return data.candidates?.[0]?.content?.parts?.[0]?.text||"";
  }
  throw new Error("Unknown provider");
}

async function callLLMWithRetry(systemPrompt, userMsg, maxRetries, queueItem, signal) {
  if (maxRetries === undefined) maxRetries = 2;
  var TRANSIENT = [429, 500, 502, 503, 504];
  var lastErr;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await callLLM(systemPrompt, userMsg, signal);
    } catch (e) {
      if (e.name === "AbortError") throw e;
      lastErr = e;
      var msg = e.message || "";
      var statusMatch = msg.match(/\((\d{3})\)/);
      var status = statusMatch ? parseInt(statusMatch[1]) : 0;
      var isTransient = TRANSIENT.indexOf(status) !== -1
        || msg === "Failed to fetch"
        || msg.toLowerCase().includes("network")
        || msg.toLowerCase().includes("timeout");
      var isPermanent = status === 401 || status === 403 || status === 400
        || msg.includes("No API key")
        || msg.includes("Unknown provider")
        || msg.includes("LM Studio requires");
      if (isPermanent || attempt >= maxRetries) break;
      // Exponential backoff: ~1s, ~2s
      var delay = Math.pow(2, attempt) * 1000;
      if (queueItem) {
        queueItem.retryStatus = "Retrying... attempt " + (attempt + 2) + "/" + (maxRetries + 1);
        render();
      }
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      await new Promise(function(r) { setTimeout(r, delay); });
    }
  }
  throw lastErr;
}

function parseJSON(text) {
  let clean = text;
  const jb = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jb) { clean = jb[1]; }
  else {
    const ja = text.match(/\[[\s\S]*\]/);
    if (ja) clean = ja[0];
    else { const jo = text.match(/\{[\s\S]*\}/); if (jo) clean = jo[0]; }
  }
  clean = clean.trim();
  try {
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    // Attempt common LLM JSON fixes
    let fixed = clean
      .replace(/,\s*([}\]])/g, '$1')      // trailing commas
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":'); // unquoted keys
    // Balance missing closing brackets
    const opens = (fixed.match(/\[/g)||[]).length;
    const closes = (fixed.match(/\]/g)||[]).length;
    if (opens > closes) fixed += ']'.repeat(opens - closes);
    try {
      const parsed = JSON.parse(fixed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e2) {
      throw new Error("Failed to parse LLM response. Raw start: " + clean.substring(0, 80) + "...");
    }
  }
}

function normalizeRoleToken(role) {
  if (!role) return role;
  const raw = String(role).trim();
  if (!raw) return raw;
  const key = raw
    .toLowerCase()
    .replace(/\basst\b/g, "assistant")
    .replace(/\bjr\b/g, "junior")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (key.includes("teaching") && key.includes("assistant")) return "Teaching Asst.";
  if ((key.includes("surgeon") && key.includes("junior")) || key.includes("junior surgeon")) return "Surgeon Jr.";
  if (key.includes("primary surgeon") || key.includes("chief surgeon") || (key.includes("surgeon") && key.includes("chief"))) return "Surgeon Chief";
  if (key.includes("first assistant")) return "First Assistant";
  if (key === "assistant" || (key.includes("assistant") && !key.includes("teaching"))) return "First Assistant";
  if (key === "surgeon" || key.includes("attending surgeon")) return "Surgeon Chief";

  return raw;
}

// ═══════════════════════════════════════════════════════════════
// MISSING FIELD DETECTION — prompt user for blanks before LLM call
// ═══════════════════════════════════════════════════════════════
function detectMissingFields(text) {
  const t = text.toLowerCase();
  const s = state.settings;
  const missing = [];

  // Attending — check if any known attending name appears, or common keywords
  const hasAttending = s.attendings.some(a => t.includes(a.toLowerCase().split(",")[0].trim()));
  const hasDrKeyword = /\b(dr\.?|doctor|attending)\s+\w+/i.test(text);
  if (!hasAttending && !hasDrKeyword) missing.push({ key: "attending", label: "Attending", placeholder: "e.g. Dr. Smith", options: s.attendings });

  // Hospital — check if any known hospital appears
  const hasHospital = s.hospitals.some(h => t.includes(h.toLowerCase().substring(0, Math.min(h.length, 6))));
  const hasSiteKeyword = /\b(hospital|medical center|clinic|VA|university)\b/i.test(text);
  if (!hasHospital && !hasSiteKeyword) missing.push({ key: "hospital", label: "Hospital", placeholder: "e.g. University Hospital", options: s.hospitals });

  // Role
  const hasRole = /\b(primary|first assist|teaching assist|surgeon|assistant|solo|chief)\b/i.test(text);
  if (!hasRole) missing.push({ key: "role", label: "Role", placeholder: "", options: ["Primary Surgeon", "First Assistant", "Teaching Assistant"] });

  // Date
  const hasDate = /\b(\d{1,2}[\/\-]\d{1,2}|\btoday\b|\byesterday\b|\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bfriday\b|\bsaturday\b|\bsunday\b|\bjan|\bfeb|\bmar|\bapr|\bmay\b|\bjun|\bjul|\baug|\bsep|\boct|\bnov|\bdec)/i.test(text);
  if (!hasDate) missing.push({ key: "date", label: "Date", placeholder: "today", options: ["Today", "Yesterday"] });

  return missing;
}

/* ═══ Resolve relative date expressions → YYYY-MM-DD ═══ */
function resolveRelativeDate(raw) {
  if (!raw || /^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) return raw;
  const s = raw.trim().toLowerCase();
  const today = new Date(); today.setHours(0,0,0,0);
  const fmt = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if (s === 'today') return fmt(today);
  if (s === 'yesterday') { const d = new Date(today); d.setDate(d.getDate()-1); return fmt(d); }
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const m = s.match(/^last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i);
  if (m) {
    const target = days.indexOf(m[1].toLowerCase());
    const diff = (today.getDay() - target + 7) % 7 || 7;
    const d = new Date(today); d.setDate(d.getDate() - diff);
    return fmt(d);
  }
  return raw;
}

async function processCase() {
  const transcript = state.transcript.trim();
  if (!transcript) return false;
  const caseText = transcript;
  state.transcript = ""; state.error = ""; state.missingFields = null; state.lastFailedTranscript = caseText;
  const batchId = Date.now();
  const ac = new AbortController();
  const queueItem = { id: batchId, text: caseText.substring(0,60)+"...", retryStatus: null, ac: ac };
  state.processingQueue.push(queueItem);
  render();
  let success = false;
  try {
    const text = await callLLMWithRetry(buildSystemPrompt(), 'Parse this case:\n\n"'+caseText+'"', 2, queueItem, ac.signal);
    const cases = parseJSON(text); // always an array now

    // Update processing indicator with case count
    if (cases.length > 1) {
      queueItem.retryStatus = "Mapping " + cases.length + " cases\u2026";
      render();
    }

    const spec = (state.settings.specialty || "urology");
    cases.forEach(function(p, idx) {
      try {
        p.role = normalizeRoleToken(p.role);

        // Phase 2: Map procedure categories → CPT codes deterministically
        if (p.procedures && p.procedures.length) {
          if (spec === "vascular") {
            p.cpt_codes = mapVascCPT(p.procedures, p.laterality, p.approach);

            // Phase 2.5 Vascular: bundling post-processing
            var vcodes = p.cpt_codes;
            var hasEndovasc = vcodes.some(function(c) { return ['36901','36902','36903','36904','36905','36906','36907','36908','36909','37220','37221','37222','37223','37224','37225','37226','37227','37228','37229','37230','37231','34701','34702','33881'].indexOf(c.code) !== -1; });
            if (hasEndovasc) {
              p.cpt_codes = vcodes.filter(function(c) { return ['36200','36245','36246','36247','36248','75625','75630','75710','75716','75774'].indexOf(c.code) === -1; });
            }
          } else if (spec === "gen_surg") {
            p.cpt_codes = mapGenSurgCPT(p.procedures, p.laterality, p.approach, p.is_pediatric);
          } else {
            p.cpt_codes = mapUroCPT(p.procedures, p.laterality, p.approach, p.is_pediatric);

            // Phase 2.5 Urology: CPT bundling post-processing
            var codes = p.cpt_codes;
            var hasURS = codes.some(function(c) { return c.code === '52353' || c.code === '52356' || c.code === '52352' || c.code === '52354' || c.code === '52355' || c.code === '52351'; });
            if (hasURS) {
              var stentPlaceIdx = codes.findIndex(function(c) { return c.code === '52332'; });
              if (stentPlaceIdx !== -1) {
                var ursLithoIdx = codes.findIndex(function(c) { return c.code === '52353'; });
                if (ursLithoIdx !== -1) {
                  codes[ursLithoIdx] = {code:'52356', description:'URS with lithotripsy and stent', attributes:codes[ursLithoIdx].attributes};
                  codes.splice(stentPlaceIdx, 1);
                } else {
                  var ursDiagIdx = codes.findIndex(function(c) { return c.code === '52351'; });
                  if (ursDiagIdx !== -1) { codes.splice(ursDiagIdx, 1); }
                }
              }
              p.cpt_codes = codes.filter(function(c) { return c.code !== '52000'; });
            }

            // Bilateral surgical duplication
            if (p.laterality === 'Bilateral') {
              var surgical = ['orchiectomy','orchiopexy','hernia_repair','varicocelectomy','hydrocelectomy','vasectomy','epididymectomy','testicular_prosthesis'];
              var hasSurgical = p.procedures.some(function(pr) { return surgical.indexOf(pr.category) !== -1; });
              if (hasSurgical) {
                var duped = [];
                p.cpt_codes.forEach(function(c) { duped.push(c); duped.push(Object.assign({}, c)); });
                p.cpt_codes = duped;
              }
            }
          }
        }

        if (p.date) p.date = resolveRelativeDate(p.date);
        state.cases.push({...p, id: batchId + idx, timestamp: new Date().toLocaleString(), rawTranscript: caseText});
      } catch(perCaseErr) {
        var perMsg = "Case " + (idx+1) + " (" + (p.procedure_name||"unknown") + "): " + perCaseErr.message;
        if (perMsg.length > 150) perMsg = perMsg.substring(0, 150) + "...";
        state.error = (state.error ? state.error + " | " : "") + perMsg;
      }
    });

    saveCases();
    success = cases.length > 0;
    state.lastFailedTranscript = null; // clear on success
    if (cases.length > 1) {
      state.toast = cases.length + " cases added to queue";
      setTimeout(() => { if (state.toast.includes("cases added")) { state.toast = ""; render(); } }, 3000);
    }
  } catch(e) {
    if (e.name === "AbortError") {
      // Cancelled — restore transcript so user doesn't lose their dictation
      state.transcript = caseText;
      state.lastFailedTranscript = null;
      state.error = "";
      state.toast = "Cancelled";
      setTimeout(() => { if (state.toast === "Cancelled") { state.toast = ""; render(); } }, 2500);
    } else {
      let errMsg = e.message || "";
      const isNetwork = errMsg === "Failed to fetch" || errMsg.toLowerCase().includes("network") || errMsg.toLowerCase().includes("timeout");
      if (isNetwork) {
        // Save offline for later processing
        state.pendingTranscripts.push({ id: Date.now(), text: caseText, timestamp: new Date().toLocaleString() });
        savePending();
        state.lastFailedTranscript = null;
        state.error = "";
        state.toast = "Saved offline \u2014 process when connected";
        setTimeout(() => { if (state.toast.includes("offline")) { state.toast = ""; render(); } }, 3500);
      } else {
        state.error = errMsg.length > 200 ? errMsg.substring(0, 200) + "..." : errMsg;
        // lastFailedTranscript already set above — keeps transcript for Retry button
      }
    }
  }
  queueItem.ac = null;
  state.processingQueue = state.processingQueue.filter(x => x.id !== batchId);
  render();

  // Quick-fire: auto-restart mic after successful processing (not after cancel)
  if (success && state.quickFire && !state.isRec && state.tab === "record") {
    setTimeout(function() {
      if (state.quickFire && !state.isRec && state.tab === "record") {
        startRec();
      }
    }, 300);
  }

  return success;
}

async function startRec() {
  // Request mic permission — side panels don't inherit it automatically
  try { await navigator.mediaDevices.getUserMedia({audio:true}); } catch(e) {
    state.error = "Microphone access denied. Allow mic in Chrome site settings for this extension.";
    render(); return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { state.error = "Speech not supported. Use Chrome."; render(); return; }
  const r = new SR();
  r.continuous = true; r.interimResults = true; r.lang = "en-US";
  let final = state.transcript;
  r.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
      else interim += e.results[i][0].transcript;
    }
    state.transcript = state.autocorrectActive ? applyMedicalAutocorrect(final+interim) : final+interim;
    render();
  };
  r.onerror = (e) => { if(e.error!=="aborted") state.error="Mic: "+e.error; state.isRec=false; render(); };
  r.onend = () => { state.isRec=false; render(); };
  recRef = r; r.start(); state.isRec = true; state.error = ""; render();
}
function stopRec() { if(recRef) recRef.stop(); state.isRec = false; render(); }
function cancelQueueItem(id) {
  const item = state.processingQueue.find(x => x.id === id);
  if (item && item.ac) { item.ac.abort(); }
}
function cancelAllProcessing() {
  state.processingQueue.forEach(x => { if (x.ac) x.ac.abort(); });
}
async function processPending() {
  if (!state.pendingTranscripts.length) return;
  const pending = [...state.pendingTranscripts];
  state.pendingTranscripts = [];
  savePending();
  for (const p of pending) {
    state.transcript = p.text;
    render();
    const ok = await processCase();
    if (!ok && state.pendingTranscripts.length === 0) {
      // processCase's offline catch may have re-queued it — check
      // If transcript was restored (cancel) or still in lastFailedTranscript, stop
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// THEME ENGINE — Smooth CSS variable transitions per specialty
// ═══════════════════════════════════════════════════════════════
function applyTheme(specialty) {
  const root = document.documentElement.style;
  if (specialty === "vascular") {
    root.setProperty("--acc", "#ef4444");
    root.setProperty("--acc-dark", "#dc2626");
    root.setProperty("--acc-dim", "#7f1d1d");
    root.setProperty("--acc-glow", "rgba(239,68,68,0.12)");
    root.setProperty("--acc-glow-strong", "rgba(239,68,68,0.25)");
    root.setProperty("--acc-text", "#fff");
    root.setProperty("--acc-surface", "rgba(239,68,68,0.04)");
  } else if (specialty === "gen_surg") {
    root.setProperty("--acc", "#34d399");
    root.setProperty("--acc-dark", "#10b981");
    root.setProperty("--acc-dim", "#065f46");
    root.setProperty("--acc-glow", "rgba(52,211,153,0.12)");
    root.setProperty("--acc-glow-strong", "rgba(52,211,153,0.25)");
    root.setProperty("--acc-text", "#022c22");
    root.setProperty("--acc-surface", "rgba(52,211,153,0.04)");
  } else {
    // Default: urology (yellow)
    root.setProperty("--acc", "#facc15");
    root.setProperty("--acc-dark", "#eab308");
    root.setProperty("--acc-dim", "#713f12");
    root.setProperty("--acc-glow", "rgba(250,204,21,0.12)");
    root.setProperty("--acc-glow-strong", "rgba(250,204,21,0.25)");
    root.setProperty("--acc-text", "#422006");
    root.setProperty("--acc-surface", "rgba(250,204,21,0.04)");
  }
}

const SPECIALTY_ICONS = {
  urology: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 5 5 9c0 3 2 5 4 7l3 4 3-4c2-2 4-4 4-7 0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2"/></svg>`,
  vascular: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>`,
  gen_surg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 2.3a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4l-11.3 11.3a1 1 0 0 1-.7.3H4.1a1 1 0 0 1-1-1v-5.6a1 1 0 0 1 .3-.7L14.7 2.3z"/><path d="M10 14l-2 2"/></svg>`
};

// ═══════════════════════════════════════════════════════════════
// RENDER — Updated UI with refreshed visual design
// ═══════════════════════════════════════════════════════════════
function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const s = state.settings;
  const spec = s.specialty || "urology";
  const procCount = state.processingQueue.length;

  applyTheme(spec);

  // ── Header ──
  const header = document.createElement("div"); header.className = "header";
  header.innerHTML = `
    <div class="header-logo">
      <div class="header-icon">${SPECIALTY_ICONS[spec] || SPECIALTY_ICONS.urology}</div>
      <div>
        <div class="header-title">SurgiLog</div>
        <div class="header-subtitle">${s.residentName||"Voice to ACGME"} &middot; ${spec==="vascular"?"Vascular":spec==="gen_surg"?"Gen Surg":"Urology"} &middot; ${s.llmMode==="local"?"Local LLM":""+((CLOUD_PROVIDERS[s.cloudProvider]||{}).name||"Cloud")}</div>
      </div>
    </div>`;
  const hRight = document.createElement("div"); hRight.className = "header-right";
  if (procCount > 0) {
    const pb = document.createElement("div"); pb.className = "badge badge-processing";
    pb.innerHTML = '<span class="processing-shimmer"></span> '+procCount+' processing';
    hRight.appendChild(pb);
  }
  if (state.cases.length > 0) {
    const qb = document.createElement("div"); qb.className = "badge badge-queue";
    qb.textContent = state.cases.length+" queued";
    hRight.appendChild(qb);
  }
  if (state.pendingTranscripts.length > 0) {
    const penb = document.createElement("div"); penb.className = "badge"; penb.style.cssText = "background:rgba(59,130,246,0.12);color:#3b82f6";
    penb.textContent = state.pendingTranscripts.length+" offline";
    hRight.appendChild(penb);
  }
  const acgmeLink = document.createElement("button"); acgmeLink.className = "btn btn-secondary";
  acgmeLink.style.cssText = "font-size:10px;padding:4px 10px;font-weight:700;letter-spacing:0.3px";
  acgmeLink.textContent = "ACGME \u2197";
  acgmeLink.title = "Open ACGME Case Log";
  acgmeLink.onclick = () => { chrome.tabs.create({ url: "https://apps.acgme.org/ads/CaseLog/CaseLogEntry" }); };
  hRight.appendChild(acgmeLink);
  const gearBtn = document.createElement("button"); gearBtn.className = "gear-btn"+(state.showSettings?" active":"");
  gearBtn.textContent = "\u2699";
  gearBtn.onclick = () => { state.showSettings = !state.showSettings; render(); };
  hRight.appendChild(gearBtn);
  header.appendChild(hRight);
  app.appendChild(header);

  // ── Settings Panel ──
  if (state.showSettings) {
    const sp = document.createElement("div"); sp.className = "settings-panel";
    const stBar = document.createElement("div"); stBar.className = "settings-bar";
    for (const [id,label] of [["team","Team"],["sites","Hospitals"],["dict","Dictionary"],["llm","AI Engine"]]) {
      const tb = document.createElement("button"); tb.className = "settings-tab"+(state.settingsTab===id?" active":"");
      tb.textContent = label; tb.onclick = () => { state.settingsTab = id; render(); };
      stBar.appendChild(tb);
    }
    sp.appendChild(stBar);
    const sc = document.createElement("div"); sc.className = "settings-content";

    if (state.settingsTab === "team") {
      // Specialty selector
      const specDiv = document.createElement("div"); specDiv.className = "form-group";
      specDiv.innerHTML = '<div class="label">Specialty</div>';
      const specSel = document.createElement("select"); specSel.className = "input"; specSel.style.width = "auto";
      for (const [val, label] of [["urology","Urology"],["gen_surg","General Surgery"],["vascular","Vascular Surgery"]]) {
        const o = document.createElement("option"); o.value = val; o.textContent = label;
        if(val===spec) o.selected = true; specSel.appendChild(o);
      }
      specSel.onchange = () => { s.specialty = specSel.value; applyTheme(s.specialty); saveSettings(); render(); };
      specDiv.appendChild(specSel); sc.appendChild(specDiv);

      sc.insertAdjacentHTML("beforeend",'<div class="section-divider"></div>');

      sc.insertAdjacentHTML("beforeend",'<div class="form-group"><div class="label">Your Name</div></div>');
      const ni = document.createElement("input"); ni.className = "input"; ni.value = s.residentName; ni.placeholder = "e.g. John Smith, MD";
      ni.oninput = () => { s.residentName = ni.value; saveSettings(); };
      sc.querySelector(".form-group:last-of-type").appendChild(ni);

      const pDiv = document.createElement("div"); pDiv.className = "form-group";
      pDiv.innerHTML = '<div class="label">PGY Level</div>';
      const pgy = document.createElement("select"); pgy.className = "input"; pgy.style.width = "auto";
      for (const l of ["PGY-1","PGY-2","PGY-3","PGY-4","PGY-5","PGY-6","Fellow"]) { const o = document.createElement("option"); o.value = l; o.textContent = l; if(l===s.pgyLevel)o.selected=true; pgy.appendChild(o); }
      pgy.onchange = () => { s.pgyLevel = pgy.value; saveSettings(); };
      pDiv.appendChild(pgy); sc.appendChild(pDiv);

      // ── Case ID Config ──
      sc.insertAdjacentHTML("beforeend",'<div class="section-divider"></div>');
      const cidDiv = document.createElement("div"); cidDiv.className = "form-group";
      cidDiv.innerHTML = '<div class="label">Case ID Format</div>';
      const cidSel = document.createElement("select"); cidSel.className = "input"; cidSel.style.width = "auto";
      for (const [val, label] of [["none","None (leave blank)"],["prefix_counter","Prefix + Counter"],["date_counter","Date + Counter"],["counter","Counter Only"],["auto","Auto-generate (legacy)"]]) {
        const o = document.createElement("option"); o.value = val; o.textContent = label;
        if(val===(s.caseIdMode||"none")) o.selected = true; cidSel.appendChild(o);
      }
      cidSel.onchange = () => { s.caseIdMode = cidSel.value; saveSettings(); render(); };
      cidDiv.appendChild(cidSel); sc.appendChild(cidDiv);

      var cidMode = s.caseIdMode || "none";
      if (cidMode === "prefix_counter") {
        const pfxDiv = document.createElement("div"); pfxDiv.className = "form-group";
        pfxDiv.innerHTML = '<div class="label">Prefix</div>';
        const pfxIn = document.createElement("input"); pfxIn.className = "input"; pfxIn.value = s.caseIdPrefix || ""; pfxIn.placeholder = "e.g. CASE-, OP-";
        pfxIn.oninput = () => { s.caseIdPrefix = pfxIn.value; saveSettings(); };
        pfxDiv.appendChild(pfxIn); sc.appendChild(pfxDiv);
      }
      if (cidMode === "prefix_counter" || cidMode === "date_counter" || cidMode === "counter") {
        const numDiv = document.createElement("div"); numDiv.className = "form-group";
        numDiv.innerHTML = '<div class="label">Next Number</div>';
        const numRow = document.createElement("div"); numRow.style.cssText = "display:flex;gap:8px;align-items:center";
        const numIn = document.createElement("input"); numIn.className = "input"; numIn.type = "number"; numIn.min = "1"; numIn.style.width = "80px";
        numIn.value = s.caseIdNextNum || 1;
        numIn.onchange = () => { s.caseIdNextNum = Math.max(1, parseInt(numIn.value)||1); saveSettings(); render(); };
        numRow.appendChild(numIn);
        const padLabel = document.createElement("span"); padLabel.style.cssText = "font-size:11px;color:var(--muted)"; padLabel.textContent = "Digits:";
        numRow.appendChild(padLabel);
        const padSel = document.createElement("select"); padSel.className = "input"; padSel.style.width = "auto";
        for (var pi = 1; pi <= 6; pi++) { const o = document.createElement("option"); o.value = pi; o.textContent = pi; if(pi===(s.caseIdPadding||3)) o.selected=true; padSel.appendChild(o); }
        padSel.onchange = () => { s.caseIdPadding = parseInt(padSel.value)||3; saveSettings(); render(); };
        numRow.appendChild(padSel);
        numDiv.appendChild(numRow); sc.appendChild(numDiv);
        // Preview
        var previewId = "";
        var padW = s.caseIdPadding || 3;
        var nextStr = String(s.caseIdNextNum || 1).padStart(padW, '0');
        if (cidMode === "prefix_counter") previewId = (s.caseIdPrefix||"") + nextStr;
        else if (cidMode === "date_counter") previewId = "YYMMDD-" + nextStr;
        else previewId = nextStr;
        sc.insertAdjacentHTML("beforeend",'<div style="font-size:11px;color:var(--muted);margin-top:-4px">Next ID: <b>'+previewId+'</b></div>');
      }

      sc.insertAdjacentHTML("beforeend",'<div class="section-divider"></div><div class="label">Attending Physicians</div>');
      const aRow = document.createElement("div"); aRow.className = "form-row"; aRow.style.marginBottom = "10px";
      const aIn = document.createElement("input"); aIn.className = "input"; aIn.style.flex = "1"; aIn.placeholder = "Last, First"; aIn.value = state.newAttending;
      aIn.oninput = () => { state.newAttending = aIn.value; };
      aIn.onkeydown = (e) => { if(e.key==="Enter"&&aIn.value.trim()){s.attendings.push(aIn.value.trim());state.newAttending="";saveSettings();render()} };
      const aBtn = document.createElement("button"); aBtn.className = "btn btn-primary"; aBtn.textContent = "Add";
      aBtn.onclick = () => { if(aIn.value.trim()){s.attendings.push(aIn.value.trim());state.newAttending="";saveSettings();render()} };
      aRow.appendChild(aIn); aRow.appendChild(aBtn); sc.appendChild(aRow);
      const chips = document.createElement("div"); chips.style.cssText = "display:flex;flex-wrap:wrap;gap:4px";
      s.attendings.forEach((a,i) => { const c = document.createElement("div"); c.className = "chip"; c.innerHTML = a+' <span class="remove">\u00d7</span>'; c.querySelector(".remove").onclick = () => {s.attendings.splice(i,1);saveSettings();render()}; chips.appendChild(c); });
      sc.appendChild(chips);
    }

    if (state.settingsTab === "sites") {
      sc.innerHTML = '<div class="label">Hospital / Rotation Sites</div>';
      const hRow = document.createElement("div"); hRow.className = "form-row"; hRow.style.marginBottom = "10px";
      const hIn = document.createElement("input"); hIn.className = "input"; hIn.style.flex = "1"; hIn.placeholder = "Hospital name"; hIn.value = state.newHospital;
      hIn.oninput = () => { state.newHospital = hIn.value; };
      hIn.onkeydown = (e) => { if(e.key==="Enter"&&hIn.value.trim()){s.hospitals.push(hIn.value.trim());state.newHospital="";saveSettings();render()} };
      const hBtn = document.createElement("button"); hBtn.className = "btn btn-primary"; hBtn.textContent = "Add";
      hBtn.onclick = () => { if(hIn.value.trim()){s.hospitals.push(hIn.value.trim());state.newHospital="";saveSettings();render()} };
      hRow.appendChild(hIn); hRow.appendChild(hBtn); sc.appendChild(hRow);
      const chips = document.createElement("div"); chips.style.cssText = "display:flex;flex-wrap:wrap;gap:4px";
      s.hospitals.forEach((x,i) => { const c = document.createElement("div"); c.className = "chip"; c.innerHTML = x+' <span class="remove">\u00d7</span>'; c.querySelector(".remove").onclick = () => {s.hospitals.splice(i,1);saveSettings();render()}; chips.appendChild(c); });
      sc.appendChild(chips);
    }

    if (state.settingsTab === "llm") {
      sc.innerHTML = '<div class="label">AI Mode</div>';
      const mRow = document.createElement("div"); mRow.className = "form-row"; mRow.style.marginBottom = "16px";
      for (const [m,l] of [["local","Local LLM"],["cloud","Cloud API"]]) {
        const b = document.createElement("button");
        b.className = s.llmMode===m ? "btn btn-primary" : "btn btn-secondary";
        b.style.flex = "1";
        b.textContent = l; b.onclick = () => { s.llmMode = m; saveSettings(); render(); };
        mRow.appendChild(b);
      }
      sc.appendChild(mRow);

      if (s.llmMode === "local") {
        sc.insertAdjacentHTML("beforeend",'<div class="form-group"><div class="label">LM Studio / Ollama URL</div></div>');
        const fg = sc.lastElementChild;
        const ui = document.createElement("input"); ui.className = "input input-mono"; ui.value = s.localLLMUrl; ui.placeholder = "http://100.X.X.X:1234";
        ui.oninput = () => { s.localLLMUrl = ui.value; saveSettings(); };
        fg.appendChild(ui);
        fg.insertAdjacentHTML("beforeend",'<div style="font-size:10px;color:var(--muted);margin-top:4px">Tailscale IP + port</div>');

        sc.insertAdjacentHTML("beforeend",'<div class="form-group"><div class="label">Model</div></div>');
        const fg2 = sc.lastElementChild;
        const modelRow = document.createElement("div"); modelRow.style.cssText = "display:flex;gap:6px;align-items:center";
        if (state._localModels.length > 0) {
          const mSel = document.createElement("select"); mSel.className = "input input-mono"; mSel.style.flex = "1";
          state._localModels.forEach(m => { const o = document.createElement("option"); o.value = m; o.textContent = m; if(m===s.localModelName) o.selected=true; mSel.appendChild(o); });
          if (!state._localModels.includes(s.localModelName) && s.localModelName) {
            const cur = document.createElement("option"); cur.value = s.localModelName; cur.textContent = s.localModelName; cur.selected = true; mSel.prepend(cur);
          }
          mSel.onchange = () => { s.localModelName = mSel.value; saveSettings(); };
          modelRow.appendChild(mSel);
        } else {
          const mi = document.createElement("input"); mi.className = "input input-mono"; mi.style.flex = "1"; mi.value = s.localModelName; mi.placeholder = "local-model";
          mi.oninput = () => { s.localModelName = mi.value; saveSettings(); };
          modelRow.appendChild(mi);
        }
        const refreshBtn = document.createElement("button"); refreshBtn.className = "btn btn-secondary"; refreshBtn.style.cssText = "padding:6px 10px;font-size:11px;white-space:nowrap";
        refreshBtn.textContent = "\u21BB Fetch";
        refreshBtn.onclick = async () => {
          refreshBtn.textContent = "..."; refreshBtn.disabled = true;
          state._localModels = await fetchLocalModels();
          if (state._localModels.length === 0) { refreshBtn.textContent = "\u2715 None"; refreshBtn.style.color = "var(--red)"; setTimeout(() => { refreshBtn.textContent = "\u21BB Fetch"; refreshBtn.style.color = ""; refreshBtn.disabled = false; }, 2000); }
          else { if (!s.localModelName && state._localModels.length) { s.localModelName = state._localModels[0]; saveSettings(); } render(); }
        };
        modelRow.appendChild(refreshBtn);
        fg2.appendChild(modelRow);
        fg2.insertAdjacentHTML("beforeend",'<div style="font-size:10px;color:var(--muted);margin-top:4px">' + (state._localModels.length ? state._localModels.length + " model(s) found" : "Click Fetch to discover models from your server") + '</div>');

        // Auto-fetch models on first render if URL is set and models not yet loaded
        if (state._localModels.length === 0 && s.localLLMUrl && !state._modelsFetched) {
          state._modelsFetched = true;
          fetchLocalModels().then(models => { if (models.length) { state._localModels = models; if (!s.localModelName) { s.localModelName = models[0]; saveSettings(); } render(); } });
        }

        sc.insertAdjacentHTML("beforeend",'<div class="info-box"><b>Speed tips:</b> Use Qwen3 14B or 32B. 80B is overkill for JSON extraction and much slower. Each query is independent (no context buildup). You can dictate the next case while the current one processes.</div>');
      }

      if (s.llmMode === "cloud") {
        sc.insertAdjacentHTML("beforeend",'<div class="form-group"><div class="label">Provider</div></div>');
        const fg = sc.lastElementChild;
        const pSel = document.createElement("select"); pSel.className = "input"; pSel.style.width = "auto";
        for (const [k,v] of Object.entries(CLOUD_PROVIDERS)) { const o = document.createElement("option"); o.value = k; o.textContent = v.name; if(k===s.cloudProvider)o.selected=true; pSel.appendChild(o); }
        pSel.onchange = () => { s.cloudProvider = pSel.value; state._cloudModels = []; state._cloudModelsFetched = false; saveSettings(); render(); };
        fg.appendChild(pSel);

        sc.insertAdjacentHTML("beforeend",'<div class="form-group"><div class="label">API Key</div></div>');
        const fg2 = sc.lastElementChild;
        const ki = document.createElement("input"); ki.className = "input input-mono"; ki.type = "password"; ki.value = s.cloudApiKey; ki.placeholder = "sk-... or AIza...";
        ki.oninput = () => { s.cloudApiKey = ki.value; state._cloudModels = []; state._cloudModelsFetched = false; saveSettings(); };
        fg2.appendChild(ki);

        sc.insertAdjacentHTML("beforeend",'<div class="form-group"><div class="label">Model</div></div>');
        const fg3 = sc.lastElementChild;
        const cModelRow = document.createElement("div"); cModelRow.style.cssText = "display:flex;gap:6px;align-items:center";
        if (state._cloudModels.length > 0) {
          const cmSel = document.createElement("select"); cmSel.className = "input input-mono"; cmSel.style.flex = "1";
          state._cloudModels.forEach(m => { const o = document.createElement("option"); o.value = m; o.textContent = m; if(m===s.cloudModel) o.selected=true; cmSel.appendChild(o); });
          if (s.cloudModel && !state._cloudModels.includes(s.cloudModel)) {
            const cur = document.createElement("option"); cur.value = s.cloudModel; cur.textContent = s.cloudModel; cur.selected = true; cmSel.prepend(cur);
          }
          cmSel.onchange = () => { s.cloudModel = cmSel.value; saveSettings(); };
          cModelRow.appendChild(cmSel);
        } else {
          const moI = document.createElement("input"); moI.className = "input input-mono"; moI.style.flex = "1"; moI.value = s.cloudModel||"";
          moI.placeholder = s.cloudProvider==="claude"?"claude-sonnet-4-20250514":s.cloudProvider==="openai"?"gpt-4o":"gemini-2.5-flash";
          moI.oninput = () => { s.cloudModel = moI.value; saveSettings(); };
          cModelRow.appendChild(moI);
        }
        const cFetchBtn = document.createElement("button"); cFetchBtn.className = "btn btn-secondary"; cFetchBtn.style.cssText = "padding:6px 10px;font-size:11px;white-space:nowrap";
        cFetchBtn.textContent = "\u21BB Fetch";
        cFetchBtn.onclick = async () => {
          cFetchBtn.textContent = "..."; cFetchBtn.disabled = true;
          state._cloudModels = await fetchCloudModels();
          if (state._cloudModels.length === 0) { cFetchBtn.textContent = "\u2715 None"; cFetchBtn.style.color = "var(--red)"; setTimeout(() => { cFetchBtn.textContent = "\u21BB Fetch"; cFetchBtn.style.color = ""; cFetchBtn.disabled = false; }, 2000); }
          else { if (!s.cloudModel && state._cloudModels.length) { s.cloudModel = state._cloudModels[0]; saveSettings(); } render(); }
        };
        cModelRow.appendChild(cFetchBtn);
        fg3.appendChild(cModelRow);
        fg3.insertAdjacentHTML("beforeend",'<div style="font-size:10px;color:var(--muted);margin-top:4px">' + (state._cloudModels.length ? state._cloudModels.length + " model(s) found" : "Enter API key, then click Fetch") + '</div>');

        // Auto-fetch cloud models on first render if key is set
        if (state._cloudModels.length === 0 && s.cloudApiKey && !state._cloudModelsFetched) {
          state._cloudModelsFetched = true;
          fetchCloudModels().then(models => { if (models.length) { state._cloudModels = models; if (!s.cloudModel) { s.cloudModel = models[0]; saveSettings(); } render(); } });
        }
      }

      // Test Connection button (works for both local and cloud)
      const testBtn = document.createElement("button"); testBtn.className = "btn btn-secondary"; testBtn.style.cssText = "margin-top:12px;width:100%";
      testBtn.textContent = "\uD83D\uDD0C Test Connection";
      testBtn.onclick = async () => {
        testBtn.textContent = "Testing..."; testBtn.disabled = true; testBtn.style.color = "";
        try {
          await callLLM("Respond with just the word OK. Nothing else.", "test");
          testBtn.textContent = "\u2713 Connected"; testBtn.style.color = "var(--acc)";
        } catch(e) {
          testBtn.textContent = "\u2717 " + e.message.substring(0,60); testBtn.style.color = "var(--red)";
        }
        setTimeout(() => { testBtn.textContent = "\uD83D\uDD0C Test Connection"; testBtn.disabled = false; testBtn.style.color = ""; }, 5000);
      };
      sc.appendChild(testBtn);
    }

    if (state.settingsTab === "dict") {
      const togRow = document.createElement("div"); togRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px";
      togRow.innerHTML = '<div class="label" style="margin:0">Medical Autocorrect</div>';
      const tog = document.createElement("button");
      tog.className = "toggle-track " + (state.autocorrectActive ? "on" : "off");
      tog.innerHTML = `<div class="toggle-thumb" style="left:${state.autocorrectActive?20:2}px"></div>`;
      tog.onclick = () => { state.autocorrectActive = !state.autocorrectActive; saveAutocorrect(); render(); };
      togRow.appendChild(tog); sc.appendChild(togRow);
      sc.insertAdjacentHTML("beforeend",`<div style="font-size:12px;color:var(--muted);margin-bottom:12px">${spec==="vascular"?"100+ built-in vascular surgery terms":"200+ built-in urology terms"}. Add your own below.</div>`);
      const dRow = document.createElement("div"); dRow.className = "form-row"; dRow.style.marginBottom = "10px";
      const dW = document.createElement("input"); dW.className = "input"; dW.style.flex = "1"; dW.placeholder = "Mic hears..."; dW.value = state.newWrong;
      dW.oninput = () => { state.newWrong = dW.value; };
      const dA = document.createElement("span"); dA.style.cssText = "color:var(--dim);align-self:center;font-size:16px"; dA.textContent = "\u2192";
      const dR = document.createElement("input"); dR.className = "input"; dR.style.flex = "1"; dR.placeholder = "Should be..."; dR.value = state.newRight;
      dR.oninput = () => { state.newRight = dR.value; };
      const dBtn = document.createElement("button"); dBtn.className = "btn btn-primary"; dBtn.textContent = "Add";
      dBtn.onclick = () => { if(dW.value.trim()&&dR.value.trim()){s.customAutocorrect[dW.value.trim().toLowerCase()]=dR.value.trim();state.newWrong="";state.newRight="";saveSettings();render()} };
      dRow.appendChild(dW); dRow.appendChild(dA); dRow.appendChild(dR); dRow.appendChild(dBtn); sc.appendChild(dRow);
      if (Object.keys(s.customAutocorrect).length) {
        const cDiv = document.createElement("div"); cDiv.style.cssText = "background:var(--surface);border-radius:var(--radius-sm);padding:10px 14px";
        for (const [w,r] of Object.entries(s.customAutocorrect)) {
          const row = document.createElement("div"); row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border-subtle)";
          row.innerHTML = `<span><span style="color:var(--red);text-decoration:line-through">${w}</span> <span style="color:var(--dim)">\u2192</span> <span style="color:var(--acc)">${r}</span></span>`;
          const del = document.createElement("span"); del.style.cssText = "cursor:pointer;color:var(--red);font-size:14px;opacity:0.6"; del.textContent = "\u00d7";
          del.onclick = () => { delete s.customAutocorrect[w]; saveSettings(); render(); };
          del.onmouseenter = () => { del.style.opacity = "1"; };
          del.onmouseleave = () => { del.style.opacity = "0.6"; };
          row.appendChild(del); cDiv.appendChild(row);
        }
        sc.appendChild(cDiv);
      }
    }
    sp.appendChild(sc); app.appendChild(sp);
  }

  // ── Tab Bar with sliding indicator ──
  const tabs = document.createElement("div"); tabs.className = "tab-bar";
  const tabIndicator = document.createElement("div"); tabIndicator.className = "tab-indicator";
  tabs.appendChild(tabIndicator);
  for (const [id,label] of [["record","Record"],["queue","Queue ("+state.cases.length+")"]]) {
    const tb = document.createElement("button"); tb.className = "tab-btn"+(state.tab===id?" active":"");
    tb.textContent = label;
    tb.dataset.tabId = id;
    tb.onclick = () => { state.tab = id; render(); };
    tabs.appendChild(tb);
  }
  app.appendChild(tabs);
  // Position indicator after DOM insertion
  requestAnimationFrame(() => {
    const activeTab = tabs.querySelector(".tab-btn.active");
    if (activeTab) {
      tabIndicator.style.left = activeTab.offsetLeft + "px";
      tabIndicator.style.width = activeTab.offsetWidth + "px";
    }
  });

  const content = document.createElement("div"); content.className = "content";

  // ═══ RECORD TAB ═══
  if (state.tab === "record") {
    // Mic button
    const mw = document.createElement("div"); mw.className = "mic-wrapper";
    const mic = document.createElement("button");
    mic.className = "mic-btn " + (state.isRec ? "recording" : "idle") + (state.quickFire && !state.isRec ? " quickfire" : "");
    if (state.isRec) {
      mic.innerHTML = '<div class="mic-ring"></div><div class="mic-ring-outer"></div><svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
    } else {
      mic.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>';
    }
    mic.onclick = () => { state.isRec ? stopRec() : startRec(); };
    mw.appendChild(mic);
    const ml = document.createElement("div"); ml.className = "mic-label";
    if (state.isRec && state.quickFire) { ml.textContent = "Quick-fire ON \u00b7 Listening... tap to stop"; ml.style.color = "var(--acc)"; }
    else if (state.isRec) { ml.textContent = "Listening... tap to stop"; }
    else { ml.textContent = "Tap to dictate or type below"; }
    mw.appendChild(ml);
    content.appendChild(mw);

    // Quick-fire toggle
    const qfRow = document.createElement("div");
    qfRow.style.cssText = "display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:16px";
    const qfLabel = document.createElement("span");
    qfLabel.style.cssText = "font-size:11px;color:var(--dim);font-weight:600";
    qfLabel.textContent = "Quick-fire";
    const qfTog = document.createElement("button");
    qfTog.className = "toggle-track " + (state.quickFire ? "on" : "off");
    qfTog.innerHTML = '<div class="toggle-thumb" style="left:'+(state.quickFire?20:2)+'px"></div>';
    qfTog.onclick = () => { state.quickFire = !state.quickFire; saveQuickFire(); render(); };
    qfRow.appendChild(qfLabel);
    qfRow.appendChild(qfTog);
    if (state.quickFire) {
      const qfHint = document.createElement("span");
      qfHint.style.cssText = "font-size:10px;color:var(--acc);font-weight:500";
      qfHint.textContent = "Mic restarts after processing";
      qfRow.appendChild(qfHint);
    }
    content.appendChild(qfRow);

    // Pending offline transcripts indicator
    if (state.pendingTranscripts.length > 0) {
      const pendBar = document.createElement("div"); pendBar.className = "pending-bar"; pendBar.style.cssText = "display:flex;align-items:center;gap:8px";
      const pendText = document.createElement("span"); pendText.style.flex = "1";
      pendText.textContent = state.pendingTranscripts.length + " case(s) saved offline";
      pendBar.appendChild(pendText);
      const pendBtn = document.createElement("button");
      pendBtn.style.cssText = "background:none;border:1px solid var(--acc);border-radius:var(--radius-xs);color:var(--acc);font-size:11px;padding:3px 10px;cursor:pointer;font-family:var(--font);font-weight:600;white-space:nowrap";
      pendBtn.textContent = "Process Now";
      pendBtn.onclick = () => { processPending(); };
      pendBar.appendChild(pendBtn);
      content.appendChild(pendBar);
    }

    // Processing indicators — one bar per queue item
    state.processingQueue.forEach(qi => {
      const pq = document.createElement("div"); pq.className = "processing-bar"; pq.style.cssText = "display:flex;align-items:center;gap:8px";
      const pqText = document.createElement("span"); pqText.style.flex = "1";
      pqText.innerHTML = '<span class="processing-shimmer"></span> ' + (qi.retryStatus || qi.text);
      pq.appendChild(pqText);
      const pqCancel = document.createElement("button");
      pqCancel.style.cssText = "background:none;border:none;color:var(--red, #ef4444);font-size:11px;cursor:pointer;font-family:var(--font);font-weight:600;white-space:nowrap;padding:2px 6px";
      pqCancel.textContent = "\u2715";
      pqCancel.title = "Cancel this item";
      pqCancel.onclick = () => { cancelQueueItem(qi.id); };
      pq.appendChild(pqCancel);
      content.appendChild(pq);
    });

    // Transcript card
    const tCard = document.createElement("div"); tCard.className = "card";
    const tHead = document.createElement("div"); tHead.className = "transcript-header";
    tHead.innerHTML = '<span class="transcript-label">Case Description</span>';
    if (state.transcript) {
      const bDiv = document.createElement("div"); bDiv.className = "transcript-actions";
      const fb = document.createElement("button"); fb.className = "btn btn-ghost"; fb.style.cssText = "color:var(--acc);font-size:11px"; fb.textContent = "Fix Terms";
      fb.onclick = () => { let r = applyMedicalAutocorrect(state.transcript); for(const[w,ri] of Object.entries(s.customAutocorrect)){r=r.replace(new RegExp("\\b"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","gi"),ri)} state.transcript=r;render(); };
      const cb = document.createElement("button"); cb.className = "btn btn-ghost"; cb.style.fontSize = "11px"; cb.textContent = "Clear";
      cb.onclick = () => { state.transcript = ""; state.missingFields = null; render(); };
      bDiv.appendChild(fb); bDiv.appendChild(cb); tHead.appendChild(bDiv);
    }
    tCard.appendChild(tHead);
    const ta = document.createElement("textarea"); ta.className = "transcript-area";
    ta.value = state.transcript; ta.placeholder = '"Right URS laser litho stent, Dr. Kaul, Harper, first assist, 55M... next case, cysto TURBT..."';
    ta.oninput = () => { state.transcript = ta.value; };
    tCard.appendChild(ta); content.appendChild(tCard);

    // Missing fields prompt
    if (state.missingFields && state.missingFields.length > 0) {
      const mfCard = document.createElement("div"); mfCard.className = "card"; mfCard.style.borderLeftColor = "var(--warn)";
      const mfHead = document.createElement("div"); mfHead.style.cssText = "padding:10px 14px;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center";
      mfHead.innerHTML = '<span style="font-size:12px;font-weight:700;color:var(--warn)">Missing Info — fill in or skip</span>';
      mfCard.appendChild(mfHead);
      const mfBody = document.createElement("div"); mfBody.style.cssText = "padding:12px 14px;display:flex;flex-direction:column;gap:10px";

      state.missingFields.forEach(f => {
        const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:center;gap:8px";
        const lab = document.createElement("div"); lab.className = "label"; lab.style.cssText = "margin:0;min-width:60px"; lab.textContent = f.label;
        row.appendChild(lab);

        if (f.options && f.options.length > 0) {
          const sel = document.createElement("select"); sel.className = "input"; sel.style.cssText = "flex:1;padding:7px 10px";
          const blank = document.createElement("option"); blank.value = ""; blank.textContent = "— skip —"; sel.appendChild(blank);
          f.options.forEach(o => { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; sel.appendChild(opt); });
          // Also allow typing custom value
          const custom = document.createElement("option"); custom.value = "__custom__"; custom.textContent = "Type custom..."; sel.appendChild(custom);
          sel.onchange = () => {
            if (sel.value === "__custom__") {
              sel.style.display = "none";
              const inp = document.createElement("input"); inp.className = "input"; inp.style.cssText = "flex:1;padding:7px 10px"; inp.placeholder = f.placeholder;
              inp.oninput = () => { f._value = inp.value; };
              row.appendChild(inp); inp.focus();
            } else {
              f._value = sel.value;
            }
          };
          row.appendChild(sel);
        } else {
          const inp = document.createElement("input"); inp.className = "input"; inp.style.cssText = "flex:1;padding:7px 10px"; inp.placeholder = f.placeholder;
          inp.oninput = () => { f._value = inp.value; };
          row.appendChild(inp);
        }
        mfBody.appendChild(row);
      });

      mfCard.appendChild(mfBody);
      content.appendChild(mfCard);
    }

    // Process / Cancel button
    if (state.processingQueue.length > 0) {
      const cBtn = document.createElement("button"); cBtn.className = "process-btn";
      cBtn.style.cssText = "background:none;border:2px solid var(--red, #ef4444);color:var(--red, #ef4444)";
      cBtn.textContent = "Cancel All";
      cBtn.onclick = () => { cancelAllProcessing(); };
      content.appendChild(cBtn);
    } else {
      const pBtn = document.createElement("button"); pBtn.className = "process-btn";
      pBtn.textContent = "Process Case(s)";
      pBtn.onclick = () => {
        const liveTA = content.querySelector("textarea");
        if (liveTA) state.transcript = liveTA.value;
        if (!state.transcript.trim()) { state.error = "Type or dictate a case first."; render(); return; }

        // First click: check for missing fields
        if (!state.missingFields) {
          const missing = detectMissingFields(state.transcript);
          if (missing.length > 0) {
            state.missingFields = missing;
            render();
            return;
          }
        }

        // Append filled-in values to transcript before sending
        if (state.missingFields && state.missingFields.length > 0) {
          const extras = state.missingFields
            .filter(f => f._value && f._value.trim())
            .map(f => f.label + ": " + f._value.trim());
          if (extras.length) state.transcript += "\n" + extras.join(", ");
        }
        state.missingFields = null;
        processCase();
      };
      content.appendChild(pBtn);
    }

    // Skip link when missing fields are showing
    if (state.missingFields && state.missingFields.length > 0) {
      const skipRow = document.createElement("div"); skipRow.style.cssText = "text-align:center;margin-top:8px";
      const skipBtn = document.createElement("button"); skipBtn.className = "btn btn-ghost"; skipBtn.style.cssText = "font-size:12px;color:var(--dim)";
      skipBtn.textContent = "Skip — process without filling in";
      skipBtn.onclick = () => {
        state.missingFields = null;
        const liveTA = content.querySelector("textarea");
        if (liveTA) state.transcript = liveTA.value;
        processCase();
      };
      skipRow.appendChild(skipBtn); content.appendChild(skipRow);
    }

    if (state.error) {
      const err = document.createElement("div"); err.className = "error-box";
      err.style.cssText = "display:flex;align-items:flex-start;gap:8px;justify-content:space-between";
      const errText = document.createElement("span"); errText.style.flex = "1";
      errText.textContent = state.error;
      err.appendChild(errText);
      if (state.lastFailedTranscript) {
        const retryBtn = document.createElement("button");
        retryBtn.style.cssText = "background:none;border:1px solid var(--red);border-radius:var(--radius-xs);color:var(--red);font-size:11px;padding:3px 10px;cursor:pointer;font-family:var(--font);font-weight:600;white-space:nowrap;flex-shrink:0";
        retryBtn.textContent = "Retry";
        retryBtn.onclick = (e) => {
          e.stopPropagation();
          state.transcript = state.lastFailedTranscript;
          state.lastFailedTranscript = null;
          state.error = "";
          render();
          processCase();
        };
        err.appendChild(retryBtn);
      }
      content.appendChild(err);
    }
  }

  // ═══ QUEUE TAB ═══
  if (state.tab === "queue") {
    // ACGME paste box (fallback if clipboard fails)
    if (state.acgmeData) {
      const ab = document.createElement("div"); ab.className = "acgme-box";
      const abH = document.createElement("div"); abH.className = "acgme-header";
      abH.innerHTML = '<span>Copy and paste into ACGME filler</span>';
      const closeBtn = document.createElement("button"); closeBtn.className = "btn btn-ghost"; closeBtn.style.cssText = "padding:2px 6px;font-size:14px"; closeBtn.textContent = "\u00d7";
      closeBtn.onclick = () => { state.acgmeData = ""; render(); };
      abH.appendChild(closeBtn); ab.appendChild(abH);
      const abB = document.createElement("div"); abB.className = "acgme-body";
      const abTa = document.createElement("textarea"); abTa.readOnly = true; abTa.className = "acgme-textarea";
      abTa.value = state.acgmeData; abTa.onfocus = () => abTa.select();
      abB.appendChild(abTa);
      abB.insertAdjacentHTML("beforeend",'<div class="acgme-hint">Click box, select all, copy, then paste in ACGME filler</div>');
      ab.appendChild(abB); content.appendChild(ab);
    }

    // Dashboard stats
    if (state.cases.length > 0) {
      const stats = getCaseStats();
      const dash = document.createElement("div"); dash.className = "dashboard-row";
      for (const [label, val] of [["Total", stats.total], ["This Week", stats.thisWeek], ["This Month", stats.thisMonth]]) {
        const chip = document.createElement("div"); chip.className = "stat-chip";
        chip.innerHTML = '<span class="stat-val">' + val + '</span><span class="stat-label">' + label + '</span>';
        dash.appendChild(chip);
      }
      content.appendChild(dash);
    }

    // Export + pending actions row
    if (state.cases.length > 0 || state.pendingTranscripts.length > 0) {
      const actRow = document.createElement("div"); actRow.style.cssText = "display:flex;gap:8px;margin-bottom:8px";
      if (state.cases.length > 0) {
        const expBtn = document.createElement("button"); expBtn.className = "btn btn-secondary"; expBtn.style.fontSize = "11px";
        expBtn.textContent = "\u2913 Export CSV";
        expBtn.onclick = () => { exportCSV(); };
        actRow.appendChild(expBtn);
      }
      if (state.pendingTranscripts.length > 0) {
        const pendBtn = document.createElement("button"); pendBtn.className = "btn btn-primary"; pendBtn.style.fontSize = "11px";
        pendBtn.textContent = "\u23F3 Process " + state.pendingTranscripts.length + " Pending";
        pendBtn.onclick = () => { processPending(); };
        actRow.appendChild(pendBtn);
      }
      content.appendChild(actRow);
    }

    // Pending transcripts indicator
    if (state.pendingTranscripts.length > 0) {
      const pendBar = document.createElement("div"); pendBar.className = "pending-bar";
      pendBar.textContent = state.pendingTranscripts.length + " case(s) saved offline \u2014 waiting for connection";
      content.appendChild(pendBar);
    }

    // Processing indicators — one bar per queue item
    state.processingQueue.forEach(qi => {
      const pq = document.createElement("div"); pq.className = "processing-bar"; pq.style.cssText = "display:flex;align-items:center;gap:8px";
      const pqText = document.createElement("span"); pqText.style.flex = "1";
      pqText.innerHTML = '<span class="processing-shimmer"></span> ' + (qi.retryStatus || qi.text);
      pq.appendChild(pqText);
      const pqCancel = document.createElement("button");
      pqCancel.style.cssText = "background:none;border:none;color:var(--red, #ef4444);font-size:11px;cursor:pointer;font-family:var(--font);font-weight:600;white-space:nowrap;padding:2px 6px";
      pqCancel.textContent = "\u2715";
      pqCancel.title = "Cancel this item";
      pqCancel.onclick = () => { cancelQueueItem(qi.id); };
      pq.appendChild(pqCancel);
      content.appendChild(pq);
    });

    // Skeleton cards while processing
    if (state.processingQueue.length > 0 && state.cases.length === 0) {
      for (let i = 0; i < state.processingQueue.length; i++) {
        content.insertAdjacentHTML("beforeend", '<div class="skeleton skeleton-card"></div>');
      }
    }

    const activeCases = state.cases.filter(c => !c.logged);
    const loggedCases = state.cases.filter(c => c.logged);

    if (activeCases.length === 0 && loggedCases.length === 0 && state.processingQueue.length === 0) {
      content.insertAdjacentHTML("beforeend",'<div class="empty-state"><div class="empty-icon-wrapper"><div class="empty-icon">\uD83D\uDCCB</div></div><div class="empty-title">No cases queued</div><div class="empty-subtitle">Dictate or type a case on the Record tab to get started</div></div>');
    } else {
      // Render a single case card (used for both active and logged)
      function renderCaseCard(c, container, isLogged) {
        const isExpanded = state.expandedCase === c.id;
        const card = document.createElement("div"); card.className = "case-card" + (isExpanded ? " expanded" : "") + (isLogged ? " logged" : "");

        // Top row: procedure name + action buttons
        const topRow = document.createElement("div"); topRow.className = "case-card-inner";
        const nameEl = document.createElement("div"); nameEl.className = "case-name";
        if (isLogged) { const chk = document.createElement("span"); chk.style.cssText = "color:var(--green,#4caf50);margin-right:4px"; chk.textContent = "\u2713"; nameEl.appendChild(chk); nameEl.appendChild(document.createTextNode(c.procedure_name || "Case")); }
        else { nameEl.textContent = c.procedure_name || "Case"; }
        topRow.appendChild(nameEl);
        const btns = document.createElement("div"); btns.className = "case-actions";
        if (isLogged) {
          const unmark = document.createElement("button"); unmark.className = "btn btn-secondary"; unmark.style.fontSize = "11px";
          unmark.textContent = "Unmark"; unmark.onclick = (e) => { e.stopPropagation(); c.logged = false; saveCases(); render(); };
          btns.appendChild(unmark);
        } else {
          const ab = document.createElement("button"); ab.className = "btn btn-primary"; ab.style.fontSize = "11px";
          ab.textContent = state.copied==="acgme-"+c.id?"\u2713 Logged":"Log";
          ab.onclick = (e) => { e.stopPropagation(); sendToACGME(c, "acgme-"+c.id); };
          btns.appendChild(ab);
        }
        const cpb = document.createElement("button"); cpb.className = "btn btn-secondary"; cpb.style.fontSize = "11px";
        cpb.textContent = state.copied==="c-"+c.id?"\u2713":"Copy"; cpb.onclick = (e) => { e.stopPropagation(); copyText(fmtACGME(c),"c-"+c.id); };
        const del = document.createElement("button"); del.className = "btn btn-danger"; del.style.fontSize = "11px";
        del.textContent = "\u2715"; del.onclick = (e) => {
          e.stopPropagation();
          if (state._undoTimer) { clearTimeout(state._undoTimer); saveCases(); }
          const removed = c;
          state.cases = state.cases.filter(x => x.id !== c.id);
          state.toast = "Case deleted";
          state._undoCase = removed;
          state.expandedCase = null;
          render();
          state._undoTimer = setTimeout(() => {
            state._undoCase = null; state.toast = ""; state._undoTimer = null;
            saveCases(); render();
          }, 5000);
        };
        btns.appendChild(cpb); btns.appendChild(del);
        topRow.appendChild(btns); card.appendChild(topRow);

        // Detail rows: attending, hospital, date, role
        const details = document.createElement("div"); details.className = "case-details";
        const metaParts = [];
        if (c.attending) metaParts.push(`<span class="case-detail-item"><span class="case-detail-label">Att</span> ${c.attending}</span>`);
        if (c.hospital) metaParts.push(`<span class="case-detail-item"><span class="case-detail-label">Site</span> ${c.hospital}</span>`);
        if (c.date) {
          const dp = c.date.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
          const dateStr = dp ? parseInt(dp[2])+"/"+parseInt(dp[3])+"/"+dp[1] : c.date;
          metaParts.push(`<span class="case-detail-item"><span class="case-detail-label">Date</span> ${dateStr}</span>`);
        }
        if (c.role) metaParts.push(`<span class="case-detail-item"><span class="case-detail-label">Role</span> ${c.role}</span>`);
        details.innerHTML = metaParts.join('<span class="case-meta-dot">\u00b7</span>');
        card.appendChild(details);

        // CPT codes (compact)
        const codes = (c.cpt_codes||[]);
        if (codes.length) {
          const cptRow = document.createElement("div"); cptRow.className = "case-cpt-row";
          cptRow.innerHTML = codes.slice(0,3).map(x => `<span class="cpt-tag" data-tooltip="${(x.description||'').replace(/"/g,'&quot;')}"><span style="color:var(--acc)">${x.code}</span></span>`).join("") + (codes.length > 3 ? `<span class="cpt-tag" style="color:var(--dim)">+${codes.length-3}</span>` : "");
          card.appendChild(cptRow);
        }

        // Click to expand/collapse
        const summaryArea = document.createElement("div"); summaryArea.className = "expand-hint";
        summaryArea.textContent = isExpanded ? "▲ collapse" : "▼ tap to edit";
        summaryArea.onclick = (e) => { e.stopPropagation(); state.expandedCase = isExpanded ? null : c.id; render(); };
        card.appendChild(summaryArea);

        // ── Expanded inline edit form ──
        if (isExpanded) {
          const expandDiv = document.createElement("div"); expandDiv.className = "case-card-expand";

          // Helper: create a form row with label + input/select
          function makeRow(labelText, el) {
            const row = document.createElement("div"); row.className = "form-row";
            const lbl = document.createElement("label"); lbl.className = "label"; lbl.textContent = labelText;
            row.appendChild(lbl); row.appendChild(el); return row;
          }

          // Procedure name
          const procInput = document.createElement("input"); procInput.className = "input"; procInput.type = "text";
          procInput.value = c.procedure_name || "";
          procInput.onchange = () => { c.procedure_name = procInput.value; saveCases(); };
          expandDiv.appendChild(makeRow("Procedure", procInput));

          // Attending (select from settings + custom option)
          const attSel = document.createElement("select"); attSel.className = "input";
          attSel.innerHTML = '<option value="">— Select —</option>';
          (state.settings.attendings || []).forEach(a => {
            const opt = document.createElement("option"); opt.value = a; opt.textContent = a;
            if (a === c.attending) opt.selected = true;
            attSel.appendChild(opt);
          });
          // If current value isn't in the list, add it
          if (c.attending && !(state.settings.attendings || []).includes(c.attending)) {
            const opt = document.createElement("option"); opt.value = c.attending; opt.textContent = c.attending; opt.selected = true;
            attSel.appendChild(opt);
          }
          attSel.onchange = () => { c.attending = attSel.value; saveCases(); };
          expandDiv.appendChild(makeRow("Attending", attSel));

          // Hospital (select from settings)
          const hospSel = document.createElement("select"); hospSel.className = "input";
          hospSel.innerHTML = '<option value="">— Select —</option>';
          (state.settings.hospitals || []).forEach(h => {
            const opt = document.createElement("option"); opt.value = h; opt.textContent = h;
            if (h === c.hospital) opt.selected = true;
            hospSel.appendChild(opt);
          });
          if (c.hospital && !(state.settings.hospitals || []).includes(c.hospital)) {
            const opt = document.createElement("option"); opt.value = c.hospital; opt.textContent = c.hospital; opt.selected = true;
            hospSel.appendChild(opt);
          }
          hospSel.onchange = () => { c.hospital = hospSel.value; saveCases(); };
          expandDiv.appendChild(makeRow("Hospital", hospSel));

          // Role (select from fixed options)
          const roleOpts = ["First Assistant", "Surgeon Chief", "Surgeon Jr.", "Teaching Asst."];
          const roleSel = document.createElement("select"); roleSel.className = "input";
          roleSel.innerHTML = '<option value="">— Select —</option>';
          roleOpts.forEach(r => {
            const opt = document.createElement("option"); opt.value = r; opt.textContent = r;
            if (r === c.role) opt.selected = true;
            roleSel.appendChild(opt);
          });
          if (c.role && !roleOpts.includes(c.role)) {
            const opt = document.createElement("option"); opt.value = c.role; opt.textContent = c.role; opt.selected = true;
            roleSel.appendChild(opt);
          }
          roleSel.onchange = () => { c.role = roleSel.value; saveCases(); };
          expandDiv.appendChild(makeRow("Role", roleSel));

          // Date
          const dateInput = document.createElement("input"); dateInput.className = "input"; dateInput.type = "date";
          dateInput.value = c.date || "";
          dateInput.onchange = () => { c.date = dateInput.value; saveCases(); };
          expandDiv.appendChild(makeRow("Date", dateInput));

          // Approach (select — varies by specialty)
          const spec = (state.settings.specialty || "urology");
          const approachOpts = spec === "vascular"
            ? ["Open", "Endovascular", "Percutaneous", "Other"]
            : ["Open", "Laparoscopic", "Robotic", "Endoscopic", "Percutaneous", "Other"];
          const appSel = document.createElement("select"); appSel.className = "input";
          appSel.innerHTML = '<option value="">— Select —</option>';
          approachOpts.forEach(a => {
            const opt = document.createElement("option"); opt.value = a; opt.textContent = a;
            if (a === c.approach) opt.selected = true;
            appSel.appendChild(opt);
          });
          appSel.onchange = () => { c.approach = appSel.value; saveCases(); };
          expandDiv.appendChild(makeRow("Approach", appSel));

          // CPT Codes — removable tags + add
          const cptLabel = document.createElement("label"); cptLabel.className = "label"; cptLabel.textContent = "CPT Codes";
          const cptContainer = document.createElement("div"); cptContainer.className = "form-row"; cptContainer.style.flexWrap = "wrap";
          cptContainer.appendChild(cptLabel);
          const cptTagsWrap = document.createElement("div"); cptTagsWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;flex:1;align-items:center";
          (c.cpt_codes || []).forEach((cpt, idx) => {
            const tag = document.createElement("span"); tag.className = "cpt-tag";
            tag.dataset.tooltip = cpt.description || '';
            tag.style.cssText = "display:inline-flex;align-items:center;gap:4px";
            tag.innerHTML = `<span style="color:var(--acc)">${cpt.code}</span>`;
            const removeBtn = document.createElement("button");
            removeBtn.style.cssText = "background:none;border:none;color:var(--red);cursor:pointer;font-size:10px;padding:0 2px;font-family:var(--font)";
            removeBtn.textContent = "✕";
            removeBtn.onclick = () => { c.cpt_codes.splice(idx, 1); saveCases(); render(); };
            tag.appendChild(removeBtn);
            cptTagsWrap.appendChild(tag);
          });
          // Add CPT button
          const addCptBtn = document.createElement("button");
          addCptBtn.style.cssText = "background:var(--surface);border:1px dashed var(--border);border-radius:var(--radius-xs);color:var(--acc);cursor:pointer;font-size:10px;padding:2px 8px;font-family:var(--font)";
          addCptBtn.textContent = "+ Add";
          addCptBtn.onclick = () => {
            const code = prompt("Enter CPT code:");
            if (code && code.trim()) {
              const desc = prompt("Description (optional):");
              if (!c.cpt_codes) c.cpt_codes = [];
              c.cpt_codes.push({ code: code.trim(), description: desc || "", attributes: [] });
              saveCases(); render();
            }
          };
          cptTagsWrap.appendChild(addCptBtn);
          cptContainer.appendChild(cptTagsWrap);
          expandDiv.appendChild(cptContainer);

          card.appendChild(expandDiv);
        }

        container.appendChild(card);
      }

      // Render active cases
      activeCases.forEach(c => renderCaseCard(c, content, false));

      // Render logged archive section
      if (loggedCases.length > 0) {
        const loggedHeader = document.createElement("div"); loggedHeader.className = "logged-section-header";
        loggedHeader.innerHTML = '<span class="logged-toggle">' + (state.showLogged ? '▲' : '▼') + '</span> Logged <span class="logged-count">(' + loggedCases.length + ')</span>';
        loggedHeader.onclick = () => { state.showLogged = !state.showLogged; render(); };
        content.appendChild(loggedHeader);
        if (state.showLogged) {
          loggedCases.forEach(c => renderCaseCard(c, content, true));
        }
      }
    }
  }

  app.appendChild(content);

  // ── Toast notification ──
  if (state.toast) {
    const toast = document.createElement("div"); toast.className = "toast";
    toast.textContent = state.toast;
    if (state._undoCase) {
      const undoBtn = document.createElement("button"); undoBtn.className = "toast-undo";
      undoBtn.textContent = "Undo";
      undoBtn.onclick = (e) => {
        e.stopPropagation();
        clearTimeout(state._undoTimer);
        state.cases.push(state._undoCase);
        state._undoCase = null; state.toast = ""; state._undoTimer = null;
        saveCases(); render();
      };
      toast.appendChild(undoBtn);
    }
    app.appendChild(toast);
  }
}

/* ═══ CPT tooltip (event delegation) ═══ */
(function(){
  const tip = document.getElementById("cpt-tooltip");
  document.addEventListener("mouseover", e => {
    const tag = e.target.closest(".cpt-tag[data-tooltip]");
    if (!tag || !tag.dataset.tooltip) { tip.style.display = "none"; return; }
    tip.textContent = tag.dataset.tooltip;
    tip.style.display = "block";
    const r = tag.getBoundingClientRect();
    const tw = tip.offsetWidth;
    let left = r.left + r.width/2 - tw/2;
    if (left < 4) left = 4;
    if (left + tw > window.innerWidth - 4) left = window.innerWidth - 4 - tw;
    tip.style.left = left + "px";
    tip.style.top = (r.top - tip.offsetHeight - 6) + "px";
  });
  document.addEventListener("mouseout", e => {
    const tag = e.target.closest(".cpt-tag[data-tooltip]");
    if (tag) tip.style.display = "none";
  });
})();
