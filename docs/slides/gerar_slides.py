# -*- coding: utf-8 -*-
"""
Gerador de slides v2 — RabbitMQ em Sistemas Distribuídos
25 slides | 1 ideia por slide | visual-first
python gerar_slides.py  →  RabbitMQ_Apresentacao.pptx
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
import os

# ── Paleta ───────────────────────────────────────────────────────────────────
OR = RGBColor(0xFF,0x66,0x00)   # laranja RabbitMQ
DK = RGBColor(0x1A,0x1A,0x2E)   # fundo
SC = RGBColor(0x16,0x21,0x3E)   # fundo secundário
AC = RGBColor(0x0F,0x3A,0x5E)   # azul-escuro
WH = RGBColor(0xFF,0xFF,0xFF)
LG = RGBColor(0xCC,0xCC,0xCC)   # cinza claro
GR = RGBColor(0x88,0x88,0x88)   # cinza
GN = RGBColor(0x2E,0xCC,0x71)   # verde
YW = RGBColor(0xF3,0x9C,0x12)   # amarelo
RD = RGBColor(0xE7,0x4C,0x3C)   # vermelho
PL = RGBColor(0x9B,0x59,0xB6)   # roxo
BL = RGBColor(0x29,0x80,0xB9)   # azul
PH = RGBColor(0x14,0x1B,0x33)   # placeholder bg

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "RabbitMQ_Apresentacao.pptx")
prs = Presentation()
prs.slide_width  = Inches(13.33)
prs.slide_height = Inches(7.5)
BLK = prs.slide_layouts[6]

# ── Primitivos ────────────────────────────────────────────────────────────────
def R(sl,l,t,w,h,fill=None,lc=None,lw=1.0):
    s=sl.shapes.add_shape(1,Inches(l),Inches(t),Inches(w),Inches(h))
    if fill: s.fill.solid(); s.fill.fore_color.rgb=fill
    else: s.fill.background()
    if lc: s.line.color.rgb=lc; s.line.width=Pt(lw)
    else: s.line.fill.background()
    s.shadow.inherit=False; return s

def T(sl,text,l,t,w,h,sz=16,bold=False,color=WH,align=PP_ALIGN.LEFT,italic=False,wrap=True):
    tx=sl.shapes.add_textbox(Inches(l),Inches(t),Inches(w),Inches(h))
    tf=tx.text_frame; tf.word_wrap=wrap
    p=tf.paragraphs[0]; p.alignment=align
    r=p.add_run(); r.text=text
    r.font.size=Pt(sz); r.font.bold=bold; r.font.italic=italic
    r.font.color.rgb=color; r.font.name="Calibri"; return tx

def bg(sl): R(sl,0,0,13.33,7.5,fill=DK)
def bar(sl,h=0.07): R(sl,0,0,13.33,h,fill=OR)
def ns(sl,n): T(sl,str(n),12.8,7.15,0.5,0.32,sz=11,color=GR,align=PP_ALIGN.RIGHT)

def head(sl,title,sub=None,sec=None):
    bar(sl)
    yo=0.1
    if sec: T(sl,sec,0.5,0.1,12.0,0.28,sz=10,bold=True,color=OR,italic=True); yo=0.35
    T(sl,title,0.5,yo,12.3,0.75,sz=30,bold=True)
    if sub: T(sl,sub,0.5,yo+0.72,12.3,0.38,sz=14,color=LG,italic=True)
    R(sl,0.5,yo+1.08,12.33,0.04,fill=OR)

def bul(sl,items,l,t,w,sz=14,bc=OR,tc=LG,dy=0.44):
    y=t
    for item in items:
        T(sl,"▸",l,y,0.28,0.38,sz=sz,color=bc,bold=True)
        T(sl,item,l+0.32,y,w-0.32,0.38,sz=sz,color=tc); y+=dy
    return y

def cod(sl,l,t,w,h,lines,sz=11.5):
    R(sl,l,t,w,h,fill=RGBColor(0x0D,0x0D,0x1A))
    tx=sl.shapes.add_textbox(Inches(l+0.12),Inches(t+0.1),Inches(w-0.24),Inches(h-0.2))
    tf=tx.text_frame; tf.word_wrap=True
    for i,ln in enumerate(lines.strip().split("\n")):
        p=tf.paragraphs[0] if i==0 else tf.add_paragraph()
        p.alignment=PP_ALIGN.LEFT
        r=p.add_run(); r.text=ln if ln else " "
        r.font.size=Pt(sz); r.font.name="Courier New"; r.font.color.rgb=GN

def ph(sl,tipo,label,instrucao,l,t,w,h):
    """Placeholder visual — substituir com imagem/GIF/screenshot."""
    B=0.03
    R(sl,l,t,w,h,fill=OR)
    R(sl,l+B,t+B,w-2*B,h-2*B,fill=PH)
    # heights mínimos para evitar valores negativos em h pequeno
    h_tipo  = min(0.3,  max(0.15, h*0.25))
    h_label = min(0.5,  max(0.2,  h*0.4))
    h_instr = max(0.15, h - 1.1)
    T(sl,f"[ {tipo.upper()} — SUBSTITUIR ]",l+0.15,t+0.1,w-0.3,h_tipo,sz=10,bold=True,color=OR)
    if h > 0.55:
        T(sl,label,l+0.15,t+0.1+h_tipo+0.05,w-0.3,h_label,sz=min(14,int(h*12)),bold=True,color=WH)
    if h > 0.95 and instrucao:
        T(sl,instrucao,l+0.15,t+0.95,w-0.3,h_instr,sz=11,color=LG,italic=True)

def card(sl,titulo,desc,l,t,w,h,ac=OR,bg_c=SC):
    R(sl,l,t,w,h,fill=bg_c)
    R(sl,l,t,0.18,h,fill=ac)
    T(sl,titulo,l+0.28,t+0.07,w-0.35,0.38,sz=14,bold=True,color=ac)
    T(sl,desc,l+0.28,t+0.45,w-0.35,h-0.55,sz=12.5,color=LG)

def panel(sl,title,items,l,t,w,h,ac=OR):
    R(sl,l,t,w,h,fill=SC)
    R(sl,l,t,w,0.5,fill=ac)
    T(sl,title,l+0.12,t+0.06,w-0.24,0.38,sz=15,bold=True,color=DK)
    bul(sl,items,l+0.12,t+0.6,w-0.2,sz=13,dy=0.42)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — Capa
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
R(sl,0,0,0.55,7.5,fill=OR)
R(sl,0.55,2.0,12.78,3.5,fill=SC)
T(sl,"RabbitMQ",1.0,2.1,11.8,1.25,sz=72,bold=True,color=OR,align=PP_ALIGN.CENTER)
T(sl,"Mensageria em Sistemas Distribuídos",1.0,3.3,11.8,0.7,sz=26,color=WH,align=PP_ALIGN.CENTER)
T(sl,"Confiabilidade · Ordenação · Tolerância a Falhas",1.0,4.0,11.8,0.5,sz=17,color=GR,align=PP_ALIGN.CENTER,italic=True)
R(sl,1.5,4.52,10.33,0.04,fill=OR)
T(sl,"Arthur Real Sanchotene Ferreira  ·  Caroline da Rocha de Lima  ·  Giovani da Silva Cancherini",1.0,4.65,11.8,0.45,sz=13,color=LG,align=PP_ALIGN.CENTER)
T(sl,"Leonardo Vargas Schilling  ·  Osmar Sadi Nether Filho",1.0,5.08,11.8,0.45,sz=13,color=LG,align=PP_ALIGN.CENTER)
T(sl,"Sistemas Distribuídos — 2026",1.0,5.58,11.8,0.4,sz=12.5,color=GR,align=PP_ALIGN.CENTER,italic=True)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 2 — Agenda
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl); bar(sl); ns(sl,2)
T(sl,"Agenda",0.5,0.18,12.0,0.72,sz=32,bold=True)
temas=[
    ("01","O que é — e por que existe?",OR),
    ("02","Arquitetura e Funcionalidades",YW),
    ("03","Tipos de Falhas Suportadas",GN),
    ("04","Confiabilidade — modelos formais",BL),
    ("05","Ordenação de Mensagens",PL),
    ("06","Implementação Interna",LG),
    ("07","Demonstração Prática — TicketLab",OR),
]
dy2=0.82
for i,(num,tema,cor) in enumerate(temas):
    col=0 if i<4 else 1
    row=i if col==0 else i-4
    lx=0.45+col*6.55; ly=1.35+row*dy2
    R(sl,lx,ly,0.68,0.68,fill=cor)
    T(sl,num,lx,ly,0.68,0.68,sz=20,bold=True,color=DK,align=PP_ALIGN.CENTER)
    R(sl,lx+0.68,ly,5.75,0.68,fill=SC)
    T(sl,tema,lx+0.82,ly+0.12,5.5,0.48,sz=16,color=WH)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 3 — O Problema
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"O Problema","HTTP síncrono: uma cadeia que quebra pela parte mais fraca")
ns(sl,3)
T(sl,"Imagine o Lollapalooza abrindo vendas às 10h — 50.000 pessoas clicando ao mesmo tempo.",
   0.5,1.6,12.3,0.5,sz=15,color=LG,italic=True)
cod(sl,0.5,2.15,7.7,2.3,
"""Usuário → API → chama Pagamento (aguarda 3s)
             → chama Estoque   (aguarda 1s)
             → chama Email     (aguarda 2s)
             ← responde após 6 segundos

