import sys
import asyncio
from fastapi import UploadFile
from backend.routes import preview_contacts

async def main():
    try:
        with open("C:\\Projetos IA\\vtzapCobranca.xlsx", "rb") as f:
            file = UploadFile(filename="vtzapCobranca.xlsx", file=f)
            contacts = await preview_contacts(file)
            print(f"STATUS: Success")
            print(f"Found {len(contacts)} contacts")
            if contacts:
                print("First contact:", contacts[0].dict())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("STATUS: 500", str(e))

if __name__ == "__main__":
    asyncio.run(main())
