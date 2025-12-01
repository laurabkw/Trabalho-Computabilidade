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
        arrows: "to", //garante que a seta aponte para o destino
        font: { align: "top" },
        smooth: { type: "curvedCW", roundness: 0.2 } 
    },
    physics: {
        enabled: true,
        solver: 'repulsion', 
        repulsion: {
            nodeDistance: 150 //aumentei a distância para os estados não ficarem grudados
        }
    }
};

//cria grafo no site
let network = new vis.Network(container, { nodes, edges }, options);
let nextNodeId = 0; // começar em 0 (q0)

//função para atualiza o contador do nodo
//garante que os nomes dos estados sigam uma ordem numérica
function atualizaNextNodeId(){ //decrementa o contador sempre que um estado é deletado
    let todos = nodes.get(); //pega todos estados presentes no diagrama até o momento
    if(todos.length === 0){ //caso não haja nenhum estado no diagrama
        nextNodeId = 0; //reinicia contador, diagrama vazio = volta ao q0
        return; //encerra função
    }

    //se houver estados no diagrama, pega o estado com maior número em seu ID
    let maior = Math.max(...todos.map(n => n.id));
    nextNodeId = maior + 1; //incrementa ID
}

//função para adicionar novo estado
function adicionar() { 
    let id = nextNodeId++; //incrementa id do estado para que cada novo estado tenha um id único
    let label = "q" + id;

    //verifica checkboxes
    let isFinal = document.getElementById("final").checked;
    let isInicial = document.getElementById("inicial").checked;

    //se já existir um estado inicial, alerta e não permite a inserção de outro estado inicial
    if(isInicial && estadoInicial !== null){
        alert("Já existe estado inicial.");
        nextNodeId--; //desfaz incremento do contador
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

    //adiciona novo estado ao autômato lógico
    automato.estados[id] = {
        id: id,
        nome: label,
        transicoes: {},
        final: !!isFinal,
        inicial: !!isInicial
    };
    
    //criar as conexões visuais e lógicas se houver checkboxes marcados
    conectarNovoEstado(id);

    //atualiza os checkboxes de remoção e conexão na tela
    atualizarInterface(id, label);
    
    //atualiza a lista de estados existentes para conexão futura
    atualizarSelectOrigem();

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
            
            //chama função auxiliar que cria a aresta visual e lógica
            criarAresta(origemId, destinoId, labelTransicao);
        }
    });
}

//função para conectar estados já existentes (selecionados no dropdown)
function conectarExistentes() {
    //pega o estado de origem selecionado no select
    let select = document.getElementById("origemExistente");
    let origemId = parseInt(select.value);

    if (isNaN(origemId)) {
        alert("Selecione um estado de origem.");
        return;
    }

    //pega os valores dos inputs de transição
    let lerFita = document.getElementById("lerFita").value || "ε";
    let lerPilha = document.getElementById("lerPilha").value || "ε";
    let escrevePilha = document.getElementById("escrevePilha").value || "ε";
    let labelTransicao = `${lerFita}, ${lerPilha} -> ${escrevePilha}`;

    //verifica checkboxes de destino
    let checkboxes = document.querySelectorAll('.checkbox-conectar');
    let conectou = false;

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            let destinoId = parseInt(checkbox.value);
            criarAresta(origemId, destinoId, labelTransicao);
            conectou = true;
        }
    });

    if (conectou) {
        limparCamposTransicao();
        //opcional: desmarcar checkboxes após conectar
        checkboxes.forEach(cb => cb.checked = false);
    } else {
        alert("Selecione pelo menos um estado de destino.");
    }
}

//função auxiliar para criar aresta visual e lógica (evita repetição de código)
function criarAresta(origemId, destinoId, labelTransicao) {
    //adiciona transição visual (seta)
    edges.add({
        from: origemId,
        to: destinoId,
        label: labelTransicao,
        arrows: "to"
    });

    console.log(`Adicionando condição de transição: ${origemId} -> ${destinoId}`);

    //adiciona transição lógica no objeto automato
    if(!automato.estados[origemId].transicoes[labelTransicao]){
        automato.estados[origemId].transicoes[labelTransicao] = [];
    }

    automato.estados[origemId].transicoes[labelTransicao].push(destinoId);
}

