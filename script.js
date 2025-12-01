//variáveis para execução do autômato
let estadoAtual = null; //usado durante a execução do autômato
let cadeiaEntrada = ""; //cadeia que será processada
let posicaoFita = 0; //posição atual da fita
let pilha = []; //pilha usada pelo autômato
let executando = false; //flag de execução
let estadoInicial = null; //ID do estado atual, caso já esteja definido

//cada chave é o ID do estado, guarda informações dos estados, seus nomes, transições, etc
let automato = {
    estados: {}
};

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

    if(isInicial && isFinal){ //bloqueia inserção caso ambas checkbox estejam marcadas
        alert("Um estado não pode ser inicial e final ao mesmo tempo.");
        return;
    }

    //se já existir um estado inicial, alerta e não permite a inserção de outro estado inicial
    if(isInicial && estadoInicial !== null){
        alert("Já existe estado inicial.");
        nextNodeId--; //desfaz incremente do contador
        return;
    }

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
        nodeOptions.color = { background: '#ADD8E6'};
        estadoInicial = id; //atualiza variável global que indica o estado inicial do autômato
    }

    //adiciona nodo do novo estado ao DataSet
    try {
        nodes.add(nodeOptions);
        console.log("Estado criado com ID: " + id + (isFinal ? " (FINAL)" : "")); 
    } catch (err) {
        alert("Erro ao adicionar estado.");
        nextNodeId--; //em caso de erro ao concluir inserção, decrementa contador
        return;
    }

    //criar as conexões
    conectarNovoEstado(id);

    //atualiza os checkboxes de remoção e conexão na tela
    atualizarInterface(id, label);
    
    //limpa os campos para a próxima transição
    limparCamposTransicao();
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
                arrows: "from" //define a aparência da linha como uma seta
            });

            console.log(`Adicionando condição de transição: ${origemId} -> ${destinoId}`);

            if(!automato.estados[origemId].transicoes[labelTransicao]){
                automato.estados[origemId].transicoes[labelTransicao] = [];
            }

            automato.estados[origemId].transicoes[labelTransicao].push(destinoId);
            console.log("Transições atualizadas: ", automato.estados[origemId].transicoes);
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

            //remove estado da estrutura do autômato
            delete automato.estados[idParaRemover];
            console.log(`Removendo transições que apontam para ${idParaRemover}`);

            for(let idEstado in automato.estados){ //percorre todos os estados do autômato
                let trans = automato.estados[idEstado].transicoes; //pega o objeto de transição de cada estado
                for(let label in trans){ //percorre as condições de transição

                    //filtra por destinos diferentes do removido
                    let destinosOriginais = trans[label]; //aponta para lista de destinos
                    //nova lista é criada, removendo o ID
                    let destinosFiltrados = destinosOriginais.filter(dest => dest !== idParaRemover);
                    
                    //se os tamanhos das listas não forem os mesmos, significa que havia transições indiretas apontando para o estado que foi excluído
                    if (destinosOriginais.length !== destinosFiltrados.length) {
                        trans[label] = destinosFiltrados; //atualiza a lista, removendo o destino excluído
                        console.log(`Removida transição ${idEstado} --${label}--> ${idParaRemover}`);
                    }

                    //se a lista estiver vazia, remove a chave
                    //serve para evitar que transições sem destino permaneçam, desperdiçando memória
                    if (trans[label].length === 0) {
                        delete trans[label];
                        console.log(`Removida chave de transição vazia '${label}' do estado ${idEstado}`);
                    }
                }
            }

            //caso estado removido tenha sido o inicial
            if (automato.estadoInicial === idParaRemover) {
                automato.estadoInicial = null;
                console.log(`O estado removido era o inicial. Estado inicial apagado.`);
            }
        }
    });

    atualizaNextNodeId(); //corrige contador após remoção de estado
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
    //atualiza o select de origem
    atualizarSelectOrigem();
}

//função para remover os checkbox da interface
function removerCheckboxesInterface(id) {
    //remove os checkboxes quando um estado é excluído
    let spanConectar = document.getElementById(`span-conectar-${id}`);
    if (spanConectar) spanConectar.remove();

    let spanRemover = document.getElementById(`span-remover-${id}`);
    if (spanRemover) spanRemover.remove();
    
    //atualiza o select de origem
    atualizarSelectOrigem();
}

//função para limpar tudo
function limpar() {
    //limpa os nodos (estados)
    nodes.clear();
    
    //limpa as ligações (transições)
    edges.clear();
    
    //reseta o contador de ids
    nextNodeId = 0;

    //limpa todo o conteúdo do autômato
    automato = {estados: {}};
    estadoInicial = null;
    
    //reseta variáveis de execução
    executando = false;
    estadoAtual = null;
    cadeiaEntrada = "";
    posicaoFita = 0;
    pilha = [];
    estadoInicial = null;
    
    //limpa campos de transição
    document.getElementById("lerFita").value = "";
    document.getElementById("lerPilha").value = "";
    document.getElementById("escrevePilha").value = "";
    
    //desmarca checkboxes
    document.getElementById("inicial").checked = false;
    document.getElementById("final").checked = false;
    
    //limpa div de conectar
    document.getElementById("conectarEstados").innerHTML = "";
    
    //reseta div de remover
    document.getElementById("removerEstados").innerHTML = '<button type="button" onclick="removerEstado()">Remover</button>';
    
    //limpa campo de cadeia
    document.getElementById("inputString").value = "";
    
    //limpa resultado
    document.getElementById("aceita").style.display = "none";
    document.getElementById("rejeita").style.display = "none";
    
    //reseta pilha visual
    for (let i = 0; i <= 5; i++) {
        let elemento = document.getElementById("stack" + i);
        if (elemento) {
            elemento.textContent = "";
        }
    }
    
    //limpa o select de origem
    document.getElementById("origemExistente").innerHTML = "";
}

