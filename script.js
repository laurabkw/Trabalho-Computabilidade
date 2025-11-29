let nodes = new vis.DataSet([]); //cria estrutura de nodos
let edges = new vis.DataSet([]); //cria estrutura de ligações

//pega elemento do html com nome condizente e define como container onde o grafo será desenhado
let container = document.getElementById("diagrama"); 

let options = { //configura visuais do diagrama
    nodes: { //define aparência do nodo
        shape: "circle",
        font: { size: 20 },
        borderWidth: 1, //define borda padrão fina
        color: {
            background: 'white',
            border: 'black'
        }
    },
    edges: { //define aparência das setas/ligações
        arrows: "to",
        font: { align: "top" },
        smooth: { type: "curvedCW", roundness: 0.2 } 
    },
    physics: {
        enabled: true,
        solver: 'repulsion', 
        repulsion: {
            nodeDistance: 50 
        }
    }
};

//cria grafo no site
let network = new vis.Network(container, { nodes, edges }, options);
let nextNodeId = 0; // começar em 0 (q0)

//função para adicionar novo estado
function adicionar() { 
    let id = nextNodeId++; //incrementa id do estado para que cada novo estado tenha um id único
    let label = "q" + id;

    //verifica checkboxes
    let isFinal = document.getElementById("final").checked;
    let isInicial = document.getElementById("inicial").checked;

    //configuração visual do nodo
    let nodeOptions = {
        id: id, 
        label: label, 
        shape: "circle"
    };

    //estado final
    if (isFinal) {
        nodeOptions.borderWidth = 4; //borda grossa
        nodeOptions.color = { border: '#000000', background: '#e0ffe0' }; 
    }

    //estado inicial
    if (isInicial) {
        nodeOptions.color = { background: '#ADD8E6' }; 
    }

    //adiciona nodo do novo estado ao DataSet
    try {
        nodes.add(nodeOptions);
        console.log("Estado criado com ID: " + id + (isFinal ? " (FINAL)" : "")); 
    } catch (err) {
        alert("Erro ao adicionar estado.");
        return;
    }

    //criar as conexões
    conectarNovoEstado(id);

    //atualiza os checkboxes de remoção e conexão na tela
    atualizarInterface(id, label);
}

//função auxiliar da função de adicionar novo estado
function conectarNovoEstado(origemId) { 
    //pega os valores dos inputs de transição
    let lerFita = document.getElementById("lerFita").value || "ε";
    let lerPilha = document.getElementById("lerPilha").value || "ε";
    let escrevePilha = document.getElementById("escrevePilha").value || "ε";
    
    let labelTransicao = `${lerFita}, ${lerPilha} -> ${escrevePilha}`;

    //verifica quais estados foram selecionados para conexão
    let checkboxes = document.querySelectorAll('.checkbox-conectar');
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            let destinoId = parseInt(checkbox.value);
            
            //adiciona transição do nodo estado ao DataSet
            edges.add({
                from: origemId, //qual nodo a linha vai partir (do novo criado)
                to: destinoId, //para qual nodo ela aponta (o selecionado)
                label: labelTransicao, //condições de transição(puramente visual)
                arrows: "to" //define a aparência da linha como uma seta
            });
        }
    });
}

//função de remover um estado 
function removerEstado() {
    //busca todos os checkboxes de remoção marcados
    let checkboxes = document.querySelectorAll('.checkbox-remover');
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            let idParaRemover = parseInt(checkbox.value);
            
            //remove automaticamente as setas ligadas a ele
            nodes.remove(idParaRemover);
            
            //remove visualmente os inputs da interface
            removerCheckboxesInterface(idParaRemover);
        }
    });
}