//função de remover um estado 
function removerEstado() {
    //busca todos os checkboxes de remoção marcados
    let checkboxes = document.querySelectorAll('.checkbox-remover');
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            let idParaRemover = parseInt(checkbox.value);
            
            //remove automaticamente as setas ligadas a ele do visual
            nodes.remove(idParaRemover);
            
            //remove visualmente os inputs da interface
            removerCheckboxesInterface(idParaRemover);

            //remove estado da estrutura lógica do autômato
            delete automato.estados[idParaRemover];
            console.log(`Removendo transições que apontam para ${idParaRemover}`);

            //remove transições que apontavam para este estado
            for(let idEstado in automato.estados){ 
                let trans = automato.estados[idEstado].transicoes; 
                for(let label in trans){ 
                    let destinos = trans[label];
                    let destinosFiltrados = destinos.filter(dest => dest !== idParaRemover);
                    
                    if (destinos.length !== destinosFiltrados.length) {
                        trans[label] = destinosFiltrados; 
                    }
                    if (trans[label].length === 0) {
                        delete trans[label];
                    }
                }
            }

            //caso estado removido tenha sido o inicial
            if (estadoInicial === idParaRemover) {
                estadoInicial = null;
                console.log(`O estado removido era o inicial. Estado inicial apagado.`);
            }
        }
    });

    atualizaNextNodeId(); //corrige contador após remoção de estado
    atualizarSelectOrigem(); //atualiza lista de estados existentes
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

//função para atualizar o select de origem (conectar estados existentes)
function atualizarSelectOrigem() {
    let select = document.getElementById("origemExistente");
    select.innerHTML = ""; //limpa opções antigas
    
    let todosEstados = nodes.get();
    todosEstados.sort((a, b) => a.id - b.id); //ordena por id

    todosEstados.forEach(estado => {
        let option = document.createElement("option");
        option.value = estado.id;
        option.text = "q" + estado.id;
        select.appendChild(option);
    });
}

//função para limpar tudo
function limpar() {
    //limpa os nodos (estados) e ligações (transições)
    nodes.clear();
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
    
    //limpa campos de transição
    limparCamposTransicao();
    
    //desmarca checkboxes e limpa interface
    document.getElementById("inicial").checked = false;
    document.getElementById("final").checked = false;
    document.getElementById("conectarEstados").innerHTML = "";
    document.getElementById("removerEstados").innerHTML = '<button type="button" onclick="removerEstado()">Remover Estado</button>';
    document.getElementById("origemExistente").innerHTML = "";
    
    //limpa campo de cadeia e resultados
    document.getElementById("inputString").value = "";
    document.getElementById("aceita").style.display = "none";
    document.getElementById("rejeita").style.display = "none";
    
    //reseta pilha visual
    atualizarPilhaVisual();
}

//função utilitária dos botões "?" e "ε"
function setSymbol(inputId, symbol) {
    document.getElementById(inputId).value = symbol;
}

//função para encontrar o estado inicial
function encontrarEstadoInicial() {
    //retorna variável global se definida
    if (estadoInicial !== null) return estadoInicial;

    //fallback: tenta achar visualmente ou retorna o primeiro
    let todos = nodes.get();
    if (todos.length > 0) return todos[0].id;
    return null;
}

//função para parsear uma transição do label
function parsearTransicao(label) {
    //formato: "a, b -> c"
    let partes = label.split("->");
    if (partes.length !== 2) return null;
    
    let leitura = partes[0].trim();
    let escrita = partes[1].trim();
    
    let lerPartes = leitura.split(",");
    if (lerPartes.length < 2) return null;
    
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
            //exibe do topo para baixo
            let index = pilha.length - 1 - i;
            if (index >= 0) {
                elemento.textContent = pilha[index];
            } else {
                elemento.textContent = "";
            }
        }
    }
}

//função para atualizar estado visual no diagrama
function atualizarEstadoVisual(estadoId) {
    let todosEstados = nodes.get();
    
    //reseta cores de todos os estados
    todosEstados.forEach(estado => {
        let nodeColor = { background: 'white', border: 'black' };
        
        //recupera cor original se for inicial ou final
        if (automato.estados[estado.id] && automato.estados[estado.id].inicial) {
             nodeColor.background = '#ADD8E6';
        }
        if (automato.estados[estado.id] && automato.estados[estado.id].final) {
             nodeColor.background = '#e0ffe0'; 
        }
        
        nodes.update({ id: estado.id, color: nodeColor });
    });
    
    //destaca o estado atual (amarelo)
    if (estadoId !== null) {
        nodes.update({ 
            id: estadoId,
            color: { background: '#ffeb3b', border: 'black' }
        });
    }
}

