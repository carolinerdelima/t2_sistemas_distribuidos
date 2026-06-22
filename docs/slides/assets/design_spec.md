# Design Spec — gerar_slides.py (refatoração)

## Decisões confirmadas pelo usuário

- Tema conteúdo: **claro** (fundo #F5F5F0, texto escuro)
- Fonte títulos: **Georgia Bold**
- Capa: **escura** (#2D2D2D) com quadrados laranja degradando

---

## Paleta

```python
BG  = #F5F5F0   # fundo slides de conteúdo
CV  = #2D2D2D   # fundo capa
WH  = #FFFFFF   # cards e superfícies
TXT = #1A1A1A   # texto principal
SUB = #555555   # texto secundário/corpo
OR  = #CC4400   # laranja acento (badge, destaque) — mais escuro que atual
TL  = #2D7070   # teal (subheadings, código)
GR  = #999999   # cinza suave (numeração, rodapé)
BD  = #E0E0E0   # bordas de cards
DV  = #CCCCCC   # divisores horizontais
```

## Tipografia

| Uso | Fonte | Tamanho | Estilo |
|---|---|---|---|
| Título principal | Georgia | 36–42pt | Bold |
| Badge seção | Calibri | 9pt | Bold, CAPS, espaçado |
| Subtítulo slide | Calibri | 14pt | Italic, SUB |
| Corpo texto | Calibri | 13–14pt | Regular, TXT |
| Subheading card | Calibri | 13pt | Bold, TL (teal) |
| Código | Courier New | 11pt | Regular, TL |
| Número slide | Calibri | 11pt | Regular, GR |

---

## Estrutura padrão de cada slide de conteúdo

```
┌─────────────────────────────────────────┐
│ ■ SEÇÃO · SUBSEÇÃO          (badge OR)  │  y=0.18, sz=9, bold, caps
│                                          │
│ Título do Slide              (Georgia)  │  y=0.42, sz=38, bold, TXT
│                                          │
│ Subtítulo descritivo         (Calibri)  │  y=1.18, sz=14, italic, SUB
│ ─────────────────────────────────────── │  y=1.55, linha DV
│                                          │
│ [conteúdo]                              │  y=1.75 em diante
│                                          │
│                                       N │  número canto inf. direito
└─────────────────────────────────────────┘
```

- Badge: quadrado laranja 0.22×0.22 + texto OR ao lado, y=0.18
- Divider: linha horizontal DV de x=0.5 até x=12.83, espessura 0.5pt
- Número: x=12.6, y=7.15, sz=11, GR, alinhado à direita

---

## Capa (slide 1)

```
BG escuro #2D2D2D, largura total

Quadrados laranja degradando (7 quadrados, lado esquerdo, verticalmente centrados):
  cores: #CC4400, #B83D00, #A33500, #8E2D00, #792500, #641D00, #4F1500
  tamanho: 0.38×0.38 cada, espaçamento 0.08, posição x=0.5, y~2.8

Instituição: "ESCOLA POLITÉCNICA  —  PUCRS · SISTEMAS DISTRIBUÍDOS"
  x=1.8, y=2.85, sz=9, bold, OR, spaced

Título: "RabbitMQ"
  x=1.8, y=3.2, sz=60, bold, Georgia, WH

Subtítulo: "Mensageria com AMQP: arquitetura, garantias de entrega e ordenação"
  x=1.8, y=4.3, sz=18, italic, Calibri, SUB (#AAAAAA)

Divisor: linha #555555, x=1.8 a x=8.5, y=5.05

Membros: "Arthur Real Sanchotene Ferreira · Caroline da Rocha de Lima · Giovani da Silva Cancherini"
  linha 1: x=1.8, y=5.15, sz=12, bold, Calibri, WH

"Leonardo Vargas Schilling · Osmar Sadi Nether Filho"
  linha 2: x=1.8, y=5.48, sz=12, Calibri, SUB

"Prof. Fernando Dotti  —  Porto Alegre, junho de 2026"
  x=1.8, y=5.82, sz=11, italic, Calibri, GR
```

---

## Cards (padrão claro)

```python
# card simples
BG card:  #FFFFFF, borda BD (0.8pt), padding 0.25in
Título:   Calibri bold 13pt, cor TL (teal)
Corpo:    Calibri 13pt, cor SUB
Divisor interno: linha DV sob o título (opcional)

# card com número grande (estilo slide 9 do ref.)
Número:  Georgia bold 48pt, cor OR/TL/YW dependendo da posição
Título:  Calibri bold 13pt, TXT
Corpo:   Calibri 13pt, SUB
```

---

## Tabelas

```
Header row: BG TXT(#1A1A1A), texto WH bold Calibri 12pt
Linhas pares: #FAFAFA
Linhas ímpares: #F0F0EC
Texto células: Calibri 12pt, TXT
Código em células: Courier New 11pt, TL
Borda: BD 0.5pt
```

---

## Código inline

```
BG: #F0F4F4 (azul-acinzentado muito claro)
Texto: Courier New 11pt, TL (#2D7070)
Padding: 0.12in
Sem borda visível ou borda BD 0.5pt
```

---

## Bullets

```
Marcador: •  (bullet unicode), OR ou TL, bold
Texto: Calibri 13pt, SUB
dy: 0.44in por item
```

---

## Slides com problemas críticos — o que corrigir

### Slide 2 — Agenda
- Atual: 7 itens em layout 4+3, segunda coluna desalinhada
- Fix: grid 1 coluna, itens empilhados com número quadrado OR + faixa de texto WH card; altura uniforme

### Slide 3 — O Problema
- Atual: placeholder de vídeo vaza para fora da área
- Fix: reorganizar — código à esquerda, lista de problemas à direita, placeholder abaixo com altura fixa segura

### Slide 4 — A Solução
- Atual: setas `→` desalinhadas verticalmente com os boxes
- Fix: calcular y das setas = centro dos boxes (ly + h/2 - 0.22)

### Slide 11 — Crash-stop
- Atual: diagrama antes/depois com elementos desalinhados, placeholder sobrepõe código
- Fix: separar em 2 zonas: diagrama (esquerda) | explicação (direita); código + placeholder em faixa inferior sem sobreposição

### Slide 19 — N Consumers
- Atual: Workers A/B com boxes empilhados desalinhados, resultado fora de posição
- Fix: layout em 3 colunas: fila | workers | resultado; todos na mesma linha base

### Slide 22 — TicketLab
- Atual: status badges desalinhados, setas `→` fora do centro, placeholder vaza
- Fix: pipeline em y fixo, status badges em y fixo abaixo, placeholder com altura calculada

---

## Travessões — substituições

Regra: remover `—` do texto visível dos slides.

| Original | Substituir por |
|---|---|
| `A — B` | `A: B` ou `A (B)` |
| `X — não suportado` | `X (sem suporte)` |
| `Resultado — Y` | `Resultado: Y` |
| `Broker reinicia — msgs sobrevivem` | `Broker reinicia; msgs sobrevivem` |
| `→ resultado` | manter (seta, não travessão) |

---

## Estrutura mantida (25 slides)

1. Capa
2. Agenda
3. O Problema
4. A Solução
5. O que é RabbitMQ
6. Onde é utilizado
7. Arquitetura: 4 componentes
8. Exchange Direct
9. Exchange Fanout/Topic/Headers
10. Funcionalidades
11. Crash-stop
12. Crash-recovery + DLQ
13. Modelos de falha — resumo
14. Fair-Loss vs Perfect Link
15. BEB vs Reliable Broadcast
16. URB + Idempotência
17. Tabela comparativa 5 modelos
18. Ordenação FIFO
19. Ordenação N consumers
20. Implementação: Persistência + ACK
21. Implementação: SELECT FOR UPDATE
22. TicketLab
23. Demo: Saga Coreografada
24. Demo: Falhas na Prática
25. Conclusão
