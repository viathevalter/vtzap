# Painel Interno WhatsApp (Cobranças)

Este é o sistema de automação e envio de mensagens e cobranças via WhatsApp.

## Pré-requisitos (No computador do funcionário)

Antes de começar, certifique-se de que o computador tem instalado:
1. **Node.js** (Para rodar a interface) - baixe e instale a versão LTS
2. **Python** (Para rodar o robô/backend) - baixe e instale a versão 3.12+ (Marque a caixa "Add Python to PATH" na instalação)
3. **Google Chrome** (Para o robô de WhatsApp abrir e conectar)
4. Um editor de código como o **Visual Studio Code (VSCode)** (opcional, mas recomendado para facilitar)

## Instalação e Configuração Inicial

Abra o terminal (ou Prompt de Comando) e siga os passos abaixo:

1. Clone (baixe) este repositório para o computador:
   ```bash
   git clone https://github.com/viathevalter/vtzap.git
   cd vtzap
   ```

2. Instale as dependências da interface (Frontend):
   ```bash
   npm install
   ```

3. Crie e ative um ambiente virtual para o Python (Backend):
   No Windows:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
   No Mac/Linux:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

4. Com o ambiente virtual ativado, instale as dependências do robô:
   ```bash
   pip install -r requirements.txt
   ```

## Como Rodar o Sistema no Dia a Dia

Sempre que for trabalhar com o painel e os envios, você precisará iniciar duas coisas: a Interface visual e o Motor do Robô (Backend). Recomendamos abrir dois terminais diferentes para isso.

### Terminal 1 (O Motor - Backend)
Entre na pasta `vtzap`, ative o ambiente virtual e rode o servidor:
```bash
.venv\Scripts\activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*(Deixe este terminal aberto.)*

### Terminal 2 (A Interface - Frontend)
Entre na pasta `vtzap` e rode a interface:
```bash
npm run dev
```
*(Deixe este terminal aberto.)*

**Pronto!** O sistema do painel já está online. Você já pode abrir o navegador e acessar:
👉 **[http://localhost:5173/](http://localhost:5173/)**
