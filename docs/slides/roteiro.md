# Roteiro — RabbitMQ em Sistemas Distribuídos
**25 slides · 20 minutos · 5 apresentadores (~4 min cada)**

---

## Distribuição

| Apresentador | Slides | Seção |
|---|---|---|
| **1** | 1 → 5 | Intro: o que é e por que existe |
| **2** | 6 → 10 | Arquitetura e funcionalidades |
| **3** | 11 → 13 | Tipos de falha |
| **4** | 14 → 19 | Confiabilidade e ordenação |
| **5** | 20 → 25 | Implementação + demo |

---

## APRESENTADOR 1 — Slides 1 a 5 (~4 min)

### Slide 1 — Capa
> "Boa tarde a todos. Nosso grupo vai apresentar o RabbitMQ — um message broker que fica entre os serviços de um sistema distribuído e cuida de que as mensagens cheguem mesmo quando algo dá errado. Ao longo dos próximos vinte minutos cobrimos as seis questões do professor e mostramos tudo funcionando num projeto real de venda de ingressos."

*[Slide mostra o nome em laranja grande com os nomes do grupo. Aguardar 5 segundos antes de avançar.]*

---

### Slide 2 — Agenda
> "Nossa estrutura segue as questões propostas: começamos pelo problema que o RabbitMQ resolve, passamos pela arquitetura e funcionalidades, tipos de falha, os modelos formais de confiabilidade comparados ao da disciplina, ordenação de mensagens, como as garantias são implementadas por dentro, e fechamos com o projeto prático."

*[Apontar cada número enquanto fala. Agilizar — este slide é de orientação, não de conteúdo.]*

---

### Slide 3 — O Problema
> "Imagine o Lollapalooza abrindo as vendas. Cinquenta mil pessoas clicando comprar ao mesmo tempo."

> "Com arquitetura HTTP síncrona, o que acontece: o usuário chama a API, a API chama o pagamento e fica esperando três segundos, chama o estoque, espera mais um segundo, chama o e-mail, espera mais dois. Seis segundos de esposta no melhor caso."

> "Se o serviço de pagamento demorar trinta segundos, timeout. Se o estoque cair, erro 500 no checkout. Se dois usuários chegam ao mesmo tempo para o último ingresso, overbooking."

> "O bloco da direita lista as consequências: falha em cascata, threads presas, impossível escalar."

*[Se preparou o vídeo Fireship — abrir no browser agora nos primeiros 45 segundos. Instrução em instrucoes_visuais.md.]*

---

### Slide 4 — A Solução
> "A solução é desacoplar produção de consumo com um broker de mensagens."

> "O usuário faz a compra, a API registra e responde imediato: 'pedido recebido, aguarde'. O processamento acontece em background, cada etapa num worker independente."

> "Os três cartões mostram por que isso funciona melhor: resposta imediata, workers independentes — a falha num não para os outros — e escalabilidade horizontal sem mexer na API."

---

### Slide 5 — O que é RabbitMQ
> "O RabbitMQ é um message broker open-source. Intermediário entre quem produz e quem consome mensagens."

> "Três pontos centrais: implementa o protocolo AMQP 0-9-1, um protocolo aberto e binário com semântica de ACK bem definida. Foi escrito em Erlang, linguagem criada para telecom com nove-nines de disponibilidade, o que significa isolamento de processos e recuperação de falhas nativos. E é open-source com comunidade grande."

*[Cada cartão do slide tem uma dessas três características. Apontar enquanto fala.]*

---

## APRESENTADOR 2 — Slides 6 a 10 (~4 min)

### Slide 6 — Onde é utilizado
> "Onde o RabbitMQ aparece no mundo real? Em cinco categorias principais."

> "E-commerce é o nosso caso — o TicketLab segue exatamente esse padrão. Sistemas bancários usam para processar transações de forma assíncrona. IoT para ingerir eventos de milhares de sensores. Microserviços para comunicação sem acoplamento temporal. E sistemas de reserva como o nosso, onde o controle de concorrência num estoque limitado é crítico."

*[Cinco colunas coloridas, uma por caso. Falar rapidamente — slide informativo, não demorar.]*

---

### Slide 7 — Arquitetura: os 4 componentes
> "Antes de falar em confiabilidade, precisamos dos quatro conceitos centrais."

> "O Producer envia uma mensagem para um Exchange. O Exchange não armazena — ele roteia. Usa regras chamadas Bindings e uma Routing Key presente na mensagem para decidir para qual Queue mandar. A Queue armazena até um Consumer estar disponível."

> "O detalhe crucial: o Consumer só envia ACK após processar com sucesso. Só então o broker remove a mensagem. Esse ACK manual é a base de tudo que vem depois sobre confiabilidade."

