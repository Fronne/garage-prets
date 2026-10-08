import random, datetime as dt
random.seed(42)
now = dt.datetime(2026,10,8,17,40, tzinfo=dt.timezone.utc)
V = [('Clio IV grise','EF-418-KL'),('208 noire','GH-772-PR'),('C3 blanche','FN-305-TD'),('Twingo rouge','EK-129-BV'),
     ('Polo bleue','GA-846-HS'),('Sandero beige','FZ-561-MC'),('Kangoo utilitaire','DX-934-RJ'),('Yaris grise','GD-207-LN')]
# voiture -> (jours depuis le départ, jours prévus) du prêt en cours
ACTIF = {1:(2,4), 2:(6,4), 5:(0,None), 6:(4,5)}
C = ['M. Lefebvre','Mme Garcia','M. Dubois','Mme Moreau','M. Laurent','Mme Petit','M. Roux','Mme Fournier','M. Girard','Mme Bonnet',
     'M. Mercier','Mme Lambert','M. Faure','Mme Rousseau','M. Blanc','Mme Chevalier','M. Henry','Mme Gauthier','M. Perrin','Mme Robin',
     'M. Benali','Mme Nguyen','M. Haddad','Mme Da Silva','M. Ferreira','Mme Kaya','M. Martinez','Mme Lopez']
N = ['Sa Mégane en carrosserie','Sa 3008 en peinture','Débosselage de sa portière','Rayure déjà présente pare-choc AR','Réservoir à moitié',
     'Sa Golf au contrôle technique','Pare-brise de sa voiture en commande','Sièges enfant à rendre avec','Embrayage de son Scénic']
PAR = ['Mehdi','Samy','Sofian','Cyril']
def heure(d):  # entre 8 h et 18 h, heure de Paris (UTC+2)
    return d.replace(hour=random.randint(6,15), minute=random.choice([0,5,10,15,20,30,40,45,50]), second=0, microsecond=0)
iso = lambda d: d.strftime('%Y-%m-%dT%H:%M:%S.000Z')
out = []
n = 0
for i,(nom,im) in enumerate(V):
    out.append(f"INSERT INTO vehicules (id, nom, immat) VALUES ('demo-v{i+1}', '{nom}', '{im}');")
    t = now - dt.timedelta(days=random.randint(150,170))
    prev = None
    stop = now - dt.timedelta(days=(ACTIF[i][0] if i in ACTIF else 0) + 1)
    while True:
        dur = random.choice([1,1,2,2,3,3,4,5,6,8,10])
        dep = heure(t)
        if prev and dep <= prev: dep = prev + dt.timedelta(hours=1, minutes=10)
        ret = heure(dep + dt.timedelta(days=dur))
        if ret <= dep: ret = dep + dt.timedelta(hours=20)
        if ret >= stop: break
        prevu = (dep + dt.timedelta(days=dur + random.choice([0,0,0,-1,1]))).date().isoformat() if random.random() < .7 else None
        n += 1
        cl = random.choice(C); tel = f"06{random.randint(10000000,99999999)}" if random.random() < .6 else None
        note = random.choice(N) if random.random() < .35 else None
        q = lambda x: 'NULL' if x is None else "'" + x.replace("'", "''") + "'"
        out.append(f"INSERT INTO prets (id, vehicule_id, client, tel, note, depart, retour_prevu, retour, par) VALUES ('demo-p{n}', 'demo-v{i+1}', {q(cl)}, {q(tel)}, {q(note)}, '{iso(dep)}', {q(prevu)}, '{iso(ret)}', '{random.choice(PAR)}');")
        prev = ret
        t = ret + dt.timedelta(days=random.choice([0,0,1,1,2,3,5,7]))
    if i in ACTIF:
        d, p = ACTIF[i]
        dep = heure(now - dt.timedelta(days=d)) if d else now - dt.timedelta(hours=2)
        prevu = (dep + dt.timedelta(days=p)).date().isoformat() if p else None
        n += 1
        out.append(f"INSERT INTO prets (id, vehicule_id, client, tel, note, depart, retour_prevu, retour, par) VALUES ('demo-p{n}', 'demo-v{i+1}', '{random.choice(C)}', '06{random.randint(10000000,99999999)}', NULL, '{iso(dep)}', {'NULL' if not prevu else repr(prevu)}, NULL, '{random.choice(PAR)}');")
open('demo.sql','w').write('\n'.join(out))
print(len(out), 'lignes,', n, 'prêts')
