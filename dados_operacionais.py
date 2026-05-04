MANUAIS = {
    "Lia Burguer": {
        "titulo": "🔥 Procedimento de Chapa e Montagem",
        "temperatura": "200°C constante",
        "tempo": "2:30 min por lado para ponto médio",
        "ponto_critico": "Não prensar a carne",
        "procedimentos": {
            "Preparo da chapa": [
                "Pré-aquecer a chapa antes do primeiro pedido.",
                "Manter a área seca, limpa e sem excesso de gordura queimada.",
                "Separar pão, queijo, molhos e embalagem antes de iniciar a carne.",
            ],
            "Carne e montagem": [
                "Selar a carne sem pressionar para preservar suculência.",
                "Adicionar queijo no tempo correto para derreter sem ressecar.",
                "Montar o lanche seguindo a ordem padrão da casa.",
                "Conferir adicionais antes de fechar a embalagem.",
            ],
            "Controle de qualidade": [
                "Verificar ponto, temperatura e apresentação antes de liberar.",
                "Trocar utensílios quando houver contaminação cruzada.",
                "Descartar insumos fora do padrão de aparência ou validade.",
            ],
        },
        "dica": "Dica: nunca pressione a carne com a espátula; isso tira suco, sabor e padrão do lanche.",
    },
    "Lia Pizza": {
        "titulo": "🍕 Procedimento de Forno, Montagem e Finalização",
        "temperatura": "280°C a 320°C, conforme forno",
        "tempo": "6 a 9 min, ajustando por massa e recheio",
        "ponto_critico": "Assar base e cobertura por igual",
        "procedimentos": {
            "Preparação": [
                "Conferir massa, molho, queijo e recheios antes de abrir pedido.",
                "Usar porcionamento padrão para evitar desperdício e variação de custo.",
                "Espalhar molho sem encharcar a massa.",
            ],
            "Forno": [
                "Pré-aquecer o forno e evitar abrir a porta sem necessidade.",
                "Girar a pizza quando houver diferença de calor entre os lados.",
                "Retirar quando borda, base e queijo estiverem no padrão.",
            ],
            "Corte e entrega": [
                "Cortar com faca/rolete limpo e adequado.",
                "Conferir sabor, tamanho, borda e observações do pedido.",
                "Embalar de forma firme para não deslocar cobertura no delivery.",
            ],
        },
        "dica": "Dica: pizza bonita começa no porcionamento. Excesso de recheio atrasa forno e derruba margem.",
    },
    "Lia Salgados": {
        "titulo": "🥟 Procedimento de Fritura, Estufa e Validade",
        "temperatura": "170°C a 180°C no óleo",
        "tempo": "3 a 5 min, conforme tamanho e recheio",
        "ponto_critico": "Óleo limpo e temperatura estável",
        "procedimentos": {
            "Fritura": [
                "Aquecer o óleo antes de colocar os salgados.",
                "Não sobrecarregar o cesto para evitar queda brusca de temperatura.",
                "Escorrer bem antes de levar para a estufa ou embalagem.",
            ],
            "Estufa e exposição": [
                "Manter salgados organizados por tipo e lote.",
                "Controlar tempo de exposição para preservar textura e segurança.",
                "Retirar itens ressecados, rachados ou fora do padrão visual.",
            ],
            "Controle de validade": [
                "Identificar lotes e respeitar ordem de produção.",
                "Verificar validade de recheios, massas e bebidas diariamente.",
                "Registrar perdas para melhorar compra e produção.",
            ],
        },
        "dica": "Dica: temperatura baixa encharca; temperatura alta doura por fora e deixa frio por dentro.",
    },
}


CHECKLISTS = {
    "🧹 Limpeza da Loja": {
        "📅 Segunda-feira": [
            "Limpeza das geladeiras de refrigerante.",
            "Retirar itens do armário preto e limpar prateleiras.",
            "Organizar bebidas e verificar validade.",
            "Revisar estoque aberto e itens próximos do vencimento.",
        ],
        "⭐ Diariamente": [
            "Lavar a frente da loja.",
            "Manter balcões limpos no início, durante e fim do expediente.",
            "Limpar paredes quando necessário.",
            "Organizar e limpar a parte debaixo do balcão.",
            "Higienizar áreas de manipulação e utensílios críticos.",
        ],
        "🎉 Sexta-feira": [
            "Lavar as duas lojas.",
            "Lavar bandejas.",
            "Lavar porta molhos e porta guardanapos.",
            "Reforçar limpeza para o fim de semana.",
        ],
    },
    "🚚 Atendimento Delivery": {
        "⭐ Diariamente": [
            "Verificar mensagens pendentes.",
            "Verificar tempo de entrega.",
            "Conferir cardápio de pizza e salgado.",
            "Preparar relatórios e planilha de motoboys.",
            "Abrir os 3 caixas.",
            "Enviar avaliações do iFood e WhatsApp.",
            "Mandar Falaaê pendentes do dia anterior.",
            "Pedir dinheiro para pagamento de motoboys; na sexta, prever fim de semana.",
            "Fazer molho, mantendo mínimo de duas caixas na loja.",
            "Verificar se há máquinas para troca.",
            "Aos fins de semana, colocar refrigerantes no freezer da fábrica.",
            "Encapar maquininhas em dias de chuva.",
            "Colocar máquinas para carregar.",
        ],
        "🔒 Fechamento": [
            "Iniciar fechamento dos caixas a partir de 22:30.",
            "Fazer pagamento dos motoboys.",
            "Enviar relatórios.",
            "Retirar o lixo.",
            "Desligar o ar-condicionado.",
            "Organizar a loja para o próximo dia.",
        ],
    },
    "📦 Produção e Estoque": {
        "📋 Antes do Pico": [
            "Conferir insumos críticos de hambúrguer, pizza e salgados.",
            "Separar embalagens, sacolas, molhos e descartáveis.",
            "Confirmar funcionamento de chapa, forno, fritadeira e maquininhas.",
        ],
        "📉 Controle de Perdas": [
            "Registrar itens descartados por validade, erro ou quebra de padrão.",
            "Sinalizar produtos com giro baixo para ajuste de produção.",
            "Conferir validade de bebidas, molhos, massas e recheios.",
        ],
    },
}


MANUAL_IA = "\n".join(
    [
        f"{unidade}: {dados['titulo']}; temperatura {dados['temperatura']}; "
        f"tempo {dados['tempo']}; ponto crítico: {dados['ponto_critico']}."
        for unidade, dados in MANUAIS.items()
    ]
)


ROTEIRO_IA = (
    "Você é o Diretor Operacional e Chef Executivo do Grupo Lia. "
    "Responda funcionários com orientação prática, segura e padronizada. "
    "Quando a pergunta envolver preparo, explique temperatura, tempo, sequência e ponto crítico. "
    "Quando envolver processo, explique o motivo de cada etapa. "
    "Não invente regras internas ausentes na base: sinalize quando for necessário confirmar com a gestão. "
    "Use tom técnico, objetivo e encorajador."
)