//função utilitária dos botões "?" e "ε"
function setSymbol(inputId, symbol) {
    document.getElementById(inputId).value = symbol;
}



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

//função para inserção na pilha
function inserirNaPilha(simbolo){
    //verifica se é movimento vazio(ε)
    if (simbolo === "ε") {
        console.log("Movimento vazio: nada é adicionado à pilha.");
        return;
    }

    //verifica se é teste(?)
    if (simbolo === "?") {
        console.log("Teste de topo da pilha: a pilha não é modificada.");
        return;
    }

    //se é símbolo normal, adiciona na pilha
    for (let i = simbolo.length - 1; i >= 0; i--) {
        pilha.push(simbolo[i]);
    }

    console.log("Símbolos inseridos na pilha:", simbolo, "Pilha atual:", pilha);

    //atualiza visualização da pilha
    atualizarPilhaVisual();
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
    
    //pega símbolo atual da fita e do topo da pilha
    let simboloFita = posicaoFita < cadeiaEntrada.length ? cadeiaEntrada[posicaoFita] : "";
    let topoPilha = pilha.length > 0 ? pilha[pilha.length - 1] : "";
    
    //busca transições possíveis do estado atual
    // let transicoes = edges.get({
    //     filter: function(edge) {
    //         return edge.from === estadoAtual;
    //     }
    // });

    //pega o objeto do estado atual no autômato
    let estadoObj = automato.estados[estadoAtual];
    if (!estadoObj) {
        alert("Erro: Estado atual não existe no autômato.");
        executando = false;
        return;
    }

    let transicoes = []; //array para armazenar transições possíveis
    
    //converte o objeto de transições do autômato em array de objetos utilizáveis
    for (let label in estadoObj.transicoes) {
        let destinos = estadoObj.transicoes[label]; //array de ids de estados destino
        let transObj = parsearTransicao(label); //transforma a label em {lerFita, lerPilha, escrevePilha}
        if (!transObj) continue;

        for (let destino of destinos) {
            transicoes.push({ trans: transObj, destino: destino, label: label });
        }
    }
    
    let transicaoEncontrada = null;
    
    //procura transição válida
    for (let t of transicoes) {
        let trans = t.trans;

        //verifica símbolo da fita
        let fitaValida = trans.lerFita === "" || trans.lerFita === "?" || trans.lerFita === simboloFita;
        //verifica símbolo da pilha
        let pilhaValida = trans.lerPilha === "" || trans.lerPilha === "?" || trans.lerPilha === topoPilha;

        if (fitaValida && pilhaValida) {
            transicaoEncontrada = t; //encontrou transição válida
            break;
        }
    }
    // for (let transicao of transicoes) {
    //     let trans = parsearTransicao(transicao.label);
    //     if (!trans) continue;
        
    //     //verifica se a transição é válida
    //     let fitaValida = false;
    //     let pilhaValida = false;
        
    //     //verifica símbolo da fita
    //     if (trans.lerFita === "" || trans.lerFita === "?") {
    //         fitaValida = true; //movimento vazio ou teste
    //     } else if (trans.lerFita === simboloFita) {
    //         fitaValida = true;
    //     }
        
    //     //verifica símbolo da pilha
    //     if (trans.lerPilha === "" || trans.lerPilha === "?") {
    //         pilhaValida = true; //movimento vazio ou teste
    //     } else if (trans.lerPilha === topoPilha) {
    //         pilhaValida = true;
    //     }
        
    //     if (fitaValida && pilhaValida) {
    //         transicaoEncontrada = { edge: transicao, trans: trans };
    //         break;
    //     }
    // }
    
    //caso nenhuma transição válida tenha sido encontrada
    if (!transicaoEncontrada) {
        alert("Não há transição válida. A cadeia será rejeitada.");
        executando = false;
        document.getElementById("rejeita").style.display = "block"; //rejeita cadeia
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
        // for (let i = trans.escrevePilha.length - 1; i >= 0; i--) {
        //     pilha.push(trans.escrevePilha[i]);
        // }
        inserirNaPilha(trans.escrevePilha);
    }
    
    //atualiza estado atual
    //estadoAtual = transicaoEncontrada.edge.to;
    estadoAtual = transicaoEncontrada.destino;
    
    //atualiza visualizações
    atualizarPilhaVisual();
    atualizarEstadoVisual(estadoAtual);
    
    console.log("Transição executada:", transicaoEncontrada.label, 
                "Novo estado:", estadoAtual, 
                "Posição fita:", posicaoFita, 
                "Pilha:", pilha);

    //tratamento de estado final
    if (estadosFinais.includes(estadoAtual)){ //valida se estado atual é o final
        if (posicaoFita >= cadeiaEntrada.length){ //e se toda a cadeia já foi lida

            executando = false; //termina execução

            //mostra resultado
            document.getElementById("aceita").style.display = "block";

            console.log("A cadeia foi aceita! Estado final alcançado.");
            return;
        }
    }
}

//função para parar execução
function parar() {
    if (!executando) {
        return;
    }
    
    executando = false;
    console.log("Execução parada.");
}