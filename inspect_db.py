import json

with open('database/users_cache.json', encoding='utf-8') as f:
    users = json.load(f)
with open('database/facilities_cache.json', encoding='utf-8') as f:
    facs = json.load(f)
with open('database/assessments_cache.json', encoding='utf-8') as f:
    asms = json.load(f)

print('=== USERS ===')
for email, u in users.items():
    print(f"{email} -> id: {u.get('id')}, name: {u.get('full_name')}")

print('\n=== FACILITIES ===')
for fid, f in facs.items():
    print(f"FID: {fid} -> user_id: {f.get('user_id')}, name: {f.get('facility_name')}, city: {f.get('city')}")

print('\n=== ASSESSMENTS ===')
for aid, a in asms.items():
    res = a.get('result', {})
    print(f"AID: {aid} -> user_id: {res.get('user_id')}, fac_id: {res.get('facility_id')}, fac_name: {res.get('facility_name')}, co2e: {res.get('total_co2e_tonnes')}, date: {res.get('created_at')}")