*[Imagem oficial do rabbitmq.com deve estar inserida aqui. Apontar para o diagrama enquanto explica cada componente.]*

---

### Slide 8 — Exchange Direct
> "O Exchange tem quatro variantes. O mais simples e o que usamos no projeto é o Direct: roteia pela routing key exata. Routing key igual a 'payment' vai para a payment-queue. Simples e previsível."

> "No TicketLab temos três exchanges diretos: ticket-sales roteia compras para o worker de pagamento, payment-approved roteia para estoque, stock-confirmed roteia para notificação."

*[Imagem do direct exchange deve estar aqui. Caixa de código à direita mostra o mapeamento do projeto.]*

---

### Slide 9 — Fanout, Topic, Headers
> "As outras três variantes. Fanout copia a mensagem para todas as filas vinculadas, ignorando routing key — útil para broadcast de eventos de auditoria, por exemplo."

> "Topic usa wildcards. O padrão 'order.#' captura 'order.created', 'order.paid', 'order.cancelled'. Ideal para sistemas de eventos mais complexos."

> "Headers roteia por atributos do cabeçalho AMQP — mais raro na prática, mais expressivo para casos específicos."

*[Três imagens do CloudAMQP, uma por tipo. Apontar enquanto fala.]*

---

### Slide 10 — Funcionalidades
> "As funcionalidades principais além do roteamento."

> "Mensagens Persistentes: ao publicar com delivery_mode PERSISTENT, o RabbitMQ grava no disco antes de confirmar. Sem isso um reinício perde tudo. Filas Durable: os metadados da fila também ficam no disco — a fila volta após reinício."

> "ACK Manual: o consumer confirma só após processar e salvar no banco. Dead Letter Exchange: quando o consumer rejeita definitivamente com NACK, a mensagem vai para uma fila especial para análise."

> "QoS e Prefetch: limitamos quantas mensagens cada worker recebe por vez — backpressure automático. E a Management UI que vamos mostrar na demo."

*[Seis cards em grade dois por três. Apontar a linha laranja para mensagens/filas, linha verde para ACK/DLQ, linha amarela para QoS/UI.]*

---

## APRESENTADOR 3 — Slides 11 a 13 (~4 min)

### Slide 11 — Crash-stop do Worker
> "Vamos falar de falhas. A primeira: crash-stop. O container do payment-worker morre abruptamente."

> "O diagrama mostra o que acontece: o RabbitMQ detecta a queda via desconexão TCP. Mensagens que esse worker havia recebido mas ainda não confirmado — as unacked — voltam ao estado ready na fila. Outro worker as pega. Sem perda, sem intervenção manual."

> "Na prática: make send-1000 enche a fila, make kill-payment derruba um worker, make logs-payment mostra outro worker assumindo as mensagens."

*[Se tiver o GIF gravado, ele está no canto inferior direito. Ativar ou mostrar o screenshot.]*

---

### Slide 12 — Crash-recovery + Retry + DLQ
> "O segundo tipo de falha: o próprio broker cai. Por causa da persistência em disco, ao reiniciar o RabbitMQ as mensagens e as filas sobrevivem. Os workers reconectam automaticamente via connect_robust, que usa backoff exponencial."

> "O terceiro tipo é a falha de processamento lógica — o worker recebe a mensagem mas a lógica de negócio falha: pagamento recusado, timeout. Em vez de rejeitar, republicamos com um contador de retry no cabeçalho. Após três tentativas, NACK e a mensagem vai para a Dead Letter Queue."

> "Os screenshots aqui mostram: à esquerda o RabbitMQ após restart com filas intactas, à direita a dead-letter-queue acumulando mensagens após make send-failures."

*[Dois painéis: esquerda crash-recovery, direita retry+DLQ. Apontar para os screenshots quando mencionar cada um.]*

---

### Slide 13 — Resumo: o que suporta e o que não suporta
> "Para fechar a seção de falhas: o que o RabbitMQ suporta e o que não suporta."

> "Suportamos crash-stop, crash-recovery, falhas de processamento com retry e partição de rede com reconexão automática."

> "O que não suportamos: falhas Byzantinas — quando um nó começa a enviar mensagens corrompidas ou age de forma maliciosa. Isso requer protocolos BFT dedicados como PBFT ou Tendermint. Está fora do escopo do RabbitMQ."

> "Também não temos exactly-once nativo — é at-least-once. Duplicatas são possíveis. Tratamos isso com idempotência, que o Apresentador 4 vai cobrir."

---

## APRESENTADOR 4 — Slides 14 a 19 (~4 min)

### Slide 14 — Fair-Loss vs Perfect Link
> "Agora mapeamos o RabbitMQ nos modelos formais que vimos na disciplina."

