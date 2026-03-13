import pyautogui
import pyperclip
import time
import os
import random
import webbrowser
from urllib.parse import quote
from datetime import datetime

from backend.models import Contact, Template, TemplateType, CalibrationProfile

# Safety buffer disables
pyautogui.FAILSAFE = False

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
    'clear_search': 'Botão Limpar Busca (X)',
    'first_result': 'Primeiro Resultado da Busca'
}

class WhatsAppService:
    def __init__(self):
        self.is_running = False
        self.baseline_colors = None

    def _log(self, contact: Contact, step: str):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {contact.phone} - {step}")

    def initialize(self, profile: CalibrationProfile):
        self._log(Contact(name="System", phone="000"), "Switching to adjacent browser tab...")
        time.sleep(1)
        pyautogui.hotkey('ctrl', '1')
        time.sleep(1)
        
        self._log(Contact(name="System", phone="000"), "Gerando Gabarito de Tela Vazia (Linha Vertical)...")
        # Prepara a tela vazia
        self._click_point(profile, 'new_chat')
        self._click_point(profile, 'clear_search')
        self._click_point(profile, 'search')
        self._copy_paste("0000000000000")
        self._random_sleep(1.0, 1.5) # Aguarda painel "Nenhum resultado"
        
        search_point = next((p for p in profile.points if p.actionName == POINT_MAP['search']), None)
        fr_point = next((p for p in profile.points if p.actionName == POINT_MAP['first_result']), None)
        
        if search_point and fr_point:
            self.baseline_colors = self._scan_vertical_line(fr_point.x, search_point.y + 45, length=300, step=3)
        else:
            self.baseline_colors = [(255,255,255) for _ in range(100)]
            
        self._click_point(profile, 'clear_search')
        self._random_sleep(0.3, 0.5)

    def _scan_vertical_line(self, x_pos, start_y, length=300, step=3):
        import ctypes
        hdc = ctypes.windll.user32.GetWindowDC(0)
        colors = []
        try:
            for dy in range(0, length, step):
                y = int(start_y + dy)
                if x_pos > 0 and y > 0:
                    color = ctypes.windll.gdi32.GetPixel(hdc, x_pos, y)
                    r = color & 0xFF
                    g = (color >> 8) & 0xFF
                    b = (color >> 16) & 0xFF
                    colors.append((r, g, b))
        finally:
            ctypes.windll.user32.ReleaseDC(0, hdc)
        return colors

    def _random_sleep(self, min_val: float, max_val: float):
        time.sleep(random.uniform(min_val, max_val))

    def _click_point(self, profile: CalibrationProfile, point_key: str):
        action_name = POINT_MAP.get(point_key)
        if not action_name:
            raise Exception(f"Unknown point key: {point_key}")
            
        point = next((p for p in profile.points if p.actionName == action_name), None)
        if not point or point.x is None or point.y is None:
            raise Exception(f"Calibration point missing: {point_key} ('{action_name}')")
            
        pyautogui.moveTo(point.x, point.y)
        self._random_sleep(0.3, 0.6)
        pyautogui.click()
        self._random_sleep(0.4, 0.8)

    def _copy_paste(self, text: str):
        pyperclip.copy(text)
        self._random_sleep(0.1, 0.3)
        pyautogui.hotkey('ctrl', 'v')
        self._random_sleep(0.2, 0.5)

    def open_chat(self, phone: str, profile: CalibrationProfile):
        fr_point = next((p for p in profile.points if p.actionName == POINT_MAP['first_result']), None)
        search_point = next((p for p in profile.points if p.actionName == POINT_MAP['search']), None)
        
        if not fr_point or not search_point:
            raise Exception("Pontos de calibração faltando.")
        
        import time
        scan_x = fr_point.x
        scan_start_y = search_point.y + 45
        
        # 1. Limpa, Foca e Cola Número Real Diferenciado (O Gabarito já está na RAM desde Initialize)
        self._click_point(profile, 'new_chat')
        self._click_point(profile, 'clear_search')
        self._click_point(profile, 'search')
        self._copy_paste(phone)
            
        contact_found = False
        start_wait = time.time()
        dynamic_click_y = None
        
        # Cria array base seguro
        safe_baseline = self.baseline_colors if hasattr(self, 'baseline_colors') and self.baseline_colors else [(255,255,255) for _ in range(100)]
        debug_log_once = False
        
        while time.time() - start_wait < 12.0:
            self._random_sleep(0.8, 1.2)
            current_colors = self._scan_vertical_line(scan_x, scan_start_y, length=300, step=3)
            
            total_diffs = 0
            max_diff = 0
            
            for c1, c2 in zip(safe_baseline, current_colors):
                dr = abs(c1[0] - c2[0])
                dg = abs(c1[1] - c2[1])
                db = abs(c1[2] - c2[2])
                
                diff = max(dr, dg, db)
                if diff > max_diff:
                    max_diff = diff
                    
                if diff > 20:
                    total_diffs += 1
                    if total_diffs >= 4:
                        contact_found = True
                        break
                        
            # Log to terminal for debugging Y-coordinate shift
            if not debug_log_once:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Píxel Debug Num {phone} | Máx Diferença: {max_diff} | Pixels Diferentes: {total_diffs} | Baseline size: {len(safe_baseline)} | Cur size: {len(current_colors)}")
                debug_log_once = True
            
            if contact_found:
                break
                
        if not contact_found:
            self._log(Contact(name="System", phone=phone), f"Número não encontrado (Max diff visual: {max_diff}).")
            try:
                self._click_point(profile, 'clear_search')
                self._click_point(profile, 'search')
                pyautogui.press('esc')
                self._random_sleep(0.4, 0.7)
            except Exception as e:
                pass
            raise Exception("Sem WhatsApp (Não encontrado na busca)")
        
        self._log(Contact(name="System", phone=phone), f"Contato vivo detectado! (Píxels alterados: {total_diffs})")
        try:
            self._click_point(profile, 'first_result')
        except Exception as e:
            self._log(Contact(name="System", phone=phone), f"Erro ao tentar clicar no Contato.")

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
            err_msg = f"[{datetime.now().strftime('%H:%M:%S')}] FATAL ERROR NO CONTATO {contact.phone}: {str(e)}\n"
            print(err_msg.strip())
            with open("backend/data/vt_log.txt", "a", encoding="utf-8") as f:
                f.write(err_msg)
            self._log(contact, f"Error: {e}")
            return False
