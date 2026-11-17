#!/usr/bin/env python3
"""
Generates, straight from database/mysql/01_schema.sql:
  docs/ER_diagram.svg / ER_diagram.png   (Graphviz, crow's-foot notation)   [needs `dot`]
  docs/ER_diagram.mmd                    (Mermaid, renders on GitHub)
  docs/relational_schema.md
  docs/data_dictionary.md
Run:  python3 docs/generate_docs.py
"""
import re, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SQL = (ROOT / 'database/mysql/01_schema.sql').read_text()
OUT = ROOT / 'docs'

GROUPS = {  # table -> (group, colour)
    'manufacturer': 'master', 'battery_model': 'master', 'stakeholder': 'master', 'vehicle': 'master', 'material': 'master', 'model_material': 'master',
    'battery': 'core', 'battery_certification': 'core',
    'installation': 'life', 'ownership_record': 'life', 'repair_record': 'life', 'health_record': 'life', 'lifecycle_event': 'life',
    'second_life_assessment': 'eol', 'refurbishment_record': 'eol', 'recycling_record': 'eol', 'recovered_material': 'eol',
    'assessment_rule': 'cfg', 'telemetry_threshold': 'cfg', 'battery_alert': 'cfg', 'audit_log': 'cfg', 'app_user': 'access',
}
COLORS = {'master': '#dbeafe', 'core': '#d9f2e4', 'life': '#fdf0d2', 'eol': '#ece3fb', 'cfg': '#e5e7eb', 'access': '#fde0e0'}
GROUP_NAMES = {'master': 'Master / reference data', 'core': 'Battery passport core', 'life': 'Lifecycle history',
               'eol': 'Assessment & end of life', 'cfg': 'Monitoring configuration / audit', 'access': 'Access control'}

# ------------------------------------------------------------------ parse
tables = {}
for m in re.finditer(r'CREATE TABLE (\w+) \((.*?)\n\) ENGINE=InnoDB;', SQL, re.S):
    name, body = m.group(1), m.group(2)
    t = {'cols': [], 'pk': [], 'fks': [], 'uniques': [], 'checks': []}
    for raw in body.split('\n'):
        line = raw.strip().rstrip(',')
        if not line:
            continue
        if line.startswith('CONSTRAINT'):
            fk = re.search(r'FOREIGN KEY \((.*?)\) REFERENCES (\w+) \((.*?)\)(.*)', line)
            if fk:
                t['fks'].append({'cols': [c.strip() for c in fk.group(1).split(',')], 'ref': fk.group(2),
                                 'refcols': [c.strip() for c in fk.group(3).split(',')], 'rule': fk.group(4).strip()})
            elif ' UNIQUE ' in line:
                t['uniques'].append([c.strip() for c in re.search(r'UNIQUE \((.*?)\)', line).group(1).split(',')])
            elif ' CHECK ' in line:
                t['checks'].append(re.search(r'CONSTRAINT (\w+) CHECK \((.*)\)$', line).groups())
            continue
        if line.startswith('PRIMARY KEY'):
            t['pk'] = [c.strip() for c in re.search(r'\((.*?)\)', line).group(1).split(',')]
            continue
        cm = re.match(r'(\w+) (\S+(?: UNSIGNED)?)(.*)', line)
        cname, ctype, rest = cm.group(1), cm.group(2), cm.group(3)
        if ctype.upper().startswith('ENUM'):
            ctype = re.search(r'(ENUM\(.*?\))', line).group(1)
            rest = line[line.index(ctype) + len(ctype):]
        if rest.startswith(' UNSIGNED'):
            ctype += ' UNSIGNED'; rest = rest[9:]
        col = {'name': cname, 'type': ctype, 'null': 'NOT NULL' not in rest and 'PRIMARY KEY' not in rest,
               'auto': 'AUTO_INCREMENT' in rest, 'default': None}
        d = re.search(r'DEFAULT (\S+(?: ON UPDATE CURRENT_TIMESTAMP)?)', rest)
        if d: col['default'] = d.group(1)
        if 'PRIMARY KEY' in rest: t['pk'] = [cname]
        t['cols'].append(col)
    tables[name] = t

# ALTER TABLE ... ADD CONSTRAINT FK  /  ADD COLUMN
for m in re.finditer(r'ALTER TABLE (\w+)\s+ADD CONSTRAINT \w+ FOREIGN KEY \((\w+)\) REFERENCES (\w+) \((\w+)\)(.*?);', SQL, re.S):
    tables[m.group(1)]['fks'].append({'cols': [m.group(2)], 'ref': m.group(3), 'refcols': [m.group(4)], 'rule': m.group(5).strip()})