> "Fair-Loss Link: sem persistência, o RabbitMQ é Fair-Loss. Mensagens ficam só na RAM. O broker reinicia e somem silenciosamente. Nenhuma garantia."

> "Perfect Link — at-least-once — é o que implementamos. As duas propriedades: validade, toda mensagem enviada eventualmente é entregue; e ausência de geração espontânea, sem mensagens que nunca foram enviadas. Como: exchange durable, fila durable, delivery_mode PERSISTENT, ACK manual e connect_robust."

> "Ressalva importante: at-least-once significa que duplicatas são possíveis. Se o worker processa e cai antes do ACK, recebe a mensagem novamente. A idempotência trata isso — próximo slide."

*[Dois painéis grandes, esquerda Fair-Loss com configuração, direita Perfect Link com configuração. Apontar os blocos de código enquanto fala.]*

---

### Slide 15 — BEB vs Reliable Broadcast
> "Best Effort Broadcast: o nosso endpoint POST slash batch publica N mensagens sem publisher confirms. Análogo a UDP. Disparamos e torcemos — se o broker cair no meio, não sabemos quais chegaram."

> "Reliable Broadcast — aproximação: mensagem que chega ao broker com persistência será eventualmente processada por algum worker ativo. Isso se aproxima do RB formal para a relação producer-fila."

> "O que ainda falta: publisher confirms — sem eles permanecemos no BEB. E se o producer falha antes de publicar, não há como recuperar — diferente do RB formal onde o crash do emissor não impede a entrega das mensagens já publicadas."

---

### Slide 16 — Uniform Reliable Broadcast
> "O nível mais alto da hierarquia: Uniform Reliable Broadcast. Mesmo que um processo falhe no meio da entrega, todos — corretos e com falha — devem ter entregado a mensagem. Isso requer consenso."

> "O RabbitMQ não implementa URB nativamente. O problema: um worker pode processar parcialmente e cair antes do ACK. Outro recebe a mensagem de novo. O primeiro deixou efeitos no banco que o segundo não sabe. Sem consenso sobre quem entregou o quê."

> "Nossa solução é a idempotência: antes de processar, verificamos o status do pedido. Se já está confirmed, ignoramos. O efeito visível é exactly-once mesmo com at-least-once na camada de mensagens."

> "O próximo passo real seria Quorum Queues com Raft, disponíveis no RabbitMQ 3.8+, que aproximam o sistema de URB nativamente."

---

### Slide 17 — Tabela comparativa
> "A tabela resume os cinco modelos. De Fair-Loss — perde mensagens — até URB — não perde, sem duplicatas, mesmo com crash do producer."

> "Nossa implementação principal — Perfect Link com persistência — é a terceira linha. Com o endpoint batch chegamos a BEB. O RB é uma aproximação. URB não é nativo."

*[Slide rápido — tabela já tem tudo. Não precisa ler célula por célula. Apontar a linha destacada em laranja.]*

---

### Slide 18 — Ordenação: FIFO com 1 consumer
> "Ordenação de mensagens. Com um único consumer, a garantia é FIFO. A especificação AMQP define que mensagens publicadas com a mesma routing key chegam à fila em ordem e são entregues nessa ordem."

> "O diagrama mostra: mensagens 1, 2, 3, 4, 5 entram na fila e o worker processa na mesma sequência. Cada ACK confirma a entrega em ordem."

---

### Slide 19 — N consumers: ordem global quebrada
> "Com múltiplos workers a ordem global não é garantida. Worker A recebe a mensagem 1 e Worker B recebe a 2. Se B for mais rápido, a mensagem 2 é confirmada antes da 1."

> "Demonstramos: make scale-workers N=5 && make send-100. Consultando o banco depois, processed_at não respeita created_at."

> "Como garantir ordem total se necessário: particionamento por event_id — um worker exclusivo por evento, como o Kafka faz com partition keys. Ou um sequencer central que atribui número de sequência antes de publicar. Ambas têm trade-offs de throughput."

---

## APRESENTADOR 5 — Slides 20 a 25 (~4 min)

### Slide 20 — Implementação: Persistência + ACK
> "Como o RabbitMQ entrega o que promete por dentro."

> "Persistência: ao publicar com PERSISTENT, o RabbitMQ usa a engine Mnesia — banco distribuído em Erlang — para gravar em disco antes de retornar ao publisher. Só depois do write o dado é considerado seguro."

> "Protocolo ACK: o fluxo é — mensagem chega ao worker, worker processa, commita no banco, e só então chama channel.ack. O RabbitMQ remove da fila permanentemente. Se o worker cai entre o commit e o ACK, a mensagem volta — at-least-once. O ACK é o commit da mensagem na fila."

*[Cinco linhas no slide, cada uma uma etapa do fluxo, com a linha vermelha mostrando o que acontece sem ACK.]*