Se Pagamento demorar 30s   → Timeout. Usuário vê erro 500.
Se Estoque cair            → Toda a compra falha.
2 usuários simultâneos     → Overbooking possível.""")
R(sl,8.55,2.15,4.5,2.3,fill=RGBColor(0x30,0x0A,0x0A))
T(sl,"O que falha",8.72,2.22,4.15,0.38,sz=14,bold=True,color=RD)
probs=["Timeout em cascata","Falha se qualquer\nserviço cair","Overbooking","Thread presa até o fim","Escalar = problema"]
y_p=2.62
for p in probs:
    T(sl,"✗",8.72,y_p,0.3,0.38,sz=13,bold=True,color=RD)
    T(sl,p,9.05,y_p,3.85,0.38,sz=13,color=LG); y_p+=0.42
T(sl,"▸ Dica: abrir no browser antes da apresentação",0.5,4.55,12.3,0.3,sz=11,color=OR,italic=True)
ph(sl,"VÍDEO OPCIONAL","'RabbitMQ in 100 Seconds' — Fireship (YouTube)",
   "Buscar: 'RabbitMQ in 100 Seconds Fireship' | Abrir no browser, reproduzir primeiros 45 segundos.\nMostra o problema do HTTP síncrono de forma animada. Pausar antes do slide 4.",
   0.5,4.85,12.33,2.35)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 4 — A Solução
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"A Solução","Desacoplar produção de consumo via broker de mensagens")
ns(sl,4)
# Pipeline visual
comps=[("Usuário",0.5),("API",2.6),("Fila",4.7),("worker 1",6.8),("worker 2",9.15),("worker 3",11.5)]
cores_c=[AC,AC,OR,SC,SC,SC]
for (label,lx),cor in zip(comps,cores_c):
    R(sl,lx,2.0,1.85,0.9,fill=cor)
    T(sl,label,lx,2.0,1.85,0.9,sz=14,bold=True,align=PP_ALIGN.CENTER)
for ax in [2.1,4.2,6.3,8.55,10.9]:
    T(sl,"→",ax,2.22,0.5,0.5,sz=22,bold=True,color=OR,align=PP_ALIGN.CENTER)
# resposta imediata
R(sl,2.6,3.05,3.95,0.42,fill=RGBColor(0x05,0x30,0x15))
T(sl,'↩  API responde imediato: { "status": "pending" }',2.75,3.1,3.7,0.35,sz=12,color=GN)
# benefícios
benefs=[
    (GN,"Resposta imediata","API retorna na hora. Processamento ocorre em background."),
    (YW,"Workers independentes","Cada etapa é um serviço separado. Falha num não para os outros."),
    (BL,"Escalabilidade natural","Adicionar workers = aumentar throughput sem mudar a API."),
]
for i,(cor,titulo,desc) in enumerate(benefs):
    lx=0.5+i*4.25
    R(sl,lx,3.7,4.0,2.8,fill=SC)
    R(sl,lx,3.7,4.0,0.48,fill=cor)
    T(sl,titulo,lx+0.12,3.76,3.75,0.38,sz=15,bold=True,color=DK)
    T(sl,desc,lx+0.12,4.25,3.75,1.0,sz=13.5,color=LG)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 5 — O que é RabbitMQ
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"O que é o RabbitMQ?","Message broker open-source — o intermediário confiável")
ns(sl,5)
# 3 grandes cards
defs=[
    (OR,"Message Broker","Intermediário entre quem envia e quem recebe mensagens.\nDesacopla produtor de consumidor no tempo e no espaço.\nNão é um banco de dados — é um canal confiável."),
    (YW,"Protocolo AMQP","Implementa AMQP 0-9-1 (Advanced Message Queuing Protocol).\nProtocolo aberto, binário, com semântica bem definida de ACK.\nTambém suporta STOMP, MQTT e AMQP 1.0 via plugins."),
    (GN,"Erlang / OTP","Escrito em Erlang — linguagem criada para sistemas de telecom\ncom 99,9999999% de disponibilidade (nine nines).\nIsolamento de processos e recuperação de falhas nativos."),
]
for i,(cor,titulo,desc) in enumerate(defs):
    lx=0.4+i*4.3
    R(sl,lx,1.65,4.1,5.4,fill=SC)
    R(sl,lx,1.65,4.1,0.6,fill=cor)
    T(sl,titulo,lx+0.15,1.7,3.8,0.5,sz=18,bold=True,color=DK)
    T(sl,desc,lx+0.15,2.35,3.8,4.4,sz=14,color=LG)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 6 — Onde é utilizado
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Onde é utilizado?","Qualquer sistema que precisa desacoplar e escalar")
ns(sl,6)
casos=[
    (OR,"E-commerce","Checkout → pagamento → estoque → notificação.\nExatamente o nosso projeto TicketLab."),
    (YW,"Sistemas bancários","Processamento assíncrono de transações.\nAuditoria e filas de conciliação."),
    (GN,"IoT e sensores","Ingestão de eventos de milhares de dispositivos.\nFanout para múltiplos consumidores analíticos."),
    (BL,"Microserviços","Comunicação entre bounded contexts sem acoplamento temporal.\nEvent-driven architecture."),
    (PL,"Reservas / Ingressos","Controle de concorrência em estoque limitado.\nFila garante que só um worker por vez altera o estoque."),
]
xs=[0.35,2.9,5.45,8.0,10.55]
for (cor,titulo,desc),lx in zip(casos,xs):
    R(sl,lx,1.65,2.3,5.4,fill=SC)
    R(sl,lx,1.65,2.3,0.52,fill=cor)
    T(sl,titulo,lx+0.1,1.7,2.1,0.42,sz=13.5,bold=True,color=DK)
    T(sl,desc,lx+0.1,2.25,2.1,4.6,sz=12.5,color=LG)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 7 — Arquitetura: os 4 componentes
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Arquitetura Interna","Producer → Exchange → Queue → Consumer")
ns(sl,7)
ph(sl,"IMAGEM","Diagrama oficial — Producer → Exchange → Queue → Consumer",
   "Buscar: 'RabbitMQ Hello World tutorial diagram' em rabbitmq.com/tutorials\n"
   "Copiar a imagem do tutorial 'Hello World' (fundo branco, setas claras).\n"
   "Substituir este placeholder. Redimensionar para ocupar o espaço.",
   0.5,1.6,7.6,4.8)
# Descrições dos 4 componentes
comps4=[
    (OR,"Producer","Envia mensagens para o Exchange. Não conhece as filas."),
    (YW,"Exchange","Recebe e roteia via Binding + Routing Key. Não armazena."),
    (GN,"Queue","Armazena mensagens até o consumer estar pronto."),
    (BL,"Consumer","Processa e envia ACK. Só então o broker remove da fila."),
]
for i,(cor,nome,desc) in enumerate(comps4):
    ly=1.6+i*1.2
    R(sl,8.4,ly,4.7,1.08,fill=SC)
    R(sl,8.4,ly,0.18,1.08,fill=cor)
    T(sl,nome,8.68,ly+0.06,4.2,0.38,sz=14,bold=True,color=cor)
    T(sl,desc,8.68,ly+0.44,4.2,0.58,sz=12.5,color=LG)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 8 — Exchange Direct (nosso projeto)
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Exchange Direct","Como usamos no TicketLab — roteamento pela chave exata",sec="ARQUITETURA")
ns(sl,8)
ph(sl,"IMAGEM","Direct Exchange — routing_key exata roteia para a fila correspondente",
   "Buscar: 'RabbitMQ direct exchange diagram' em cloudamqp.com/blog/rabbitmq-exchanges-tutorial.html\n"
   "CloudAMQP tem diagramas limpos e coloridos para cada tipo. Usar o de Direct Exchange.",
   0.5,1.6,7.5,4.8)
T(sl,"No TicketLab",8.3,1.6,4.9,0.45,sz=16,bold=True,color=OR)
nos=[
    "ticket-sales    → routing_key='payment'   → payment-queue",
    "payment-approved → routing_key='stock'    → stock-queue",
    "stock-confirmed  → routing_key='notification' → notification-queue",
]
cod(sl,8.3,2.08,4.9,1.4,"\n".join(nos),sz=11)
T(sl,"Por que Direct?",8.3,3.6,4.9,0.38,sz=14,bold=True,color=YW)
bul(sl,["Pipeline linear: cada etapa\ntem uma fila dedicada","Routing simples e previsível","Fácil de monitorar no\nManagement UI"],
    8.3,4.0,4.9,sz=13,dy=0.5)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 9 — Exchange Fanout, Topic, Headers
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Outros Tipos de Exchange","Fanout · Topic · Headers",sec="ARQUITETURA")
ns(sl,9)
tipos3=[
    (GN,"Fanout","Copia para TODAS as filas vinculadas.\nIgnora routing key.\nUso: broadcast de eventos (logs, auditoria, notificações globais).",
     "Buscar: 'RabbitMQ fanout exchange diagram' cloudamqp"),
    (YW,"Topic","Padrão com wildcards: * (uma palavra) e # (zero ou mais).\n'order.#' captura 'order.created', 'order.paid'...\nUso: sistemas de eventos flexíveis.",
     "Buscar: 'RabbitMQ topic exchange diagram' cloudamqp"),
    (PL,"Headers","Roteia por atributos do cabeçalho AMQP.\nMais expressivo que Topic, mais raro na prática.\nUso: roteamento por metadados arbitrários.",
     "Buscar: 'RabbitMQ headers exchange diagram' cloudamqp"),
]
for i,(cor,nome,desc,hint) in enumerate(tipos3):
    lx=0.35+i*4.35
    R(sl,lx,1.6,4.1,3.2,fill=SC)
    R(sl,lx,1.6,4.1,0.52,fill=cor)
    T(sl,nome,lx+0.12,1.65,3.85,0.42,sz=17,bold=True,color=DK)
    T(sl,desc,lx+0.12,2.22,3.85,2.35,sz=13.5,color=LG)
    ph(sl,"IMAGEM",f"Diagrama {nome} Exchange",hint,lx,4.9,4.1,2.2)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 10 — Funcionalidades
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Funcionalidades","O que o RabbitMQ oferece além do roteamento básico",sec="ARQUITETURA")
ns(sl,10)
funcs=[
    (OR,"Mensagens Persistentes","delivery_mode=PERSISTENT → grava em disco antes de confirmar. Sem isso, reinício apaga tudo."),
    (OR,"Filas Durable","Metadados da fila ficam no disco. Broker reinicia → fila existe e mensagens voltam."),
    (GN,"ACK Manual","Consumer confirma só após processar e salvar. Broker só remove ao receber ACK."),
    (GN,"Dead Letter Exchange","NACK sem requeue → DLX → Dead Letter Queue para análise e reprocessamento."),
    (YW,"QoS / Prefetch","prefetch_count limita msgs em voo por consumer. Backpressure automático."),
    (BL,"Management UI / API","Interface web + HTTP API para monitorar filas, consumers e publicar msgs."),
]
cw,ch=6.1,1.08
for i,(cor,nome,desc) in enumerate(funcs):
    col=i%2; row=i//2
    lx=0.4+col*(cw+0.72)
    ly=1.65+row*(ch+0.22)
    R(sl,lx,ly,cw,ch,fill=SC)
    R(sl,lx,ly,0.18,ch,fill=cor)
    T(sl,nome,lx+0.3,ly+0.07,5.55,0.38,sz=14,bold=True,color=cor)
    T(sl,desc,lx+0.3,ly+0.48,5.55,0.55,sz=12.5,color=LG)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 11 — Crash-stop do Worker
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Falha 1: Crash-stop do Worker","O container morre — nenhuma mensagem se perde",sec="FALHAS")
ns(sl,11)
# Diagrama antes/depois com formas
estados=[
    ("Fila\npayment-queue",0.5,1.65,OR),
    ("Worker A\n(processando)",3.2,1.65,GN),
    ("Worker B\n(aguardando)",5.9,1.65,GN),
]
for label,lx,ly,cor in estados:
    R(sl,lx,ly,2.2,1.0,fill=cor if cor!=GN else AC)
    T(sl,label,lx,ly,2.2,1.0,sz=13,bold=True,align=PP_ALIGN.CENTER)
T(sl,"→",2.85,1.95,0.35,0.42,sz=22,bold=True,color=OR,align=PP_ALIGN.CENTER)
T(sl,"→",5.5,1.95,0.4,0.42,sz=22,bold=True,color=GR,align=PP_ALIGN.CENTER)
# Worker A cai
R(sl,3.2,2.9,2.2,0.55,fill=RGBColor(0x40,0x0A,0x0A))
T(sl,"✗  Worker A cai (SIGKILL)",3.3,2.95,2.0,0.42,sz=12,bold=True,color=RD)
T(sl,"↓",4.2,3.5,0.4,0.45,sz=24,bold=True,color=OR,align=PP_ALIGN.CENTER)
R(sl,3.2,4.0,2.2,0.68,fill=AC)
T(sl,"msgs unacked\nvoltam para ready",3.28,4.02,2.05,0.64,sz=12,color=YW,align=PP_ALIGN.CENTER)
T(sl,"→",5.5,4.22,0.4,0.38,sz=22,bold=True,color=GN,align=PP_ALIGN.CENTER)
R(sl,5.9,4.0,2.2,0.68,fill=RGBColor(0x0A,0x30,0x18))
T(sl,"Worker B\nassume",5.9,4.02,2.2,0.64,sz=13,bold=True,color=GN,align=PP_ALIGN.CENTER)
# Explicação
R(sl,8.5,1.65,4.6,3.55,fill=SC)
T(sl,"Por que não perde mensagens?",8.65,1.72,4.3,0.4,sz=14,bold=True,color=OR)
bul(sl,["TCP disconnect detectado\n→ RabbitMQ libera msgs unacked","Outras msgs na fila:\nestado ready, esperando","Worker B (ou C) pega\nas mensagens liberadas","Sem intervenção manual —\nautomático"],
    8.65,2.18,4.3,sz=13,dy=0.48)
cod(sl,0.5,5.3,7.8,1.1,
    "make send-1000      # enche a fila\nmake kill-payment   # mata um worker abruptamente\nmake logs-payment   # ver outro worker assumindo as mensagens",sz=12)
ph(sl,"GIF / SCREENSHOT","Terminal: make kill-payment + make logs-payment",
   "Gravar GIF do terminal com ScreenToGif (Windows) ou OBS executando os 3 comandos acima.\nAlt: screenshot de logs mostrando outro worker retomando msgs.",
   8.5,5.3,4.6,1.1)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 12 — Crash-recovery + Retry + DLQ
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Falha 2: Crash-recovery + Retry + DLQ","O broker reinicia · A lógica falha · O destino final",sec="FALHAS")
ns(sl,12)
# Crash-recovery card
R(sl,0.4,1.65,4.1,5.3,fill=SC)
R(sl,0.4,1.65,4.1,0.48,fill=GN)
T(sl,"Crash-recovery do Broker",0.55,1.7,3.85,0.38,sz=14,bold=True,color=DK)
bul(sl,["RabbitMQ reinicia\n(docker restart)","Mensagens PERSISTENT +\nfilas durable → no disco","Workers reconectam\nautomaticamente (connect_robust)","Sistema retoma de onde parou"],
    0.55,2.2,3.8,sz=13,dy=0.48)
cod(sl,0.55,4.3,3.8,0.65,"make restart-rabbit",sz=12)
ph(sl,"SCREENSHOT","RabbitMQ UI após restart — filas com mensagens intactas",
   "Capturar tela de localhost:15672 → Queues\napós executar 'make restart-rabbit'",
   0.55,5.0,3.8,0.9)
# Retry + DLQ card
R(sl,4.75,1.65,8.2,5.3,fill=SC)
R(sl,4.75,1.65,8.2,0.48,fill=YW)
T(sl,"Retry com Dead Letter Queue",4.92,1.7,7.9,0.38,sz=14,bold=True,color=DK)
cod(sl,4.92,2.2,7.85,2.55,
"""msg → worker → lógica falha (RuntimeError)
  → republica com x-retry-count: 1 → ACK original
  → falha de novo → x-retry-count: 2
  → falha de novo → x-retry-count: 3
  → max_retries atingido!
  → NACK(requeue=False) → dead-letter-exchange → dead-letter-queue""",sz=11.5)
T(sl,"Depois do make send-failures:",4.92,4.85,7.85,0.35,sz=13,bold=True,color=OR)
ph(sl,"SCREENSHOT","RabbitMQ UI — dead-letter-queue com N mensagens",
   "Após 'make send-failures', capturar localhost:15672 → Queues → dead-letter-queue → mensagens acumuladas.",
   4.92,5.25,7.85,0.65)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 13 — O que NÃO suporta
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Modelos de Falha — Resumo","O que suportamos vs. o que não suportamos",sec="FALHAS")
ns(sl,13)
suporta=[
    (GN,"Crash-stop","Worker morre → mensagens voltam para a fila automaticamente"),
    (GN,"Crash-recovery","Broker reinicia → mensagens PERSISTENT sobrevivem no disco"),
    (GN,"Omissão com retry","Falhas de lógica → DLQ após N tentativas"),
    (GN,"Partição de rede","connect_robust reconecta com backoff exponencial"),
]
nao=[
    (RD,"Falhas Byzantinas","Nó malicioso enviando mensagens forjadas ou corrompidas"),
    (RD,"Exatamente-uma-vez nativo","At-least-once → duplicatas possíveis (tratamos com idempotência)"),
]
R(sl,0.4,1.65,6.1,5.3,fill=RGBColor(0x08,0x25,0x12))
T(sl,"✓  Suportado",0.55,1.72,5.8,0.45,sz=16,bold=True,color=GN)
for i,(cor,nome,desc) in enumerate(suporta):
    ly=2.28+i*1.08
    R(sl,0.55,ly,5.8,0.92,fill=SC)
    T(sl,f"✓  {nome}",0.7,ly+0.06,5.5,0.38,sz=14,bold=True,color=GN)
    T(sl,desc,0.7,ly+0.48,5.5,0.38,sz=12.5,color=LG)
R(sl,6.85,1.65,6.1,5.3,fill=RGBColor(0x30,0x08,0x08))
T(sl,"✗  Não suportado",7.0,1.72,5.8,0.45,sz=16,bold=True,color=RD)
for i,(cor,nome,desc) in enumerate(nao):
    ly=2.28+i*1.35
    R(sl,7.0,ly,5.8,1.2,fill=SC)
    T(sl,f"✗  {nome}",7.15,ly+0.06,5.5,0.38,sz=14,bold=True,color=RD)
    T(sl,desc,7.15,ly+0.5,5.5,0.62,sz=12.5,color=LG)
T(sl,"Falhas Byzantinas requerem protocolo BFT dedicado (PBFT, Tendermint). Fora do escopo do RabbitMQ.",
   6.85,5.35,6.1,0.55,sz=12.5,color=GR,italic=True)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 14 — Fair-Loss vs Perfect Link
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Confiabilidade: Fair-Loss vs Perfect Link","O que acontece com as mensagens quando o broker cai?",sec="CONFIABILIDADE")
ns(sl,14)
# Fair-Loss
R(sl,0.4,1.6,5.9,5.4,fill=SC)
R(sl,0.4,1.6,5.9,0.55,fill=GR)
T(sl,"Fair-Loss Link",0.58,1.65,5.55,0.42,sz=17,bold=True,color=DK)
T(sl,"Msgs podem se perder, mas não são inventadas.",0.58,2.25,5.55,0.45,sz=13.5,color=LG,italic=True)
T(sl,"Configuração:",0.58,2.78,5.55,0.35,sz=13,bold=True,color=GR)
cod(sl,0.58,3.15,5.55,1.05,
    "exchange  → non-durable\nfila      → non-durable\ndelivery  → NON_PERSISTENT  (só RAM)",sz=11)
T(sl,"Resultado:",0.58,4.28,5.55,0.35,sz=13,bold=True,color=RD)
bul(sl,["Broker reinicia → msgs na RAM somem","Nenhum aviso ao producer","Garantia? Nenhuma."],
    0.58,4.65,5.55,sz=13,bc=RD,tc=LG,dy=0.42)
# Perfect Link
R(sl,6.7,1.6,6.25,5.4,fill=SC)
R(sl,6.7,1.6,6.25,0.55,fill=GN)
T(sl,"Perfect Link (at-least-once)",6.88,1.65,6.0,0.42,sz=17,bold=True,color=DK)
T(sl,"Toda msg enviada é eventualmente entregue.",6.88,2.25,6.0,0.45,sz=13.5,color=LG,italic=True)
T(sl,"Nossa configuração:",6.88,2.78,6.0,0.35,sz=13,bold=True,color=GN)
cod(sl,6.88,3.15,5.9,1.4,
    "exchange  → durable\nfila      → durable\ndelivery  → PERSISTENT  (disco)\nACK       → manual (só após processar)\nconexão   → connect_robust (reconecta)",sz=11)
T(sl,"Ressalva: at-least-once",6.88,4.65,6.0,0.35,sz=13,bold=True,color=YW)
T(sl,"Worker processa + falha antes do ACK → recebe de novo.\nIdempotência (próximos slides) trata isso.",
   6.88,5.0,6.0,0.58,sz=13,color=LG)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 15 — BEB vs Reliable Broadcast
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"BEB vs Reliable Broadcast","O producer falha no meio — o que acontece?",sec="CONFIABILIDADE")
ns(sl,15)
# BEB
R(sl,0.4,1.6,5.9,5.4,fill=SC)
R(sl,0.4,1.6,5.9,0.55,fill=YW)
T(sl,"Best Effort Broadcast",0.58,1.65,5.55,0.42,sz=17,bold=True,color=DK)
T(sl,"O emissor dispara e não garante se ele mesmo falhar.",0.58,2.25,5.55,0.45,sz=13,color=LG,italic=True)
T(sl,"No projeto — endpoint POST /batch:",0.58,2.78,5.55,0.35,sz=13,bold=True,color=YW)
cod(sl,0.58,3.15,5.55,1.05,
    "# publisher.py — sem publisher confirms\nawait exchange.publish(msg, routing_key='payment')\n# Se broker cair AQUI → msg perdida. Producer não sabe.",sz=11)
T(sl,"Analogia: UDP em broadcast.",0.58,4.3,5.55,0.35,sz=13,color=GR,italic=True)
bul(sl,["Enviamos 1000 msgs","Broker cai na msg 500","Msgs 501-1000 perdidas","Producer não tem como saber"],
    0.58,4.68,5.55,sz=13,bc=YW,tc=LG,dy=0.38)
# Reliable Broadcast
R(sl,6.7,1.6,6.25,5.4,fill=SC)
R(sl,6.7,1.6,6.25,0.55,fill=OR)
T(sl,"Reliable Broadcast (aprox.)",6.88,1.65,6.0,0.42,sz=17,bold=True,color=DK)
T(sl,"Se um processo correto entrega m, todos entregam m.",6.88,2.25,6.0,0.45,sz=13,color=LG,italic=True)
T(sl,"Nossa aproximação:",6.88,2.78,6.0,0.35,sz=13,bold=True,color=OR)
bul(sl,["Msg que chega ao broker com\nPERSISTENT → nunca some","ACK manual → broker guarda\naté worker confirmar","Worker ativo vai processar\neventualmente"],
    6.88,3.18,6.0,sz=13,bc=OR,tc=LG,dy=0.52)
T(sl,"O que ainda falta para RB formal:",6.88,5.0,6.0,0.35,sz=13,bold=True,color=YW)
bul(sl,["Publisher confirms (sem eles = BEB)","Se producer cai antes de publicar,\nnão há como recuperar"],
    6.88,5.38,6.0,sz=12.5,bc=YW,tc=LG,dy=0.42)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 16 — Uniform Reliable Broadcast + Idempotência
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Uniform Reliable Broadcast","O nível mais alto — e como chegamos perto",sec="CONFIABILIDADE")
ns(sl,16)
# URB definition
R(sl,0.4,1.6,12.5,1.25,fill=RGBColor(0x20,0x14,0x35))
T(sl,"Definição de URB:",0.6,1.68,12.0,0.38,sz=14,bold=True,color=PL)
T(sl,"Se qualquer processo (correto OU com falha) entrega m → TODOS os processos entregam m. Requer consenso.",
   0.6,2.05,12.0,0.65,sz=14,color=LG)
# Problema
R(sl,0.4,3.0,5.85,4.0,fill=RGBColor(0x25,0x0A,0x0A))
T(sl,"✗  RabbitMQ não garante URB nativo",0.58,3.07,5.55,0.42,sz=14,bold=True,color=RD)
T(sl,"Cenário problemático:",0.58,3.58,5.55,0.35,sz=13,bold=True,color=YW)
cod(sl,0.58,3.97,5.55,2.0,
    "Worker A: recebe msg → processa parcialmente\n           → salva metade no banco\n           → FALHA antes do ACK\n\nWorker B: recebe a mesma msg de novo\n           → estado parcial do Worker A já existe\n           → sem consenso sobre quem entregou",sz=11)
# Nossa solução
R(sl,6.6,3.0,6.25,4.0,fill=RGBColor(0x08,0x20,0x10))
T(sl,"✓  Nossa solução: idempotência",6.78,3.07,5.9,0.42,sz=14,bold=True,color=GN)
T(sl,"Verificamos o estado antes de processar:",6.78,3.58,5.9,0.35,sz=13,bold=True,color=GN)
cod(sl,6.78,3.97,5.9,1.45,
    "# notification-worker/worker.py\nif order.status == 'confirmed':\n    return  # já processado, ignora duplicata\n\n# Garante: efeito visível = exactly-once\n# mesmo com at-least-once na fila",sz=11)
T(sl,"Resultado: exactly-once semântico para o usuário.",6.78,5.5,5.9,0.42,sz=13,color=LG,italic=True)
T(sl,"Quorum Queues (RabbitMQ 3.8+ com Raft) aproximam o URB nativamente — próximo passo real.",
   0.4,7.08,12.5,0.38,sz=12.5,color=GR,italic=True)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 17 — Tabela comparativa dos 5 modelos
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Comparativo — os 5 Modelos","De Fair-Loss até URB — onde o RabbitMQ se encaixa",sec="CONFIABILIDADE")
ns(sl,17)
headers=["Modelo","Perde msg?","Duplicatas?","Crash producer","No projeto"]
rows=[
    ["Fair-Loss Link",      "Sim",      "Não",      "—",            "Sem persistência"],
    ["Perfect Link",        "Não",      "Possível", "Perde msgs",   "PERSISTENT + ACK + durable"],
    ["BEB",                 "Possível", "Não",      "Perde msgs",   "POST /batch (sem confirms)"],
    ["Reliable Broadcast",  "Não",      "Possível", "Perde msgs",   "Aprox. com persistência"],
    ["Uniform RB",          "Não",      "Não",      "Nenhuma",      "Não nativo (idempotência)"],
]
cors_r=[GR,GN,YW,OR,RD]
cws=[3.0,1.7,1.7,1.9,4.6]
cxs=[0.35]
for w in cws[:-1]: cxs.append(cxs[-1]+w+0.02)
y0=1.65
# header
for j,(h,cw,cx) in enumerate(zip(headers,cws,cxs)):
    R(sl,cx,y0,cw,0.45,fill=AC)
    T(sl,h,cx,y0,cw,0.45,sz=13,bold=True,color=OR,align=PP_ALIGN.CENTER)
for i,(row,cr) in enumerate(zip(rows,cors_r)):
    yy=y0+0.47+i*0.72
    bg2=DK if i%2==0 else SC
    for j,(cell,cw,cx) in enumerate(zip(row,cws,cxs)):
        R(sl,cx,yy,cw,0.68,fill=bg2)
        c=cr if j==0 else LG
        T(sl,cell,cx+0.08,yy+0.08,cw-0.12,0.55,sz=12.5,color=c,align=PP_ALIGN.CENTER)
T(sl,"Linha destacada em laranja = nossa implementação principal.",0.35,5.4,12.5,0.38,sz=12.5,color=OR,italic=True)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 18 — Ordenação: FIFO com 1 consumer
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Ordenação — FIFO com 1 Consumer","A fila garante a ordem. Um consumidor respeitá-la.",sec="ORDENAÇÃO")
ns(sl,18)
# Diagrama visual da fila
T(sl,"Fila (payment-queue)",0.5,1.65,5.5,0.42,sz=16,bold=True,color=OR)
msgs=["msg 1","msg 2","msg 3","msg 4","msg 5"]
for i,m in enumerate(msgs):
    lx=0.5+i*1.58
    R(sl,lx,2.12,1.42,0.72,fill=AC)
    T(sl,m,lx,2.12,1.42,0.72,sz=14,bold=True,color=OR,align=PP_ALIGN.CENTER)
T(sl,"→",8.42,2.28,0.45,0.42,sz=22,bold=True,color=OR,align=PP_ALIGN.CENTER)
R(sl,8.9,2.05,2.0,0.85,fill=RGBColor(0x05,0x30,0x15))
T(sl,"Worker\n(1 consumer)",8.9,2.05,2.0,0.85,sz=13,bold=True,color=GN,align=PP_ALIGN.CENTER)
T(sl,"→",11.0,2.28,0.42,0.42,sz=22,bold=True,color=GN,align=PP_ALIGN.CENTER)
R(sl,11.45,2.05,1.65,0.85,fill=SC)
T(sl,"Processa\nem ordem",11.45,2.05,1.65,0.85,sz=12,color=LG,align=PP_ALIGN.CENTER)
# ACK arrows
for i in range(5):
    lx=0.5+i*1.58+0.7
    T(sl,"ACK",lx-0.28,3.05,0.9,0.3,sz=10,color=GN,align=PP_ALIGN.CENTER)
    T(sl,"↑",lx,3.35,0.2,0.3,sz=12,bold=True,color=GN,align=PP_ALIGN.CENTER)
# Propriedade formal
R(sl,0.4,3.85,12.5,1.3,fill=RGBColor(0x08,0x25,0x12))
T(sl,"Propriedade FIFO garantida pelo RabbitMQ:",0.6,3.93,12.0,0.38,sz=14,bold=True,color=GN)
T(sl,"A especificação AMQP 0-9-1 define que mensagens publicadas com a mesma routing key e priority\n"
   "chegam à fila na ordem em que foram publicadas — e são entregues nessa ordem a um único consumer.",
   0.6,4.32,12.0,0.72,sz=13.5,color=LG)
# Limitações
T(sl,"Mas: com N consumers em paralelo, a ordem global de processamento NÃO é garantida. (Slide 19)",
   0.4,5.25,12.5,0.42,sz=14,bold=True,color=YW)
ph(sl,"GIF OPCIONAL","Animação de fila FIFO",
   "Buscar: 'queue FIFO animation gif' ou 'message queue gif'.\nVisualfsm.js e CloudAMQP têm animações boas.",
   0.4,5.75,12.5,1.35)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 19 — Ordenação: N consumers
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Ordenação — N Consumers","Paralelo quebra a ordem global. Como resolver.",sec="ORDENAÇÃO")
ns(sl,19)
# Diagrama N consumers
T(sl,"Fila",0.5,1.65,1.5,0.38,sz=15,bold=True,color=OR)
for i,m in enumerate(["1","2","3","4"]):
    R(sl,0.5,2.08+i*0.72,1.3,0.62,fill=AC)
    T(sl,f"msg {m}",0.5,2.08+i*0.72,1.3,0.62,sz=13,bold=True,color=OR,align=PP_ALIGN.CENTER)
T(sl,"→",2.0,3.08,0.4,0.45,sz=22,bold=True,color=OR,align=PP_ALIGN.CENTER)
# Worker A recebe 1 e 3
R(sl,2.55,1.8,2.2,0.8,fill=RGBColor(0x05,0x22,0x35))
T(sl,"Worker A\n(lento)",2.55,1.8,2.2,0.8,sz=13,bold=True,color=BL,align=PP_ALIGN.CENTER)
R(sl,2.55,2.7,2.2,0.8,fill=RGBColor(0x05,0x22,0x35))
T(sl,"msg 1",2.55,2.7,2.2,0.8,sz=13,color=BL,align=PP_ALIGN.CENTER)
# Worker B recebe 2 e 4
R(sl,5.1,1.8,2.2,0.8,fill=RGBColor(0x05,0x30,0x15))
T(sl,"Worker B\n(rápido)",5.1,1.8,2.2,0.8,sz=13,bold=True,color=GN,align=PP_ALIGN.CENTER)
R(sl,5.1,2.7,2.2,0.8,fill=RGBColor(0x05,0x30,0x15))
T(sl,"msg 2",5.1,2.7,2.2,0.8,sz=13,color=GN,align=PP_ALIGN.CENTER)
# Resultado
T(sl,"Resultado:",7.6,1.65,5.5,0.38,sz=14,bold=True,color=YW)
R(sl,7.6,2.08,5.5,1.5,fill=RGBColor(0x30,0x20,0x05))
T(sl,"Worker B termina primeiro: msg 2 confirmada antes de msg 1.\nOrdem de chegada: 1,2,3,4\nOrdem de processamento: 2,4,1,3\n→ Ordem global quebrada",
   7.75,2.15,5.25,1.35,sz=13,color=LG)
cod(sl,0.4,3.75,7.5,0.92,
    "make scale-workers N=5 && make send-100\nmake db-query\n# processed_at NÃO respeita created_at",sz=12)
# Soluções
R(sl,0.4,4.82,12.5,2.28,fill=SC)
T(sl,"Como garantir ordem total — se necessário:",0.6,4.9,12.0,0.38,sz=15,bold=True,color=OR)
solucoes=[
    ("Particionamento","1 worker por event_id (como Kafka faz com partition keys). Simples e eficaz."),
    ("Sequencer","Nó central atribui número de sequência antes de publicar. Gargalo, mas garante ordem."),
    ("Kafka","Nativo: cada partição é uma fila FIFO. Workers de uma partição respeitam a ordem."),
]
for i,(nome,desc) in enumerate(solucoes):
    lx=0.55+i*4.18
    T(sl,f"▸ {nome}",lx,5.35,3.9,0.38,sz=13.5,bold=True,color=YW)
    T(sl,desc,lx,5.75,3.9,0.55,sz=12.5,color=LG)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 20 — Implementação: Persistência + ACK
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Implementação: Persistência + ACK","Como o RabbitMQ garante que mensagens não somem",sec="IMPLEMENTAÇÃO")
ns(sl,20)
# Fluxo de persistência
passos=[
    (OR,"1","Publisher","publish(PERSISTENT)","Grava em disco antes de retornar"),
    (YW,"2","Disco","mnesia / msg store","Arquivo em /var/lib/rabbitmq"),
    (GN,"3","Consumer","processa()","Lógica de negócio + commit no banco"),
    (GN,"4","ACK","channel.ack()","Broker remove da fila (disco)"),
    (RD,"!","Sem ACK","crash antes do ack","Msg volta para ready → at-least-once"),
]
for i,(cor,num,ator,cmd,desc) in enumerate(passos):
    ly=1.65+i*0.98
    R(sl,0.4,ly,0.65,0.82,fill=cor)
    T(sl,num,0.4,ly,0.65,0.82,sz=22,bold=True,color=DK,align=PP_ALIGN.CENTER)
    R(sl,1.1,ly,2.0,0.82,fill=AC)
    T(sl,ator,1.1,ly,2.0,0.82,sz=13,bold=True,align=PP_ALIGN.CENTER)
    R(sl,3.15,ly,3.0,0.82,fill=SC)
    T(sl,cmd,3.25,ly+0.1,2.85,0.65,sz=12,color=GN if cor==GN else (OR if cor==OR else LG),bold=(cor!=RD))
    T(sl,desc,6.25,ly+0.18,6.5,0.55,sz=13,color=LG)
# Por que at-least-once
R(sl,0.4,6.7,12.5,0.65,fill=RGBColor(0x30,0x18,0x05))
T(sl,"At-least-once: se o worker processa e cai ANTES do ACK, recebe a mesma mensagem novamente. Necessário: idempotência no processamento.",
   0.6,6.77,12.2,0.52,sz=13,color=LG)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 21 — Implementação: SELECT FOR UPDATE
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Implementação: Anti-Overbooking","SELECT FOR UPDATE previne a venda dupla do mesmo ingresso",sec="IMPLEMENTAÇÃO")
ns(sl,21)
# Problema
T(sl,"Sem controle — o que pode acontecer:",0.5,1.65,12.0,0.38,sz=15,bold=True,color=RD)
cod(sl,0.5,2.08,8.2,1.62,
    "Worker A lê: available_tickets = 1  →  reserva\nWorker B lê: available_tickets = 1  →  reserva (ao mesmo tempo!)\n\nResultado: 2 vendas, 0 ingressos → OVERBOOKING",sz=12.5)
# Solução
T(sl,"Com SELECT FOR UPDATE — nossa solução:",0.5,3.88,12.0,0.38,sz=15,bold=True,color=GN)
cod(sl,0.5,4.32,8.2,2.42,
    "-- stock-worker/src/database.py → reserve_tickets()\nBEGIN;\n  SELECT * FROM events\n  WHERE id = $1\n  FOR UPDATE;        -- bloqueia outros workers aqui\n  \n  UPDATE events SET available_tickets -= $qty;\n  UPDATE orders SET status = 'stock_reserved';\nCOMMIT;            -- lock liberado, próximo worker entra",sz=12)
R(sl,8.95,3.82,4.1,3.0,fill=SC)
T(sl,"O que acontece:",9.1,3.9,3.85,0.38,sz=14,bold=True,color=GN)
bul(sl,["Worker B tenta e bloqueia","Aguarda Worker A commitar","Se estoque zerou:\nrecebe out_of_stock","Sem overbooking possível"],
    9.1,4.32,3.85,sz=13,bc=GN,tc=LG,dy=0.52)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 22 — TicketLab
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
R(sl,0,0,13.33,1.5,fill=AC)
R(sl,0,0,13.33,0.08,fill=OR)
T(sl,"Demonstração Prática",0.5,0.12,12.0,0.5,sz=20,color=OR,italic=True,bold=False)
T(sl,"TicketLab — Sistema de Venda de Ingressos",0.5,0.58,12.0,0.8,sz=30,bold=True)
ns(sl,22)
T(sl,"Materializa todos os conceitos vistos — RabbitMQ não é infraestrutura oculta, é o protagonista.",
   0.5,1.65,12.3,0.45,sz=15,color=LG,italic=True)
# Pipeline
servicos=[("Frontend\n(React)",0.4,AC),("Producer\n(FastAPI)",2.6,AC),("RabbitMQ",4.8,OR),("payment\nworker",7.0,SC),("stock\nworker",9.2,SC),("notification\nworker",11.4,SC)]
for (label,lx,cor) in servicos:
    R(sl,lx,2.2,1.85,0.95,fill=cor)
    T(sl,label,lx,2.2,1.85,0.95,sz=12.5,bold=True,align=PP_ALIGN.CENTER)
for ax in [2.05,4.25,6.45,8.65,10.85]:
    T(sl,"→",ax+0.18,2.45,0.5,0.48,sz=22,bold=True,color=OR,align=PP_ALIGN.CENTER)
# Status badges
statuses=[("pending",GR),("processing",YW),("payment_approved",BL),("stock_reserved",BL),("confirmed",GN)]
xs2=0.5
for st,c in statuses:
    R(sl,xs2,3.35,2.25,0.48,fill=c)
    T(sl,st,xs2,3.35,2.25,0.48,sz=11.5,bold=True,color=DK,align=PP_ALIGN.CENTER)
    if xs2<9.5: T(sl,"→",xs2+2.27,3.48,0.3,0.3,sz=13,bold=True,color=GR)
    xs2+=2.48
# Conceitos mapeados
T(sl,"Conceitos demonstrados:",0.5,4.02,12.3,0.38,sz=15,bold=True,color=OR)
demos2=["Perfect Links → filas durable + PERSISTENT + ACK manual",
        "Crash-stop → make kill-payment — sem perda de mensagens",
        "Race condition → SELECT FOR UPDATE — zero overbooking",
        "DLQ → make send-failures (30% falha) → make inspect-dlq",
        "Escalabilidade → make scale-workers N=5"]
bul(sl,demos2,0.5,4.45,12.3,sz=14,dy=0.42)
ph(sl,"SCREENSHOT","Frontend TicketLab — tela principal com eventos",
   "Subir com 'make up', abrir localhost:3000. Capturar a tela Home com os cards de evento.",
   0.5,6.52,12.3,0.88)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 23 — Demo: Saga Coreografada
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Demo: Saga Coreografada","Um pedido passa por 4 etapas — cada uma é um worker independente",sec="DEMO")
ns(sl,23)
etapas=[
    (OR,"1. Compra","Formulário preenchido → POST /orders\nAPI retorna { status: 'pending' } imediato.\nPublica em ticket-sales (routing_key='payment').","SCREENSHOT: tela de compra preenchida — localhost:3000/buy\nCapturar com o formulário preenchido antes de clicar."),
    (YW,"2. Pagamento","payment-worker consome payment-queue.\nValida → publica em payment-approved.\nStatus: 'processing'.","SCREENSHOT: painel Orders mostrando status 'processing'\nlocalhost:3000/orders — filtrar por status."),
    (GN,"3. Estoque","stock-worker consome stock-queue.\nSELECT FOR UPDATE → reserva ingresso.\nStatus: 'stock_reserved'.","(capturar em sequência, mesmo vídeo se possível)"),
    (BL,"4. Confirmação","notification-worker gera ticket_code UUID.\nVerifica idempotência → status: 'confirmed'.\nIngresso na mão do comprador.","SCREENSHOT: pedido com status 'confirmed' e ticket_code\nlocalhost:3000/orders → detalhe do pedido."),
]
for i,(cor,titulo,desc,hint) in enumerate(etapas):
    col=i%2; row=i//2
    lx=0.35+col*6.58; ly=1.6+row*2.78
    R(sl,lx,ly,6.3,2.58,fill=SC)
    R(sl,lx,ly,0.55,2.58,fill=cor)
    T(sl,titulo,lx+0.7,ly+0.08,5.4,0.45,sz=16,bold=True,color=cor)
    T(sl,desc,lx+0.7,ly+0.55,5.4,1.05,sz=13,color=LG)
    ph(sl,"SCREENSHOT",hint,"",lx+0.7,ly+1.65,5.35,0.82)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 24 — Demo: Falhas na Prática
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Demo: Falhas na Prática","Três cenários — o sistema é resiliente",sec="DEMO")
ns(sl,24)
cenarios=[
    (YW,"Dead Letter Queue",
     "make send-failures\n→ 30% de pedidos com simulate_failure\n→ 3 retries → NACK → DLQ",
     "make inspect-dlq",
     "SCREENSHOT: RabbitMQ UI\nQueues → dead-letter-queue\nN mensagens acumuladas\nlocalhost:15672"),
    (OR,"Crash-stop Worker",
     "make send-1000\nmake kill-payment\nmake logs-payment",
     "→ outro worker assume",
     "SCREENSHOT / GIF: Grafana\nconsumer count caindo de 2→1\ne fila sendo drenada\nlocalhost:3001"),
    (GN,"Crash-recovery Broker",
     "make restart-rabbit\n→ msgs PERSISTENT no disco\n→ workers reconectam",
     "connect_robust (backoff)",
     "SCREENSHOT: RabbitMQ UI\napós restart — filas intactas\nlocalhost:15672 → Queues"),
]
for i,(cor,titulo,cmds,resultado,hint) in enumerate(cenarios):
    lx=0.3+i*4.4
    R(sl,lx,1.6,4.2,5.5,fill=SC)
    R(sl,lx,1.6,4.2,0.52,fill=cor)
    T(sl,titulo,lx+0.12,1.66,3.95,0.38,sz=14.5,bold=True,color=DK)
    cod(sl,lx+0.12,2.18,3.95,1.5,cmds,sz=11.5)
    R(sl,lx+0.12,3.75,3.95,0.55,fill=RGBColor(0x08,0x25,0x12))
    T(sl,resultado,lx+0.22,3.8,3.75,0.42,sz=12,color=GN,bold=True)
    ph(sl,"SCREENSHOT",hint,"",lx+0.12,4.38,3.95,2.6)

# ════════════════════════════════════════════════════════════════════════════
# SLIDE 25 — Conclusão
# ════════════════════════════════════════════════════════════════════════════
sl=prs.slides.add_slide(BLK); bg(sl)
head(sl,"Conclusão","O que aprendemos sobre o RabbitMQ em Sistemas Distribuídos")
ns(sl,25)
headers2=["Questão do Professor","Resposta"]
rows2=[
    ["Onde é usado?",        "E-commerce, IoT, bancos, microserviços — desacoplamento temporal"],
    ["Funcionalidades?",     "Exchanges, durable queues, PERSISTENT, ACK, DLX, QoS, plugins"],
    ["Falhas suportadas?",   "Crash-stop, crash-recovery, retry+DLQ. Não suporta Byzantine."],
    ["Confiabilidade?",      "Perfect Links (at-least-once) + aprox. Reliable Broadcast"],
    ["Ordenação?",           "FIFO com 1 consumer. N consumers → requer particionamento."],
    ["Implementação?",       "AMQP 0-9-1, Erlang/Mnesia, protocolo ACK, SELECT FOR UPDATE"],
]
cws2=[4.5,8.1]
cxs2=[0.35,4.98]
y0=1.65
for j,(h,cw,cx) in enumerate(zip(headers2,cws2,cxs2)):
    R(sl,cx,y0,cw,0.42,fill=OR)
    T(sl,h,cx,y0,cw,0.42,sz=13,bold=True,color=DK,align=PP_ALIGN.CENTER)
for i,row in enumerate(rows2):
    yy=y0+0.44+i*0.56
    bg2=DK if i%2==0 else SC
    for j,(cell,cw,cx) in enumerate(zip(row,cws2,cxs2)):
        R(sl,cx,yy,cw,0.54,fill=bg2)
        c=OR if j==0 else LG
        T(sl,cell,cx+0.1,yy+0.06,cw-0.2,0.44,sz=12.5,color=c)
T(sl,"Próximos passos para produção:",0.35,5.15,12.5,0.38,sz=14,bold=True,color=OR)
nexts=["Publisher confirms → Reliable Broadcast formal (saindo do BEB)",
       "Outbox Pattern → zero perda durante partição producer↔broker",
       "Quorum Queues (Raft) → aproximação de URB nativa no RabbitMQ 3.8+",
       "Kafka + partition keys → ordem total por evento"]
bul(sl,nexts,0.35,5.55,12.5,sz=13.5,dy=0.4)
T(sl,"Obrigado. Ficamos à disposição para perguntas.",0.35,7.1,12.5,0.35,sz=14,bold=True,color=OR,align=PP_ALIGN.CENTER)

# ════════════════════════════════════════════════════════════════════════════
prs.save(OUTPUT)
print(f"OK: {OUTPUT}  ({len(prs.slides)} slides)")
