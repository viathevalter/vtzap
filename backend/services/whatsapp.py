import pyautogui
import pyperclip
import time
import os
import random
import webbrowser
from urllib.parse import quote
from datetime import datetime

from backend.models import Contact, Template, TemplateType, CalibrationProfile

# Safety buffer
pyautogui.FAILSAFE = True

# Point Mapping (Backend Key -> Frontend Name)
POINT_MAP = {
    'url': 'Barra de Endereço (URL)',
    'new_chat': 'Botão Novo Chat (+)',
    'input': 'Caixa de Mensagem',
    'attach': 'Botão Clipe (Anexar)',
    'image': 'Opção Foto/Vídeo',
    'document': 'Opção Documento',
    'send': 'Botão Enviar',
    'search': 'Buscar Contato',
    'first_result': 'Primeiro Resultado da Busca'
}

class WhatsAppService:
    def __init__(self):
        self.is_running = False

    def _log(self, contact: Contact, step: str):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {contact.phone} - {step}")

    def initialize(self, profile: CalibrationProfile):
        # We assume the user already has WhatsApp Web open and focused
        # We only wait a short time before starting the clicks
        time.sleep(1)

    def _random_sleep(self, min_val: float, max_val: float):
        """Sleeps for a random duration between min_val and max_val to mimic human behavior."""
        time.sleep(random.uniform(min_val, max_val))

    def _click_point(self, profile: CalibrationProfile, point_key: str):
        action_name = POINT_MAP.get(point_key)
        if not action_name:
            raise Exception(f"Unknown point key: {point_key}")
            
        point = next((p for p in profile.points if p.actionName == action_name), None)
        if not point or point.x is None or point.y is None:
            raise Exception(f"Calibration point missing: {point_key} ('{action_name}')")
            
        pyautogui.click(point.x, point.y)
        self._random_sleep(0.4, 0.8)

    def _copy_paste(self, text: str):
        pyperclip.copy(text)
        self._random_sleep(0.1, 0.3)
        pyautogui.hotkey('ctrl', 'v')
        self._random_sleep(0.2, 0.5)

    def open_chat(self, phone: str, profile: CalibrationProfile):
        # Instead of reloading the page via URL, we use the WhatsApp Search/New Chat button
        
        # Click the new chat button (+) to open the contact drawer
        self._click_point(profile, 'new_chat')
        self._random_sleep(0.5, 1.0) # Wait for the drawer to slide open
        
        self._click_point(profile, 'search')
        self._random_sleep(0.8, 1.3) # Wait for search bar to focus
        
        self._copy_paste(phone)
        
        # We need a small delay here for WhatsApp to query the number locally and show the result
        self._random_sleep(1.8, 2.5) 
        
        # Click the first search result explicitly instead of just pressing enter
        self._click_point(profile, 'first_result')
        self._random_sleep(0.8, 1.2) # Short wait for chat pane to open

    def send_text_message(self, text: str, profile: CalibrationProfile):
        # Click input box to ensure focus? Usually URL opens with focus.
        # But for safety we can try to click input box if defined.
        try:
            self._click_point(profile, 'input')
        except:
            pass # If not defined, assume focus
        
        self._copy_paste(text)
        self._random_sleep(0.4, 0.7)
        pyautogui.press('enter')
        self._random_sleep(0.4, 0.7)

    def send_attachment(self, type_key: str, file_path: str, profile: CalibrationProfile):
        # type_key: 'image' or 'document'
        
        # 1. Click Attach
        self._click_point(profile, 'attach')
        self._random_sleep(0.4, 0.6)
        
        # 2. Click Option (Image or Document)
        self._click_point(profile, type_key)
        self._random_sleep(1.2, 1.8) # Wait for file dialog
        
        # 3. Paste Path & Enter
        self._copy_paste(os.path.abspath(file_path))
        self._random_sleep(0.3, 0.6)
        pyautogui.press('enter')
        self._random_sleep(1.2, 2.0) # Wait for upload preview
        
        # 4. Confirm Send
        pyautogui.press('enter')
        self._random_sleep(1.2, 1.8) # Wait for message sent

    def send_image(self, image_path: str, profile: CalibrationProfile):
        self.send_attachment('image', image_path, profile)

    def send_pdf(self, pdf_path: str, profile: CalibrationProfile):
        self.send_attachment('document', pdf_path, profile)

    def send_message(self, contact: Contact, template: Template, profile: CalibrationProfile):
        try:
            phone = contact.phone
            msg_content = template.content.replace("{nome}", contact.name)
            if contact.due_date: msg_content = msg_content.replace("{vencimento}", contact.due_date)
            if contact.value: msg_content = msg_content.replace("{valor}", contact.value)
            if contact.link: msg_content = msg_content.replace("{link}", contact.link)
            
            self._log(contact, "Opening Chat")
            self.open_chat(phone, profile)
            
            if template.type == TemplateType.TEXT:
                self._log(contact, "Sending Text")
                self.send_text_message(msg_content, profile)
                
            elif template.type == TemplateType.TEXT_IMAGE:
                self._log(contact, "Sending Text")
                self.send_text_message(msg_content, profile)
                self._log(contact, "Sending Image")
                if template.attachmentImage and os.path.exists(template.attachmentImage):
                    self.send_image(template.attachmentImage, profile)
                else:
                    raise Exception("Image not found")
                    
            elif template.type == TemplateType.TEXT_PDF:
                self._log(contact, "Sending Text")
                self.send_text_message(msg_content, profile)
                self._log(contact, "Sending PDF")
                if template.attachmentPdf and os.path.exists(template.attachmentPdf):
                    self.send_pdf(template.attachmentPdf, profile)
                else:
                    raise Exception("PDF not found")

            elif template.type == TemplateType.TEXT_IMAGE_PDF:
                 # Composition: Text -> Image -> Pdf
                self._log(contact, "Sending Text")
                self.send_text_message(msg_content, profile)
                
                self._log(contact, "Sending Image")
                if template.attachmentImage and os.path.exists(template.attachmentImage):
                    self.send_image(template.attachmentImage, profile)
                else:
                    raise Exception("Image not found")
                
                # Small buffer between image and pdf
                self._random_sleep(1.5, 2.5)
                
                self._log(contact, "Sending PDF")
                if template.attachmentPdf and os.path.exists(template.attachmentPdf):
                    self.send_pdf(template.attachmentPdf, profile)
                else:
                    raise Exception("PDF not found")
            
            self._log(contact, "Success")
            return True
        except Exception as e:
            self._log(contact, f"Error: {e}")
            print(f"Failed to send to {contact.name}: {e}")
            return False