//função para atualizar a interface
function atualizarInterface(id, label) {
    //adiciona opção na lista "Conectar com" dinamicamente
    let divConectar = document.getElementById("conectarEstados");
    let spanConectar = document.createElement("span");
    spanConectar.id = `span-conectar-${id}`;
    spanConectar.innerHTML = `
        <input type="checkbox" id="conectar${label}" value="${id}" class="checkbox-conectar" style="margin-left: 10px;">
        <label for="conectar${label}">${label}</label>
    `;
    divConectar.appendChild(spanConectar);

    //adiciona opção na lista "Remover Estado" dinamicamente
    let divRemover = document.getElementById("removerEstados");
    let btnRemover = divRemover.querySelector("button"); 
    
    let spanRemover = document.createElement("span");
    spanRemover.id = `span-remover-${id}`;
    spanRemover.innerHTML = `
        <input type="checkbox" id="remover${label}" value="${id}" class="checkbox-remover" style="margin-left: 10px;">
        <label for="remover${label}">${label}</label>
    `;
    
    divRemover.insertBefore(spanRemover, btnRemover);
}

//função para remover os checkbox da interface
function removerCheckboxesInterface(id) {
    //remove os checkboxes quando um estado é excluído
    let spanConectar = document.getElementById(`span-conectar-${id}`);
    if (spanConectar) spanConectar.remove();

    let spanRemover = document.getElementById(`span-remover-${id}`);
    if (spanRemover) spanRemover.remove();
}

//função para limpar tudo
function limpar() { 
    nodes.clear();
    edges.clear();
    nextNodeId = 0;
    
    //limpa divs de controle
    document.getElementById("conectarEstados").innerHTML = "";
    //reseta a div de remover mantendo apenas o botão
    document.getElementById("removerEstados").innerHTML = '<button type="button" onclick="removerEstado()">Remover Estado</button>';
}

//função utilitária dos botões "?" e "ε"
function setSymbol(inputId, symbol) {
    document.getElementById(inputId).value = symbol;
}

//variáveis para execução do autômato
let estadoAtual = null;
let cadeiaEntrada = "";
let posicaoFita = 0;
let pilha = [];
let executando = false;
let estadoInicial = null;

//função para encontrar o estado inicial
function encontrarEstadoInicial() {
    let todosEstados = nodes.get();
    for (let estado of todosEstados) {
        //verifica se é estado inicial pela cor de fundo azul claro
        if (estado.color && estado.color.background === '#ADD8E6') {
            return estado.id;
        }
    }
    //se não encontrou, retorna o primeiro estado (q0)
    if (todosEstados.length > 0) {
        return todosEstados[0].id;
    }
    return null;
}

//função para parsear uma transição do label
function parsearTransicao(label) {
    //formato: "a, b -> c" ou "ε, b -> c" ou "a, ε -> ε"
    let partes = label.split("->");
    if (partes.length !== 2) return null;
    
    let leitura = partes[0].trim();
    let escrita = partes[1].trim();
    
    let lerPartes = leitura.split(",");
    if (lerPartes.length !== 2) return null;
    
    let lerFita = lerPartes[0].trim();
    let lerPilha = lerPartes[1].trim();
    
    return {
        lerFita: lerFita === "ε" ? "" : lerFita,
        lerPilha: lerPilha === "ε" ? "" : lerPilha,
        escrevePilha: escrita === "ε" ? "" : escrita
    };
}

//função para atualizar visualização da pilha
function atualizarPilhaVisual() {
    for (let i = 0; i <= 5; i++) {
        let elemento = document.getElementById(`stack${i}`);
        if (elemento) {
            if (i < pilha.length) {
                elemento.textContent = pilha[pilha.length - 1 - i];
            } else {
                elemento.textContent = "";
            }
        }
    }
}

//função para atualizar estado visual no diagrama
function atualizarEstadoVisual(estadoId) {
    //remove destaque de todos os estados
    let todosEstados = nodes.get();
    todosEstados.forEach(estado => {
        let nodeAtualizado = { id: estado.id };
        if (estado.borderWidth === 4) {
            nodeAtualizado.color = { border: '#000000', background: '#e0ffe0' };
        } else if (estado.color && estado.color.background === '#ADD8E6') {
            nodeAtualizado.color = { background: '#ADD8E6' };
        } else {
            nodeAtualizado.color = { background: 'white', border: 'black' };
        }
        nodes.update(nodeAtualizado);
    });
    
    //destaca o estado atual
    if (estadoId !== null) {
        let estado = nodes.get(estadoId);
        if (estado) {
            let nodeAtualizado = { 
                id: estadoId,
                color: { background: '#ffeb3b', border: 'black' }
            };
            if (estado.borderWidth === 4) {
                nodeAtualizado.borderWidth = 4;
            }
            nodes.update(nodeAtualizado);
        }
    }
}