for m in re.finditer(r'ALTER TABLE (\w+) ADD COLUMN (\w+) (\S+) NULL', SQL):
    tables[m.group(1)]['cols'].append({'name': m.group(2), 'type': m.group(3), 'null': True, 'auto': False, 'default': None})

fkcols = {n: {c for fk in t['fks'] for c in fk['cols']} for n, t in tables.items()}
idx = {}
for m in re.finditer(r'CREATE (FULLTEXT )?INDEX (\w+) ON (\w+) \((.*?)\);', SQL):
    idx.setdefault(m.group(3), []).append((m.group(2), m.group(4), 'FULLTEXT' if m.group(1) else 'B-TREE'))

# ------------------------------------------------------------------ Graphviz ER
def node(name, t):
    color = COLORS[GROUPS[name]]
    rows = [f'<TR><TD BGCOLOR="#14231c" ALIGN="CENTER"><FONT COLOR="white"><B>{name}</B></FONT></TD></TR>']
    for c in t['cols']:
        tag = []
        if c['name'] in t['pk']: tag.append('PK')
        if c['name'] in fkcols[name]: tag.append('FK')
        label = f'<B>{c["name"]}</B>' if 'PK' in tag else c['name']
        mark = ('<FONT COLOR="#b45309"> FK</FONT>' if 'FK' in tag else '') + ('<FONT COLOR="#0a5937"> PK</FONT>' if 'PK' in tag else '')
        rows.append(f'<TR><TD ALIGN="LEFT" BGCOLOR="{color}" PORT="{c["name"]}">{label}<FONT POINT-SIZE="9" COLOR="#555555"> {c["type"].split(" ")[0]}</FONT>{mark}</TD></TR>')
    return f'  {name} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3">{"".join(rows)}</TABLE>>];'

dot = ['digraph ER {', '  graph [rankdir=LR, splines=true, nodesep=0.35, ranksep=1.1, fontname="Helvetica", labelloc=t, fontsize=22, '
       'label="BatteryPassport - ER diagram (MySQL, crow\'s-foot notation) + MongoDB telemetry"];',
       '  node [shape=plain, fontname="Helvetica", fontsize=11];', '  edge [color="#475569", arrowsize=0.9];']
for n, t in tables.items():
    dot.append(node(n, t))
for n, t in tables.items():
    for fk in t['fks']:
        nullable = any(next(c for c in t['cols'] if c['name'] == x)['null'] for x in fk['cols'])
        one_to_one = set(fk['cols']) == set(t['pk']) or any(set(u) == set(fk['cols']) for u in t['uniques'])
        tail = 'teeodot' if one_to_one and nullable else ('tee' if one_to_one else 'crow')
        head = 'teeodot' if nullable else 'tee'
        dot.append(f'  {n} -> {fk["ref"]} [dir=both, arrowtail={tail}, arrowhead={head}, tailport="{fk["cols"][0]}", headport="{fk["refcols"][0]}"];')
mongo = ('<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3"><TR><TD BGCOLOR="#14633f"><FONT COLOR="white"><B>MongoDB: telemetry (collection)</B></FONT></TD></TR>'
         + ''.join(f'<TR><TD ALIGN="LEFT" BGCOLOR="#e1f6ea">{x}</TD></TR>' for x in [
             '<B>_id</B> ObjectId', 'battery_id int (soft ref)', 'serial_number string', 'ts date', 'temperature_c double', 'voltage_v double',
             'current_a double', 'soc_pct double', 'soh_pct double', 'cycle_count int', 'source enum', 'extra object (optional fields)']) + '</TABLE>')
dot.append(f'  telemetry [label=<{mongo}>];')
dot.append('  telemetry -> battery [style=dashed, color="#14633f", dir=both, arrowtail=crow, arrowhead=tee, label=" battery_id\\n(app-level link,\\nno cross-DB FK)", fontsize=10, fontcolor="#14633f", headport=battery_id];')
dot.append('}')
(OUT / 'ER_diagram.dot').write_text('\n'.join(dot))
for fmt, extra in (('svg', []), ('png', ['-Gdpi=80'])):
    try:
        subprocess.run(['dot', f'-T{fmt}', *extra, str(OUT / 'ER_diagram.dot'), '-o', str(OUT / f'ER_diagram.{fmt}')], check=True)
    except Exception as e:  # graphviz not installed
        print('Graphviz skipped:', e)