//função para confirmar cadeia de teste
function confirmarCadeia() {
    let inputString = document.getElementById("inputString").value;
    
    if (nodes.length === 0) {
        alert("Adicione estados ao autômato primeiro.");
        return;
    }
    
    estadoInicial = encontrarEstadoInicial();
    if (estadoInicial === null) {
        alert("Defina um estado inicial.");
        return;
    }
    
    //inicializa variáveis de execução
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
}

//função para inserção na pilha
function inserirNaPilha(simbolo){
    if (simbolo === "" || simbolo === "ε") return;

    //se é símbolo normal, adiciona na pilha
    for (let i = simbolo.length - 1; i >= 0; i--) {
        pilha.push(simbolo[i]);
    }
}

//função para avançar 1 etapa na leitura
function proximo() {
    if (!executando) {
        alert("Confirme uma cadeia primeiro.");
        return;
    }
    
    //pega símbolo atual da fita e do topo da pilha
    let simboloFita = posicaoFita < cadeiaEntrada.length ? cadeiaEntrada[posicaoFita] : "";
    let topoPilha = pilha.length > 0 ? pilha[pilha.length - 1] : "";
    
    let estadoObj = automato.estados[estadoAtual];
    let transicaoEncontrada = null;
    let destinoEscolhido = null;
    
    //procura transição válida no objeto do autômato
    for (let label in estadoObj.transicoes) {
        let trans = parsearTransicao(label);
        if (!trans) continue;

        //verifica compatibilidade de fita e pilha
        let fitaValida = (trans.lerFita === "" || trans.lerFita === "?" || trans.lerFita === simboloFita);
        let pilhaValida = (trans.lerPilha === "" || trans.lerPilha === "?" || trans.lerPilha === topoPilha);

        if (fitaValida && pilhaValida) {
            transicaoEncontrada = trans;
            destinoEscolhido = estadoObj.transicoes[label][0]; //pega o primeiro destino encontrado
            break;
        }
    }
    
    //caso nenhuma transição válida tenha sido encontrada
    if (!transicaoEncontrada) {
        //verifica se parou num estado final com a fita toda lida
        let isFinal = automato.estados[estadoAtual].final;
        if (posicaoFita >= cadeiaEntrada.length && isFinal) {
             document.getElementById("aceita").style.display = "block";
        } else {
             document.getElementById("rejeita").style.display = "block";
        }
        executando = false;
        return;
    }
    
    //executa transição (atualiza fita e pilha)
    if (transicaoEncontrada.lerFita !== "" && transicaoEncontrada.lerFita !== "?") {
        posicaoFita++;
    }
    
    if (transicaoEncontrada.lerPilha !== "" && transicaoEncontrada.lerPilha !== "?") {
        pilha.pop(); //remove topo da pilha
    }
    
    if (transicaoEncontrada.escrevePilha !== "" && transicaoEncontrada.escrevePilha !== "?") {
        inserirNaPilha(transicaoEncontrada.escrevePilha);
    }
    
    //atualiza estado atual
    estadoAtual = destinoEscolhido;
    
    //atualiza visualizações
    atualizarPilhaVisual();
    atualizarEstadoVisual(estadoAtual);
    
    //verifica se aceitou após o passo
    let isFinal = automato.estados[estadoAtual].final;
    if (posicaoFita >= cadeiaEntrada.length && isFinal) {
        document.getElementById("aceita").style.display = "block";
        executando = false;
    }
}

//função para parar execução
function parar() {
    executando = false;
    console.log("Execução parada.");
}

//função para reiniciar testes
function reiniciar(){
    if (estadoInicial === null) return;

    estadoAtual = estadoInicial;
    posicaoFita = 0;
    pilha = [];
    executando = true;

    document.getElementById("aceita").style.display = "none";
    document.getElementById("rejeita").style.display = "none";

    atualizarPilhaVisual();
    atualizarEstadoVisual(estadoInicial);
}

//função para completar toda execução do autômato de uma vez
function finalizar(){
    if(!executando) confirmarCadeia(); 

    //loop de segurança para executar passo-a-passo automaticamente
    let limite = 0;
    while(executando && limite < 2000) { //limite para evitar travamento do navegador (loop infinito)
        proximo();
        limite++;
    }
    
    if (limite >= 2000) {
        alert("Execução interrompida (possível loop infinito).");
        executando = false;
    }
}

//função para limpar campos após criar transição
function limparCamposTransicao() {
    document.getElementById("lerFita").value = "";
    document.getElementById("lerPilha").value = "";
    document.getElementById("escrevePilha").value = "";
}

//função auxiliar de validação (mantida para compatibilidade)
function validarTransicao() {
    return true;
}