//função para confirmar cadeia de teste
function confirmarCadeia() {
    let inputString = document.getElementById("inputString").value;
    
    if (!inputString) {
        alert("Por favor, insira uma cadeia para testar.");
        return;
    }
    
    if (nodes.length === 0) {
        alert("Por favor, adicione pelo menos um estado ao autômato.");
        return;
    }
    
    //encontra estado inicial
    estadoInicial = encontrarEstadoInicial();
    if (estadoInicial === null) {
        alert("Não foi possível encontrar um estado inicial.");
        return;
    }
    
    //inicializa execução
    cadeiaEntrada = inputString;
    posicaoFita = 0;
    pilha = [];
    estadoAtual = estadoInicial;
    executando = true;
    
    //limpa resultado anterior
    document.getElementById("aceita").style.display = "none";
    document.getElementById("rejeita").style.display = "none";
    
    //atualiza visualizações
    atualizarPilhaVisual();
    atualizarEstadoVisual(estadoAtual);
    
    console.log("Cadeia confirmada:", cadeiaEntrada);
    console.log("Estado inicial:", estadoAtual);
}

//função para avançar 1 etapa na leitura
function proximo() {
    if (!executando) {
        alert("Por favor, confirme uma cadeia primeiro.");
        return;
    }
    
    if (estadoAtual === null) {
        alert("Estado atual inválido.");
        return;
    }
    
    //pega símbolo atual da fita
    let simboloFita = posicaoFita < cadeiaEntrada.length ? cadeiaEntrada[posicaoFita] : "";
    let topoPilha = pilha.length > 0 ? pilha[pilha.length - 1] : "";
    
    //busca transições possíveis do estado atual
    let transicoes = edges.get({
        filter: function(edge) {
            return edge.from === estadoAtual;
        }
    });
    
    let transicaoEncontrada = null;
    
    //procura transição válida
    for (let transicao of transicoes) {
        let trans = parsearTransicao(transicao.label);
        if (!trans) continue;
        
        //verifica se a transição é válida
        let fitaValida = false;
        let pilhaValida = false;
        
        //verifica símbolo da fita
        if (trans.lerFita === "" || trans.lerFita === "?") {
            fitaValida = true; //movimento vazio ou teste
        } else if (trans.lerFita === simboloFita) {
            fitaValida = true;
        }
        
        //verifica símbolo da pilha
        if (trans.lerPilha === "" || trans.lerPilha === "?") {
            pilhaValida = true; //movimento vazio ou teste
        } else if (trans.lerPilha === topoPilha) {
            pilhaValida = true;
        }
        
        if (fitaValida && pilhaValida) {
            transicaoEncontrada = { edge: transicao, trans: trans };
            break;
        }
    }
    
    if (!transicaoEncontrada) {
        alert("Não há transição válida. A cadeia será rejeitada.");
        executando = false;
        return;
    }
    
    //executa transição
    let trans = transicaoEncontrada.trans;
    
    //atualiza fita (só avança se não for movimento vazio)
    if (trans.lerFita !== "" && trans.lerFita !== "?") {
        posicaoFita++;
    }
    
    //atualiza pilha
    if (trans.lerPilha !== "" && trans.lerPilha !== "?") {
        pilha.pop(); //remove topo da pilha
    }
    
    if (trans.escrevePilha !== "" && trans.escrevePilha !== "?") {
        //escreve na pilha (adiciona símbolos na ordem)
        for (let i = trans.escrevePilha.length - 1; i >= 0; i--) {
            pilha.push(trans.escrevePilha[i]);
        }
    }
    
    //atualiza estado atual
    estadoAtual = transicaoEncontrada.edge.to;
    
    //atualiza visualizações
    atualizarPilhaVisual();
    atualizarEstadoVisual(estadoAtual);
    
    console.log("Transição executada. Estado atual:", estadoAtual, "Posição fita:", posicaoFita);
}

//função para parar execução
function parar() {
    if (!executando) {
        return;
    }
    
    executando = false;
    console.log("Execução parada.");
}