# ------------------------------------------------------------------ Mermaid ER
mm = ['erDiagram']
for n, t in tables.items():
    mm.append(f'  {n} {{')
    for c in t['cols']:
        ty = re.sub(r'\(.*', '', c['type'].split(' ')[0]).lower()
        key = ' PK' if c['name'] in t['pk'] else (' FK' if c['name'] in fkcols[n] else '')
        mm.append(f'    {ty} {c["name"]}{key}')
    mm.append('  }')
for n, t in tables.items():
    for fk in t['fks']:
        nullable = any(next(c for c in t['cols'] if c['name'] == x)['null'] for x in fk['cols'])
        one = set(fk['cols']) == set(t['pk']) or any(set(u) == set(fk['cols']) for u in t['uniques'])
        left = '|o' if nullable else '||'
        right = 'o|' if one else 'o{'
        mm.append(f'  {fk["ref"]} {left}--{right} {n} : "{fk["cols"][0]}"')
(OUT / 'ER_diagram.mmd').write_text('\n'.join(mm) + '\n')

# ------------------------------------------------------------------ relational schema
rs = ['# Relational schema (MySQL)', '',
      'Notation: **PK attributes in bold**, *foreign keys in italics* with `→ referenced table(column)`; `[U]` = UNIQUE; `[N]` = nullable.',
      f'The schema has {len(tables)} relations. All are in BCNF/3NF: every non-key attribute depends on the key, the whole key, and nothing but the key '
      '(e.g. owner names live only in `stakeholder`; lifecycle facts live in their own relation keyed by `battery_id`).', '']
for gk, gname in GROUP_NAMES.items():
    rs += [f'## {gname}', '']
    for n, t in tables.items():
        if GROUPS[n] != gk: continue
        parts = []
        for c in t['cols']:
            nm = c['name']
            if nm in t['pk']: s = f'**{nm}**'
            elif nm in fkcols[n]: s = f'*{nm}*'
            else: s = nm
            if any([nm] == u for u in t['uniques']): s += ' [U]'
            if c['null'] and nm not in t['pk']: s += ' [N]'
            parts.append(s)
        rs.append(f'**{n.upper()}** ( {", ".join(parts)} )')
        rs.append('')
        for fk in t['fks']:
            rs.append(f'- FK `{", ".join(fk["cols"])}` → `{fk["ref"]}({", ".join(fk["refcols"])})` {fk["rule"]}')
        for u in t['uniques']:
            if len(u) > 1: rs.append(f'- UNIQUE `({", ".join(u)})`')
        rs.append('')
(OUT / 'relational_schema.md').write_text('\n'.join(rs))

# ------------------------------------------------------------------ data dictionary
dd = ['# Data dictionary (MySQL)', '', f'{len(tables)} tables. Key: PK primary key, FK foreign key, U unique.', '']
for gk, gname in GROUP_NAMES.items():
    dd += [f'## {gname}', '']
    for n, t in tables.items():
        if GROUPS[n] != gk: continue
        dd += [f'### `{n}`', '', '| Column | Type | Null | Key | Default / notes |', '|---|---|---|---|---|']
        for c in t['cols']:
            key = []
            if c['name'] in t['pk']: key.append('PK')
            for fk in t['fks']:
                if c['name'] in fk['cols']: key.append(f'FK → {fk["ref"]}')
            if any([c['name']] == u for u in t['uniques']): key.append('U')
            note = []
            if c['auto']: note.append('auto-increment')
            if c['default']: note.append(f'default {c["default"]}')
            dd.append(f'| {c["name"]} | `{c["type"]}` | {"YES" if c["null"] else "NO"} | {", ".join(key)} | {"; ".join(note)} |')
        extra = []
        for u in t['uniques']:
            if len(u) > 1: extra.append(f'UNIQUE ({", ".join(u)})')
        for cn, expr in t['checks']:
            extra.append(f'CHECK `{cn}`: `{expr}`')
        for iname, icols, kind in idx.get(n, []):
            extra.append(f'{kind} index `{iname}` on ({icols})')
        if extra:
            dd += ['', 'Constraints & indexes:'] + [f'- {e}' for e in extra]
        dd.append('')
(OUT / 'data_dictionary.md').write_text('\n'.join(dd))
print(f'Generated docs for {len(tables)} tables.')