---

### Slide 21 — Implementação: SELECT FOR UPDATE
> "O terceiro mecanismo de implementação: controle de concorrência no estoque."

> "Sem controle, dois workers lendo 'um ingresso disponível' ao mesmo tempo reservam os dois. Overbooking."

> "Nossa solução: SELECT FOR UPDATE no PostgreSQL. O segundo worker fica bloqueado no banco até o primeiro commitar. Se o estoque zerou, recebe out_of_stock e vai para a DLQ. Zero overbooking possível."

*[Bloco de código SQL no centro, cartão de explicação à direita.]*

---

### Slide 22 — TicketLab
> "O TicketLab é o projeto que construímos para materializar tudo isso. Simula venda de ingressos para shows com carga concorrente e falhas injetadas."

> "O pipeline tem cinco serviços: frontend em React, producer em FastAPI que recebe as compras, e três workers independentes — pagamento, estoque, notificação — cada um com sua fila."

> "O status do pedido percorre cinco estados: pending, processing, payment_approved, stock_reserved, confirmed. Cada transição é uma mensagem numa fila separada."

*[Screenshot do frontend está aqui. Pipeline visual com os seis componentes acima. Apontar para cada um.]*

---

### Slide 23 — Demo: Saga Coreografada
> "Vamos ver o fluxo completo de uma compra."

*[Se ao vivo: abrir localhost:3000, preencher formulário. Se screenshot: apontar para o formulário preenchido.]*

> "Ao clicar em Comprar, a API retorna imediato com pending. Em background: payment-worker valida e publica em payment-approved — status vira processing. Stock-worker faz SELECT FOR UPDATE, reserva — stock_reserved. Notification-worker gera o UUID do ticket, verifica idempotência — confirmed."

*[Quatro etapas numeradas com screenshots em cada. Apontar para os status mudando.]*

---

### Slide 24 — Demo: Falhas na Prática
> "Três cenários de falha que demonstramos."

> "Dead Letter Queue: make send-failures envia pedidos com trinta por cento de falha simulada. Após três retries, NACK e a mensagem vai para a dead-letter-queue. Screenshot do RabbitMQ UI mostrando as mensagens acumuladas."

> "Crash-stop: derrubamos um payment-worker com make kill-payment. O Grafana mostra o consumer count caindo. Mas as mensagens unacked voltam para ready e os outros workers assumem."

> "Crash-recovery: make restart-rabbit reinicia o broker. Mensagens PERSISTENT sobrevivem no disco. Workers reconectam com connect_robust."

*[Três colunas, uma por cenário, cada uma com código e screenshot. Apontar para cada screenshot ao mencionar.]*

---

### Slide 25 — Conclusão
> "Para fechar: a tabela responde as seis questões do professor diretamente."

> "O RabbitMQ é usado em e-commerce, IoT, bancos e microserviços. As funcionalidades centrais são exchanges, filas durable, persistência e ACK manual. Suportamos crash-stop e crash-recovery mas não Byzantine. A confiabilidade chega ao Perfect Link e ao Reliable Broadcast aproximado. Ordenação é FIFO com um consumer, requer particionamento para ordem global. A implementação usa Erlang, Mnesia e o protocolo ACK."

> "Próximos passos para produção: publisher confirms para RB formal, Outbox Pattern para zero perda durante partição, Quorum Queues para URB nativo."

> "Obrigado. Ficamos à disposição para perguntas."

---

## Perguntas Esperadas da Banca

**O sistema é exactly-once?**
Não nativamente. É at-least-once — duplicatas são possíveis após crash antes do ACK. A idempotência via order.status garante que o efeito visível seja único.

**O SELECT FOR UPDATE é distribuído?**
É serializável pelo PostgreSQL. Com múltiplos nós de banco sem coordenação precisaríamos de 2PC. Aqui o PostgreSQL é o ponto central de serialização.

**Por que não HTTP entre os serviços?**
Acoplamento temporal. Se o stock-worker cair, o payment-worker não precisa saber — o pedido aguarda na fila. Com HTTP a falha se propaga imediato.

**Como garantir ordem total?**
Particionamento por event_id — um worker exclusivo por evento — ou sequencer central. Kafka faz isso nativamente com partition keys.

**Qual a diferença entre Perfect Link e Reliable Broadcast?**
Perfect Link é ponto a ponto: garante que cada mensagem de A chega a B. Reliable Broadcast é multicast: se qualquer processo correto entrega m, todos entregam. O RabbitMQ implementa o primeiro; o segundo é aproximado via persistência.

**O RabbitMQ implementa consenso?**
Não na configuração clássica. Quorum Queues (3.8+) usam o algoritmo Raft para consenso entre nós do cluster — essa é a aproximação de URB disponível nativamente.
