import pandas as pd
import json

df = pd.read_excel("EnvioCobranca - Copia.xlsx")
df.columns = [str(c).strip().lower() for c in df.columns]

name_col = next((c for c in df.columns if c in ['nome', 'name', 'contato', 'cliente', '0', 'nome do negócio']), None)
phone_col = next((c for c in df.columns if c in ['telefone', 'phone', 'celular', 'numero', 'whatsapp', 'zap', '1', 'contato: telefone de trabalho']), None)

print("Columns:", df.columns.tolist())
print("Name col:", name_col)
print("Phone col:", phone_col)

if not name_col and len(df.columns) > 0:
    name_col = df.columns[0]
if not phone_col and len(df.columns) > 1:
    phone_col = df.columns[1]

contacts = []
for _, row in df.iterrows():
    name_val = str(row[name_col]) if name_col and pd.notna(row[name_col]) else "Unknown"
    phone_val = str(row[phone_col]) if phone_col and pd.notna(row[phone_col]) else ""
    clean_phone = ''.join(filter(str.isdigit, phone_val))

    if clean_phone:
        contacts.append({
            "name": name_val,
            "phone": clean_phone
        })

print(json.dumps(contacts[:5], indent=2))
